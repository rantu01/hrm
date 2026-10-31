import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: [true, 'Leave type reference is required'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2000, 'Year must be 2000 or later'],
      max: [2100, 'Year cannot exceed 2100'],
    },
    // Days granted for the year (initialised from the leave type allocation).
    allocated: {
      type: Number,
      default: 0,
      min: [0, 'Allocated days cannot be negative'],
    },
    // Days carried over from the previous year.
    carryForward: {
      type: Number,
      default: 0,
      min: [0, 'Carry forward days cannot be negative'],
    },
    // Manual adjustment (positive or negative). Kept separate for auditing.
    adjustment: {
      type: Number,
      default: 0,
    },
    // Reason for the adjustment (for auditing purposes).
    adjustmentReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Adjustment reason cannot exceed 500 characters'],
    },
    // Derived automatically from leave requests. Never edited directly.
    used: {
      type: Number,
      default: 0,
      min: [0, 'Used days cannot be negative'],
    },
    pending: {
      type: Number,
      default: 0,
      min: [0, 'Pending days cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    lastRecalculatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });

leaveBalanceSchema.virtual('available').get(function () {
  return (
    Number(this.allocated || 0) +
    Number(this.carryForward || 0) +
    Number(this.adjustment || 0) -
    Number(this.used || 0) -
    Number(this.pending || 0)
  );
});

leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });

export default mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);
