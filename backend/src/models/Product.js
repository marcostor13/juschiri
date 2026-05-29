const mongoose = require('mongoose');

const TallaSchema = new mongoose.Schema({
  talla:     { type: String, trim: true, default: '' },
  sku:       { type: String, required: true, trim: true },
  stock:     { type: Number, default: 0, min: 0 },
  precio:    { type: Number, required: true, min: 0 },
  descuento: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });

const VarianteSchema = new mongoose.Schema({
  color:       { type: String, trim: true, default: '' },
  imagenes:    [{ type: String }],
  esPrincipal: { type: Boolean, default: false },
  tallas:      [TallaSchema],
}, { _id: true });

const ProductSchema = new mongoose.Schema(
  {
    nombre:       { type: String, required: true, trim: true },
    marca:        { type: String, trim: true },
    category:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subcategory:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory', default: null },
    designer:     { type: mongoose.Schema.Types.ObjectId, ref: 'Designer', default: null },
    imagen_url:   { type: String, default: null },
    galeria:      [{ type: String }],
    stock_actual: { type: Number, default: 0, min: 0 },
    precio_min:   { type: Number, default: 0 },
    tiene_oferta: { type: Boolean, default: false },
    variantes:    [VarianteSchema],
  },
  { timestamps: true }
);

ProductSchema.index({ nombre: 'text', marca: 'text' });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
