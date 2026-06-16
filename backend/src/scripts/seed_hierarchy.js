/**
 * seed_hierarchy.js
 * Inserta Diseñadores → Categorías → Subcategorías desde designers_hierarchy.json
 * Idempotente: usa upsert, no borra datos existentes.
 *
 * Uso:
 *   cd backend
 *   node src/scripts/seed_hierarchy.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const path = require('path');
const connectDB = require('../db');
const Designer    = require('../models/Designer');
const Category    = require('../models/Category');
const Subcategory = require('../models/Subcategory');

const HIERARCHY_PATH = path.resolve(__dirname, '../../../public/designers_hierarchy.json');
const { designers } = require(HIERARCHY_PATH);

// ── Helpers ────────────────────────────────────────────────────────────────────

function tag(created) {
  return created ? 'creado   ' : 'ya existía';
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  await connectDB();

  const stats = { designers: { created: 0, existed: 0 }, categories: { created: 0, existed: 0 }, subcategories: { created: 0, existed: 0 } };

  for (const { designer: designerName, categories } of designers) {

    // 1. Designer ──────────────────────────────────────────────────────────────
    const existingDesigner = await Designer.findOne({ name: designerName }).lean();
    const designerDoc      = existingDesigner || await Designer.create({ name: designerName });
    const designerCreated  = !existingDesigner;
    const designerId       = designerDoc._id;
    stats.designers[designerCreated ? 'created' : 'existed']++;
    console.log(`  [D] ${tag(designerCreated)}  ${designerName}`);

    for (const { category: categoryName, subcategories } of categories) {

      // 2. Category (vinculada al diseñador) ───────────────────────────────────
      const existingCat  = await Category.findOne({ name: categoryName, designer: designerId }).lean();
      const categoryDoc  = existingCat || await Category.create({ name: categoryName, designer: designerId });
      const categoryCreated = !existingCat;
      const categoryId   = categoryDoc._id;
      stats.categories[categoryCreated ? 'created' : 'existed']++;
      console.log(`    [C] ${tag(categoryCreated)}  ${designerName} / ${categoryName}`);

      for (const subcategoryName of subcategories) {

        // 3. Subcategory (vinculada a la categoría) ────────────────────────────
        const existingSub = await Subcategory.findOne({ name: subcategoryName, category: categoryId }).lean();
        if (!existingSub) await Subcategory.create({ name: subcategoryName, category: categoryId });
        const subCreated  = !existingSub;
        stats.subcategories[subCreated ? 'created' : 'existed']++;
        console.log(`      [S] ${tag(subCreated)}  ${subcategoryName}`);
      }
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  const total = o => o.created + o.existed;
  console.log('\n── Resumen ──────────────────────────────────────────────────');
  console.log(`   Diseñadores:    ${total(stats.designers).toString().padStart(3)} total  (${stats.designers.created} creados, ${stats.designers.existed} ya existían)`);
  console.log(`   Categorías:     ${total(stats.categories).toString().padStart(3)} total  (${stats.categories.created} creadas, ${stats.categories.existed} ya existían)`);
  console.log(`   Subcategorías:  ${total(stats.subcategories).toString().padStart(3)} total  (${stats.subcategories.created} creadas, ${stats.subcategories.existed} ya existían)`);
  console.log('─────────────────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
