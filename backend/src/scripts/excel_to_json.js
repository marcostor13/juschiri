/**
 * excel_to_json.js
 * Lee inventario_MIGRATION.xlsx y vuelca todos los datos como JSON.
 * Uso: cd backend && node src/scripts/excel_to_json.js
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.resolve(__dirname, '../../../public/inventario_MIGRATION.xlsx');
const OUT_PATH   = path.resolve(__dirname, '../../../public/inventario_full.json');

const wb  = XLSX.readFile(EXCEL_PATH, { cellDates: false });
const ws  = wb.Sheets[wb.SheetNames[0]];

// Fila 2 (índice 1) como headers, fila 3+ como datos
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

const HEADERS = raw[1]; // ["", "DISEÑADOR", "CATEGORIA", "SUB CATEGORIA", "NOMBRE", "TALLA", "COLOR", "CODIGO", "PRECIO", "STOCK"]

// Índices de columnas con nombre real (no vacías)
const namedCols = HEADERS
  .map((h, idx) => ({ h, idx }))
  .filter(({ h }) => h && String(h).trim());

const rows = [];
for (let i = 2; i < raw.length; i++) {
  const r = raw[i];
  // Saltar filas completamente vacías
  if (r.every(cell => cell === null || cell === '')) continue;

  const obj = { __row: i + 1 };
  namedCols.forEach(({ h, idx }) => {
    obj[String(h).trim()] = r[idx] ?? null;
  });
  rows.push(obj);
}

const output = {
  source:    'inventario_MIGRATION.xlsx',
  sheet:     wb.SheetNames[0],
  headers:   HEADERS,
  total_rows: rows.length,
  rows,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
console.log(`${rows.length} filas exportadas → ${OUT_PATH}`);
