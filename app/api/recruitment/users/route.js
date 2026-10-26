import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';
import { searchFilter } from '@/lib/recruitment-server';

// @route   GET /api/recruitment/users
// @desc    Lightweight user list used by recruitment dropdowns (interviewers,
//          approvers, assessors, onboarding buddies)
// @access  Private (any authenticated user)
export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const filter = { status: 'active' };
    const or = searchFilter(sp, ['name', 'email']);
    if (or) filter.$or = or.$or;

    const limit = Math.min(Math.max(parseInt(sp.get('limit'), 10) || 500, 1), 1000);
    const users = await User.find(filter)
      .select('_id name email avatar')
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return Response.json({ users }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching users');
  }
}
