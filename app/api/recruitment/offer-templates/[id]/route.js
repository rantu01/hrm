import OfferTemplate from '@/lib/models/OfferTemplate';
import { extractTemplateVariables } from '@/lib/recruitment';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: OfferTemplate,
  permission: 'offer-templates',
  entityKey: 'offerTemplates',
  itemKey: 'offerTemplate',
  searchFields: ['name', 'template_content'],
  sortMap: {
    name: 'name',
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  validate: [
    { field: 'name', required: true, trim: true, maxLength: 255, messages: { required: 'Name is required' } },
    {
      field: 'template_content',
      required: true,
      trim: true,
      messages: { required: 'Template content is required' },
    },
    {
      field: 'status',
      optional: true,
      isIn: ['active', 'inactive'],
      messages: { isIn: 'Status is invalid' },
    },
  ],
  transform: (data, _user, existing) => {
    data.variables = extractTemplateVariables(data.template_content ?? existing?.template_content);
    return data;
  },
});

// @route   PUT /api/recruitment/offer-templates/[id]
// @desc    Update an offer template
// @access  Private (edit-offer-templates)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/offer-templates/[id]
// @desc    Delete an offer template
// @access  Private (delete-offer-templates)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
