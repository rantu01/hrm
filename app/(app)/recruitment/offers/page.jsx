'use client';

import { useState } from 'react';
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
import {
  OFFER_STATUSES,
  OFFER_STATUS_LABELS,
  formatDate,
  formatMoney,
  fullName,
  initialsOf,
} from '@/lib/recruitment';
import { Briefcase, CheckCircle2, FileEdit, Kanban, Plus, Send, XCircle } from 'lucide-react';

function todayInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Candidates expose first_name/last_name, so build readable option labels. */
function candidateChoices(candidates) {
  return (candidates || []).map((c) => ({
    value: String(c._id),
    label: c.email ? `${fullName(c)} — ${c.email}` : fullName(c),
  }));
}

function userChoices(users) {
  return (users || []).map((u) => ({
    value: String(u._id),
    label: u.email ? `${u.name || u.email} — ${u.email}` : u.name || String(u._id),
  }));
}

const emptyForm = {
  candidate_id: '',
  position: '',
  department_id: '',
  salary: '',
  bonus: '',
  equity: '',
  benefits: '',
  start_date: '',
  expiration_date: '',
  offer_letter_url: '',
  approved_by: '',
};

/** Client-side mirror of OFFER_RULES / offerPostErrors. Returns an error message or ''. */
function validateOfferForm(form) {
  if (!form.candidate_id) return 'Select a candidate.';
  if (!form.position.trim()) return 'Position is required.';
  if (form.salary === '' || form.salary === null) return 'Salary is required.';
  const salary = Number(form.salary);
  if (!Number.isFinite(salary)) return 'Salary must be a number.';
  if (salary < 0) return 'Salary cannot be negative.';
  if (form.bonus !== '' && form.bonus !== null) {
    const bonus = Number(form.bonus);
    if (!Number.isFinite(bonus)) return 'Bonus must be a number.';
    if (bonus < 0) return 'Bonus cannot be negative.';
  }
  if (!form.start_date) return 'Start date is required.';
  if (!form.expiration_date) return 'Expiration date is required.';
  const today = todayInput();
  if (form.start_date < today) return 'Start date must be today or later.';
  if (form.expiration_date < today) return 'Expiration date must be today or later.';
  if (form.expiration_date < form.start_date) return 'Expiration date must be on or after the start date.';
  return '';
}

function buildOfferPayload(form) {
  const payload = {
    candidate_id: form.candidate_id,
    position: form.position.trim(),
    salary: Number(form.salary),
    start_date: form.start_date,
    expiration_date: form.expiration_date,
  };
  if (form.department_id) payload.department_id = form.department_id;
  if (form.bonus !== '' && form.bonus !== null) payload.bonus = Number(form.bonus);
  if (form.equity.trim()) payload.equity = form.equity.trim();
  if (form.benefits.trim()) payload.benefits = form.benefits;
  if (form.offer_letter_url.trim()) payload.offer_letter_url = form.offer_letter_url.trim();
  if (form.approved_by) payload.approved_by = form.approved_by;
  return payload;
}

