import mongoose from 'mongoose';

const performanceIndicatorCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
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

export default (
  mongoose.models.PerformanceIndicatorCategory ||
  mongoose.model('PerformanceIndicatorCategory', performanceIndicatorCategorySchema)
);
