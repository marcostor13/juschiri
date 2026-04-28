const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Product = require('../src/models/Product');

async function run() {
  await connectDB();
  console.log("Conectado a DB. Actualizando imágenes desde products.json...");

  const jsonPath = path.join(__dirname, '../../scripts/migrate/output/products.json');
  if (!fs.existsSync(jsonPath)) {
      console.error(`No se encontró el archivo: ${jsonPath}`);
      process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let updatedCount = 0;

  for (const item of data) {
      if (!item.codigo || !item.imagen_url) continue;

      const result = await Product.updateOne(
          { codigo: item.codigo },
          { $set: { imagen_url: item.imagen_url } }
      );

      if (result.modifiedCount > 0) {
          updatedCount++;
      }
  }

  console.log(`¡Actualización de imágenes terminada! Se actualizaron ${updatedCount} productos.`);
  process.exit(0);
}

run().catch(console.error);
