import mongoose from 'mongoose';

const employeeSalarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    basicSalary: {
      type: Number,
      default: 0,
      min: [0, 'Basic salary cannot be negative'],
    },
    components: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalaryComponent' }],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    calculationStatus: {
      type: String,
      enum: ['pending', 'calculated'],
      default: 'pending',
    },
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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// One salary structure per employee.
employeeSalarySchema.index({ employee: 1 }, { unique: true });

export default mongoose.models.EmployeeSalary ||
  mongoose.model('EmployeeSalary', employeeSalarySchema);
