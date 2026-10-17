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
import { format } from 'date-fns';

const CATEGORIES = ['company news', 'policy updates', 'events', 'HR', 'IT updates'];
const STATUSES = ['active', 'upcoming', 'expired'];

function derivedStatus(a) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const s = a.start_date ? new Date(a.start_date) : null;
  if (s) s.setHours(0, 0, 0, 0);
  const e = a.end_date ? new Date(a.end_date) : null;
  if (e) e.setHours(0, 0, 0, 0);
  if (s && s > today) return 'upcoming';
  if (e && e < today) return 'expired';
  return 'active';
}

function statusVariant(s) {
  if (s === 'active') return 'success';
  if (s === 'upcoming') return 'secondary';
  return 'outline';
}

function fmtRange(a) {
  const s = a.start_date ? format(new Date(a.start_date), 'MMM d, yyyy') : '—';
  if (!a.end_date) return s;
  return `${s} – ${format(new Date(a.end_date), 'MMM d, yyyy')}`;
}

function toDateInput(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

const emptyForm = {
  title: '', category: '', description: '', content: '', start_date: '', end_date: '',
  attachments: '', is_featured: false, is_high_priority: false, is_company_wide: true,
  branch_ids: [], department_ids: [],
};

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsFor, setStatsFor] = useState(null);
  const [readEmp, setReadEmp] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '10' });
      if (debounced) qs.set('search', debounced);
      if (category) qs.set('category', category);
      if (status) qs.set('status', status);
      if (featuredOnly) qs.set('featured', 'true');
      const res = await fetch(`/api/announcements?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch announcements');
      const list = json.announcements || [];
      setItems(list);
      setTotal(json.pagination?.total ?? list.length);
      setPages(json.pagination?.pages || 1);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, category, status, featuredOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    (async () => {
      try {
        const [br, dp, em] = await Promise.all([
          fetch('/api/branches?limit=100', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/departments?limit=100', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/employees?limit=100', { credentials: 'include' }).then((r) => r.json()),
        ]);
        setBranches(br.branches || []);
        setDepartments(dp.departments || []);
        setEmployees(em.employees || []);
      } catch { /* ignore */ }
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({
      title: a.title || '',
      category: a.category || '',
      description: a.description || '',
      content: a.content || '',
      start_date: toDateInput(a.start_date),
      end_date: toDateInput(a.end_date),
      attachments: a.attachments || '',
      is_featured: Boolean(a.is_featured),
      is_high_priority: Boolean(a.is_high_priority),
      is_company_wide: a.is_company_wide !== false,
      branch_ids: (a.branch_ids || []).map((b) => String(b._id || b)),
      department_ids: (a.department_ids || []).map((d) => String(d._id || d)),
    });
    setError('');
    setShowModal(true);
  }

  function toggleId(key, id) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        category: form.category,
        description: form.description || null,
        content: form.content,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        attachments: form.attachments || null,
        is_featured: form.is_featured,
        is_high_priority: form.is_high_priority,
        is_company_wide: form.is_company_wide,
        branch_ids: form.is_company_wide ? [] : form.branch_ids,
        department_ids: form.is_company_wide ? [] : form.department_ids,
      };
      const url = editing ? `/api/announcements/${editing._id}` : '/api/announcements';
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

  async function handleDelete(a) {
    if (!window.confirm(`Delete announcement "${a.title}"?`)) return;
    try {
      const res = await fetch(`/api/announcements/${a._id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete');
      fetchItems();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openStats(a) {
    setStatsFor(a);
    setStats(null);
    try {
      const res = await fetch(`/api/announcements/${a._id}/statistics`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load statistics');
      setStats(json);
    } catch (e) {
      setStats({ error: e.message });
    }
  }

  async function markAsRead() {
    if (!viewing || !readEmp) return;
    try {
      const res = await fetch(`/api/announcements/${viewing._id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ employee_id: readEmp }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to mark as read');
      setViewing({ ...viewing, _readOk: true });
    } catch (e) {
      setError(e.message);
    }
  }

  function audience(a) {
    if (a.is_company_wide) return 'Company-wide';
    const nb = (a.branch_ids || []).length;
    const nd = (a.department_ids || []).length;
    if (nb === 0 && nd === 0) return 'Company-wide';
    return `${nb} branch${nb === 1 ? '' : 'es'} / ${nd} department${nd === 1 ? '' : 's'}`;
  }

  return (
    <PageTemplate
      title="Announcements"
      description="Manage company announcements"
      actions={[{ label: 'Add Announcement', variant: 'default', onClick: openCreate }]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={category || 'all'} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent searchable>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={featuredOnly} onCheckedChange={(v) => { setFeaturedOnly(Boolean(v)); setPage(1); }} /> Featured only
          </label>
        </div>

        {error && !showModal && !viewing && !statsFor && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Attachments</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No announcements found.</TableCell></TableRow>
            ) : items.map((a) => {
              const st = derivedStatus(a);
              return (
                <TableRow key={a._id}>
                  <TableCell>
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.is_featured && <Badge variant="secondary">Featured</Badge>}
                      {a.is_high_priority && <Badge variant="destructive">High Priority</Badge>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{a.category}</Badge></TableCell>
                  <TableCell>
                    <div>{fmtRange(a)}</div>
                    <Badge variant={statusVariant(st)} className="mt-1">{st}</Badge>
                  </TableCell>
                  <TableCell>{audience(a)}</TableCell>
                  <TableCell>{a.attachments ? <a href={a.attachments} target="_blank" rel="noreferrer" className="text-primary underline">File</a> : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setViewing(a); setReadEmp(''); }}>View</Button>
                      <Button size="sm" variant="outline" onClick={() => openStats(a)}>Statistics</Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(a)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
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
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Create'} Announcement</h2>
            {error && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title" required>Title</Label>
                <Input id="title" value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter title" />
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Short Description</Label>
                <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="content" required>Content</Label>
                <Textarea id="content" value={form.content} required onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Announcement content" rows={5} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="start_date" required>Start Date</Label>
                  <Input id="start_date" type="date" value={form.start_date} required onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="attachments">Attachment URL</Label>
                <Input id="attachments" value={form.attachments} onChange={(e) => setForm({ ...form, attachments: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: Boolean(v) })} /> Featured
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.is_high_priority} onCheckedChange={(v) => setForm({ ...form, is_high_priority: Boolean(v) })} /> High priority
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.is_company_wide} onCheckedChange={(v) => setForm({ ...form, is_company_wide: Boolean(v) })} /> Company-wide
                </label>
              </div>
              {!form.is_company_wide && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label>Branches</Label>
                    <div className="flex max-h-32 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                      {branches.map((b) => (
                        <label key={b._id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={form.branch_ids.includes(String(b._id))} onCheckedChange={() => toggleId('branch_ids', String(b._id))} /> {b.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Departments</Label>
                    <div className="flex max-h-32 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                      {departments.map((d) => (
                        <label key={d._id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={form.department_ids.includes(String(d._id))} onCheckedChange={() => toggleId('department_ids', String(d._id))} /> {d.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{viewing.title}</h2>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline">{viewing.category}</Badge>
              <Badge variant={statusVariant(derivedStatus(viewing))}>{derivedStatus(viewing)}</Badge>
              {viewing.is_featured && <Badge variant="secondary">Featured</Badge>}
              {viewing.is_high_priority && <Badge variant="destructive">High Priority</Badge>}
            </div>
            {viewing.description && <p className="mt-3 text-sm text-muted-foreground">{viewing.description}</p>}
            <div className="mt-3 whitespace-pre-wrap text-sm">{viewing.content}</div>
            <div className="mt-2 text-sm"><span className="font-medium">Dates: </span>{fmtRange(viewing)}</div>
            {viewing.attachments && <div className="mt-2 text-sm"><a href={viewing.attachments} target="_blank" rel="noreferrer" className="text-primary underline">View attachment</a></div>}
            {viewing._readOk && <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Marked as read.</div>}
            <div className="mt-4 flex flex-col gap-1.5">
              <Label>Mark as read for employee</Label>
              <div className="flex gap-2">
                <Select value={readEmp} onValueChange={setReadEmp}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent searchable>
                    {employees.map((e) => <SelectItem key={e._id} value={String(e._id)}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={markAsRead} disabled={!readEmp}>Mark as read</Button>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {statsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Statistics: {statsFor.title}</h2>
            {!stats ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
            ) : stats.error ? (
              <p className="mt-3 text-sm text-destructive">{stats.error}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <div>Views: <span className="font-semibold">{stats.viewCount}</span> / {stats.totalEmployees} ({stats.viewPercentage}%)</div>
                <div>
                  <div className="font-medium">By Branch</div>
                  {(stats.byBranch || []).length === 0 ? <div className="text-muted-foreground">No views yet.</div> :
                    (stats.byBranch || []).map((b) => <div key={b.name} className="flex justify-between"><span>{b.name}</span><span>{b.views}</span></div>)}
                </div>
                <div>
                  <div className="font-medium">By Department</div>
                  {(stats.byDepartment || []).length === 0 ? <div className="text-muted-foreground">No views yet.</div> :
                    (stats.byDepartment || []).map((d) => <div key={d.name} className="flex justify-between"><span>{d.name}</span><span>{d.views}</span></div>)}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => { setStatsFor(null); setStats(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
