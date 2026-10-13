const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    designation: {
      type: String,
      trim: true,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },
    branch: {
      type: String,
      trim: true,
      default: null,
    },
    salary: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative'],
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated', 'on-leave'],
      default: 'active',
    },
    avatar: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    emergencyContact: {
      name: { type: String, trim: true, default: null },
      relationship: { type: String, trim: true, default: null },
      phone: { type: String, trim: true, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
