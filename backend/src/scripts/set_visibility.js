require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const connectDB = require('../db');
const Product   = require('../models/Product');

async function main() {
  await connectDB();
  const visible = await Product.updateMany({ imagen_url: { $ne: null } }, { $set: { esVisible: true } });
  const hidden  = await Product.updateMany({ imagen_url: null },           { $set: { esVisible: false } });
  console.log('Activados (con imagen):', visible.modifiedCount);
  console.log('Ocultos  (sin imagen): ', hidden.modifiedCount);
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
