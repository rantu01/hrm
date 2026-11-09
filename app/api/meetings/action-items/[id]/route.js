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
  badRequest,
  notFound,
} from '@/lib/recruitment-server';

const POPULATE = [
  { path: 'meeting_id', select: 'title meeting_date' },
  { path: 'assigned_to', select: 'name email' },
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

export async function GET(request, { params }) {
  try {
    await authorize(request, 'view-action-items');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid id');
    await connectDB();
    const item = await ActionItem.findById(id).populate(POPULATE).lean();
    if (!item) return notFound('Action item not found');
    return Response.json({ actionItem: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching action item');
  }
}

export async function PUT(request, { params }) {
  try {
    await authorize(request, 'edit-action-items');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid id');
    const body = await parseBody(request);
    await connectDB();
    const item = await ActionItem.findById(id);
    if (!item) return notFound('Action item not found');

    if (body.title !== undefined) {
      const t = String(body.title).trim();
      if (!t) return badRequest('Title is required');
      item.title = t;
    }
    if (body.description !== undefined) item.description = body.description ? String(body.description).trim() : null;
    if (body.meeting_id !== undefined) {
      const oid = toObjectIdOrNull(body.meeting_id);
      if (!oid) return badRequest('Meeting is required');
      item.meeting_id = oid;
    }
    if (body.assigned_to !== undefined) {
      const oid = toObjectIdOrNull(body.assigned_to);
      if (!oid) return badRequest('Assignee is required');
      item.assigned_to = oid;
    }
    if (body.due_date !== undefined) {
      const d = new Date(body.due_date);
      if (Number.isNaN(d.getTime())) return badRequest('Due date is required');
      item.due_date = d;
    }
    if (body.priority !== undefined && PRIORITIES.includes(body.priority)) item.priority = body.priority;
    if (body.status !== undefined && STATUSES.includes(body.status)) {
      item.status = body.status;
      if (body.status === 'Completed' && !item.completed_date) item.completed_date = new Date();
    }
    if (body.progress_percentage !== undefined) {
      const p = Number(body.progress_percentage);
      if (Number.isFinite(p)) item.progress_percentage = Math.max(0, Math.min(100, p));
    }
    if (body.notes !== undefined) item.notes = body.notes ? String(body.notes).trim() : null;
    if (body.completed_date !== undefined) item.completed_date = body.completed_date ? new Date(body.completed_date) : null;

    await item.save();
    const populated = await ActionItem.findById(item._id).populate(POPULATE).lean();
    return Response.json({ message: 'Action item updated successfully', actionItem: populated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating action item');
  }
}

export async function DELETE(request, { params }) {
  try {
    await authorize(request, 'delete-action-items');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid id');
    await connectDB();
    const item = await ActionItem.findById(id).lean();
    if (!item) return notFound('Action item not found');
    await ActionItem.findByIdAndDelete(id);
    return Response.json({ message: 'Action item deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting action item');
  }
}
