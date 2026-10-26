import mongoose from 'mongoose';

export const RECOMMENDATIONS = ['Strong Hire', 'Hire', 'Maybe', 'Reject', 'Strong Reject'];

const interviewFeedbackSchema = new mongoose.Schema(
  {
    interview_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: [true, 'Interview is required'],
    },
    // Comma-separated user ids (matches the reference implementation)
    interviewer_id: {
      type: String,
      required: [true, 'Interviewer is required'],
      trim: true,
    },
    technical_rating: {
      type: Number,
      required: [true, 'Technical rating is required'],
      min: [0.5, 'Rating must be at least 0.5'],
      max: [5, 'Rating cannot exceed 5'],
    },
    communication_rating: {
      type: Number,
      required: [true, 'Communication rating is required'],
      min: [0.5, 'Rating must be at least 0.5'],
      max: [5, 'Rating cannot exceed 5'],
    },
    cultural_fit_rating: {
      type: Number,
      required: [true, 'Cultural fit rating is required'],
      min: [0.5, 'Rating must be at least 0.5'],
      max: [5, 'Rating cannot exceed 5'],
    },
    overall_rating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [0.5, 'Rating must be at least 0.5'],
      max: [5, 'Rating cannot exceed 5'],
    },
    strengths: {
      type: String,
      default: null,
    },
    weaknesses: {
      type: String,
      default: null,
    },
    comments: {
      type: String,
      default: null,
    },
    recommendation: {
      type: String,
      enum: RECOMMENDATIONS,
      required: [true, 'Recommendation is required'],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

interviewFeedbackSchema.index({ interview_id: 1 });

export default mongoose.models.InterviewFeedback ||
  mongoose.model('InterviewFeedback', interviewFeedbackSchema);
