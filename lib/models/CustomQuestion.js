import mongoose from 'mongoose';

const customQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    required: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CustomQuestion || mongoose.model('CustomQuestion', customQuestionSchema);
