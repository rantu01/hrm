import mongoose from 'mongoose';

export const OFFER_STATUSES = ['Draft', 'Sent', 'Accepted', 'Negotiating', 'Declined', 'Expired'];

const offerSchema = new mongoose.Schema(
  {
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate is required'],
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: [true, 'Job posting is required'],
    },
    offer_date: {
      type: Date,
      default: Date.now,
    },
    position: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'Position cannot exceed 255 characters'],
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative'],
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    equity: {
      type: String,
      trim: true,
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
    expiration_date: {
      type: Date,
      default: null,
    },
    offer_letter_url: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: 'Draft',
    },
    response_date: {
      type: Date,
      default: null,
    },
    decline_reason: {
      type: String,
      default: null,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

offerSchema.index({ candidate_id: 1 });
offerSchema.index({ job_id: 1 });

export default mongoose.models.Offer || mongoose.model('Offer', offerSchema);
