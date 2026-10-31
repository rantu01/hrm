'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  FilterX,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  EmptyState,
  ErrorBanner,
  LockedNotice,
  Modal,
  StatusBadge,
  TypeBadge,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDays,
  toDateInput,
  useDebouncedValue,
} from '@/components/leave/leave-shared';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EMPTY_FORM = {
  employee: '',
  leaveType: '',
  startDate: '',
  endDate: '',
  halfDay: false,
  reason: '',
};

function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function LeaveApplicationsPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [access, setAccess] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [viewing, setViewing] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const autoApplyChecked = useRef(false);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      per_page: String(perPage),
      sort_field: sortField,
      sort_direction: sortDirection,
    });
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (status !== 'all') sp.set('status', status);
    if (employeeFilter) sp.set('employee', employeeFilter);
    if (leaveTypeFilter) sp.set('leave_type', leaveTypeFilter);
    if (dateFrom) sp.set('date_from', dateFrom);
    if (dateTo) sp.set('date_to', dateTo);
    return sp.toString();
  }, [
    page,
    perPage,
    debouncedSearch,
    status,
    employeeFilter,
    leaveTypeFilter,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
  ]);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/applications?${queryString}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load leave applications');
      setLeaves(json.leaves || []);
      setAccess(json.access || null);
      setStatusCounts(json.statusCounts || {});
      setTotal(json.pagination?.total || 0);
      setPages(json.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const timer = setTimeout(fetchLeaves, 0);
    return () => clearTimeout(timer);
  }, [fetchLeaves]);

  // Load form/filter options after the current user's access is known.
  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    async function loadOptions() {
      const requests = [
        fetch('/api/leave/types?limit=200&include_inactive=true', { credentials: 'include' }),
      ];
      if (access.canViewAll) {
        requests.push(
          fetch('/api/employees?limit=500&per_page=500', { credentials: 'include' })
        );
      }
      const responses = await Promise.all(requests);
      const typesJson = await responses[0].json().catch(() => ({}));
      if (!responses[0].ok) {
        throw new Error(typesJson.message || 'Failed to load leave types');
      }
      if (cancelled) return;
      setLeaveTypes(Array.isArray(typesJson.leaveTypes) ? typesJson.leaveTypes : []);
      if (access.canViewAll && responses[1]) {
        const employeesJson = await responses[1].json().catch(() => ({}));
        if (!responses[1].ok) {
          throw new Error(employeesJson.message || 'Failed to load employees');
        }
        if (cancelled) return;
        setEmployees(Array.isArray(employeesJson.employees) ? employeesJson.employees : []);
      }
      setOptionsLoaded(true);
    }
    loadOptions().catch((err) => {
      if (!cancelled) {
        setError(err.message);
        setOptionsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [access]);

  // Opening the page with ?apply=1 (from the dashboard) opens a blank form.
  useEffect(() => {
    if (!access || autoApplyChecked.current) return;
    autoApplyChecked.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('apply') === '1') {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  function resetFilters() {
    setSearch('');
    setStatus('all');
    setEmployeeFilter('');
    setLeaveTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function toggleSort(field) {
    setPage(1);
    if (sortField === field) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      employee: access?.employee?._id ? String(access.employee._id) : '',
    });
    setPreview(null);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(leave) {
    setEditing(leave);
    setForm({
      employee: String(leave.employee?._id || leave.employee || ''),
      leaveType: String(leave.leaveType?._id || leave.leaveType || ''),
      startDate: toDateInput(leave.startDate),
      endDate: toDateInput(leave.endDate),
      halfDay: Boolean(leave.halfDay),
      reason: leave.reason || '',
    });
    setPreview(null);
    setFormError('');
    setViewing(null);
    setShowForm(true);
  }

  const selectedType = leaveTypes.find(
    (type) => String(type._id) === String(form.leaveType)
  );

  useEffect(() => {
    if (!showForm) return undefined;
    const employeeId = form.employee || access?.employee?._id;
    if (!employeeId || !form.leaveType || !form.startDate || !form.endDate) {
      const resetTimer = setTimeout(() => setPreview(null), 0);
      return () => clearTimeout(resetTimer);
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const sp = new URLSearchParams({
          employee: String(employeeId),
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          halfDay: form.halfDay ? 'true' : 'false',
        });
        if (editing?._id) sp.set('exclude', editing._id);
        const res = await fetch(`/api/leave/preview?${sp.toString()}`, {
          credentials: 'include',
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPreview({ issues: [json.message || 'Could not calculate this request'], canApply: false });
        } else {
          setPreview(json);
        }
      } catch (err) {
        if (!cancelled) setPreview({ issues: [err.message], canApply: false });
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showForm, form.employee, form.leaveType, form.startDate, form.endDate, form.halfDay, editing, access]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const employeeId = form.employee || access?.employee?._id;
      if (!employeeId) throw new Error('Please select an employee');
      if (!form.leaveType) throw new Error('Please select a leave type');
      if (!form.startDate || !form.endDate) throw new Error('Please select the leave dates');

      const payload = {
        employee: String(employeeId),
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        halfDay: form.halfDay,
        reason: form.reason.trim() || null,
      };
      const res = await fetch(
        editing ? `/api/leave/applications/${editing._id}` : '/api/leave/applications',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json.message ||
          (Array.isArray(json.errors)
            ? json.errors.map((row) => row.msg || row.message).join(', ')
            : 'Failed to save leave request');
        throw new Error(msg);
      }
      setShowForm(false);
      setEditing(null);
      fetchLeaves();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openReview(leave, action) {
    setReview({ leave, action });
    setReviewNote('');
    setReviewError('');
  }

  async function submitReview() {
    if (!review) return;
    setReviewSaving(true);
    setReviewError('');
    try {
      const { leave, action } = review;
      const reason = reviewNote.trim();
      if (action === 'reject' && !reason) throw new Error('A rejection reason is required');
      const url =
        action === 'approve'
          ? `/api/leave/applications/${leave._id}/approve`
          : action === 'reject'
            ? `/api/leave/applications/${leave._id}/reject`
            : `/api/leave/applications/${leave._id}/cancel`;
      const body = action === 'reject' ? { reason } : { note: reason || undefined, reason: reason || undefined };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `Failed to ${action} leave request`);
      setReview(null);
      setViewing(null);
      fetchLeaves();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleDelete(leave) {
    if (!window.confirm('Delete this leave request permanently? This cannot be undone.')) return;
    setDeleting(leave._id);
    setError('');
    try {
      const res = await fetch(`/api/leave/applications/${leave._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete leave request');
      setViewing(null);
      fetchLeaves();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  function isOwner(leave) {
    return Boolean(
      access?.employee &&
        String(leave?.employee?._id || leave?.employee) === String(access.employee._id)
    );
  }

  const hasFilters =
    search || status !== 'all' || employeeFilter || leaveTypeFilter || dateFrom || dateTo;

  const actions = access
    ? [
        {
          label: 'Apply for Leave',
          variant: 'default',
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreate,
        },
      ]
    : [];

  return (
    <PageTemplate
      title="Leave Applications"
      description="Submit, review and track leave requests"
      actions={actions}
    >
      <div className="flex flex-col gap-4">
        {access && !access.canViewAll && !access.employee && (
          <LockedNotice
            title="No employee profile linked"
            description="Your login account is not linked to an employee record yet, so leave requests cannot be submitted. Ask an administrator to link your account from the Employee module."
          />
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search employee, reason or leave type..."
                className="pl-8"
              />
            </div>

            <Select
              value={leaveTypeFilter || 'all'}
              onValueChange={(value) => {
                setLeaveTypeFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
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
                onValueChange={(value) => {
                  setEmployeeFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
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

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="w-[150px]"
                aria-label="From date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="w-[150px]"
                aria-label="To date"
              />
            </div>

            <Select
              value={String(perPage)}
              onValueChange={(value) => {
                setPerPage(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[125px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <FilterX className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.value];
              return (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={status === tab.value ? 'default' : 'outline'}
                  onClick={() => {
                    setStatus(tab.value);
                    setPage(1);
                  }}
                >
                  {tab.label}
                  {count !== undefined ? ` (${count})` : ''}
                </Button>
              );
            })}
          </div>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {leaves.length === 0 && !loading ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave requests found"
            description={
              hasFilters
                ? 'Try adjusting or clearing your filters.'
                : access && !access.canViewAll
                  ? 'Your submitted leave requests will appear here.'
                  : 'No leave requests have been submitted yet.'
            }
            action={
              access?.employee || access?.canViewAll ? (
                <Button size="sm" className="mt-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Apply for Leave
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    onClick={() => toggleSort('startDate')}
                  >
                    Dates
                    <span aria-hidden="true">
                      {sortField === 'startDate' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    onClick={() => toggleSort('totalDays')}
                  >
                    Days
                    <span aria-hidden="true">
                      {sortField === 'totalDays' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    onClick={() => toggleSort('createdAt')}
                  >
                    Applied
                    <span aria-hidden="true">
                      {sortField === 'createdAt' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading leave requests...
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-xs font-semibold text-brand-charcoal">
                          {initials(leave.employee?.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{leave.employee?.name || '—'}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {leave.employee?.employee_id || '—'}
                            {leave.employee?.department_id?.name
                              ? ` • ${leave.employee.department_id.name}`
                              : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TypeBadge leaveType={leave.leaveType} />
                    </TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap text-sm">
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {leave.halfDay ? 'Half day' : ''}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatDays(leave.totalDays)}</TableCell>
                    <TableCell>
                      <StatusBadge status={leave.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(leave.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setViewing(leave)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {leave.status === 'pending' && access?.canApprove && !isOwner(leave) && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openReview(leave, 'approve')}
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReview(leave, 'reject')}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * perPage + 1}–
            {Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="px-1">
              Page {page} of {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Application form */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Leave Request' : 'Apply for Leave'}
        description="Dates are calculated in working days, excluding weekends and public holidays."
        size="lg"
        closeDisabled={saving}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="leave-application-form" disabled={saving || preview?.canApply === false}>
              {saving ? 'Saving...' : editing ? 'Update Request' : 'Submit Request'}
            </Button>
          </>
        }
      >
        <form id="leave-application-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}

          {access?.canViewAll ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-employee" required>
                Employee
              </Label>
              <Select
                value={form.employee || ''}
                onValueChange={(value) => setForm((prev) => ({ ...prev, employee: value }))}
              >
                <SelectTrigger id="leave-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent searchable>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={String(employee._id)}>
                      {employee.name}
                      {employee.employee_id ? ` (${employee.employee_id})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {optionsLoaded && employees.length === 0 && (
                <span className="text-xs text-destructive">
                  No employees found. Create an employee first.
                </span>
              )}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Employee: </span>
              <span className="font-medium">{access?.employee?.name || '—'}</span>
              <span className="text-muted-foreground">
                {access?.employee?.employee_id ? ` (${access.employee.employee_id})` : ''}
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-type" required>
                Leave Type
              </Label>
              <Select
                value={form.leaveType || ''}
                onValueChange={(value) => setForm((prev) => ({ ...prev, leaveType: value }))}
              >
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent searchable>
                  {leaveTypes
                    .filter((type) => type.status === 'active' || String(type._id) === form.leaveType)
                    .map((type) => (
                      <SelectItem key={type._id} value={String(type._id)}>
                        {type.name}
                        {type.isPaid === false ? ' (Unpaid)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {optionsLoaded && leaveTypes.filter((type) => type.status === 'active').length === 0 && (
                <span className="text-xs text-destructive">
                  No active leave types available. Ask an administrator to configure leave types.
                </span>
              )}
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={Boolean(form.halfDay)}
                  disabled={!selectedType?.allowHalfDay}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, halfDay: Boolean(checked) }))
                  }
                />
                Half day
                {selectedType && !selectedType.allowHalfDay && (
                  <span className="text-xs text-muted-foreground">(not available)</span>
                )}
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-start" required>
                Start Date
              </Label>
              <Input
                id="leave-start"
                type="date"
                value={form.startDate}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-end" required>
                End Date
              </Label>
              <Input
                id="leave-end"
                type="date"
                value={form.endDate}
                required
                min={form.startDate || undefined}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea
              id="leave-reason"
              value={form.reason}
              placeholder="Provide any details that will help the approver"
              maxLength={1000}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </div>

          {(previewLoading || preview) && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              {previewLoading ? (
                <p className="text-muted-foreground">Calculating working days and balance...</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      <span className="text-muted-foreground">Working days: </span>
                      <span className="font-semibold">{formatDays(preview.totalDays)}</span>
                    </span>
                    {preview.leaveType && (
                      <Badge variant="outline">
                        {preview.leaveType.isPaid === false ? 'Unpaid' : 'Paid'}
                      </Badge>
                    )}
                    {preview.leaveType?.requiresApproval === false && (
                      <Badge variant="secondary">Auto-approved</Badge>
                    )}
                  </div>

                  {Array.isArray(preview.balances) && preview.balances.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {preview.balances.map((balance) => {
                        const requested = Number(preview.daysByYear?.[balance.year] || 0);
                        return (
                          <div key={balance.year} className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span className="font-medium">{balance.year}:</span>
                            <span>Requested {formatDays(requested)}</span>
                            <span>Available {formatDays(balance.available)}</span>
                            <span>Used {formatDays(balance.used)}</span>
                            <span>Pending {formatDays(balance.pending)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Array.isArray(preview.excluded) && preview.excluded.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {preview.excluded.length} non-working day(s) excluded (weekends/holidays).
                    </p>
                  )}

                  {Array.isArray(preview.issues) && preview.issues.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-destructive">
                      {preview.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </form>
      </Modal>

      {/* Details */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Leave Request Details"
        size="lg"
        footer={
          viewing ? (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing.status === 'pending' && access?.canApprove && !isOwner(viewing) && (
                <>
                  <Button variant="outline" onClick={() => openReview(viewing, 'reject')}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button onClick={() => openReview(viewing, 'approve')}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                </>
              )}
              {viewing.status === 'pending' && (isOwner(viewing) || access?.canEditLeave) && (
                <Button variant="outline" onClick={() => openEdit(viewing)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
              {['pending', 'approved'].includes(viewing.status) && (isOwner(viewing) || access?.canViewAll) && (
                <Button variant="outline" onClick={() => openReview(viewing, 'cancel')}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              )}
              {(access?.canDeleteLeave || (isOwner(viewing) && ['pending', 'cancelled', 'rejected'].includes(viewing.status))) && (
                <Button
                  variant="destructive"
                  disabled={deleting === viewing._id}
                  onClick={() => handleDelete(viewing)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </>
          ) : null
        }
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-yellow text-sm font-semibold text-brand-charcoal">
                  {initials(viewing.employee?.name)}
                </div>
                <div>
                  <div className="font-semibold">{viewing.employee?.name || '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {viewing.employee?.employee_id || '—'}
                    {viewing.employee?.department_id?.name
                      ? ` • ${viewing.employee.department_id.name}`
                      : ''}
                    {viewing.employee?.designation_id?.name
                      ? ` • ${viewing.employee.designation_id.name}`
                      : ''}
                  </div>
                </div>
              </div>
              <StatusBadge status={viewing.status} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Leave Type">
                <TypeBadge leaveType={viewing.leaveType} payment />
              </Detail>
              <Detail label="Dates">{formatDateRange(viewing.startDate, viewing.endDate)}</Detail>
              <Detail label="Working Days">
                {formatDays(viewing.totalDays)}
                {viewing.halfDay ? ' (half day)' : ''}
              </Detail>
              <Detail label="Applied On">{formatDateTime(viewing.createdAt)}</Detail>
              <Detail label="Applied By">{viewing.appliedBy?.name || '—'}</Detail>
              <Detail label="Reviewed By">
                {viewing.approvedBy?.name
                  ? `${viewing.approvedBy.name} • ${formatDateTime(viewing.approvedAt)}`
                  : '—'}
              </Detail>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Reason</div>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {viewing.cancelledBy?.name || '—'} • {formatDateTime(viewing.cancelledAt)}
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 text-sm font-medium">Status History</div>
              <div className="space-y-3 border-l-2 pl-4">
                {(viewing.statusHistory || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No history recorded.</p>
                ) : (
                  [...viewing.statusHistory]
                    .sort((a, b) => new Date(b.at) - new Date(a.at))
                    .map((entry, index) => (
                      <div key={index} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={entry.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.at)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-sm">
                          {entry.by?.name || entry.byName || 'System'}
                          {entry.note ? ` — ${entry.note}` : ''}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve / reject / cancel */}
      <Modal
        open={Boolean(review)}
        onClose={() => setReview(null)}
        title={
          review?.action === 'approve'
            ? 'Approve Leave Request'
            : review?.action === 'reject'
              ? 'Reject Leave Request'
              : 'Cancel Leave Request'
        }
        description={
          review?.leave
            ? `${review.leave.employee?.name || 'Employee'} • ${formatDateRange(
                review.leave.startDate,
                review.leave.endDate
              )} • ${formatDays(review.leave.totalDays)} day(s)`
            : ''
        }
        size="sm"
        closeDisabled={reviewSaving}
        footer={
          <>
            <Button variant="outline" onClick={() => setReview(null)} disabled={reviewSaving}>
              Back
            </Button>
            <Button
              variant={review?.action === 'reject' ? 'destructive' : 'default'}
              onClick={submitReview}
              disabled={reviewSaving}
            >
              {reviewSaving
                ? 'Saving...'
                : review?.action === 'approve'
                  ? 'Approve'
                  : review?.action === 'reject'
                    ? 'Reject'
                    : 'Cancel Leave'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {reviewError && <ErrorBanner message={reviewError} />}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-note" required={review?.action === 'reject'}>
              {review?.action === 'approve'
                ? 'Note (optional)'
                : review?.action === 'reject'
                  ? 'Rejection Reason'
                  : 'Cancellation Reason (optional)'}
            </Label>
            <Textarea
              id="review-note"
              value={reviewNote}
              maxLength={500}
              placeholder={
                review?.action === 'reject'
                  ? 'Explain why this request is being rejected'
                  : 'Add an optional note'
              }
              onChange={(event) => setReviewNote(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Approving updates the employee&apos;s leave balance immediately. Rejecting or cancelling
            releases any reserved days.
          </p>
        </div>
      </Modal>
    </PageTemplate>
  );
}

function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
