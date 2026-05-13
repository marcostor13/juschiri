const router = require('express').Router();
const connectDB = require('../db');
const Category = require('../models/Category');
const Type = require('../models/Type');
const Subcategory = require('../models/Subcategory');
const SubSubcategory = require('../models/SubSubcategory');
const Designer = require('../models/Designer');
const auth = require('../middleware/auth');

// ── GET /api/categories ───────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    await connectDB();
    const [categories, subcategories] = await Promise.all([
      Category.find().populate('designer').sort({ name: 1 }).lean(),
      Subcategory.find().sort({ name: 1 }).lean(),
    ]);

    const result = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category?.toString() === cat._id.toString()),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/categories/designers — 3-level tree ──────────────────────────────

router.get('/designers', async (req, res) => {
  try {
    await connectDB();
    const [designers, categories, subcategories] = await Promise.all([
      Designer.find().sort({ name: 1 }).lean(),
      Category.find().sort({ name: 1 }).lean(),
      Subcategory.find().sort({ name: 1 }).lean(),
    ]);

    const result = designers.map(designer => {
      const designerCats = categories.filter(c => c.designer?.toString() === designer._id.toString());
      return {
        ...designer,
        categories: designerCats.map(cat => ({
          ...cat,
          subcategories: subcategories.filter(sub => sub.category?.toString() === cat._id.toString()),
        })),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DESIGNERS ─────────────────────────────────────────────────────────────────

router.post('/designers', auth, async (req, res) => {
  try {
    await connectDB();
    const designer = await Designer.create({ name: req.body.name });
    res.status(201).json(designer);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Diseñador ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/designers/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const designer = await Designer.findByIdAndUpdate(
      req.params.id, { name: req.body.name }, { new: true, runValidators: true }
    );
    if (!designer) return res.status(404).json({ error: 'Not found' });
    res.json(designer);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Diseñador ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.delete('/designers/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Designer.findByIdAndDelete(req.params.id);
    await Category.updateMany({ designer: req.params.id }, { $set: { designer: null } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CATEGORIES ────────────────────────────────────────────────────────────────

router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const category = await Category.create({ name: req.body.name, designer: req.body.designer || null });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Categoría ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const update = { name: req.body.name };
    if ('designer' in req.body) update.designer = req.body.designer || null;
    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('designer');
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Categoría ya existe' });
    res.status(400).json({ error: err.message });
  }
});

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

// ── TYPES ─────────────────────────────────────────────────────────────────────

router.post('/types', auth, async (req, res) => {
  try {
    await connectDB();
    const { name, category } = req.body;
    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${category}-${Date.now()}`;
    const type = await Type.create({ name, category, slug });
    res.status(201).json(type);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

router.delete('/types/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Type.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBCATEGORIES ─────────────────────────────────────────────────────────────

router.post('/subcategories', auth, async (req, res) => {
  try {
    await connectDB();
    const sub = await Subcategory.create(req.body);
    res.status(201).json(sub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

router.delete('/subcategories/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Subcategory.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUB-SUBCATEGORIES ─────────────────────────────────────────────────────────

router.post('/subsubcategories', auth, async (req, res) => {
  try {
    await connectDB();
    const ss = await SubSubcategory.create(req.body);
    res.status(201).json(ss);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/subsubcategories/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const ss = await SubSubcategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ss) return res.status(404).json({ error: 'Not found' });
    res.json(ss);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/subsubcategories/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await SubSubcategory.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
