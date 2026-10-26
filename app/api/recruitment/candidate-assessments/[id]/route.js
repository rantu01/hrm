import connectDB from '@/lib/db';
import CandidateAssessment from '@/lib/models/CandidateAssessment';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, sanitize, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import {
  ASSESSMENT_RULES,
  assessmentPostErrors,
  assessmentRefErrors,
} from '@/lib/recruitment-validation';

const POPULATE = [{ path: 'candidate_id', select: 'first_name last_name email' }];

// @route   GET /api/recruitment/candidate-assessments/[id]
// @desc    Get a single assessment
// @access  Private (view-candidate-assessments)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-candidate-assessments');
    if (!isValidId(id)) return badRequest('Invalid assessment id');
    await connectDB();

    const assessment = await CandidateAssessment.findById(id).populate(POPULATE).lean();
    if (!assessment) return notFound('Assessment not found');

    return Response.json({ assessment }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching assessment');
  }
}

// @route   PUT /api/recruitment/candidate-assessments/[id]
// @desc    Update an assessment
// @access  Private (edit-candidate-assessments)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-candidate-assessments');
    if (!isValidId(id)) return badRequest('Invalid assessment id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, ASSESSMENT_RULES);
    errors.push(...assessmentPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.created_by;

    await connectDB();
    if (!(await CandidateAssessment.exists({ _id: id }))) return notFound('Assessment not found');

    const refErrorItem = await assessmentRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const assessment = await CandidateAssessment.findByIdAndUpdate(
      id,
      { $set: cleaned },
      { new: true, runValidators: true }
    )
      .populate(POPULATE)
      .lean();

    return Response.json({ message: 'Assessment updated successfully', assessment }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating assessment');
  }
}

// @route   DELETE /api/recruitment/candidate-assessments/[id]
// @desc    Delete an assessment
// @access  Private (delete-candidate-assessments)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-candidate-assessments');
    if (!isValidId(id)) return badRequest('Invalid assessment id');
    await connectDB();

    if (!(await CandidateAssessment.exists({ _id: id }))) return notFound('Assessment not found');
    await CandidateAssessment.findByIdAndDelete(id);

    return Response.json({ message: 'Assessment deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting assessment');
  }
}
