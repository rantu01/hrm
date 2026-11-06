import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema(
  {
    payrollEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollEntry',
      required: [true, 'Payroll entry reference is required'],
      unique: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    payslipNumber: {
      type: String,
      required: [true, 'Payslip number is required'],
      unique: true,
      trim: true,
    },
    payPeriodStart: { type: Date, required: true },
    payPeriodEnd: { type: Date, required: true },
    payDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['generated', 'sent', 'downloaded'],
      default: 'generated',
    },
    sentAt: { type: Date, default: null },
    downloadedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

payslipSchema.index({ employee: 1, payDate: -1 });
payslipSchema.index({ payPeriodStart: 1, payPeriodEnd: 1 });

export default mongoose.models.Payslip || mongoose.model('Payslip', payslipSchema);
