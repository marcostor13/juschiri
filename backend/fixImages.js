require('dotenv').config({path: '../.env'});
const mongoose = require('mongoose');
const connectDB = require('./src/db');
const Product = require('./src/models/Product');

async function run() {
  await connectDB();
  
  // Arreglar validaciones de stock negativo primero
  await Product.updateMany({ stock_anterior: { $lt: 0 } }, { $set: { stock_anterior: 0 } });
  
  const prods = await Product.find({ imagen_url: /ui-avatars/ });
  
  for (const p of prods) {
    p.imagen_url = 'https://via.placeholder.com/400?text=' + encodeURIComponent(p.marca || 'JusChiri');
    await p.save();
  }
  
  console.log(`Actualizadas ${prods.length} imágenes defectuosas.`);
  process.exit(0);
}
run();
