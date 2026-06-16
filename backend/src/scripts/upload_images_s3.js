/**
 * upload_images_s3.js
 * 1. Sube todas las imágenes de las 3 carpetas a S3.
 * 2. Actualiza cada producto en la BD con sus imágenes por variante y SKU.
 *
 * Naming en S3:
 *   00001087.jpeg    → products/00001087.jpeg
 *   00001087(1).jpeg → products/00001087_1.jpeg
 *
 * Asignación:
 *   Variante.imagenes  = todas las imágenes de sus tallas (por SKU)
 *   Product.imagen_url = primera imagen de la variante principal
 *   Product.galeria    = todas las imágenes únicas del producto
 *
 * Idempotente: re-sube (sobreescribe) y re-asigna sin problema.
 *
 * Uso:
 *   cd backend
 *   node src/scripts/upload_images_s3.js
 *   node src/scripts/upload_images_s3.js --dry-run   (sin subir ni guardar)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const fs   = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const connectDB = require('../db');
const Product   = require('../models/Product');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Config S3 ─────────────────────────────────────────────────────────────────

const BUCKET = process.env.S3_BUCKET2;
const REGION = process.env.S3_REGION2 || 'us-east-2';
const FOLDER = process.env.S3_FOLDER  || 'products';

if (!BUCKET && !DRY_RUN) {
  console.error('ERROR: S3_BUCKET2 no está definido en .env');
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});

const publicUrl = (key) =>
  `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

// ── Carpetas de imágenes ──────────────────────────────────────────────────────

const IMAGE_DIRS = [
  path.resolve(__dirname, '../../../public/IMAGENES TATI'),
  path.resolve(__dirname, '../../../public/IMAGENES jhaja'),
  path.resolve(__dirname, '../../../public/IMAGENES Dari'),
];

const VALID_EXT = new Set(['.jpeg', '.jpg', '.png', '.webp']);

// ── Paso 1: recopilar imágenes y calcular su S3 key ──────────────────────────

function collectImages() {
  // sku → [{ localPath, s3Key, url, angle }]
  const skuMap = new Map();

  IMAGE_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) { console.warn(`  WARN: carpeta no encontrada: ${dir}`); return; }

    fs.readdirSync(dir).forEach(filename => {
      const ext = path.extname(filename).toLowerCase();
      if (!VALID_EXT.has(ext)) return;

      const base     = path.basename(filename, ext); // "00001087(1)" o "00001087"
      const isExtra  = /\(\d+\)$/.test(base);
      const sku      = base.replace(/\(\d+\)$/, '').trim();
      const angle    = isExtra ? parseInt(base.match(/\((\d+)\)$/)[1]) : 0;

      // S3 key: products/00001087.jpeg o products/00001087_1.jpeg
      const s3Key    = angle === 0
        ? `${FOLDER}/${sku}${ext}`
        : `${FOLDER}/${sku}_${angle}${ext}`;

      if (!skuMap.has(sku)) skuMap.set(sku, []);
      skuMap.get(sku).push({
        localPath: path.join(dir, filename),
        s3Key,
        url: publicUrl(s3Key),
        angle,
        filename,
      });
    });
  });

  // Ordenar por ángulo: imagen principal primero
  skuMap.forEach(imgs => imgs.sort((a, b) => a.angle - b.angle));

  return skuMap;
}

// ── Paso 2: subir a S3 ────────────────────────────────────────────────────────

async function uploadToS3(skuMap) {
  let uploaded = 0, skipped = 0, errors = 0;
  const total  = [...skuMap.values()].reduce((s, v) => s + v.length, 0);

  console.log(`\n── Subiendo ${total} imágenes a S3...\n`);

  for (const [sku, imgs] of skuMap) {
    for (const img of imgs) {
      if (DRY_RUN) {
        console.log(`  [DRY] ${img.filename} → ${img.s3Key}`);
        uploaded++;
        continue;
      }

      try {
        const body        = fs.readFileSync(img.localPath);
        const ext         = path.extname(img.localPath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png'
                          : ext === '.webp' ? 'image/webp'
                          : 'image/jpeg';

        await s3.send(new PutObjectCommand({
          Bucket:      BUCKET,
          Key:         img.s3Key,
          Body:        body,
          ContentType: contentType,
        }));
        uploaded++;
        process.stdout.write(`\r  ${uploaded}/${total} subidas...`);
      } catch (e) {
        errors++;
        console.error(`\n  ERROR subiendo ${img.filename}: ${e.message}`);
      }
    }
  }

  console.log(`\n  Subidas: ${uploaded}  Errores: ${errors}\n`);
  return { uploaded, errors };
}

// ── Paso 3: asignar imágenes a productos en la BD ────────────────────────────

async function assignToProducts(skuMap) {
  const products = await Product.find({}).lean();
  console.log(`── Asignando imágenes a ${products.length} productos...\n`);

  let updated = 0, noImg = 0;
  const orphanSkus = new Set(skuMap.keys()); // SKUs con imagen que no se asignan a nada

  for (const product of products) {
    const variantes    = product.variantes || [];
    let   productoUrls = []; // todas las URLs del producto (para galería)
    let   imagenUrl    = null;

    const variantesActualizadas = variantes.map(variante => {
      const skusDeVariante = (variante.tallas || []).map(t => t.sku).filter(Boolean);

      // Todas las URLs de imágenes para esta variante (de todos sus SKUs, en orden)
      const imgs = [];
      skusDeVariante.forEach(sku => {
        orphanSkus.delete(sku); // este SKU SÍ está en un producto
        const entry = skuMap.get(sku);
        if (entry) entry.forEach(i => imgs.push(i.url));
      });

      // Deduplicar manteniendo orden
      const uniqueImgs = [...new Set(imgs)];

      // Acumular para galería del producto
      uniqueImgs.forEach(u => { if (!productoUrls.includes(u)) productoUrls.push(u); });

      // Si es la variante principal, su primera imagen es la portada del producto
      if (variante.esPrincipal && uniqueImgs.length > 0 && !imagenUrl) {
        imagenUrl = uniqueImgs[0];
      }

      return {
        ...variante,
        imagenes: uniqueImgs.length > 0 ? uniqueImgs : (variante.imagenes || []),
      };
    });

    // Si la variante principal no tiene imagen, usar la primera que haya
    if (!imagenUrl && productoUrls.length > 0) imagenUrl = productoUrls[0];

    const tieneImagen = imagenUrl !== null;

    if (tieneImagen) {
      if (!DRY_RUN) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              imagen_url: imagenUrl,
              galeria:    productoUrls,
              variantes:  variantesActualizadas,
            },
          }
        );
      }
      updated++;
      console.log(`  [OK]  (${String(productoUrls.length).padStart(2)} imgs)  ${product.nombre}`);
    } else {
      noImg++;
      console.log(`  [--]  sin imagen              ${product.nombre}`);
    }
  }

  console.log(`\n  Productos actualizados: ${updated}`);
  console.log(`  Productos sin imagen:   ${noImg}`);
  console.log(`  SKUs huérfanos (imagen existe pero sin producto en BD): ${orphanSkus.size}`);

  return { updated, noImg, orphanSkus: orphanSkus.size };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('\n[DRY RUN — sin subir a S3 ni modificar BD]\n');

  console.log('── 1. Recopilando imágenes...');
  const skuMap = collectImages();
  const totalFiles = [...skuMap.values()].reduce((s, v) => s + v.length, 0);
  console.log(`   ${skuMap.size} SKUs únicos, ${totalFiles} archivos totales`);

  await connectDB();

  const { uploaded, errors } = await uploadToS3(skuMap);
  const { updated, noImg, orphanSkus } = await assignToProducts(skuMap);

  console.log('\n── Resumen final ────────────────────────────────────────────');
  console.log(`   Imágenes subidas a S3:          ${uploaded}`);
  console.log(`   Errores de subida:               ${errors}`);
  console.log(`   Productos con imagen asignada:  ${updated}`);
  console.log(`   Productos sin imagen:            ${noImg}`);
  console.log(`   Imágenes sin producto en BD:     ${orphanSkus}`);
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
