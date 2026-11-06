'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  Trash2,
  Loader2,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
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
  Avatar,
  formatCurrency,
  formatDate,
} from '@/components/payroll/payroll-shared';

const emptyForm = {
  id: null,
  employee: '',
  basicSalary: '',
  components: [],
  isActive: true,
  notes: '',
};

function componentAmount(component, basicSalary) {
  const basic = Number(basicSalary) || 0;
  if (component.calculationType === 'percentage') {
    return (
      Math.round(
        ((basic * (Number(component.percentageOfBasic) || 0)) / 100) * 100
      ) / 100
    );
  }
  return Number(component.defaultAmount) || 0;
}

function ComponentChecklist({ components, selected, onToggle, basicSalary }) {
  const groups = [
    { type: 'earning', label: 'Earnings' },
    { type: 'deduction', label: 'Deductions' },
  ];

  if (components.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        No salary components have been configured yet. You can save the salary
        structure with the basic salary only and add components later.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const items = components.filter((component) => component.type === group.type);
        if (items.length === 0) return null;
        return (
          <div key={group.type}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((component) => {
                const checked = selected.includes(component._id);
                const disabled = component.status === 'inactive' && !checked;
                return (
                  <label
                    key={component._id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs ${
                      checked ? 'border-primary/40 bg-primary/5' : 'bg-background'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle(component._id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{component.name}</span>
                        <span
                          className={
                            group.type === 'deduction'
                              ? 'shrink-0 text-rose-600'
                              : 'shrink-0 text-emerald-600'
                          }
                        >
                          {formatCurrency(componentAmount(component, basicSalary))}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {component.calculationType === 'percentage'
                          ? `${component.percentageOfBasic || 0}% of basic`
                          : 'Fixed amount'}
                        {component.status === 'inactive' ? ' · Inactive' : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EmployeeSalariesPage() {
  const router = useRouter();

  const [salaries, setSalaries] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [statusCounts, setStatusCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [employees, setEmployees] = useState([]);
  const [components, setComponents] = useState([]);
  const [access, setAccess] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort_field: 'created_at',
        sort_direction: 'desc',
      });
      if (debouncedSearch.trim()) sp.set('search', debouncedSearch.trim());
      if (employeeFilter !== 'all') sp.set('employee_id', employeeFilter);
      if (statusFilter !== 'all') sp.set('is_active', statusFilter);

      const response = await fetch(
        `/api/payroll/employee-salaries?${sp.toString()}`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to load employee salaries');
      }
      setSalaries(data.salaries || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      setStatusCounts(data.statusCounts || { all: 0, active: 0, inactive: 0 });
      setEmployees(data.employees || []);
      setComponents(data.components || []);
      setAccess(data.access || null);
    } catch (fetchError) {
      setError(fetchError.message);
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, employeeFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSalaries();
  }, [fetchSalaries]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, employeeFilter, statusFilter, perPage]);

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setModal({ mode: 'create' });
  }

  function openEdit(salary) {
    setForm({
      id: salary._id,
      employee: String(salary.employee?._id || salary.employee),
      basicSalary:
        salary.basicSalary === 0 || salary.basicSalary == null
          ? ''
          : String(salary.basicSalary),
      components: (salary.components || []).map((component) =>
        String(component._id || component)
      ),
      isActive: salary.isActive !== false,
      notes: salary.notes || '',
    });
    setFormError('');
    setModal({ mode: 'edit' });
  }

  function handleEmployeeChange(value) {
    const employee = employees.find((item) => item._id === value);
    setForm((current) => ({
      ...current,
      employee: value,
      basicSalary:
        current.basicSalary === '' && employee?.base_salary
          ? String(employee.base_salary)
          : current.basicSalary,
    }));
  }

  function toggleComponent(componentId) {
    setForm((current) => ({
      ...current,
      components: current.components.includes(componentId)
        ? current.components.filter((id) => id !== componentId)
        : [...current.components, componentId],
    }));
  }

  async function saveSalary(event) {
    event.preventDefault();
    setFormError('');

    if (!form.employee) {
      setFormError('Select an employee.');
      return;
    }
    const basicSalary = Number(form.basicSalary);
    if (!Number.isFinite(basicSalary) || basicSalary < 0) {
      setFormError('Basic salary must be a non-negative number.');
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(form.id);
      const response = await fetch(
        isEdit
          ? `/api/payroll/employee-salaries/${form.id}`
          : '/api/payroll/employee-salaries',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee: form.employee,
            basicSalary,
            components: form.components,
            isActive: form.isActive,
            notes: form.notes,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save salary');

      setModal(null);
      setSuccess(data.message || 'Employee salary saved successfully.');
      await fetchSalaries();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(salary) {
    setBusy(`toggle-${salary._id}`);
    setError('');
    try {
      const response = await fetch(
        `/api/payroll/employee-salaries/${salary._id}/toggle-status`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update status');
      setSuccess(data.message || 'Status updated.');
      await fetchSalaries();
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setBusy('');
    }
  }

  async function deleteSalary() {
    if (!deleteTarget) return;
    setBusy(`delete-${deleteTarget._id}`);
    setError('');
    try {
      const response = await fetch(
        `/api/payroll/employee-salaries/${deleteTarget._id}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to delete salary');
      setSuccess(data.message || 'Employee salary deleted.');
      setDeleteTarget(null);
      await fetchSalaries();
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleteTarget(null);
    } finally {
      setBusy('');
    }
  }

  const selectedComponents = components.filter((component) =>
    form.components.includes(component._id)
  );
  const previewBasic = Number(form.basicSalary) || 0;
  const previewEarnings =
    selectedComponents
      .filter((component) => component.type === 'earning')
      .reduce((sum, component) => sum + componentAmount(component, previewBasic), 0) || 0;
  const previewDeductions =
    selectedComponents
      .filter((component) => component.type === 'deduction')
      .reduce((sum, component) => sum + componentAmount(component, previewBasic), 0) || 0;
  const previewNet = previewBasic + previewEarnings - previewDeductions;

  const viewSalary = modal?.mode === 'view' ? modal.salary : null;
  const viewComponents = viewSalary?.components || [];

  return (
    <PageTemplate
      title="Employee Salaries"
      description="Assign a basic salary and earning or deduction components to each employee."
      noPadding
      actions={[
        ...(access?.canCreateEmployeeSalaries
          ? [
              {
                label: 'Setup Employee Salary',
                icon: <Plus className="h-4 w-4" />,
                onClick: openCreate,
                variant: 'default',
              },
            ]
          : []),
        {
          label: 'Refresh',
          icon: <RefreshCw className="h-4 w-4" />,
          onClick: fetchSalaries,
          variant: 'outline',
          disabled: loading,
        },
      ]}
    >
      <div className="space-y-4">
        <ErrorBanner message={error} onClose={() => setError('')} />
        <SuccessBanner message={success} onClose={() => setSuccess('')} />

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'all', label: 'All', count: statusCounts.all },
                { value: 'active', label: 'Active', count: statusCounts.active },
                { value: 'inactive', label: 'Inactive', count: statusCounts.inactive },
              ].map((tab) => {
                const active = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={
                      active
                        ? 'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                        : 'rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  >
                    {tab.label}
                    <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                      {tab.count || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee…"
                  className="pl-9"
                />
              </div>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-48"
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
              >
                <option value="all">All employees</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name} ({employee.employee_id || '—'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <PageLoading label="Loading employee salaries…" />
          ) : salaries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No employee salary structures found"
                description="Set up a salary structure with a basic salary and optional components so employees can be included in payroll runs."
                action={
                  access?.canCreateEmployeeSalaries ? (
                    <Button type="button" className="mt-2" onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Setup Employee Salary
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Employee</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="hidden md:table-cell">Components</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Updated</TableHead>
                      <TableHead className="w-[180px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.map((salary) => {
                      const employee = salary.employee || {};
                      const componentNames = (salary.components || [])
                        .map((component) => component.name)
                        .filter(Boolean);
                      return (
                        <TableRow key={salary._id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                name={employee.name}
                                src={employee.profile_image}
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  {employee.name || 'Employee'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {employee.employee_id || '—'}
                                  {employee.email ? ` · ${employee.email}` : ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(salary.basicSalary)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs">
                              {componentNames.length === 0 ? (
                                <span className="text-muted-foreground">
                                  Basic salary only
                                </span>
                              ) : (
                                <>
                                  <p className="line-clamp-1">
                                    {componentNames.slice(0, 2).join(', ')}
                                  </p>
                                  {componentNames.length > 2 && (
                                    <p className="text-muted-foreground">
                                      +{componentNames.length - 2} more
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <ActiveStatusBadge active={salary.isActive !== false} />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {formatDate(salary.updatedAt || salary.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="View salary details"
                                onClick={() => setModal({ mode: 'view', salary })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="View payroll calculation"
                                onClick={() =>
                                  router.push(
                                    `/payroll/employee-salaries/${salary._id}`
                                  )
                                }
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                              {access?.canEditEmployeeSalaries && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Edit salary"
                                  onClick={() => openEdit(salary)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {access?.canEditEmployeeSalaries && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title={
                                    salary.isActive
                                      ? 'Deactivate salary'
                                      : 'Activate salary'
                                  }
                                  disabled={busy === `toggle-${salary._id}`}
                                  onClick={() => toggleStatus(salary)}
                                >
                                  {busy === `toggle-${salary._id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {access?.canDeleteEmployeeSalaries && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-rose-600"
                                  title="Delete salary"
                                  onClick={() => setDeleteTarget(salary)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <DataPagination
                pagination={pagination}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                itemLabel="salary structures"
              />
            </>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(modal && modal.mode !== 'view')}
        title={modal?.mode === 'edit' ? 'Edit Employee Salary' : 'Setup Employee Salary'}
        description={
          modal?.mode === 'edit'
            ? 'Update the basic salary, components and status for this employee.'
            : 'Select the employee, enter their basic salary and choose applicable components.'
        }
        onClose={() => (saving ? null : setModal(null))}
        closeDisabled={saving}
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="employee-salary-form" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {modal?.mode === 'edit' ? 'Save Changes' : 'Create Salary Structure'}
            </Button>
          </>
        }
      >
        <form id="employee-salary-form" className="space-y-4" onSubmit={saveSalary}>
          {formError && <ErrorBanner message={formError} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salary-employee">Employee</Label>
              <select
                id="salary-employee"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                value={form.employee}
                onChange={(event) => handleEmployeeChange(event.target.value)}
                disabled={modal?.mode === 'edit'}
                required
              >
                <option value="">Select employee…</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name} ({employee.employee_id || '—'})
                  </option>
                ))}
              </select>
              {modal?.mode === 'create' && (
                <p className="text-[11px] text-muted-foreground">
                  Each employee can have only one salary structure.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="salary-basic">Basic Salary</Label>
              <Input
                id="salary-basic"
                type="number"
                min="0"
                step="0.01"
                value={form.basicSalary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    basicSalary: event.target.value,
                  }))
                }
                placeholder="0.00"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Saving this value also updates the employee&apos;s base salary.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Estimated monthly net</span>
              <span className="text-base font-semibold">
                {formatCurrency(previewNet)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span>Basic {formatCurrency(previewBasic)}</span>
              <span className="text-emerald-600">
                + Earnings {formatCurrency(previewEarnings)}
              </span>
              <span className="text-rose-600">
                − Deductions {formatCurrency(previewDeductions)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Salary Components</Label>
              <span className="text-[11px] text-muted-foreground">
                {form.components.length} selected
              </span>
            </div>
            <ComponentChecklist
              components={components}
              selected={form.components}
              onToggle={toggleComponent}
              basicSalary={form.basicSalary}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-1.5">
              <Label htmlFor="salary-notes">Notes</Label>
              <Textarea
                id="salary-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Optional notes…"
                rows={2}
              />
            </div>
            <label className="flex items-center gap-2 rounded-md border p-2.5 text-xs sm:mt-6">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewSalary)}
        title="Employee Salary Details"
        description="Salary structure and component amounts."
        onClose={() => setModal(null)}
        size="lg"
        footer={
          <Button type="button" variant="outline" onClick={() => setModal(null)}>
            Close
          </Button>
        }
      >
        {viewSalary && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <Avatar
                name={viewSalary.employee?.name}
                src={viewSalary.employee?.profile_image}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {viewSalary.employee?.name || 'Employee'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {viewSalary.employee?.employee_id || '—'} ·{' '}
                  {viewSalary.employee?.email || 'No email'}
                </p>
              </div>
              <ActiveStatusBadge active={viewSalary.isActive !== false} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Basic Salary</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatCurrency(viewSalary.basicSalary)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Components</p>
                <p className="mt-1 text-lg font-semibold">{viewComponents.length}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Component Breakdown
              </p>
              {viewComponents.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  This employee uses the basic salary only.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {viewComponents.map((component) => (
                    <div
                      key={component._id || component}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium">{component.name || 'Component'}</p>
                        <p className="text-[10px] capitalize text-muted-foreground">
                          {component.type} ·{' '}
                          {component.calculationType === 'percentage'
                            ? `${component.percentageOfBasic || 0}% of basic`
                            : 'Fixed'}
                        </p>
                      </div>
                      <span
                        className={
                          component.type === 'deduction'
                            ? 'font-semibold text-rose-600'
                            : 'font-semibold text-emerald-600'
                        }
                      >
                        {formatCurrency(
                          componentAmount(component, viewSalary.basicSalary)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {viewSalary.notes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-line">
                  {viewSalary.notes}
                </p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Created {formatDate(viewSalary.createdAt)} · Updated{' '}
              {formatDate(viewSalary.updatedAt)}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Employee Salary"
        description="This removes the employee's salary structure. Existing payroll history and payslips are not affected."
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
              onClick={deleteSalary}
              disabled={Boolean(busy)}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Salary
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Delete the salary structure for{' '}
          <span className="font-semibold">{deleteTarget?.employee?.name}</span>?
        </p>
      </Modal>
    </PageTemplate>
  );
}
