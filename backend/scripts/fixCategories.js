const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Type = require('../src/models/Type');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  await connectDB();
  console.log("Conectado a DB. Ejecutando Fix de Categorías...");

  // 1. Asegurar categorías principales
  let streetwear = await Category.findOne({ name: 'STREETWEAR LUJOSO' });
  if (!streetwear) {
      streetwear = await Category.create({ name: 'STREETWEAR LUJOSO', slug: 'streetwear-lujoso' });
  }

  let disenador = await Category.findOne({ name: 'Diseñador' });
  if (!disenador) {
      disenador = await Category.create({ name: 'Diseñador', slug: 'disenador' });
  }

  // 2. Crear tipos Zapatillas, Ropa y Accesorios para ambas
  const createTypes = async (cat) => {
      const baseSlug = slugify(cat.name);
      await Type.findOneAndUpdate({ slug: `${baseSlug}-zapatillas` }, { name: 'Zapatillas', slug: `${baseSlug}-zapatillas`, category: cat._id }, { upsert: true });
      await Type.findOneAndUpdate({ slug: `${baseSlug}-ropa` }, { name: 'Ropa', slug: `${baseSlug}-ropa`, category: cat._id }, { upsert: true });
      await Type.findOneAndUpdate({ slug: `${baseSlug}-accesorios` }, { name: 'Accesorios', slug: `${baseSlug}-accesorios`, category: cat._id }, { upsert: true });
  };
  await createTypes(streetwear);
  await createTypes(disenador);

  const swZapatillasType = await Type.findOne({ name: 'Zapatillas', category: streetwear._id });
  const swRopaType = await Type.findOne({ name: 'Ropa', category: streetwear._id });

  // 3. Obtener la categoría errónea "Zapatillas"
  const badCat = await Category.findOne({ name: 'Zapatillas' });
  if (badCat) {
      console.log("Moviendo contenido de la Categoría 'Zapatillas' a 'STREETWEAR LUJOSO' -> 'Zapatillas'");
      
      const subcategories = await Subcategory.find({ category: badCat._id });
      for (const sub of subcategories) {
          sub.category = streetwear._id;
          sub.type = swZapatillasType._id;
          await sub.save();
      }

      await Product.updateMany(
          { category: badCat._id },
          { $set: { category: streetwear._id, type: swZapatillasType._id } }
      );

      // Eliminar categoría errónea y sus tipos creados por error
      await Type.deleteMany({ category: badCat._id });
      await Category.deleteOne({ _id: badCat._id });
  }

  // 4. Mover todas las categorías que sean 'Ropa' o 'Accesorios' si estaban sueltas
  // Revisaremos todo lo que no esté en Streetwear o Diseñador
  const allCats = await Category.find();
  for (const c of allCats) {
      if (c._id.equals(streetwear._id) || c._id.equals(disenador._id)) continue;
      
      console.log(`Moviendo categoría obsoleta ${c.name} a Ropa de STREETWEAR...`);
      const subs = await Subcategory.find({ category: c._id });
      for (const sub of subs) {
          sub.category = streetwear._id;
          sub.type = swRopaType._id;
          await sub.save();
      }

      await Product.updateMany(
          { category: c._id },
          { $set: { category: streetwear._id, type: swRopaType._id } }
      );
      
      await Type.deleteMany({ category: c._id });
      await Category.deleteOne({ _id: c._id });
  }

  console.log("Fix terminado con éxito.");
  process.exit(0);
}

run().catch(console.error);
