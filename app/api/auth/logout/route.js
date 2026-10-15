import { cookies } from 'next/headers';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
export async function POST(request) {
  try {
    await requireAuth(request);

    const cookieStore = await cookies();
    cookieStore.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });

    return Response.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error during logout');
  }
}
