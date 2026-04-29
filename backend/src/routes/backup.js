const router = require('express').Router();
const connectDB = require('../db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Type = require('../models/Type');
const Subcategory = require('../models/Subcategory');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');

// POST /api/backup — dump all data and return as downloadable JSON
router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const [products, categories, types, subcategories, sales] = await Promise.all([
      Product.find().lean(),
      Category.find().lean(),
      Type.find().lean(),
      Subcategory.find().lean(),
      Sale.find().lean(),
    ]);

    const backup = {
      version: '1.0',
      store: 'Jus Chiri',
      createdAt: new Date().toISOString(),
      counts: {
        products: products.length,
        categories: categories.length,
        types: types.length,
        subcategories: subcategories.length,
        sales: sales.length,
      },
      data: { products, categories, types, subcategories, sales },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `juschiri-backup-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
