'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Clock,
  Download,
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
import {
  PageLoading,
  EmptyState,
  ErrorBanner,
  SummaryCard,
  Avatar,
  PayslipStatusBadge,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateRange,
} from '@/components/payroll/payroll-shared';

function MiniRow({ label, value, strong = false, tone }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-dashed py-1.5 text-xs last:border-0 ${
        strong ? 'font-semibold' : ''
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          tone === 'danger'
            ? 'font-semibold text-rose-600'
            : tone === 'success'
              ? 'font-semibold text-emerald-600'
              : strong
                ? 'font-semibold'
                : ''
        }
      >
        {value}
      </span>
    </div>
  );
}

const ATTENDANCE_STYLES = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  absent: 'bg-rose-50 text-rose-700 border-rose-200',
  'half-day': 'bg-blue-50 text-blue-700 border-blue-200',
  leave: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function EmployeePayrollCalculationPage() {
  const params = useParams();
  const router = useRouter();
  const salaryId = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');

  const fetchData = useCallback(
    async (payrollRunId = '') => {
      if (!salaryId) return;
      setLoading(true);
      setError('');
      try {
        const sp = new URLSearchParams();
        if (payrollRunId) sp.set('payroll_run_id', payrollRunId);
        const response = await fetch(
          `/api/payroll/employee-salaries/${salaryId}/calculation${
            sp.toString() ? `?${sp.toString()}` : ''
          }`,
          { cache: 'no-store' }
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Unable to load payroll calculation');
        }
        setData(payload);
        setSelectedRunId(
          payload.selectedPayrollRun
            ? String(payload.selectedPayrollRun._id)
            : ''
        );
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    },
    [salaryId]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const employee = data?.salary?.employee || {};
  const entry = data?.payrollEntry;
  const summary = data?.attendanceSummary;
  const calculation = data?.payrollCalculation;
  const runs = data?.payrollRuns || [];

  const earnings = entry
    ? [
        ...(data?.salaryBreakdown?.earnings || []),
        ...(Number(entry.overtimeAmount) > 0
          ? [{ name: 'Overtime', amount: entry.overtimeAmount }]
          : []),
      ]
    : [];

  const deductions = entry
    ? [
        ...(Number(entry.lopDeduction) > 0
          ? [{ name: 'Loss of Pay (LOP)', amount: entry.lopDeduction }]
          : []),
        ...(Number(entry.unpaidLeaveDeduction) > 0
          ? [{ name: 'Unpaid Leave', amount: entry.unpaidLeaveDeduction }]
          : []),
        ...(data?.salaryBreakdown?.deductions || []),
      ]
    : [];

  if (loading && !data) {
    return (
      <PageTemplate title="Payroll Calculation" noPadding>
        <PageLoading label="Calculating payroll details…" />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Payroll Calculation"
      description={
        employee.name
          ? `${employee.name}${employee.employee_id ? ` · ${employee.employee_id}` : ''}`
          : 'Employee salary and payroll breakdown'
      }
      noPadding
      actions={[
        {
          label: 'Back to Employee Salaries',
          icon: <ArrowLeft className="h-4 w-4" />,
          onClick: () => router.push('/payroll/employee-salaries'),
          variant: 'outline',
        },
      ]}
    >
      <div className="space-y-4">
        <ErrorBanner message={error} onClose={() => setError('')} />

        {!data ? (
          <EmptyState
            title="Calculation unavailable"
            description="The employee salary record could not be loaded."
          />
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={employee.name} src={employee.profile_image} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{employee.name || 'Employee'}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.employee_id || '—'} · {employee.email || 'No email'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Basic Salary
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(data.salary?.basicSalary)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border px-2 py-0.5 capitalize">
                    {employee.employee_status || 'active'}
                  </span>
                  <span className="rounded-full border px-2 py-0.5">
                    {(data.salary?.components || []).length} component
                    {(data.salary?.components || []).length === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full border px-2 py-0.5">
                    Salary {data.salary?.isActive === false ? 'inactive' : 'active'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Payroll Run</h2>
                </div>
                {runs.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    This employee has not been included in a processed payroll run yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedRunId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedRunId(value);
                        fetchData(value);
                      }}
                    >
                      {runs.map((run) => (
                        <option key={run._id} value={run._id}>
                          {run.title} · {formatDateRange(run.payPeriodStart, run.payPeriodEnd)}
                        </option>
                      ))}
                    </select>
                    {data.selectedPayrollRun && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Pay date {formatDate(data.selectedPayrollRun.payDate)}</span>
                        <span className="capitalize">
                          {data.selectedPayrollRun.status}
                        </span>
                      </div>
                    )}
                    {data.payslip && (
                      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {data.payslip.payslipNumber}
                          </p>
                          <PayslipStatusBadge status={data.payslip.status} />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              `/api/payroll/payslips/${data.payslip._id}/download`,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                          Payslip
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!entry ? (
              <EmptyState
                title="No payroll entry for this employee"
                description="Process a payroll run that includes this employee to see the full salary calculation, attendance deductions and net pay."
                action={
                  <Button
                    type="button"
                    className="mt-2"
                    onClick={() => router.push('/payroll/runs')}
                  >
                    Go to Payroll Runs
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Gross Pay"
                    value={formatCurrency(entry.grossPay)}
                    hint="After attendance adjustments"
                    icon={TrendingUp}
                    tone="success"
                  />
                  <SummaryCard
                    label="Deductions"
                    value={formatCurrency(
                      (Number(entry.totalDeductions) || 0) +
                        (Number(entry.lopDeduction) || 0) +
                        (Number(entry.unpaidLeaveDeduction) || 0)
                    )}
                    hint="LOP, leave and components"
                    icon={TrendingDown}
                    tone="danger"
                  />
                  <SummaryCard
                    label="Net Pay"
                    value={formatCurrency(entry.netPay)}
                    hint="Amount payable"
                    icon={TakaIcon}
                    tone="default"
                  />
                  <SummaryCard
                    label="Paid / Working Days"
                    value={`${formatNumber(entry.presentDays)} / ${formatNumber(entry.workingDays)}`}
                    hint={`${formatNumber(entry.lopDays)} LOP day(s)`}
                    icon={CalendarDays}
                    tone="info"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 className="text-sm font-semibold">Earnings</h2>
                    <div className="mt-2">
                      {earnings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No earnings recorded.
                        </p>
                      ) : (
                        earnings.map((item, index) => (
                          <MiniRow
                            key={`${item.name}-${index}`}
                            label={item.name}
                            value={formatCurrency(item.amount)}
                            tone="success"
                          />
                        ))
                      )}
                      <MiniRow
                        label="Total Earnings"
                        value={formatCurrency(
                          (Number(calculation?.totalEarnings) || 0) +
                            (Number(entry.overtimeAmount) || 0)
                        )}
                        strong
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 className="text-sm font-semibold">Deductions</h2>
                    <div className="mt-2">
                      {deductions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No deductions recorded.
                        </p>
                      ) : (
                        deductions.map((item, index) => (
                          <MiniRow
                            key={`${item.name}-${index}`}
                            label={item.name}
                            value={formatCurrency(item.amount)}
                            tone="danger"
                          />
                        ))
                      )}
                      <MiniRow
                        label="Total Deductions"
                        value={formatCurrency(
                          (Number(entry.totalDeductions) || 0) +
                            (Number(entry.lopDeduction) || 0) +
                            (Number(entry.unpaidLeaveDeduction) || 0)
                        )}
                        strong
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 className="text-sm font-semibold">Attendance Summary</h2>
                    <div className="mt-2">
                      <MiniRow
                        label="Working Days"
                        value={formatNumber(summary?.totalWorkingDays)}
                      />
                      <MiniRow
                        label="Present Days"
                        value={formatNumber(summary?.presentDays)}
                      />
                      <MiniRow
                        label="Paid Leave"
                        value={formatNumber(summary?.paidLeaveDays)}
                      />
                      <MiniRow
                        label="Unpaid Leave"
                        value={formatNumber(summary?.unpaidLeaveDays)}
                      />
                      <MiniRow
                        label="Holidays"
                        value={formatNumber(summary?.holidayDays)}
                      />
                      <MiniRow
                        label="Half Days"
                        value={formatNumber(summary?.halfDays)}
                      />
                      <MiniRow
                        label="Absent Days"
                        value={formatNumber(summary?.absentDays)}
                      />
                      <MiniRow
                        label="LOP Days"
                        value={formatNumber(summary?.lopDays)}
                        tone="danger"
                      />
                      <MiniRow
                        label="Overtime"
                        value={`${formatNumber(summary?.overtimeHours)}h · ${formatCurrency(summary?.overtimeAmount)}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">Salary Calculation</h2>
                      <p className="text-xs text-muted-foreground">
                        Formula: Net Pay = Gross Pay − Component Deductions
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-right">
                      <p className="text-[10px] uppercase tracking-wide text-primary">
                        Net Pay
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        {formatCurrency(entry.netPay)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Basic Salary
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatCurrency(entry.basicSalary)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Per-Day Salary
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatCurrency(entry.perDaySalary)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        LOP Deduction
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rose-600">
                        {formatCurrency(entry.lopDeduction)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Unpaid Leave Deduction
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rose-600">
                        {formatCurrency(entry.unpaidLeaveDeduction)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p>
                      Effective paid days: {formatNumber(entry.effectivePaidDays)} · Gross
                      pay: {formatCurrency(entry.grossPay)} · Component deductions:{' '}
                      {formatCurrency(entry.totalDeductions)} · Overtime:{' '}
                      {formatNumber(entry.overtimeHours)}h (
                      {formatCurrency(entry.overtimeAmount)})
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b p-4">
                    <div>
                      <h2 className="text-sm font-semibold">Attendance Records</h2>
                      <p className="text-xs text-muted-foreground">
                        Records used for this pay period.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {(data.attendanceRecords || []).length} record
                      {(data.attendanceRecords || []).length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {(data.attendanceRecords || []).length === 0 ? (
                    <div className="p-4">
                      <EmptyState
                        title="No attendance records"
                        description="No attendance was recorded for this period. Payroll assumes full attendance minus approved leave and holidays."
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Work Hours</TableHead>
                            <TableHead className="text-right">Overtime</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.attendanceRecords.map((record) => (
                            <TableRow key={record._id}>
                              <TableCell className="text-sm">
                                {formatDate(record.date)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                                    ATTENDANCE_STYLES[record.status] ||
                                    'border-slate-200 bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatNumber(record.workHours)}h
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatNumber(record.overtimeHours)}h ·{' '}
                                {formatCurrency(record.overtimeAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PageTemplate>
  );
}
