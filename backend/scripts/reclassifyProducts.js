const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Type = require('../src/models/Type');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

async function run() {
  await connectDB();
  console.log("Reclasificando Subcategorías y Productos según su nombre...");

  const streetwear = await Category.findOne({ name: 'STREETWEAR LUJOSO' });
  if (!streetwear) { console.log("No streetwear cat found"); return; }

  const swZap = await Type.findOne({ name: 'Zapatillas', category: streetwear._id });
  const swRop = await Type.findOne({ name: 'Ropa', category: streetwear._id });
  const swAcc = await Type.findOne({ name: 'Accesorios', category: streetwear._id });

  if (!swZap || !swRop || !swAcc) {
      console.log("Types not found", { swZap, swRop, swAcc });
      return;
  }

  const subcategories = await Subcategory.find({ category: streetwear._id });
  
  let countZap = 0;
  let countRop = 0;
  let countAcc = 0;

  for (const sub of subcategories) {
       let targetType = swRop; // Por defecto es ropa
       const n = sub.name.toLowerCase();
       
       if (n.includes('jordan') || n.includes('yeezy') || n.includes('sneaker') || n.includes('dunk') || n.includes('air max') || n.includes('air force') || n.includes('retro')) {
           targetType = swZap;
       } else if (n.includes('lente') || n.includes('gafa') || n.includes('gorra') || n.includes('accesorio') || n.includes('bolso') || n.includes('cadena') || n.includes('joya') || n.includes('peluche') || n.includes('muñeco') || n.includes('beanie')) {
           targetType = swAcc;
       }

       sub.type = targetType._id;
       await sub.save();
       
       const result = await Product.updateMany(
           { subcategory: sub._id }, 
           { $set: { type: targetType._id } }
       );

       if (targetType._id.equals(swZap._id)) countZap += result.modifiedCount;
       if (targetType._id.equals(swRop._id)) countRop += result.modifiedCount;
       if (targetType._id.equals(swAcc._id)) countAcc += result.modifiedCount;
  }

  console.log(`Reclasificación exitosa: Zapatillas: ${countZap}, Ropa: ${countRop}, Accesorios: ${countAcc}`);
  process.exit(0);
}

run().catch(console.error);
