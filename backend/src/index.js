// Solo cargar dotenv en desarrollo local
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
}

const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/products');

const app = express();

// CORS más permisivo o desactivado en producción (mismo dominio)
app.use(cors());

app.use(express.json({ limit: '1mb' }));

// Rutas compatibles con /api (local) y con /.netlify/functions/api (producción)
const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
apiRouter.use('/products', productRoutes);
apiRouter.use('/categories', require('./routes/categories'));
apiRouter.use('/upload', require('./routes/upload'));
apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/sales', require('./routes/sales'));
apiRouter.use('/settings', require('./routes/settings'));
apiRouter.use('/backup', require('./routes/backup'));

// Montar el router en ambos posibles prefijos
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);

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
