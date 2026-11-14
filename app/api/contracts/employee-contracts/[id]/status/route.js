import connectDB from '@/lib/db';
import EmployeeContract from '@/lib/models/EmployeeContract';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const item = await EmployeeContract.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    const status = body.status;
    if (!['Draft', 'Pending Approval', 'Active', 'Expired', 'Terminated', 'Renewed'].includes(status)) {
      return Response.json({ message: 'Invalid status' }, { status: 400 });
    }
    const updates = { status };
    if (status === 'Active') {
      updates.approved_by = (await requireAuth(request))._id;
      updates.approved_at = new Date();
    }
    const updated = await EmployeeContract.findByIdAndUpdate(id, updates, { new: true })
      .populate('employee_id', 'name email avatar')
      .populate('contract_type_id', 'name')
      .populate('approved_by', 'name');
    return Response.json({ message: 'Contract status updated successfully', employeeContract: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating status');
  }
}