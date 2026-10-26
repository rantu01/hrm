import connectDB from '@/lib/db';
import CandidateOnboarding from '@/lib/models/CandidateOnboarding';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { ONBOARDING_STATUSES } from '@/lib/recruitment';

// @route   PATCH /api/recruitment/candidate-onboarding/[id]/status
// @desc    Change an onboarding process status
// @access  Private (manage-candidate-onboarding-status)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'manage-candidate-onboarding-status');
    if (!isValidId(id)) return badRequest('Invalid onboarding id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      {
        field: 'status',
        required: true,
        isIn: ONBOARDING_STATUSES,
        messages: { required: 'Status is required', isIn: 'Status is invalid' },
      },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    if (!(await CandidateOnboarding.exists({ _id: id }))) return notFound('Onboarding process not found');

    const onboarding = await CandidateOnboarding.findByIdAndUpdate(
      id,
      { $set: { status: data.status } },
      { new: true, runValidators: true }
    )
      .populate('employee_id', 'name email')
      .populate('checklist_id', 'name')
      .populate('buddy_employee_id', 'name')
      .lean();

    return Response.json({ message: 'Onboarding status updated successfully', onboarding }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating onboarding status');
  }
}
