const mongoose = require('mongoose');

const SubcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    type: { type: mongoose.Schema.Types.ObjectId, ref: 'Type' },
  },
  { timestamps: true }
);

// Índice para asegurar que el nombre de la subcategoría sea único dentro de un type o categoría
SubcategorySchema.index({ name: 1, type: 1 }, { unique: false });

module.exports = mongoose.models.Subcategory || mongoose.model('Subcategory', SubcategorySchema);
