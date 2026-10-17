import connectDB from '@/lib/db';
import EmployeeReview from '@/lib/models/EmployeeReview';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

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
    const reviewerId = sp.get('reviewer_id');
    const reviewCycleId = sp.get('review_cycle_id');
    const sortField = sp.get('sort_field') === 'review_date' ? 'review_date' : 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const filter = {};
    if (employeeId) filter.employee_id = employeeId;
    if (reviewerId) filter.reviewer_id = reviewerId;
    if (reviewCycleId) filter.review_cycle_id = reviewCycleId;
    if (search) filter.comments = { $regex: search, $options: 'i' };

    const baseFilter = { ...filter };
    if (status && status !== 'all') filter.status = status;

    const [reviews, total, counts] = await Promise.all([
      EmployeeReview.find(filter)
        .populate('employee_id', 'name email')
        .populate('reviewer_id', 'name email')
        .populate('review_cycle_id', 'name frequency')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      EmployeeReview.countDocuments(filter),
      EmployeeReview.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { all: 0, pending: 0, in_progress: 0, completed: 0 };
    for (const c of counts) {
      if (c._id in statusCounts) statusCounts[c._id] = c.count;
      statusCounts.all += c.count;
    }

    return Response.json(
      {
        reviews,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching employee reviews');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'employee_id', required: true, messages: { required: 'Employee is required' } },
      { field: 'reviewer_id', required: true, messages: { required: 'Reviewer is required' } },
      { field: 'review_cycle_id', required: true, messages: { required: 'Review cycle is required' } },
      { field: 'review_date', optional: true, isISO8601: true, messages: { isISO8601: 'Review date must be a valid date' } },
      { field: 'completion_date', optional: true, isISO8601: true, messages: { isISO8601: 'Completion date must be a valid date' } },
      { field: 'comments', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['pending', 'in_progress', 'completed'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const review = await EmployeeReview.create({
      employee_id: data.employee_id,
      reviewer_id: data.reviewer_id,
      review_cycle_id: data.review_cycle_id,
      review_date: data.review_date ?? null,
      completion_date: data.completion_date ?? null,
      comments: data.comments ?? null,
      status: data.status ?? 'pending',
    });
    return Response.json({ message: 'Employee review created successfully', review }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating employee review');
  }
}
