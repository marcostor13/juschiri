const router = require('express').Router();
const connectDB = require('../db');
const Talla = require('../models/Talla');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    await connectDB();
    const tallas = await Talla.find().sort({ orden: 1, nombre: 1 }).lean();
    res.json(tallas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const { nombre, talla_eur, talla_us, orden } = req.body;
    const talla = await Talla.create({
      nombre,
      talla_eur: talla_eur || null,
      talla_us:  talla_us  || null,
      orden: orden || 0,
    });
    res.status(201).json(talla);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Talla ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const { nombre, talla_eur, talla_us, orden } = req.body;
    const talla = await Talla.findByIdAndUpdate(
      req.params.id,
      { nombre, talla_eur: talla_eur || null, talla_us: talla_us || null, orden: orden ?? 0 },
      { new: true, runValidators: true }
    );
    if (!talla) return res.status(404).json({ error: 'Not found' });
    res.json(talla);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Talla ya existe' });
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Talla.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
