const router = require('express').Router();
const connectDB = require('../db');
const Category = require('../models/Category');
const Type = require('../models/Type');
const Subcategory = require('../models/Subcategory');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    await connectDB();
    const [categories, types, subcategories] = await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      Type.find().sort({ name: 1 }).lean(),
      Subcategory.find().sort({ name: 1 }).lean(),
    ]);

    // Anidar subcategorías en sus tipos correspondientes, y los tipos en sus categorías
    const result = categories.map((cat) => {
      const catTypes = types.filter(t => t.category?.toString() === cat._id.toString());
      
      const populatedTypes = catTypes.map(t => ({
        ...t,
        subcategories: subcategories.filter(sub => sub.type?.toString() === t._id.toString())
      }));

      // También mantener subcategorías directas por retrocompatibilidad momentánea
      const directSubcategories = subcategories.filter(sub => sub.category?.toString() === cat._id.toString() && !sub.type);

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

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    await connectDB();
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Category already exists' });
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    await connectDB();
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
