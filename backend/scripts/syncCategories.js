const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const mongoose = require('mongoose');

// Cargar variables de entorno si existe .env, sino usar la conexión directa de db.js
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

function normalizeCategory(cat) {
    if (!cat) return null;
    const c = cat.trim().toUpperCase();
    if (c === 'ACCESORIO' || c === 'ACCESORIOS') return 'Accesorios';
    if (c === 'DISEÑADOR' || c === 'DICEÑADOR' || c === 'DISEÑADOR ') return 'Diseñador';
    if (c === 'STREETWEAR LUJOSO' || c === 'STREETWEAR' || c === 'STREET WEAR') return 'Streetwear Lujoso';
    if (c === 'LIMPIEZA' || c === 'ACONDICIONADOR' || c === 'PAÑOS' || c === 'PAñOS' || c === 'REPELENTE') return 'Cuidado';
    if (c === 'CITRICO' || c === 'AMADERADO' || c === 'DULCE') return 'Perfumes';
    return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
}

function normalizeSubcategory(sub) {
    if (!sub) return null;
    let s = sub.trim();
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function syncCategories() {
  await connectDB();
  console.log('Conectado a la base de datos.');

  // PURGAR CATEGORÍAS ANTERIORES PARA EVITAR DUPLICADOS Y BASURA
  console.log('Limpiando base de datos de categorías antiguas...');
  await Category.deleteMany({});
  await Subcategory.deleteMany({});
  await Product.updateMany({}, { $set: { category: null, subcategory: null } });

  const csvFilePath = path.join(__dirname, '../data.csv');
  const productsFromCSV = [];

  // Leer y parsear el archivo CSV usando papaparse
  console.log('Leyendo archivo CSV...');
  const csvData = fs.readFileSync(csvFilePath, 'utf8');
  
  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      results.data.forEach((row) => {
        const codigo = row['Código'] || row['Codigo'] || row['C\u00f3digo']; // Manejar tildes
        const rawCategoria = row['CATEGORIA'];
        const rawSubcategoria = row['Sub categoria'];
        
        const categoria = normalizeCategory(rawCategoria);
        const subcategoria = normalizeSubcategory(rawSubcategoria);
        
        if (codigo) {
          productsFromCSV.push({
            codigo: codigo.trim(),
            categoria: categoria,
            subcategoria: subcategoria,
          });
        }
      });
    }
  });

  console.log(`Se leyeron ${productsFromCSV.length} productos del CSV.`);

  // 1. Extraer categorías y subcategorías únicas del CSV
  const categoryMap = new Map(); // name -> Set of subcategories

  productsFromCSV.forEach(p => {
    if (p.categoria) {
      if (!categoryMap.has(p.categoria)) {
        categoryMap.set(p.categoria, new Set());
      }
      if (p.subcategoria) {
        categoryMap.get(p.categoria).add(p.subcategoria);
      }
    }
  });

  // 2. Crear Categorías y Subcategorías en la BD
  console.log('Sincronizando categorías y subcategorías en la BD...');
  const categoryIdMap = {}; // categoria name -> ObjectId
  const subcategoryIdMap = {}; // categoria_subcategoria -> ObjectId

  for (const [catName, subcats] of categoryMap.entries()) {
    // Buscar o crear la categoría
    let catDoc = await Category.findOne({ name: catName });
    if (!catDoc) {
      catDoc = await Category.create({ name: catName });
      console.log(`Creada categoría: ${catName}`);
    }
    categoryIdMap[catName] = catDoc._id;

    // Buscar o crear las subcategorías
    for (const subcatName of subcats) {
      let subcatDoc = await Subcategory.findOne({ name: subcatName, category: catDoc._id });
      if (!subcatDoc) {
        subcatDoc = await Subcategory.create({ name: subcatName, category: catDoc._id });
        console.log(`Creada subcategoría: ${subcatName} (para ${catName})`);
      }
      subcategoryIdMap[`${catName}_${subcatName}`] = subcatDoc._id;
    }
  }

  // 3. Actualizar productos en la BD
  console.log('Actualizando productos con sus categorías y subcategorías...');
  let updatedCount = 0;
  let notFoundCount = 0;

  for (const p of productsFromCSV) {
    if (!p.categoria && !p.subcategoria) continue; // Saltar si no tiene ambos

    const catId = p.categoria ? categoryIdMap[p.categoria] : null;
    const subId = (p.categoria && p.subcategoria) ? subcategoryIdMap[`${p.categoria}_${p.subcategoria}`] : null;

    if (!catId) continue; // Si por alguna razón no hay catId, ignorar

    const updateQuery = { $set: { category: catId } };
    if (subId) {
      updateQuery.$set.subcategory = subId;
    }

    const result = await Product.updateOne({ codigo: p.codigo }, updateQuery);
    if (result.matchedCount > 0) {
      updatedCount++;
    } else {
      notFoundCount++;
    }
  }

  console.log('--- Resumen ---');
  console.log(`Productos actualizados: ${updatedCount}`);
  console.log(`Productos en CSV no encontrados en BD: ${notFoundCount}`);
  
  console.log('Proceso completado.');
  process.exit(0);
}

syncCategories().catch(err => {
  console.error('Error durante la sincronización:', err);
  process.exit(1);
});
