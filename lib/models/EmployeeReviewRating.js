import mongoose from 'mongoose';

const employeeReviewRatingSchema = new mongoose.Schema(
  {
    review_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeReview',
      required: [true, 'Review is required'],
    },
    indicator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceIndicator',
      required: [true, 'Indicator is required'],
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 3,
    },
    comments: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

employeeReviewRatingSchema.index({ review_id: 1, indicator_id: 1 }, { unique: true });

export default (
  mongoose.models.EmployeeReviewRating ||
  mongoose.model('EmployeeReviewRating', employeeReviewRatingSchema)
);
