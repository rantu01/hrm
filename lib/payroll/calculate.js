// Shared payroll calculation engine.
//
// The calculation follows the reference implementation:
//   Gross Pay = Total Earnings - LOP Deduction - Unpaid Leave Deduction + Overtime
//   Net Pay   = Gross Pay - Component Deductions
//
// Attendance, approved leave and company holidays are integrated where they
// exist. When an employee has no attendance records at all for the period we
// treat the period as fully attended (minus approved leave) instead of marking
// every day as Loss of Pay. This keeps payroll usable before attendance data is
// recorded while preserving the strict LOP behaviour once records exist.

export const WORKING_DAY_INDICES = [1, 2, 3, 4, 5]; // Monday - Friday

export function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function toUtcDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
}

export function dateKey(value) {
  const date = toUtcDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function eachDate(start, end) {
  const from = toUtcDate(start);
  const to = toUtcDate(end);
  if (!from || !to || from > to) return [];
  const days = [];
  for (let time = from.getTime(); time <= to.getTime(); time += 86400000) {
    days.push(new Date(time));
  }
  return days;
}

export function countWorkingDays(start, end, indices = WORKING_DAY_INDICES) {
  return eachDate(start, end).filter((day) => indices.includes(day.getUTCDay()))
    .length;
}

function isPaidLeave(leave) {
  if (!leave) return true;
  if (leave.leaveType && typeof leave.leaveType === 'object') {
    return leave.leaveType.isPaid !== false;
  }
  if (leave.type === 'unpaid') return false;
  return true;
}

function holidayDatesForEmployee(holidays, employee) {
  const keys = new Set();
  const branchId = employee?.branch_id ? String(employee.branch_id) : null;
  for (const holiday of holidays || []) {
    if (holiday.is_paid === false) continue;
    const branches = (holiday.branch_ids || []).map((b) => String(b?._id || b));
    if (branches.length > 0 && branchId && !branches.includes(branchId)) continue;
    if (branches.length > 0 && !branchId) continue;
    for (const day of eachDate(holiday.start_date || holiday.startDate, holiday.end_date || holiday.endDate || holiday.start_date || holiday.startDate)) {
      keys.add(dateKey(day));
    }
  }
  return keys;
}

export function calculateSalaryBreakdown({ basicSalary = 0, components = [] }) {
  const basic = round2(basicSalary);
  const earnings = [{ name: 'Basic Salary', amount: basic }];
  const deductions = [];
  let totalEarnings = basic;
  let totalDeductions = 0;

  for (const component of components || []) {
    if (!component || component.status === 'inactive') continue;
    const amount = round2(
      typeof component.calculateAmount === 'function'
        ? component.calculateAmount(basic)
        : component.calculationType === 'percentage' &&
            component.percentageOfBasic != null
          ? (basic * Number(component.percentageOfBasic)) / 100
          : component.defaultAmount || 0
    );
    const name = component.name || 'Component';
    if (component.type === 'deduction') {
      deductions.push({ name, amount });
      totalDeductions += amount;
    } else {
      earnings.push({ name, amount });
      totalEarnings += amount;
    }
  }

  return {
    basicSalary: basic,
    earnings,
    deductions,
    totalEarnings: round2(totalEarnings),
    totalDeductions: round2(totalDeductions),
  };
}

/**
 * Calculate a complete payroll entry for one employee.
 *
 * @param {object} options
 * @param {object} options.employee           Employee document (branch_id used for holidays)
 * @param {number} options.basicSalary        Resolved basic salary
 * @param {Array}  options.components         Active SalaryComponent documents
 * @param {object} options.run                PayrollRun document
 * @param {Array}  options.attendanceRecords  Attendance records within the period
 * @param {Array}  options.leaves             Approved leave applications (leaveType populated)
 * @param {Array}  options.holidays           Holidays overlapping the period
 */
export function calculatePayrollEntry({
  employee,
  basicSalary = 0,
  components = [],
  run,
  attendanceRecords = [],
  leaves = [],
  holidays = [],
}) {
  const start = run.payPeriodStart;
  const end = run.payPeriodEnd;
  const workingDates = eachDate(start, end).filter((day) =>
    WORKING_DAY_INDICES.includes(day.getUTCDay())
  );
  const workingDays = workingDates.length;
  const workingKeys = new Set(workingDates.map((d) => dateKey(d)));
  const holidayKeys = holidayDatesForEmployee(holidays, employee);

  const salary = calculateSalaryBreakdown({ basicSalary, components });

  const attendanceByDate = new Map();
  let overtimeHours = 0;
  let overtimeAmount = 0;

  for (const record of attendanceRecords || []) {
    const key = dateKey(record.date);
    if (!key || !workingKeys.has(key)) continue;
    attendanceByDate.set(key, record);
    overtimeHours += Number(record.overtimeHours) || 0;
    overtimeAmount += Number(record.overtimeAmount) || 0;
  }

  const hasAttendanceData = attendanceRecords.length > 0;

  // Holidays are paid days. Working on a holiday counts as a present day
  // instead so it is never double counted.
  let holidayDays = 0;
  const countedHolidayKeys = new Set();
  for (const key of workingKeys) {
    if (!holidayKeys.has(key)) continue;
    const record = attendanceByDate.get(key);
    const worked =
      record && ['present', 'late', 'half-day'].includes(record.status);
    if (!worked) {
      holidayDays += 1;
      countedHolidayKeys.add(key);
    }
  }

  let fullPresentDays = 0;
  let halfDays = 0;
  let absentDays = 0;

  for (const [key, record] of attendanceByDate.entries()) {
    if (countedHolidayKeys.has(key)) continue;
    if (record.status === 'present' || record.status === 'late') fullPresentDays += 1;
    else if (record.status === 'half-day') halfDays += 1;
    else if (record.status === 'absent') absentDays += 1;
  }

  // Approved leave days falling on working days (holidays and days actually
  // worked are excluded to avoid double counting).
  const leaveDayKeys = new Set();
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaves || []) {
    const leaveStart = toUtcDate(leave.startDate || leave.start_date);
    const leaveEnd = toUtcDate(leave.endDate || leave.end_date) || leaveStart;
    if (!leaveStart || !leaveEnd) continue;
    const paid = isPaidLeave(leave);
    for (const day of eachDate(leaveStart, leaveEnd)) {
      const key = dateKey(day);
      if (!workingKeys.has(key)) continue;
      if (countedHolidayKeys.has(key)) continue;
      const record = attendanceByDate.get(key);
      if (record && ['present', 'late', 'half-day'].includes(record.status)) continue;
      if (leaveDayKeys.has(key)) continue;
      leaveDayKeys.add(key);
      if (paid) paidLeaveDays += 1;
      else unpaidLeaveDays += 1;
    }
  }

  // Fallback: no attendance records at all. Assume every working day was
  // attended except holidays and approved leave, instead of applying LOP to
  // the whole period.
  if (!hasAttendanceData) {
    fullPresentDays = Math.max(
      0,
      workingDays - holidayDays - paidLeaveDays - unpaidLeaveDays
    );
    absentDays = 0;
  }

  let effectivePaidDays =
    fullPresentDays + halfDays * 0.5 + holidayDays + paidLeaveDays;
  effectivePaidDays = Math.min(workingDays, effectivePaidDays);

  const presentDays =
    fullPresentDays + halfDays * 0.5 + holidayDays + paidLeaveDays;

  let lopDays = Math.max(0, workingDays - effectivePaidDays - unpaidLeaveDays);
  lopDays = Math.round(lopDays * 100) / 100;

  const perDaySalary = workingDays > 0 ? salary.basicSalary / workingDays : 0;
  const lopDeduction = round2(perDaySalary * lopDays);
  const unpaidLeaveDeduction = round2(perDaySalary * unpaidLeaveDays);

  if (overtimeAmount === 0 && overtimeHours > 0 && workingDays > 0) {
    overtimeAmount = round2((perDaySalary / 8) * 1.5 * overtimeHours);
  }
  overtimeAmount = round2(overtimeAmount);
  overtimeHours = round2(overtimeHours);

  let grossPay =
    salary.totalEarnings - lopDeduction - unpaidLeaveDeduction + overtimeAmount;
  grossPay = round2(Math.max(0, grossPay));

  const netPay = round2(Math.max(0, grossPay - salary.totalDeductions));

  return {
    basicSalary: salary.basicSalary,
    componentEarnings: round2(salary.totalEarnings - salary.basicSalary),
    totalEarnings: salary.totalEarnings,
    totalDeductions: salary.totalDeductions,
    grossPay,
    netPay,
    workingDays,
    presentDays: round2(presentDays),
    fullPresentDays,
    halfDays,
    holidayDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    lopDays,
    lopDeduction,
    effectivePaidDays: round2(effectivePaidDays),
    overtimeHours,
    overtimeAmount,
    perDaySalary: round2(perDaySalary),
    unpaidLeaveDeduction,
    earningsBreakdown: salary.earnings,
    deductionsBreakdown: salary.deductions,
  };
}
