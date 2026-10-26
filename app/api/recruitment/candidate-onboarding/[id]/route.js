import connectDB from '@/lib/db';
import CandidateOnboarding from '@/lib/models/CandidateOnboarding';
import ChecklistItem from '@/lib/models/ChecklistItem';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, sanitize, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { ONBOARDING_RULES, onboardingRefErrors } from '@/lib/recruitment-validation';

const POPULATE = [
  { path: 'employee_id', select: 'name email' },
  { path: 'checklist_id', select: 'name description' },
  { path: 'buddy_employee_id', select: 'name' },
  { path: 'created_by', select: 'name' },
];

// @route   GET /api/recruitment/candidate-onboarding/[id]
// @desc    Get an onboarding process with its checklist tasks
// @access  Private (view-candidate-onboarding)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-candidate-onboarding');
    if (!isValidId(id)) return badRequest('Invalid onboarding id');
    await connectDB();

    const onboarding = await CandidateOnboarding.findById(id).populate(POPULATE).lean();
    if (!onboarding) return notFound('Onboarding process not found');

    const checklistItems = await ChecklistItem.find({ checklist_id: onboarding.checklist_id?._id })
      .sort({ due_day: 1 })
      .lean();

    return Response.json({ onboarding, checklistItems }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching onboarding process');
  }
}

// @route   PUT /api/recruitment/candidate-onboarding/[id]
// @desc    Update an onboarding process
// @access  Private (edit-candidate-onboarding)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-candidate-onboarding');
    if (!isValidId(id)) return badRequest('Invalid onboarding id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, ONBOARDING_RULES);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.created_by;
    delete cleaned.status;

    await connectDB();
    if (!(await CandidateOnboarding.exists({ _id: id }))) return notFound('Onboarding process not found');

    const refErrorItem = await onboardingRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const duplicate = await CandidateOnboarding.findOne({
      employee_id: cleaned.employee_id,
      checklist_id: cleaned.checklist_id,
      _id: { $ne: id },
    })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json(
        { message: 'An onboarding process already exists for this employee with this checklist' },
        { status: 409 }
      );
    }

    const onboarding = await CandidateOnboarding.findByIdAndUpdate(
      id,
      { $set: cleaned },
      { new: true, runValidators: true }
    )
      .populate(POPULATE)
      .lean();

    return Response.json({ message: 'Onboarding updated successfully', onboarding }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating onboarding process');
  }
}

// @route   DELETE /api/recruitment/candidate-onboarding/[id]
// @desc    Delete an onboarding process
// @access  Private (delete-candidate-onboarding)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-candidate-onboarding');
    if (!isValidId(id)) return badRequest('Invalid onboarding id');
    await connectDB();

    if (!(await CandidateOnboarding.exists({ _id: id }))) return notFound('Onboarding process not found');
    await CandidateOnboarding.findByIdAndDelete(id);

    return Response.json({ message: 'Onboarding deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting onboarding process');
  }
}
