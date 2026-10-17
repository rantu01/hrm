import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Designation name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Designation || mongoose.model('Designation', designationSchema);
