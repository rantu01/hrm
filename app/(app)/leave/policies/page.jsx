'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
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
  description: '',
  accrualType: 'yearly',
  accrualRate: '0',
  carryForwardLimit: '0',
  minDaysPerApplication: '1',
  maxDaysPerApplication: '30',
  requiresApproval: true,
  status: 'active',
};

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function LeavePoliciesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [access, setAccess] = useState(null);

  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      limit: '10',
      sort_field: 'name',
      sort_direction: 'asc',
    });
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (status !== 'all') sp.set('status', status);
    return sp.toString();
  }, [page, debouncedSearch, status]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/policies?${queryString}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load leave policies');
      setItems(json.policies || []);
      setAccess(json.access || null);
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
      description: item.description || '',
      accrualType: item.accrualType || 'yearly',
      accrualRate: String(item.annualAllocation ?? 0),
      carryForwardLimit: String(item.carryForwardLimit ?? 0),
      minDaysPerApplication: String(item.minDaysPerApplication ?? 1),
      maxDaysPerApplication: String(item.maxDaysPerApplication ?? 30),
      requiresApproval: item.requiresApproval !== false,
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
      if (!form.name.trim()) throw new Error('Leave policy name is required');
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        accrualType: form.accrualType,
        accrualRate: Number(form.annualAllocation) || 0,
        carryForwardLimit: Number(form.carryForwardLimit) || 0,
        minDaysPerApplication: Number(form.minNoticeDays) || 1,
        maxDaysPerApplication: Number(form.maxConsecutiveDays) || 30,
        requiresApproval: form.requiresApproval,
        status: form.status,
      };
      const res = await fetch(
        editing ? `/api/leave/policies/${editing._id}` : '/api/leave/policies',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to save leave policy');
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
      const res = await fetch(`/api/leave/policies/${item._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete leave policy');
      fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
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
          label: 'Add Leave Policy',
          variant: 'default',
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreate,
        },
      ]
    : [];

  return (
    <PageTemplate
      title="Leave Policies"
      description="Configure leave accrual rules, carry forward limits and approval requirements"
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
                placeholder="Search leave policies..."
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const count = items.filter((i) => i.status === tab.value).length;
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
                    {count > 0 ? ` (${count})` : ''}
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
            title="No leave policies found"
            description={
              canManage
                ? 'Create your first leave policy or load the standard set to get started.'
                : 'No leave policies are available yet. Please contact an administrator.'
            }
            action={
              canManage ? (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add Leave Policy
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
                    Policy Name
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="leaveType"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Leave Type
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="accrualType"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Accrual Type
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="accrualRate"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Accrual Rate
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="carryForwardLimit"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Carry Forward Limit
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="minDaysPerApplication"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Min Days/Application
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="maxDaysPerApplication"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Max Days/Application
                  </SortLabel>
                </TableHead>
                <TableHead>
                  <SortLabel
                    field="requiresApproval"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  >
                    Requires Approval
                  </SortLabel>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Loading leave policies...
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: item.leaveType?.color || '#FFEB00' }}
                        />
                        <div className="min-w-0">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.leaveType?.name || '—'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{item.accrualType}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{Number(item.accrualRate)}</span>
                      <span className="text-xs text-muted-foreground"> days</span>
                    </TableCell>
                    <TableCell>
                      <span>{Number(item.carryForwardLimit)}</span>
                    </TableCell>
                    <TableCell>
                      <span>{Number(item.minDaysPerApplication)}</span>
                    </TableCell>
                    <TableCell>
                      <span>{Number(item.maxDaysPerApplication)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.requiresApproval === false ? 'secondary' : 'outline'}>
                        {item.requiresApproval === false ? 'Auto-approve' : 'Approval'}
                      </Badge>
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
            <span>Page {page} of {pages}</span>
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
        title={editing ? 'Edit Leave Policy' : 'Add Leave Policy'}
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
            <Button type="submit" form="leave-policy-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Leave Policy' : 'Create Leave Policy'}
            </Button>
          </>
        }
      >
        <form id="leave-policy-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {modalError && <ErrorBanner message={modalError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-name" required>
                Name
              </Label>
              <Input
                id="policy-name"
                value={form.name}
                required
                placeholder="e.g. Annual Leave Policy"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-description">Description</Label>
              <Textarea
                id="policy-description"
                value={form.description}
                placeholder="Short description shown to employees"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-accrual-type">Accrual Type</Label>
              <Select
                value={form.accrualType}
                onValueChange={(value) => setForm((prev) => ({ ...prev, accrualType: value }))}
              >
                <SelectTrigger id="policy-accrual-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-accrual-rate">Accrual Rate (days per period)</Label>
              <Input
                id="policy-accrual-rate"
                type="number"
                min="0"
                max="365"
                step="0.01"
                value={form.accrualRate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, accrualRate: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-carry-forward">Carry Forward Limit</Label>
              <Input
                id="policy-carry-forward"
                type="number"
                min="0"
                step="1"
                value={form.carryForwardLimit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, carryForwardLimit: event.target.value }))
                }
              />
              <span className="text-xs text-muted-foreground">
                Max days that can be carried forward to next year
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-min-days">Min Days per Application</Label>
              <Input
                id="policy-min-days"
                type="number"
                min="1"
                step="1"
                value={form.minDaysPerApplication}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minDaysPerApplication: event.target.value }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-max-days">Max Days per Application</Label>
              <Input
                id="policy-max-days"
                type="number"
                min="1"
                step="1"
                value={form.maxDaysPerApplication}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxDaysPerApplication: event.target.value }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-requires-approval">Requires Approval</Label>
              <Select
                value={form.requiresApproval}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, requiresApproval: value }))
                }
              >
                <SelectTrigger id="policy-requires-approval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            {[
              ['status', 'Status'],
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