import mongoose from 'mongoose';

const contractRenewalSchema = new mongoose.Schema(
  {
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeContract',
      required: [true, 'Contract is required'],
    },
    renewal_number: {
      type: String,
      trim: true,
      default: null,
    },
    current_end_date: {
      type: Date,
      default: null,
    },
    new_start_date: {
      type: Date,
      required: [true, 'New start date is required'],
    },
    new_end_date: {
      type: Date,
      required: [true, 'New end date is required'],
    },
    new_basic_salary: {
      type: Number,
      required: [true, 'New basic salary is required'],
      min: 0,
    },
    new_allowances: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    new_benefits: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    new_terms_conditions: {
      type: String,
      default: null,
    },
    changes_summary: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Processed'],
      default: 'Pending',
    },
    reason: {
      type: String,
      default: null,
    },
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requested by is required'],
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
    approval_notes: {
      type: String,
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

export default mongoose.models.ContractRenewal || mongoose.model('ContractRenewal', contractRenewalSchema);