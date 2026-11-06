import mongoose from 'mongoose';

const payrollRunSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Payroll run title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters'],
    },
    payrollFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'monthly',
    },
    payPeriodStart: {
      type: Date,
      required: [true, 'Pay period start is required'],
    },
    payPeriodEnd: {
      type: Date,
      required: [true, 'Pay period end is required'],
    },
    payDate: {
      type: Date,
      required: [true, 'Pay date is required'],
    },
    totalGrossPay: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    totalNetPay: {
      type: Number,
      default: 0,
    },
    employeeCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'processing', 'completed', 'cancelled'],
      default: 'draft',
    },
    notes: {
      type: String,
      trim: true,
      default: null,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// A single payroll run per pay period.
payrollRunSchema.index(
  { payPeriodStart: 1, payPeriodEnd: 1 },
  { unique: true }
);
payrollRunSchema.index({ status: 1, payDate: -1 });

export default mongoose.models.PayrollRun ||
  mongoose.model('PayrollRun', payrollRunSchema);
