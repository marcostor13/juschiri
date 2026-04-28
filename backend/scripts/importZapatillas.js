const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Cargar variables de entorno si existe .env, sino usar la conexión directa de db.js
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

function normalizeCategory(cat) {
    if (!cat) return null;
    const c = cat.trim();
    return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
}

function normalizeSubcategory(sub) {
    if (!sub) return null;
    let s = sub.trim();
    // Capitalizar cada palabra para mantener homogeneidad
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function importZapatillas() {
  await connectDB();
  console.log('Conectado a la base de datos.');

  const jsonFilePath = path.join(__dirname, '../../scripts/migrate/output/zapatillas_ready.json');
  
  if (!fs.existsSync(jsonFilePath)) {
      console.error(`El archivo ${jsonFilePath} no existe. Por favor corre migrate_zapatillas.py primero.`);
      process.exit(1);
  }

  console.log('Leyendo archivo JSON...');
  const zapatillas = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  console.log(`Se leyeron ${zapatillas.length} zapatillas del JSON.`);

  // 1. Extraer categorías y subcategorías únicas del JSON
  const subcategoriasUnicas = new Set();
  
  zapatillas.forEach(p => {
      if (p.subcategoria) {
          subcategoriasUnicas.add(normalizeSubcategory(p.subcategoria));
      }
  });

  // 2. Crear Categoría Principal "Zapatillas" y Subcategorías
  console.log('Sincronizando categoría "Zapatillas" y sus subcategorías en la BD...');
  
  let mainCat = await Category.findOne({ name: 'Zapatillas' });
  if (!mainCat) {
      mainCat = await Category.create({ name: 'Zapatillas' });
      console.log('Creada categoría principal: Zapatillas');
  }

  const subcategoryIdMap = {}; // subcategoria name -> ObjectId

  for (const subcatName of subcategoriasUnicas) {
      let subcatDoc = await Subcategory.findOne({ name: subcatName, category: mainCat._id });
      if (!subcatDoc) {
          subcatDoc = await Subcategory.create({ name: subcatName, category: mainCat._id });
          console.log(`Creada subcategoría: ${subcatName} (para Zapatillas)`);
      }
      subcategoryIdMap[subcatName] = subcatDoc._id;
  }

  // 3. Upsert de productos en la BD
  console.log('Actualizando o insertando productos...');
  let updatedCount = 0;
  let insertedCount = 0;

  for (const p of zapatillas) {
      if (!p.codigo) continue;

      const subcatNameNormalized = normalizeSubcategory(p.subcategoria);
      const subId = subcatNameNormalized ? subcategoryIdMap[subcatNameNormalized] : null;

      const updateData = {
          nombre: p.nombre,
          marca: p.marca,
          precio: p.precio || 0,
          stock_actual: p.stock_actual || 1,
          category: mainCat._id,
      };

      if (subId) {
          updateData.subcategory = subId;
      }
      if (p.imagen_url) {
          updateData.imagen_url = p.imagen_url;
      }

      // Upsert: Si existe lo actualiza, si no existe lo crea
      const result = await Product.updateOne(
          { codigo: p.codigo },
          { $set: updateData },
          { upsert: true }
      );

      if (result.upsertedCount > 0) {
          insertedCount++;
      } else if (result.modifiedCount > 0) {
          updatedCount++;
      }
  }

  console.log('--- Resumen ---');
  console.log(`Zapatillas nuevas insertadas: ${insertedCount}`);
  console.log(`Zapatillas existentes actualizadas: ${updatedCount}`);
  
  console.log('Proceso completado exitosamente.');
  process.exit(0);
}

importZapatillas().catch(err => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
