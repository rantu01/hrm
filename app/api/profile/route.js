import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const fresh = await User.findById(user._id).select('name email type role avatar status createdAt updatedAt').lean();
    return Response.json({ user: fresh }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching profile');
  }
}

export async function PUT(request) {
  try {
    const currentUser = await requireAuth(request);
    await connectDB();
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'email', optional: true, isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'avatar', optional: true, trim: true },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const user = await User.findById(currentUser._id);
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });

    if (data.name) user.name = data.name;
    if (data.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: user._id } });
      if (existing) return Response.json({ message: 'A user with this email already exists' }, { status: 400 });
      user.email = data.email;
    }
    if (data.avatar !== undefined) user.avatar = data.avatar || null;

    await user.save();
    const fresh = await User.findById(user._id).select('name email type role avatar status createdAt updatedAt').lean();
    return Response.json({ message: 'Profile updated successfully', user: fresh }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating profile');
  }
}