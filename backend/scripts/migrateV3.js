const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Type = require('../src/models/Type');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Reemplazar espacios por -
    .replace(/[^\w\-]+/g, '')       // Eliminar caracteres que no sean palabras
    .replace(/\-\-+/g, '-')         // Reemplazar múltiples - por uno solo
    .replace(/^-+/, '')             // Eliminar - al principio
    .replace(/-+$/, '');            // Eliminar - al final
}

async function run() {
  await connectDB();
  console.log("Conectado a DB. Iniciando migración a V3...");

  // 1. Encontrar o crear Tipo "Zapatillas", "Ropa", "Accesorios" para cada categoría
  const categories = await Category.find();
  for (const cat of categories) {
    const baseSlug = slugify(cat.name);
    
    // Crear tipos por defecto
    const zapatillasType = await Type.findOneAndUpdate(
      { slug: `${baseSlug}-zapatillas` },
      { name: 'Zapatillas', slug: `${baseSlug}-zapatillas`, category: cat._id },
      { upsert: true, new: true }
    );
    
    const ropaType = await Type.findOneAndUpdate(
      { slug: `${baseSlug}-ropa` },
      { name: 'Ropa', slug: `${baseSlug}-ropa`, category: cat._id },
      { upsert: true, new: true }
    );
    
    const accesoriosType = await Type.findOneAndUpdate(
      { slug: `${baseSlug}-accesorios` },
      { name: 'Accesorios', slug: `${baseSlug}-accesorios`, category: cat._id },
      { upsert: true, new: true }
    );

    // 2. Mover subcategorías actuales a sus tipos respectivos
    const subcategories = await Subcategory.find({ category: cat._id });
    for (const sub of subcategories) {
       let targetType = ropaType;
       const n = sub.name.toLowerCase();
       if (n.includes('jordan') || n.includes('yeezy') || n.includes('sneaker') || n.includes('dunk') || cat.name.toLowerCase() === 'zapatillas') {
           targetType = zapatillasType;
       } else if (n.includes('lente') || n.includes('gafa') || n.includes('gorra') || n.includes('accesorio') || n.includes('bolso') || n.includes('cadena') || n.includes('joya') || n.includes('peluche') || n.includes('muñeco')) {
           targetType = accesoriosType;
       }

       sub.type = targetType._id;
       await sub.save();
       
       await Product.updateMany({ subcategory: sub._id }, { type: targetType._id });
    }
  }

  // 3. Procesar el JSON que ya tenemos de migrate_zapatillas.py con las fotos subidas a S3
  const jsonPath = path.join(__dirname, '../../scripts/migrate/output/zapatillas_ready.json');
  if (fs.existsSync(jsonPath)) {
      console.log("Procesando JSON de nuevas Zapatillas...");
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      let zapatillaCat = await Category.findOne({ name: 'Zapatillas' });
      if (!zapatillaCat) {
          zapatillaCat = await Category.create({ name: 'Zapatillas', slug: 'zapatillas' });
      }

      const zapatillaType = await Type.findOneAndUpdate(
        { slug: `zapatillas-zapatillas` },
        { name: 'Zapatillas', slug: `zapatillas-zapatillas`, category: zapatillaCat._id },
        { upsert: true, new: true }
      );

      for(const p of data) {
         if (!p.codigo) continue;
         const subSlug = slugify(`zap-${p.subcategoria || 'otros'}`);
         
         let sub = await Subcategory.findOne({ slug: subSlug });
         if(!sub) {
             sub = await Subcategory.create({ name: p.subcategoria || 'Otros', category: zapatillaCat._id, type: zapatillaType._id, slug: subSlug });
         }

         await Product.updateOne(
             { codigo: p.codigo },
             { $set: { 
                 category: zapatillaCat._id, 
                 type: zapatillaType._id,
                 subcategory: sub._id,
                 nombre: p.nombre,
                 marca: p.marca || 'Genérico',
                 precio: p.precio || 0,
                 stock_actual: p.stock_actual || 1,
                 imagen_url: p.imagen_url
             }},
             { upsert: true }
         );
      }
      console.log(`Zapatillas procesadas e insertadas/actualizadas. (${data.length} ítems)`);
  } else {
      console.log("No se encontró el archivo zapatillas_ready.json, ignorando importación masiva de zapatillas.");
  }

  console.log("Migración V3 finalizada con éxito.");
  process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
