import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import EmployeeDocument from '@/lib/models/EmployeeDocument';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// All routes require authentication

const EMPLOYEE_RULES = [
  { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
  { field: 'email', required: true, isEmail: true, normalizeEmail: true, messages: { required: 'Email is required', isEmail: 'Please provide a valid email' } },
  { field: 'phone', required: true, trim: true, messages: { required: 'Phone is required' } },
  { field: 'date_of_birth', required: true, isISO8601: true, messages: { required: 'Date of birth is required', isISO8601: 'Date of birth must be a valid date' } },
  { field: 'gender', required: true, isIn: ['male', 'female', 'other'], messages: { required: 'Gender is required' } },
  { field: 'branch_id', required: true, messages: { required: 'Branch is required' } },
  { field: 'department_id', required: true, messages: { required: 'Department is required' } },
  { field: 'designation_id', required: true, messages: { required: 'Designation is required' } },
  { field: 'date_of_joining', required: true, isISO8601: true, messages: { required: 'Date of joining is required', isISO8601: 'Date of joining must be a valid date' } },
  { field: 'employment_type', required: true, isIn: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'], messages: { required: 'Employment type is required' } },
  { field: 'employee_status', required: true, isIn: ['active', 'inactive', 'probation', 'terminated'], messages: { required: 'Employee status is required' } },
  { field: 'address_line_1', required: true, trim: true, messages: { required: 'Address is required' } },
  { field: 'city', required: true, trim: true, messages: { required: 'City is required' } },
  { field: 'state', required: true, trim: true, messages: { required: 'State is required' } },
  { field: 'country', required: true, trim: true, messages: { required: 'Country is required' } },
  { field: 'postal_code', required: true, trim: true, messages: { required: 'Postal code is required' } },
  { field: 'emergency_contact_name', required: true, trim: true, messages: { required: 'Emergency contact name is required' } },
  { field: 'emergency_contact_relationship', required: true, trim: true, messages: { required: 'Emergency contact relationship is required' } },
  { field: 'emergency_contact_number', required: true, trim: true, messages: { required: 'Emergency contact number is required' } },
  { field: 'bank_name', required: true, trim: true, messages: { required: 'Bank name is required' } },
  { field: 'password', optional: true, minLength: 8, messages: { minLength: 'Password must be at least 8 characters' } },
  { field: 'biometric_emp_id', optional: true, trim: true },
  { field: 'address_line_2', optional: true, trim: true },
  { field: 'account_holder_name', optional: true, trim: true },
  { field: 'account_number', optional: true, trim: true },
  { field: 'bank_identifier_code', optional: true, trim: true },
  { field: 'bank_branch', optional: true, trim: true },
  { field: 'tax_payer_id', optional: true, trim: true },
  { field: 'base_salary', optional: true, isNumeric: true, messages: { isNumeric: 'Base salary must be a number' } },
  { field: 'profile_image', optional: true, trim: true },
];

// Drop empty-string values so optional ObjectId/date/number fields don't fail Mongoose casting.
function sanitize(data) {
  const out = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === '' || value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

// @route   GET /api/employees
// @desc    List employees with search, filters, status counts, sorting and pagination
// @access  Private
export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page'), 10) || 1;
    const limit = parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    const search = sp.get('search');
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const branchId = sp.get('branch_id') || sp.get('branch');
    const departmentId = sp.get('department_id') || sp.get('department');
    const designationId = sp.get('designation_id') || sp.get('designation');
    if (branchId) filter.branch_id = branchId;
    if (departmentId) filter.department_id = departmentId;
    if (designationId) filter.designation_id = designationId;
    const status = sp.get('status');
    if (status) filter.employee_status = status;

    const rawSort = sp.get('sort') || sp.get('sort_field') || 'created_at';
    const sortField = rawSort === 'created_at' ? 'createdAt' : rawSort === 'name' ? 'name' : 'createdAt';
    const rawDir = sp.get('order') || sp.get('sort_direction') || 'desc';
    const sortDir = rawDir === 'asc' ? 1 : -1;

    const [employees, total, counts] = await Promise.all([
      Employee.find(filter)
        .populate('branch_id', 'name')
        .populate('department_id', 'name')
        .populate('designation_id', 'name')
        .populate('user', 'name email status')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      Employee.countDocuments(filter),
      Employee.aggregate([
        { $group: { _id: '$employee_status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { all: 0, active: 0, inactive: 0, probation: 0, terminated: 0 };
    for (const row of counts) {
      if (row._id && row._id in statusCounts) statusCounts[row._id] = row.count;
      statusCounts.all += row.count;
    }

    return Response.json(
      {
        employees,
        statusCounts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get employees error:', error);
    return handleApiError(error, 'Server error fetching employees');
  }
}

// @route   POST /api/employees
// @desc    Create new employee (auto employee_id, optional login User, optional documents)
// @access  Private
export async function POST(request) {
  try {
    await requireAuth(request);

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, EMPLOYEE_RULES);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const existingEmployee = await Employee.findOne({ email: data.email });
    if (existingEmployee) {
      return Response.json({ message: 'Employee already exists with this email' }, { status: 400 });
    }

    // Auto-generate a unique employee_id (EMP + 6 digits)
    let employee_id = await Employee.generateEmployeeId();
    let guard = 0;
    while (await Employee.findOne({ employee_id }).select('_id').lean()) {
      guard += 1;
      if (guard > 10) {
        return Response.json({ message: 'Could not generate a unique employee ID, please retry' }, { status: 500 });
      }
      const n = parseInt(employee_id.replace(/^EMP/, ''), 10) || 0;
      employee_id = `EMP${String(n + 1).padStart(6, '0')}`;
    }

    // Optional login account
    let userId;
    if (data.password) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return Response.json({ message: 'A login account already exists with this email' }, { status: 400 });
      }
      const user = new User({
        name: data.name,
        email: data.email,
        password: data.password,
        type: 'employee',
        role: 'employee',
      });
      await user.save();
      userId = user._id;
    }

    const payload = sanitize(data);
    delete payload.password;
    delete payload.documents;
    payload.employee_id = employee_id;
    if (userId) payload.user = userId;

    const employee = await Employee.create(payload);

    // Optional document metadata rows
    let documents = [];
    if (Array.isArray(body.documents) && body.documents.length > 0) {
      const rows = body.documents
        .filter((d) => d && d.document_type)
        .map((d) => ({
          employee_id: employee._id,
          document_type: String(d.document_type).trim(),
          file: d.file ? String(d.file).trim() : null,
          expiry_date: d.expiry_date || null,
        }));
      if (rows.length > 0) {
        documents = await EmployeeDocument.insertMany(rows);
      }
    }

    const populated = await Employee.findById(employee._id)
      .populate('branch_id', 'name')
      .populate('department_id', 'name')
      .populate('designation_id', 'name')
      .populate('user', 'name email status');

    return Response.json(
      {
        message: 'Employee created successfully',
        employee: populated,
        documents,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Create employee error:', error);
    if (error.code === 11000) {
      return Response.json({ message: 'Employee already exists (duplicate value)' }, { status: 400 });
    }
    return handleApiError(error, 'Server error creating employee');
  }
}
