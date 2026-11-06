'use client';

import { useEffect, useState } from 'react';
import { X, Inbox, CalendarRange, CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDays, leaveStatusVariant, toDateInputValue } from '@/lib/leave-utils';

export { formatDays, leaveStatusVariant };

export function statusLabel(status) {
  const value = String(status || '').toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
}

export function StatusBadge({ status, className }) {
  return (
    <Badge variant={leaveStatusVariant(status)} className={cn('capitalize', className)}>
      {statusLabel(status)}
    </Badge>
  );
}

export function TypeBadge({ leaveType, payment, className }) {
  if (!leaveType) return <Badge variant="outline">Other</Badge>;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: leaveType.color || '#E60023' }}
      />
      <span className="font-medium">{leaveType.name || 'Leave'}</span>
      {payment && (
        <Badge variant="outline" className="ml-1 text-[10px]">
          {leaveType.isPaid === false ? 'Unpaid' : 'Paid'}
        </Badge>
      )}
    </span>
  );
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateRange(start, end) {
  if (!start && !end) return '—';
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText === endText) return startText;
  return `${startText} – ${endText}`;
}

export function toDateInput(value) {
  return toDateInputValue(value);
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  closeDisabled = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !closeDisabled) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/60 p-3 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl border bg-background shadow-xl',
          widths[size] || widths.md
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="leave-modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, accent = 'yellow', loading = false }) {
  const accents = {
    yellow: 'bg-brand-yellow/20 text-brand-charcoal dark:text-brand-yellow',
    red: 'bg-brand-red/10 text-brand-red',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    gray: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="border-brand-charcoal/15 shadow-sm dark:border-brand-white/10">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold leading-tight">
            {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" /> : value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('rounded-xl p-2.5', accents[accent] || accents.yellow)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title = 'No records found', description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <span className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function LockedNotice({ title, description }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

export function CalendarLegend({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{children}</div>
  );
}

export function LegendDot({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full', className)} />
      {label}
    </span>
  );
}

export { CalendarRange, Button };
