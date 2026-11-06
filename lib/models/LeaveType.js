import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      trim: true,
      unique: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: [24, 'Code cannot exceed 24 characters'],
      match: [/^[A-Z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens and underscores'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    annualAllocation: {
      type: Number,
      default: 0,
      min: [0, 'Annual allocation cannot be negative'],
      max: [365, 'Annual allocation cannot exceed 365 days'],
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    allowHalfDay: {
      type: Boolean,
      default: true,
    },
    includeWeekends: {
      type: Boolean,
      default: false,
    },
    minNoticeDays: {
      type: Number,
      default: 0,
      min: [0, 'Minimum notice cannot be negative'],
      max: [365, 'Minimum notice cannot exceed 365 days'],
    },
    maxConsecutiveDays: {
      type: Number,
      default: 0,
      min: [0, 'Maximum consecutive days cannot be negative'],
      max: [365, 'Maximum consecutive days cannot exceed 365 days'],
    },
    color: {
      type: String,
      default: '#E60023',
      match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex value'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Generate a stable code from the name when the user leaves it blank.
leaveTypeSchema.pre('validate', function () {
  if (!this.code && this.name) {
    this.code = String(this.name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
  }
});

export default mongoose.models.LeaveType || mongoose.model('LeaveType', leaveTypeSchema);
