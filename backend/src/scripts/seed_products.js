require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Papa = require('papaparse');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1NEVuMmP-nPLq0IfOWGEsCyHH8LeKK78a/export?format=csv&gid=749612972';
const CHECKPOINT_PATH = path.resolve(__dirname, '../../../scripts/migrate/output/checkpoint.json');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

async function seed() {
  await connectDB();

  // Load checkpoint
  let checkpoint = {};
  if (fs.existsSync(CHECKPOINT_PATH)) {
    checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
    console.log(`Loaded checkpoint with ${Object.keys(checkpoint).length} items`);
  } else {
    console.log('No checkpoint found at', CHECKPOINT_PATH);
  }

  // Fetch CSV
  console.log('Fetching CSV from', CSV_URL);
  const response = await fetch(CSV_URL);
  const csvText = await response.text();

  console.log('Parsing CSV...');
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  
  if (parsed.errors.length) {
    console.error('CSV Parsing Errors:', parsed.errors);
  }

  const rows = parsed.data;
  console.log(`Parsed ${rows.length} rows from CSV`);

  const categorySet = new Set();
  const operations = [];

  for (const row of rows) {
    const rawCodigo = row['Código'];
    if (!rawCodigo) continue;
    
    // Normalize code, e.g. pad with 0s if need be, but we trust the sheet
    const codigo = rawCodigo.trim();
    
    // Some keys might vary because of newlines in header.
    // Let's find the exact keys since headers might be dirty.
    const keys = Object.keys(row);
    const getStockAnterior = () => {
      const key = keys.find(k => k.toLowerCase().includes('anterior'));
      return row[key];
    };
    const getStockActual = () => {
      const key = keys.find(k => k.toLowerCase().includes('actual'));
      return row[key];
    };
    
    const stock_anterior = Number(getStockAnterior() || 0);
    const stock_actual = Number(getStockActual() || 0);
    const precio = Number(row['PRECIO'] || 0);
    const nombre = row['Nombre']?.trim() || '';
    const marca = row['Marca']?.trim() || '';
    const catRaw = row['Categorias']?.trim() || '';
    
    const categorias = catRaw ? catRaw.split(',').map(c => c.trim()).filter(Boolean) : [];
    categorias.forEach(c => categorySet.add(c));
    
    const checkpointItem = checkpoint[codigo] || Object.values(checkpoint).find(c => c.codigo === codigo) || {};
    const imagen_url = checkpointItem.imagen_url || null;

    if (!nombre) continue; // Skip invalid rows

    const productDoc = {
      codigo,
      nombre,
      imagen_url,
      stock_anterior: isNaN(stock_anterior) ? 0 : stock_anterior,
      stock_actual: isNaN(stock_actual) ? 0 : stock_actual,
      categorias,
      marca,
      precio: isNaN(precio) ? 0 : precio,
    };

    operations.push({
      updateOne: {
        filter: { codigo },
        update: { $set: productDoc },
        upsert: true
      }
    });
  }

  console.log(`Found ${categorySet.size} unique categories`);
  
  // Seed categories
  const Category = require('../models/Category');
  const catOps = Array.from(categorySet).map(c => ({
    updateOne: {
      filter: { name: c },
      update: { $set: { name: c } },
      upsert: true
    }
  }));

  if (catOps.length) {
    await Category.bulkWrite(catOps, { ordered: false });
    console.log(`Upserted ${catOps.length} categories`);
  }

  if (operations.length) {
    const result = await Product.bulkWrite(operations, { ordered: false });
    console.log(`Products: Upserted=${result.upsertedCount}, Modified=${result.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete. Disconnected DB.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
