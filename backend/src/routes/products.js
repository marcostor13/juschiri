const router = require('express').Router();
const connectDB = require('../db');
const Product = require('../models/Product');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    await connectDB();
    const { category, subcategory, designer, marca, search, sort, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category)    filter.category    = category;
    if (subcategory) filter.subcategory = subcategory;
    if (designer)    filter.designer    = designer;
    if (marca)       filter.marca       = new RegExp(marca, 'i');
    if (search)      filter.$text       = { $search: search };
    // Ocultar productos duplicados (solo el de código menor es visible) salvo admin
    if (req.query.showAll !== '1') filter.esVisible = { $ne: false };

    const sortOption = {};
    if (sort === 'price_asc')   sortOption.precio_min = 1;
    else if (sort === 'price_desc') sortOption.precio_min = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;
    else sortOption.createdAt = 1;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category')
        .populate('subcategory')
        .populate('designer')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helpers ─────────────────────────────────────────────────────────────────────

function calcStockActual(variantes = []) {
  return variantes.reduce((sum, v) =>
    sum + (v.tallas || []).reduce((s, t) => s + (Number(t.stock) || 0), 0), 0);
}

function calcImagenUrl(variantes = []) {
  const principal = variantes.find(v => v.esPrincipal && v.imagenes?.length);
  if (principal) return principal.imagenes[0];
  const primero = variantes.find(v => v.imagenes?.length);
  return primero ? primero.imagenes[0] : null;
}

function calcPrecioMin(variantes = []) {
  const efectivos = variantes.flatMap(v => v.tallas || [])
    .filter(t => Number(t.precio) > 0)
    .map(t => {
      const p = Number(t.precio);
      const d = Number(t.descuento) || 0;
      return d > 0 ? p * (1 - d / 100) : p;
    });
  return efectivos.length ? Math.min(...efectivos) : 0;
}

function calcTieneOferta(variantes = []) {
  return variantes.some(v => (v.tallas || []).some(t => Number(t.descuento) > 0));
}

async function enrichAndValidate(body, excludeId = null) {
  const variantes = body.variantes || [];

  // SKU unicidad interna (a través de todos los tallas de todas las variantes)
  const skus = variantes.flatMap(v => (v.tallas || []).map(t => t.sku)).filter(Boolean);
  if (skus.length !== new Set(skus).size) {
    throw new Error('Hay SKUs duplicados en las variantes');
  }

  // SKU unicidad en BD (excluye el propio producto en edición)
  if (skus.length) {
    const query = { 'variantes.tallas.sku': { $in: skus } };
    if (excludeId) query._id = { $ne: excludeId };
    const conflict = await Product.findOne(query).lean();
    if (conflict) {
      const dupSku = conflict.variantes
        .flatMap(v => v.tallas || [])
        .find(t => skus.includes(t.sku))?.sku;
      throw new Error(`El SKU "${dupSku}" ya está en uso`);
    }
  }

  // Derivar designer desde la categoría
  let designer = null;
  if (body.category) {
    const cat = await Category.findById(body.category).lean();
    if (cat?.designer) designer = cat.designer;
  }

  return {
    nombre:       body.nombre,
    marca:        body.marca || '',
    category:     body.category || null,
    subcategory:  body.subcategory || null,
    designer,
    galeria:      body.galeria || [],
    variantes,
    stock_actual: calcStockActual(variantes),
    imagen_url:   calcImagenUrl(variantes),
    precio_min:   calcPrecioMin(variantes),
    tiene_oferta: calcTieneOferta(variantes),
  };
}

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    await connectDB();
    const data = await enrichAndValidate(req.body);
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findById(req.params.id)
      .populate('category')
      .populate('subcategory')
      .populate('designer')
      .lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const data = await enrichAndValidate(req.body, req.params.id);
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /products/zero-stock — must be before /:id
router.delete('/zero-stock', auth, async (req, res) => {
  try {
    await connectDB();
    const result = await Product.deleteMany({ stock_actual: 0 });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndDelete(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
