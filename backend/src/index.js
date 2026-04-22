require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/products');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    const isDev = process.env.NODE_ENV !== 'production';
    if (!origin || isDev || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/products', productRoutes);
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sales', require('./routes/sales'));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Local dev only — Netlify Functions don't call listen()
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
