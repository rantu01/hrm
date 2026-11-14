import connectDB from '@/lib/db';
import ContractRenewal from '@/lib/models/ContractRenewal';
import EmployeeContract from '@/lib/models/EmployeeContract';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractRenewal.findById(id)
      .populate({ path: 'contract_id', populate: { path: 'employee_id', select: 'name email' } })
      .populate('requested_by', 'name')
      .populate('approved_by', 'name');
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    return Response.json({ contractRenewal: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching contract renewal');
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const item = await ContractRenewal.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    const updates = {};
    if (body.new_start_date !== undefined) updates.new_start_date = body.new_start_date;
    if (body.new_end_date !== undefined) updates.new_end_date = body.new_end_date;
    if (body.new_basic_salary !== undefined) updates.new_basic_salary = Number(body.new_basic_salary);
    if (body.new_allowances !== undefined) updates.new_allowances = Array.isArray(body.new_allowances) ? body.new_allowances : [];
    if (body.new_benefits !== undefined) updates.new_benefits = Array.isArray(body.new_benefits) ? body.new_benefits : [];
    if (body.new_terms_conditions !== undefined) updates.new_terms_conditions = body.new_terms_conditions || null;
    if (body.changes_summary !== undefined) updates.changes_summary = body.changes_summary || null;
    if (body.reason !== undefined) updates.reason = body.reason || null;
    if (body.requested_by !== undefined) updates.requested_by = body.requested_by;
    if (body.status !== undefined) updates.status = body.status;
    const updated = await ContractRenewal.findByIdAndUpdate(id, updates, { new: true })
      .populate({ path: 'contract_id', populate: { path: 'employee_id', select: 'name email' } })
      .populate('requested_by', 'name')
      .populate('approved_by', 'name');
    return Response.json({ message: 'Contract renewal updated successfully', contractRenewal: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating contract renewal');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await ContractRenewal.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    if (item.status === 'Processed') {
      return Response.json({ message: 'Cannot delete processed renewal' }, { status: 400 });
    }
    await ContractRenewal.findByIdAndDelete(id);
    return Response.json({ message: 'Contract renewal deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting contract renewal');
  }
}