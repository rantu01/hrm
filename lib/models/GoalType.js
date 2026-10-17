import mongoose from 'mongoose';

const goalTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Goal type name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
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

export default mongoose.models.GoalType || mongoose.model('GoalType', goalTypeSchema);
