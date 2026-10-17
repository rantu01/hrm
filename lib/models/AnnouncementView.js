import mongoose from 'mongoose';

const announcementViewSchema = new mongoose.Schema(
  {
    announcement_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: [true, 'Announcement is required'],
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    viewed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

announcementViewSchema.index({ announcement_id: 1, employee_id: 1 }, { unique: true });

export default mongoose.models.AnnouncementView || mongoose.model('AnnouncementView', announcementViewSchema);
