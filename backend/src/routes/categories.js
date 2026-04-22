const router = require('express').Router();
const connectDB = require('../db');
const Category = require('../models/Category');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json(categories);
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
