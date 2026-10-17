import connectDB from '@/lib/db';
import EmployeeGoal from '@/lib/models/EmployeeGoal';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { title: 'title', start_date: 'start_date', created_at: 'createdAt' };

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page'), 10) || 1;
    const limit = parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10;
    const skip = (page - 1) * limit;
    const search = (sp.get('search') || '').trim();
    const status = sp.get('status');
    const employeeId = sp.get('employee_id');
    const goalTypeId = sp.get('goal_type_id');
    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { target: { $regex: search, $options: 'i' } },
      ];
    }
    if (employeeId) filter.employee_id = employeeId;
    if (goalTypeId) filter.goal_type_id = goalTypeId;

    const baseFilter = { ...filter };
    if (status && status !== 'all') filter.status = status;

    const [employeeGoals, total, counts] = await Promise.all([
      EmployeeGoal.find(filter)
        .populate('employee_id', 'name email')
        .populate('goal_type_id', 'name')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      EmployeeGoal.countDocuments(filter),
      EmployeeGoal.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { all: 0, not_started: 0, in_progress: 0, completed: 0 };
    for (const c of counts) {
      if (c._id in statusCounts) statusCounts[c._id] = c.count;
      statusCounts.all += c.count;
    }

    return Response.json(
      {
        employeeGoals,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching employee goals');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'title', required: true, trim: true, messages: { required: 'Goal title is required' } },
      { field: 'employee_id', required: true, messages: { required: 'Employee is required' } },
      { field: 'goal_type_id', required: true, messages: { required: 'Goal type is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'start_date', required: true, isISO8601: true, messages: { required: 'Start date is required', isISO8601: 'Start date must be a valid date' } },
      { field: 'end_date', required: true, isISO8601: true, messages: { required: 'End date is required', isISO8601: 'End date must be a valid date' } },
      { field: 'target', optional: true, trim: true },
      { field: 'progress', optional: true, isNumeric: true, messages: { isNumeric: 'Progress must be a number' } },
      { field: 'status', optional: true, isIn: ['not_started', 'in_progress', 'completed'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    if (new Date(data.end_date) < new Date(data.start_date)) {
      return Response.json({ message: 'End date must be after or equal to start date' }, { status: 400 });
    }

    await connectDB();
    const employeeGoal = await EmployeeGoal.create({
      title: data.title,
      employee_id: data.employee_id,
      goal_type_id: data.goal_type_id,
      description: data.description ?? null,
      start_date: data.start_date,
      end_date: data.end_date,
      target: data.target ?? null,
      progress: data.progress !== undefined ? Number(data.progress) : 0,
      status: data.status ?? 'not_started',
    });
    return Response.json({ message: 'Employee goal created successfully', employeeGoal }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating employee goal');
  }
}
