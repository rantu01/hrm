import mongoose from 'mongoose';

const mediaFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    file_name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    thumb_url: { type: String, trim: true, default: null },
    public_id: { type: String, trim: true, default: null },
    resource_type: { type: String, trim: true, default: null },
    file_format: { type: String, trim: true, default: null },
    size: { type: Number, default: 0 },
    mime_type: { type: String, trim: true, default: 'application/octet-stream' },
    directory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaDirectory', default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MediaFile ||
  mongoose.model('MediaFile', mediaFileSchema);