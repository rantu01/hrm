import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    key: {
      type: String,
      required: [true, 'Key is required'],
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

settingSchema.index({ key: 1, user_id: 1 }, { unique: true });

export default mongoose.models.Setting || mongoose.model('Setting', settingSchema);