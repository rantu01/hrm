import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// All routes require authentication

// @route   GET /api/employees
// @desc    List all employees with pagination
// @access  Private
export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page'), 10) || 1;
    const limit = parseInt(searchParams.get('limit'), 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter object from query params
    const filter = {};
    if (searchParams.get('status')) filter.status = searchParams.get('status');
    if (searchParams.get('department')) filter.department = searchParams.get('department');
    if (searchParams.get('branch')) filter.branch = searchParams.get('branch');
    if (searchParams.get('search')) {
      filter.$or = [
        { name: { $regex: searchParams.get('search'), $options: 'i' } },
        { email: { $regex: searchParams.get('search'), $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('user', 'name email avatar status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Employee.countDocuments(filter),
    ]);

    return Response.json(
      {
        employees,
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
// @desc    Create new employee
// @access  Private
export async function POST(request) {
  try {
    await requireAuth(request);

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
      { field: 'email', isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'phone', optional: true, trim: true },
      { field: 'designation', optional: true, trim: true },
      { field: 'department', optional: true, trim: true },
      { field: 'branch', optional: true, trim: true },
      { field: 'salary', optional: true, isNumeric: true, messages: { isNumeric: 'Salary must be a number' } },
      { field: 'joinDate', optional: true, isISO8601: true, messages: { isISO8601: 'Join date must be a valid date' } },
      { field: 'status', optional: true, isIn: ['active', 'inactive', 'terminated', 'on-leave'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    const { email } = data;

    await connectDB();

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return Response.json({ message: 'Employee already exists with this email' }, { status: 400 });
    }

    const employee = await Employee.create(data);

    return Response.json(
      {
        message: 'Employee created successfully',
        employee,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Create employee error:', error);
    return handleApiError(error, 'Server error creating employee');
  }
}
