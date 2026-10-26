import connectDB from '@/lib/db';
import Offer from '@/lib/models/Offer';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, sanitize, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { OFFER_RULES, offerPostErrors, offerRefErrors } from '@/lib/recruitment-validation';

const POPULATE = [
  { path: 'candidate_id', select: 'first_name last_name email' },
  { path: 'job_id', select: 'title job_code' },
  { path: 'department_id', select: 'name' },
  { path: 'approved_by', select: 'name' },
];

// @route   GET /api/recruitment/offers/[id]
// @desc    Get a single offer
// @access  Private (view-offers)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-offers');
    if (!isValidId(id)) return badRequest('Invalid offer id');
    await connectDB();

    const offer = await Offer.findById(id).populate(POPULATE).lean();
    if (!offer) return notFound('Offer not found');

    return Response.json({ offer }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching offer');
  }
}

// @route   PUT /api/recruitment/offers/[id]
// @desc    Update an offer (status is changed through the status endpoint)
// @access  Private (edit-offers)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-offers');
    if (!isValidId(id)) return badRequest('Invalid offer id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, OFFER_RULES);
    errors.push(...offerPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.created_by;
    delete cleaned.status;
    delete cleaned.response_date;
    delete cleaned.decline_reason;

    await connectDB();
    const existing = await Offer.findById(id).select('_id').lean();
    if (!existing) return notFound('Offer not found');

    const refErrorItem = await offerRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const candidate = await Candidate.findById(cleaned.candidate_id).select('job_id').lean();
    if (!candidate) return badRequest('Invalid candidate selected');
    cleaned.job_id = candidate.job_id;

    const duplicate = await Offer.findOne({
      candidate_id: cleaned.candidate_id,
      job_id: cleaned.job_id,
      _id: { $ne: id },
    })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json(
        { message: 'An offer already exists for this candidate and job' },
        { status: 409 }
      );
    }

    const offer = await Offer.findByIdAndUpdate(id, { $set: cleaned }, { new: true, runValidators: true })
      .populate(POPULATE)
      .lean();

    return Response.json({ message: 'Offer updated successfully', offer }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating offer');
  }
}

// @route   DELETE /api/recruitment/offers/[id]
// @desc    Delete an offer
// @access  Private (delete-offers)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-offers');
    if (!isValidId(id)) return badRequest('Invalid offer id');
    await connectDB();

    if (!(await Offer.exists({ _id: id }))) return notFound('Offer not found');
    await Offer.findByIdAndDelete(id);

    return Response.json({ message: 'Offer deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting offer');
  }
}
