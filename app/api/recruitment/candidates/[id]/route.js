import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import Interview from '@/lib/models/Interview';
import InterviewFeedback from '@/lib/models/InterviewFeedback';
import Offer from '@/lib/models/Offer';
import CandidateAssessment from '@/lib/models/CandidateAssessment';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import {
  authorizeRecruitment,
  isValidId,
  badRequest,
  notFound,
} from '@/lib/recruitment-server';
import {
  CANDIDATE_RULES,
  candidatePostErrors,
  candidateRefErrors,
  cleanCandidatePayload,
} from '@/lib/recruitment-validation';

const DETAIL_POPULATE = [
  { path: 'job_id', select: 'title job_code status department_id location_id' },
  { path: 'source_id', select: 'name' },
  { path: 'branch_id', select: 'name' },
  { path: 'department_id', select: 'name' },
  { path: 'referral_employee_id', select: 'name' },
];

const FORM_POPULATE = [
  { path: 'job_id', select: 'title job_code' },
  { path: 'source_id', select: 'name' },
  { path: 'branch_id', select: 'name' },
  { path: 'department_id', select: 'name' },
];

// @route   GET /api/recruitment/candidates/[id]
// @desc    Get a candidate with related record counts
// @access  Private (view-candidates)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-candidates');
    if (!isValidId(id)) return badRequest('Invalid candidate id');
    await connectDB();

    const candidate = await Candidate.findById(id).populate(DETAIL_POPULATE).lean();
    if (!candidate) return notFound('Candidate not found');

    const [interviewsCount, offersCount, assessmentsCount] = await Promise.all([
      Interview.countDocuments({ candidate_id: id }),
      Offer.countDocuments({ candidate_id: id }),
      CandidateAssessment.countDocuments({ candidate_id: id }),
    ]);

    return Response.json({ candidate, interviewsCount, offersCount, assessmentsCount }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching candidate');
  }
}

// @route   PUT /api/recruitment/candidates/[id]
// @desc    Update a candidate
// @access  Private (edit-candidates)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-candidates');
    if (!isValidId(id)) return badRequest('Invalid candidate id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, CANDIDATE_RULES);
    errors.push(...candidatePostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = cleanCandidatePayload(data);
    delete cleaned.created_by;

    await connectDB();
    const existing = await Candidate.findById(id).select('_id job_id').lean();
    if (!existing) return notFound('Candidate not found');

    const refErrorItem = await candidateRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const duplicate = await Candidate.findOne({
      email: cleaned.email,
      job_id: cleaned.job_id || existing.job_id,
      _id: { $ne: id },
    })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json({ message: 'This candidate has already applied to this job' }, { status: 409 });
    }

    const candidate = await Candidate.findByIdAndUpdate(id, { $set: cleaned }, { new: true, runValidators: true })
      .populate(FORM_POPULATE)
      .lean();

    return Response.json({ message: 'Candidate updated successfully', candidate }, { status: 200 });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ message: 'This candidate has already applied to this job' }, { status: 409 });
    }
    return handleApiError(error, 'Server error updating candidate');
  }
}

// @route   DELETE /api/recruitment/candidates/[id]
// @desc    Delete a candidate (reference implementation has no cascade)
// @access  Private (delete-candidates)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-candidates');
    if (!isValidId(id)) return badRequest('Invalid candidate id');
    await connectDB();

    const existing = await Candidate.findById(id).select('_id').lean();
    if (!existing) return notFound('Candidate not found');

    await Candidate.findByIdAndDelete(id);

    return Response.json({ message: 'Candidate deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting candidate');
  }
}
