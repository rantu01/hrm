import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Role from '@/lib/models/Role';
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

// @route   PUT /api/users/:id/reset-password
export async function PUT(request, { params }) {
  try {
    await authorize(request, 'reset-password-users');
    const { id } = await params;
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'password', minLength: 8, messages: { minLength: 'Password must be at least 8 characters' } },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    if (!data.password) {
      return Response.json({ message: 'Password is required' }, { status: 400 });
    }
    if (body.password_confirmation !== data.password) {
      return Response.json({ message: 'Passwords do not match' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(id).select('+password');
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });
    user.password = data.password;
    await user.save(); // pre-save hook hashes the password
    return Response.json({ message: 'Password reset successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error resetting password');
  }
}
