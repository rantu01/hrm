import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    byName: {
      type: String,
      trim: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
  },
  { _id: false }
);

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    // Configurable leave type. Optional only for backwards compatibility with
    // any records created before leave type management was introduced.
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      default: null,
    },
    // Legacy enum retained so the existing dashboard keeps working.
    type: {
      type: String,
      enum: ['sick', 'vacation', 'personal', 'maternity', 'paternity', 'unpaid', 'other'],
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
      default: 0,
      min: [0, 'Total days cannot be negative'],
    },
    // Per-year day split (e.g. { "2026": 3, "2027": 1 }) used for accurate
    // balance updates when a request crosses a calendar year.
    daysByYear: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    halfDay: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

leaveSchema.index({ employee: 1, startDate: 1 });
leaveSchema.index({ employee: 1, leaveType: 1, status: 1 });
leaveSchema.index({ status: 1, startDate: 1 });

export default mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
