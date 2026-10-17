'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'probation', label: 'Probation' },
  { value: 'terminated', label: 'Terminated' },
];

function statusVariant(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'probation') return 'secondary';
  if (s === 'inactive' || s === 'terminated') return 'destructive';
  return 'outline';
}

function getRefName(value) {
  if (!value) return '—';
  if (typeof value === 'object') return value.name || '—';
  return String(value);
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function EmployeesPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pwFor, setPwFor] = useState(null);
  const [pwForm, setPwForm] = useState({ password: '', password_confirmation: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
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
        per_page: String(perPage),
        sort,
        order,
      });
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (branchId) qs.set('branch_id', branchId);
      if (departmentId) qs.set('department_id', departmentId);
      if (designationId) qs.set('designation_id', designationId);
      if (status) qs.set('status', status);
      const res = await fetch(`/api/employees?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch employees');
      const list = json.employees || [];
      setItems(Array.isArray(list) ? list : []);
      setStatusCounts(json.statusCounts || {});
      const pagination = json.pagination || {};
      setTotal(pagination.total ?? list.length ?? 0);
      setTotalPages(pagination.pages || 1);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sort, order, debouncedSearch, branchId, departmentId, designationId, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  // Filter option lists
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [b, d, g] = await Promise.all([
          fetch('/api/branches?limit=100', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/departments?limit=100', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/designations?limit=100', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
        ]);
        if (cancelled) return;
        setBranches(Array.isArray(b.branches) ? b.branches : []);
        setDepartments(Array.isArray(d.departments) ? d.departments : []);
        setDesignations(Array.isArray(g.designations) ? g.designations : []);
      } catch {
        if (!cancelled) {
          setBranches([]);
          setDepartments([]);
          setDesignations([]);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSort(field) {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder(field === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  function sortArrow(field) {
    if (sort !== field) return '';
    return order === 'asc' ? ' ↑' : ' ↓';
  }

  async function handleToggle(item) {
    const id = item._id;
    if (!window.confirm('Toggle the login/employee status for this employee?')) return;
    setActioning(id);
    try {
      const res = await fetch(`/api/employees/${id}/toggle-status`, {
        method: 'PUT',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to toggle status');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete(item) {
    const id = item._id;
    if (!window.confirm(`Delete employee "${item.name}"? This also removes the linked login account.`)) return;
    setActioning(id);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  function openPasswordModal(item) {
    setPwFor(item);
    setPwForm({ password: '', password_confirmation: '' });
    setPwError('');
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (!pwFor) return;
    if (pwForm.password.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    if (pwForm.password !== pwForm.password_confirmation) {
      setPwError('Password confirmation does not match');
      return;
    }
    setPwSaving(true);
    setPwError('');
    try {
      const res = await fetch(`/api/employees/${pwFor._id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pwForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json.message ||
          (Array.isArray(json.errors) ? json.errors.map((er) => er.msg).join(', ') : null) ||
          'Failed to change password';
        throw new Error(msg);
      }
      setPwFor(null);
      fetchItems();
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const qs = new URLSearchParams({ page: '1', per_page: '1000', sort, order });
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (branchId) qs.set('branch_id', branchId);
      if (departmentId) qs.set('department_id', departmentId);
      if (designationId) qs.set('designation_id', designationId);
      if (status) qs.set('status', status);
      const res = await fetch(`/api/employees?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to export employees');
      const rows = json.employees || [];
      const header = ['Employee ID', 'Name', 'Email', 'Phone', 'Branch', 'Department', 'Designation', 'Employee Status', 'Login Status', 'Date of Joining'];
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [header.map(esc).join(',')];
      for (const r of rows) {
        lines.push(
          [
            r.employee_id,
            r.name,
            r.email,
            r.phone,
            getRefName(r.branch_id) === '—' ? '' : getRefName(r.branch_id),
            getRefName(r.department_id) === '—' ? '' : getRefName(r.department_id),
            getRefName(r.designation_id) === '—' ? '' : getRefName(r.designation_id),
            r.employee_status,
            r.user ? r.user.status : '',
            r.date_of_joining ? new Date(r.date_of_joining).toISOString().slice(0, 10) : '',
          ]
            .map(esc)
            .join(',')
        );
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setSearch('');
    setBranchId('');
    setDepartmentId('');
    setDesignationId('');
    setStatus('');
    setPage(1);
  }

  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <PageTemplate
      title="Employees"
      description="Manage employees and their information."
      actions={[
        { label: exporting ? 'Exporting...' : 'Export CSV', variant: 'outline', onClick: handleExport, disabled: exporting },
        { label: 'Add Employee', variant: 'default', onClick: () => router.push('/hr/employees/create') },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, email, ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={branchId || '__all'} onValueChange={(v) => { setBranchId(v === '__all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent searchable>
              <SelectItem value="__all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b._id} value={String(b._id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={departmentId || '__all'} onValueChange={(v) => { setDepartmentId(v === '__all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent searchable>
              <SelectItem value="__all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d._id} value={String(d._id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={designationId || '__all'} onValueChange={(v) => { setDesignationId(v === '__all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Designations" />
            </SelectTrigger>
            <SelectContent searchable>
              <SelectItem value="__all">All Designations</SelectItem>
              {designations.map((d) => (
                <SelectItem key={d._id} value={String(d._id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || branchId || departmentId || designationId || status) && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => {
            const active = status === t.value;
            const count = t.value === '' ? statusCounts.all : statusCounts[t.value];
            return (
              <Button
                key={t.label}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => { setStatus(t.value); setPage(1); }}
              >
                {t.label}
                {count !== undefined && <span className="ml-1.5 opacity-70">({count})</span>}
              </Button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>
                <button type="button" className="cursor-pointer hover:underline" onClick={() => handleSort('name')}>
                  Name{sortArrow('name')}
                </button>
              </TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Employee Status</TableHead>
              <TableHead>
                <button type="button" className="cursor-pointer hover:underline" onClick={() => handleSort('created_at')}>
                  Joined{sortArrow('created_at')}
                </button>
              </TableHead>
              <TableHead>Login Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <Badge variant="default">{item.employee_id || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.email}</div>
                  </TableCell>
                  <TableCell>{getRefName(item.department_id)}</TableCell>
                  <TableCell>{getRefName(item.designation_id)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.employee_status)}>{item.employee_status || '—'}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.date_of_joining)}</TableCell>
                  <TableCell>
                    {item.user ? (
                      <Badge variant={item.user.status === 'active' ? 'success' : 'destructive'}>
                        {item.user.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No login</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/hr/employees/${item._id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Link href={`/hr/employees/${item._id}/edit`}>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => openPasswordModal(item)} disabled={!item.user}>
                        Password
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggle(item)} disabled={actioning === item._id}>
                        Toggle
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item)} disabled={actioning === item._id}>
                        {actioning === item._id ? 'Working...' : 'Delete'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {start}–{end} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {pwFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Change Password — {pwFor.name}</h2>
            {pwError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {pwError}
              </div>
            )}
            <form onSubmit={handlePasswordSave} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pw-new" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="pw-new"
                  type="password"
                  placeholder="Min 8 characters"
                  value={pwForm.password}
                  onChange={(e) => setPwForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pw-confirm" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="pw-confirm"
                  type="password"
                  placeholder="Repeat new password"
                  value={pwForm.password_confirmation}
                  onChange={(e) => setPwForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPwFor(null)} disabled={pwSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pwSaving}>
                  {pwSaving ? 'Saving...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
