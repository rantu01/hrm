import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import SalaryComponent from '@/lib/models/SalaryComponent';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';
import { parseJsonBody } from '@/lib/validation';

const TYPES = ['earning', 'deduction'];
const CALCULATION_TYPES = ['fixed', 'percentage'];
const STATUSES = ['active', 'inactive'];

function normalise(payload) {
  const calculationType = CALCULATION_TYPES.includes(payload.calculationType)
    ? payload.calculationType
    : 'fixed';
  return {
    name: String(payload.name || '').trim(),
    description: payload.description ? String(payload.description).trim() : null,
    type: TYPES.includes(payload.type) ? payload.type : 'earning',
    calculationType,
    defaultAmount: calculationType === 'fixed' ? Math.max(0, Number(payload.defaultAmount) || 0) : 0,
    percentageOfBasic:
      calculationType === 'percentage'
        ? Math.min(100, Math.max(0, Number(payload.percentageOfBasic) || 0))
        : null,
    isTaxable: payload.isTaxable === undefined ? true : Boolean(payload.isTaxable),
    isMandatory: Boolean(payload.isMandatory),
    status: STATUSES.includes(payload.status) ? payload.status : 'active',
  };
}

export async function GET(request, { params }) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewComponents) {
      return Response.json(
        { message: 'You do not have permission to view salary components' },
        { status: 403 }
      );
    }
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    const component = await SalaryComponent.findById(id).lean();
    if (!component) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    return Response.json({ component, access });
  } catch (error) {
    return handleApiError(error, 'Server error fetching salary component');
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requirePayrollPermission(request, 'editComponents');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    const component = await SalaryComponent.findById(id);
    if (!component) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }

    const body = await parseJsonBody(request);
    const data = normalise({ ...component.toObject(), ...body });
    if (!data.name) {
      return Response.json({ message: 'Component name is required' }, { status: 400 });
    }
    if (data.name.length > 255) {
      return Response.json(
        { message: 'Name cannot exceed 255 characters' },
        { status: 400 }
      );
    }

    Object.assign(component, data, { updatedBy: user._id });
    await component.save();

    return Response.json({
      message: 'Salary component updated successfully',
      component,
    });
  } catch (error) {
    return handleApiError(error, 'Server error updating salary component');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requirePayrollPermission(request, 'deleteComponents');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    const component = await SalaryComponent.findByIdAndDelete(id);
    if (!component) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    return Response.json({ message: 'Salary component deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'Server error deleting salary component');
  }
}
