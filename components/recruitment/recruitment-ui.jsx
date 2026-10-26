'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { badgeVariantFor, labelize } from '@/lib/recruitment';

const ACCENTS = {
  blue: {
    icon: 'bg-brand-yellow text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  emerald: {
    icon: 'bg-brand-yellow text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  amber: {
    icon: 'bg-brand-yellow text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  violet: {
    icon: 'bg-brand-yellow text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  rose: {
    icon: 'bg-brand-red text-brand-red bg-brand-red text-brand-red',
    bar: 'bg-brand-red',
  },
  teal: {
    icon: 'bg-brand-yellow text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  orange: {
    icon: 'bg-brand-yellow text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-yellow',
    bar: 'bg-brand-yellow',
  },
  slate: {
    icon: 'bg-brand-white text-brand-charcoal dark:bg-brand-charcoal dark:text-brand-white',
    bar: 'bg-brand-white',
  },
};

/** Compact metric card used across the recruitment screens. */
export function StatCard({ label, value, icon: Icon, accent = 'blue', hint, href }) {
  const tones = ACCENTS[accent] || ACCENTS.blue;
  const body = (
    <div className="group relative h-full overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <span className={cn('absolute left-0 top-0 h-full w-1', tones.bar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
          {hint ? <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones.icon)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}

/** Accessible modal dialog matching the existing HR module styling. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg bg-background shadow-lg',
          sizeClass
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function StatusBadge({ status, labels = {}, className }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={badgeVariantFor(status)} className={className}>
      {labels[status] || labelize(status)}
    </Badge>
  );
}

export function ErrorBanner({ message, className }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive',
        className
      )}
    >
      {message}
    </div>
  );
}

export function SuccessBanner({ message, className }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={cn(
        'rounded-md border border-brand-yellow bg-brand-yellow px-4 py-3 text-sm text-brand-charcoal border-brand-yellow dark:bg-brand-charcoal dark:text-brand-yellow',
        className
      )}
    >
      {message}
    </div>
  );
}

/** Form row with label + required marker, mirroring the existing CRUD modals. */
export function Field({ label, htmlFor, required = false, hint, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Select with an "all" option, used for list filters. */
export function FilterSelect({ value, onValueChange, options, placeholder = 'All', className, ariaLabel }) {
  return (
    <Select value={value || 'all'} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-[180px]', className)} aria-label={ariaLabel || placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent searchable>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Pagination({ page, pages, total, from, to, onPage, disabled }) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1 || disabled} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button size="sm" variant="outline" disabled={page >= pages || disabled} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function TableLoadingRow({ colSpan, label = 'Loading...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

export function TableEmptyRow({ colSpan, label = 'No records found.' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

export function SkillsTags({ skills, max = 4 }) {
  const list = Array.isArray(skills) ? skills : [];
  if (list.length === 0) return <span className="text-muted-foreground">—</span>;
  const shown = list.slice(0, max);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((s) => (
        <Badge key={s} variant="outline" className="text-[10px]">
          {s}
        </Badge>
      ))}
      {list.length > max ? <span className="text-[10px] text-muted-foreground">+{list.length - max}</span> : null}
    </div>
  );
}

/** Turn a fetch response into a human readable error message. */
export async function readApiError(response, fallback = 'Something went wrong') {
  const json = await response.json().catch(() => ({}));
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    return json.errors.map((e) => e.msg || e.message || e.path).join(', ');
  }
  return json.message || json.error || fallback;
}

/** Label + value block used on detail pages. */
export function DetailItem({ label, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm break-words">{children ?? '—'}</div>
    </div>
  );
}

/** Bordered section wrapper with a title row. */
export function SectionCard({ title, description, actions, children, className }) {
  return (
    <section className={cn('rounded-lg border bg-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-md text-xs text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------
const RATING_OPTIONS = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'];

/** Star display for a 0–5 rating (supports halves). */
export function RatingStars({ value = 0, max = 5, className }) {
  const rating = Number(value) || 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${rating} out of ${max}`}>
      {Array.from({ length: max }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index));
        return (
          <span key={index} className="relative inline-block h-4 w-4">
            <Star className="absolute inset-0 h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-4 w-4 fill-brand-yellow text-brand-charcoal" aria-hidden="true" />
            </span>
          </span>
        );
      })}
      <span className="ml-1 text-xs text-muted-foreground">{rating ? rating.toFixed(1) : '—'}</span>
    </span>
  );
}

/** Rating picker used in feedback / candidate forms. */
export function RatingSelect({ id, value, onValueChange, disabled = false, allowEmpty = true }) {
  const current = value === undefined || value === null || value === '' ? 'none' : String(value);
  return (
    <Select
      value={current}
      onValueChange={(v) => onValueChange(v === 'none' ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Not rated" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value="none">Not rated</SelectItem> : null}
        {RATING_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option} / 5
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------

/**
 * Drag & drop kanban board. `columns` is `[{ value, label, accent? }]`, `items`
 * the flat list returned by the `?view=kanban` endpoints. Moving a card calls
 * `onMove(item, nextColumnValue)`. Each card also exposes a status select so the
 * board works without a mouse.
 */
export function KanbanBoard({ columns, items, renderCard, getColumn, onMove, movingId, emptyLabel = 'No records' }) {
  const [dragId, setDragId] = useState(null);

  const grouped = Object.fromEntries(columns.map((c) => [c.value, []]));
  for (const item of items || []) {
    const key = getColumn(item);
    if (key in grouped) grouped[key].push(item);
  }

  function handleDrop(columnValue, event) {
    event.preventDefault();
    const id = dragId || event.dataTransfer.getData('text/plain');
    setDragId(null);
    if (!id) return;
    const item = (items || []).find((i) => String(i._id) === String(id));
    if (!item) return;
    if (getColumn(item) === columnValue) return;
    onMove?.(item, columnValue);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {columns.map((column) => (
        <div
          key={column.value}
          className="flex w-[290px] shrink-0 flex-col rounded-lg border bg-muted/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(column.value, e)}
        >
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', column.accent || 'bg-brand-white')} aria-hidden="true" />
              <span className="text-sm font-medium">{column.label}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {grouped[column.value].length}
            </Badge>
          </div>
          <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
            {grouped[column.value].length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
            ) : (
              grouped[column.value].map((item) => (
                <div
                  key={item._id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(String(item._id));
                    e.dataTransfer.setData('text/plain', String(item._id));
                  }}
                  className={cn(
                    'cursor-grab rounded-md border bg-background p-3 shadow-sm active:cursor-grabbing',
                    movingId === item._id && 'opacity-50'
                  )}
                >
                  {renderCard(item, column)}
                  {onMove ? (
                    <div className="mt-2 border-t pt-2">
                      <Select
                        value={column.value}
                        onValueChange={(value) => {
                          if (value !== column.value) onMove(item, value);
                        }}
                        disabled={movingId === item._id}
                      >
                        <SelectTrigger className="h-7 w-full text-xs" aria-label="Move card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              Move to {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Input as TextInput };
