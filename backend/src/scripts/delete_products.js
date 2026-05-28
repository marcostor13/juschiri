require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const connectDB = require('../db');

async function run() {
  await connectDB();
  const result = await Product.deleteMany({});
  console.log(`Eliminados ${result.deletedCount} productos.`);
  await mongoose.disconnect();
  console.log('Listo.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
