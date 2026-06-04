/**
 * importInventario140526.js
 * Migración limpia desde el Excel → MongoDB.
 *
 * Colecciones que crea/recrea:
 *   tallas        — catálogo de tallas normalizadas (con orden de display)
 *   colors        — catálogo de colores normalizados
 *   designers     — una entrada por marca normalizada
 *   categories    — 4 globales (designer=null) + una por designer×categoría
 *   subcategories — ligadas a categorías globales
 *   products      — agrupados por producto único con variantes color/talla
 *                   • codigoMin: SKU numérico más bajo del producto
 *                   • esVisible: false si es un duplicado (mismo nombre+marca, código mayor)
 *                   • primaryProductId: apunta al producto visible cuando esVisible=false
 *
 * Regla de duplicados (punto 7):
 *   Si la misma combinación color+talla existe en el mismo producto con distintos SKUs,
 *   se crea un producto separado (split). Dentro del mismo nombre+marca, solo el que
 *   tiene el codigoMin más bajo queda esVisible=true; los demás apuntan al primario.
 *
 * Uso:
 *   node backend/scripts/importInventario140526.js
 */

const path  = require('path');
const xlsx  = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB   = require('../src/db');
const Product     = require('../src/models/Product');
const Category    = require('../src/models/Category');
const Subcategory = require('../src/models/Subcategory');
const Designer    = require('../src/models/Designer');
const Talla       = require('../src/models/Talla');
const Color       = require('../src/models/Color');

// ─── Mapas de normalización ───────────────────────────────────────────────────

const DESIGNER_MAP = {
  'NIKE': 'Nike', 'nike': 'Nike', 'Nike': 'Nike',
  'NIKE X OFF WHITE': 'Nike x Off-White',
  'Nike X Travis scoot': 'Nike x Travis Scott',
  'NIKE X TRAVIS SCOOT': 'Nike x Travis Scott',
  'OFF WHITE': 'Off-White', 'OFF-WHITE': 'Off-White',
  'Off White': 'Off-White', 'off-white': 'Off-White', 'off white': 'Off-White',
  'OFF WHITE X AC MILAN': 'Off-White x AC Milan',
  'ESSENTIALS': 'Essentials', 'ESENTIALS': 'Essentials', 'essentials': 'Essentials',
  'SUPREME': 'Supreme', 'supreme': 'Supreme', 'Supreme': 'Supreme',
  'ADIDAS': 'Adidas', 'adidas': 'Adidas',
  'adidas x bape': 'Adidas x Bape', 'ADIDAS X BAPE': 'Adidas x Bape',
  'AMIRI': 'Amiri', 'amiri': 'Amiri', 'AMIR': 'Amiri',
  'AMIRI X MMY': 'Amiri x MMY',
  'PALM ANGELS': 'Palm Angels', 'palm angels': 'Palm Angels', 'Palm Angels': 'Palm Angels',
  'MONCLER X PALM ANGELS': 'Moncler x Palm Angels',
  'BAPE': 'Bape', 'bape': 'Bape', 'Bape': 'Bape',
  'GALLERY DEPT': 'Gallery Dept.', 'GALLERY DEP.': 'Gallery Dept.', 'gallery dept': 'Gallery Dept.',
  'VALLEY FOREVER': 'Valley Forever', 'Valley Forever': 'Valley Forever', 'valley forever': 'Valley Forever',
  'RHUDE': 'Rhude', 'rhude': 'Rhude', 'Rhude': 'Rhude',
  'HERON PRESTON': 'Heron Preston', 'heron preston': 'Heron Preston',
  'CASA BLANCA': 'Casablanca', 'casa blanca': 'Casablanca', 'CASABLANCA': 'Casablanca',
  'ICE CREAM': 'Ice Cream', 'Ice Cream': 'Ice Cream',
  'TRAVIS SCOOT': 'Travis Scott', 'Travis Scott': 'Travis Scott',
  'Jordan X nina chanell': 'Jordan x Nina Chanel',
  'JORDAN X NINA CHANELL': 'Jordan x Nina Chanel',
  'Gap X Valenciaga': 'Gap x Balenciaga', 'GAP X VALENCIAGA': 'Gap x Balenciaga',
  'KITH X MARVEL': 'Kith x Marvel',
  'ERIC EMANUEL': 'Eric Emanuel',
  'PURPLE BRAND': 'Purple Brand',
  'HELLSTAR': 'Hellstar',
  'GOOD SPEED': 'Good Speed',
  'REXOTIC': 'Rexotic',
  'LETF PONIT': 'Left Point',
  'VERSACE': 'Versace',
  'LOUIS VUITTON': 'Louis Vuitton',
  'DOLCE GABANNA': 'Dolce & Gabbana',
  'DENIM TEARS': 'Denim Tears', 'denim tears': 'Denim Tears',
  'chrome hearts': 'Chrome Hearts', 'CHROME HEARTS': 'Chrome Hearts',
  'pleasure': 'Pleasure', 'PLEASURE': 'Pleasure',
  'uniqlo': 'Uniqlo', 'UNIQLO': 'Uniqlo',
  'uniqlo x kaws': 'Uniqlo x KAWS', 'UNIQLO X KAWS': 'Uniqlo x KAWS',
  'timberland': 'Timberland', 'TIMBERLAND': 'Timberland',
  'HARAMAIN': 'Al Haramain',
  'LATTAFA': 'Lattafa', 'LATAFFA': 'Lattafa', 'LATTAFFA': 'Lattafa',
  'ARMAF': 'Armaf',
  'ARD AL ZAAFARAN': 'Ard Al Zaafaran',
  'GRANDEUR': 'Grandeur',
  'ASDAAF': 'Asdaaf',
  'FRENCH AVENUE': 'French Avenue',
  'AJMAL': 'Ajmal',
  'BURBERRY': 'Burberry',
  'MARCA': 'Sin Marca',
};

