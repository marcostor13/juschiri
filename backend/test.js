require('dotenv').config({path: '../.env'});
const mongoose = require('mongoose');
const connectDB = require('./src/db');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Type = require('./src/models/Type');

async function run() {
  await connectDB();
  const prods = await Product.findOne({ codigo: '00000600' });
  console.log(prods);
  process.exit(0);
}
run();
