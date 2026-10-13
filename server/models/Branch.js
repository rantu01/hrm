const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    manager: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
