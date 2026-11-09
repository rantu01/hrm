import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import MeetingType from '@/lib/models/MeetingType';
import Holiday from '@/lib/models/Holiday';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError } from '@/lib/auth';

export async function GET(request) {
  try {
    await authorize(request, 'view-calendar');
    await connectDB();

    const year = new Date().getFullYear();
    const events = [];

    // Meetings
    const meetings = await Meeting.find({})
      .populate('type_id', 'name color')
      .populate('organizer_id', 'name')
      .lean();
    for (const m of meetings) {
      const date = m.meeting_date ? new Date(m.meeting_date) : null;
      if (!date) continue;
      const isoDate = date.toISOString().slice(0, 10);
      events.push({
        id: `meeting_${m._id}`,
        title: m.title,
        start: `${isoDate}T${m.start_time || '00:00'}:00`,
        end: `${isoDate}T${m.end_time || '00:00'}:00`,
        type: 'meeting',
        status: m.status,
        backgroundColor: '#eff6ff',
        borderColor: 'rgba(37, 99, 235, 0.2)',
        textColor: '#1d4ed8',
      });
    }

    // Holidays
    const holidays = await Holiday.find({}).lean();
    for (const h of holidays) {
      const start = h.start_date ? new Date(h.start_date).toISOString().slice(0, 10) : null;
      if (!start) continue;
      const end = h.end_date ? new Date(h.end_date).toISOString().slice(0, 10) : start;
      events.push({
        id: `holiday_${h._id}`,
        title: h.name,
        start,
        end,
        type: 'holiday',
        allDay: true,
        backgroundColor: '#f0fdf4',
        borderColor: 'rgba(22, 163, 74, 0.2)',
        textColor: '#15803d',
      });
    }

    // Approved leaves
    const leaves = await Leave.find({ status: 'approved' })
      .populate({ path: 'employee', select: 'name user' })
      .populate('leaveType', 'name')
      .lean();
    for (const l of leaves) {
      const start = l.startDate ? new Date(l.startDate).toISOString().slice(0, 10) : null;
      if (!start) continue;
      const end = l.endDate ? new Date(l.endDate) : new Date(l.startDate);
      // FullCalendar end is exclusive for all-day; add one day
      end.setDate(end.getDate() + 1);
      const empName = l.employee?.name || 'Employee';
      const typeName = l.leaveType?.name || l.type || 'Leave';
      // avatar
      let avatar = null;
      if (l.employee?.user) {
        const u = await User.findById(l.employee.user).select('avatar').lean();
        avatar = u?.avatar || null;
      }
      events.push({
        id: `leave_${l._id}`,
        title: `${empName} - ${typeName}`,
        start,
        end: end.toISOString().slice(0, 10),
        type: 'leave',
        allDay: true,
        avatar,
        backgroundColor: '#fefce8',
        borderColor: 'rgba(202, 138, 4, 0.2)',
        textColor: '#a16207',
      });
    }

    // Birthdays
    const employees = await Employee.find({ date_of_birth: { $ne: null } })
      .populate('user', 'name avatar')
      .lean();
    for (const e of employees) {
      if (!e.date_of_birth) continue;
      const dob = new Date(e.date_of_birth);
      const start = new Date(year, dob.getMonth(), dob.getDate()).toISOString().slice(0, 10);
      const name = e.user?.name || e.name || 'Employee';
      events.push({
        id: `birthday_${e._id}`,
        title: `${name}'s Birthday`,
        start,
        end: start,
        type: 'birthday',
        allDay: true,
        avatar: e.user?.avatar || null,
        backgroundColor: '#fdf2f8',
        borderColor: 'rgba(219, 39, 119, 0.2)',
        textColor: '#be185d',
      });
    }

    return Response.json({ events }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching calendar events');
  }
}
