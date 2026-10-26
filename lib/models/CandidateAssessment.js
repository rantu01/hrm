import mongoose from 'mongoose';

export const ASSESSMENT_STATUSES = ['Pass', 'Fail', 'Pending'];

const candidateAssessmentSchema = new mongoose.Schema(
  {
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate is required'],
    },
    assessment_name: {
      type: String,
      required: [true, 'Assessment name is required'],
      trim: true,
      maxlength: [255, 'Assessment name cannot exceed 255 characters'],
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
    },
    max_score: {
      type: Number,
      required: [true, 'Max score is required'],
      min: [1, 'Max score must be at least 1'],
    },
    pass_fail_status: {
      type: String,
      enum: ASSESSMENT_STATUSES,
      default: 'Pending',
    },
    comments: {
      type: String,
      default: null,
    },
    conducted_by: {
      type: String,
      trim: true,
      default: null,
    },
    assessment_date: {
      type: Date,
      default: Date.now,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

candidateAssessmentSchema.index({ candidate_id: 1 });

export default mongoose.models.CandidateAssessment ||
  mongoose.model('CandidateAssessment', candidateAssessmentSchema);
