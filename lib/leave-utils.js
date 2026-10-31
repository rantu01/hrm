// Shared, dependency-free helpers for the Leave Management module.
// These functions only deal with dates and numbers so they can safely be
// imported by both server route handlers and client components.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toUtcDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toDateInputValue(value) {
  const date = toUtcDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function startOfUtcYear(year) {
  return new Date(Date.UTC(Number(year), 0, 1));
}

export function endOfUtcYear(year) {
  return new Date(Date.UTC(Number(year) + 1, 0, 1));
}

export function startOfUtcMonth(value) {
  const date = toUtcDate(value) || new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfUtcWeek(value) {
  const date = toUtcDate(value) || new Date();
  const day = date.getUTCDay();
  return addDaysUtc(date, -day);
}

export function roundDays(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function datesOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = toUtcDate(aStart);
  const aE = toUtcDate(aEnd);
  const bS = toUtcDate(bStart);
  const bE = toUtcDate(bEnd);
  if (!aS || !aE || !bS || !bE) return false;
  return aS.getTime() <= bE.getTime() && bS.getTime() <= aE.getTime();
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function recurringMatches(date, start, end) {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const startMonth = start.getUTCMonth();
  const startDay = start.getUTCDate();
  const endMonth = (end || start).getUTCMonth();
  const endDay = (end || start).getUTCDate();

  const key = month * 100 + day;
  const startKey = startMonth * 100 + startDay;
  const endKey = endMonth * 100 + endDay;

  if (startKey <= endKey) return key >= startKey && key <= endKey;
  // A recurring range that crosses the new year (e.g. Dec 30 → Jan 2).
  return key >= startKey || key <= endKey;
}

export function findHolidayForDate(date, holidays = []) {
  const target = toUtcDate(date);
  if (!target) return null;
  for (const holiday of holidays) {
    if (!holiday || !holiday.start_date) continue;
    const start = toUtcDate(holiday.start_date);
    const end = holiday.end_date ? toUtcDate(holiday.end_date) : start;
    if (!start) continue;
    if (holiday.is_recurring) {
      if (recurringMatches(target, start, end)) return holiday;
    } else if (target.getTime() >= start.getTime() && target.getTime() <= end.getTime()) {
      return holiday;
    }
  }
  return null;
}

/**
 * Calculates the number of leave days between two dates.
 *
 * Weekends are skipped unless the leave type explicitly counts them. Public
 * holidays are excluded (half-day holidays count as half a working day) and
 * half-day leave only counts half of the selected day.
 *
 * Returns `daysByYear` so balances for leave requests spanning a year boundary
 * can be kept in sync for both years.
 */
export function calculateLeaveDays({
  startDate,
  endDate,
  halfDay = false,
  includeWeekends = false,
  holidays = [],
}) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  if (!start || !end) {
    return { error: 'Start date and end date are required', totalDays: 0, daysByYear: {}, excluded: [] };
  }
  if (end.getTime() < start.getTime()) {
    return { error: 'End date must be after or equal to the start date', totalDays: 0, daysByYear: {}, excluded: [] };
  }
  if (halfDay && start.getTime() !== end.getTime()) {
    return { error: 'Half-day leave must start and end on the same date', totalDays: 0, daysByYear: {}, excluded: [] };
  }

  let totalDays = 0;
  const daysByYear = {};
  const excluded = [];
  const counted = [];

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDaysUtc(cursor, 1)) {
    const dayOfWeek = cursor.getUTCDay();
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      excluded.push({ date: dateKey(cursor), reason: 'weekend' });
      continue;
    }

    const holiday = findHolidayForDate(cursor, holidays);
    let dayValue = 1;
    if (holiday) {
      if (holiday.is_half_day) {
        dayValue = 0.5;
      } else {
        excluded.push({ date: dateKey(cursor), reason: 'holiday', name: holiday.name });
        continue;
      }
    }

    if (halfDay) dayValue *= 0.5;

    totalDays += dayValue;
    const year = String(cursor.getUTCFullYear());
    daysByYear[year] = roundDays((daysByYear[year] || 0) + dayValue);
    counted.push(dateKey(cursor));
  }

  if (totalDays <= 0) {
    return {
      error: 'The selected dates do not contain any working days. Adjust the dates or leave type.',
      totalDays: 0,
      daysByYear: {},
      excluded,
      counted,
      mutable: false,
    };
  }

  return {
    totalDays: roundDays(totalDays),
    daysByYear,
    excluded,
    counted,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function sumDaysForYear(daysByYear, year) {
  if (!daysByYear || typeof daysByYear !== 'object') return 0;
  return roundDays(Number(daysByYear[String(year)]) || 0);
}

export function formatDays(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function leaveStatusVariant(status) {
  switch (String(status || '').toLowerCase()) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    default:
      return 'outline';
  }
}

// Maps a configurable leave type to the legacy `type` enum kept for dashboard
// compatibility with older leave records.
export function legacyLeaveType(code = '') {
  const normalized = String(code).toUpperCase();
  if (['ANNUAL', 'VACATION', 'EARNED'].includes(normalized)) return 'vacation';
  if (['SICK', 'MEDICAL'].includes(normalized)) return 'sick';
  if (['CASUAL', 'PERSONAL'].includes(normalized)) return 'personal';
  if (normalized.includes('MATERNITY')) return 'maternity';
  if (normalized.includes('PATERNITY')) return 'paternity';
  if (['UNPAID', 'LWP'].includes(normalized)) return 'unpaid';
  return 'other';
}
