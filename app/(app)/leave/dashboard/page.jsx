'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Users,
  Wallet,
  ArrowRight,
  Bell,
  Settings2,
  CalendarRange,
  Inbox,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  LockedNotice,
  StatCard,
  StatusBadge,
  TypeBadge,
  formatDateRange,
  formatDateTime,
  formatDays,
} from '@/components/leave/leave-shared';

const CHART_COLORS = ['#FFEB00', '#1C2925', '#E60023', '#3B82F6', '#8B5CF6', '#10B981', '#F97316'];

function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ChartEmpty({ label }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default function LeaveDashboardPage() {
  const router = useRouter();
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const yearOptions = useMemo(
    () => [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String),
    [currentYear]
  );

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/stats?year=${year}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to load leave dashboard');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch('/api/leave/notifications?limit=8', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setNotifications(Array.isArray(json.notifications) ? json.notifications : []);
      setUnreadCount(Number(json.unreadCount) || 0);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadStats, 0);
    return () => clearTimeout(timer);
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(loadNotifications, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  const stats = data?.stats || {};
  const access = data?.access || null;
  const monthly = Array.isArray(stats.monthly) ? stats.monthly : [];
  const byType = Array.isArray(stats.byType) ? stats.byType : [];
  const balances = Array.isArray(stats.myBalances) ? stats.myBalances : [];
  const recentPending = Array.isArray(stats.recentPending) ? stats.recentPending : [];
  const upcomingLeaves = Array.isArray(stats.upcomingLeaves) ? stats.upcomingLeaves : [];

  const monthChartData = monthly.map((row) => ({
    month: row.month,
    approved: Number(row.approvedDays) || 0,
    pending: Number(row.pendingDays) || 0,
  }));
  const hasMonthlyData = monthChartData.some((row) => row.approved > 0 || row.pending > 0);

  const typeChartData = byType.filter((row) => row.days > 0).slice(0, 6);
  const typeChartTotal = typeChartData.reduce((sum, row) => sum + row.days, 0);

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch('/api/leave/notifications', {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((rows) => rows.map((row) => ({ ...row, isRead: true })));
      }
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification) {
    if (!notification.isRead) {
      try {
        await fetch(`/api/leave/notifications/${notification._id}/read`, {
          method: 'PUT',
          credentials: 'include',
        });
        setUnreadCount((count) => Math.max(0, count - 1));
        setNotifications((rows) =>
          rows.map((row) => (row._id === notification._id ? { ...row, isRead: true } : row))
        );
      } catch {
        // Navigation should not be blocked by a failed read receipt.
      }
    }
    router.push(notification.link || '/leave/applications');
  }

  const actions = [
    {
      label: 'Refresh',
      variant: 'outline',
      icon: <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />,
      onClick: () => {
        loadStats();
        loadNotifications();
      },
    },
    ...(access
      ? [
          {
            label: 'Apply for Leave',
            variant: 'default',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => router.push('/leave/applications?apply=1'),
          },
        ]
      : []),
  ];

  return (
    <PageTemplate
      title="Leave Dashboard"
      description="A live overview of leave requests, balances and upcoming time off"
      actions={actions}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]" aria-label="Dashboard year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="capitalize">
              {data?.scope === 'all' ? 'Organisation view' : 'My leave'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" asChild>
              <Link href="/leave/applications">
                Applications <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/leave/calendar">
                Calendar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            {access?.canManageBalances && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/leave/balances">
                  Balances <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            {access?.canManageTypes && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/leave/types">
                  Types <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {access && !access.canViewAll && !access.employee && (
          <LockedNotice
            title="No employee profile linked"
            description="Your account is not linked to an employee record yet, so leave balances and requests cannot be shown. Ask an administrator to link your account from the Employee module."
          />
        )}

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Clock}
            label="Pending Requests"
            value={stats.pending || 0}
            hint={`${formatDays(stats.pendingDays || 0)} day(s) awaiting review`}
            loading={loading}
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved Days"
            value={formatDays(stats.approvedDays || 0)}
            hint={`${stats.approved || 0} approved request(s)`}
            accent="green"
            loading={loading}
          />
          <StatCard
            icon={CalendarClock}
            label="On Leave Today"
            value={stats.onLeaveToday || 0}
            hint="Approved leave covering today"
            accent="blue"
            loading={loading}
          />
          <StatCard
            icon={CalendarRange}
            label="Next 7 Days"
            value={stats.upcomingWeek || 0}
            hint="Leave starting this week"
            accent="violet"
            loading={loading}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">Leave Days by Month</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Approved and pending working days in {year}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Approved
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow" /> Pending
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
              ) : hasMonthlyData ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'currentColor', opacity: 0.06 }}
                        formatter={(value, name) => [`${formatDays(value)} day(s)`, name]}
                      />
                      <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="pending" name="Pending" fill="#FFEB00" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmpty label={`No leave days recorded in ${year}`} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Approved Days by Type</CardTitle>
              <p className="text-xs text-muted-foreground">Share of approved leave in {year}</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
              ) : typeChartData.length > 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeChartData}
                          dataKey="days"
                          nameKey="name"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={2}
                        >
                          {typeChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${formatDays(value)} day(s)`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-1.5">
                    {typeChartData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color || '#FFEB00' }}
                          />
                          <span className="truncate">{entry.name}</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatDays(entry.days)} ({Math.round((entry.days / typeChartTotal) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ChartEmpty label="No approved leave types yet" />
              )}
            </CardContent>
          </Card>
        </div>

        {access?.employee && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">My Leave Balance</CardTitle>
                <p className="text-xs text-muted-foreground">Available days after approved and pending leave</p>
              </div>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((key) => (
                    <div key={key} className="h-20 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : balances.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No balances for this year"
                  description="Balances appear once an administrator allocates leave or you submit a request."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {balances.map((balance) => {
                    const total =
                      (Number(balance.allocated) || 0) +
                      (Number(balance.carryForward) || 0) +
                      (Number(balance.adjustment) || 0);
                    const available = Number(balance.available) || 0;
                    const percent = total > 0 ? Math.max(0, Math.min(100, (available / total) * 100)) : 0;
                    return (
                      <div key={balance._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <TypeBadge leaveType={balance.leaveType} />
                          <Badge variant={available > 0 ? 'success' : 'outline'}>
                            {formatDays(available)} left
                          </Badge>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-yellow"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>Allocated {formatDays(total)}</span>
                          <span>Used {formatDays(balance.used)}</span>
                          <span>Pending {formatDays(balance.pending)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">Pending Approvals</CardTitle>
                <p className="text-xs text-muted-foreground">The most recent requests awaiting a decision</p>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/leave/applications?status=pending">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((key) => (
                    <div key={key} className="h-14 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : recentPending.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Nothing waiting for approval"
                  description="New pending requests will appear here."
                />
              ) : (
                <div className="flex flex-col divide-y">
                  {recentPending.map((leave) => (
                    <Link
                      key={leave._id}
                      href={`/leave/applications?status=pending&highlight=${leave._id}`}
                      className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-xs font-semibold text-brand-charcoal">
                          {initials(leave.employee?.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{leave.employee?.name || '—'}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {leave.leaveType?.name || 'Leave'} • {formatDateRange(leave.startDate, leave.endDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium">{formatDays(leave.totalDays)}d</span>
                        <StatusBadge status={leave.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">Upcoming Leave</CardTitle>
                <p className="text-xs text-muted-foreground">Approved leave starting from today</p>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/leave/calendar">
                  Calendar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((key) => (
                    <div key={key} className="h-14 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : upcomingLeaves.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming leave"
                  description="Approved requests starting soon will appear here."
                />
              ) : (
                <div className="flex flex-col divide-y">
                  {upcomingLeaves.map((leave) => (
                    <div key={leave._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border text-center">
                          <span className="text-[10px] uppercase leading-none text-muted-foreground">
                            {new Date(leave.startDate).toLocaleDateString(undefined, {
                              month: 'short',
                              timeZone: 'UTC',
                            })}
                          </span>
                          <span className="text-sm font-semibold leading-tight">
                            {new Date(leave.startDate).toLocaleDateString(undefined, {
                              day: 'numeric',
                              timeZone: 'UTC',
                            })}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{leave.employee?.name || '—'}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {leave.leaveType?.name || 'Leave'} • {formatDays(leave.totalDays)} day(s)
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'You are all caught up'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllRead} disabled={markingAll}>
                {markingAll ? 'Marking...' : 'Mark all as read'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((key) => (
                  <div key={key} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No notifications yet"
                description="Updates about applications, approvals and balances will appear here."
              />
            ) : (
              <div className="flex flex-col divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-3 py-2.5 text-left transition-colors hover:text-primary',
                      !notification.isRead && 'font-medium'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        notification.isRead ? 'bg-muted' : 'bg-brand-yellow'
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{notification.title}</span>
                      <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                        {notification.message}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink href="/leave/applications" icon={CalendarDays} title="Leave Applications" description="Submit and review requests" />
          <QuickLink href="/leave/calendar" icon={CalendarRange} title="Leave Calendar" description="See approved and pending leave" />
          {access && (
            <QuickLink href="/leave/balances" icon={Wallet} title="Leave Balances" description="Allocate and adjust days" />
          )}
          {access?.canManageTypes && (
            <QuickLink href="/leave/types" icon={Settings2} title="Leave Types" description="Configure categories and rules" />
          )}
        </div>

        {access?.canViewAll && (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {stats.activeEmployees || 0} active employee(s)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {stats.activeLeaveTypes || 0} active leave type(s)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" /> {stats.all || 0} request(s) in {year}
            </span>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}

function QuickLink({ href, icon: Icon, title, description }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-brand-charcoal/30 hover:bg-accent/40 dark:hover:border-brand-white/20"
    >
      <div className="rounded-lg bg-brand-yellow/20 p-2 text-brand-charcoal dark:text-brand-yellow">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-sm font-medium">
          {title}
          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
