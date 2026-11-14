import connectDB from '@/lib/db';
import ContractType from '@/lib/models/ContractType';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractType.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    return Response.json({ contractType: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching contract type');
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const item = await ContractType.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.default_duration_months !== undefined) updates.default_duration_months = body.default_duration_months === '' ? null : Number(body.default_duration_months);
    if (body.probation_period_months !== undefined) updates.probation_period_months = Number(body.probation_period_months);
    if (body.notice_period_days !== undefined) updates.notice_period_days = Number(body.notice_period_days);
    if (body.is_renewable !== undefined) updates.is_renewable = body.is_renewable === true || body.is_renewable === 'true';
    if (body.status !== undefined) updates.status = body.status;
    const updated = await ContractType.findByIdAndUpdate(id, updates, { new: true });
    return Response.json({ message: 'Contract type updated successfully', contractType: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating contract type');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractType.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    await ContractType.findByIdAndDelete(id);
    return Response.json({ message: 'Contract type deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting contract type');
  }
}