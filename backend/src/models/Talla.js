const mongoose = require('mongoose');

const TallaSchema = new mongoose.Schema(
  {
    nombre:    { type: String, required: true, unique: true, trim: true },
    talla_eur: { type: String, trim: true, default: null },
    talla_us:  { type: String, trim: true, default: null },
    orden:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Talla || mongoose.model('Talla', TallaSchema);
