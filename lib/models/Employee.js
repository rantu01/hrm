import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    employee_id: {
      type: String,
      unique: true,
      trim: true,
    },
    biometric_emp_id: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null,
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
    date_of_birth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: null,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch is required'],
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    designation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      required: [true, 'Designation is required'],
    },
    date_of_joining: {
      type: Date,
      required: [true, 'Date of joining is required'],
    },
    employment_type: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
      default: 'Full-time',
    },
    employee_status: {
      type: String,
      enum: ['active', 'inactive', 'probation', 'terminated'],
      default: 'active',
    },
    address_line_1: {
      type: String,
      trim: true,
      default: null,
    },
    address_line_2: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
    postal_code: {
      type: String,
      trim: true,
      default: null,
    },
    emergency_contact_name: {
      type: String,
      trim: true,
      default: null,
    },
    emergency_contact_relationship: {
      type: String,
      trim: true,
      default: null,
    },
    emergency_contact_number: {
      type: String,
      trim: true,
      default: null,
    },
    bank_name: {
      type: String,
      trim: true,
      default: null,
    },
    account_holder_name: {
      type: String,
      trim: true,
      default: null,
    },
    account_number: {
      type: String,
      trim: true,
      default: null,
    },
    bank_identifier_code: {
      type: String,
      trim: true,
      default: null,
    },
    bank_branch: {
      type: String,
      trim: true,
      default: null,
    },
    tax_payer_id: {
      type: String,
      trim: true,
      default: null,
    },
    base_salary: {
      type: Number,
      default: 0,
      min: [0, 'Base salary cannot be negative'],
    },
    profile_image: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Generate the next unique employee ID (EMP + 6 digits)
employeeSchema.statics.generateEmployeeId = async function () {
  const last = await this.findOne({ employee_id: /^EMP\d+$/ })
    .sort({ employee_id: -1 })
    .select('employee_id')
    .lean();
  let next = 1;
  if (last?.employee_id) {
    const n = parseInt(last.employee_id.replace(/^EMP/, ''), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `EMP${String(next).padStart(6, '0')}`;
};

export default mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
