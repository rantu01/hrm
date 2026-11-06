'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  TrendingDown,
  TrendingUp,
  Play,
  FileText,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  CalendarDays,
  Clock,
  Info,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { TakaIcon } from '@/components/taka-icon';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Modal } from '@/components/leave/leave-shared';
import {
  PayrollStatusBadge,
  PayslipStatusBadge,
  ErrorBanner,
  SuccessBanner,
  PageLoading,
  EmptyState,
  SummaryCard,
  Avatar,
  formatCurrency,
  formatDate,
  formatDateRange,
  formatNumber,
} from '@/components/payroll/payroll-shared';

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function BreakdownList({ title, items, emptyLabel, tone = 'default' }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-muted-foreground">{item.name}</span>
              <span
                className={
                  tone === 'danger'
                    ? 'font-medium text-rose-600'
                    : tone === 'success'
                      ? 'font-medium text-emerald-600'
                      : 'font-medium'
                }
              >
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function PayrollRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params?.id;

  const [run, setRun] = useState(null);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/payroll/runs/${runId}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load payroll run');
      setRun(data.run);
      setAccess(data.access || null);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRun();
  }, [fetchRun]);

  const actionMeta = {
    process: {
      title: 'Process Payroll Run',
      description:
        'Payroll will be calculated from each employee salary structure, attendance, approved leave, holidays and overtime. You can reprocess a draft run at any time.',
      confirmLabel: 'Process Payroll',
      destructive: false,
    },
    generate: {
      title: 'Generate Payslips',
      description:
        'Generate payslips for every employee in this completed run. Existing payslips are skipped.',
      confirmLabel: 'Generate Payslips',
      destructive: false,
    },
    deleteRun: {
      title: 'Delete Payroll Run',
      description:
        'This draft payroll run and all of its entries and payslips will be permanently deleted.',
      confirmLabel: 'Delete Run',
      destructive: true,
    },
    deleteEntry: {
      title: 'Delete Payroll Entry',
      description:
        'Deleting this employee entry removes its payslip and returns the payroll run to draft so it can be recalculated.',
      confirmLabel: 'Delete Entry',
      destructive: true,
    },
  };

  async function executeAction() {
    if (!confirm) return;
    const { kind, entryId } = confirm;
    setBusy(kind);
    setError('');
    try {
      let response;
      if (kind === 'process') {
        response = await fetch(`/api/payroll/runs/${runId}/process`, {
          method: 'POST',
        });
      } else if (kind === 'generate') {
        response = await fetch('/api/payroll/payslips/bulk-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payrollRunId: runId }),
        });
      } else if (kind === 'deleteRun') {
        response = await fetch(`/api/payroll/runs/${runId}`, { method: 'DELETE' });
      } else if (kind === 'deleteEntry') {
        response = await fetch(`/api/payroll/entries/${entryId}`, {
          method: 'DELETE',
        });
      } else {
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Action failed');

      setConfirm(null);
      if (kind === 'deleteRun') {
        router.push('/payroll/runs');
        return;
      }
      setSuccess(data.message || 'Action completed successfully.');
      await fetchRun();
    } catch (actionError) {
      setError(actionError.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  }

  if (loading && !run) {
    return (
      <PageTemplate title="Payroll Run" noPadding>
        <PageLoading label="Loading payroll run…" />
      </PageTemplate>
    );
  }

  if (!run) {
    return (
      <PageTemplate
        title="Payroll Run"
        noPadding
        actions={[
          {
            label: 'Back to Payroll Runs',
            icon: <ArrowLeft className="h-4 w-4" />,
            onClick: () => router.push('/payroll/runs'),
            variant: 'outline',
          },
        ]}
      >
        <div className="space-y-4">
          <ErrorBanner message={error || 'Payroll run not found'} />
          <EmptyState
            title="Payroll run unavailable"
            description="The payroll run may have been deleted, or you may not have access to it."
          />
        </div>
      </PageTemplate>
    );
  }

  const entries = run.entries || [];
  const confirmMeta = confirm ? actionMeta[confirm.kind] : null;

  return (
    <PageTemplate
      title={run.title}
      description={`${formatDateRange(run.payPeriodStart, run.payPeriodEnd)} · Pay date ${formatDate(run.payDate)}`}
      noPadding
      actions={[
        {
          label: 'Back',
          icon: <ArrowLeft className="h-4 w-4" />,
          onClick: () => router.push('/payroll/runs'),
          variant: 'outline',
        },
        ...(run.status === 'draft' && access?.canProcessRuns
          ? [
              {
                label: 'Process Payroll',
                icon: <Play className="h-4 w-4" />,
                onClick: () => setConfirm({ kind: 'process' }),
                variant: 'default',
              },
            ]
          : []),
        ...(run.status === 'completed' && access?.canGeneratePayslips
          ? [
              {
                label: 'Generate Payslips',
                icon: <FileText className="h-4 w-4" />,
                onClick: () => setConfirm({ kind: 'generate' }),
                variant: 'default',
              },
            ]
          : []),
        ...(run.status === 'draft' && access?.canDeleteRuns
          ? [
              {
                label: 'Delete Run',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => setConfirm({ kind: 'deleteRun' }),
                variant: 'destructive',
              },
            ]
          : []),
      ]}
    >
      <div className="space-y-4">
        <ErrorBanner message={error} onClose={() => setError('')} />
        <SuccessBanner message={success} onClose={() => setSuccess('')} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Employees"
            value={run.employeeCount || entries.length}
            hint="Processed in this run"
            icon={Users}
            tone="info"
          />
          <SummaryCard
            label="Gross Pay"
            value={formatCurrency(run.totalGrossPay)}
            hint="Before component deductions"
            icon={TrendingUp}
            tone="success"
          />
          <SummaryCard
            label="Total Deductions"
            value={formatCurrency(run.totalDeductions)}
            hint="Taxes, benefits and other deductions"
            icon={TrendingDown}
            tone="danger"
          />
          <SummaryCard
            label="Net Pay"
            value={formatCurrency(run.totalNetPay)}
            hint="Total amount payable"
            icon={TakaIcon}
            tone="default"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Run Information</h2>
                <p className="text-xs text-muted-foreground">
                  Payroll settings and lifecycle details.
                </p>
              </div>
              <PayrollStatusBadge status={run.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat label="Payroll Frequency" value={run.payrollFrequency} />
              <MiniStat
                label="Pay Period"
                value={formatDateRange(run.payPeriodStart, run.payPeriodEnd)}
              />
              <MiniStat label="Pay Date" value={formatDate(run.payDate)} />
              <MiniStat
                label="Created By"
                value={run.createdBy?.name || 'System'}
              />
              <MiniStat
                label="Processed"
                value={run.processedAt ? formatDate(run.processedAt) : 'Not processed'}
              />
              <MiniStat label="Entries" value={entries.length} />
            </div>
            {run.notes && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-line">{run.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Calculation Reference</h2>
            </div>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <p className="font-medium">Earnings</p>
                <p className="mt-1 rounded-md bg-muted/50 p-2 font-mono text-[11px]">
                  Basic + Components + Overtime
                </p>
              </div>
              <div>
                <p className="font-medium">Attendance Deductions</p>
                <p className="mt-1 rounded-md bg-muted/50 p-2 font-mono text-[11px]">
                  LOP = (Working Days − Paid Days) × Per-Day Salary
                </p>
              </div>
              <div>
                <p className="font-medium">Gross Pay</p>
                <p className="mt-1 rounded-md bg-muted/50 p-2 font-mono text-[11px]">
                  Earnings − LOP − Unpaid Leave + Overtime
                </p>
              </div>
              <div>
                <p className="font-medium">Net Pay</p>
                <p className="mt-1 rounded-md bg-primary/10 p-2 font-mono text-[11px] text-primary">
                  Gross Pay − Component Deductions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <div>
              <h2 className="text-sm font-semibold">Employee Payroll Entries</h2>
              <p className="text-xs text-muted-foreground">
                Expand an employee to see the attendance and salary breakdown.
              </p>
            </div>
            {run.status === 'draft' && access?.canProcessRuns && (
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirm({ kind: 'process' })}
              >
                <Play className="h-4 w-4" />
                Process Payroll
              </Button>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No payroll entries yet"
                description={
                  run.status === 'draft'
                    ? 'Process this payroll run to calculate salaries and generate entries for eligible employees.'
                    : 'No employees were included in this payroll run.'
                }
                action={
                  run.status === 'draft' && access?.canProcessRuns ? (
                    <Button
                      type="button"
                      className="mt-2"
                      onClick={() => setConfirm({ kind: 'process' })}
                    >
                      <Play className="h-4 w-4" />
                      Process Payroll
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="min-w-[200px]">Employee</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Worked
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      LOP
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Overtime
                    </TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="hidden lg:table-cell">Payslip</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const expanded = expandedEntry === entry._id;
                    const earnings = [
                      ...(entry.earningsBreakdown || []),
                      ...(Number(entry.overtimeAmount) > 0
                        ? [{ name: 'Overtime', amount: entry.overtimeAmount }]
                        : []),
                    ];
                    const deductions = [
                      ...(Number(entry.lopDeduction) > 0
                        ? [{ name: 'Loss of Pay (LOP)', amount: entry.lopDeduction }]
                        : []),
                      ...(Number(entry.unpaidLeaveDeduction) > 0
                        ? [
                            {
                              name: 'Unpaid Leave',
                              amount: entry.unpaidLeaveDeduction,
                            },
                          ]
                        : []),
                      ...(entry.deductionsBreakdown || []),
                    ];
                    return (
                      <FragmentRow
                        key={entry._id}
                        entry={entry}
                        expanded={expanded}
                        earnings={earnings}
                        deductions={deductions}
                        access={access}
                        onToggle={() =>
                          setExpandedEntry(expanded ? null : entry._id)
                        }
                        onDelete={() =>
                          setConfirm({ kind: 'deleteEntry', entryId: entry._id })
                        }
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(confirm)}
        title={confirmMeta?.title || 'Confirm action'}
        description={confirmMeta?.description}
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
              variant={confirmMeta?.destructive ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={Boolean(busy)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmMeta?.confirmLabel || 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {run.title} · {formatDateRange(run.payPeriodStart, run.payPeriodEnd)}
        </p>
      </Modal>
    </PageTemplate>
  );
}

function FragmentRow({
  entry,
  expanded,
  earnings,
  deductions,
  access,
  onToggle,
  onDelete,
}) {
  const employee = entry.employee || {};
  return (
    <>
      <TableRow className="align-top">
        <TableCell className="pt-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse entry' : 'Expand entry'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2.5">
            <Avatar name={employee.name} src={employee.profile_image} />
            <div>
              <p className="text-sm font-medium">{employee.name || 'Employee'}</p>
              <p className="text-xs text-muted-foreground">
                {employee.employee_id || '—'}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden text-right text-sm sm:table-cell">
          {formatNumber(entry.presentDays)} / {formatNumber(entry.workingDays)}
        </TableCell>
        <TableCell className="hidden text-right text-sm md:table-cell">
          {formatNumber(entry.lopDays)}
        </TableCell>
        <TableCell className="hidden text-right text-sm md:table-cell">
          {formatNumber(entry.overtimeHours)}h
        </TableCell>
        <TableCell className="text-right text-sm">
          {formatCurrency(entry.grossPay)}
        </TableCell>
        <TableCell className="text-right text-sm font-semibold">
          {formatCurrency(entry.netPay)}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {entry.payslip ? (
            <div className="space-y-1">
              <PayslipStatusBadge status={entry.payslip.status} />
              <p className="text-[10px] text-muted-foreground">
                {entry.payslip.payslipNumber}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Not generated</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {entry.payslip && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Download payslip"
                onClick={() =>
                  window.open(
                    `/api/payroll/payslips/${entry.payslip._id}/download`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {access?.canDeleteRuns && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-rose-600"
                title="Delete entry"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={9} className="p-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <BreakdownList
                title="Earnings"
                items={earnings}
                emptyLabel="No earnings recorded"
                tone="success"
              />
              <BreakdownList
                title="Deductions"
                items={deductions}
                emptyLabel="No deductions"
                tone="danger"
              />
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Attendance
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">Working Days</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.workingDays)}
                  </span>
                  <span className="text-muted-foreground">Present Days</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.presentDays)}
                  </span>
                  <span className="text-muted-foreground">Paid Leave</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.paidLeaveDays)}
                  </span>
                  <span className="text-muted-foreground">Unpaid Leave</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.unpaidLeaveDays)}
                  </span>
                  <span className="text-muted-foreground">Holidays</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.holidayDays)}
                  </span>
                  <span className="text-muted-foreground">Half Days</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.halfDays)}
                  </span>
                  <span className="text-muted-foreground">Absent Days</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.absentDays)}
                  </span>
                  <span className="text-muted-foreground">LOP Days</span>
                  <span className="text-right font-medium text-rose-600">
                    {formatNumber(entry.lopDays)}
                  </span>
                  <span className="text-muted-foreground">Overtime</span>
                  <span className="text-right font-medium">
                    {formatNumber(entry.overtimeHours)}h ·{' '}
                    {formatCurrency(entry.overtimeAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label="Basic Salary"
                value={formatCurrency(entry.basicSalary)}
              />
              <MiniStat
                label="Per-Day Salary"
                value={formatCurrency(entry.perDaySalary)}
              />
              <MiniStat
                label="LOP Deduction"
                value={formatCurrency(entry.lopDeduction)}
              />
              <MiniStat
                label="Unpaid Leave Deduction"
                value={formatCurrency(entry.unpaidLeaveDeduction)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Effective paid days: {formatNumber(entry.effectivePaidDays)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Overtime: {formatNumber(entry.overtimeHours)}h (
                {formatCurrency(entry.overtimeAmount)})
              </span>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
