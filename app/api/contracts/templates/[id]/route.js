import connectDB from '@/lib/db';
import ContractTemplate from '@/lib/models/ContractTemplate';
import { requireAuth, handleApiError } from '@/lib/auth';

function toArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractTemplate.findById(id).populate('contract_type_id', 'name');
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    return Response.json({ contractTemplate: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching contract template');
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const item = await ContractTemplate.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.contract_type_id !== undefined) updates.contract_type_id = body.contract_type_id;
    if (body.template_content !== undefined) updates.template_content = body.template_content;
    if (body.variables !== undefined) updates.variables = toArray(body.variables);
    if (body.clauses !== undefined) updates.clauses = toArray(body.clauses);
    if (body.status !== undefined) updates.status = body.status;
    if (body.is_default !== undefined) {
      const isDef = body.is_default === true || body.is_default === 'true';
      if (isDef && !item.is_default) {
        await ContractTemplate.updateMany(
          { created_by: item.created_by, contract_type_id: body.contract_type_id || item.contract_type_id },
          { $set: { is_default: false } }
        );
      }
      updates.is_default = isDef;
    }

    const updated = await ContractTemplate.findByIdAndUpdate(id, updates, { new: true }).populate('contract_type_id', 'name');
    return Response.json({ message: 'Contract template updated successfully', contractTemplate: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating contract template');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractTemplate.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    await ContractTemplate.findByIdAndDelete(id);
    return Response.json({ message: 'Contract template deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting contract template');
  }
}