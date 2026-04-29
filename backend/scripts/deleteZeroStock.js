/**
 * Script: deleteZeroStock.js
 * Elimina todos los productos con stock_actual === 0 de la base de datos.
 * Uso: node backend/scripts/deleteZeroStock.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const MONGODB_URI = process.env.MONGODB_URI2 || process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI no definida en .env');
    process.exit(1);
  }

  console.log('Conectando a MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Conectado.\n');

  const total = await Product.countDocuments({ stock_actual: 0 });
  console.log(`Productos con stock 0 encontrados: ${total}`);

  if (total === 0) {
    console.log('Nada que eliminar.');
    await mongoose.disconnect();
    return;
  }

  const answer = process.argv[2];
  if (answer !== '--confirm') {
    console.log(`\nPara confirmar la eliminación de ${total} productos, ejecuta:`);
    console.log('  node backend/scripts/deleteZeroStock.js --confirm\n');
    await mongoose.disconnect();
    return;
  }

  const result = await Product.deleteMany({ stock_actual: 0 });
  console.log(`\nEliminados: ${result.deletedCount} productos con stock 0.`);

  await mongoose.disconnect();
  console.log('Listo.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
