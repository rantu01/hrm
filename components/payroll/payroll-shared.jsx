'use client';

import { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function formatCurrency(value) {
  const n = Number(value) || 0;
  // Payroll amounts are shown in Bangladeshi Taka (৳).
  return `৳${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value, digits = 1) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

export function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateRange(start, end) {
  if (!start && !end) return '—';
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function statusLabel(status) {
  const value = String(status || '').toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
}

const RUN_STATUS_STYLES = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  processing: 'border-blue-200 bg-blue-50 text-blue-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

const PAYSLIP_STATUS_STYLES = {
  generated: 'border-amber-200 bg-amber-50 text-amber-700',
  sent: 'border-blue-200 bg-blue-50 text-blue-700',
  downloaded: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function PayrollStatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        RUN_STATUS_STYLES[key] || RUN_STATUS_STYLES.draft
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function PayslipStatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        PAYSLIP_STATUS_STYLES[key] || PAYSLIP_STATUS_STYLES.generated
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ActiveStatusBadge({ active }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

export function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-rose-700 underline underline-offset-2"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
      <div className="flex-1">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-emerald-700 underline underline-offset-2"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function PageLoading({ label = 'Loading payroll data…' }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

export function DataPagination({
  pagination,
  onPageChange,
  onPerPageChange,
  itemLabel = 'records',
}) {
  const page = pagination?.page || 1;
  const pages = pagination?.pages || 1;
  const limit = pagination?.limit || 10;
  const total = pagination?.total || 0;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span>
          Showing {from}–{to} of {total} {itemLabel}
        </span>
        {onPerPageChange && (
          <select
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={limit}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
          >
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="px-1">
          Page {page} of {pages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function MonthStrip({
  months = [],
  selectedDate,
  onSelect,
  onYearChange,
}) {
  const selectedKey = useMemo(() => {
    if (!selectedDate) return '';
    const date = new Date(selectedDate);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  const year = selectedDate
    ? new Date(selectedDate).getUTCFullYear()
    : new Date().getUTCFullYear();

  return (
    <div className="rounded-xl border bg-card p-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onYearChange?.(year - 1)}
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-12">
          {months.map((month) => {
            const active = month.monthCode === selectedKey;
            return (
              <button
                key={month.monthCode}
                type="button"
                onClick={() => onSelect?.(month.date)}
                className={cn(
                  'rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  !active && month.isCurrentMonth && 'ring-1 ring-primary/30'
                )}
              >
                <span className="hidden sm:inline">{month.monthName}</span>
                <span className="sm:hidden">{month.monthName}</span>
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onYearChange?.(year + 1)}
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Avatar({ name, src, className }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || 'Employee'}
        className={cn('h-9 w-9 rounded-full object-cover', className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary',
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function SummaryCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-xl font-semibold sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('rounded-lg p-2', tones[tone] || tones.default)}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
