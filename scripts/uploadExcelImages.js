/**
 * uploadExcelImages.js
 * Lee drawing1.xml del Excel, mapea imágenes → filas → códigos, sube a S3 y genera JSON.
 * Uso: node scripts/uploadExcelImages.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const XLSX = require('xlsx');

const EXTRACT_DIR = path.join(__dirname, '../temp_xlsx_extract');
const XLSX_FILE   = path.join(__dirname, '../public/MODELOS DE PRENDAS orden (1).xlsx');
const SHEET_NAME  = 'T-shirt';
const FIRST_N     = 10; // solo los primeros N productos

const s3 = new S3Client({
  region: process.env.S3_REGION2 || 'us-east-2',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});
const BUCKET = process.env.S3_BUCKET2;

// ── 1. Parsear drawing1.xml.rels  (rIdN → archivo de imagen) ────────────────
function parseDrawingRels() {
  const relsPath = path.join(EXTRACT_DIR, 'xl/drawings/_rels/drawing1.xml.rels');
  const xml = fs.readFileSync(relsPath, 'utf8');
  const map = {};
  const re = /Id="(rId\d+)"[^>]+Target="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, rId, target] = m;
    // target es algo como "../media/image2.png"
    const file = path.basename(target);
    map[rId] = file;
  }
  return map; // { rId1: 'image1.png', rId2: 'image2.png', ... }
}

// ── 2. Parsear drawing1.xml  (fila 0-based → [rIdN, ...]) ──────────────────
function parseDrawingXml(relsMap) {
  const drawPath = path.join(EXTRACT_DIR, 'xl/drawings/drawing1.xml');
  const xml = fs.readFileSync(drawPath, 'utf8');

  const rowImages = {}; // { sheetRow (1-based): [filename, ...] }

  // Cada anchor tiene <xdr:from><xdr:row>N</xdr:row>... y <a:blip r:embed="rIdN"/>
  const anchorRe = /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g;
  const rowRe    = /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/;
  const blipRe   = /r:embed="(rId\d+)"/;

  let anchor;
  while ((anchor = anchorRe.exec(xml)) !== null) {
    const block = anchor[0];
    const rowMatch  = rowRe.exec(block);
    const blipMatch = blipRe.exec(block);
    if (!rowMatch || !blipMatch) continue;

    const row0  = parseInt(rowMatch[1], 10);   // 0-based
    const shRow = row0 + 1;                    // 1-based (Excel row)
    const rId   = blipMatch[1];
    const file  = relsMap[rId];
    if (!file) continue;

    if (!rowImages[shRow]) rowImages[shRow] = [];
    rowImages[shRow].push(file);
  }
  return rowImages;
}

// ── 3. Leer datos del Excel ──────────────────────────────────────────────────
function readExcelData() {
  const wb = XLSX.readFile(XLSX_FILE);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Hoja "${SHEET_NAME}" no encontrada`);

  // header:1 → array de arrays; row 0 = título, row 1 = headers, row 2+ = datos
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const results = [];
  for (let i = 2; i < rows.length && results.length < FIRST_N * 3; i++) {
    const row = rows[i];
    const codigo  = String(row[4] || '').trim();  // col E
    const nombre  = String(row[5] || '').trim();  // col F
    const marca   = String(row[3] || '').trim();  // col D
    const precio  = row[6];
    const excelRow = i + 1; // 1-based Excel row

    if (!codigo) continue;
    results.push({ excelRow, codigo, nombre, marca, precio });
  }
  return results.slice(0, FIRST_N);
}

// ── 4. Subir imagen a S3 ────────────────────────────────────────────────────
async function uploadToS3(localFile, codigo) {
  const ext  = path.extname(localFile).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const key  = `products/${codigo}${ext}`;
  const body = fs.readFileSync(localFile);

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        body,
    ContentType: mime,
  }));

  return `https://${BUCKET}.s3.${process.env.S3_REGION2 || 'us-east-2'}.amazonaws.com/${key}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!BUCKET) {
    console.error('ERROR: S3_BUCKET2 no definida en .env');
    process.exit(1);
  }

  console.log('Parseando drawing XML...');
  const relsMap   = parseDrawingRels();
  const rowImages = parseDrawingXml(relsMap);

  console.log('Leyendo datos del Excel...');
  const products = readExcelData();

  console.log(`\nPrimeros ${products.length} productos encontrados:`);
  products.forEach(p => console.log(`  Row ${p.excelRow}: ${p.codigo} — ${p.nombre}`));

  console.log('\nSubiendo imágenes a S3...\n');
  const output = [];

  for (const p of products) {
    const images = rowImages[p.excelRow] || [];

    if (images.length === 0) {
      console.log(`[SKIP] Row ${p.excelRow} ${p.codigo} — sin imagen`);
      output.push({ codigo: p.codigo, nombre: p.nombre, marca: p.marca, precio: p.precio, imagen_url: null });
      continue;
    }

    // Usar la primera imagen como principal
    const imgFile = images[0];
    const localPath = path.join(EXTRACT_DIR, 'xl/media', imgFile);

    if (!fs.existsSync(localPath)) {
      console.log(`[MISS] ${imgFile} no existe en media/`);
      output.push({ codigo: p.codigo, nombre: p.nombre, marca: p.marca, precio: p.precio, imagen_url: null });
      continue;
    }

    try {
      const url = await uploadToS3(localPath, p.codigo);
      console.log(`[OK]   ${p.codigo} → ${url}`);
      output.push({ codigo: p.codigo, nombre: p.nombre, marca: p.marca, precio: p.precio, imagen_url: url });
    } catch (err) {
      console.error(`[ERR]  ${p.codigo}: ${err.message}`);
      output.push({ codigo: p.codigo, nombre: p.nombre, marca: p.marca, precio: p.precio, imagen_url: null, error: err.message });
    }
  }

  const outPath = path.join(__dirname, '../scripts/output_tshirt_10.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nJSON guardado en: ${outPath}`);
  console.log('\n=== RESULTADO ===');
  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error);
