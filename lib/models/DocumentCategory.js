import mongoose from 'mongoose';

const documentCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    description: { type: String, trim: true, default: null },
    color: { type: String, trim: true, default: '#3b82f6' },
    icon: { type: String, trim: true, default: 'FileText' },
    sort_order: { type: Number, default: 0 },
    is_mandatory: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.DocumentCategory ||
  mongoose.model('DocumentCategory', documentCategorySchema);