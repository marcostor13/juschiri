const router = require('express').Router();
const connectDB = require('../db');
const Product = require('../models/Product');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    await connectDB();
    const { category, type, subcategory, marca, search, sort, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (subcategory) filter.subcategory = subcategory;
    if (marca) filter.marca = new RegExp(marca, 'i');
    if (search) filter.$text = { $search: search };

    const sortOption = {};
    if (sort === 'price_asc') sortOption.precio = 1;
    else if (sort === 'price_desc') sortOption.precio = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;
    else sortOption.createdAt = 1;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category')
        .populate('type')
        .populate('subcategory')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/bulk  — must be before /:codigo
router.post('/bulk', async (req, res) => {
  try {
    await connectDB();
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ error: 'Empty array' });

    const ops = items.map((p) => ({
      updateOne: {
        filter: { codigo: p.codigo },
        update: { $set: p },
        upsert: true,
      },
    }));

    const result = await Product.bulkWrite(ops, { ordered: false });
    res.status(201).json({
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/products/:codigo
router.get('/:codigo', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findOne({ codigo: req.params.codigo }).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/products/:codigo
router.put('/:codigo', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findOneAndUpdate(
      { codigo: req.params.codigo },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:codigo
router.delete('/:codigo', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findOneAndDelete({ codigo: req.params.codigo }).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, codigo: req.params.codigo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
