require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('./src/db');
const Product = require('./src/models/Product');

async function test() {
  await connectDB();
  const res = await Product.find({ descuento: { $gt: 0 }, precio: { $gt: 0 } }).limit(2);
  console.log('Products with >0 price and discount:', res);
  process.exit(0);
}

test();
