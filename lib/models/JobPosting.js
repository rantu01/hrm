import mongoose from 'mongoose';

export const JOB_STATUSES = ['Draft', 'Published', 'Closed'];
export const JOB_PRIORITIES = ['Low', 'Medium', 'High'];

const jobPostingSchema = new mongoose.Schema(
  {
    job_code: {
      type: String,
      required: [true, 'Job code is required'],
      trim: true,
      maxlength: [50, 'Job code cannot exceed 50 characters'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters'],
    },
    job_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobType',
      default: null,
    },
    location_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobLocation',
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
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCategory',
      default: null,
    },
    priority: {
      type: String,
      enum: JOB_PRIORITIES,
      default: 'Medium',
    },
    skills: {
      type: [String],
      default: [],
    },
    positions: {
      type: Number,
      default: 1,
      min: [1, 'Positions must be at least 1'],
    },
    min_experience: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_experience: {
      type: Number,
      default: null,
      min: 0,
    },
    min_salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: null,
    },
    requirements: {
      type: String,
      default: null,
    },
    benefits: {
      type: String,
      default: null,
    },
    start_date: {
      type: Date,
      default: null,
    },
    application_deadline: {
      type: Date,
      default: null,
    },
    // Which optional applicant fields the application form should show
    applicant: {
      type: [String],
      default: [],
    },
    // Which optional sections the application form should show
    visibility: {
      type: [String],
      default: [],
    },
    // Selected custom question ids
    custom_question: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'CustomQuestion',
      default: [],
    },
    is_published: {
      type: Boolean,
      default: false,
    },
    publish_date: {
      type: Date,
      default: null,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'Draft',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

jobPostingSchema.index({ job_code: 1 }, { unique: true });
jobPostingSchema.index({ title: 'text', description: 'text' });

export default mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema);
