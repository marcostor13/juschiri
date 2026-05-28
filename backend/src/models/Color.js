const mongoose = require('mongoose');

const ColorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    hex:    { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Color || mongoose.model('Color', ColorSchema);
