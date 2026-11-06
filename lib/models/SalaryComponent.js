import mongoose from 'mongoose';

const salaryComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['earning', 'deduction'],
      default: 'earning',
    },
    calculationType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    defaultAmount: {
      type: Number,
      default: 0,
      min: [0, 'Default amount cannot be negative'],
    },
    percentageOfBasic: {
      type: Number,
      default: null,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
    isTaxable: {
      type: Boolean,
      default: true,
    },
    isMandatory: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

salaryComponentSchema.index({ name: 1 });
salaryComponentSchema.index({ type: 1, status: 1 });

// Resolve the amount this component contributes for a given basic salary.
salaryComponentSchema.methods.calculateAmount = function calculateAmount(basicSalary = 0) {
  if (this.calculationType === 'percentage' && this.percentageOfBasic != null) {
    return Math.round(((Number(basicSalary) || 0) * this.percentageOfBasic) / 100 * 100) / 100;
  }
  return Number(this.defaultAmount) || 0;
};

export default mongoose.models.SalaryComponent ||
  mongoose.model('SalaryComponent', salaryComponentSchema);
