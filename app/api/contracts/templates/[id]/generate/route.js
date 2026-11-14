import connectDB from '@/lib/db';
import ContractTemplate from '@/lib/models/ContractTemplate';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const item = await ContractTemplate.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    const variables = body.variables || {};
    let content = item.template_content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    }
    return Response.json({ content, variables: item.variables }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error generating contract');
  }
}