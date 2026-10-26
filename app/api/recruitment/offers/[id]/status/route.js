import connectDB from '@/lib/db';
import Offer from '@/lib/models/Offer';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { OFFER_STATUSES } from '@/lib/recruitment';

// @route   PATCH /api/recruitment/offers/[id]/status
// @desc    Change an offer's status. Accepting an offer hires the candidate
//          (and stores the final salary); declining rejects the candidate.
// @access  Private (approve-offers)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'approve-offers');
    if (!isValidId(id)) return badRequest('Invalid offer id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      {
        field: 'status',
        required: true,
        isIn: OFFER_STATUSES,
        messages: { required: 'Status is required', isIn: 'Status is invalid' },
      },
      { field: 'decline_reason', optional: true },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const offer = await Offer.findById(id);
    if (!offer) return notFound('Offer not found');

    offer.status = data.status;

    if (data.status === 'Accepted' || data.status === 'Declined') {
      offer.response_date = new Date();
    }
    if (data.status === 'Declined' && data.decline_reason) {
      offer.decline_reason = data.decline_reason;
    }

    await offer.save();

    // Side effects (match the reference controller)
    if (data.status === 'Accepted') {
      await Candidate.findByIdAndUpdate(offer.candidate_id, {
        $set: { status: 'Hired', final_salary: offer.salary },
      });
    } else if (data.status === 'Declined') {
      await Candidate.findByIdAndUpdate(offer.candidate_id, { $set: { status: 'Rejected' } });
    }

    const populated = await Offer.findById(id)
      .populate('candidate_id', 'first_name last_name email')
      .populate('job_id', 'title job_code')
      .populate('department_id', 'name')
      .populate('approved_by', 'name')
      .lean();

    return Response.json({ message: 'Offer status updated successfully', offer: populated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating offer status');
  }
}
