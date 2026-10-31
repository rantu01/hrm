'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FilterX,
  CalendarRange,
  PartyPopper,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  EmptyState,
  ErrorBanner,
  Modal,
  StatusBadge,
  TypeBadge,
  formatDateRange,
  formatDays,
  formatDateTime,
} from '@/components/leave/leave-shared';
import {
  addDaysUtc,
  findHolidayForDate,
  toDateInputValue,
  toUtcDate,
} from '@/lib/leave-utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const STATUS_FILTERS = [
  { value: 'active', label: 'Approved & pending', param: 'approved,pending' },
  { value: 'all', label: 'All statuses', param: 'all' },
  { value: 'approved', label: 'Approved only', param: 'approved' },
  { value: 'pending', label: 'Pending only', param: 'pending' },
  { value: 'rejected', label: 'Rejected only', param: 'rejected' },
  { value: 'cancelled', label: 'Cancelled only', param: 'cancelled' },
];

function statusChipClass(status) {
  switch (status) {
    case 'approved':
      return 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'pending':
      return 'border-amber-500/40 bg-brand-yellow/25 text-brand-charcoal dark:text-brand-yellow';
    case 'rejected':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'cancelled':
      return 'border-muted-foreground/25 bg-muted text-muted-foreground line-through';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function LeaveCalendarPage() {
  const today = useMemo(() => toUtcDate(new Date()), []);
  const [cursor, setCursor] = useState(() => ({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));

  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [viewing, setViewing] = useState(null);

  const monthStart = useMemo(
    () => new Date(Date.UTC(cursor.year, cursor.month, 1)),
    [cursor.year, cursor.month]
  );
  const monthEnd = useMemo(
    () => new Date(Date.UTC(cursor.year, cursor.month + 1, 0)),
    [cursor.year, cursor.month]
  );
  const gridStart = useMemo(
    () => addDaysUtc(monthStart, -monthStart.getUTCDay()),
    [monthStart]
  );
  const gridEnd = useMemo(
    () => addDaysUtc(monthEnd, 6 - monthEnd.getUTCDay()),
    [monthEnd]
  );

  const days = useMemo(() => {
    const list = [];
    const total = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
    for (let index = 0; index < total; index += 1) {
      list.push(addDaysUtc(gridStart, index));
    }
    return list;
  }, [gridStart, gridEnd]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      from: toDateInputValue(gridStart),
      to: toDateInputValue(gridEnd),
    });
    const statusParam = STATUS_FILTERS.find((row) => row.value === statusFilter)?.param || 'approved,pending';
    sp.set('status', statusParam);
    if (typeFilter) sp.set('leave_type', typeFilter);
    if (employeeFilter && access?.canViewAll) sp.set('employee', employeeFilter);
    return sp.toString();
  }, [gridStart, gridEnd, statusFilter, typeFilter, employeeFilter, access]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/calendar?${queryString}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to load leave calendar');
      setLeaves(Array.isArray(json.leaves) ? json.leaves : []);
      setHolidays(Array.isArray(json.holidays) ? json.holidays : []);
      setAccess(json.access || null);
    } catch (err) {
      setError(err.message);
      setLeaves([]);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const timer = setTimeout(loadCalendar, 0);
    return () => clearTimeout(timer);
  }, [loadCalendar]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      const res = await fetch('/api/leave/types?limit=200&include_inactive=true', {
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      setLeaveTypes(Array.isArray(json.leaveTypes) ? json.leaveTypes : []);
    }
    loadOptions().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!access?.canViewAll) return undefined;
    let cancelled = false;
    async function loadEmployees() {
      const res = await fetch('/api/employees?limit=500&per_page=500', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || 'Failed to load employees');
      }
      if (cancelled) return;
      setEmployees(Array.isArray(json.employees) ? json.employees : []);
    }
    loadEmployees().catch((err) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, [access?.canViewAll]);

  // Leaves grouped by each calendar date they cover.
  const leavesByDate = useMemo(() => {
    const map = new Map();
    for (const leave of leaves) {
      const start = toUtcDate(leave.startDate);
      const end = toUtcDate(leave.endDate);
      if (!start || !end) continue;
      const first = start.getTime() < gridStart.getTime() ? gridStart : start;
      const last = end.getTime() > gridEnd.getTime() ? gridEnd : end;
      for (let day = first; day.getTime() <= last.getTime(); day = addDaysUtc(day, 1)) {
        const key = toDateInputValue(day);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(leave);
      }
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }
    return map;
  }, [leaves, gridStart, gridEnd]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    for (const day of days) {
      const holiday = findHolidayForDate(day, holidays);
      if (holiday) map.set(toDateInputValue(day), holiday);
    }
    return map;
  }, [days, holidays]);

  const monthLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const start = toUtcDate(leave.startDate);
      const end = toUtcDate(leave.endDate);
      return start && end && start.getTime() <= monthEnd.getTime() && end.getTime() >= monthStart.getTime();
    });
  }, [leaves, monthStart, monthEnd]);

  const monthHolidays = useMemo(() => {
    return days.filter(
      (day) =>
        day.getUTCMonth() === cursor.month &&
        holidayMap.has(toDateInputValue(day))
    );
  }, [days, holidayMap, cursor.month]);

  const selectedLeaves = leavesByDate.get(selectedDate) || [];
  const selectedHoliday = holidayMap.get(selectedDate) || null;
  const monthStats = {
    approved: monthLeaves.filter((leave) => leave.status === 'approved').length,
    pending: monthLeaves.filter((leave) => leave.status === 'pending').length,
    holidays: monthHolidays.length,
  };

  function changeMonth(offset) {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month + offset, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
    setSelectedDate('');
    setViewing(null);
  }

  function goToday() {
    setCursor({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
    setSelectedDate(toDateInputValue(today));
    setViewing(null);
  }

  function clearFilters() {
    setStatusFilter('active');
    setTypeFilter('');
    setEmployeeFilter('');
  }

  const hasFilters = statusFilter !== 'active' || typeFilter || employeeFilter;
  const todayKey = toDateInputValue(today);

  return (
    <PageTemplate
      title="Leave Calendar"
      description="See approved and pending leave alongside public holidays"
      actions={[
        {
          label: 'Today',
          variant: 'outline',
          icon: <CalendarDays className="h-4 w-4" />,
          onClick: goToday,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[170px] text-center text-lg font-semibold" aria-live="polite">
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </h2>
            <Button size="icon" variant="outline" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[190px]" aria-label="Status filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter || 'all'}
              onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Leave type filter">
                <SelectValue placeholder="All leave types" />
              </SelectTrigger>
              <SelectContent searchable>
                <SelectItem value="all">All leave types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type._id} value={String(type._id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {access?.canViewAll && (
              <Select
                value={employeeFilter || 'all'}
                onValueChange={(value) => setEmployeeFilter(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-full sm:w-[210px]" aria-label="Employee filter">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={String(employee._id)}>
                      {employee.name}
                      {employee.employee_id ? ` (${employee.employee_id})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <FilterX className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <div className="grid gap-4 xl:grid-cols-4">
          <Card className="xl:col-span-3">
            <CardContent className="p-2 sm:p-3">
              <div className="grid grid-cols-7 gap-1 pb-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day[0]}</span>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 42 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-md bg-muted sm:h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const key = toDateInputValue(day);
                    const inMonth = day.getUTCMonth() === cursor.month;
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDate;
                    const dayLeaves = leavesByDate.get(key) || [];
                    const holiday = holidayMap.get(key);
                    const visible = dayLeaves.slice(0, 2);

                    return (
                      <div
                        key={key}
                        className={cn(
                          'group relative flex min-h-[82px] flex-col gap-1 rounded-md border p-1.5 transition-colors sm:min-h-[104px]',
                          inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground',
                          isToday && 'border-brand-charcoal/50 ring-1 ring-brand-charcoal/20 dark:border-brand-yellow/60 dark:ring-brand-yellow/30',
                          isSelected && 'bg-accent/50',
                          holiday && inMonth && 'border-brand-red/30 bg-brand-red/5'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDate(key)}
                            className={cn(
                              'flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full px-1 text-xs font-medium transition-colors hover:bg-accent',
                              isToday && 'bg-brand-yellow font-semibold text-brand-charcoal',
                              !inMonth && 'opacity-60'
                            )}
                            aria-label={`Select ${key}`}
                            aria-pressed={isSelected}
                          >
                            {day.getUTCDate()}
                          </button>
                          {holiday && inMonth && (
                            <span
                              className="hidden h-1.5 w-1.5 rounded-full bg-brand-red sm:block"
                              title={holiday.name}
                            />
                          )}
                        </div>

                        {holiday && inMonth && (
                          <div className="truncate rounded bg-brand-red/10 px-1 py-0.5 text-[10px] font-medium text-brand-red">
                            {holiday.name}
                          </div>
                        )}

                        <div className="flex min-w-0 flex-col gap-0.5">
                          {visible.map((leave) => (
                            <button
                              key={`${leave._id}-${key}`}
                              type="button"
                              onClick={() => setViewing(leave)}
                              title={`${leave.employee?.name || 'Employee'} — ${leave.leaveType?.name || 'Leave'} (${leave.status})`}
                              className={cn(
                                'flex w-full cursor-pointer items-center gap-1 truncate rounded border px-1 py-0.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80',
                                statusChipClass(leave.status)
                              )}
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: leave.leaveType?.color || '#FFEB00' }}
                              />
                              <span className="truncate">
                                {leave.employee?.name?.split(' ')[0] || 'Employee'}
                                {leave.halfDay ? ' (½)' : ''}
                              </span>
                            </button>
                          ))}
                          {dayLeaves.length > visible.length && (
                            <button
                              type="button"
                              onClick={() => setSelectedDate(key)}
                              className="cursor-pointer px-1 text-left text-[10px] font-medium text-muted-foreground hover:text-primary hover:underline"
                            >
                              +{dayLeaves.length - visible.length} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-emerald-600/30 bg-emerald-500/20" /> Approved
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-amber-500/40 bg-brand-yellow/40" /> Pending
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-red" /> Public holiday
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow ring-1 ring-brand-charcoal/30" /> Today
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {selectedDate ? formatDateRange(selectedDate, selectedDate) : 'Select a day'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Leave details for the selected day</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {selectedHoliday && (
                  <div className="rounded-md border border-brand-red/30 bg-brand-red/5 p-2.5 text-sm">
                    <div className="flex items-center gap-1.5 font-medium text-brand-red">
                      <PartyPopper className="h-3.5 w-3.5" /> {selectedHoliday.name}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Public holiday</p>
                  </div>
                )}

                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">Select a date on the calendar to see details.</p>
                ) : selectedLeaves.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leave recorded on this day.</p>
                ) : (
                  <div className="flex flex-col divide-y">
                    {selectedLeaves.map((leave) => (
                      <button
                        key={leave._id}
                        type="button"
                        onClick={() => setViewing(leave)}
                        className="flex cursor-pointer items-start gap-2 py-2 text-left transition-colors hover:text-primary"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-[11px] font-semibold text-brand-charcoal">
                          {initials(leave.employee?.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{leave.employee?.name || '—'}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {leave.leaveType?.name || 'Leave'}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={leave.status} />
                            <span className="text-[11px] text-muted-foreground">
                              {formatDays(leave.totalDays)} day(s)
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">This Month</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approved requests
                  </span>
                  <span className="font-semibold">{monthStats.approved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Pending requests
                  </span>
                  <span className="font-semibold">{monthStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <PartyPopper className="h-3.5 w-3.5 text-brand-red" /> Holidays
                  </span>
                  <span className="font-semibold">{monthStats.holidays}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {monthHolidays.slice(0, 6).map((day) => {
                    const holiday = holidayMap.get(toDateInputValue(day));
                    return (
                      <Badge key={toDateInputValue(day)} variant="outline" title={holiday?.name}>
                        {day.getUTCDate()} {MONTH_NAMES[cursor.month].slice(0, 3)}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {!access?.canViewAll && access && !access.employee && (
              <EmptyState
                icon={CalendarRange}
                title="No employee profile linked"
                description="Link your account to an employee to see personal leave on the calendar."
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Leave Details"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow text-xs font-semibold text-brand-charcoal">
                  {initials(viewing.employee?.name)}
                </div>
                <div>
                  <div className="font-semibold">{viewing.employee?.name || '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {viewing.employee?.employee_id || '—'}
                    {viewing.employee?.department_id?.name
                      ? ` • ${viewing.employee.department_id.name}`
                      : ''}
                  </div>
                </div>
              </div>
              <StatusBadge status={viewing.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Leave Type">
                <TypeBadge leaveType={viewing.leaveType} payment />
              </Detail>
              <Detail label="Dates">{formatDateRange(viewing.startDate, viewing.endDate)}</Detail>
              <Detail label="Working Days">
                {formatDays(viewing.totalDays)}
                {viewing.halfDay ? ' (half day)' : ''}
              </Detail>
              <Detail label="Applied On">{formatDateTime(viewing.createdAt)}</Detail>
              <Detail label="Reviewed By">
                {viewing.approvedBy?.name
                  ? `${viewing.approvedBy.name} • ${formatDateTime(viewing.approvedAt)}`
                  : '—'}
              </Detail>
              <Detail label="Applied By">{viewing.appliedBy?.name || '—'}</Detail>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{viewing.reason || '—'}</p>
            </div>

            {viewing.rejectionReason && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <div className="font-medium text-destructive">Rejection reason</div>
                <p className="mt-1 whitespace-pre-wrap">{viewing.rejectionReason}</p>
              </div>
            )}

            {viewing.cancellationReason && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-medium">Cancellation reason</div>
                <p className="mt-1 whitespace-pre-wrap">{viewing.cancellationReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageTemplate>
  );
}

function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
