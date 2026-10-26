import mongoose from 'mongoose';

export const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'No-show'];

const interviewSchema = new mongoose.Schema(
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
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewRound',
      default: null,
    },
    interview_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewType',
      default: null,
    },
    scheduled_date: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    scheduled_time: {
      type: String,
      required: [true, 'Scheduled time is required'],
      match: [/^\d{1,2}:\d{2}(:\d{2})?$/, 'Scheduled time must be in HH:MM format'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [480, 'Duration cannot exceed 480 minutes'],
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    meeting_link: {
      type: String,
      trim: true,
      default: null,
    },
    // Display names of the interviewers
    interviewers: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: 'Scheduled',
    },
    feedback_submitted: {
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

interviewSchema.index({ scheduled_date: 1 });
interviewSchema.index({ candidate_id: 1 });
interviewSchema.index({ job_id: 1 });

export default mongoose.models.Interview || mongoose.model('Interview', interviewSchema);
