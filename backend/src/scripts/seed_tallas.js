/**
 * seed_tallas.js
 * Parsea todas las tallas de inventario_full.json y las inserta en la BD.
 * Idempotente — usa upsert por nombre canónico.
 *
 * Tipos soportados:
 *   US    - US Men's (4–13.5)
 *   USW   - US Women's (7 US W, 10.5 w)
 *   EUR   - Europeo (42 EUR)
 *   IT    - Italiano (42 IT)
 *   UK    - Británico (7 UK)
 *   Y     - Youth / Kids (4 Y)
 *   C     - Children (13 C)
 *   HAT   - Gorras, sombreros (7 1/2)
 *   ROPA  - Tallas de ropa (XS S M L XL XXL)
 *   NUM   - Numérico sin tipo (30 31 32…)
 *   ESPECIAL - REGULABLE, ESTANDAR
 *
 * Uso:
 *   cd backend
 *   node src/scripts/seed_tallas.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const path = require('path');
const connectDB = require('../db');
const Talla = require('../models/Talla');

const INVENTORY_PATH = path.resolve(__dirname, '../../../public/inventario_full.json');
const { rows } = require(INVENTORY_PATH);

// ── Orden base por tipo (para el campo `orden`) ────────────────────────────────
const TIPO_BASE = { ROPA: 0, US: 100, USW: 200, EUR: 300, IT: 400, UK: 500, Y: 600, C: 700, HAT: 800, NUM: 900, ESPECIAL: 9000 };

const ROPA_ORDEN = { XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6 };

function calcOrden(tipo, valor) {
  const base = TIPO_BASE[tipo] ?? 5000;
  if (tipo === 'ROPA')    return base + (ROPA_ORDEN[valor] ?? 99);
  if (tipo === 'ESPECIAL' || tipo === 'HAT') return base;
  const n = parseFloat(valor);
  return base + (isNaN(n) ? 99 : n * 2);
}

// ── Parser de una talla cruda → objeto canónico ────────────────────────────────
function parseTalla(raw) {
  const t = raw.trim();
  const u = t.toUpperCase();

  // Ropa
  if (['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(u))
    return { nombre: u, valor: u, tipo: 'ROPA' };

  // Especiales
  if (['REGULABLE', 'ESTANDAR'].includes(u))
    return { nombre: u, valor: u, tipo: 'ESPECIAL' };

  // US Women: "10 US W", "10 us w", "10.5 w"
  if (/^[\d.]+\s+US\s+W$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} US W`, valor: v, tipo: 'USW' };
  }
  if (/^[\d.]+\s+W$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} US W`, valor: v, tipo: 'USW' };
  }

  // US Men: "9 US", "9 us"
  if (/^[\d.]+\s+US$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} US`, valor: v, tipo: 'US' };
  }

  // EUR
  if (/^[\d.]+\s+EUR$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} EUR`, valor: v, tipo: 'EUR' };
  }

  // IT
  if (/^[\d.]+\s+IT$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} IT`, valor: v, tipo: 'IT' };
  }

  // UK
  if (/^[\d.]+\s+UK$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} UK`, valor: v, tipo: 'UK' };
  }

  // Youth
  if (/^[\d.]+\s+Y$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} Y`, valor: v, tipo: 'Y' };
  }

  // Children
  if (/^[\d.]+\s+C$/i.test(t)) {
    const v = u.match(/^([\d.]+)/)[1];
    return { nombre: `${v} C`, valor: v, tipo: 'C' };
  }

  // Hat sizes: "7 1/2", "7 1/4", "7 3/8"
  if (/^\d+\s+\d+\/\d+$/.test(t)) {
    return { nombre: u, valor: u, tipo: 'HAT' };
  }

  // Numérico sin tipo: 8.5, 9.5 → US si rango 4–15; mayor → NUM
  if (/^[\d.]+$/.test(t)) {
    const n = parseFloat(t);
    if (n >= 4 && n <= 15) return { nombre: `${u} US`, valor: u, tipo: 'US' };
    return { nombre: u, valor: u, tipo: 'NUM' };
  }

  return { nombre: u, valor: u, tipo: 'ESPECIAL' };
}

// ── Recolectar tallas únicas del inventario ────────────────────────────────────
function collectTallas() {
  const map = new Map(); // nombre canónico → objeto

  rows.forEach(row => {
    const raw = String(row['TALLA'] || '').trim();
    if (!raw) return;

    const parsed = parseTalla(raw);
    if (!map.has(parsed.nombre)) {
      map.set(parsed.nombre, {
        ...parsed,
        orden: calcOrden(parsed.tipo, parsed.valor),
      });
    }
  });

  return [...map.values()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  await connectDB();

  const tallas = collectTallas();
  console.log(`\n${tallas.length} tallas únicas a procesar:\n`);

  const stats = { created: 0, existed: 0 };

  for (const t of tallas) {
    const existing = await Talla.findOne({ nombre: t.nombre }).lean();
    if (!existing) {
      await Talla.create(t);
      stats.created++;
      console.log(`  creado     [${t.tipo.padEnd(8)}]  ${t.nombre}`);
    } else {
      // Actualiza tipo y valor si faltaban en el registro previo
      if (!existing.tipo || !existing.valor) {
        await Talla.updateOne({ _id: existing._id }, { $set: { tipo: t.tipo, valor: t.valor, orden: t.orden } });
        console.log(`  actualizado[${t.tipo.padEnd(8)}]  ${t.nombre}`);
      } else {
        console.log(`  ya existía [${t.tipo.padEnd(8)}]  ${t.nombre}`);
      }
      stats.existed++;
    }
  }

  console.log('\n── Resumen ──────────────────────────────────────────────────');
  console.log(`   Tallas creadas:      ${stats.created}`);
  console.log(`   Tallas ya existían:  ${stats.existed}`);
  console.log(`   Total:               ${tallas.length}`);

  // Desglose por tipo
  const byTipo = {};
  tallas.forEach(t => { byTipo[t.tipo] = (byTipo[t.tipo] || 0) + 1; });
  console.log('\n   Por tipo:');
  Object.entries(byTipo).sort().forEach(([tipo, n]) => {
    console.log(`     ${tipo.padEnd(10)} ${n}`);
  });
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
