import mongoose from 'mongoose';

const performanceIndicatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Indicator name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceIndicatorCategory',
      required: [true, 'Category is required'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    measurement_unit: {
      type: String,
      trim: true,
      maxlength: [50, 'Measurement unit cannot exceed 50 characters'],
      default: null,
    },
    target_value: {
      type: String,
      trim: true,
      maxlength: [50, 'Target value cannot exceed 50 characters'],
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
  mongoose.models.PerformanceIndicator ||
  mongoose.model('PerformanceIndicator', performanceIndicatorSchema)
);
