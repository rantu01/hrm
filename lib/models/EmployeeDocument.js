import mongoose from 'mongoose';

const employeeDocumentSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    document_type: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true,
    },
    file: {
      type: String,
      trim: true,
      default: null,
    },
    expiry_date: {
      type: Date,
      default: null,
    },
    verification_status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeDocument ||
  mongoose.model('EmployeeDocument', employeeDocumentSchema);
