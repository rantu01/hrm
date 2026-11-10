import mongoose from 'mongoose';

const mediaDirectorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    slug: { type: String, trim: true, unique: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaDirectory', default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MediaDirectory ||
  mongoose.model('MediaDirectory', mediaDirectorySchema);