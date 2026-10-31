import mongoose from 'mongoose';
import Employee from '@/lib/models/Employee';
import Branch from '@/lib/models/Branch';
import Department from '@/lib/models/Department';
import Designation from '@/lib/models/Designation';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import LeaveBalance from '@/lib/models/LeaveBalance';
import LeaveNotification from '@/lib/models/LeaveNotification';
import Holiday from '@/lib/models/Holiday';
import Role from '@/lib/models/Role';
import User from '@/lib/models/User';
import { getUserPermissions } from '@/lib/auth';
import {
  calculateLeaveDays,
  roundDays,
  sumDaysForYear,
  toUtcDate,
} from '@/lib/leave-utils';

// These models must be registered before nested employee populations run.
export const LEAVE_POPULATE_MODELS = [Branch, Department, Designation];

const PRIVILEGED_TYPES = ['superadmin', 'admin'];
const PRIVILEGED_ROLES = ['superadmin', 'super admin', 'admin'];

function hasPrivilegedType(user) {
  return (
    PRIVILEGED_TYPES.includes(String(user?.type || '').toLowerCase()) ||
    PRIVILEGED_ROLES.includes(String(user?.role || '').toLowerCase())
  );
}

export async function ensureEmployeeProfiles() {
  const users = await User.find({})
    .select('_id name email status')
    .lean();
  const employees = [];

  for (const user of users) {
    let employee = await Employee.findOne({
      $or: [{ user: user._id }, { email: user.email }],
    });
    if (!employee) {
      employee = await Employee.findOneAndUpdate(
        { email: user.email },
        {
          $setOnInsert: {
            user: user._id,
            employee_id: await Employee.generateEmployeeId(),
            name: user.name,
            email: user.email,
            employee_status: user.status === 'active' ? 'active' : 'inactive',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else if (!employee.user || String(employee.user) !== String(user._id)) {
      employee.user = user._id;
      await employee.save();
    }
    if (employee) employees.push(employee);
  }

  return employees;
}

/**
 * Resolves every leave-related capability for the current user. `view-own`
 * style self service is always allowed for authenticated employees; broad
 * access requires an explicit administrative permission.
 */
export async function getLeaveAccess(user) {
  await ensureEmployeeProfiles();
  const permissions = await getUserPermissions(user);
  const privileged = hasPrivilegedType(user);
  const has = (permission) => privileged || permissions.includes(permission);

  const employee = await Employee.findOne({ user: user._id })
    .select('name email employee_id branch_id department_id designation_id employee_status')
    .lean();

  const canManageTypes = has('manage-leave-types');
  const canManageBalances = has('manage-leave-balances');
  const canApprove = has('approve-leave');
  const canManage = has('manage-leave');

  return {
    userId: String(user._id),
    userName: user.name || '',
    privileged,
    permissions,
    employee: employee || null,
    canViewAll: privileged || canManage || canApprove || canManageBalances || canManageTypes,
    canManage,
    canApprove,
    canManageTypes,
    canManageBalances,
    canEditLeave: has('edit-leave') || canManage,
    canDeleteLeave: has('delete-leave') || canManage,
  };
}

export async function getEmployeeForUser(userId) {
  return Employee.findOne({ user: userId });
}

export async function getHolidaysForEmployee(employee) {
  const holidays = await Holiday.find({}).lean();
  const branchId = employee?.branch_id ? String(employee.branch_id) : '';
  return holidays.filter((holiday) => {
    if (!holiday.branch_ids || holiday.branch_ids.length === 0) return true;
    if (!branchId) return false;
    return holiday.branch_ids.some((branch) => String(branch?._id || branch) === branchId);
  });
}

export async function calculateRequestDays({
  employee,
  leaveType,
  startDate,
  endDate,
  halfDay = false,
}) {
  const holidays = await getHolidaysForEmployee(employee);
  return calculateLeaveDays({
    startDate,
    endDate,
    halfDay,
    includeWeekends: Boolean(leaveType?.includeWeekends),
    holidays,
  });
}

function legacyDaysForYear(leave, year) {
  const stored = sumDaysForYear(leave.daysByYear, year);
  if (stored > 0) return stored;
  if (leave.daysByYear && Object.keys(leave.daysByYear).length > 0) return 0;
  const start = leave.startDate ? new Date(leave.startDate) : null;
  if (!start || Number.isNaN(start.getTime())) return 0;
  return Number(start.getUTCFullYear()) === Number(year)
    ? roundDays(Number(leave.totalDays) || 0)
    : 0;
}

export async function ensureLeaveBalance(employeeId, leaveTypeId, year, leaveType) {
  let balance = await LeaveBalance.findOne({
    employee: employeeId,
    leaveType: leaveTypeId,
    year,
  });

  if (!balance) {
    const type = leaveType || (await LeaveType.findById(leaveTypeId));
    try {
      balance = await LeaveBalance.create({
        employee: employeeId,
        leaveType: leaveTypeId,
        year,
        allocated: Number(type?.annualAllocation) || 0,
      });
    } catch (error) {
      if (error?.code === 11000) {
        balance = await LeaveBalance.findOne({
          employee: employeeId,
          leaveType: leaveTypeId,
          year,
        });
      } else {
        throw error;
      }
    }
  }

  return balance;
}

async function sumLeaveDays(employeeId, leaveTypeId, year, excludeLeaveId) {
  const query = {
    employee: employeeId,
    leaveType: leaveTypeId,
    status: { $in: ['pending', 'approved'] },
  };
  if (excludeLeaveId) query._id = { $ne: excludeLeaveId };

  const leaves = await Leave.find(query)
    .select('status totalDays daysByYear startDate')
    .lean();

  let used = 0;
  let pending = 0;
  for (const leave of leaves) {
    const days = legacyDaysForYear(leave, year);
    if (!days) continue;
    if (leave.status === 'approved') used += days;
    else if (leave.status === 'pending') pending += days;
  }
  return { used: roundDays(used), pending: roundDays(pending) };
}

/**
 * Live balance snapshot for a given employee/type/year. Derived values are
 * calculated from the actual leave records, so stale stored counters can never
 * cause an incorrect approval.
 */
export async function getBalanceSnapshot({
  employeeId,
  leaveTypeId,
  year,
  excludeLeaveId = null,
  leaveType = null,
}) {
  const balance = await LeaveBalance.findOne({
    employee: employeeId,
    leaveType: leaveTypeId,
    year,
  }).lean();
  const type = leaveType || (await LeaveType.findById(leaveTypeId).lean());

  const allocated = Number(balance?.allocated ?? type?.annualAllocation ?? 0);
  const carryForward = Number(balance?.carryForward) || 0;
  const adjustment = Number(balance?.adjustment) || 0;
  const { used, pending } = await sumLeaveDays(employeeId, leaveTypeId, year, excludeLeaveId);

  const available = roundDays(allocated + carryForward + adjustment - used - pending);
  return {
    _id: balance?._id || null,
    year,
    allocated: roundDays(allocated),
    carryForward: roundDays(carryForward),
    adjustment: roundDays(adjustment),
    used,
    pending,
    available,
    availableWithoutPending: roundDays(allocated + carryForward + adjustment - used),
    notes: balance?.notes || null,
  };
}

export async function getBalanceSnapshots({ employeeId, leaveTypeId, daysByYear, excludeLeaveId, leaveType }) {
  const years = Object.keys(daysByYear || {});
  const snapshots = await Promise.all(
    years.map((year) =>
      getBalanceSnapshot({
        employeeId,
        leaveTypeId,
        year: Number(year),
        excludeLeaveId,
        leaveType,
      })
    )
  );
  return snapshots;
}

export async function recalculateLeaveBalance(employeeId, leaveTypeId, year, leaveType) {
  const balance = await ensureLeaveBalance(employeeId, leaveTypeId, year, leaveType);
  const { used, pending } = await sumLeaveDays(employeeId, leaveTypeId, year);
  balance.used = used;
  balance.pending = pending;
  balance.lastRecalculatedAt = new Date();
  await balance.save();
  return balance;
}

export async function recalculateBalancesForLeave(leave) {
  if (!leave?.leaveType) return;
  const years = new Set(Object.keys(leave.daysByYear || {}));
  if (years.size === 0 && leave.startDate) {
    years.add(String(new Date(leave.startDate).getUTCFullYear()));
  }
  const type = await LeaveType.findById(leave.leaveType).lean();
  for (const year of years) {
    await recalculateLeaveBalance(leave.employee, leave.leaveType, Number(year), type);
  }
}

export async function recalculateBalancesForPair(employeeId, leaveTypeId, years = []) {
  if (!leaveTypeId) return;
  const type = await LeaveType.findById(leaveTypeId).lean();
  for (const year of years) {
    await recalculateLeaveBalance(employeeId, leaveTypeId, Number(year), type);
  }
}

export async function findOverlappingLeave({
  employeeId,
  startDate,
  endDate,
  excludeLeaveId = null,
}) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (!start || !end) return null;

  const query = {
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (excludeLeaveId) query._id = { $ne: excludeLeaveId };

  return Leave.findOne(query)
    .populate('leaveType', 'name code')
    .sort({ startDate: 1 });
}

/**
 * Ensures the requested days fit into the available balance for every year the
 * request touches. `excludeLeaveId` is used when editing an existing request.
 */
export async function validateRequestBalance({
  employeeId,
  leaveTypeId,
  leaveType,
  daysByYear,
  excludeLeaveId = null,
}) {
  // Unpaid leave has no entitlement, so it is not limited by an allocation.
  // Usage is still tracked so reporting stays accurate.
  if (leaveType?.isPaid === false) {
    return { ok: true, snapshots: [] };
  }

  const snapshots = await getBalanceSnapshots({
    employeeId,
    leaveTypeId,
    daysByYear,
    excludeLeaveId,
    leaveType,
  });

  for (const snapshot of snapshots) {
    const requested = roundDays(daysByYear?.[snapshot.year] || 0);
    if (requested > snapshot.available) {
      return {
        ok: false,
        message: `Insufficient ${leaveType?.name || 'leave'} balance for ${snapshot.year}. Requested ${requested} day(s), available ${snapshot.available} day(s).`,
        snapshots,
      };
    }
  }

  return { ok: true, snapshots };
}

export async function getApproverUserIds(excludeUserId = null) {
  const roles = await Role.find({ status: 'active', permissions: 'approve-leave' })
    .select('name')
    .lean();
  const roleNames = roles.map((role) => role.name);

  const users = await User.find({
    status: 'active',
    $or: [
      { type: { $in: PRIVILEGED_TYPES } },
      { role: { $in: roleNames } },
    ],
  })
    .select('_id')
    .lean();

  const ids = users
    .map((user) => String(user._id))
    .filter((id) => !excludeUserId || id !== String(excludeUserId));

  return [...new Set(ids)];
}

export async function notifyUsers(userIds = [], payload = {}) {
  const unique = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];
  if (unique.length === 0) return [];
  const rows = unique.map((recipient) => ({
    recipient,
    type: payload.type || 'system',
    title: payload.title,
    message: payload.message,
    link: payload.link || '/leave/applications',
    leave: payload.leave || null,
  }));
  return LeaveNotification.insertMany(rows);
}

export async function notifyApprovers(payload, excludeUserId = null) {
  const ids = await getApproverUserIds(excludeUserId);
  return notifyUsers(ids, payload);
}

export async function getEmployeeUserId(employeeId) {
  if (!employeeId) return null;
  const employee = await Employee.findById(employeeId).select('user').lean();
  return employee?.user ? String(employee.user) : null;
}

export function populateLeave(query) {
  return query
    .populate({
      path: 'employee',
      select: 'name email employee_id branch_id department_id designation_id employee_status',
      populate: [
        { path: 'department_id', select: 'name' },
        { path: 'designation_id', select: 'name' },
        { path: 'branch_id', select: 'name' },
      ],
    })
    .populate('leaveType', 'name code color isPaid allowHalfDay annualAllocation includeWeekends')
    .populate('approvedBy', 'name email')
    .populate('appliedBy', 'name email')
    .populate('cancelledBy', 'name email')
    .populate('statusHistory.by', 'name email');
}

export function parsePagination(searchParams, defaultLimit = 10) {
  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);
  const limit = Math.min(
    Math.max(
      parseInt(searchParams.get('per_page'), 10) ||
        parseInt(searchParams.get('limit'), 10) ||
        defaultLimit,
      1
    ),
    500
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function addStatusHistory(leave, status, user, note = null) {
  leave.statusHistory = Array.isArray(leave.statusHistory) ? leave.statusHistory : [];
  leave.statusHistory.push({
    status,
    at: new Date(),
    by: user?._id || null,
    byName: user?.name || null,
    note: note || null,
  });
}

export function isValidObjectId(value) {
  return Boolean(value) && mongoose.Types.ObjectId.isValid(value);
}

export function getYearRange(year) {
  return {
    start: new Date(Date.UTC(Number(year), 0, 1)),
    end: new Date(Date.UTC(Number(year) + 1, 0, 1)),
  };
}
