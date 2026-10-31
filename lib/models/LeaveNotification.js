import mongoose from 'mongoose';

const leaveNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
    },
    type: {
      type: String,
      enum: ['application', 'approved', 'rejected', 'cancelled', 'balance', 'system'],
      default: 'system',
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    link: {
      type: String,
      trim: true,
      default: '/leave/applications',
    },
    leave: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveNotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default
  mongoose.models.LeaveNotification ||
  mongoose.model('LeaveNotification', leaveNotificationSchema);
