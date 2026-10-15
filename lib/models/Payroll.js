import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2000, 'Year must be 2000 or later'],
    },
    basicSalary: {
      type: Number,
      default: 0,
      min: [0, 'Basic salary cannot be negative'],
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative'],
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative'],
    },
    netPay: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'paid', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Ensure one payroll record per employee per month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);
