const path = require('path');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Type = require('../src/models/Type');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  await connectDB();
  console.log("Conectado a DB. Importando Excel a V3...");

  // Soltar índice antiguo si existe para no tener conflictos
  try {
      await Subcategory.collection.dropIndex('name_1_category_1');
  } catch(e) { /* ignorar si no existe */ }

  const excelPath = path.join(__dirname, '../../TRABAJO INVENTARIO IVAN - zapatilla (14444444).xlsx');
  
  console.log("Leyendo", excelPath);
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Se encontraron ${data.length} filas.`);

  // La regla es: Todo este excel va a Categoría "Zapatillas", Tipo "Zapatillas".
  let zapatillaCat = await Category.findOne({ name: 'Zapatillas' });
  if (!zapatillaCat) {
      zapatillaCat = await Category.create({ name: 'Zapatillas', slug: 'zapatillas' });
  }

  const zapatillaType = await Type.findOneAndUpdate(
    { slug: `zapatillas-zapatillas` },
    { name: 'Zapatillas', slug: `zapatillas-zapatillas`, category: zapatillaCat._id },
    { upsert: true, new: true }
  );

  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of data) {
    const codigo = (row['Código'] || row['Codigo'] || '').toString().trim();
    if (!codigo) continue;

    const nombre = (row['Nombre'] || '').toString().trim();
    const marca = (row['Marca'] || 'Genérico').toString().trim();
    let subcategoriaName = (row['Sub Categorias'] || row['Categorias'] || 'Otros').toString().trim();
    
    // Capitalizar
    subcategoriaName = subcategoriaName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    let precio = parseFloat(row['PRECIO']);
    if (isNaN(precio)) precio = 0;
    
    let stock = parseInt(row['STOCK ACTUAL'] || row['STOCK TANDIA']);
    if (isNaN(stock)) stock = 1;

    // Buscar o crear subcategoria por nombre dentro de la misma categoría
    const subSlug = slugify(`zap-${subcategoriaName}`);
    let sub = await Subcategory.findOne({ name: subcategoriaName, category: zapatillaCat._id });
    if (!sub) {
        sub = await Subcategory.create({ name: subcategoriaName, category: zapatillaCat._id, type: zapatillaType._id, slug: subSlug });
    } else {
        // Actualizarle el type y slug si ya existía
        sub.type = zapatillaType._id;
        sub.slug = subSlug;
        await sub.save();
    }

    const result = await Product.updateOne(
        { codigo },
        { $set: { 
            category: zapatillaCat._id, 
            type: zapatillaType._id,
            subcategory: sub._id,
            nombre,
            marca,
            precio,
            stock_actual: stock,
            // no sobreescribimos imagen si ya existe y no tenemos una nueva
        }},
        { upsert: true }
    );

    if (result.upsertedCount > 0) insertedCount++;
    else if (result.modifiedCount > 0) updatedCount++;
  }

  console.log(`Insertados: ${insertedCount}, Actualizados: ${updatedCount}`);
  console.log("Proceso finalizado con éxito.");
  process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
