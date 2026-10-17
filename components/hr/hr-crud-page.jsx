'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function getValue(obj, path) {
  if (!obj || !path) return '';
  return path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return '';
    return acc[part];
  }, obj);
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return String(value);
  // ISO date strings / Date objects → readable date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return String(value);
}

function statusVariant(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'published', 'completed'].includes(s)) return 'success';
  if (['inactive', 'draft', 'archived'].includes(s)) return 'secondary';
  if (['terminated'].includes(s)) return 'destructive';
  return 'outline';
}

function toDateInputValue(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function emptyFormData(fields) {
  const data = {};
  for (const f of fields) {
    data[f.name] = f.type === 'number' ? '' : '';
  }
  return data;
}

// Map UI column keys to API sort_field values (API uses snake_case).
function columnSortField(col) {
  if (col.sortKey) return col.sortKey;
  if (col.key === 'createdAt') return 'created_at';
  return col.key;
}

export default function HrCrudPage({
  title,
  description,
  apiEndpoint,
  itemKey,
  columns,
  fields,
  searchPlaceholder,
  createLabel,
  // Optional extensions (all backward-compatible)
  sortable = false,
  perPageOptions = [10],
  statusTabs = null,
  filters = [],
  viewConfig = null,
  toggleStatus = false,
  rowActions = [],
  extraActions = [],
}) {
  const perPageChoices =
    Array.isArray(perPageOptions) && perPageOptions.length > 0 ? perPageOptions : [10];
  const countsKey = (statusTabs && statusTabs.countsKey) || 'statusCounts';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(perPageChoices[0]);
  const [sortField, setSortField] = useState(sortable ? 'created_at' : '');
  const [sortDirection, setSortDirection] = useState(sortable ? 'desc' : '');
  const [statusValue, setStatusValue] = useState('all');
  const [filterValues, setFilterValues] = useState({});
  const [statusCounts, setStatusCounts] = useState({});
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formData, setFormData] = useState(emptyFormData(fields));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [relationOptions, setRelationOptions] = useState({});
  const [filterOptions, setFilterOptions] = useState({});

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filterSignature = useMemo(() => JSON.stringify(filterValues), [filterValues]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', String(perPage));
    sp.set('per_page', String(perPage));
    if (debouncedSearch) sp.set('search', debouncedSearch);
    if (sortable && sortField) sp.set('sort_field', sortField);
    if (sortable && sortDirection) sp.set('sort_direction', sortDirection);
    if (statusTabs && statusValue && statusValue !== 'all' && statusValue !== '') {
      sp.set('status', statusValue);
    }
    const parsed = JSON.parse(filterSignature || '{}');
    for (const f of filters || []) {
      const v = parsed[f.name];
      if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        sp.set(f.name, String(v));
      }
    }
    return sp.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debouncedSearch, sortField, sortDirection, statusValue, filterSignature, apiEndpoint, sortable, statusTabs]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiEndpoint}?${queryString}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || json.error || 'Failed to fetch data');
        }
        if (cancelled) return;
        const list = json[itemKey] || json.employees || [];
        setItems(Array.isArray(list) ? list : []);
        const pagination = json.pagination || {};
        setTotal(pagination.total ?? list.length ?? 0);
        setTotalPages(pagination.pages || 1);
        if (json[countsKey] && typeof json[countsKey] === 'object') {
          setStatusCounts(json[countsKey]);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [apiEndpoint, itemKey, queryString, countsKey, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  // Fetch relation options once (form selects)
  useEffect(() => {
    const relationFields = fields.filter((f) => f.optionsEndpoint);
    if (relationFields.length === 0) return;
    let cancelled = false;
    async function load() {
      const entries = await Promise.all(
        relationFields.map(async (f) => {
          try {
            const res = await fetch(`${f.optionsEndpoint}?limit=100`, {
              credentials: 'include',
            });
            const json = await res.json();
            const rawList = json[f.optionsKey] || json.employees || [];
            const labelKey = f.optionLabel || 'name';
            const valueKey = f.optionValue || '_id';
            const mapped = (Array.isArray(rawList) ? rawList : []).map((o) => ({
              value: String(getValue(o, valueKey) ?? o._id ?? o.name ?? ''),
              label: String(getValue(o, labelKey) ?? o.name ?? ''),
            }));
            return [f.name, mapped];
          } catch {
            return [f.name, []];
          }
        })
      );
      if (!cancelled) setRelationOptions(Object.fromEntries(entries));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fields]);

  // Fetch options for header filter dropdowns
  const filtersSignature = useMemo(() => JSON.stringify(filters || []), [filters]);
  useEffect(() => {
    const defs = (JSON.parse(filtersSignature || '[]') || []).filter((f) => f.optionsEndpoint);
    if (defs.length === 0) return;
    let cancelled = false;
    async function load() {
      const entries = await Promise.all(
        defs.map(async (f) => {
          try {
            const res = await fetch(`${f.optionsEndpoint}?limit=100`, {
              credentials: 'include',
            });
            const json = await res.json();
            const rawList = json[f.optionsKey] || [];
            const labelKey = f.optionLabel || 'name';
            const valueKey = f.optionValue || '_id';
            const mapped = (Array.isArray(rawList) ? rawList : []).map((o) => ({
              value: String(getValue(o, valueKey) ?? o._id ?? o.name ?? ''),
              label: String(getValue(o, labelKey) ?? o.name ?? ''),
            }));
            return [f.name, mapped];
          } catch {
            return [f.name, []];
          }
        })
      );
      if (!cancelled) setFilterOptions(Object.fromEntries(entries));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filtersSignature]);

  function getFieldOptions(field) {
    if (field.options) return field.options;
    if (field.optionsEndpoint) return relationOptions[field.name] || [];
    return [];
  }

  function getFilterOptions(filter) {
    if (filterOptions[filter.name]) return filterOptions[filter.name];
    return filter.staticOptions || [];
  }

  function openCreate() {
    setEditing(null);
    setFormData(emptyFormData(fields));
    setError('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    const data = {};
    for (const f of fields) {
      if (f.createOnly) continue;
      const raw = getValue(item, f.name);
      if (f.type === 'date') {
        data[f.name] = toDateInputValue(raw);
      } else if (raw === null || raw === undefined) {
        data[f.name] = '';
      } else if (typeof raw === 'object') {
        // relation object → use its _id or name
        data[f.name] = String(raw._id || raw.name || '');
      } else {
        data[f.name] = raw;
      }
    }
    setError('');
    setFormData(data);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setSaving(false);
  }

  function handleChange(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSortClick(col) {
    if (!sortable || !col.sortable) return;
    const field = columnSortField(col);
    setPage(1);
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {};
      for (const f of fields) {
        let v = formData[f.name];
        // Omit empty values so optional ObjectId/date/number refs don't
        // fail Mongoose casting (e.g. '' -> ObjectId CastError).
        if (v === '' || v === undefined || v === null) continue;
        if (f.type === 'date' && v) {
          const d = new Date(v);
          payload[f.name] = isNaN(d.getTime()) ? v : d.toISOString();
        } else if (f.type === 'number' && v !== '') {
          const n = Number(v);
          payload[f.name] = isNaN(n) ? v : n;
        } else {
          payload[f.name] = v;
        }
      }
      const isEdit = Boolean(editing && (editing._id || editing.id));
      const url = isEdit
        ? `${apiEndpoint}/${editing._id || editing.id}`
        : apiEndpoint;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json.message ||
          json.error ||
          (Array.isArray(json.errors)
            ? json.errors.map((er) => er.msg || er.message || er.path || JSON.stringify(er)).join(', ')
            : null) ||
          'Failed to save';
        throw new Error(msg);
      }
      closeModal();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const id = item._id || item.id;
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch(`${apiEndpoint}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to delete');
      }
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleStatus(item) {
    const id = item._id || item.id;
    if (!id) return;
    setToggling(id);
    setError('');
    try {
      const res = await fetch(`${apiEndpoint}/${id}/toggle-status`, {
        method: 'PUT',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to update status');
      }
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  function renderCell(col, item) {
    const raw = getValue(item, col.key);
    if (typeof col.render === 'function') {
      try {
        return col.render(raw, item);
      } catch {
        return formatCellValue(raw);
      }
    }
    if (col.key.toLowerCase() === 'status' || col.type === 'badge') {
      return (
        <Badge variant={statusVariant(raw)}>
          {String(raw || '—')}
        </Badge>
      );
    }
    return formatCellValue(raw);
  }

  function renderViewValue(vf, item) {
    const val = getValue(item, vf.key);
    if (vf.type === 'badge' || String(vf.key).toLowerCase() === 'status') {
      return (
        <Badge variant={statusVariant(val)}>
          {String(val || '—')}
        </Badge>
      );
    }
    if (vf.type === 'date') {
      if (!val) return '—';
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
    }
    return formatCellValue(val);
  }

  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const headerActions = [
    ...(Array.isArray(extraActions) ? extraActions : []),
    {
      label: createLabel || 'Add New',
      variant: 'default',
      onClick: openCreate,
    },
  ];

  return (
    <PageTemplate title={title} description={description} actions={headerActions}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={searchPlaceholder || 'Search...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {(filters || []).map((f) => (
            <Select
              key={f.name}
              value={String(filterValues[f.name] ?? 'all')}
              onValueChange={(v) => {
                setFilterValues((prev) => ({ ...prev, [f.name]: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={f.placeholder || f.label} />
              </SelectTrigger>
              <SelectContent searchable>
                <SelectItem value="all">{f.placeholder || `All ${f.label}`}</SelectItem>
                {getFilterOptions(f).map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {perPageChoices.length > 1 && (
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPerPage(Number(v) || perPageChoices[0]);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perPageChoices.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {statusTabs && Array.isArray(statusTabs.tabs) && (
          <div className="flex flex-wrap items-center gap-2">
            {statusTabs.tabs.map((t) => {
              const active = (statusValue || 'all') === t.value;
              const count = statusCounts ? statusCounts[t.value] : undefined;
              return (
                <Button
                  key={t.value}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => {
                    setStatusValue(t.value);
                    setPage(1);
                  }}
                >
                  {t.label}
                  {count !== undefined && count !== null ? ` (${count})` : ''}
                </Button>
              );
            })}
          </div>
        )}

        {error && !showModal && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  {sortable && col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(col)}
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {col.label}
                      <span aria-hidden="true">
                        {sortField === columnSortField(col)
                          ? sortDirection === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const rowId = item._id || item.id;
                const isActive = String(item.status || '').toLowerCase() === 'active';
                return (
                  <TableRow key={rowId}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{renderCell(col, item)}</TableCell>
                    ))}
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {viewConfig && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewing(item)}
                          >
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </Button>
                        {toggleStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggling === rowId}
                            onClick={() => handleToggleStatus(item)}
                          >
                            {toggling === rowId
                              ? 'Updating...'
                              : isActive
                                ? 'Deactivate'
                                : 'Activate'}
                          </Button>
                        )}
                        {(Array.isArray(rowActions) ? rowActions : []).map((a, i) => (
                          <Button
                            key={a.label || i}
                            size="sm"
                            variant={a.variant || 'outline'}
                            onClick={() => a.onClick && a.onClick(item)}
                          >
                            {a.label}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleting === rowId}
                          onClick={() => handleDelete(item)}
                        >
                          {deleting === rowId ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {start}–{end} of {total}
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
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {viewConfig && viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">
              {viewConfig.title || `${title} Details`}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(viewConfig.fields || []).map((vf) => (
                <div key={vf.key} className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {vf.label}
                  </span>
                  <span className="text-sm">{renderViewValue(vf, viewing)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end">
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">
              {editing ? 'Edit' : 'Create'} {title}
            </h2>
            {error && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              {fields
                .filter((field) => !(editing && field.createOnly))
                .map((field) => {
                const val = formData[field.name] ?? '';
                return (
                  <div key={field.name} className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name} required={field.required}>
                      {field.label}
                    </Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.name}
                        placeholder={field.placeholder}
                        value={val}
                        required={field.required}
                        onChange={(e) =>
                          handleChange(field.name, e.target.value)
                        }
                      />
                    ) : field.type === 'select' ? (
                      <Select
                        value={String(val || '')}
                        onValueChange={(v) => handleChange(field.name, v)}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue
                            placeholder={field.placeholder || 'Select...'}
                          />
                        </SelectTrigger>
                        <SelectContent searchable>
                          {getFieldOptions(field).map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={val}
                        required={field.required}
                        onChange={(e) =>
                          handleChange(field.name, e.target.value)
                        }
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
