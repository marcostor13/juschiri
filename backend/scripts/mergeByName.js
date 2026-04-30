/**
 * Script: mergeByName.js
 * Fusiona productos duplicados (mismo nombre + marca) en un solo documento,
 * consolidando todas sus variantes y sumando stock.
 *
 * Dry-run:  node backend/scripts/mergeByName.js
 * Aplicar:  node backend/scripts/mergeByName.js --confirm
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const MONGODB_URI = process.env.MONGODB_URI2 || process.env.MONGODB_URI;

const normalizeKey = (nombre, marca) =>
  `${(nombre || '').trim().toUpperCase()}||${(marca || '').trim().toUpperCase()}`;

const variantKey = (v) =>
  `${(v.talla_eur || v.talla || '').toUpperCase()}|${(v.talla_us || '').toUpperCase()}|${(v.color || '').toUpperCase()}`;

async function run() {
  if (!MONGODB_URI) { console.error('MONGODB_URI no definida'); process.exit(1); }

  const confirm = process.argv[2] === '--confirm';
  await mongoose.connect(MONGODB_URI);
  console.log('Conectado.\n');

  const allProducts = await Product.find({}).sort({ codigo: 1 }).lean();
  console.log(`Total documentos: ${allProducts.length}`);

  // Agrupar por nombre+marca
  const groups = new Map();
  for (const p of allProducts) {
    const key = normalizeKey(p.nombre, p.marca);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const duplicateGroups = [...groups.values()].filter(g => g.length > 1);
  console.log(`Grupos con duplicados: ${duplicateGroups.length}`);
  const totalExtra = duplicateGroups.reduce((s, g) => s + g.length - 1, 0);
  console.log(`Documentos a eliminar: ${totalExtra}\n`);

  if (duplicateGroups.length === 0) {
    console.log('No hay duplicados. Nada que hacer.');
    await mongoose.disconnect();
    return;
  }

  // Mostrar preview
  const preview = duplicateGroups.slice(0, 8);
  preview.forEach(group => {
    const first = group[0];
    console.log(`[FUSIONAR] "${first.nombre}" (${first.marca || '-'})`);
    group.forEach(p => {
      const vars = (p.variantes || []).map(v => `${v.talla||v.talla_eur||'?'}/${v.color||'?'}`).join(', ');
      console.log(`  - ${p.codigo}: variantes=[${vars}] stock=${p.stock_actual}`);
    });
  });
  if (duplicateGroups.length > 8) console.log(`  ... y ${duplicateGroups.length - 8} grupos más\n`);

  if (!confirm) {
    console.log('\nModo DRY-RUN. Para aplicar:');
    console.log('  node backend/scripts/mergeByName.js --confirm\n');
    await mongoose.disconnect();
    return;
  }

  console.log('\nAplicando fusión...');
  let merged = 0;
  let deleted = 0;

  for (const group of duplicateGroups) {
    // El primero (menor codigo) se convierte en el documento canónico
    const [master, ...dupes] = group;

    // Unir todas las variantes de todos los documentos del grupo
    const allVariants = [...(master.variantes || [])];
    for (const dupe of dupes) {
      for (const v of (dupe.variantes || [])) {
        allVariants.push(v);
      }
    }

    // Deduplicar variantes por clave (talla+color), sumando stock
    const varMap = new Map();
    for (const v of allVariants) {
      const key = variantKey(v);
      if (!varMap.has(key)) {
        varMap.set(key, { ...v, stock: 0 });
      }
      varMap.get(key).stock += Number(v.stock) || 0;
    }
    const finalVariants = Array.from(varMap.values());

    // Sumar stocks anteriores de todos los documentos
    const totalStockAnterior = group.reduce((s, p) => s + (p.stock_anterior || 0), 0);
    const totalStockActual = finalVariants.reduce((s, v) => s + v.stock, 0);

    // Fusionar galerías (sin duplicados)
    const allImages = new Set();
    for (const p of group) {
      if (p.imagen_url) allImages.add(p.imagen_url);
      for (const img of (p.galeria || [])) allImages.add(img);
    }
    // La primera imagen del master sigue siendo la principal
    allImages.delete(master.imagen_url);
    const mergedGaleria = [...(master.galeria || []), ...allImages];

    // Actualizar el documento master
    await Product.findByIdAndUpdate(master._id, {
      variantes: finalVariants,
      stock_actual: totalStockActual,
      stock_anterior: totalStockAnterior,
      galeria: mergedGaleria,
    });

    // Eliminar los duplicados
    const dupeIds = dupes.map(d => d._id);
    await Product.deleteMany({ _id: { $in: dupeIds } });

    merged++;
    deleted += dupes.length;
  }

  console.log(`\nListo.`);
  console.log(`  Grupos fusionados: ${merged}`);
  console.log(`  Documentos eliminados: ${deleted}`);
  console.log(`  Documentos restantes: ${allProducts.length - deleted}`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
