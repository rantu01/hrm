// Date helpers shared by the payroll API routes.

export function parsePeriodDate(value, fallback = new Date()) {
  if (!value) return fallback;
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3] || 1);
    return new Date(Date.UTC(year, month, day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function startOfMonthUtc(value) {
  const date = parsePeriodDate(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonthUtc(value) {
  const date = parsePeriodDate(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
}

export function monthKey(value) {
  const date = parsePeriodDate(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(value) {
  const date = parsePeriodDate(value);
  return date.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildMonths(year) {
  const now = new Date();
  const currentKey = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, '0')}`;
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, index, 1));
    const code = `${year}-${String(index + 1).padStart(2, '0')}`;
    return {
      date: date.toISOString().slice(0, 10),
      monthCode: code,
      monthNum: String(index + 1).padStart(2, '0'),
      monthName: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      fullName: date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
      isCurrentMonth: code === currentKey,
    };
  });
}

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
