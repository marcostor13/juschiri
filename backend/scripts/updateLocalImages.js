const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Product = require('../src/models/Product');

const SOURCE_DIRS = [
  'IMAGENES Dari',
  'IMAGENES jhaja',
  'IMAGENES TATI'
];

const PUBLIC_PATH = path.join(__dirname, '../../public');

async function run() {
  try {
    await connectDB();
    console.log("🚀 Conectado a MongoDB. Iniciando actualización de imágenes...");

    let totalUpdated = 0;
    let totalFiles = 0;
    let productsNotFound = new Set();

    for (const dirName of SOURCE_DIRS) {
      const dirPath = path.join(PUBLIC_PATH, dirName);
      if (!fs.existsSync(dirPath)) {
        console.warn(`⚠️ Directorio no encontrado: ${dirPath}`);
        continue;
      }

      const files = fs.readdirSync(dirPath);
      console.log(`\n📂 Procesando: ${dirName} (${files.length} archivos)`);

      for (const file of files) {
        // Filtrar solo imágenes y videos
        if (!file.match(/\.(jpe?g|png|webp|gif|mp4|mov|jfif)$/i)) continue;
        
        totalFiles++;
        
        // Extraer el código del producto (primer bloque alfanumérico)
        // Ejemplo: "00001726(1).jpeg" -> "00001726"
        // Ejemplo: "PACK0101.jpeg" -> "PACK0101"
        const codeMatch = file.match(/^([a-zA-Z0-9]+)/);
        if (!codeMatch) continue;
        
        const code = codeMatch[1];
        const isGallery = file.includes('(') || file.includes(' - ') || file.match(/_\d+/) || file.match(/[a-zA-Z0-9]+\d+\./) === null && file.includes(code);
        
        // Refinamos la detección de galería: si tiene paréntesis o el nombre es más largo que el código básico
        const isActuallyGallery = file.length > (code.length + path.extname(file).length);

        const product = await Product.findOne({ codigo: code });
        if (!product) {
          productsNotFound.add(code);
          continue;
        }

        const relativePath = `/${dirName}/${file}`;
        
        if (isActuallyGallery) {
          // Es una imagen de galería
          if (!product.galeria.includes(relativePath)) {
            product.galeria.push(relativePath);
            await product.save();
            totalUpdated++;
            console.log(`✅ [GALERÍA] ${code}: Agregada ${file}`);
          }
        } else {
          // Es la imagen principal
          if (product.imagen_url !== relativePath) {
            product.imagen_url = relativePath;
            await product.save();
            totalUpdated++;
            console.log(`✅ [PRINCIPAL] ${code}: Actualizada a ${file}`);
          }
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 RESUMEN:`);
    console.log(`- Archivos procesados: ${totalFiles}`);
    console.log(`- Registros actualizados en DB: ${totalUpdated}`);
    console.log(`- Códigos no encontrados en DB: ${productsNotFound.size}`);
    if (productsNotFound.size > 0) {
      console.log(`  (Algunos códigos: ${Array.from(productsNotFound).slice(0, 10).join(', ')}...)`);
    }
    console.log("=".repeat(50));

    process.exit(0);
  } catch (err) {
    console.error("❌ Error durante la ejecución:", err);
    process.exit(1);
  }
}

run();