const COLOR_MAP = {
  'AMRILLO':          'Amarillo',
  'NANARANJADO':      'Anaranjado',
  'NARANGA':          'Naranja',
  'NEGRO ACIS WASH':  'Negro Acid Wash',
  'JEAN NEGRRO':      'Jean Negro',
  'TURQUEZA':         'Turquesa',
  'VERDE MLITAR':     'Verde Militar',
  'VERDE  MILITAR':   'Verde Militar',
  'JEAN LADRILO PERLA': 'Jean Ladrillo Perla',
  'PLOMA':            'Plomo',
  'NEGRO  MALLA':     'Negro Malla',
  'rojo}':            'Rojo',
  'black/ grey':      'Negro/Gris',
  'blanco, negro':    'Blanco/Negro',
  'AZUL Marino':      'Azul Marino',
  'NEGRO': 'Negro', 'negro': 'Negro', 'Negro': 'Negro',
  'BLANCO': 'Blanco', 'blanco': 'Blanco', 'Blanco': 'Blanco',
  'AZUL': 'Azul', 'azul': 'Azul',
  'VERDE': 'Verde', 'verde': 'Verde',
  'ROJO': 'Rojo', 'rojo': 'Rojo',
  'MARRON': 'Marrón', 'marron': 'Marrón', 'Marron': 'Marrón',
  'MOSTAZA': 'Mostaza', 'mostaza': 'Mostaza',
  'GRIS': 'Gris', 'gris': 'Gris',
  'BEIGE': 'Beige', 'beige': 'Beige',
  'CELESTE': 'Celeste', 'celeste': 'Celeste',
  'LILA': 'Lila', 'lila': 'Lila',
  'CREMA': 'Crema', 'crema': 'Crema',
  'PLOMO': 'Plomo', 'plomo': 'Plomo',
  'ROSADO': 'Rosado', 'rosado': 'Rosado',
  'AMARILLO': 'Amarillo', 'amarillo': 'Amarillo',
  'NARANJA': 'Naranja', 'naranja': 'Naranja',
  'TURQUESA': 'Turquesa',
  'AZULADO': 'Azulado',
  'JEAN NEGRO': 'Jean Negro', 'jean negro': 'Jean Negro',
  'JEAN CELESTE': 'Jean Celeste', 'jean celeste': 'Jean Celeste',
  'JEAN MARRON': 'Jean Marrón', 'jean marron': 'Jean Marrón',
  'JEAN MARRON PERLA': 'Jean Marrón Perla',
  'JEAN LADRILLO PERLA': 'Jean Ladrillo Perla',
  'AZUL MARINO': 'Azul Marino',
  'NEGRO MALLA': 'Negro Malla', 'negro malla': 'Negro Malla',
  'VERDE MILITAR': 'Verde Militar', 'verde militar': 'Verde Militar',
  'NEGRO ACID WASH': 'Negro Acid Wash',
};

