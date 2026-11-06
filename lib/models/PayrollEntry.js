import mongoose from 'mongoose';

const breakdownItem = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const payrollEntrySchema = new mongoose.Schema(
  {
    payrollRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: [true, 'Payroll run reference is required'],
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    basicSalary: { type: Number, default: 0 },
    componentEarnings: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    fullPresentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    holidayDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 },
    lopDeduction: { type: Number, default: 0 },
    effectivePaidDays: { type: Number, default: 0 },

    overtimeHours: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    perDaySalary: { type: Number, default: 0 },
    unpaidLeaveDeduction: { type: Number, default: 0 },

    earningsBreakdown: { type: [breakdownItem], default: [] },
    deductionsBreakdown: { type: [breakdownItem], default: [] },

    notes: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// One entry per employee per payroll run.
payrollEntrySchema.index({ payrollRun: 1, employee: 1 }, { unique: true });
payrollEntrySchema.index({ employee: 1, createdAt: -1 });

export default mongoose.models.PayrollEntry ||
  mongoose.model('PayrollEntry', payrollEntrySchema);
