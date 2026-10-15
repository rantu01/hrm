import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
export async function POST(request) {
  try {
    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'email', isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'password', required: true, messages: { required: 'Password is required' } },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const { email, password } = data;

    await connectDB();

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return Response.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Check if user is active
    if (user.status === 'suspended') {
      return Response.json({ message: 'Your account has been suspended' }, { status: 401 });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return Response.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days (in seconds)
    });

    return Response.json({ token, user: user.toPublicProfile() }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Login error:', error);
    return Response.json({ message: 'Server error during login' }, { status: 500 });
  }
}
