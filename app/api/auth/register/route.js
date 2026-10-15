import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
export async function POST(request) {
  try {
    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
      { field: 'email', isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'password', minLength: 6, messages: { minLength: 'Password must be at least 6 characters' } },
      { field: 'type', optional: true, isIn: ['superadmin', 'employee'], messages: { isIn: 'Invalid user type' } },
      { field: 'role', optional: true, trim: true },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const { name, email, password, type, role } = data;

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json({ message: 'User already exists with this email' }, { status: 400 });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      type: type || 'employee',
      role: role || 'employee',
    });

    // Generate token
    const token = generateToken(user._id);

    return Response.json(
      { token, user: user.toPublicProfile() },
      { status: 201 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Register error:', error);
    return Response.json({ message: 'Server error during registration' }, { status: 500 });
  }
}
