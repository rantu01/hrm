import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import User from '@/lib/models/User';
import { handleApiError } from '@/lib/auth';
import { authorizeRecruitment, isValidId } from '@/lib/recruitment-server';

// @route   GET /api/recruitment/interview-feedback/interviewers
// @desc    Distinct users who have been assigned as interviewers
// @access  Private (view-interview-feedback)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-interview-feedback');
    await connectDB();

    const ids = await Interview.distinct('interviewers');
    const validIds = ids.filter((value) => isValidId(value));
    const interviewers = validIds.length
      ? await User.find({ _id: { $in: validIds } })
          .select('name email avatar')
          .sort({ name: 1 })
          .lean()
      : [];

    return Response.json({ interviewers }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching interviewers');
  }
}
