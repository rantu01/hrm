'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Sparkles,
  Pencil,
  Trash2,
  Power,
  CalendarDays,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  EmptyState,
  ErrorBanner,
  Modal,
  StatusBadge,
  formatDays,
  useDebouncedValue,
} from '@/components/leave/leave-shared';

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  annualAllocation: '20',
  color: '#FFEB00',
  isPaid: true,
  requiresApproval: true,
  allowHalfDay: true,
  includeWeekends: false,
  minNoticeDays: '0',
  maxConsecutiveDays: '0',
  status: 'active',
};

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function LeaveTypesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [access, setAccess] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      limit: '10',
      per_page: '10',
      include_inactive: 'true',
      sort_field: sortField,
      sort_direction: sortDirection,
    });
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (status !== 'all') sp.set('status', status);
    return sp.toString();
  }, [page, debouncedSearch, status, sortField, sortDirection]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/types?${queryString}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load leave types');
      setItems(json.leaveTypes || []);
      setAccess(json.access || null);
      setStatusCounts(json.statusCounts || {});
      setTotal(json.pagination?.total || 0);
      setPages(json.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 0);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const canManage = Boolean(access?.canManageTypes);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalError('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      annualAllocation: String(item.annualAllocation ?? 0),
      color: item.color || '#FFEB00',
      isPaid: item.isPaid !== false,
      requiresApproval: item.requiresApproval !== false,
      allowHalfDay: item.allowHalfDay !== false,
      includeWeekends: Boolean(item.includeWeekends),
      minNoticeDays: String(item.minNoticeDays ?? 0),
      maxConsecutiveDays: String(item.maxConsecutiveDays ?? 0),
      status: item.status || 'active',
    });
    setModalError('');
    setShowModal(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setModalError('');
    try {
      if (!form.name.trim()) throw new Error('Leave type name is required');
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        annualAllocation: Number(form.annualAllocation) || 0,
        color: form.color,
        isPaid: form.isPaid,
        requiresApproval: form.requiresApproval,
        allowHalfDay: form.allowHalfDay,
        includeWeekends: form.includeWeekends,
        minNoticeDays: Number(form.minNoticeDays) || 0,
        maxConsecutiveDays: Number(form.maxConsecutiveDays) || 0,
        status: form.status,
      };
      const res = await fetch(
        editing ? `/api/leave/types/${editing._id}` : '/api/leave/types',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to save leave type');
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(item._id);
    setError('');
    try {
      const res = await fetch(`/api/leave/types/${item._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete leave type');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggle(item) {
    setToggling(item._id);
    setError('');
    try {
      const res = await fetch(`/api/leave/types/${item._id}/toggle-status`, {
        method: 'PUT',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to update leave type');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  async function handleSeedDefaults() {
    if (!window.confirm('Create the standard leave types (Annual, Sick, Casual, Maternity, Paternity, Unpaid)? Existing types are not changed.')) {
      return;
    }
    setSeeding(true);
    setError('');
    try {
      const res = await fetch('/api/leave/types/seed', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to create default leave types');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  }

  function toggleSort(field) {
    setPage(1);
    if (sortField === field) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const actions = canManage
    ? [
        {
          label: seeding ? 'Loading...' : 'Load Defaults',
          variant: 'outline',
          icon: <Sparkles className="h-4 w-4" />,
          disabled: seeding,
          onClick: handleSeedDefaults,
        },
        {
          label: 'Add Leave Type',
          variant: 'default',
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreate,
        },
      ]
    : [];

  return (
    <PageTemplate
      title="Leave Types"
      description="Configure the leave categories, allocations and approval rules"
      actions={actions}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search leave types..."
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const count = statusCounts[tab.value];
                return (
                  <Button
                    key={tab.value}
                    size="sm"
                    variant={status === tab.value ? 'default' : 'outline'}
                    onClick={() => {
                      setStatus(tab.value);
                      setPage(1);
                    }}
                  >
                    {tab.label}
                    {count !== undefined ? ` (${count})` : ''}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {items.length === 0 && !loading ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave types found"
            description={
              canManage
                ? 'Create your own leave type or load the standard set to get started.'
                : 'No leave types are available yet. Please contact an administrator.'
            }
            action={
              canManage ? (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add Leave Type
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSeedDefaults} disabled={seeding}>
                    <Sparkles className="h-4 w-4" /> Load Defaults
                  </Button>
                </div>
              ) : null
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortLabel
                    field="name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Leave Type
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="annualAllocation"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Annual Allocation
                  </SortLabel>
                </TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading leave types...
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: item.color || '#FFEB00' }}
                        />
                        <div className="min-w-0">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.code}
                            {item.description ? ` • ${item.description}` : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatDays(item.annualAllocation)}</span>{' '}
                      <span className="text-xs text-muted-foreground">days / year</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={item.isPaid === false ? 'outline' : 'success'}>
                          {item.isPaid === false ? 'Unpaid' : 'Paid'}
                        </Badge>
                        <Badge variant={item.requiresApproval === false ? 'secondary' : 'outline'}>
                          {item.requiresApproval === false ? 'Auto-approve' : 'Approval'}
                        </Badge>
                        {item.allowHalfDay && <Badge variant="outline">Half-day</Badge>}
                        {item.includeWeekends && <Badge variant="outline">Counts weekends</Badge>}
                      </div>
                      {Number(item.minNoticeDays) > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.minNoticeDays} day(s) notice
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{item.usageCount || 0} requests</div>
                      <div className="text-xs text-muted-foreground">
                        {item.balanceCount || 0} balance rows
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggling === item._id}
                            onClick={() => handleToggle(item)}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {item.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deleting === item._id}
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span>
              Page {page} of {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Leave Type' : 'Add Leave Type'}
        description="Define how this leave category is allocated, calculated and approved."
        size="lg"
        closeDisabled={saving}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="leave-type-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Leave Type' : 'Create Leave Type'}
            </Button>
          </>
        }
      >
        <form id="leave-type-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {modalError && <ErrorBanner message={modalError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-name" required>
                Name
              </Label>
              <Input
                id="type-name"
                value={form.name}
                required
                placeholder="e.g. Annual Leave"
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-code">Code</Label>
              <Input
                id="type-code"
                value={form.code}
                placeholder="ANNUAL"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
              />
              <span className="text-xs text-muted-foreground">
                Generated automatically when left blank.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type-description">Description</Label>
            <Textarea
              id="type-description"
              value={form.description}
              placeholder="Short description shown to employees"
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-allocation" required>
                Annual Allocation
              </Label>
              <Input
                id="type-allocation"
                type="number"
                min="0"
                max="365"
                step="0.5"
                value={form.annualAllocation}
                required
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, annualAllocation: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-notice">Minimum Notice (days)</Label>
              <Input
                id="type-notice"
                type="number"
                min="0"
                max="365"
                value={form.minNoticeDays}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minNoticeDays: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-max">Max Consecutive (0 = none)</Label>
              <Input
                id="type-max"
                type="number"
                min="0"
                max="365"
                value={form.maxConsecutiveDays}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxConsecutiveDays: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-color">Calendar Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  id="type-color"
                  type="color"
                  value={form.color}
                  onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                />
                <Input
                  value={form.color}
                  onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  className="max-w-[140px] font-mono text-xs uppercase"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="type-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            {[
              ['isPaid', 'Paid leave'],
              ['requiresApproval', 'Requires approval'],
              ['allowHalfDay', 'Allow half-day requests'],
              ['includeWeekends', 'Count weekends as leave days'],
            ].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(form[key])}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, [key]: Boolean(checked) }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </form>
      </Modal>
    </PageTemplate>
  );
}

function SortLabel({ field, children, sortField, sortDirection, onSort }) {
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 font-medium hover:underline"
    >
      {children}
      <span aria-hidden="true">
        {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}
