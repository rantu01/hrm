import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import Branch from '@/lib/models/Branch';
import Department from '@/lib/models/Department';
import Attendance from '@/lib/models/Attendance';
import Leave from '@/lib/models/Leave';
import Payroll from '@/lib/models/Payroll';
import { requireAuth, handleApiError } from '@/lib/auth';

// All routes require authentication

// @route   GET /api/dashboard
// @desc    Get dashboard stats and data
// @access  Private
export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();

    // Employee stats
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'inactive' });
    const terminatedEmployees = await Employee.countDocuments({ status: 'terminated' });

    // Branch & Department stats
    const totalBranches = await Branch.countDocuments();
    const totalDepartments = await Department.countDocuments();

    // Attendance stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present',
    });
    const absentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'absent',
    });
    const lateToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'late',
    });

    // Leave stats
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const approvedLeaves = await Leave.countDocuments({ status: 'approved' });

    // Payroll stats
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const processedPayrolls = await Payroll.countDocuments({
      month: currentMonth,
      year: currentYear,
      status: { $in: ['processed', 'paid'] },
    });

    // Recent employees
    const recentEmployees = await Employee.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email avatar');

    // Upcoming leaves (approved, future start dates)
    const upcomingLeaves = await Leave.find({
      status: 'approved',
      startDate: { $gte: new Date() },
    })
      .populate('employee', 'name email designation')
      .sort({ startDate: 1 })
      .limit(5);

    return Response.json(
      {
        stats: {
          employees: {
            total: totalEmployees,
            active: activeEmployees,
            inactive: inactiveEmployees,
            terminated: terminatedEmployees,
          },
          branches: {
            total: totalBranches,
          },
          departments: {
            total: totalDepartments,
          },
          attendance: {
            today: todayAttendance,
            present: presentToday,
            absent: absentToday,
            late: lateToday,
          },
          leaves: {
            pending: pendingLeaves,
            approved: approvedLeaves,
          },
          payroll: {
            processedThisMonth: processedPayrolls,
          },
        },
        recentEmployees,
        upcomingLeaves,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Dashboard error:', error);
    return handleApiError(error, 'Server error fetching dashboard data');
  }
}
