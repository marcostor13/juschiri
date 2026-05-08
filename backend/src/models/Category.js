const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designer: { type: mongoose.Schema.Types.ObjectId, ref: 'Designer', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
