/**
 * Script: normalizeVariants.js
 * Elimina variantes duplicadas (misma talla + mismo color) dentro de cada producto
 * sumando su stock. Opera sobre los campos talla, talla_eur y talla_us.
 *
 * Uso (dry-run):  node backend/scripts/normalizeVariants.js
 * Uso (aplicar):  node backend/scripts/normalizeVariants.js --confirm
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const MONGODB_URI = process.env.MONGODB_URI2 || process.env.MONGODB_URI;

const normalize = (s) => (s || '').toString().trim().toUpperCase();

const variantKey = (v) => {
  const eur = normalize(v.talla_eur || v.talla);
  const us  = normalize(v.talla_us);
  const col = normalize(v.color);
  return `${eur}|${us}|${col}`;
};

async function run() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI no definida en .env');
    process.exit(1);
  }

  const confirm = process.argv[2] === '--confirm';

  console.log('Conectando a MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Conectado.\n');

  const products = await Product.find({});
  console.log(`Total de productos: ${products.length}\n`);

  let totalProductosAfectados = 0;
  let totalVariantesEliminadas = 0;
  const updates = [];

  for (const product of products) {
    const variantes = product.variantes || [];
    if (variantes.length === 0) continue;

    const grupos = new Map();

    for (const v of variantes) {
      const key = variantKey(v);
      if (!grupos.has(key)) {
        grupos.set(key, { ...v.toObject(), stock: 0 });
      }
      grupos.get(key).stock += Number(v.stock) || 0;
    }

    const merged = Array.from(grupos.values());
    const eliminadas = variantes.length - merged.length;

    if (eliminadas > 0) {
      totalProductosAfectados++;
      totalVariantesEliminadas += eliminadas;
      const newStock = merged.reduce((s, v) => s + v.stock, 0);

      console.log(`  [${product.codigo}] ${product.nombre.substring(0, 50)}`);
      console.log(`    Variantes: ${variantes.length} -> ${merged.length} (eliminadas ${eliminadas})`);

      updates.push({ product, merged, newStock });
    }
  }

  console.log(`\n--- Resumen ---`);
  console.log(`Productos con duplicados: ${totalProductosAfectados}`);
  console.log(`Variantes duplicadas a eliminar: ${totalVariantesEliminadas}`);

  if (!confirm) {
    console.log('\nModo DRY-RUN. Para aplicar los cambios ejecuta:');
    console.log('  node backend/scripts/normalizeVariants.js --confirm\n');
    await mongoose.disconnect();
    return;
  }

  if (updates.length === 0) {
    console.log('\nNo hay duplicados. Nada que normalizar.');
    await mongoose.disconnect();
    return;
  }

  console.log('\nAplicando cambios...');
  for (const { product, merged, newStock } of updates) {
    product.variantes = merged;
    product.stock_actual = newStock;
    await product.save();
  }

  console.log(`\nListo. ${totalProductosAfectados} productos normalizados, ${totalVariantesEliminadas} variantes duplicadas eliminadas.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
