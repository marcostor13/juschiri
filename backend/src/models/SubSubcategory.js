const mongoose = require('mongoose');

const SubSubcategorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory', required: true },
    type:        { type: mongoose.Schema.Types.ObjectId, ref: 'Type' },
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SubSubcategory || mongoose.model('SubSubcategory', SubSubcategorySchema);
