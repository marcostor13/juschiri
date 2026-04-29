const router = require('express').Router();
const connectDB = require('../db');
const Category = require('../models/Category');
const Type = require('../models/Type');
const Subcategory = require('../models/Subcategory');
const auth = require('../middleware/auth');

// GET /api/categories — full tree (no auth, used by storefront)
router.get('/', async (req, res) => {
  try {
    await connectDB();
    const [categories, types, subcategories] = await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      Type.find().sort({ name: 1 }).lean(),
      Subcategory.find().sort({ name: 1 }).lean(),
    ]);

    const result = categories.map((cat) => {
      const catTypes = types.filter(t => t.category?.toString() === cat._id.toString());
      const populatedTypes = catTypes.map(t => ({
        ...t,
        subcategories: subcategories.filter(sub => sub.type?.toString() === t._id.toString())
      }));
      const directSubcategories = subcategories.filter(
        sub => sub.category?.toString() === cat._id.toString() && !sub.type
      );
      return {
        ...cat,
        types: populatedTypes,
        subcategories: directSubcategories.length > 0 ? directSubcategories : []
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CATEGORIES ──────────────────────────────────────────────────────────────

// POST /api/categories
router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const category = await Category.create({ name: req.body.name });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Categoría ya existe' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Categoría ya existe' });
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TYPES ────────────────────────────────────────────────────────────────────

// POST /api/categories/types
router.post('/types', auth, async (req, res) => {
  try {
    await connectDB();
    const { name, category } = req.body;
    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${category}-${Date.now()}`;
    const type = await Type.create({ name, category, slug });
    res.status(201).json(type);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Tipo ya existe' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/categories/types/:id
router.put('/types/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const update = { name: req.body.name, slug: `${req.body.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` };
    const type = await Type.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!type) return res.status(404).json({ error: 'Not found' });
    res.json(type);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/types/:id
router.delete('/types/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Type.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBCATEGORIES ────────────────────────────────────────────────────────────

// POST /api/categories/subcategories
router.post('/subcategories', auth, async (req, res) => {
  try {
    await connectDB();
    const sub = await Subcategory.create(req.body);
    res.status(201).json(sub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/categories/subcategories/:id
router.put('/subcategories/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const sub = await Subcategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/subcategories/:id
router.delete('/subcategories/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Subcategory.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
