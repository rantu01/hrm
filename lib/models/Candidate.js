import mongoose from 'mongoose';

export const CANDIDATE_STATUSES = ['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const candidateSchema = new mongoose.Schema(
  {
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: [true, 'Job posting is required'],
    },
    source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CandidateSource',
      default: null,
    },
    first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    last_name: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
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
      default: null,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    date_of_birth: {
      type: Date,
      default: null,
    },
    address: {
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
    zip_code: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
    current_company: {
      type: String,
      trim: true,
      default: null,
    },
    current_position: {
      type: String,
      trim: true,
      default: null,
    },
    experience_years: {
      type: Number,
      default: 0,
      min: 0,
    },
    current_salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    expected_salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    final_salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    notice_period: {
      type: Number,
      default: 0,
      min: 0,
    },
    resume_url: {
      type: String,
      trim: true,
      default: null,
    },
    cover_letter_url: {
      type: String,
      trim: true,
      default: null,
    },
    coverletter_message: {
      type: String,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: String,
      default: null,
    },
    portfolio_url: {
      type: String,
      trim: true,
      default: null,
    },
    linkedin_url: {
      type: String,
      trim: true,
      default: null,
    },
    referral_employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      enum: CANDIDATE_STATUSES,
      default: 'New',
    },
    application_date: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    is_archive: {
      type: Boolean,
      default: false,
    },
    is_employee: {
      type: Boolean,
      default: false,
    },
    // Answers to the job posting's custom questions
    custom_question: {
      type: [
        new mongoose.Schema(
          {
            question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomQuestion' },
            question: { type: String, default: null },
            answer: { type: String, default: null },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    terms_condition_check: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

candidateSchema.index({ email: 1, job_id: 1 }, { unique: true });
candidateSchema.index({ status: 1 });
candidateSchema.index({ first_name: 1, last_name: 1 });

export default mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