export default function OffersPage() {
  const router = useRouter();
  const list = useRecruitmentList('/api/recruitment/offers', 'offers', {
    initialFilters: { status: 'all', job_id: '' },
  });
  const candidates = useOptionList('/api/recruitment/candidates', 'candidates');
  const jobPostings = useOptionList('/api/recruitment/job-postings', 'jobPostings');
  const users = useOptionList('/api/recruitment/users', 'users');
  const departments = useOptionList('/api/departments', 'departments', { status: 'active' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Create / edit modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Change status modal
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'Draft', decline_reason: '' });
  const [statusError, setStatusError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const counts = list.statusCounts || {};
  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  const candidateOptions = candidateChoices(candidates.items);
  const approverOptions = userChoices(users.items);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(offer) {
    setEditing(offer);
    setForm({
      candidate_id: offer.candidate_id?._id ? String(offer.candidate_id._id) : '',
      position: offer.position || '',
      department_id: offer.department_id?._id ? String(offer.department_id._id) : '',
      salary: offer.salary ?? '',
      bonus: offer.bonus ?? '',
      equity: offer.equity || '',
      benefits: offer.benefits || '',
      start_date: toDateInput(offer.start_date),
      expiration_date: toDateInput(offer.expiration_date),
      offer_letter_url: offer.offer_letter_url || '',
      approved_by: offer.approved_by?._id ? String(offer.approved_by._id) : '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = validateOfferForm(form);
    if (message) {
      setFormError(message);
      return;
    }
    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      const res = await fetch(editing ? `/api/recruitment/offers/${editing._id}` : '/api/recruitment/offers', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildOfferPayload(form)),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save offer'));
      const json = await res.json().catch(() => ({}));
      setShowForm(false);
      setSuccess(json.message || (editing ? 'Offer updated successfully.' : 'Offer created successfully.'));
      setError('');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openStatus(offer) {
    setStatusTarget(offer);
    setStatusForm({ status: offer.status || 'Draft', decline_reason: offer.decline_reason || '' });
    setStatusError('');
  }

  async function handleStatusSubmit(event) {
    event.preventDefault();
    if (!statusTarget) return;
    if (statusForm.status === 'Declined' && !statusForm.decline_reason.trim()) {
      setStatusError('Please provide a reason for declining.');
      return;
    }
    setStatusSaving(true);
    setStatusError('');
    setSuccess('');
    try {
      const payload = { status: statusForm.status };
      if (statusForm.status === 'Declined') payload.decline_reason = statusForm.decline_reason.trim();
      const res = await fetch(`/api/recruitment/offers/${statusTarget._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update offer status'));
      const json = await res.json().catch(() => ({}));
      setStatusTarget(null);
      setSuccess(json.message || `Status changed to ${OFFER_STATUS_LABELS[statusForm.status] || statusForm.status}.`);
      setError('');
      list.refresh();
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDelete(offer) {
    const name = offer.candidate_id ? fullName(offer.candidate_id) : 'this candidate';
    if (!window.confirm(`Delete the offer for "${name}"? This cannot be undone.`)) return;
    setDeletingId(offer._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/offers/${offer._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete offer'));
      setSuccess('Offer deleted successfully.');
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageTemplate
      title="Offers"
      description="Create, send and track job offers through to acceptance"
      actions={[
        {
          label: 'Kanban View',
          variant: 'outline',
          icon: <Kanban className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/offers/kanban'),
        },
        {
          label: 'Create Offer',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: openCreate,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Total Offers" value={counts.all ?? 0} icon={Briefcase} accent="blue" />
          <StatCard label="Sent" value={counts.Sent ?? 0} icon={Send} accent="blue" />
          <StatCard label="Accepted" value={counts.Accepted ?? 0} icon={CheckCircle2} accent="emerald" />
          <StatCard label="Declined" value={counts.Declined ?? 0} icon={XCircle} accent="rose" />
          <StatCard label="Negotiating" value={counts.Negotiating ?? 0} icon={FileEdit} accent="amber" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search candidate name or email..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search offers by candidate"
          />
          <FilterSelect
            placeholder="All Jobs"
            ariaLabel="Filter by job posting"
            value={list.filters.job_id}
            onValueChange={(v) => list.setFilter('job_id', v)}
            options={jobPostings.options}
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
            ...OFFER_STATUSES.map((s) => ({ value: s, label: OFFER_STATUS_LABELS[s] || s, count: counts[s] })),
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
                <TableHead>Candidate</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Offer Date</TableHead>
                <TableHead>Expiration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={9} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={9} label="No offers found. Create an offer to get started." />
              ) : (
                list.items.map((offer) => (
                  <TableRow key={offer._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initialsOf(fullName(offer.candidate_id))}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium">{fullName(offer.candidate_id)}</span>
                          <span className="text-xs text-muted-foreground">{offer.candidate_id?.email || '—'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{offer.job_id?.title || '—'}</TableCell>
                    <TableCell>{offer.position || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatMoney(offer.salary)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(offer.offer_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(offer.expiration_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={offer.status} labels={OFFER_STATUS_LABELS} />
                    </TableCell>
                    <TableCell>{offer.approved_by?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/recruitment/offers/${offer._id}`)}
                        >
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(offer)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openStatus(offer)}>
                          Change Status
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deletingId === offer._id}
                          onClick={() => handleDelete(offer)}
                        >
                          {deletingId === offer._id ? 'Deleting...' : 'Delete'}
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

      {/* Create / edit offer */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Offer' : 'Create Offer'}
        description={
          editing
            ? 'Update the offer terms. Status changes are made from the Change Status action.'
            : "The job posting is taken from the candidate's application automatically."
        }
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="offer-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create Offer'}
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <Field
            label="Candidate"
            htmlFor="offer-candidate"
            required
            hint="The job posting is derived from the candidate's application and cannot be changed here."
          >
            <Select
              value={form.candidate_id || 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, candidate_id: v === 'none' ? '' : v }))}
            >
              <SelectTrigger id="offer-candidate">
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent searchable>
                <SelectItem value="none">Select a candidate...</SelectItem>
                {candidateOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Position" htmlFor="offer-position" required>
              <Input
                id="offer-position"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
                required
              />
            </Field>
            <Field label="Department" htmlFor="offer-department">
              <Select
                value={form.department_id || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, department_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger id="offer-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Salary" htmlFor="offer-salary" required hint="Annual gross amount. Displayed in USD.">
              <Input
                id="offer-salary"
                type="number"
                min={0}
                step="0.01"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                placeholder="e.g. 85000"
                required
              />
            </Field>
            <Field label="Bonus" htmlFor="offer-bonus">
              <Input
                id="offer-bonus"
                type="number"
                min={0}
                step="0.01"
                value={form.bonus}
                onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </Field>
            <Field label="Start Date" htmlFor="offer-start" required hint="Must be today or later.">
              <Input
                id="offer-start"
                type="date"
                min={todayInput()}
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
              />
            </Field>
            <Field
              label="Expiration Date"
              htmlFor="offer-expiration"
              required
              hint="Must be today or later and on/after the start date."
            >
              <Input
                id="offer-expiration"
                type="date"
                min={form.start_date || todayInput()}
                value={form.expiration_date}
                onChange={(e) => setForm((f) => ({ ...f, expiration_date: e.target.value }))}
                required
              />
            </Field>
            <Field label="Equity" htmlFor="offer-equity">
              <Input
                id="offer-equity"
                value={form.equity}
                onChange={(e) => setForm((f) => ({ ...f, equity: e.target.value }))}
                placeholder="e.g. 0.5% stock options"
              />
            </Field>
            <Field label="Approved By" htmlFor="offer-approver">
              <Select
                value={form.approved_by || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, approved_by: v === 'none' ? '' : v }))}
              >
                <SelectTrigger id="offer-approver">
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">No approver</SelectItem>
                  {approverOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Offer Letter URL" htmlFor="offer-letter">
            <Input
              id="offer-letter"
              value={form.offer_letter_url}
              onChange={(e) => setForm((f) => ({ ...f, offer_letter_url: e.target.value }))}
              placeholder="https://..."
            />
          </Field>

          <Field label="Benefits" htmlFor="offer-benefits" hint="Health insurance, leave, remote work, etc.">
            <Textarea
              id="offer-benefits"
              rows={3}
              value={form.benefits}
              onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              placeholder="e.g. Health insurance, 20 days annual leave, remote work..."
            />
          </Field>
        </form>
      </Modal>

      {/* Change status */}
      <Modal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title="Change Offer Status"
        description={
          statusTarget
            ? `${fullName(statusTarget.candidate_id)} — ${statusTarget.job_id?.title || statusTarget.position || 'Offer'}`
            : undefined
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setStatusTarget(null)} disabled={statusSaving}>
              Cancel
            </Button>
            <Button type="submit" form="offer-status-form" disabled={statusSaving}>
              {statusSaving ? 'Updating...' : 'Update Status'}
            </Button>
          </>
        }
      >
        <form id="offer-status-form" onSubmit={handleStatusSubmit} className="flex flex-col gap-4">
          {statusError ? <ErrorBanner message={statusError} /> : null}
          <Field
            label="Status"
            htmlFor="offer-status"
            required
            hint="Accepted hires the candidate and stores the offered salary as their final salary. Declined rejects the candidate."
          >
            <Select
              value={statusForm.status}
              onValueChange={(v) =>
                setStatusForm((f) => ({ ...f, status: v, decline_reason: v === 'Declined' ? f.decline_reason : '' }))
              }
            >
              <SelectTrigger id="offer-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {OFFER_STATUS_LABELS[s] || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {statusForm.status === 'Declined' ? (
            <Field label="Decline Reason" htmlFor="offer-decline-reason" required>
              <Textarea
                id="offer-decline-reason"
                rows={3}
                value={statusForm.decline_reason}
                onChange={(e) => setStatusForm((f) => ({ ...f, decline_reason: e.target.value }))}
                placeholder="Why did the candidate decline the offer?"
              />
            </Field>
          ) : null}
        </form>
      </Modal>
    </PageTemplate>
  );
}
