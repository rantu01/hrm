import mongoose from 'mongoose';

const employeeGoalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters'],
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    goal_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoalType',
      required: [true, 'Goal type is required'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    end_date: {
      type: Date,
      required: [true, 'End date is required'],
    },
    target: {
      type: String,
      trim: true,
      maxlength: [255, 'Target cannot exceed 255 characters'],
      default: null,
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeGoal || mongoose.model('EmployeeGoal', employeeGoalSchema);
