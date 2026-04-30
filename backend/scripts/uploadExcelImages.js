/**
 * uploadExcelImages.js
 * Lee drawing1.xml del Excel, mapea imágenes → filas → códigos, sube a S3 y genera JSON.
 * Uso: cd backend && node scripts/uploadExcelImages.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const XLSX = require('xlsx');

const ROOT         = path.join(__dirname, '../..');
const EXTRACT_DIR  = path.join(ROOT, 'temp_xlsx_extract');
const XLSX_FILE    = path.join(ROOT, 'public/MODELOS DE PRENDAS orden (1).xlsx');
const SHEET_NAME   = 'T-shirt';
const FIRST_N      = 10;

const s3 = new S3Client({
  region: process.env.S3_REGION2 || 'us-east-2',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});
const BUCKET = process.env.S3_BUCKET2;

// ── 1. Parsear _rels → { rIdN: 'imageN.png' } ───────────────────────────────
function parseDrawingRels() {
  const xml = fs.readFileSync(
    path.join(EXTRACT_DIR, 'xl/drawings/_rels/drawing1.xml.rels'), 'utf8'
  );
  const map = {};
  const re  = /Id="(rId\d+)"[^>]+Target="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    map[m[1]] = path.basename(m[2]);
  }
  return map;
}

// ── 2. Parsear drawing1.xml → { sheetRow(1-based): ['imageN.png', ...] } ────
function parseDrawingXml(relsMap) {
  const xml = fs.readFileSync(
    path.join(EXTRACT_DIR, 'xl/drawings/drawing1.xml'), 'utf8'
  );
  const rowImages = {};
  const anchorRe  = /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g;
  const rowRe     = /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/;
  const blipRe    = /r:embed="(rId\d+)"/;

  let anchor;
  while ((anchor = anchorRe.exec(xml)) !== null) {
    const block = anchor[0];
    const rowM  = rowRe.exec(block);
    const blipM = blipRe.exec(block);
    if (!rowM || !blipM) continue;
    const shRow = parseInt(rowM[1], 10) + 1; // 0-based → 1-based
    const file  = relsMap[blipM[1]];
    if (!file) continue;
    if (!rowImages[shRow]) rowImages[shRow] = [];
    rowImages[shRow].push(file);
  }
  return rowImages;
}

// ── 3. Leer datos del Excel ──────────────────────────────────────────────────
function readExcelData() {
  const wb   = XLSX.readFile(XLSX_FILE);
  const ws   = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Hoja "${SHEET_NAME}" no encontrada`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // row 0 = título, row 1 = headers, row 2+ = datos → excelRow = i+1
  const results = [];
  for (let i = 2; i < rows.length; i++) {
    const row    = rows[i];
    const codigo = String(row[4] || '').trim(); // col E
    if (!codigo) continue;
    results.push({
      excelRow: i + 1,
      codigo,
      nombre: String(row[5] || '').trim(),
      marca:  String(row[3] || '').trim(),
      precio: row[6] || 0,
    });
    if (results.length >= FIRST_N) break;
  }
  return results;
}

// ── 4. Subir a S3 ────────────────────────────────────────────────────────────
async function uploadToS3(localPath, codigo) {
  const ext  = path.extname(localPath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const key  = `products/${codigo}${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        fs.readFileSync(localPath),
    ContentType: mime,
  }));
  return `https://${BUCKET}.s3.${process.env.S3_REGION2 || 'us-east-2'}.amazonaws.com/${key}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!BUCKET) { console.error('ERROR: S3_BUCKET2 no definida'); process.exit(1); }

  console.log('Parseando drawing XML...');
  const relsMap   = parseDrawingRels();
  const rowImages = parseDrawingXml(relsMap);

  console.log('Leyendo datos del Excel...');
  const products = readExcelData();

  console.log(`\nPrimeros ${products.length} productos:`);
  products.forEach(p => {
    const imgs = (rowImages[p.excelRow] || []).join(', ') || '(sin imagen)';
    console.log(`  Row ${p.excelRow}: ${p.codigo} — ${p.nombre} [${imgs}]`);
  });

  console.log('\nSubiendo imágenes a S3...\n');
  const output = [];

  for (const p of products) {
    const images = rowImages[p.excelRow] || [];
    if (images.length === 0) {
      console.log(`[SKIP] ${p.codigo} — sin imagen en row ${p.excelRow}`);
      output.push({ ...p, imagen_url: null });
      continue;
    }
    const localPath = path.join(EXTRACT_DIR, 'xl/media', images[0]);
    if (!fs.existsSync(localPath)) {
      console.log(`[MISS] ${images[0]} no existe`);
      output.push({ ...p, imagen_url: null });
      continue;
    }
    try {
      const url = await uploadToS3(localPath, p.codigo);
      console.log(`[OK]   ${p.codigo} → ${url}`);
      output.push({ ...p, imagen_url: url });
    } catch (err) {
      console.error(`[ERR]  ${p.codigo}: ${err.message}`);
      output.push({ ...p, imagen_url: null, error: err.message });
    }
  }

  const outPath = path.join(ROOT, 'scripts/output_tshirt_10.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nJSON guardado en: ${outPath}`);
  console.log('\n=== RESULTADO ===');
  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error);
