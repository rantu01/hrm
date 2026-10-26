import OfferTemplate from '@/lib/models/OfferTemplate';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: OfferTemplate,
  permission: 'offer-templates',
  entityKey: 'offerTemplates',
  itemKey: 'offerTemplate',
});

// @route   PATCH /api/recruitment/offer-templates/[id]/toggle-status
// @desc    Flip an offer template between active / inactive
// @access  Private (edit-offer-templates)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
