import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import InterviewRound from '@/lib/models/InterviewRound';
import { handleApiError } from '@/lib/auth';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';

// @route   GET /api/recruitment/interviews/rounds-by-candidate/[candidateId]
// @desc    Active interview rounds of the candidate's job posting (dropdown)
// @access  Private (view-interviews)
export async function GET(request, { params }) {
  try {
    const { candidateId } = await params;
    await authorizeRecruitment(request, 'view-interviews');
    if (!isValidId(candidateId)) return badRequest('Invalid candidate id');
    await connectDB();

    const candidate = await Candidate.findById(candidateId).select('job_id').lean();
    if (!candidate) return notFound('Candidate not found');

    const rounds = await InterviewRound.find({ job_id: candidate.job_id, status: 'active' })
      .select('name sequence_number')
      .sort({ sequence_number: 1 })
      .lean();

    return Response.json({ rounds }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching interview rounds');
  }
}
