import OfferTemplate from '@/lib/models/OfferTemplate';
import { extractTemplateVariables, renderTemplate } from '@/lib/recruitment';
import connectDB from '@/lib/db';
import { handleApiError } from '@/lib/auth';
import { authorizeRecruitment, badRequest, notFound, isValidId } from '@/lib/recruitment-server';
import { parseJsonBody } from '@/lib/validation';

// @route   POST /api/recruitment/offer-templates/generate
// @desc    Render an offer letter from a template (by id or inline content) for client-side printing
// @access  Private (view-offer-templates)
export async function POST(request) {
  try {
    await authorizeRecruitment(request, 'view-offer-templates');
    const body = await parseJsonBody(request);

    let content;
    let declared;
    if (body.id) {
      if (!isValidId(String(body.id))) return notFound('Template not found');
      await connectDB();
      const template = await OfferTemplate.findById(body.id).lean();
      if (!template) return notFound('Template not found');
      content = template.template_content;
      declared = Array.isArray(template.variables) ? template.variables : [];
    } else {
      content = typeof body.template_content === 'string' ? body.template_content.trim() : '';
      if (!content) return badRequest('Template content is required');
      declared = extractTemplateVariables(content);
    }

    // Only substitute declared variables that were actually provided;
    // everything else keeps its literal {{placeholder}}.
    const provided = body.variables && typeof body.variables === 'object' ? body.variables : {};
    const renderMap = {};
    for (const name of declared) {
      const value = provided[name];
      if (value !== undefined && value !== null) renderMap[name] = String(value);
    }

    const rendered = renderTemplate(content, renderMap);
    return Response.json(
      { content: rendered, variables: declared, filename: body.filename || null },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error generating offer letter');
  }
}
