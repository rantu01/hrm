import mongoose from 'mongoose';

const leavePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Leave policy name is required'],
      trim: true,
      maxlength: [100, 'Policy name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: [true, 'Leave type reference is required'],
    },
    accrualType: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'yearly',
    },
    accrualRate: {
      type: Number,
      default: 0,
      min: [0, 'Accrual rate cannot be negative'],
    },
    carryForwardLimit: {
      type: Number,
      default: 0,
      min: [0, 'Carry forward limit cannot be negative'],
    },
    minDaysPerApplication: {
      type: Number,
      default: 1,
      min: [1, 'Minimum days per application must be at least 1'],
    },
    maxDaysPerApplication: {
      type: Number,
      default: 30,
      min: [1, 'Maximum days per application must be at least 1'],
      validate: {
        validator: function (v) {
          return v >= this.minDaysPerApplication;
        },
        message: 'Maximum days per application must be >= minimum days per application',
      },
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
  },
  { timestamps: true }
);

leavePolicySchema.index({ leaveType: 1, status: 1 });
leavePolicySchema.index({ createdBy: 1 });

export default mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema);