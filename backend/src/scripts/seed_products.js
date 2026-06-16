/**
 * seed_products.js
 * Migra inventario_full.json → productos correctamente agrupados.
 *
 * Agrupación: DISEÑADOR + CATEGORIA + SUBCATEGORIA + NOMBRE (colorway)
 * Cada NOMBRE único = 1 producto independiente.
 * Las filas con el mismo NOMBRE = tallas distintas del mismo producto (1 variante).
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

// ── Normalización ──────────────────────────────────────────────────────────────

const DESIGNER_NORM = {
  'AMIR':'AMIRI','GALLERY DEPT.':'GALLERY DEPT','OFF-WHITE':'OFF WHITE',
  'TRAVIS SCOOT':'TRAVIS SCOTT','DOLCE GABANNA':'DOLCE & GABBANA','CASA BLANCA':'CASABLANCA',
};
const CATEGORY_NORM = { 'ZAPATILLA': 'SNEAKERS' };

const normD   = r => { const u = String(r||'').trim().toUpperCase(); return DESIGNER_NORM[u]||u; };
const normC   = r => { const u = String(r||'').trim().toUpperCase(); return CATEGORY_NORM[u]||u; };
const toTitle = s => String(s).toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());

function normTalla(raw) {
  if (!raw || !String(raw).trim()) return 'ESTANDAR';
  const t = String(raw).trim(), u = t.toUpperCase();
  if (['XS','S','M','L','XL','XXL'].includes(u))              return u;
  if (['REGULABLE','ESTANDAR'].includes(u))                    return u;
  if (/^[\d.]+\s+US\s+W$/i.test(t)) return u.match(/^([\d.]+)/)[1]+' US W';
  if (/^[\d.]+\s+W$/i.test(t))      return u.match(/^([\d.]+)/)[1]+' US W';
  if (/^[\d.]+\s+US$/i.test(t))     return u.match(/^([\d.]+)/)[1]+' US';
  if (/^[\d.]+\s+EUR$/i.test(t))    return u.match(/^([\d.]+)/)[1]+' EUR';
  if (/^[\d.]+\s+IT$/i.test(t))     return u.match(/^([\d.]+)/)[1]+' IT';
  if (/^[\d.]+\s+UK$/i.test(t))     return u.match(/^([\d.]+)/)[1]+' UK';
  if (/^[\d.]+\s+Y$/i.test(t))      return u.match(/^([\d.]+)/)[1]+' Y';
  if (/^[\d.]+\s+C$/i.test(t))      return u.match(/^([\d.]+)/)[1]+' C';
  if (/^\d+\s+\d+\/\d+$/.test(t))   return u;
  if (/^[\d.]+$/.test(t)) { const n=parseFloat(t); return (n>=4&&n<=15)?u+' US':u; }
  return u;
}

// ── Lookup de IDs desde la BD ──────────────────────────────────────────────────

async function buildLookup() {
  const [designers, categories, subcategories] = await Promise.all([
    Designer.find().lean(),
    Category.find().lean(),
    Subcategory.find().lean(),
  ]);
  return {
    designerMap:    new Map(designers.map(d => [d.name, d._id])),
    categoryMap:    new Map(categories.map(c => [`${c.designer?.toString()}||${c.name}`, c._id])),
    subcategoryMap: new Map(subcategories.map(s => [`${s.category?.toString()}||${s.name}`, s._id])),
  };
}

// ── Agrupar filas → productos ──────────────────────────────────────────────────
// Clave: DISEÑADOR + CATEGORIA + SUBCATEGORIA + NOMBRE (colorway)

function groupProducts() {
  const map = new Map();
  rows.forEach(r => {
    const d = normD(r['DISEÑADOR']);
    const c = normC(r['CATEGORIA']);
    const s = String(r['SUB CATEGORIA']||'').trim().toUpperCase();
    const n = String(r['NOMBRE']||'').trim();
    if (!d || !c || !s || !n) return;
    const key = `${d}||${c}||${s}||${n}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return map;
}

// ── Construir documento Product ────────────────────────────────────────────────

function buildProduct(key, prows, lookup) {
  const [designerName, catName, subcatName, nombre] = key.split('||');

  const designerId = lookup.designerMap.get(designerName);
  if (!designerId) return { doc: null, warn: `Designer no encontrado: "${designerName}"` };

  const categoryId = lookup.categoryMap.get(`${designerId.toString()}||${catName}`);
  if (!categoryId) return { doc: null, warn: `Categoría no encontrada: "${designerName} / ${catName}"` };

  const subcategoryId = lookup.subcategoryMap.get(`${categoryId.toString()}||${subcatName}`);
  if (!subcategoryId) return { doc: null, warn: `Subcategoría no encontrada: "${catName} / ${subcatName}"` };

  // Deduplicar SKUs dentro del mismo producto
  const skusSeen = new Set();
  let dupSkus = 0;
  const tallas = [];

  prows.forEach(r => {
    const sku    = String(r['CODIGO']||'').trim();
    const talla  = normTalla(r['TALLA']);
    const precio = Number(r['PRECIO']) || 0;
    const stock  = Number(r['STOCK'])  || 1;
    if (!sku || skusSeen.has(sku)) { if (sku) dupSkus++; return; }
    skusSeen.add(sku);
    tallas.push({ talla, sku, stock, precio, descuento: 0 });
  });

  // Color: primer valor no vacío del campo COLOR; si vacío, usar NOMBRE
  const color = toTitle(
    prows.map(r => String(r['COLOR']||'').trim()).find(c => c) || nombre
  );

  const variante = { color, imagenes: [], esPrincipal: true, tallas };

  const allPrices    = tallas.map(t => t.precio).filter(p => p > 0);
  const precio_min   = allPrices.length ? Math.min(...allPrices) : 0;
  const stock_actual = tallas.reduce((s, t) => s + t.stock, 0);

  return {
    dupSkus,
    warn: null,
    doc: {
      nombre:       toTitle(nombre),
      marca:        toTitle(designerName),
      designer:     designerId,
      category:     categoryId,
      subcategory:  subcategoryId,
      stock_actual,
      precio_min,
      imagen_url:   null,
      galeria:      [],
      tiene_oferta: false,
      esVisible:    false,   // invisible hasta que tenga imagen (se activa en upload_images_s3)
      variantes:    [variante],
    },
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();

  console.log('\n── 1. Eliminando productos anteriores...');
  const del = await Product.deleteMany({});
  console.log(`   ${del.deletedCount} productos eliminados`);

  console.log('\n── 2. Cargando lookup de IDs...');
  const lookup = await buildLookup();
  console.log(`   Designers: ${lookup.designerMap.size}  Categorías: ${lookup.categoryMap.size}  Subcategorías: ${lookup.subcategoryMap.size}`);

  console.log('\n── 3. Agrupando inventario por NOMBRE...');
  const productGroups = groupProducts();
  console.log(`   ${productGroups.size} productos únicos\n`);

  const stats    = { created: 0, skipped: 0, dupSkus: 0 };
  const warnings = [];

  for (const [key, prows] of productGroups) {
    const { doc, warn, dupSkus = 0 } = buildProduct(key, prows, lookup);
    stats.dupSkus += dupSkus;

    if (!doc) {
      warnings.push(warn);
      stats.skipped++;
      console.log(`  SKIP  ${key.replace(/\|\|/g, ' / ')}  — ${warn}`);
      continue;
    }

    await Product.create(doc);
    stats.created++;
    const tallasStr = doc.variantes[0].tallas.map(t=>t.talla).join(', ');
    console.log(`  [${String(doc.variantes[0].tallas.length).padStart(2)} tallas] S/.${doc.precio_min}  ${doc.nombre}  (${doc.marca})`);
  }

  console.log('\n── Resumen ──────────────────────────────────────────────────');
  console.log(`   Productos creados:          ${stats.created}`);
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
