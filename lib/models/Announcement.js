import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['company news', 'policy updates', 'events', 'HR', 'IT updates'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    end_date: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          if (!value) return true;
          if (!this.start_date) return true;
          return new Date(value) >= new Date(this.start_date);
        },
        message: 'End date must be after or equal to start date',
      },
    },
    attachments: {
      type: String,
      trim: true,
      default: null,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_high_priority: {
      type: Boolean,
      default: false,
    },
    is_company_wide: {
      type: Boolean,
      default: true,
    },
    branch_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      default: [],
    },
    department_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
