import connectDB from '@/lib/db';
import ActionItem from '@/lib/models/ActionItem';
import Meeting from '@/lib/models/Meeting';
import User from '@/lib/models/User';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError } from '@/lib/auth';
import { parseJsonBody as parseBody } from '@/lib/validation';
import {
  toObjectIdOrNull,
  isValidId,
  escapeRegex,
  getPagination,
  paginationPayload,
  getSort,
  badRequest,
  notFound,
} from '@/lib/recruitment-server';

const POPULATE = [
  { path: 'meeting_id', select: 'title meeting_date' },
  { path: 'assigned_to', select: 'name email' },
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

export async function GET(request) {
  try {
    await authorize(request, 'view-action-items');
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = [{ title: rx }, { description: rx }];
    }
    const meetingId = sp.get('meeting_id');
    if (meetingId) {
      const oid = toObjectIdOrNull(meetingId);
      if (!oid) return badRequest('Invalid meeting_id');
      filter.meeting_id = oid;
    }
    const assignedTo = sp.get('assigned_to');
    if (assignedTo) {
      const oid = toObjectIdOrNull(assignedTo);
      if (!oid) return badRequest('Invalid assigned_to');
      filter.assigned_to = oid;
    }
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!STATUSES.includes(status)) return badRequest('Invalid status');
      filter.status = status;
    }
    const priority = sp.get('priority');
    if (priority && priority !== 'all') {
      if (!PRIORITIES.includes(priority)) return badRequest('Invalid priority');
      filter.priority = priority;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      title: 'title',
      due_date: 'due_date',
      priority: 'priority',
      status: 'status',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [items, total] = await Promise.all([
      ActionItem.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      ActionItem.countDocuments(filter),
    ]);
    return Response.json({ actionItems: items, pagination: paginationPayload(page, limit, total) }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching action items');
  }
}

export async function POST(request) {
  try {
    const user = await authorize(request, 'create-action-items');
    const body = await parseBody(request);
    const title = String(body.title || '').trim();
    if (!title) return badRequest('Title is required');
    const meeting_id = toObjectIdOrNull(body.meeting_id);
    if (!meeting_id) return badRequest('Meeting is required');
    const assigned_to = toObjectIdOrNull(body.assigned_to);
    if (!assigned_to) return badRequest('Assignee is required');
    const due_date = body.due_date ? new Date(body.due_date) : null;
    if (!due_date || Number.isNaN(due_date.getTime())) return badRequest('Due date is required');

    await connectDB();
    const meeting = await Meeting.findById(meeting_id).lean();
    if (!meeting) return badRequest('Meeting not found');
    const assignee = await User.findById(assigned_to).lean();
    if (!assignee) return badRequest('Assignee not found');

    const item = await ActionItem.create({
      meeting_id,
      title,
      description: body.description ? String(body.description).trim() : null,
      assigned_to,
      due_date,
      priority: PRIORITIES.includes(body.priority) ? body.priority : 'Medium',
      status: STATUSES.includes(body.status) ? body.status : 'Not Started',
      progress_percentage: Number.isFinite(Number(body.progress_percentage)) ? Number(body.progress_percentage) : 0,
      notes: body.notes ? String(body.notes).trim() : null,
      completed_date: body.completed_date ? new Date(body.completed_date) : null,
      created_by: user._id,
    });
    const populated = await ActionItem.findById(item._id).populate(POPULATE).lean();
    return Response.json({ message: 'Action item created successfully', actionItem: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating action item');
  }
}