const SUBCAT_MAP = {
  'HOODIE': 'Hoodie',      'hoodie': 'Hoodie',
  'CREWNECK': 'Crewneck',  'crewneck': 'Crewneck',  'Crewneck': 'Crewneck',
  'ZIP UP HOODIE': 'Zip Up Hoodie', 'zip hoodie': 'Zip Up Hoodie',
  'Zip Ap Hoodie': 'Zip Up Hoodie', 'ZIP AP HOODIE': 'Zip Up Hoodie',
  'SUETER': 'Suéter',      'Sueter': 'Suéter',
  'CHOMPA': 'Chompa',
  'POLO': 'Polo',          'polo': 'Polo',
  'T-SHIRT': 'T-Shirt',
  'CAMISA': 'Camisa',      'camisa': 'Camisa',
  'CAMISA MANGA LARGA': 'Camisa Manga Larga',
  'CAFARENA': 'Cafarena',
  'JERSEY': 'Jersey',
  'LONG SLEEVE': 'Long Sleeve', 'long sleeve': 'Long Sleeve',
  'LOG SLEEVE': 'Long Sleeve',
  'PANTALON': 'Pantalón', 'SHORT': 'Short',
  'JACKET': 'Jacket',      'jacket': 'Jacket',
  'CHAQUETA JEAN': 'Chaqueta Jean', 'denim jacket': 'Chaqueta Jean',
  'Windbreak': 'Windbreaker', 'WINDBREAK': 'Windbreaker',
  'BUZO': 'Buzo',          'buzo': 'Buzo',
  'BUZO DEPORTIVO': 'Buzo Deportivo',
  'casaca': 'Casaca', 'CASACA': 'Casaca',
  'GORRO': 'Gorro',        'GORRO LANA': 'Gorro de Lana',
  'SOMBRERO': 'Sombrero',  'MORRAL': 'Morral',      'MINI MORRAL': 'Mini Morral',
  'MEDIAS': 'Medias',      'BOXER': 'Boxer',         'TOALLA': 'Toalla',
  'ENSENDENDOR': 'Encendedor', 'ENCENDEDOR': 'Encendedor',
  'TAZA': 'Taza',          'PELOTA': 'Pelota',        'BOL': 'Bol',
  'ZAPATILLAS': 'Zapatillas',
  'jordan 3': 'Jordan 3',       'jordan 4.': 'Jordan 4',
  'jordan 1 low.': 'Jordan 1 Low', 'jordan 5': 'Jordan 5',
  'air force 1.': 'Air Force 1', 'air max 1.': 'Air Max 1',
  'badbo 1.0': 'Badbo 1.0',    'forum': 'Forum',
  'response': 'Response',       'campus': 'Campus',
  'gazelle indoor': 'Gazelle Indoor', 'bota': 'Bota',
};

// ─── Orden de tallas para el catálogo ────────────────────────────────────────
// Usado al crear la colección Talla con su campo `orden`
const TALLA_ORDEN = {
  'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7, '2XL': 6, '3XL': 7,
  '28': 10, '30': 11, '32': 12, '34': 13, '36': 14, '38': 15,
  '40': 16, '42': 17, '44': 18, '46': 19, '48': 20, '50': 21, '52': 22,
};

function getTallaOrden(talla) {
  if (TALLA_ORDEN[talla] !== undefined) return TALLA_ORDEN[talla];
  if (/\d+(\.\d+)?\s*US$/i.test(talla)) return 100 + parseFloat(talla);
  if (/\d+(\.\d+)?\s*IT$/i.test(talla)) return 200 + parseFloat(talla);
  return 999;
}

// ─── Helpers de texto ─────────────────────────────────────────────────────────

function norm(val) {
  return val ? val.toString().trim() : '';
}

