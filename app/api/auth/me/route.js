import { requireAuth, handleApiError } from '@/lib/auth';

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
export async function GET(request) {
  try {
    const user = await requireAuth(request);

    return Response.json({ user: user.toPublicProfile() }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get me error:', error);
    return handleApiError(error, 'Server error');
  }
}
