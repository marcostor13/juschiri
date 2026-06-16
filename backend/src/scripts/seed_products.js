/**
 * seed_products.js
 * Migra inventario_full.json → 154 productos con variantes y tallas.
 * Idempotente: upsert por (nombre + designer). No borra imágenes existentes.
 *
 * Uso:
 *   cd backend
 *   node src/scripts/seed_products.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const path = require('path');
const connectDB   = require('../db');
const Designer    = require('../models/Designer');
const Category    = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Product     = require('../models/Product');

const INVENTORY_PATH = path.resolve(__dirname, '../../../public/inventario_full.json');
const { rows } = require(INVENTORY_PATH);

// ── Normalización (misma que seed_hierarchy) ───────────────────────────────────

const DESIGNER_NORM = {
  'AMIR':          'AMIRI',
  'GALLERY DEPT.': 'GALLERY DEPT',
  'OFF-WHITE':     'OFF WHITE',
  'TRAVIS SCOOT':  'TRAVIS SCOTT',
  'DOLCE GABANNA': 'DOLCE & GABBANA',
  'CASA BLANCA':   'CASABLANCA',
};
const CATEGORY_NORM = { 'ZAPATILLA': 'SNEAKERS' };

const normD  = r => { const u = String(r||'').trim().toUpperCase(); return DESIGNER_NORM[u] || u; };
const normC  = r => { const u = String(r||'').trim().toUpperCase(); return CATEGORY_NORM[u] || u; };
const toTitle = s => s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());

// Normaliza talla cruda → nombre canónico (igual que seed_tallas)
function normTalla(raw) {
  if (!raw || !String(raw).trim()) return 'ESTANDAR';
  const t = String(raw).trim();
  const u = t.toUpperCase();

  if (['XS','S','M','L','XL','XXL'].includes(u))              return u;
  if (['REGULABLE','ESTANDAR'].includes(u))                    return u;
  if (/^[\d.]+\s+US\s+W$/i.test(t)) return u.match(/^([\d.]+)/)[1] + ' US W';
  if (/^[\d.]+\s+W$/i.test(t))      return u.match(/^([\d.]+)/)[1] + ' US W';
  if (/^[\d.]+\s+US$/i.test(t))     return u.match(/^([\d.]+)/)[1] + ' US';
  if (/^[\d.]+\s+EUR$/i.test(t))    return u.match(/^([\d.]+)/)[1] + ' EUR';
  if (/^[\d.]+\s+IT$/i.test(t))     return u.match(/^([\d.]+)/)[1] + ' IT';
  if (/^[\d.]+\s+UK$/i.test(t))     return u.match(/^([\d.]+)/)[1] + ' UK';
  if (/^[\d.]+\s+Y$/i.test(t))      return u.match(/^([\d.]+)/)[1] + ' Y';
  if (/^[\d.]+\s+C$/i.test(t))      return u.match(/^([\d.]+)/)[1] + ' C';
  if (/^\d+\s+\d+\/\d+$/.test(t))   return u;
  if (/^[\d.]+$/.test(t)) {
    const n = parseFloat(t);
    return (n >= 4 && n <= 15) ? u + ' US' : u;
  }
  return u;
}

function buildProductName(designer, subcategoria) {
  const d = designer.toLowerCase();
  const s = subcategoria.toLowerCase();
  return toTitle(s.startsWith(d) ? s : `${designer} ${subcategoria}`);
}

// ── Paso 1: cargar lookup de IDs desde la BD ───────────────────────────────────

async function buildLookup() {
  const [designers, categories, subcategories] = await Promise.all([
    Designer.find().lean(),
    Category.find().lean(),
    Subcategory.find().lean(),
  ]);

  const designerMap = new Map(designers.map(d => [d.name, d._id]));

  // "designerIdStr||catName" → categoryId
  const categoryMap = new Map(
    categories.map(c => [`${c.designer?.toString()}||${c.name}`, c._id])
  );

  // "categoryIdStr||subcatName" → subcategoryId
  const subcategoryMap = new Map(
    subcategories.map(s => [`${s.category?.toString()}||${s.name}`, s._id])
  );

  return { designerMap, categoryMap, subcategoryMap };
}

// ── Paso 2: agrupar filas → productos ─────────────────────────────────────────

function groupProducts() {
  const map = new Map();
  rows.forEach(r => {
    const d = normD(r['DISEÑADOR']);
    const c = normC(r['CATEGORIA']);
    const s = String(r['SUB CATEGORIA']||'').trim().toUpperCase();
    if (!d || !c || !s) return;
    const key = `${d}||${c}||${s}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return map;
}

// ── Paso 3: construir documento Product ───────────────────────────────────────

function buildProduct(key, prows, lookup) {
  const [designerName, catName, subcatName] = key.split('||');

  const designerId = lookup.designerMap.get(designerName);
  if (!designerId) return { doc: null, warn: `Designer no encontrado: "${designerName}"` };

  const categoryId = lookup.categoryMap.get(`${designerId.toString()}||${catName}`);
  if (!categoryId) return { doc: null, warn: `Categoría no encontrada: "${designerName} / ${catName}"` };

  const subcategoryId = lookup.subcategoryMap.get(`${categoryId.toString()}||${subcatName}`);
  if (!subcategoryId) return { doc: null, warn: `Subcategoría no encontrada: "${catName} / ${subcatName}"` };

  // Agrupar por colorway (NOMBRE), deduplicar SKUs
  const colorwayMap = new Map();
  const skusSeen    = new Set();
  let dupSkus       = 0;

  prows.forEach(r => {
    const colorway = String(r['NOMBRE'] || r['COLOR'] || 'Default').trim();
    const sku      = String(r['CODIGO'] || '').trim();
    const talla    = normTalla(r['TALLA']);
    const precio   = Number(r['PRECIO']) || 0;
    const stock    = Number(r['STOCK'])  || 1;

    if (!sku) return;
    if (skusSeen.has(sku)) { dupSkus++; return; }
    skusSeen.add(sku);

    if (!colorwayMap.has(colorway)) colorwayMap.set(colorway, []);
    colorwayMap.get(colorway).push({ talla, sku, stock, precio, descuento: 0 });
  });

  let esPrincipal = true;
  const variantes = [];
  for (const [colorway, tallas] of colorwayMap) {
    variantes.push({ color: toTitle(colorway), imagenes: [], esPrincipal, tallas });
    esPrincipal = false;
  }

  const allPrices    = variantes.flatMap(v => v.tallas.map(t => t.precio)).filter(p => p > 0);
  const precio_min   = allPrices.length ? Math.min(...allPrices) : 0;
  const stock_actual = variantes.flatMap(v => v.tallas).reduce((s, t) => s + t.stock, 0);

  return {
    dupSkus,
    warn: null,
    doc: {
      nombre:       buildProductName(designerName, subcatName),
      marca:        toTitle(designerName),
      designer:     designerId,
      category:     categoryId,
      subcategory:  subcategoryId,
      stock_actual,
      precio_min,
      tiene_oferta: false,
      esVisible:    true,
      variantes,
    },
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();

  console.log('\n── 1. Cargando lookup de IDs desde la BD...');
  const lookup = await buildLookup();
  console.log(`   Designers: ${lookup.designerMap.size}  Categorías: ${lookup.categoryMap.size}  Subcategorías: ${lookup.subcategoryMap.size}`);

  console.log('\n── 2. Agrupando inventario...');
  const productGroups = groupProducts();
  console.log(`   ${productGroups.size} productos únicos\n`);

  const stats    = { created: 0, updated: 0, skipped: 0, dupSkus: 0 };
  const warnings = [];

  for (const [key, prows] of productGroups) {
    const { doc, warn, dupSkus = 0 } = buildProduct(key, prows, lookup);
    stats.dupSkus += dupSkus;

    if (!doc) {
      warnings.push(warn);
      stats.skipped++;
      console.log(`  SKIP    ${key.replace(/\|\|/g, ' / ')}  — ${warn}`);
      continue;
    }

    const existing = await Product.findOne({ nombre: doc.nombre, designer: doc.designer }).lean();

    if (!existing) {
      await Product.create(doc);
      stats.created++;
      console.log(`  creado  [${String(doc.variantes.length).padStart(2)} var] [S/.${doc.precio_min}]  ${doc.nombre}`);
    } else {
      // Preservar imágenes ya cargadas por variante (por posición)
      const variantesConImg = doc.variantes.map((v, i) => ({
        ...v,
        imagenes: existing.variantes?.[i]?.imagenes?.length ? existing.variantes[i].imagenes : [],
        _id:      existing.variantes?.[i]?._id || undefined,
      }));
      await Product.updateOne(
        { _id: existing._id },
        {
          $set: {
            marca:        doc.marca,
            category:     doc.category,
            subcategory:  doc.subcategory,
            stock_actual: doc.stock_actual,
            precio_min:   doc.precio_min,
            variantes:    variantesConImg,
          },
        }
      );
      stats.updated++;
      console.log(`  update  [${String(doc.variantes.length).padStart(2)} var] [S/.${doc.precio_min}]  ${doc.nombre}`);
    }
  }

  console.log('\n── Resumen ──────────────────────────────────────────────────');
  console.log(`   Productos creados:          ${stats.created}`);
  console.log(`   Productos actualizados:     ${stats.updated}`);
  console.log(`   Productos saltados:         ${stats.skipped}`);
  console.log(`   SKUs duplicados omitidos:   ${stats.dupSkus}`);
  if (warnings.length) {
    console.log('\n   Advertencias:');
    warnings.forEach(w => console.log(`     ! ${w}`));
  }
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
