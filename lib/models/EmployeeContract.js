import mongoose from 'mongoose';

const employeeContractSchema = new mongoose.Schema(
  {
    contract_number: {
      type: String,
      trim: true,
      default: null,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
    },
    contract_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContractType',
      required: [true, 'Contract type is required'],
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    end_date: {
      type: Date,
      default: null,
    },
    basic_salary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: 0,
    },
    benefits: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    terms_conditions: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Active', 'Expired', 'Terminated', 'Renewed'],
      default: 'Draft',
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approved_at: {
      type: Date,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    rejected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejected_at: {
      type: Date,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeContract || mongoose.model('EmployeeContract', employeeContractSchema);