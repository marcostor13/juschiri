const router = require('express').Router();
const Sale = require('../models/Sale');
const connectDB = require('../db');
const auth = require('../middleware/auth');

// POST /api/sales - Public (from storefront checkout)
router.post('/', async (req, res) => {
  try {
    await connectDB();
    const { cart, total, cliente } = req.body;
    
    const sale = await Sale.create({
      orderId: `ORD-${Date.now()}`,
      items: cart.map(i => ({
        producto: i._id,
        codigo: i.codigo,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad || 1
      })),
      total,
      cliente,
      status: 'completed'
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sales - Protected (for backoffice)
router.get('/', auth, async (req, res) => {
  try {
    await connectDB();
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(100);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/stats - Protected (for dashboard)
router.get('/stats', auth, async (req, res) => {
  try {
    await connectDB();
    const totalRevenue = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const salesByDay = await Sale.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.json({
      revenue: totalRevenue[0]?.total || 0,
      count: await Sale.countDocuments({ status: 'completed' }),
      daily: salesByDay
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sales/:id - Protected (update status)
router.put('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const { status } = req.body;
    const sale = await Sale.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sales/:id - Protected
router.delete('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
