import mongoose from 'mongoose';

const contractTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    default_duration_months: {
      type: Number,
      min: 1,
      max: 120,
      default: null,
    },
    probation_period_months: {
      type: Number,
      required: [true, 'Probation period is required'],
      min: 0,
      max: 12,
      default: 0,
    },
    notice_period_days: {
      type: Number,
      required: [true, 'Notice period is required'],
      min: 0,
      max: 365,
      default: 0,
    },
    is_renewable: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ContractType || mongoose.model('ContractType', contractTypeSchema);