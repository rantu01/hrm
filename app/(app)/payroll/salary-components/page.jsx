'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Power,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { TakaIcon } from '@/components/taka-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DataPagination,
  ActiveStatusBadge,
  ErrorBanner,
  SuccessBanner,
  PageLoading,
  EmptyState,
  formatCurrency,
} from '@/components/payroll/payroll-shared';

const emptyComponent = {
  id: null,
  name: '',
  description: '',
  type: 'earning',
  calculationType: 'fixed',
  defaultAmount: '',
  percentageOfBasic: '',
  isTaxable: true,
  isMandatory: false,
  status: 'active',
};

function typeBadge(type) {
  return type === 'deduction' ? (
    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
      Deduction
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      Earning
    </span>
  );
}

export default function SalaryComponentsPage() {
  const [components, setComponents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [access, setAccess] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [form, setForm] = useState(emptyComponent);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (debouncedSearch.trim()) sp.set('search', debouncedSearch.trim());
      if (typeFilter !== 'all') sp.set('type', typeFilter);
      if (statusFilter !== 'all') sp.set('status', statusFilter);

      const response = await fetch(`/api/payroll/salary-components?${sp.toString()}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to load salary components');
      }
      setComponents(data.components || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      setAccess(data.access || null);
    } catch (fetchError) {
      setError(fetchError.message);
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComponents();
  }, [fetchComponents]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter, perPage]);

  function resetForm() {
    setForm(emptyComponent);
    setFormError('');
  }

  function startEdit(component) {
    setForm({
      id: component._id,
      name: component.name || '',
      description: component.description || '',
      type: component.type || 'earning',
      calculationType: component.calculationType || 'fixed',
      defaultAmount:
        component.defaultAmount === 0 || component.defaultAmount == null
          ? ''
          : String(component.defaultAmount),
      percentageOfBasic:
        component.percentageOfBasic == null
          ? ''
          : String(component.percentageOfBasic),
      isTaxable: component.isTaxable !== false,
      isMandatory: Boolean(component.isMandatory),
      status: component.status || 'active',
    });
    setFormError('');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function saveComponent(event) {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Component name is required.');
      return;
    }
    if (form.calculationType === 'fixed') {
      const amount = Number(form.defaultAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        setFormError('Default amount must be a non-negative number.');
        return;
      }
    } else {
      const percentage = Number(form.percentageOfBasic);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        setFormError('Percentage of basic salary must be between 0 and 100.');
        return;
      }
    }

    setSaving(true);
    try {
      const isEdit = Boolean(form.id);
      const response = await fetch(
        isEdit
          ? `/api/payroll/salary-components/${form.id}`
          : '/api/payroll/salary-components',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description,
            type: form.type,
            calculationType: form.calculationType,
            defaultAmount:
              form.calculationType === 'fixed' ? Number(form.defaultAmount) || 0 : 0,
            percentageOfBasic:
              form.calculationType === 'percentage'
                ? Number(form.percentageOfBasic) || 0
                : null,
            isTaxable: form.isTaxable,
            isMandatory: form.isMandatory,
            status: form.status,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save component');

      setSuccess(data.message || 'Salary component saved successfully.');
      resetForm();
      await fetchComponents();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(component) {
    setBusy(`toggle-${component._id}`);
    setError('');
    try {
      const response = await fetch(
        `/api/payroll/salary-components/${component._id}/toggle-status`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update status');
      setSuccess(data.message || 'Status updated.');
      await fetchComponents();
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setBusy('');
    }
  }

  async function deleteComponent() {
    if (!deleteTarget) return;
    setBusy(`delete-${deleteTarget._id}`);
    setError('');
    try {
      const response = await fetch(
        `/api/payroll/salary-components/${deleteTarget._id}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to delete component');
      setSuccess(data.message || 'Salary component deleted.');
      if (form.id === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      await fetchComponents();
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleteTarget(null);
    } finally {
      setBusy('');
    }
  }

  return (
    <PageTemplate
      title="Salary Components"
      description="Configure the earnings and deductions used to build employee salary structures."
      noPadding
      actions={[
        {
          label: 'Refresh',
          icon: <RefreshCw className="h-4 w-4" />,
          onClick: fetchComponents,
          variant: 'outline',
          disabled: loading,
        },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                {form.id ? 'Edit Component' : 'Create Component'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {form.id
                  ? 'Update this salary component.'
                  : 'Add an earning or deduction component.'}
              </p>
            </div>
            {form.id && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>

          {!access?.canCreateComponents && !form.id ? (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              You do not have permission to create salary components.
            </div>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={saveComponent}>
              {formError && <ErrorBanner message={formError} />}

              <div className="space-y-1.5">
                <Label htmlFor="component-name">Name</Label>
                <Input
                  id="component-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. House Allowance"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="component-description">Description</Label>
                <Textarea
                  id="component-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional description…"
                  rows={2}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="component-type">Type</Label>
                  <select
                    id="component-type"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, type: event.target.value }))
                    }
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="component-calculation">Calculation</Label>
                  <select
                    id="component-calculation"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.calculationType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        calculationType: event.target.value,
                      }))
                    }
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">% of Basic</option>
                  </select>
                </div>
              </div>

              {form.calculationType === 'fixed' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="component-amount">Default Amount</Label>
                  <div className="relative">
                    <TakaIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sm text-muted-foreground" />
                    <Input
                      id="component-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-9"
                      value={form.defaultAmount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          defaultAmount: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="component-percentage">Percentage of Basic</Label>
                  <div className="relative">
                    <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="component-percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="pl-9"
                      value={form.percentageOfBasic}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          percentageOfBasic: event.target.value,
                        }))
                      }
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-md border p-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border"
                    checked={form.isTaxable}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isTaxable: event.target.checked,
                      }))
                    }
                  />
                  Taxable
                </label>
                <label className="flex items-center gap-2 rounded-md border p-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border"
                    checked={form.isMandatory}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isMandatory: event.target.checked,
                      }))
                    }
                  />
                  Mandatory
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="component-status">Status</Label>
                <select
                  id="component-status"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : form.id ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {form.id ? 'Save Changes' : 'Create Component'}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Components</h2>
              <p className="text-xs text-muted-foreground">
                {pagination.total} component{pagination.total === 1 ? '' : 's'} configured
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search components…"
                  className="pl-9"
                />
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All types</option>
                <option value="earning">Earnings</option>
                <option value="deduction">Deductions</option>
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <ErrorBanner message={error} onClose={() => setError('')} />
          <SuccessBanner message={success} onClose={() => setSuccess('')} />

          {loading ? (
            <PageLoading label="Loading salary components…" />
          ) : components.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No salary components found"
                description="Create earnings such as allowances and bonuses, or deductions such as tax and insurance."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Component</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Calculation</TableHead>
                      <TableHead className="hidden sm:table-cell">Flags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((component) => (
                      <TableRow key={component._id}>
                        <TableCell>
                          <p className="text-sm font-medium">{component.name}</p>
                          {component.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {component.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{typeBadge(component.type)}</TableCell>
                        <TableCell className="text-sm">
                          {component.calculationType === 'percentage'
                            ? `${component.percentageOfBasic || 0}% of basic`
                            : formatCurrency(component.defaultAmount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {component.isTaxable && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                Taxable
                              </span>
                            )}
                            {component.isMandatory && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                Mandatory
                              </span>
                            )}
                            {!component.isTaxable && !component.isMandatory && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActiveStatusBadge active={component.status === 'active'} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {access?.canEditComponents && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Edit component"
                                onClick={() => startEdit(component)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {access?.canEditComponents && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title={
                                  component.status === 'active'
                                    ? 'Deactivate component'
                                    : 'Activate component'
                                }
                                disabled={busy === `toggle-${component._id}`}
                                onClick={() => toggleStatus(component)}
                              >
                                {busy === `toggle-${component._id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {access?.canDeleteComponents && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-600"
                                title="Delete component"
                                onClick={() => setDeleteTarget(component)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataPagination
                pagination={pagination}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemLabel="components"
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Salary Component"
        description="This component will be removed from the catalog. Existing salary structures that reference it will simply ignore it during calculation."
        onClose={() => (busy ? null : setDeleteTarget(null))}
        closeDisabled={Boolean(busy)}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(busy)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteComponent}
              disabled={Boolean(busy)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Component
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Are you sure you want to delete{' '}
          <span className="font-semibold">{deleteTarget?.name}</span>?
        </p>
      </Modal>
    </PageTemplate>
  );
}
