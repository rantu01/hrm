import mongoose from 'mongoose';

const employeeReviewSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    reviewer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Reviewer is required'],
    },
    review_cycle_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewCycle',
      required: [true, 'Review cycle is required'],
    },
    review_date: {
      type: Date,
      default: null,
    },
    completion_date: {
      type: Date,
      default: null,
    },
    overall_rating: {
      type: Number,
      default: 0,
    },
    comments: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeReview || mongoose.model('EmployeeReview', employeeReviewSchema);
