import mongoose from 'mongoose';

export const ONBOARDING_STATUSES = ['Pending', 'In Progress', 'Completed'];

const candidateOnboardingSchema = new mongoose.Schema(
  {
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    checklist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OnboardingChecklist',
      required: [true, 'Checklist is required'],
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    buddy_employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ONBOARDING_STATUSES,
      default: 'Pending',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CandidateOnboarding ||
  mongoose.model('CandidateOnboarding', candidateOnboardingSchema);
