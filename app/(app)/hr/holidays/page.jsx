'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  format, differenceInCalendarDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
} from 'date-fns';

const CATEGORIES = ['national', 'religious', 'company-specific', 'regional'];
const YEARS = (() => {
  const y = new Date().getFullYear();
  return [y - 2, y - 1, y, y + 1, y + 2].map(String);
})();

function fmtRange(h) {
  const s = h.start_date ? format(new Date(h.start_date), 'MMM d, yyyy') : '—';
  const e = h.end_date ? format(new Date(h.end_date), 'MMM d, yyyy') : null;
  if (!e || (h.start_date && new Date(e).getTime() === new Date(h.start_date).getTime())) return s;
  const days = differenceInCalendarDays(new Date(h.end_date), new Date(h.start_date)) + 1;
  return `${s} – ${e} (${days} days)`;
}

function toDateInput(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

const emptyForm = { name: '', category: '', start_date: '', end_date: '', description: '', branch_ids: [], is_recurring: false, is_paid: true, is_half_day: false };

export default function HolidaysPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(null);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '50', per_page: '50' });
      if (debounced) qs.set('search', debounced);
      if (category) qs.set('category', category);
      if (year) qs.set('year', year);
      const res = await fetch(`/api/holidays?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch holidays');
      const list = json.holidays || [];
      setItems(list);
      setTotal(json.pagination?.total ?? list.length);
      setPages(json.pagination?.pages || 1);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, category, year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  // Initialise current year/month on the client (avoids `new Date()` during prerender).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYear((y) => y || String(new Date().getFullYear()));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonth((m) => m || new Date());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/branches?limit=100', { credentials: 'include' });
        const json = await res.json();
        setBranches(json.branches || []);
      } catch { setBranches([]); }
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(h) {
    setEditing(h);
    setForm({
      name: h.name || '',
      category: h.category || '',
      start_date: toDateInput(h.start_date),
      end_date: toDateInput(h.end_date),
      description: h.description || '',
      branch_ids: (h.branch_ids || []).map((b) => String(b._id || b)),
      is_recurring: Boolean(h.is_recurring),
      is_paid: h.is_paid !== false,
      is_half_day: Boolean(h.is_half_day),
    });
    setError('');
    setShowModal(true);
  }

  function toggleBranch(id) {
    setForm((f) => ({
      ...f,
      branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter((b) => b !== id) : [...f.branch_ids, id],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        category: form.category,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        description: form.description || null,
        branch_ids: form.branch_ids,
        is_recurring: form.is_recurring,
        is_paid: form.is_paid,
        is_half_day: form.is_half_day,
      };
      const url = editing ? `/api/holidays/${editing._id}` : '/api/holidays';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || (Array.isArray(json.errors) ? json.errors.map((x) => x.msg).join(', ') : 'Failed to save'));
      }
      setShowModal(false);
      fetchItems();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(h) {
    if (!window.confirm(`Delete holiday "${h.name}"?`)) return;
    try {
      const res = await fetch(`/api/holidays/${h._id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete');
      fetchItems();
    } catch (e) {
      setError(e.message);
    }
  }

  function exportIcal() {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Company//Holidays//EN', 'CALSCALE:GREGORIAN'];
    for (const h of items) {
      const s = format(new Date(h.start_date), 'yyyyMMdd');
      const end = h.end_date ? format(addDays(new Date(h.end_date), 1), 'yyyyMMdd') : format(addDays(new Date(h.start_date), 1), 'yyyyMMdd');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${h._id}@company.com`);
      lines.push(`DTSTART;VALUE=DATE:${s}`);
      lines.push(`DTEND;VALUE=DATE:${end}`);
      lines.push(`SUMMARY:${String(h.name).replace(/,/g, '\\,')}`);
      if (h.description) lines.push(`DESCRIPTION:${String(h.description).replace(/,/g, '\\,')}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `holidays-${year}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderCalendar() {
    if (!month) return <div className="py-8 text-center text-sm text-muted-foreground">Loading calendar...</div>;
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const days = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => setMonth(subMonths(month, 1))}>Prev</Button>
          <span className="font-semibold">{format(month, 'MMMM yyyy')}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setMonth(new Date())}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setMonth(addMonths(month, 1))}>Next</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-center text-xs font-medium">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-muted px-1 py-2">{d}</div>
          ))}
          {days.map((d) => {
            const chips = items.filter((h) => {
              const s = new Date(h.start_date); s.setHours(0, 0, 0, 0);
              const e = h.end_date ? new Date(h.end_date) : new Date(h.start_date); e.setHours(0, 0, 0, 0);
              const t = new Date(d); t.setHours(0, 0, 0, 0);
              return t >= s && t <= e;
            });
            return (
              <div key={d.toISOString()} className={`min-h-[72px] bg-background px-1 py-1 text-left ${isSameMonth(d, month) ? '' : 'opacity-40'}`}>
                <div className={`text-xs ${isSameDay(d, new Date()) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{format(d, 'd')}</div>
                <div className="mt-1 flex flex-col gap-1">
                  {chips.map((h) => (
                    <button key={h._id} onClick={() => setViewing(h)} className="truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[11px] text-primary hover:bg-primary/20">
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <PageTemplate
      title="Holidays"
      description="Manage company holidays"
      actions={[
        { label: view === 'list' ? 'Calendar' : 'List', variant: 'outline', onClick: () => setView(view === 'list' ? 'calendar' : 'list') },
        { label: 'Export iCal', variant: 'outline', onClick: exportIcal },
        { label: 'Add Holiday', variant: 'default', onClick: openCreate },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search holidays..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={category || 'all'} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent searchable>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={(v) => { setYear(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {error && !showModal && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {view === 'calendar' ? renderCalendar() : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No holidays found.</TableCell></TableRow>
                ) : items.map((h) => (
                  <TableRow key={h._id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{fmtRange(h)}</TableCell>
                    <TableCell><Badge variant="outline">{h.category}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(!h.branch_ids || h.branch_ids.length === 0) ? (
                          <Badge variant="secondary">All branches</Badge>
                        ) : h.branch_ids.map((b) => (
                          <Badge key={b._id || b} variant="secondary">{b.name || b}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewing(h)}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(h)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(h)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {items.length} of {total}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <span>Page {page} of {pages}</span>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Create'} Holiday</h2>
            {error && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" required>Holiday Name</Label>
                <Input id="name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter holiday name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category" required>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="start_date" required>Start Date</Label>
                  <Input id="start_date" type="date" value={form.start_date} required onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  <span className="text-xs text-muted-foreground">Leave empty for a single-day holiday</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter description" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Branches <span className="font-normal text-muted-foreground">(none = all branches)</span></Label>
                <div className="flex max-h-36 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                  {branches.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No branches found.</span>
                  ) : branches.map((b) => (
                    <label key={b._id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={form.branch_ids.includes(String(b._id))} onCheckedChange={() => toggleBranch(String(b._id))} />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: Boolean(v) })} /> Recurring
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: Boolean(v) })} /> Paid
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.is_half_day} onCheckedChange={(v) => setForm({ ...form, is_half_day: Boolean(v) })} /> Half day
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{viewing.name}</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <div><span className="font-medium">Date: </span>{fmtRange(viewing)}</div>
              <div><span className="font-medium">Category: </span><Badge variant="outline">{viewing.category}</Badge></div>
              {viewing.description && <div><span className="font-medium">Description: </span>{viewing.description}</div>}
              <div className="flex flex-wrap gap-1">
                {viewing.is_recurring && <Badge variant="secondary">Recurring</Badge>}
                {viewing.is_paid && <Badge variant="success">Paid</Badge>}
                {viewing.is_half_day && <Badge variant="outline">Half day</Badge>}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
