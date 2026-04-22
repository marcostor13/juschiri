const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    codigo:         { type: String, required: true, unique: true, index: true, trim: true },
    nombre:         { type: String, required: true, trim: true },
    imagen_url:     { type: String, default: null },
    stock_anterior: { type: Number, default: 0, min: 0 },
    stock_actual:   { type: Number, default: 0, min: 0 },
    categorias:     [{ type: String, trim: true }],
    marca:          { type: String, trim: true },
    precio:         { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ nombre: 'text', marca: 'text' });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
