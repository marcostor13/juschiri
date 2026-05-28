const router = require('express').Router();
const connectDB = require('../db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Designer = require('../models/Designer');
const Talla = require('../models/Talla');
const Color = require('../models/Color');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const [products, categories, subcategories, designers, tallas, colores, sales] = await Promise.all([
      Product.find().lean(),
      Category.find().lean(),
      Subcategory.find().lean(),
      Designer.find().lean(),
      Talla.find().lean(),
      Color.find().lean(),
      Sale.find().lean(),
    ]);

    const backup = {
      version: '2.0',
      store: 'Jus Chiri',
      createdAt: new Date().toISOString(),
      counts: {
        products: products.length,
        categories: categories.length,
        subcategories: subcategories.length,
        designers: designers.length,
        tallas: tallas.length,
        colores: colores.length,
        sales: sales.length,
      },
      data: { products, categories, subcategories, designers, tallas, colores, sales },
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
