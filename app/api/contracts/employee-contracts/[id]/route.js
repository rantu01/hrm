import connectDB from '@/lib/db';
import EmployeeContract from '@/lib/models/EmployeeContract';
import ContractType from '@/lib/models/ContractType';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await EmployeeContract.findById(id)
      .populate('employee_id', 'name email avatar')
      .populate('contract_type_id', 'name')
      .populate('approved_by', 'name');
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    return Response.json({ employeeContract: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching employee contract');
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const item = await EmployeeContract.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });

    const updates = {};
    if (body.employee_id !== undefined) updates.employee_id = body.employee_id;
    if (body.contract_type_id !== undefined) updates.contract_type_id = body.contract_type_id;
    if (body.start_date !== undefined) updates.start_date = body.start_date;
    if (body.basic_salary !== undefined) updates.basic_salary = Number(body.basic_salary);
    if (body.terms_conditions !== undefined) updates.terms_conditions = body.terms_conditions || null;
    if (body.status !== undefined) updates.status = body.status;

    let endDate = body.end_date;
    if (endDate === undefined) {
      // keep
    } else if (endDate === '' || endDate === null) {
      const ctId = body.contract_type_id || item.contract_type_id;
      const ct = await ContractType.findById(ctId);
      if (ct && ct.default_duration_months) {
        const d = new Date(body.start_date || item.start_date);
        d.setMonth(d.getMonth() + ct.default_duration_months);
        endDate = d.toISOString();
      } else {
        endDate = null;
      }
    }
    if (endDate !== undefined) updates.end_date = endDate;

    if (body.benefits !== undefined) {
      updates.benefits = Array.isArray(body.benefits) ? body.benefits : (body.benefits ? [body.benefits] : []);
    }

    const updated = await EmployeeContract.findByIdAndUpdate(id, updates, { new: true })
      .populate('employee_id', 'name email avatar')
      .populate('contract_type_id', 'name')
      .populate('approved_by', 'name');
    return Response.json({ message: 'Employee contract updated successfully', employeeContract: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating employee contract');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await EmployeeContract.findById(id);
    if (!item) return Response.json({ message: 'Not found' }, { status: 404 });
    if (item.status === 'Active') {
      return Response.json({ message: 'Cannot delete active contract' }, { status: 400 });
    }
    await EmployeeContract.findByIdAndDelete(id);
    return Response.json({ message: 'Employee contract deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting employee contract');
  }
}