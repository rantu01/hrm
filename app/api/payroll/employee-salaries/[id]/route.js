import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import EmployeeSalary from '@/lib/models/EmployeeSalary';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';
import { parseJsonBody } from '@/lib/validation';

const EMPLOYEE_FIELDS =
  'name employee_id email base_salary profile_image branch_id department_id designation_id employee_status';

export async function GET(request, { params }) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewEmployeeSalaries) {
      return Response.json(
        { message: 'You do not have permission to view employee salaries' },
        { status: 403 }
      );
    }
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    const salary = await EmployeeSalary.findById(id)
      .populate('employee', EMPLOYEE_FIELDS)
      .populate('components', 'name type calculationType defaultAmount percentageOfBasic status')
      .lean();
    if (!salary) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    return Response.json({ salary, access });
  } catch (error) {
    return handleApiError(error, 'Server error fetching employee salary');
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requirePayrollPermission(request, 'editEmployeeSalaries');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    const salary = await EmployeeSalary.findById(id);
    if (!salary) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }

    const body = await parseJsonBody(request);
    if (body.basicSalary !== undefined || body.basic_salary !== undefined) {
      const basicSalary = Number(body.basicSalary ?? body.basic_salary);
      if (!Number.isFinite(basicSalary) || basicSalary < 0) {
        return Response.json(
          { message: 'Basic salary must be a non-negative number' },
          { status: 400 }
        );
      }
      salary.basicSalary = basicSalary;
      salary.calculationStatus = basicSalary > 0 ? 'calculated' : 'pending';
    }

    if (body.components !== undefined) {
      if (!Array.isArray(body.components)) {
        return Response.json({ message: 'Components must be an array' }, { status: 400 });
      }
      for (const componentId of body.components) {
        if (!mongoose.Types.ObjectId.isValid(componentId)) {
          return Response.json({ message: 'Invalid salary component selected' }, { status: 400 });
        }
      }
      salary.components = body.components;
    }

    if (body.isActive !== undefined) salary.isActive = Boolean(body.isActive);
    if (body.notes !== undefined) {
      salary.notes = body.notes ? String(body.notes).trim() : null;
    }
    salary.updatedBy = user._id;
    await salary.save();

    const employee = await Employee.findById(salary.employee);
    if (employee && Number(employee.base_salary) !== salary.basicSalary) {
      employee.base_salary = salary.basicSalary;
      await employee.save();
    }

    const populated = await EmployeeSalary.findById(salary._id)
      .populate('employee', EMPLOYEE_FIELDS)
      .populate('components', 'name type calculationType defaultAmount percentageOfBasic status')
      .lean();

    return Response.json({
      message: 'Employee salary updated successfully',
      salary: populated,
    });
  } catch (error) {
    return handleApiError(error, 'Server error updating employee salary');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requirePayrollPermission(request, 'deleteEmployeeSalaries');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    const salary = await EmployeeSalary.findByIdAndDelete(id);
    if (!salary) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    return Response.json({ message: 'Employee salary deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'Server error deleting employee salary');
  }
}
