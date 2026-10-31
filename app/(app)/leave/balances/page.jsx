'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  FilterX,
  Pencil,
  Trash2,
  Wallet,
  CalendarRange,
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
import { Textarea } from '@/components/ui/textarea';
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
  Modal,
  StatCard,
  formatDays,
  useDebouncedValue,
} from '@/components/leave/leave-shared';

const EMPTY_FORM = {
  employee: '',
  leaveType: '',
  year: '',
  allocated: '0',
  carryForward: '0',
  adjustment: '0',
  notes: '',
};

export default function LeaveBalancesPage() {
  const [balances, setBalances] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [access, setAccess] = useState(null);

  const [year, setYear] = useState(() => String(new Date().getUTCFullYear()));
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [initializing, setInitializing] = useState(false);

  const currentYear = new Date().getUTCFullYear();
  const yearOptions = useMemo(
    () => [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String),
    [currentYear]
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      per_page: String(perPage),
      sort_field: sortField,
      sort_direction: sortDirection,
    });
    if (year) sp.set('year', year);
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (employeeFilter) sp.set('employee', employeeFilter);
    if (leaveTypeFilter) sp.set('leave_type', leaveTypeFilter);
    return sp.toString();
  }, [
    page,
    perPage,
    year,
    debouncedSearch,
    employeeFilter,
    leaveTypeFilter,
    sortField,
    sortDirection,
  ]);

  const fetchBalances = useCallback(async () => {
    if (!year) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/balances?${queryString}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load leave balances');
      setBalances(json.balances || []);
      setSummary(json.summary || {});
      setAccess(json.access || null);
      setTotal(json.pagination?.total || 0);
      setPages(json.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [queryString, year]);

  useEffect(() => {
    const timer = setTimeout(fetchBalances, 0);
    return () => clearTimeout(timer);
  }, [fetchBalances]);

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

  const canManage = Boolean(access?.canManageBalances);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      year: String(year || currentYear),
      allocated: '0',
    });
    setModalError('');
    setShowModal(true);
  }

  function openEdit(balance) {
    setEditing(balance);
    setForm({
      employee: String(balance.employee?._id || balance.employee || ''),
      leaveType: String(balance.leaveType?._id || balance.leaveType || ''),
      year: String(balance.year),
      allocated: String(balance.allocated ?? 0),
      carryForward: String(balance.carryForward ?? 0),
      adjustment: String(balance.adjustment ?? 0),
      notes: balance.notes || '',
    });
    setModalError('');
    setShowModal(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setModalError('');
    try {
      if (!form.employee) throw new Error('Please select an employee');
      if (!form.leaveType) throw new Error('Please select a leave type');
      if (!form.year) throw new Error('Please select a year');
      const payload = {
        employee: form.employee,
        leaveType: form.leaveType,
        year: Number(form.year),
        allocated: Number(form.allocated) || 0,
        carryForward: Number(form.carryForward) || 0,
        adjustment: Number(form.adjustment) || 0,
        notes: form.notes.trim() || null,
      };
      const res = await fetch(
        editing ? `/api/leave/balances/${editing._id}` : '/api/leave/balances',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to save leave balance');
      setShowModal(false);
      setNotice(json.message || 'Leave balance saved');
      fetchBalances();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(balance) {
    if (!window.confirm('Delete this leave balance record? Leave requests linked to it must be removed or adjusted first.')) {
      return;
    }
    setDeleting(balance._id);
    setError('');
    try {
      const res = await fetch(`/api/leave/balances/${balance._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete leave balance');
      setNotice(json.message || 'Leave balance deleted');
      fetchBalances();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleInitialize() {
    if (
      !window.confirm(
        `Create missing leave balance records for ${year} from each leave type's annual allocation? Existing balances are not changed.`
      )
    ) {
      return;
    }
    setInitializing(true);
    setError('');
    try {
      const res = await fetch('/api/leave/balances/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ year: Number(year) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to initialise leave balances');
      setNotice(json.message || 'Leave balances initialised');
      fetchBalances();
    } catch (err) {
      setError(err.message);
    } finally {
      setInitializing(false);
    }
  }

  function resetFilters() {
    setSearch('');
    setEmployeeFilter('');
    setLeaveTypeFilter('');
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

  const hasFilters = search || employeeFilter || leaveTypeFilter;
  const actions = canManage
    ? [
        {
          label: initializing ? 'Initialising...' : 'Initialize Year',
          variant: 'outline',
          icon: <RefreshCw className="h-4 w-4" />,
          disabled: initializing,
          onClick: handleInitialize,
        },
        {
          label: 'Allocate Leave',
          variant: 'default',
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreate,
        },
      ]
    : [];

  return (
    <PageTemplate
      title="Leave Balances"
      description="Track allocations, usage and pending reservations for every employee"
      actions={actions}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="Allocated Days"
            value={formatDays(summary.allocated || 0)}
            hint={`${summary.count || 0} balance record(s)`}
          />
          <StatCard
            icon={CalendarRange}
            label="Used Days"
            value={formatDays(summary.used || 0)}
            hint={`${formatDays(summary.pending || 0)} pending`}
            accent="blue"
          />
          <StatCard
            icon={RefreshCw}
            label="Carry / Adjustments"
            value={`${formatDays((summary.carryForward || 0) + (summary.adjustment || 0))}`}
            hint={`${formatDays(summary.carryForward || 0)} carry forward`}
            accent="violet"
          />
          <StatCard
            icon={Wallet}
            label="Available Days"
            value={formatDays(summary.available || 0)}
            hint="After approved and pending leave"
            accent="green"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={year || ''} onValueChange={(value) => {
            setYear(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[120px]">
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

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search employee..."
              className="pl-8"
            />
          </div>

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

          <Select value={String(perPage)} onValueChange={(value) => {
            setPerPage(Number(value));
            setPage(1);
          }}>
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

        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {notice && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <span>{notice}</span>
            <button
              type="button"
              className="cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => setNotice('')}
            >
              Dismiss
            </button>
          </div>
        )}

        {balances.length === 0 && !loading ? (
          <EmptyState
            icon={Wallet}
            title="No leave balances found"
            description={
              canManage
                ? `No balances exist for ${year}. Initialise the year to create default allocations for all active employees.`
                : 'No leave balance has been allocated for this year yet.'
            }
            action={
              canManage ? (
                <Button size="sm" className="mt-2" onClick={handleInitialize} disabled={initializing}>
                  <RefreshCw className="h-4 w-4" />
                  {initializing ? 'Initialising...' : `Initialize ${year}`}
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
                <TableHead>Year</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    onClick={() => toggleSort('allocated')}
                  >
                    Allocation
                    <span aria-hidden="true">
                      {sortField === 'allocated' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    onClick={() => toggleSort('used')}
                  >
                    Used
                    <span aria-hidden="true">
                      {sortField === 'used' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    onClick={() => toggleSort('pending')}
                  >
                    Pending
                    <span aria-hidden="true">
                      {sortField === 'pending' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </TableHead>
                <TableHead>Available</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    Loading leave balances...
                  </TableCell>
                </TableRow>
              ) : (
                balances.map((balance) => {
                  const available =
                    Number(balance.available) ||
                    (Number(balance.allocated) || 0) +
                      (Number(balance.carryForward) || 0) +
                      (Number(balance.adjustment) || 0) -
                      (Number(balance.used) || 0) -
                      (Number(balance.pending) || 0);
                  return (
                    <TableRow key={balance._id}>
                      <TableCell>
                        <div className="font-medium">{balance.employee?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {balance.employee?.employee_id || '—'}
                          {balance.employee?.department_id?.name
                            ? ` • ${balance.employee.department_id.name}`
                            : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/10"
                            style={{ backgroundColor: balance.leaveType?.color || '#FFEB00' }}
                          />
                          {balance.leaveType?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell>{balance.year}</TableCell>
                      <TableCell>
                        <div className="font-medium">{formatDays(balance.allocated)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDays(balance.carryForward)} carry • {formatDays(balance.adjustment)} adj.
                        </div>
                      </TableCell>
                      <TableCell>{formatDays(balance.used)}</TableCell>
                      <TableCell>{formatDays(balance.pending)}</TableCell>
                      <TableCell className="font-semibold">{formatDays(available)}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(balance)}>
                              <Pencil className="h-3.5 w-3.5" /> Adjust
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleting === balance._id}
                              onClick={() => handleDelete(balance)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * perPage + 1}–
            {Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </Button>
            <span>
              Page {page} of {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Adjust Leave Balance' : 'Allocate Leave'}
        description="Used and pending days are calculated automatically from leave requests."
        size="md"
        closeDisabled={saving}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="leave-balance-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Balance' : 'Create Balance'}
            </Button>
          </>
        }
      >
        <form id="leave-balance-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {modalError && <ErrorBanner message={modalError} />}

          {editing ? (
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Employee: </span>
                {editing.employee?.name || '—'}
              </div>
              <div>
                <span className="text-muted-foreground">Leave type: </span>
                {editing.leaveType?.name || '—'}
              </div>
              <div>
                <span className="text-muted-foreground">Year: </span>
                {editing.year}
              </div>
              <div>
                <span className="text-muted-foreground">Used: </span>
                {formatDays(editing.used)} • Pending: {formatDays(editing.pending)}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="balance-employee" required>
                  Employee
                </Label>
                <Select
                  value={form.employee || ''}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, employee: value }))}
                >
                  <SelectTrigger id="balance-employee">
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
                  <span className="text-xs text-destructive">No employees found.</span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="balance-type" required>
                    Leave Type
                  </Label>
                  <Select
                    value={form.leaveType || ''}
                    onValueChange={(value) => {
                      const type = leaveTypes.find((row) => String(row._id) === value);
                      setForm((prev) => ({
                        ...prev,
                        leaveType: value,
                        allocated: type ? String(type.annualAllocation ?? 0) : prev.allocated,
                      }));
                    }}
                  >
                    <SelectTrigger id="balance-type">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent searchable>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type._id} value={String(type._id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="balance-year" required>
                    Year
                  </Label>
                  <Select
                    value={form.year || ''}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, year: value }))}
                  >
                    <SelectTrigger id="balance-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="balance-allocated" required>
                Allocated
              </Label>
              <Input
                id="balance-allocated"
                type="number"
                min="0"
                step="0.5"
                value={form.allocated}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, allocated: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="balance-carry">Carry Forward</Label>
              <Input
                id="balance-carry"
                type="number"
                min="0"
                step="0.5"
                value={form.carryForward}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, carryForward: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="balance-adjustment">Adjustment (+/-)</Label>
              <Input
                id="balance-adjustment"
                type="number"
                step="0.5"
                value={form.adjustment}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, adjustment: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="balance-notes">Notes</Label>
            <Textarea
              id="balance-notes"
              value={form.notes}
              maxLength={500}
              placeholder="Reason for the allocation or adjustment"
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </PageTemplate>
  );
}
