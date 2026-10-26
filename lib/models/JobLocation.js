import mongoose from 'mongoose';

const jobLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'City cannot exceed 255 characters'],
    },
    state: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'State cannot exceed 255 characters'],
    },
    country: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'Country cannot exceed 255 characters'],
    },
    postal_code: {
      type: String,
      trim: true,
      default: null,
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },
    is_remote: {
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

export default mongoose.models.JobLocation || mongoose.model('JobLocation', jobLocationSchema);
