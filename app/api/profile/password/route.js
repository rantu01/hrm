import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import bcrypt from 'bcryptjs';

export async function PUT(request) {
  try {
    const currentUser = await requireAuth(request);
    await connectDB();
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'current_password', required: true, messages: { required: 'Current password is required' } },
      { field: 'password', minLength: 6, messages: { minLength: 'Password must be at least 6 characters' } },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    if (!data.password) return Response.json({ message: 'New password is required' }, { status: 400 });
    if (body.password_confirmation !== data.password) {
      return Response.json({ message: 'Passwords do not match' }, { status: 400 });
    }

    const user = await User.findById(currentUser._id).select('+password');
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });

    const isMatch = await user.comparePassword(data.current_password);
    if (!isMatch) return Response.json({ message: 'Current password is incorrect' }, { status: 400 });

    user.password = data.password;
    await user.save();
    return Response.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating password');
  }
}