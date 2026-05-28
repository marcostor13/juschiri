const router = require('express').Router();
const connectDB = require('../db');
const Color = require('../models/Color');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    await connectDB();
    const colores = await Color.find().sort({ nombre: 1 }).lean();
    res.json(colores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const color = await Color.create({ nombre: req.body.nombre, hex: req.body.hex || null });
    res.status(201).json(color);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Color ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const color = await Color.findByIdAndUpdate(
      req.params.id,
      { nombre: req.body.nombre, hex: req.body.hex ?? null },
      { new: true, runValidators: true }
    );
    if (!color) return res.status(404).json({ error: 'Not found' });
    res.json(color);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Color ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Color.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
