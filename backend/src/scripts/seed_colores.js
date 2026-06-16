/**
 * seed_colores.js
 * Extrae todos los colores de inventario_full.json y los inserta en la BD.
 * Normalización: trim + colapso de espacios internos múltiples + lowercase.
 * Idempotente — no crea duplicados.
 *
 * Uso:
 *   cd backend
 *   node src/scripts/seed_colores.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const path = require('path');
const connectDB = require('../db');
const Color = require('../models/Color');

const INVENTORY_PATH = path.resolve(__dirname, '../../../public/inventario_full.json');
const { rows } = require(INVENTORY_PATH);

function normalize(raw) {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

function collectColores() {
  const seen = new Set();
  rows.forEach(row => {
    const c = normalize(String(row['COLOR'] || ''));
    if (c) seen.add(c);
  });
  return [...seen].sort();
}

async function main() {
  await connectDB();

  const colores = collectColores();
  console.log(`\n${colores.length} colores únicos a procesar:\n`);

  const stats = { created: 0, existed: 0 };

  for (const nombre of colores) {
    const existing = await Color.findOne({ nombre }).lean();
    if (!existing) {
      await Color.create({ nombre, hex: null });
      stats.created++;
      console.log(`  creado     ${nombre}`);
    } else {
      stats.existed++;
      console.log(`  ya existía ${nombre}`);
    }
  }

  console.log('\n── Resumen ──────────────────────────────────────────────────');
  console.log(`   Colores creados:     ${stats.created}`);
  console.log(`   Colores ya existían: ${stats.existed}`);
  console.log(`   Total:               ${colores.length}`);
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
