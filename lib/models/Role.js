import mongoose from 'mongoose';
import { ALL_PERMISSIONS } from '@/lib/permissions';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.every((p) => ALL_PERMISSIONS.includes(p)),
        message: 'Role contains an unknown permission',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // System roles (e.g. Super Admin) cannot be deleted or renamed.
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Role || mongoose.model('Role', roleSchema);
