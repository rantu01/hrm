import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { CANDIDATE_STATUSES } from '@/lib/recruitment';

// @route   PATCH /api/recruitment/candidates/[id]/status
// @desc    Update a candidate's pipeline status (any -> any, no side effects)
// @access  Private (edit-candidates)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-candidates');
    if (!isValidId(id)) return badRequest('Invalid candidate id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      {
        field: 'status',
        required: true,
        isIn: CANDIDATE_STATUSES,
        messages: { required: 'Status is required', isIn: 'Status is invalid' },
      },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const candidate = await Candidate.findById(id).lean();
    if (!candidate) return notFound('Candidate not found');

    const updated = await Candidate.findByIdAndUpdate(id, { $set: { status: data.status } }, { new: true }).lean();

    return Response.json({ message: 'Candidate status updated successfully', candidate: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating candidate status');
  }
}
