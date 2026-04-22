const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  items: [
    {
      producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      codigo: String,
      nombre: String,
      cantidad: { type: Number, default: 1 },
      precio: Number,
    }
  ],
  total: { type: Number, required: true },
  cliente: {
    nombre: String,
    direccion: String,
    telefono: String,
  },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'completed' },
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