function titleCase(str) {
  if (!str) return '';
  return str.toString().trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizeDesigner(raw) {
  const s = norm(raw);
  if (!s) return '';
  return DESIGNER_MAP[s] || titleCase(s);
}

function normalizeSubcat(raw) {
  const s = norm(raw);
  if (!s) return 'General';
  return SUBCAT_MAP[s] || titleCase(s);
}

function normalizeColor(raw) {
  if (!raw) return '';
  const s = raw.toString().trim().replace(/\s{2,}/g, ' ');
  if (!s) return '';
  if (COLOR_MAP[s]) return COLOR_MAP[s];
  return titleCase(s);
}

function normalizeTalla(raw) {
  const s = norm(raw);
  if (!s) return '';
  const num = Number(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    console.warn(`  [WARN] Talla con serial de fecha Excel (${s}) — omitida`);
    return '';
  }
  const usMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*us$/i);
  if (usMatch) return `${usMatch[1].replace(',', '.')} US`;
  const itMatch = s.match(/^([0-9Oo]+(?:[.,]\d+)?)\s*it$/i);
  if (itMatch) return `${itMatch[1].replace(/[Oo]/g, '0').replace(',', '.')} IT`;
  const clothing = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
  const upper = s.toUpperCase();
  if (clothing.includes(upper)) return upper;
  if (/^\d{2}$/.test(s)) {
    const n = parseInt(s);
    if (n >= 28 && n <= 52) return s;
  }
  return s;
}

function normalizeCatName(raw) {
  const map = { 'ZAPATILLAS': 'Zapatillas', 'ROPA': 'Ropa', 'ACCESORIOS': 'Accesorios', 'PERFUME': 'Perfume' };
  return map[norm(raw)] || titleCase(norm(raw));
}

/**
 * Extrae el código numérico mínimo de las variantes de un producto.
 * Retorna el número entero más pequeño encontrado en los SKUs.
 * Fallback: 0 si ningún SKU tiene dígitos.
 */
function computeCodigoMin(variants) {
  const allSkus = [...variants.values()].flat().map(t => t.sku).filter(Boolean);
  if (!allSkus.length) return 0;
  const nums = allSkus
    .map(s => parseInt(s.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n) && n > 0);
  return nums.length ? Math.min(...nums) : 0;
}

// ─── Imágenes placeholder ─────────────────────────────────────────────────────

const UNS = 'https://images.unsplash.com';
const PH  = 'https://placehold.co/800x1000/000000/ccff00';

const IMG_POOL = {
  Zapatillas: [
    `${UNS}/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop`,
    `${UNS}/photo-1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop`,
    `${UNS}/photo-1597045566677-8cf032ed6634?q=80&w=800&auto=format&fit=crop`,
    `${UNS}/photo-1615290642882-6b9501729a27?q=80&w=800&auto=format&fit=crop`,
    `${UNS}/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop`,
    `${UNS}/photo-1664478546384-d57ffe74a7f4?q=80&w=800&auto=format&fit=crop`,
  ],
  Ropa: [
    `${UNS}/photo-1515347619362-e6fdff686524?q=80&w=800&auto=format&fit=crop`,
    `${PH}?text=STREETWEAR`,
    `${PH}?text=APPAREL`,
    `${PH}?text=ROPA`,
  ],
  Accesorios: [
    `${PH}?text=ACCESORIOS`,
    `${PH}?text=ACCESSORIES`,
    `${PH}?text=ACC`,
  ],
  Perfume: [
    `${PH}?text=PERFUME`,
    `${PH}?text=FRAGRANCE`,
    `${PH}?text=PARFUM`,
  ],
};

const imgIdx = { Zapatillas: 0, Ropa: 0, Accesorios: 0, Perfume: 0 };

