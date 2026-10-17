import connectDB from '@/lib/db';
import Announcement from '@/lib/models/Announcement';
import AnnouncementView from '@/lib/models/AnnouncementView';
import Employee from '@/lib/models/Employee';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   GET /api/announcements/:id/statistics
// @desc    View statistics for an announcement
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;

    const announcement = await Announcement.findById(id)
      .populate('branch_ids', 'name')
      .populate('department_ids', 'name');
    if (!announcement) {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }

    const [views, totalEmployees] = await Promise.all([
      AnnouncementView.find({ announcement_id: id }).populate({
        path: 'employee_id',
        select: 'name branch_id department_id',
        populate: [
          { path: 'branch_id', select: 'name' },
          { path: 'department_id', select: 'name' },
        ],
      }),
      Employee.countDocuments({}),
    ]);

    const viewCount = views.length;
    const viewPercentage = totalEmployees > 0 ? Math.round((viewCount / totalEmployees) * 100) : 0;

    // Employee branch/department are populated refs; fall back to 'Unknown'.
    const branchMap = new Map();
    const deptMap = new Map();
    for (const v of views) {
      const emp = v.employee_id;
      const b = emp && typeof emp === 'object' && emp.branch_id && typeof emp.branch_id === 'object' ? emp.branch_id.name || 'Unknown' : 'Unknown';
      const d = emp && typeof emp === 'object' && emp.department_id && typeof emp.department_id === 'object' ? emp.department_id.name || 'Unknown' : 'Unknown';
      branchMap.set(b, (branchMap.get(b) || 0) + 1);
      deptMap.set(d, (deptMap.get(d) || 0) + 1);
    }

    const byBranch = [...branchMap.entries()].map(([name, viewCount]) => ({ name, views: viewCount }));
    const byDepartment = [...deptMap.entries()].map(([name, viewCount]) => ({ name, views: viewCount }));

    return Response.json(
      { viewCount, totalEmployees, viewPercentage, byBranch, byDepartment },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching announcement statistics');
  }
}
