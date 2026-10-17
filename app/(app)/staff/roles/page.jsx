'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const emptyForm = { name: '', description: '', status: 'active' };

function statusVariant(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'inactive') return 'secondary';
  return 'outline';
}

export default function StaffRolesPage() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: '10',
        per_page: '10',
        sort_field: sortField,
        sort_direction: sortDirection,
      });
      if (debounced) qs.set('search', debounced);
      const res = await fetch(`/api/roles?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to fetch roles');
      setItems(json.roles || []);
      setTotal(json.pagination?.total ?? 0);
      setPages(json.pagination?.pages || 1);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, sortField, sortDirection]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/roles/permissions', { credentials: 'include' });
        const json = await res.json();
        if (res.ok) setGroups(json.groups || []);
      } catch {
        setGroups([]);
      }
    })();
  }, []);

  function togglePermission(value) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  }

  function toggleGroup(group, checked) {
    const values = group.permissions.map((p) => p.value);
    setSelected((prev) =>
      checked ? [...new Set([...prev, ...values])] : prev.filter((p) => !values.includes(p))
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSelected([]);
    setError('');
    setShowModal(true);
  }

  function openEdit(role) {
    setEditing(role);
    setForm({
      name: role.name || '',
      description: role.description || '',
      status: role.status || 'active',
    });
    setSelected(Array.isArray(role.permissions) ? role.permissions : []);
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Role name is required');
      return;
    }
    if (selected.length === 0) {
      setError('Select at least one permission');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const isEdit = Boolean(editing && (editing._id || editing.id));
      const url = isEdit ? `/api/roles/${editing._id || editing.id}` : '/api/roles';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, permissions: selected }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json.message ||
            (Array.isArray(json.errors) ? json.errors.map((er) => er.msg || er.message).join(', ') : null) ||
            'Failed to save role'
        );
      }
      setShowModal(false);
      setEditing(null);
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    const id = role._id || role.id;
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete role');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggle(role) {
    const id = role._id || role.id;
    setToggling(id);
    setError('');
    try {
      const res = await fetch(`/api/roles/${id}/toggle-status`, { method: 'PUT', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to update status');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  function handleSort(field) {
    setPage(1);
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const sortIcon = (field) => (sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕');
  const selectedCount = selected.length;

  return (
    <PageTemplate
      title="Roles"
      description="Define roles and control permission access"
      actions={[{ label: 'Add Role', variant: 'default', onClick: openCreate }]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {error && !showModal && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1 font-medium hover:underline">
                  Name <span aria-hidden="true">{sortIcon('name')}</span>
                </button>
              </TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No records found.</TableCell>
              </TableRow>
            ) : (
              items.map((role) => {
                const rowId = role._id || role.id;
                const perms = Array.isArray(role.permissions) ? role.permissions : [];
                return (
                  <TableRow key={rowId}>
                    <TableCell>
                      <div className="font-semibold">{role.name || '—'}</div>
                      {role.isSystem ? (
                        <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          System
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-md flex-wrap gap-1">
                        {perms.slice(0, 4).map((p) => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))}
                        {perms.length > 4 ? <Badge variant="secondary">+{perms.length - 4} more</Badge> : null}
                        {perms.length === 0 ? <span className="text-muted-foreground">—</span> : null}
                      </div>
                    </TableCell>
                    <TableCell>{role.userCount ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(role.status)}>{role.status || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewing(role)}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(role)}>Edit</Button>
                        {!role.isSystem ? (
                          <Button size="sm" variant="outline" disabled={toggling === rowId} onClick={() => handleToggle(role)}>
                            {toggling === rowId ? 'Updating...' : role.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        ) : null}
                        {!role.isSystem ? (
                          <Button size="sm" variant="destructive" disabled={deleting === rowId} onClick={() => handleDelete(role)}>
                            {deleting === rowId ? 'Deleting...' : 'Delete'}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {total === 0 ? 0 : (page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <span>Page {page} of {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{viewing.name}</h2>
            {viewing.description ? <p className="mt-1 text-sm text-muted-foreground">{viewing.description}</p> : null}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={statusVariant(viewing.status)}>{viewing.status}</Badge>
              <span className="text-xs text-muted-foreground">{viewing.userCount ?? 0} user(s) assigned</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold">Assigned Permissions ({(viewing.permissions || []).length})</h3>
            <div className="mt-2 flex flex-col gap-3">
              {groups
                .map((g) => ({
                  group: g,
                  assigned: g.permissions.filter((p) => (viewing.permissions || []).includes(p.value)),
                }))
                .filter((s) => s.assigned.length > 0)
                .map((s) => (
                  <div key={s.group.group}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{s.group.group}</span>
                      <Badge variant="secondary">{s.assigned.length}/{s.group.permissions.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.assigned.map((p) => (
                        <Badge key={p.value} variant="outline">{p.label}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              {(!viewing.permissions || viewing.permissions.length === 0) && (
                <span className="text-sm text-muted-foreground">No permissions assigned to this role.</span>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{editing ? 'Edit Role' : 'Add Role'}</h2>
            {error ? (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="role-name" required>Role Name</Label>
                  <Input
                    id="role-name"
                    placeholder="e.g. HR Manager"
                    value={form.name}
                    disabled={Boolean(editing && editing.isSystem)}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="role-status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger id="role-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  placeholder="Enter role description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions ({selectedCount} selected)</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelected(groups.flatMap((g) => g.permissions.map((p) => p.value)))}>
                      Select All
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelected([])}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border p-3">
                  {groups.map((g) => {
                    const values = g.permissions.map((p) => p.value);
                    const allChecked = values.length > 0 && values.every((v) => selected.includes(v));
                    const someChecked = values.some((v) => selected.includes(v));
                    return (
                      <div key={g.group} className="rounded-md bg-muted/40 p-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={(c) => toggleGroup(g, c === true)}
                            className={someChecked && !allChecked ? 'opacity-70' : ''}
                          />
                          {g.group}
                        </label>
                        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {g.permissions.map((p) => (
                            <label key={p.value} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                              <Checkbox checked={selected.includes(p.value)} onCheckedChange={() => togglePermission(p.value)} />
                              <span title={p.value}>{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {groups.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Loading permissions...</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageTemplate>
  );
}
