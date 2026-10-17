import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    end_date: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          if (!value) return true;
          if (!this.start_date) return true;
          return new Date(value) >= new Date(this.start_date);
        },
        message: 'End date must be after or equal to start date',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['national', 'religious', 'company-specific', 'regional'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    is_recurring: {
      type: Boolean,
      default: false,
    },
    is_paid: {
      type: Boolean,
      default: true,
    },
    is_half_day: {
      type: Boolean,
      default: false,
    },
    branch_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);