function getProductImages(primarySku, catName) {
  const pool = IMG_POOL[catName] || IMG_POOL.Ropa;
  const i    = imgIdx[catName] ?? 0;
  imgIdx[catName] = (i + 1) % pool.length;
  return {
    main:    pool[i],
    hover:   pool[(i + 1) % pool.length],
    gallery: pool,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  await connectDB();
  console.log('Conectado a MongoDB.\n');

  // ── 1. Limpiar todas las colecciones ───────────────────────────────────────
  console.log('[1/7] Limpiando colecciones...');
  const [dp, dc, ds, dd, dt, dco] = await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Subcategory.deleteMany({}),
    Designer.deleteMany({}),
    Talla.deleteMany({}),
    Color.deleteMany({}),
  ]);
  console.log(
    `  Products: ${dp.deletedCount} | Categories: ${dc.deletedCount} | ` +
    `Subcategories: ${ds.deletedCount} | Designers: ${dd.deletedCount} | ` +
    `Tallas: ${dt.deletedCount} | Colors: ${dco.deletedCount}`
  );

  // ── 2. Leer Excel ──────────────────────────────────────────────────────────
  console.log('\n[2/7] Leyendo Excel...');
  const excelPath = path.join(__dirname, '../../public/inventario 140526 (1).xlsx');
  const wb = xlsx.readFile(excelPath);

  // Hoja1: col[1]=DISEÑADOR [2]=CATEGORIA [3]=SUBCATEGORIA [4]=DESCRIPCION
  //        col[5]=TALLA [6]=COLOR [7]=CODIGO [8]=PRECIO [9]=CANTIDAD
  const raw1  = xlsx.utils.sheet_to_json(wb.Sheets['Hoja1'], { header: 1 });
  const rows1 = raw1.slice(2).filter(r => r && r[1]);

  // Hoja 1 (perfumes/accesorios): col[1]=MARCA [2]=CATEGORIA [3]=DESCRIPCION
  //                                col[5]=OLOR/COLOR [6]=CODIGO [7]=PRECIO [8]=CANTIDAD
  const raw2  = xlsx.utils.sheet_to_json(wb.Sheets['Hoja 1'], { header: 1 });
  const rows2 = raw2.slice(1).filter(r => r && r[1] && norm(r[1]) !== 'MARCA');

  console.log(`  Hoja1: ${rows1.length} filas | Hoja 1 (perfumes/acc): ${rows2.length} filas`);

  // ── 3. Categorías globales y subcategorías ─────────────────────────────────
  console.log('\n[3/7] Creando categorías y subcategorías...');

  const globalCatNames = ['Zapatillas', 'Ropa', 'Accesorios', 'Perfume'];
  const globalCatMap   = {};

  for (const name of globalCatNames) {
    const doc = await Category.create({ name, designer: null });
    globalCatMap[name] = doc._id;
  }

  const subcatSet = new Set();
  rows1.forEach(r => subcatSet.add(`${normalizeCatName(r[2])}|${normalizeSubcat(r[3])}`));
  rows2.forEach(r => { const c = normalizeCatName(r[2]) || 'Perfume'; subcatSet.add(`${c}|${c}`); });

  const globalSubcatMap = {};
  for (const key of subcatSet) {
    const [catName, subName] = key.split('|');
    const catId = globalCatMap[catName];
    if (!catId) continue;
    const doc = await Subcategory.create({ name: subName, category: catId });
    globalSubcatMap[key] = doc._id;
  }
  console.log(`  Categorías: ${globalCatNames.join(', ')} | Subcategorías: ${Object.keys(globalSubcatMap).length}`);

  // ── 4. Diseñadores, sus categorías y sus subcategorías ────────────────────
  console.log('\n[4/7] Creando diseñadores, categorías y subcategorías por diseñador...');

  // Árbol designer → category → Set(subcategory) extraído de las filas del Excel
  const designerCatTree    = {};    // 'Nike' → Set('Zapatillas', 'Ropa')
  const designerCatSubTree = {};    // 'Nike|||Zapatillas' → Set('Jordan 3', 'Air Force 1', ...)

  rows1.forEach(r => {
    const d = normalizeDesigner(r[1]);
    const c = normalizeCatName(r[2]);
    const s = normalizeSubcat(r[3]);
    if (!d) return;
    if (!designerCatTree[d]) designerCatTree[d] = new Set();
    designerCatTree[d].add(c);
    if (s) {
      const treeKey = `${d}|||${c}`;
      if (!designerCatSubTree[treeKey]) designerCatSubTree[treeKey] = new Set();
      designerCatSubTree[treeKey].add(s);
    }
  });
  rows2.forEach(r => {
    const d = normalizeDesigner(r[1]);
    const c = normalizeCatName(r[2]) || 'Perfume';
    if (!d) return;
    if (!designerCatTree[d]) designerCatTree[d] = new Set();
    designerCatTree[d].add(c);
    // Hoja 1 no tiene SUBCATEGORIA: la subcategoría es el nombre de la categoría
    const treeKey = `${d}|||${c}`;
    if (!designerCatSubTree[treeKey]) designerCatSubTree[treeKey] = new Set();
    designerCatSubTree[treeKey].add(c);
  });

  const designerMap    = {};
  const designerCatMap = {};

  for (const [dName, catSet] of Object.entries(designerCatTree)) {
    const desDoc = await Designer.create({ name: dName });
    designerMap[dName] = desDoc._id;
    for (const catName of catSet) {
      const catDoc = await Category.create({ name: catName, designer: desDoc._id });
      designerCatMap[`${dName}|${catName}`] = catDoc._id;
    }
  }

  // Crear subcategorías ligadas a las categorías específicas de cada diseñador
  // Esto construye la cadena completa: Designer → Category → Subcategory
  let designerSubcatCount = 0;
  for (const [treeKey, subcatNames] of Object.entries(designerCatSubTree)) {
    const sepIdx = treeKey.indexOf('|||');
    const desName = treeKey.slice(0, sepIdx);
    const catName = treeKey.slice(sepIdx + 3);
    const catId   = designerCatMap[`${desName}|${catName}`];
    if (!catId) continue;
    for (const subcatName of subcatNames) {
      await Subcategory.create({ name: subcatName, category: catId });
      designerSubcatCount++;
    }
  }

  console.log(
    `  Diseñadores: ${Object.keys(designerMap).length} | ` +
    `Categorías de diseñador: ${Object.keys(designerCatMap).length} | ` +
    `Subcategorías de diseñador: ${designerSubcatCount}`
  );

  // ── 5. Agrupar filas en productos (con detección de conflictos) ─────────────
  console.log('\n[5/7] Agrupando filas en productos...');

  const bucket    = new Map();  // productKey → { meta, variants: Map }
  const tallasSet = new Set();  // para la colección Talla
  const coloresSet = new Set(); // para la colección Color
  let   skuDups   = 0;
  let   splitCount = 0;

  /**
   * Intenta agregar una talla a un bucket dado.
   * Retorna true si se agregó, false si hay conflicto de talla (mismo color+talla, diferente SKU).
   */
  function tryAddToKey(key, nombre, marca, catNorm, subcatNorm, precio, color, talla, sku, stock) {
    if (!bucket.has(key)) {
      bucket.set(key, { nombre, marca, catNorm, subcatNorm, precio, variants: new Map() });
    }
    const prod = bucket.get(key);
    if (!prod.variants.has(color)) prod.variants.set(color, []);
    const existingTallas = prod.variants.get(color);

    // SKU exacto ya existe → duplicado real
    if (existingTallas.some(t => t.sku === sku)) { skuDups++; return true; }

    // Misma talla con diferente SKU → conflicto
    if (talla && existingTallas.some(t => t.talla === talla)) return false;

    existingTallas.push({ talla, sku, stock, precio });
    return true;
  }

  function addRow(designer, catNorm, subcatNorm, nombre, colorRaw, tallaRaw, skuRaw, precio, qty) {
    const sku   = norm(skuRaw);
    const talla = normalizeTalla(tallaRaw);
    const color = normalizeColor(colorRaw) || 'Único';

    if (!sku || !designer || precio <= 0) return;

    if (talla) tallasSet.add(talla);
    coloresSet.add(color);

    const baseKey = `${designer}|||${nombre}|||${precio}`;
    const stock   = parseInt(qty) || 0;

    // Intentar el bucket base primero, luego splits hasta encontrar uno sin conflicto
    let placed = false;
    let splitIdx = 0;
    while (!placed) {
      const candidateKey = splitIdx === 0 ? baseKey : `${baseKey}|||split${splitIdx}`;
      const ok = tryAddToKey(candidateKey, nombre, designer, catNorm, subcatNorm, precio, color, talla, sku, stock);
      if (ok) {
        placed = true;
        if (splitIdx > 0) splitCount++;
      } else {
        splitIdx++;
      }
    }
  }

  // Procesar Hoja1
  for (const r of rows1) {
    const designer   = normalizeDesigner(norm(r[1]));
    const catNorm    = normalizeCatName(r[2]);
    const subcatNorm = normalizeSubcat(r[3]);
    const descRaw    = norm(r[4]);
    const tallaRaw   = norm(r[5]);
    const colorRaw   = norm(r[6]);
    const skuRaw     = norm(r[7]);
    const precio     = parseFloat(r[8]) || 0;
    const qty        = parseInt(r[9]) || 0;
    if (!skuRaw || !designer || precio <= 0) continue;

    const descNorm  = descRaw.toLowerCase().replace(/\s+/g, ' ');
    const colorNorm = colorRaw.toLowerCase().replace(/\s+/g, ' ');
    const nombre    = (!descRaw || descNorm === colorNorm) ? subcatNorm : titleCase(descRaw);

    addRow(designer, catNorm, subcatNorm, nombre, colorRaw, tallaRaw, skuRaw, precio, qty);
  }

  // Procesar Hoja 1 (perfumes + accesorios)
  for (const r of rows2) {
    const designer   = normalizeDesigner(norm(r[1]));
    const catNorm    = normalizeCatName(r[2]) || 'Perfume';
    const subcatNorm = catNorm;
    const descRaw    = norm(r[3]);
    const colorOlor  = norm(r[5]) || 'Único';
    const skuRaw     = norm(r[6]);
    const precio     = parseFloat(r[7]) || 0;
    const qty        = parseInt(r[8]) || 0;
    if (!skuRaw || !designer || !descRaw || precio <= 0) continue;
    addRow(designer, catNorm, subcatNorm, titleCase(descRaw), colorOlor, '', skuRaw, precio, qty);
  }

  if (skuDups > 0)    console.log(`  [WARN] ${skuDups} SKUs exactamente duplicados ignorados`);
  if (splitCount > 0) console.log(`  [INFO] ${splitCount} filas de conflicto separadas en productos nuevos`);
  console.log(`  Buckets totales: ${bucket.size}`);

  // ── 6. Crear catálogos Talla y Color ───────────────────────────────────────
  console.log('\n[6/7] Creando catálogo de tallas y colores...');

  const tallaSorted = [...tallasSet].sort((a, b) => getTallaOrden(a) - getTallaOrden(b));
  await Talla.insertMany(
    tallaSorted.map((nombre, i) => ({
      nombre,
      orden: getTallaOrden(nombre),
      talla_eur: null,
      talla_us: null,
    })),
    { ordered: false }
  );

  const coloresSorted = [...coloresSet].sort((a, b) => a.localeCompare(b, 'es'));
  await Color.insertMany(
    coloresSorted.map(nombre => ({ nombre, hex: null })),
    { ordered: false }
  );

  console.log(`  Tallas: ${tallaSorted.length} | Colores: ${coloresSorted.length}`);

  // ── 7. Construir docs y marcar duplicados ──────────────────────────────────
  console.log('\n[7/7] Insertando productos...');

  const docs = [];
  for (const [, p] of bucket) {
    const globalCatId   = globalCatMap[p.catNorm] ?? null;
    const globalSubId   = globalSubcatMap[`${p.catNorm}|${p.subcatNorm}`] ?? null;
    const designerObjId = designerMap[p.marca] ?? null;

    const firstVariant = [...p.variants.values()][0] ?? [];
    const primarySku   = firstVariant[0]?.sku ?? 'SIN_SKU';
    const { main, hover, gallery } = getProductImages(primarySku, p.catNorm);
    const codigoMin = computeCodigoMin(p.variants);

    const variantes = [...p.variants.entries()].map(([color, tallas], idx) => ({
      color,
      imagenes:    idx === 0 ? [main, hover] : [main],
      esPrincipal: idx === 0,
      tallas: tallas.map(t => ({
        talla:     t.talla,
        sku:       t.sku,
        stock:     t.stock,
        precio:    t.precio,
        descuento: 0,
      })),
    }));

    const stockTotal = variantes.reduce(
      (sum, v) => sum + v.tallas.reduce((s2, t) => s2 + t.stock, 0), 0
    );

    docs.push({
      nombre:           p.nombre,
      marca:            p.marca,
      category:         globalCatId,
      subcategory:      globalSubId,
      designer:         designerObjId,
      imagen_url:       main,
      galeria:          gallery,
      stock_actual:     stockTotal,
      precio_min:       p.precio,
      tiene_oferta:     false,
      variantes,
      codigoMin,
      esVisible:        true,         // se corrige abajo para duplicados
      primaryProductId: null,
    });
  }

  // Marcar duplicados: mismo nombre+marca → solo el de menor codigoMin queda visible
  const nameGroups = new Map();
  docs.forEach((doc, i) => {
    const k = `${doc.nombre.toLowerCase()}|||${doc.marca.toLowerCase()}`;
    if (!nameGroups.has(k)) nameGroups.set(k, []);
    nameGroups.get(k).push(i);
  });

  let hiddenCount = 0;
  for (const [, idxList] of nameGroups) {
    if (idxList.length <= 1) continue;
    idxList.sort((a, b) => (docs[a].codigoMin || Infinity) - (docs[b].codigoMin || Infinity));
    for (let i = 1; i < idxList.length; i++) {
      docs[idxList[i]].esVisible = false;
      hiddenCount++;
    }
  }
  if (hiddenCount > 0) console.log(`  [INFO] ${hiddenCount} productos marcados como duplicados (esVisible=false)`);

  // Insertar en lotes de 100
  let inserted = 0;
  const CHUNK  = 100;
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Product.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
    inserted += Math.min(CHUNK, docs.length - i);
    process.stdout.write(`\r  ${inserted}/${docs.length}`);
  }

  // Segunda pasada: asignar primaryProductId a los productos ocultos
  if (hiddenCount > 0) {
    process.stdout.write('\n  Asignando referencias a productos primarios...');
    const hiddenDocs = await Product.find({ esVisible: false }).select('nombre marca').lean();
    const bulkOps = [];
    for (const h of hiddenDocs) {
      const primary = await Product.findOne({ nombre: h.nombre, marca: h.marca, esVisible: true })
        .sort({ codigoMin: 1 })
        .select('_id')
        .lean();
      if (primary) {
        bulkOps.push({ updateOne: { filter: { _id: h._id }, update: { primaryProductId: primary._id } } });
      }
    }
    if (bulkOps.length) await Product.bulkWrite(bulkOps);
    console.log(` ${bulkOps.length} referencias asignadas.`);
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  const counts = { Zapatillas: 0, Ropa: 0, Accesorios: 0, Perfume: 0 };
  docs.forEach(d => {
    const key = Object.keys(globalCatMap).find(k => globalCatMap[k]?.toString() === d.category?.toString());
    if (key) counts[key]++;
  });

  const multiColor = docs.filter(d => d.variantes.length > 1).length;
  const multiTalla = docs.filter(d => d.variantes.some(v => v.tallas.length > 1)).length;

  console.log('\n\n════════════════════════════════════');
  console.log('  IMPORTACIÓN COMPLETADA');
  console.log('════════════════════════════════════');
  console.log(`  Total productos:      ${docs.length}`);
  console.log(`    Zapatillas:         ${counts.Zapatillas}`);
  console.log(`    Ropa:               ${counts.Ropa}`);
  console.log(`    Accesorios:         ${counts.Accesorios}`);
  console.log(`    Perfumes:           ${counts.Perfume}`);
  console.log(`  Visibles:             ${docs.length - hiddenCount}`);
  console.log(`  Ocultos (duplicados): ${hiddenCount}`);
  console.log(`  Con +1 color:         ${multiColor}`);
  console.log(`  Con +1 talla:         ${multiTalla}`);
  console.log(`  Diseñadores:          ${Object.keys(designerMap).length}`);
  console.log(`  Tallas en catálogo:   ${tallaSorted.length}`);
  console.log(`  Colores en catálogo:  ${coloresSorted.length}`);
  console.log(`  Subcategorías:        ${Object.keys(globalSubcatMap).length}`);
  console.log('════════════════════════════════════');
  console.log('\n  Convención de fotos reales:');
  console.log('  public/images/products/{SKU}-main.jpg');
  console.log('  public/images/products/{SKU}-hover.jpg');
  console.log('════════════════════════════════════');

  process.exit(0);
}

run().catch(err => {
  console.error('\nError fatal:', err.message);
  process.exit(1);
});
