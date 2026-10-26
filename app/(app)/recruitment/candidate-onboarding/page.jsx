'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Modal,
  StatCard,
  ErrorBanner,
  SuccessBanner,
  Field,
  FilterSelect,
  Pagination,
  StatusBadge,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
import { ONBOARDING_STATUSES, ONBOARDING_STATUS_LABELS, formatDate, initialsOf } from '@/lib/recruitment';
import { ClipboardList, Clock, PlayCircle, CheckCircle2, Plus } from 'lucide-react';

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Users are labelled by name but carry the email so it can be searched/shown. */
function userOptions(users) {
  return (users || []).map((u) => ({
    value: String(u._id),
    label: u.email ? `${u.name || u.email} — ${u.email}` : u.name || String(u._id),
  }));
}

const emptyForm = {
  employee_id: '',
  checklist_id: '',
  start_date: '',
  buddy_employee_id: '',
  notes: '',
};

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const list = useRecruitmentList('/api/recruitment/candidate-onboarding', 'candidateOnboardings', {
    initialFilters: { status: 'all', checklist_id: '' },
  });
  const checklists = useOptionList('/api/recruitment/onboarding-checklists', 'onboardingChecklists', {
    status: 'active',
  });
  const users = useOptionList('/api/recruitment/users', 'users');

  const [busyId, setBusyId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create / edit modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const counts = list.statusCounts || {};
  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  // Keep the record's current employee / buddy / checklist selectable even when
  // they are missing from the active option lists (e.g. deactivated records).
  const employeeChoices = useMemo(() => {
    const base = userOptions(users.items);
    const extras = [editing?.employee_id, editing?.buddy_employee_id]
      .filter((u) => u && u._id)
      .filter((u) => !base.some((opt) => opt.value === String(u._id)))
      .map((u) => ({
        value: String(u._id),
        label: u.email ? `${u.name || u.email} — ${u.email}` : u.name || String(u._id),
      }));
    return [...base, ...extras];
  }, [users.items, editing]);

  const checklistChoices = useMemo(() => {
    const base = checklists.options;
    const current = editing?.checklist_id;
    if (current?._id && !base.some((opt) => opt.value === String(current._id))) {
      return [...base, { value: String(current._id), label: current.name || String(current._id) }];
    }
    return base;
  }, [checklists.options, editing]);

  const buddyChoices = employeeChoices.filter((opt) => opt.value !== form.employee_id);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(record) {
    setEditing(record);
    setForm({
      employee_id: record.employee_id?._id ? String(record.employee_id._id) : '',
      checklist_id: record.checklist_id?._id ? String(record.checklist_id._id) : '',
      start_date: toDateInput(record.start_date),
      buddy_employee_id: record.buddy_employee_id?._id ? String(record.buddy_employee_id._id) : '',
      notes: record.notes || '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      const payload = {
        employee_id: form.employee_id,
        checklist_id: form.checklist_id,
        start_date: form.start_date,
        buddy_employee_id: form.buddy_employee_id,
      };
      if (form.notes) payload.notes = form.notes;

      const res = await fetch(
        editing
          ? `/api/recruitment/candidate-onboarding/${editing._id}`
          : '/api/recruitment/candidate-onboarding',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      if (res.status === 409) {
        throw new Error(
          await readApiError(
            res,
            'An onboarding process already exists for this employee with the selected checklist.'
          )
        );
      }
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save onboarding process'));

      const json = await res.json().catch(() => ({}));
      setShowForm(false);
      setSuccess(json.message || (editing ? 'Onboarding updated.' : 'Onboarding started.'));
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(record, status) {
    if (!status || status === record.status) return;
    setBusyId(record._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/candidate-onboarding/${record._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update onboarding status'));
      const json = await res.json().catch(() => ({}));
      setSuccess(json.message || `Status changed to ${ONBOARDING_STATUS_LABELS[status] || status}.`);
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(record) {
    const name = record.employee_id?.name || 'this employee';
    if (!window.confirm(`Delete the onboarding process for "${name}"? This cannot be undone.`)) return;
    setDeletingId(record._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/candidate-onboarding/${record._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete onboarding process'));
      setSuccess('Onboarding process deleted.');
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageTemplate
      title="Candidate Onboarding"
      description="Guide new hires through their checklist from day one to fully onboarded"
      actions={[
        {
          label: 'Start Onboarding',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: openCreate,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Onboarding" value={counts.all ?? 0} icon={ClipboardList} accent="blue" />
          <StatCard label="Pending" value={counts.Pending ?? 0} icon={Clock} accent="violet" />
          <StatCard label="In Progress" value={counts['In Progress'] ?? 0} icon={PlayCircle} accent="amber" />
          <StatCard label="Completed" value={counts.Completed ?? 0} icon={CheckCircle2} accent="emerald" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search employee or buddy name..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search onboarding by employee or buddy"
          />
          <FilterSelect
            placeholder="All Checklists"
            ariaLabel="Filter by onboarding checklist"
            value={list.filters.checklist_id}
            onValueChange={(v) => list.setFilter('checklist_id', v)}
            options={checklists.options}
          />
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'All', count: counts.all },
            ...ONBOARDING_STATUSES.map((s) => ({ value: s, label: ONBOARDING_STATUS_LABELS[s] || s, count: counts[s] })),
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

        {success ? <SuccessBanner message={success} /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {list.error ? <ErrorBanner message={list.error} /> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Buddy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={7} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={7} label="No onboarding processes yet. Start one to assign a checklist." />
              ) : (
                list.items.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initialsOf(record.employee_id?.name)}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium">{record.employee_id?.name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{record.employee_id?.email || '—'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{record.checklist_id?.name || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(record.start_date)}</TableCell>
                    <TableCell>{record.buddy_employee_id?.name || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} labels={ONBOARDING_STATUS_LABELS} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(record.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/recruitment/candidate-onboarding/${record._id}`)}
                        >
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                          Edit
                        </Button>
                        <Select
                          value={record.status}
                          onValueChange={(value) => updateStatus(record, value)}
                          disabled={busyId === record._id}
                        >
                          <SelectTrigger className="h-8 w-[140px]" aria-label={`Change status for ${record.employee_id?.name || 'employee'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ONBOARDING_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {ONBOARDING_STATUS_LABELS[s] || s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingId === record._id}
                          onClick={() => handleDelete(record)}
                        >
                          {deletingId === record._id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </TableCell>
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
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Onboarding' : 'Start Onboarding'}
        description={
          editing
            ? 'Update the employee, checklist, start date or buddy for this onboarding process'
            : 'Assign an onboarding checklist to a new employee and set their start date'
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="onboarding-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Start Onboarding'}
            </Button>
          </>
        }
      >
        <form id="onboarding-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <Field label="Employee" htmlFor="onb-employee" required>
            <Select
              value={form.employee_id || 'none'}
              onValueChange={(v) => {
                const value = v === 'none' ? '' : v;
                setForm((f) => ({
                  ...f,
                  employee_id: value,
                  buddy_employee_id: f.buddy_employee_id === value ? '' : f.buddy_employee_id,
                }));
              }}
            >
              <SelectTrigger id="onb-employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent searchable>
                <SelectItem value="none">Select an employee...</SelectItem>
                {employeeChoices.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Onboarding Checklist" htmlFor="onb-checklist" required hint="Tasks are read from this checklist template">
            <Select
              value={form.checklist_id || 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, checklist_id: v === 'none' ? '' : v }))}
            >
              <SelectTrigger id="onb-checklist">
                <SelectValue placeholder="Select checklist" />
              </SelectTrigger>
              <SelectContent searchable>
                <SelectItem value="none">Select a checklist...</SelectItem>
                {checklistChoices.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start Date" htmlFor="onb-start" required>
              <Input
                id="onb-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
            </Field>
            <Field label="Buddy" htmlFor="onb-buddy" hint="Optional — the colleague guiding this employee">
              <Select
                value={form.buddy_employee_id || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, buddy_employee_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger id="onb-buddy">
                  <SelectValue placeholder="No buddy assigned" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">No buddy assigned</SelectItem>
                  {buddyChoices.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Notes"
            htmlFor="onb-notes"
            hint="Optional context for HR and the buddy. Not persisted by the current onboarding API."
          >
            <Textarea
              id="onb-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Anything the buddy or HR should know before day one..."
            />
          </Field>
        </form>
      </Modal>
    </PageTemplate>
  );
}
