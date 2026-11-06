import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import EmployeeSalary from '@/lib/models/EmployeeSalary';
import SalaryComponent from '@/lib/models/SalaryComponent';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';
import { parseJsonBody } from '@/lib/validation';

const EMPLOYEE_FIELDS =
  'name employee_id email base_salary profile_image branch_id department_id designation_id employee_status';

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === 'active' || value === '1') return true;
  if (value === false || value === 'false' || value === 'inactive' || value === '0') return false;
  return undefined;
}

export async function GET(request) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewEmployeeSalaries) {
      return Response.json(
        { message: 'You do not have permission to view employee salaries' },
        { status: 403 }
      );
    }
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
    const perPage = Math.max(
      1,
      parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10
    );
    const skip = (page - 1) * perPage;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const employees = await Employee.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { employee_id: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();
      filter.employee = { $in: employees.map((employee) => employee._id) };
    }

    const employeeId = sp.get('employee_id') || sp.get('employee');
    if (employeeId && employeeId !== 'all' && employeeId !== '_empty_') {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return Response.json({ message: 'Employee filter is invalid' }, { status: 400 });
      }
      filter.employee = employeeId;
    }

    const isActive = parseBoolean(sp.get('is_active') ?? sp.get('status'));
    const baseFilter = { ...filter };
    if (isActive !== undefined) filter.isActive = isActive;

    const sortField = sp.get('sort_field') === 'basic_salary' ? 'basicSalary' : 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [salaries, total, allCount, activeCount, inactiveCount] =
      await Promise.all([
        EmployeeSalary.find(filter)
          .populate('employee', EMPLOYEE_FIELDS)
          .populate('components', 'name type calculationType defaultAmount percentageOfBasic status')
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(perPage)
          .lean(),
        EmployeeSalary.countDocuments(filter),
        EmployeeSalary.countDocuments(baseFilter),
        EmployeeSalary.countDocuments({ ...baseFilter, isActive: true }),
        EmployeeSalary.countDocuments({ ...baseFilter, isActive: false }),
      ]);

    const [employees, components] = await Promise.all([
      Employee.find({ employee_status: { $in: ['active', 'probation'] } })
        .select('name employee_id base_salary')
        .sort({ name: 1 })
        .lean(),
      SalaryComponent.find({})
        .select('name type calculationType defaultAmount percentageOfBasic status')
        .sort({ type: 1, name: 1 })
        .lean(),
    ]);

    return Response.json({
      salaries,
      pagination: {
        page,
        limit: perPage,
        total,
        pages: Math.ceil(total / perPage) || 1,
      },
      statusCounts: {
        all: allCount,
        active: activeCount,
        inactive: inactiveCount,
      },
      employees,
      components,
      access,
    });
  } catch (error) {
    return handleApiError(error, 'Server error fetching employee salaries');
  }
}

export async function POST(request) {
  try {
    const user = await requirePayrollPermission(request, 'createEmployeeSalaries');
    await connectDB();
    const body = await parseJsonBody(request);

    const employeeId = String(body.employee || body.employee_id || '');
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return Response.json({ message: 'A valid employee is required' }, { status: 400 });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    const basicSalary = Number(body.basicSalary ?? body.basic_salary);
    if (!Number.isFinite(basicSalary) || basicSalary < 0) {
      return Response.json(
        { message: 'Basic salary must be a non-negative number' },
        { status: 400 }
      );
    }

    const existing = await EmployeeSalary.findOne({ employee: employee._id });
    if (existing) {
      return Response.json(
        {
          message:
            'This employee already has a salary record. Please update the existing record.',
        },
        { status: 409 }
      );
    }

    const componentIds = Array.isArray(body.components) ? body.components : [];
    for (const componentId of componentIds) {
      if (!mongoose.Types.ObjectId.isValid(componentId)) {
        return Response.json({ message: 'Invalid salary component selected' }, { status: 400 });
      }
    }

    const salary = await EmployeeSalary.create({
      employee: employee._id,
      basicSalary,
      components: componentIds,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      calculationStatus: basicSalary > 0 ? 'calculated' : 'pending',
      notes: body.notes ? String(body.notes).trim() : null,
      createdBy: user._id,
      updatedBy: user._id,
    });

    // Keep the employee record in sync with the salary structure, including
    // an intentional zero so stale base salaries are never used.
    if (Number(employee.base_salary) !== basicSalary) {
      employee.base_salary = basicSalary;
      await employee.save();
    }

    const populated = await EmployeeSalary.findById(salary._id)
      .populate('employee', EMPLOYEE_FIELDS)
      .populate('components', 'name type calculationType defaultAmount percentageOfBasic status')
      .lean();

    return Response.json(
      { message: 'Employee salary created successfully', salary: populated },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { message: 'This employee already has a salary record.' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'Server error creating employee salary');
  }
}
