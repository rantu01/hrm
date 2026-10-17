import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import EmployeeDocument from '@/lib/models/EmployeeDocument';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// All routes require authentication

function sanitize(data) {
  const out = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === '' || value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

function populateEmployee(query) {
  return query
    .populate('branch_id', 'name')
    .populate('department_id', 'name')
    .populate('designation_id', 'name')
    .populate('user', 'name email status');
}

// @route   GET /api/employees/:id
// @desc    Get single employee by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employee = await populateEmployee(Employee.findById(id));

    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    const documents = await EmployeeDocument.find({ employee_id: employee._id }).sort({ createdAt: -1 });

    return Response.json({ employee, documents }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get employee error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching employee');
  }
}

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'email', optional: true, isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'phone', optional: true, trim: true },
      { field: 'date_of_birth', optional: true, isISO8601: true, messages: { isISO8601: 'Date of birth must be a valid date' } },
      { field: 'gender', optional: true, isIn: ['male', 'female', 'other'] },
      { field: 'branch_id', optional: true },
      { field: 'department_id', optional: true },
      { field: 'designation_id', optional: true },
      { field: 'date_of_joining', optional: true, isISO8601: true, messages: { isISO8601: 'Date of joining must be a valid date' } },
      { field: 'employment_type', optional: true, isIn: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'] },
      { field: 'employee_status', optional: true, isIn: ['active', 'inactive', 'probation', 'terminated'] },
      { field: 'address_line_1', optional: true, trim: true },
      { field: 'address_line_2', optional: true, trim: true },
      { field: 'city', optional: true, trim: true },
      { field: 'state', optional: true, trim: true },
      { field: 'country', optional: true, trim: true },
      { field: 'postal_code', optional: true, trim: true },
      { field: 'emergency_contact_name', optional: true, trim: true },
      { field: 'emergency_contact_relationship', optional: true, trim: true },
      { field: 'emergency_contact_number', optional: true, trim: true },
      { field: 'bank_name', optional: true, trim: true },
      { field: 'account_holder_name', optional: true, trim: true },
      { field: 'account_number', optional: true, trim: true },
      { field: 'bank_identifier_code', optional: true, trim: true },
      { field: 'bank_branch', optional: true, trim: true },
      { field: 'tax_payer_id', optional: true, trim: true },
      { field: 'base_salary', optional: true, isNumeric: true, messages: { isNumeric: 'Base salary must be a number' } },
      { field: 'profile_image', optional: true, trim: true },
      { field: 'biometric_emp_id', optional: true, trim: true },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findById(id);
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    const payload = sanitize(data);
    delete payload.password;
    delete payload.documents;
    delete payload.employee_id;
    delete payload.user;

    // Unique checks ignoring self
    if (payload.email && payload.email !== employee.email) {
      const clash = await Employee.findOne({ email: payload.email, _id: { $ne: id } })
        .select('_id')
        .lean();
      if (clash) {
        return Response.json({ message: 'Email already in use' }, { status: 400 });
      }
    }
    if (payload.biometric_emp_id) {
      const clash = await Employee.findOne({ biometric_emp_id: payload.biometric_emp_id, _id: { $ne: id } })
        .select('_id')
        .lean();
      if (clash) {
        return Response.json({ message: 'Biometric employee ID already in use' }, { status: 400 });
      }
    }

    Object.assign(employee, payload);
    await employee.save();

    // Keep the linked login account's name/email in sync
    if (employee.user && (payload.name || payload.email)) {
      const linked = await User.findById(employee.user);
      if (linked) {
        if (payload.email && payload.email !== linked.email) {
          const userClash = await User.findOne({ email: payload.email, _id: { $ne: linked._id } })
            .select('_id')
            .lean();
          if (userClash) {
            return Response.json({ message: 'Email already in use by another login account' }, { status: 400 });
          }
          linked.email = payload.email;
        }
        if (payload.name) linked.name = payload.name;
        await linked.save();
      }
    }

    const updated = await populateEmployee(Employee.findById(id));

    return Response.json(
      {
        message: 'Employee updated successfully',
        employee: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Update employee error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Email already in use' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating employee');
  }
}

// @route   DELETE /api/employees/:id
// @desc    Delete employee (also deletes the linked employee-type login User and documents)
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employee = await Employee.findById(id);

    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    if (employee.user) {
      const linked = await User.findById(employee.user);
      if (linked && linked.type === 'employee') {
        await User.deleteOne({ _id: linked._id });
      }
    }

    await EmployeeDocument.deleteMany({ employee_id: employee._id });
    await Employee.deleteOne({ _id: employee._id });

    return Response.json({ message: 'Employee deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Delete employee error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting employee');
  }
}
