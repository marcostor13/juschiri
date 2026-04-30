const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const Product = require('../src/models/Product');

const s3 = new S3Client({
  region: process.env.S3_REGION2 || 'us-east-2',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});
const BUCKET = process.env.S3_BUCKET2;

const SOURCE_DIRS = [
  'IMAGENES Dari',
  'IMAGENES jhaja',
  'IMAGENES TATI'
];

const PUBLIC_PATH = path.join(__dirname, '../../public');

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.jfif': 'image/jpeg'
};

async function uploadToS3(localPath, fileName) {
  const ext = path.extname(localPath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const key = `${process.env.S3_FOLDER || 'products'}/${fileName}`;
  
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fs.readFileSync(localPath),
    ContentType: mime,
  }));
  
  return `https://${BUCKET}.s3.${process.env.S3_REGION2 || 'us-east-2'}.amazonaws.com/${key}`;
}

async function run() {
  try {
    if (!BUCKET) {
      console.error('❌ ERROR: S3_BUCKET2 no definida en .env');
      process.exit(1);
    }

    await connectDB();
    console.log("🚀 Conectado a MongoDB. Iniciando sincronización a S3...");

    let totalUploaded = 0;
    let totalUpdatedInDB = 0;
    let productsNotFound = new Set();

    for (const dirName of SOURCE_DIRS) {
      const dirPath = path.join(PUBLIC_PATH, dirName);
      if (!fs.existsSync(dirPath)) {
        console.warn(`⚠️ Directorio no encontrado: ${dirPath}`);
        continue;
      }

      const files = fs.readdirSync(dirPath);
      console.log(`\n📂 Procesando carpeta: ${dirName} (${files.length} archivos)`);

      for (const file of files) {
        // Filtrar archivos válidos
        if (!file.match(/\.(jpe?g|png|webp|gif|mp4|mov|jfif)$/i)) continue;
        
        const codeMatch = file.match(/^([a-zA-Z0-9]+)/);
        if (!codeMatch) continue;
        
        const code = codeMatch[1];
        const localPath = path.join(dirPath, file);
        
        // Detección de galería: si el nombre es más largo que el código + extensión (ej. tiene (1))
        const isGallery = file.length > (code.length + path.extname(file).length);

        const product = await Product.findOne({ codigo: code });
        if (!product) {
          productsNotFound.add(code);
          continue;
        }

        try {
          console.log(`📤 Subiendo ${file}...`);
          const s3Url = await uploadToS3(localPath, file);
          totalUploaded++;

          if (isGallery) {
            // Agregar a galería si no está presente
            if (!product.galeria.includes(s3Url)) {
              product.galeria.push(s3Url);
              await product.save();
              totalUpdatedInDB++;
              console.log(`  ✅ [GALERÍA] ${code}: ${s3Url}`);
            }
          } else {
            // Actualizar imagen principal (siempre sobrescribe la anterior)
            if (product.imagen_url !== s3Url) {
              product.imagen_url = s3Url;
              await product.save();
              totalUpdatedInDB++;
              console.log(`  ✅ [PRINCIPAL] ${code}: ${s3Url}`);
            }
          }
        } catch (err) {
          console.error(`  ❌ Error al subir ${file}:`, err.message);
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 RESUMEN FINAL:`);
    console.log(`- Archivos subidos a S3: ${totalUploaded}`);
    console.log(`- Registros actualizados en DB: ${totalUpdatedInDB}`);
    console.log(`- Productos no encontrados en DB: ${productsNotFound.size}`);
    if (productsNotFound.size > 0) {
      console.log(`  (Códigos no encontrados: ${Array.from(productsNotFound).slice(0, 10).join(', ')}...)`);
    }
    console.log("=".repeat(50));

    process.exit(0);
  } catch (err) {
    console.error("❌ Error crítico durante la ejecución:", err);
    process.exit(1);
  }
}

run();
