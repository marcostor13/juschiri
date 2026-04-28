const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Category = require('../src/models/Category');
const Type = require('../src/models/Type');
const Subcategory = require('../src/models/Subcategory');
const Product = require('../src/models/Product');

function slugify(text) {
  if (!text) return 'sin-nombre';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  await connectDB();
  console.log("Conectado a DB. Ejecutando importación de Ropa y Accesorios...");

  const streetwear = await Category.findOne({ name: 'STREETWEAR LUJOSO' });
  const disenador = await Category.findOne({ name: 'Diseñador' });

  if (!streetwear || !disenador) {
      console.error("No se encontraron las categorías principales. Corre fixCategories.js primero.");
      return;
  }

  const typesCache = {
      'STREETWEAR LUJOSO': {
          Zapatillas: await Type.findOne({ name: 'Zapatillas', category: streetwear._id }),
          Ropa: await Type.findOne({ name: 'Ropa', category: streetwear._id }),
          Accesorios: await Type.findOne({ name: 'Accesorios', category: streetwear._id })
      },
      'Diseñador': {
          Zapatillas: await Type.findOne({ name: 'Zapatillas', category: disenador._id }),
          Ropa: await Type.findOne({ name: 'Ropa', category: disenador._id }),
          Accesorios: await Type.findOne({ name: 'Accesorios', category: disenador._id })
      }
  };

  const filepath = 'C:\\Users\\MARCOS\\.gemini\\antigravity\\brain\\9e3a9580-8eea-4508-a3ae-ab888ef59b57\\.system_generated\\steps\\854\\content.md';
  
  // Leer contenido y quitar metadata
  const fileContent = fs.readFileSync(filepath, 'utf-8');
  const lines = fileContent.split('\n');
  const csvLines = lines.slice(4).join('\n'); // Salta metadata de Gemini
  
  const tmpPath = path.join(__dirname, 'tmp.csv');
  fs.writeFileSync(tmpPath, csvLines);

  const results = [];
  fs.createReadStream(tmpPath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
        let imported = 0;
        
        for (const row of results) {
            const codigo = row['Código']?.trim();
            const nombre = row['Nombre']?.trim();
            if (!codigo || !nombre) continue;

            const stockStr = row['STOCK ACTUAL']?.trim() || '0';
            const stockVal = parseInt(stockStr, 10);
            const stock = isNaN(stockVal) ? 0 : stockVal;
            
            const precioStr = row['PRECIO']?.trim() || '0';
            const precio = parseFloat(precioStr.replace(/[^\d.-]/g, '')) || 0;
            
            const marca = row['Marca']?.trim() || '';
            const catNameStr = row['CATEGORIA']?.trim().toUpperCase();
            
            // Determinar Categoría Principal
            let catObj = streetwear;
            let catKey = 'STREETWEAR LUJOSO';
            if (catNameStr === 'DISEÑADOR' || catNameStr === 'DICEÑADOR') {
                catObj = disenador;
                catKey = 'Diseñador';
            }

            // Determinar Tipo y Subcategoría
            const rawSub = (row['Sub categoria'] || '').trim().toUpperCase() || 'GENERAL';
            let targetTypeName = 'Ropa';
            
            const n = rawSub.toLowerCase();
            if (n.includes('zapatilla') || n.includes('jordan') || n.includes('yeezy') || n.includes('out of office')) {
                targetTypeName = 'Zapatillas';
            } else if (n.includes('accesorio') || n.includes('gorra') || n.includes('beanie') || n.includes('wallet') || n.includes('glasses') || n.includes('medias') || n.includes('morral') || n.includes('limpieza') || n.includes('dulce') || n.includes('citrico') || n.includes('amaderado') || n.includes('cartera') || n.includes('tarjetero') || n.includes('correa')) {
                targetTypeName = 'Accesorios';
            }

            const targetType = typesCache[catKey][targetTypeName];

            if (!targetType) {
                console.log(`Falta tipo ${targetTypeName} en ${catKey}`);
                continue;
            }

            // Upsert Subcategoría
            const subCat = await Subcategory.findOneAndUpdate(
                { name: rawSub, category: catObj._id },
                {
                    name: rawSub,
                    category: catObj._id,
                    type: targetType._id
                },
                { upsert: true, new: true }
            );

            // Determinar si hay variantes (Talla, Color en el nombre)
            const variantes = [];
            let color = '';
            let talla = '';
            
            const dashParts = nombre.split('-');
            for (const part of dashParts) {
                const p = part.trim().toUpperCase();
                if (p.startsWith('TALLA') || p.startsWith('SIZE')) {
                    talla = p.replace('TALLA', '').replace('SIZE', '').trim();
                } else if (p.startsWith('COLOR')) {
                    color = p.replace('COLOR', '').trim();
                }
            }

            if (talla || color) {
                variantes.push({ talla, color, stock });
            }

            // Upsert Product
            await Product.findOneAndUpdate(
                { codigo },
                {
                    nombre,
                    codigo,
                    marca,
                    precio,
                    stock_actual: variantes.length > 0 ? stock : stock, // Usa el stock base igual
                    variantes: variantes,
                    category: catObj._id,
                    type: targetType._id,
                    subcategory: subCat._id,
                    imagen_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`
                },
                { upsert: true }
            );

            imported++;
        }

        fs.unlinkSync(tmpPath);
        console.log(`¡Importación CSV terminada! ${imported} productos procesados.`);
        process.exit(0);
    });
}

run().catch(console.error);
