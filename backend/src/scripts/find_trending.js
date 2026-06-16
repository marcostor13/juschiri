require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const connectDB = require('../db');
const Product   = require('../models/Product');

async function main() {
  await connectDB();

  // 5 productos icónicos de las marcas más representadas — con imagen
  const ids = [
    // Palm Angels — más popular (87 visibles)
    '6a30aaf733ebc7e910d2c908',
    // Off White
    '6a30aaf533ebc7e910d2c8bd',
    // Supreme
    '6a30aaf633ebc7e910d2c8f3',
    // Essentials
    '6a30aaf333ebc7e910d2c88d',
    // Travis Scott
    '6a30aafb33ebc7e910d2c980',
  ];

  const products = await Product.find({ _id: { $in: ids } })
    .select('nombre marca imagen_url precio_min _id').lean();

  console.log('\nDatos para defaultItems:\n');
  products.forEach(p => {
    console.log(`{ brand: '${p.marca}', name: '${p.nombre}', productId: '${p._id}', img: '${p.imagen_url}', precio: ${p.precio_min} },`);
  });

  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
