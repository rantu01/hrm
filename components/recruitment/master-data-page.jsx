'use client';

import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Modal,
  StatCard,
  StatusBadge,
  ErrorBanner,
  SuccessBanner,
  Field,
  FilterSelect,
  Pagination,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
import { formatDate } from '@/lib/recruitment';
import { Layers, CheckCircle2, XCircle } from 'lucide-react';

const EMPTY = {};

/** Select field that lazily loads its options from an API endpoint. */
function OptionSelect({ field, id, value, onChange, disabled }) {
  const { options, loading } = useOptionList(field.optionsEndpoint, field.optionsKey, field.optionsFilter || {});
  return (
    <Select value={value ? String(value) : 'none'} onValueChange={(v) => onChange(field.name, v === 'none' ? '' : v)} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={loading ? 'Loading...' : field.placeholder || 'Select...'} />
      </SelectTrigger>
      <SelectContent searchable>
        <SelectItem value="none">{field.emptyLabel || 'None'}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExtraFilterSelect({ filter, value, onChange }) {
  const { options } = useOptionList(filter.optionsEndpoint, filter.optionsKey, filter.optionsFilter || {});
  return (
    <FilterSelect
      placeholder={filter.placeholder}
      ariaLabel={filter.ariaLabel || filter.placeholder}
      value={value}
      onValueChange={onChange}
      options={options}
      className={filter.className}
    />
  );
}

function FormField({ field, form, onChange, disabled }) {
  const id = `md-${field.name}`;
  const value = form[field.name];

  if (field.type === 'checkbox') {
    return (
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
      >
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(field.name, checked === true)}
          disabled={disabled}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <Field label={field.label} htmlFor={id} required={field.required} hint={field.hint} className={field.className}>
      {field.type === 'textarea' ? (
        <Textarea
          id={id}
          rows={field.rows || 4}
          value={value ?? ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          disabled={disabled}
        />
      ) : field.type === 'select' ? (
        field.optionsEndpoint ? (
          <OptionSelect field={field} id={id} value={value} onChange={onChange} disabled={disabled} />
        ) : (
          <Select
            value={value ? String(value) : 'none'}
            onValueChange={(v) => onChange(field.name, v === 'none' ? '' : v)}
            disabled={disabled}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent searchable>
              {!field.required ? <SelectItem value="none">{field.emptyLabel || 'None'}</SelectItem> : null}
              {(field.options || []).map((option) => (
                <SelectItem key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <Input
          id={id}
          type={field.type || 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
        />
      )}
    </Field>
  );
}

/**
 * Generic master-data CRUD screen (search, status tabs, sorting, pagination,
 * create/edit modal, toggle status, delete). Used by the recruitment lookup
 * resources so every settings screen behaves identically.
 */
export function MasterDataPage({
  title,
  description,
  endpoint,
  entityKey,
  itemKey,
  columns = [],
  fields = [],
  defaultForm = EMPTY,
  searchPlaceholder = 'Search...',
  hasStatus = true,
  canToggle = true,
  canDelete = true,
  createLabel = 'Add New',
  extraFilters = [],
  toolbarActions,
  rowActions,
  modalSize = 'lg',
  transformSave,
  onSaved,
  deleteConfirm,
  extraStatCards,
}) {
  const list = useRecruitmentList(endpoint, entityKey, {
    initialFilters: {},
    sortField: 'created_at',
    sortDirection: 'desc',
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  const stats = list.statusCounts || {};

  function openCreate() {
    setEditing(null);
    setForm({ ...defaultForm });
    setFormError('');
    setOpen(true);
  }

  function openEdit(item) {
    const next = { ...defaultForm };
    for (const key of Object.keys(defaultForm)) {
      const value = item[key];
      next[key] = value === undefined || value === null ? defaultForm[key] : value;
    }
    // also copy any field keys not present in defaultForm
    for (const field of fields) {
      if (item[field.name] !== undefined && item[field.name] !== null) {
        next[field.name] = field.type === 'select' && field.optionsEndpoint ? String(item[field.name]) : item[field.name];
      }
    }
    setEditing(item);
    setForm(next);
    setFormError('');
    setOpen(true);
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = transformSave ? transformSave(form) : { ...form };
      for (const key of Object.keys(payload)) {
        if (payload[key] === '' || payload[key] === undefined) delete payload[key];
      }
      const res = await fetch(editing ? `${endpoint}/${editing._id}` : endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save'));
      const json = await res.json().catch(() => ({}));
      setOpen(false);
      setSuccess(json.message || (editing ? 'Updated successfully.' : 'Created successfully.'));
      list.refresh();
      onSaved?.(json[itemKey] || json.item);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item) {
    setBusyId(item._id);
    setSuccess('');
    try {
      const res = await fetch(`${endpoint}/${item._id}/toggle-status`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update status'));
      const json = await res.json().catch(() => ({}));
      setSuccess(json.message || 'Status updated.');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
      setSuccess('');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item) {
    const label = item.name || item.title || item.question || item.task_name || 'this record';
    if (!window.confirm(deleteConfirm ? deleteConfirm(item) : `Delete "${label}"? This cannot be undone.`)) return;
    setBusyId(item._id);
    setSuccess('');
    try {
      const res = await fetch(`${endpoint}/${item._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete'));
      setSuccess('Deleted successfully.');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
      setSuccess('');
    } finally {
      setBusyId(null);
    }
  }

  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);
  const colSpan = columns.length + (canToggle || canDelete || rowActions ? 1 : 0);
  const resolvedToolbar = typeof toolbarActions === 'function' ? toolbarActions({ list, openCreate }) : toolbarActions;

  return (
    <PageTemplate
      title={title}
      description={description}
      actions={[{ label: createLabel, variant: 'default', onClick: openCreate }]}
    >
      <div className="flex flex-col gap-4">
        {hasStatus ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total" value={stats.all ?? 0} icon={Layers} accent="blue" />
            <StatCard label="Active" value={stats.active ?? 0} icon={CheckCircle2} accent="emerald" />
            <StatCard label="Inactive" value={stats.inactive ?? 0} icon={XCircle} accent="slate" />
            {extraStatCards || null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search"
          />
          {extraFilters.map((filter) => (
            <ExtraFilterSelect
              key={filter.name}
              filter={filter}
              value={list.filters[filter.name]}
              onChange={(v) => list.setFilter(filter.name, v)}
            />
          ))}
          <Select
            value={String(list.perPage)}
            onValueChange={(v) => {
              list.setPerPage(Number(v) || 10);
              list.setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {list.perPageOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resolvedToolbar ? <div className="ml-auto flex flex-wrap items-center gap-2">{resolvedToolbar}</div> : null}
        </div>

        {hasStatus ? (
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'All', count: stats.all },
              { value: 'active', label: 'Active', count: stats.active },
              { value: 'inactive', label: 'Inactive', count: stats.inactive },
            ].map((tab) => {
              const active = (list.filters.status || 'all') === tab.value;
              return (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => list.setFilter('status', tab.value)}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count !== null ? ` (${tab.count})` : ''}
                </Button>
              );
            })}
          </div>
        ) : null}

        {success ? <SuccessBanner message={success} /> : null}
        {formError && !open ? <ErrorBanner message={formError} /> : null}
        {list.error ? <ErrorBanner message={list.error} /> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => list.toggleSort(column.sortKey || column.key)}
                        className="inline-flex items-center gap-1 font-medium hover:underline"
                      >
                        {column.label}
                        <span aria-hidden="true">
                          {list.sort.field === (column.sortKey || column.key)
                            ? list.sort.direction === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
                {canToggle || canDelete || rowActions ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={colSpan} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={colSpan} label={`No ${title.toLowerCase()} found.`} />
              ) : (
                list.items.map((item) => (
                  <TableRow key={item._id}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render ? column.render(item) : item[column.key] ?? '—'}
                      </TableCell>
                    ))}
                    {canToggle || canDelete || rowActions ? (
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {rowActions ? rowActions(item) : null}
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                            Edit
                          </Button>
                          {canToggle && hasStatus ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === item._id}
                              onClick={() => handleToggle(item)}
                            >
                              {item.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busyId === item._id}
                              onClick={() => handleDelete(item)}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={list.page}
          pages={list.pages}
          total={list.total}
          from={from}
          to={to}
          onPage={list.setPage}
          disabled={list.loading}
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} ${title.replace(/s$/, '')}`}
        description={editing ? 'Update the details below.' : 'Fill in the details below.'}
        size={modalSize}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="master-data-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="master-data-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                form={form}
                onChange={setField}
                disabled={saving}
              />
            ))}
          </div>
        </form>
      </Modal>
    </PageTemplate>
  );
}

export function dateCell(value) {
  return formatDate(value);
}

export function statusCell(item, labels) {
  return <StatusBadge status={item.status} labels={labels} />;
}
