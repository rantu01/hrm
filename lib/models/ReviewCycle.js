import mongoose from 'mongoose';

const reviewCycleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Review cycle name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.models.ReviewCycle || mongoose.model('ReviewCycle', reviewCycleSchema);
