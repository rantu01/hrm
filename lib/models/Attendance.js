import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'leave'],
      default: 'present',
    },
    workHours: {
      type: Number,
      default: 0,
      min: [0, 'Work hours cannot be negative'],
    },
    // Optional overtime captured per attendance record. Payroll uses these
    // values when present and falls back to a derived rate otherwise.
    overtimeHours: {
      type: Number,
      default: 0,
      min: [0, 'Overtime hours cannot be negative'],
    },
    overtimeAmount: {
      type: Number,
      default: 0,
      min: [0, 'Overtime amount cannot be negative'],
    },
  },
  { timestamps: true }
);

// Ensure one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
