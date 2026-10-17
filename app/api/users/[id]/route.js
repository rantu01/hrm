import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Role from '@/lib/models/Role';
import Employee from '@/lib/models/Employee';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

async function authorize(request, permission) {
  try {
    return await requirePermission(request, permission);
  } catch (err) {
    if (err && err.statusCode === 403) {
      await connectDB();
      const count = await Role.countDocuments();
      if (count === 0) return requireAuth(request);
    }
    throw err;
  }
}

function sanitize(data) {
  const out = { ...(data || {}) };
  for (const key of Object.keys(out)) {
    if (out[key] === '' || out[key] === undefined) delete out[key];
  }
  return out;
}

const PUBLIC_SELECT = 'name email type role avatar status createdAt updatedAt';

// @route   GET /api/users/:id
export async function GET(request, { params }) {
  try {
    await authorize(request, 'view-users');
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id).select(PUBLIC_SELECT).lean();
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });
    return Response.json({ user }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching user');
  }
}

// @route   PUT /api/users/:id
export async function PUT(request, { params }) {
  try {
    const currentUser = await authorize(request, 'edit-users');
    const { id } = await params;
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'email', optional: true, isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'avatar', optional: true, trim: true },
      { field: 'role', optional: true, trim: true },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const user = await User.findById(id).select('+password');
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });

    const clean = sanitize(data);
    // Passwords change only via reset-password; type/status only via
    // role assignment and toggle-status — never through direct edit.
    delete clean.password;
    delete clean.password_confirmation;
    delete clean.type;
    delete clean.status;
    if (clean.email && clean.email !== user.email) {
      const existing = await User.findOne({ email: clean.email, _id: { $ne: user._id } });
      if (existing) {
        return Response.json({ message: 'A user with this email already exists' }, { status: 400 });
      }
    }
    if (clean.role) {
      const roleDoc = await Role.findOne({ name: clean.role });
      if (!roleDoc) return Response.json({ message: 'Selected role does not exist' }, { status: 400 });
      clean.role = roleDoc.name;
      // Changing role re-derives the account type, except for your own
      // account so you cannot lock yourself out.
      if (String(user._id) !== String(currentUser._id)) {
        clean.type = roleDoc.name === 'Super Admin' ? 'superadmin' : 'employee';
      }
    }

    Object.assign(user, clean);
    await user.save(); // pre-save hook hashes a changed password
    const fresh = await User.findById(id).select(PUBLIC_SELECT).lean();
    return Response.json({ message: 'User updated successfully', user: fresh }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    if (error && error.code === 11000) {
      return Response.json({ message: 'A user with this email already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating user');
  }
}

// @route   DELETE /api/users/:id
export async function DELETE(request, { params }) {
  try {
    const currentUser = await authorize(request, 'delete-users');
    await connectDB();
    const { id } = await params;
    if (String(id) === String(currentUser._id)) {
      return Response.json({ message: 'You cannot delete your own account' }, { status: 400 });
    }
    const user = await User.findById(id);
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });

    // Detach linked employee records instead of deleting them.
    await Employee.updateMany({ user: user._id }, { $unset: { user: '' } });
    await user.deleteOne();
    return Response.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting user');
  }
}
