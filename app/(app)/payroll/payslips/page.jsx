'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Eye,
  Download,
  RefreshCw,
  CalendarDays,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { TakaIcon } from '@/components/taka-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  PayslipStatusBadge,
  ErrorBanner,
  PageLoading,
  EmptyState,
  Avatar,
  SummaryCard,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateRange,
} from '@/components/payroll/payroll-shared';

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'generated', label: 'Generated' },
  { value: 'sent', label: 'Sent' },
  { value: 'downloaded', label: 'Downloaded' },
];

function MoneyRow({ label, value, strong = false, tone }) {
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

function AttendancePair({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed py-1.5 text-xs last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    generated: 0,
    sent: 0,
    downloaded: 0,
  });
  const [employees, setEmployees] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthLabel, setMonthLabel] = useState('');
  const [access, setAccess] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [viewPayslip, setViewPayslip] = useState(null);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        selected_month: selectedMonth,
        status,
      });
      if (debouncedSearch.trim()) sp.set('search', debouncedSearch.trim());
      if (employeeFilter !== 'all') sp.set('employee_id', employeeFilter);

      const response = await fetch(`/api/payroll/payslips?${sp.toString()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to load payslips');
      }
      setPayslips(data.payslips || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      setStatusCounts(
        data.statusCounts || { all: 0, generated: 0, sent: 0, downloaded: 0 }
      );
      setEmployees(data.employees || []);
      setMonths(data.months || []);
      setMonthLabel(data.monthLabel || '');
      setAccess(data.access || null);
    } catch (fetchError) {
      setError(fetchError.message);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, selectedMonth, status, debouncedSearch, employeeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayslips();
  }, [fetchPayslips]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, status, selectedMonth, employeeFilter, perPage]);

  function handleYearChange(year) {
    const month = selectedMonth.slice(5, 7);
    setSelectedMonth(`${year}-${month}`);
  }

  function downloadPayslip(payslip) {
    window.open(
      `/api/payroll/payslips/${payslip._id}/download`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  const selectedDate = `${selectedMonth}-01`;
  const entry = viewPayslip?.payrollEntry;
  const employee = viewPayslip?.employee || entry?.employee || {};

  const earnings = entry
    ? [
        ...(entry.earningsBreakdown || []),
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
        ...(entry.deductionsBreakdown || []),
      ]
    : [];
  const totalEarnings = earnings.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const totalDeductions = deductions.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const isManager = Boolean(access?.canViewAllPayslips);

  return (
    <PageTemplate
      title="Payslips"
      description={
        isManager
          ? 'View, download and track employee payslips generated from payroll runs.'
          : 'View and download your payslips.'
      }
      noPadding
      actions={[
        {
          label: 'Refresh',
          icon: <RefreshCw className="h-4 w-4" />,
          onClick: fetchPayslips,
          variant: 'outline',
          disabled: loading,
        },
      ]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{monthLabel || 'Payslips'}</h2>
            <p className="text-xs text-muted-foreground">
              Payslips are filtered by their pay date.
            </p>
          </div>
        </div>

        <MonthStrip
          months={months}
          selectedDate={selectedDate}
          onSelect={(value) => setSelectedMonth(value.slice(0, 7))}
          onYearChange={handleYearChange}
        />

        <ErrorBanner message={error} onClose={() => setError('')} />

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1">
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value;
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
                    <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                      {statusCounts[tab.value] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search payslip or employee…"
                  className="pl-9"
                />
              </div>
              {isManager && (
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-48"
                  value={employeeFilter}
                  onChange={(event) => setEmployeeFilter(event.target.value)}
                >
                  <option value="all">All employees</option>
                  {employees.map((employeeItem) => (
                    <option key={employeeItem._id} value={employeeItem._id}>
                      {employeeItem.name} ({employeeItem.employee_id || '—'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {loading ? (
            <PageLoading label="Loading payslips…" />
          ) : payslips.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No payslips found"
                description={
                  isManager
                    ? 'Generate payslips from a completed payroll run to see them here.'
                    : 'No payslips have been generated for you in this month yet.'
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Employee</TableHead>
                      <TableHead className="hidden sm:table-cell">Payslip No.</TableHead>
                      <TableHead className="hidden md:table-cell">Pay Period</TableHead>
                      <TableHead>Pay Date</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((payslip) => {
                      const employeeInfo = payslip.employee || {};
                      return (
                        <TableRow key={payslip._id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={employeeInfo.name}
                                src={employeeInfo.profile_image}
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  {employeeInfo.name || 'Employee'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {employeeInfo.employee_id || '—'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs font-medium">
                            {payslip.payslipNumber}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs">
                            {formatDateRange(
                              payslip.payPeriodStart || payslip.payrollEntry?.payrollRun?.payPeriodStart,
                              payslip.payPeriodEnd || payslip.payrollEntry?.payrollRun?.payPeriodEnd
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(payslip.payDate)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatCurrency(payslip.payrollEntry?.netPay)}
                          </TableCell>
                          <TableCell>
                            <PayslipStatusBadge status={payslip.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="View payslip"
                                onClick={() => setViewPayslip(payslip)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Download payslip"
                                onClick={() => downloadPayslip(payslip)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
                itemLabel="payslips"
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(viewPayslip)}
        title={viewPayslip ? `Payslip ${viewPayslip.payslipNumber}` : 'Payslip'}
        description={
          viewPayslip
            ? `${formatDateRange(
                viewPayslip.payPeriodStart,
                viewPayslip.payPeriodEnd
              )} · Pay date ${formatDate(viewPayslip.payDate)}`
            : ''
        }
        onClose={() => setViewPayslip(null)}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewPayslip(null)}
            >
              Close
            </Button>
            {viewPayslip && (
              <Button type="button" onClick={() => downloadPayslip(viewPayslip)}>
                <Download className="h-4 w-4" />
                Download Payslip
              </Button>
            )}
          </>
        }
      >
        {viewPayslip && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Avatar name={employee.name} src={employee.profile_image} />
                <div>
                  <p className="text-sm font-semibold">{employee.name || 'Employee'}</p>
                  <p className="text-xs text-muted-foreground">
                    {employee.employee_id || '—'} · {employee.email || 'No email'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PayslipStatusBadge status={viewPayslip.status} />
                <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                  {viewPayslip.payslipNumber}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Gross Pay"
                value={formatCurrency(entry?.grossPay)}
                icon={TrendingUp}
                tone="success"
              />
              <SummaryCard
                label="Deductions"
                value={formatCurrency(totalDeductions)}
                icon={TrendingDown}
                tone="danger"
              />
              <SummaryCard
                label="Net Pay"
                value={formatCurrency(entry?.netPay)}
                icon={TakaIcon}
                tone="default"
              />
              <SummaryCard
                label="Working Days"
                value={formatNumber(entry?.workingDays)}
                hint={`${formatNumber(entry?.presentDays)} paid day(s)`}
                icon={CalendarDays}
                tone="info"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Earnings
                </p>
                <div className="mt-2">
                  {earnings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No earnings recorded.</p>
                  ) : (
                    earnings.map((item, index) => (
                      <MoneyRow
                        key={`${item.name}-${index}`}
                        label={item.name}
                        value={formatCurrency(item.amount)}
                        tone="success"
                      />
                    ))
                  )}
                  <MoneyRow
                    label="Total Earnings"
                    value={formatCurrency(totalEarnings)}
                    strong
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Deductions
                </p>
                <div className="mt-2">
                  {deductions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deductions recorded.</p>
                  ) : (
                    deductions.map((item, index) => (
                      <MoneyRow
                        key={`${item.name}-${index}`}
                        label={item.name}
                        value={formatCurrency(item.amount)}
                        tone="danger"
                      />
                    ))
                  )}
                  <MoneyRow
                    label="Total Deductions"
                    value={formatCurrency(totalDeductions)}
                    strong
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Attendance Summary
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-4">
                  <AttendancePair
                    label="Present"
                    value={formatNumber(entry?.presentDays)}
                  />
                  <AttendancePair
                    label="Paid Leave"
                    value={formatNumber(entry?.paidLeaveDays)}
                  />
                  <AttendancePair
                    label="Unpaid Leave"
                    value={formatNumber(entry?.unpaidLeaveDays)}
                  />
                  <AttendancePair
                    label="Holidays"
                    value={formatNumber(entry?.holidayDays)}
                  />
                  <AttendancePair
                    label="Half Days"
                    value={formatNumber(entry?.halfDays)}
                  />
                  <AttendancePair
                    label="LOP Days"
                    value={formatNumber(entry?.lopDays)}
                  />
                  <AttendancePair
                    label="Overtime"
                    value={`${formatNumber(entry?.overtimeHours)}h`}
                  />
                  <AttendancePair
                    label="Effective Paid"
                    value={formatNumber(entry?.effectivePaidDays)}
                  />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pay Calculation
                </p>
                <div className="mt-2">
                  <MoneyRow
                    label="Basic Salary"
                    value={formatCurrency(entry?.basicSalary)}
                  />
                  <MoneyRow
                    label="Per-Day Salary"
                    value={formatCurrency(entry?.perDaySalary)}
                  />
                  <MoneyRow
                    label="LOP Deduction"
                    value={formatCurrency(entry?.lopDeduction)}
                    tone="danger"
                  />
                  <MoneyRow
                    label="Unpaid Leave Deduction"
                    value={formatCurrency(entry?.unpaidLeaveDeduction)}
                    tone="danger"
                  />
                  <MoneyRow
                    label="Overtime Pay"
                    value={formatCurrency(entry?.overtimeAmount)}
                    tone="success"
                  />
                  <MoneyRow
                    label="Net Pay"
                    value={formatCurrency(entry?.netPay)}
                    strong
                  />
                </div>
              </div>
            </div>

            {viewPayslip.downloadedAt && (
              <p className="text-[11px] text-muted-foreground">
                Downloaded {formatDate(viewPayslip.downloadedAt)}
              </p>
            )}
          </div>
        )}
      </Modal>
    </PageTemplate>
  );
}
