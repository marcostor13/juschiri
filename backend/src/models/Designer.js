const mongoose = require('mongoose');

const DesignerSchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, index: true, trim: true } },
  { timestamps: true }
);

module.exports = mongoose.models.Designer || mongoose.model('Designer', DesignerSchema);
