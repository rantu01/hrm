import mongoose from 'mongoose';

const hrDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, trim: true, default: null },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentCategory', required: [true, 'Category is required'] },
    file_name: { type: String, trim: true, default: null },
    file_path: { type: String, trim: true, default: null },
    file_type: { type: String, trim: true, default: 'application/octet-stream' },
    file_size: { type: Number, default: 0 },
    version: { type: String, trim: true, default: '1.0' },
    status: {
      type: String,
      enum: ['Draft', 'Under Review', 'Approved', 'Published', 'Archived', 'Expired'],
      default: 'Draft',
    },
    effective_date: { type: Date, default: null },
    expiry_date: { type: Date, default: null },
    requires_acknowledgment: { type: Boolean, default: false },
    download_count: { type: Number, default: 0 },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.HrDocument ||
  mongoose.model('HrDocument', hrDocumentSchema);