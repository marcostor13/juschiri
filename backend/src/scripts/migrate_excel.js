/**
 * migrate_excel.js
 * Limpia la BD y migra desde inventario_MIGRATION.xlsx
 *
 * Columnas del Excel (fila 2 = headers, fila 3+ = datos):
 *   A=vacío  B=DISEÑADOR  C=CATEGORIA  D=SUB CATEGORIA
 *   E=NOMBRE  F=TALLA  G=COLOR  H=CODIGO  I=PRECIO  J=STOCK
 *
 * Uso:
 *   cd backend
 *   node src/scripts/migrate_excel.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const connectDB   = require('../db');
const Product     = require('../models/Product');
const Designer    = require('../models/Designer');
const Category    = require('../models/Category');
const Subcategory = require('../models/Subcategory');

// ── Paths ──────────────────────────────────────────────────────────────────

const EXCEL_PATH      = path.resolve(__dirname, '../../../public/inventario_MIGRATION.xlsx');
const CHECKPOINT_PATH = path.resolve(__dirname, '../../../scripts/migrate/output/checkpoint.json');

// ── Normalización ──────────────────────────────────────────────────────────

// Diseñadores con typos o variantes en el Excel → nombre canónico
const DESIGNER_NORM = {
  'AMIR':             'AMIRI',
  'GALLERY DEPT.':    'GALLERY DEPT',
  'OFF-WHITE':        'OFF WHITE',
  'TRAVIS SCOOT':     'TRAVIS SCOTT',
  'DOLCE GABANNA':    'DOLCE & GABBANA',
  'CASA BLANCA':      'CASABLANCA',
};

// Categorías duplicadas → categoría canónica
const CATEGORY_NORM = {
  'ZAPATILLA': 'SNEAKERS',
};

function normDesigner(raw) {
  const u = raw.trim().toUpperCase();
  return DESIGNER_NORM[u] || u;
}

function normCategory(raw) {
  const u = raw.trim().toUpperCase();
  return CATEGORY_NORM[u] || u;
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

function buildProductName(designer, subcategoria) {
  // Evita duplicar si subcat empieza con el nombre del diseñador
  // Ej: JORDAN + JORDAN 1 → "Jordan 1" (no "Jordan Jordan 1")
  if (subcategoria.toLowerCase().startsWith(designer.toLowerCase())) {
    return toTitleCase(subcategoria);
  }
  return toTitleCase(`${designer} ${subcategoria}`);
}

// ── Leer Excel ─────────────────────────────────────────────────────────────

function readExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel no encontrado: ${EXCEL_PATH}`);
  }

  const wb  = XLSX.readFile(EXCEL_PATH, { cellDates: false });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // raw[0] = fila 1 (vacía), raw[1] = headers, raw[2]+ = datos
  const rows = [];

  for (let i = 2; i < raw.length; i++) {
    const r = raw[i];
    const codigo = r[7]; // col H
    if (!codigo) continue;

    const designer     = String(r[1] || '').trim();
    const categoria    = String(r[2] || '').trim();
    const subcategoria = String(r[3] || '').trim();
    const nombre       = String(r[4] || '').trim();
    const talla        = String(r[5] || '').trim();
    const color        = String(r[6] || '').trim();
    const codigoStr    = String(codigo).trim();
    const precio       = Number(r[8]) || 0;
    const stock        = Number(r[9]) || 1;

    if (!designer || !categoria || !subcategoria || !codigoStr) continue;

    rows.push({
      designer:    normDesigner(designer),
      categoria:   normCategory(categoria),
      subcategoria: subcategoria.trim().toUpperCase(),
      nombre,
      talla,
      color,
      codigo: codigoStr,
      precio,
      stock,
    });
  }

  return rows;
}

// ── Cargar checkpoint de imágenes ──────────────────────────────────────────

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();

  // 1. Limpiar BD ─────────────────────────────────────────────────────────────
  console.log('\n── 1. Limpiando base de datos...');
  const [rProd, rSub, rCat, rDes] = await Promise.all([
    Product.deleteMany({}),
    Subcategory.deleteMany({}),
    Category.deleteMany({}),
    Designer.deleteMany({}),
  ]);
  console.log(`   Productos:      ${rProd.deletedCount} eliminados`);
  console.log(`   Subcategorías:  ${rSub.deletedCount} eliminadas`);
  console.log(`   Categorías:     ${rCat.deletedCount} eliminadas`);
  console.log(`   Diseñadores:    ${rDes.deletedCount} eliminados`);

  // 2. Leer Excel ─────────────────────────────────────────────────────────────
  console.log('\n── 2. Leyendo Excel...');
  const rows = readExcel();
  console.log(`   ${rows.length} filas válidas`);

  // 3. Cargar imágenes del checkpoint ────────────────────────────────────────
  const checkpoint = loadCheckpoint();
  console.log(`   Checkpoint: ${Object.keys(checkpoint).length} SKUs con imagen`);

  // 4. Crear Diseñadores ──────────────────────────────────────────────────────
  console.log('\n── 4. Creando diseñadores...');
  const designerNames = [...new Set(rows.map(r => r.designer))].filter(Boolean).sort();
  const designerMap   = {}; // name → ObjectId

  for (const name of designerNames) {
    const doc = await Designer.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true }
    );
    designerMap[name] = doc._id;
  }
  console.log(`   ${designerNames.length} diseñadores creados`);
  console.log(`   ${designerNames.join(', ')}`);

  // 5. Crear Categorías (globales) ────────────────────────────────────────────
  console.log('\n── 5. Creando categorías...');
  const categoryNames = [...new Set(rows.map(r => r.categoria))].filter(Boolean).sort();
  const categoryMap   = {}; // name → ObjectId

  for (const name of categoryNames) {
    const doc = await Category.findOneAndUpdate(
      { name },
      { name, designer: null },
      { upsert: true, new: true }
    );
    categoryMap[name] = doc._id;
  }
  console.log(`   ${categoryNames.length} categorías: ${categoryNames.join(', ')}`);

  // 6. Crear Subcategorías ────────────────────────────────────────────────────
  console.log('\n── 6. Creando subcategorías...');
  const subcatMap = new Map(); // "CAT||SUBCAT" → ObjectId

  for (const r of rows) {
    const key = `${r.categoria}||${r.subcategoria}`;
    if (subcatMap.has(key)) continue;

    const doc = await Subcategory.findOneAndUpdate(
      { name: r.subcategoria, category: categoryMap[r.categoria] },
      { name: r.subcategoria, category: categoryMap[r.categoria] },
      { upsert: true, new: true }
    );
    subcatMap.set(key, doc._id);
  }
  console.log(`   ${subcatMap.size} subcategorías creadas`);

  // 7. Agrupar filas → productos ──────────────────────────────────────────────
  console.log('\n── 7. Agrupando por producto (diseñador + categoría + subcategoría)...');
  const productGroups = new Map(); // "DES||CAT||SUBCAT" → rows[]

  for (const r of rows) {
    const key = `${r.designer}||${r.categoria}||${r.subcategoria}`;
    if (!productGroups.has(key)) productGroups.set(key, []);
    productGroups.get(key).push(r);
  }
  console.log(`   ${productGroups.size} productos`);

  // 8. Construir documentos Product ──────────────────────────────────────────
  const productDocs = [];

  for (const [, groupRows] of productGroups) {
    const { designer, categoria, subcategoria } = groupRows[0];

    const designerId    = designerMap[designer]                          || null;
    const categoryId    = categoryMap[categoria]                         || null;
    const subcategoryId = subcatMap.get(`${categoria}||${subcategoria}`) || null;

    // Agrupar variantes por NOMBRE (colorway). Fallback: COLOR
    const variantGroups = new Map();
    for (const r of groupRows) {
      const vKey = r.nombre || r.color || 'Default';
      if (!variantGroups.has(vKey)) variantGroups.set(vKey, []);
      variantGroups.get(vKey).push(r);
    }

    let firstImage  = null;
    let isPrincipal = true;
    const variantes = [];

    for (const [colorway, varRows] of variantGroups) {
      const tallas = varRows.map(r => ({
        talla:     r.talla,
        sku:       r.codigo,
        stock:     r.stock,
        precio:    r.precio,
        descuento: 0,
      }));

      // Imagen desde checkpoint: busca por cualquier SKU del grupo
      let variantImage = null;
      for (const r of varRows) {
        const cp = checkpoint[r.codigo];
        if (cp && cp.imagen_url) { variantImage = cp.imagen_url; break; }
      }
      if (!firstImage && variantImage) firstImage = variantImage;

      variantes.push({
        color:       toTitleCase(colorway),
        imagenes:    variantImage ? [variantImage] : [],
        esPrincipal: isPrincipal,
        tallas,
      });
      isPrincipal = false;
    }

    // Campos derivados
    const allPrices    = variantes.flatMap(v => v.tallas.map(t => t.precio)).filter(p => p > 0);
    const precio_min   = allPrices.length ? Math.min(...allPrices) : 0;
    const stock_actual = variantes.flatMap(v => v.tallas).reduce((s, t) => s + t.stock, 0);

    productDocs.push({
      nombre:      buildProductName(designer, subcategoria),
      marca:       toTitleCase(designer),
      category:    categoryId,
      subcategory: subcategoryId,
      designer:    designerId,
      imagen_url:  firstImage,
      galeria:     firstImage ? [firstImage] : [],
      stock_actual,
      precio_min,
      tiene_oferta: false,
      esVisible:    true,
      variantes,
    });
  }

  // 9. Insertar Productos ─────────────────────────────────────────────────────
  console.log('\n── 9. Insertando productos...');
  const inserted = await Product.insertMany(productDocs, { ordered: false });
  console.log(`   ${inserted.length} productos insertados`);

  // Resumen ───────────────────────────────────────────────────────────────────
  const conImagen = productDocs.filter(p => p.imagen_url).length;

  console.log('\n── Resumen ───────────────────────────────────────────────');
  console.log(`   Diseñadores:   ${designerNames.length}`);
  console.log(`   Categorías:    ${categoryNames.length}`);
  console.log(`   Subcategorías: ${subcatMap.size}`);
  console.log(`   Productos:     ${productDocs.length}`);
  console.log(`   Con imagen:    ${conImagen}`);
  console.log(`   Sin imagen:    ${productDocs.length - conImagen}`);
  console.log('──────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('Migración completada.');
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
