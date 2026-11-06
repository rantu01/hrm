'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Play,
  FileText,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Modal, useDebouncedValue } from '@/components/leave/leave-shared';
import {
  MonthStrip,
  DataPagination,
  PayrollStatusBadge,
  ErrorBanner,
  SuccessBanner,
  EmptyState,
  PageLoading,
  formatCurrency,
  formatDate,
  formatDateRange,
  toDateInput,
} from '@/components/payroll/payroll-shared';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' },
];

function currentMonthStart() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function lastDayOfMonth(dateString) {
  const date = new Date(dateString);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  );
  return last.toISOString().slice(0, 10);
}

function monthDefaults(selectedDate) {
  const start = dateString(selectedDate);
  const monthStart = `${start.slice(0, 7)}-01`;
  const end = lastDayOfMonth(monthStart);
  return {
    payPeriodStart: monthStart,
    payPeriodEnd: end,
    payDate: end,
  };
}

function dateString(value) {
  if (!value) return currentMonthStart();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return currentMonthStart();
  return date.toISOString().slice(0, 10);
}

const emptyForm = {
  id: null,
  title: '',
  payrollFrequency: 'monthly',
  payPeriodStart: '',
  payPeriodEnd: '',
  payDate: '',
  notes: '',
};

export default function PayrollRunsPage() {
  const router = useRouter();

  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [statusCounts, setStatusCounts] = useState({});
  const [months, setMonths] = useState([]);
  const [selectedDate, setSelectedDate] = useState(currentMonthStart);
  const [monthLabel, setMonthLabel] = useState('');
  const [access, setAccess] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField] = useState('created_at');
  const [sortDirection] = useState('desc');

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        selected_date: selectedDate,
        status,
        sort_field: sortField,
        sort_direction: sortDirection,
      });
      if (debouncedSearch.trim()) sp.set('search', debouncedSearch.trim());

      const response = await fetch(`/api/payroll/runs?${sp.toString()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load payroll runs');

      setRuns(data.runs || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      setStatusCounts(data.statusCounts || {});
      setMonths(data.months || []);
      setMonthLabel(data.monthLabel || '');
      setAccess(data.access || null);
    } catch (fetchError) {
      setError(fetchError.message);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, selectedDate, status, debouncedSearch, sortField, sortDirection]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, status, selectedDate, perPage]);

  function openCreate() {
    const defaults = monthDefaults(selectedDate);
    setForm({
      ...emptyForm,
      ...defaults,
      title: '',
    });
    setFormError('');
    setModal({ mode: 'create' });
  }

  function openEdit(run) {
    setForm({
      id: run._id,
      title: run.title || '',
      payrollFrequency: run.payrollFrequency || 'monthly',
      payPeriodStart: toDateInput(run.payPeriodStart),
      payPeriodEnd: toDateInput(run.payPeriodEnd),
      payDate: toDateInput(run.payDate),
      notes: run.notes || '',
    });
    setFormError('');
    setModal({ mode: 'edit' });
  }

  async function saveRun(event) {
    event.preventDefault();
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Payroll run title is required.');
      return;
    }
    if (!form.payPeriodStart || !form.payPeriodEnd || !form.payDate) {
      setFormError('Pay period and pay date are required.');
      return;
    }
    if (form.payPeriodEnd <= form.payPeriodStart) {
      setFormError('Pay period end must be after the pay period start.');
      return;
    }
    if (form.payDate < form.payPeriodEnd) {
      setFormError('Pay date must be on or after the pay period end.');
      return;
    }

    setBusy('saving');
    try {
      const isEdit = modal?.mode === 'edit';
      const response = await fetch(
        isEdit ? `/api/payroll/runs/${form.id}` : '/api/payroll/runs',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title.trim(),
            payrollFrequency: form.payrollFrequency,
            payPeriodStart: form.payPeriodStart,
            payPeriodEnd: form.payPeriodEnd,
            payDate: form.payDate,
            notes: form.notes,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save payroll run');

      setModal(null);
      setSuccess(data.message || 'Payroll run saved successfully.');
      await fetchRuns();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setBusy('');
    }
  }

  async function executeAction() {
    if (!confirm) return;
    const { kind, run } = confirm;
    setBusy(`${kind}-${run._id}`);
    setError('');
    try {
      let response;
      if (kind === 'process') {
        response = await fetch(`/api/payroll/runs/${run._id}/process`, {
          method: 'POST',
        });
      } else if (kind === 'generate') {
        response = await fetch('/api/payroll/payslips/bulk-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payrollRunId: run._id }),
        });
      } else if (kind === 'delete') {
        response = await fetch(`/api/payroll/runs/${run._id}`, {
          method: 'DELETE',
        });
      } else {
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Action failed');

      setSuccess(data.message || 'Action completed successfully.');
      setConfirm(null);
      await fetchRuns();
    } catch (actionError) {
      setError(actionError.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  }

  function handleYearChange(year) {
    const date = new Date(selectedDate);
    const month = date.getUTCMonth() + 1;
    setSelectedDate(`${year}-${String(month).padStart(2, '0')}-01`);
  }

  const actionDefinitions = {
    process: {
      title: 'Process Payroll Run',
      description:
        'Payroll will be calculated for all active employees using their salary structure, attendance, approved leave, holidays and overtime. This action cannot be undone automatically, but the run returns to draft if an entry is removed later.',
      confirmLabel: 'Process Payroll',
      destructive: false,
    },
    generate: {
      title: 'Generate Payslips',
      description:
        'Payslips will be generated for every employee in this completed payroll run. Payslips that already exist will be skipped.',
      confirmLabel: 'Generate Payslips',
      destructive: false,
    },
    delete: {
      title: 'Delete Payroll Run',
      description:
        'This draft payroll run and all of its entries and payslips will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete Run',
      destructive: true,
    },
  };

  const selectedConfirmMeta = confirm ? actionDefinitions[confirm.kind] : null;

  return (
    <PageTemplate
      title="Payroll Runs"
      description="Create, process and finalise payroll for your employees."
      noPadding
      actions={[
        ...(access?.canCreateRuns
          ? [
              {
                label: 'New Payroll Run',
                icon: <Plus className="h-4 w-4" />,
                onClick: openCreate,
                variant: 'default',
              },
            ]
          : []),
      ]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{monthLabel || 'Payroll'}</h2>
            <p className="text-xs text-muted-foreground">
              Browse payroll runs by pay period month.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchRuns}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <MonthStrip
          months={months}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onYearChange={handleYearChange}
        />

        <ErrorBanner message={error} onClose={() => setError('')} />
        <SuccessBanner message={success} onClose={() => setSuccess('')} />

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1">
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value;
                const count = statusCounts[tab.value] || 0;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatus(tab.value)}
                    className={
                      active
                        ? 'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                        : 'rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  >
                    {tab.label}
                    <span
                      className={
                        active
                          ? 'ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]'
                          : 'ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]'
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search run title or notes…"
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <PageLoading label="Loading payroll runs…" />
          ) : runs.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No payroll runs found"
                description="Create a payroll run for this month to start calculating salaries from employee salary structures and attendance records."
                action={
                  access?.canCreateRuns ? (
                    <Button type="button" onClick={openCreate} className="mt-2">
                      <Plus className="h-4 w-4" />
                      New Payroll Run
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Payroll Run</TableHead>
                      <TableHead className="hidden md:table-cell">Pay Period</TableHead>
                      <TableHead className="hidden lg:table-cell">Pay Date</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[160px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => {
                      const canEdit = run.status === 'draft' && access?.canEditRuns;
                      const canProcess = run.status === 'draft' && access?.canProcessRuns;
                      const canGenerate =
                        run.status === 'completed' && access?.canGeneratePayslips;
                      const canDelete = run.status === 'draft' && access?.canDeleteRuns;
                      return (
                        <TableRow key={run._id}>
                          <TableCell>
                            <div className="font-medium">{run.title}</div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs capitalize text-muted-foreground">
                              <span>{run.payrollFrequency}</span>
                              <span className="md:hidden">
                                · {formatDateRange(run.payPeriodStart, run.payPeriodEnd)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {formatDateRange(run.payPeriodStart, run.payPeriodEnd)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {formatDate(run.payDate)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {run.employeeCount || 0}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(run.totalNetPay)}
                          </TableCell>
                          <TableCell>
                            <PayrollStatusBadge status={run.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="View payroll run"
                                onClick={() => router.push(`/payroll/runs/${run._id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Edit payroll run"
                                  onClick={() => openEdit(run)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canProcess && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-emerald-600"
                                  title="Process payroll"
                                  disabled={busy === `process-${run._id}`}
                                  onClick={() =>
                                    setConfirm({ kind: 'process', run })
                                  }
                                >
                                  {busy === `process-${run._id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {canGenerate && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-blue-600"
                                  title="Generate payslips"
                                  disabled={busy === `generate-${run._id}`}
                                  onClick={() =>
                                    setConfirm({ kind: 'generate', run })
                                  }
                                >
                                  {busy === `generate-${run._id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-rose-600"
                                  title="Delete payroll run"
                                  onClick={() =>
                                    setConfirm({ kind: 'delete', run })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <DataPagination
                pagination={pagination}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemLabel="runs"
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(modal)}
        title={modal?.mode === 'edit' ? 'Edit Payroll Run' : 'New Payroll Run'}
        description="Define the pay period, pay date and frequency for this payroll cycle."
        onClose={() => (busy === 'saving' ? null : setModal(null))}
        size="lg"
        closeDisabled={busy === 'saving'}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal(null)}
              disabled={busy === 'saving'}
            >
              Cancel
            </Button>
            <Button type="submit" form="payroll-run-form" disabled={busy === 'saving'}>
              {busy === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {modal?.mode === 'edit' ? 'Save Changes' : 'Create Payroll Run'}
            </Button>
          </>
        }
      >
        <form id="payroll-run-form" className="space-y-4" onSubmit={saveRun}>
          {formError && <ErrorBanner message={formError} />}

          <div className="space-y-1.5">
            <Label htmlFor="run-title">Title</Label>
            <Input
              id="run-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Monthly Payroll"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="run-frequency">Payroll Frequency</Label>
            <select
              id="run-frequency"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.payrollFrequency}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payrollFrequency: event.target.value,
                }))
              }
            >
              {FREQUENCIES.map((frequency) => (
                <option key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="period-start">Pay Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={form.payPeriodStart}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    payPeriodStart: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">Pay Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={form.payPeriodEnd}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    payPeriodEnd: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Pay Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={form.payDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, payDate: event.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="run-notes">Notes</Label>
            <Textarea
              id="run-notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Optional notes for this payroll cycle…"
              rows={3}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirm)}
        title={selectedConfirmMeta?.title || 'Confirm action'}
        description={selectedConfirmMeta?.description}
        onClose={() => (busy ? null : setConfirm(null))}
        closeDisabled={Boolean(busy)}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={Boolean(busy)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={selectedConfirmMeta?.destructive ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={Boolean(busy)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {selectedConfirmMeta?.confirmLabel || 'Confirm'}
            </Button>
          </>
        }
      >
        {confirm?.run && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{confirm.run.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateRange(confirm.run.payPeriodStart, confirm.run.payPeriodEnd)} ·
              Pay date {formatDate(confirm.run.payDate)}
            </p>
          </div>
        )}
      </Modal>
    </PageTemplate>
  );
}
