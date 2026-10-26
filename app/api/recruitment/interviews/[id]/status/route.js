import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { INTERVIEW_STATUSES } from '@/lib/recruitment';

// @route   PATCH /api/recruitment/interviews/[id]/status
// @desc    Update an interview's status (any -> any, no side effects)
// @access  Private (edit-interviews)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-interviews');
    if (!isValidId(id)) return badRequest('Invalid interview id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      {
        field: 'status',
        required: true,
        isIn: INTERVIEW_STATUSES,
        messages: { required: 'Status is required', isIn: 'Status is invalid' },
      },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const interview = await Interview.findById(id).lean();
    if (!interview) return notFound('Interview not found');

    const updated = await Interview.findByIdAndUpdate(id, { $set: { status: data.status } }, { new: true }).lean();

    return Response.json({ message: 'Interview status updated successfully', interview: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating interview status');
  }
}
