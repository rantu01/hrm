'use client';

import { useState } from 'react';
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
  ASSESSMENT_STATUSES,
  ASSESSMENT_STATUS_LABELS,
  formatDate,
  fullName,
  initialsOf,
} from '@/lib/recruitment';
import { CheckCircle2, ClipboardCheck, Clock, Plus, XCircle } from 'lucide-react';

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

function emptyForm() {
  return {
    candidate_id: '',
    assessment_name: '',
    assessment_date: todayInput(),
    score: '',
    max_score: '',
    pass_fail_status: 'Pending',
    conducted_by: '',
    comments: '',
  };
}

/** Client-side mirror of ASSESSMENT_RULES / assessmentPostErrors. */
function validateAssessmentForm(form) {
  if (!form.candidate_id) return 'Select a candidate.';
  if (!form.assessment_name.trim()) return 'Assessment name is required.';
  if (form.score === '' || form.score === null) return 'Score is required.';
  if (form.max_score === '' || form.max_score === null) return 'Max score is required.';
  const score = Number(form.score);
  const maxScore = Number(form.max_score);
  if (!Number.isFinite(score)) return 'Score must be a number.';
  if (!Number.isFinite(maxScore)) return 'Max score must be a number.';
  if (score < 0) return 'Score cannot be negative.';
  if (maxScore < 1) return 'Max score must be at least 1.';
  if (score > maxScore) return 'Score cannot be greater than the max score.';
  if (!ASSESSMENT_STATUSES.includes(form.pass_fail_status)) return 'Select a valid status.';
  if (!form.conducted_by) return 'Conducted by is required.';
  return '';
}

export default function CandidateAssessmentsPage() {
  const list = useRecruitmentList('/api/recruitment/candidate-assessments', 'candidateAssessments', {
    sortField: 'assessment_date',
    sortDirection: 'desc',
    initialFilters: { status: 'all', candidate_id: '' },
  });
  const candidates = useOptionList('/api/recruitment/candidates', 'candidates');
  const users = useOptionList('/api/recruitment/users', 'users');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const counts = list.statusCounts || {};
  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  const candidateOptions = candidateChoices(candidates.items);
  const conductorOptions = userChoices(users.items);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  }

  function openEdit(record) {
    setEditing(record);
    setForm({
      candidate_id: record.candidate_id?._id ? String(record.candidate_id._id) : '',
      assessment_name: record.assessment_name || '',
      assessment_date: toDateInput(record.assessment_date),
      score: record.score ?? '',
      max_score: record.max_score ?? '',
      pass_fail_status: record.pass_fail_status || 'Pending',
      conducted_by: record.conducted_by || '',
      comments: record.comments || '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = validateAssessmentForm(form);
    if (message) {
      setFormError(message);
      return;
    }
    setSaving(true);
    setFormError('');
    setSuccess('');
    try {
      const payload = {
        candidate_id: form.candidate_id,
        assessment_name: form.assessment_name.trim(),
        score: Number(form.score),
        max_score: Number(form.max_score),
        pass_fail_status: form.pass_fail_status,
        conducted_by: form.conducted_by,
      };
      if (form.assessment_date) payload.assessment_date = form.assessment_date;
      if (form.comments.trim()) payload.comments = form.comments;

      const res = await fetch(
        editing
          ? `/api/recruitment/candidate-assessments/${editing._id}`
          : '/api/recruitment/candidate-assessments',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save assessment'));
      const json = await res.json().catch(() => ({}));
      setShowForm(false);
      setSuccess(json.message || (editing ? 'Assessment updated successfully.' : 'Assessment created successfully.'));
      setError('');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    const name = record.candidate_id ? fullName(record.candidate_id) : 'this candidate';
    if (!window.confirm(`Delete the "${record.assessment_name}" assessment for ${name}?`)) return;
    setDeletingId(record._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/candidate-assessments/${record._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete assessment'));
      setSuccess('Assessment deleted successfully.');
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageTemplate
      title="Candidate Assessments"
      description="Record and review the tests and assessments completed by candidates"
      actions={[
        {
          label: 'Add Assessment',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: openCreate,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Assessments" value={counts.all ?? 0} icon={ClipboardCheck} accent="blue" />
          <StatCard label="Pass" value={counts.Pass ?? 0} icon={CheckCircle2} accent="emerald" />
          <StatCard label="Fail" value={counts.Fail ?? 0} icon={XCircle} accent="rose" />
          <StatCard label="Pending" value={counts.Pending ?? 0} icon={Clock} accent="amber" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search assessment or candidate..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search candidate assessments"
          />
          <FilterSelect
            placeholder="All Candidates"
            ariaLabel="Filter by candidate"
            value={list.filters.candidate_id}
            onValueChange={(v) => list.setFilter('candidate_id', v)}
            options={candidateOptions}
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
            ...ASSESSMENT_STATUSES.map((s) => ({ value: s, label: ASSESSMENT_STATUS_LABELS[s] || s, count: counts[s] })),
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
                <TableHead>Assessment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={7} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={7} label="No assessments found. Add one to start recording results." />
              ) : (
                list.items.map((record) => {
                  const score = Number(record.score);
                  const maxScore = Number(record.max_score);
                  const hasScore = Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0;
                  const percentage = hasScore ? Math.round((score / maxScore) * 100) : null;
                  return (
                    <TableRow key={record._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {initialsOf(fullName(record.candidate_id))}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-medium">{fullName(record.candidate_id)}</span>
                            <span className="text-xs text-muted-foreground">{record.candidate_id?.email || '—'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{record.assessment_name || '—'}</span>
                          {record.assessment_type ? (
                            <span className="text-xs text-muted-foreground">{record.assessment_type}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(record.assessment_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {hasScore ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {score} / {maxScore}
                            </span>
                            <span className="text-xs text-muted-foreground">{percentage}%</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.pass_fail_status} labels={ASSESSMENT_STATUS_LABELS} />
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="line-clamp-2 text-sm text-muted-foreground">{record.comments || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                            Edit
                          </Button>
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
                  );
                })
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
        title={editing ? 'Edit Assessment' : 'Add Assessment'}
        description={
          editing
            ? 'Update the assessment result for this candidate'
            : 'Record a test or assessment result for a candidate'
        }
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="assessment-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Assessment'}
            </Button>
          </>
        }
      >
        <form id="assessment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <Field label="Candidate" htmlFor="asm-candidate" required>
            <Select
              value={form.candidate_id || 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, candidate_id: v === 'none' ? '' : v }))}
            >
              <SelectTrigger id="asm-candidate">
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
            <Field label="Assessment Name" htmlFor="asm-name" required className="sm:col-span-2">
              <Input
                id="asm-name"
                value={form.assessment_name}
                onChange={(e) => setForm((f) => ({ ...f, assessment_name: e.target.value }))}
                placeholder="e.g. Technical Skills Assessment"
                required
              />
            </Field>
            <Field label="Score" htmlFor="asm-score" required hint="Points earned. Cannot exceed the max score.">
              <Input
                id="asm-score"
                type="number"
                min={0}
                step="0.01"
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                placeholder="e.g. 85"
                required
              />
            </Field>
            <Field label="Max Score" htmlFor="asm-max-score" required hint="Must be at least 1.">
              <Input
                id="asm-max-score"
                type="number"
                min={1}
                step="0.01"
                value={form.max_score}
                onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))}
                placeholder="e.g. 100"
                required
              />
            </Field>
            <Field label="Assessment Date" htmlFor="asm-date">
              <Input
                id="asm-date"
                type="date"
                value={form.assessment_date}
                onChange={(e) => setForm((f) => ({ ...f, assessment_date: e.target.value }))}
              />
            </Field>
            <Field label="Result" htmlFor="asm-status" required>
              <Select
                value={form.pass_fail_status}
                onValueChange={(v) => setForm((f) => ({ ...f, pass_fail_status: v }))}
              >
                <SelectTrigger id="asm-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ASSESSMENT_STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Conducted By" htmlFor="asm-conductor" required className="sm:col-span-2">
              <Select
                value={form.conducted_by || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, conducted_by: v === 'none' ? '' : v }))}
              >
                <SelectTrigger id="asm-conductor">
                  <SelectValue placeholder="Select interviewer" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Select an interviewer...</SelectItem>
                  {conductorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes" htmlFor="asm-comments">
            <Textarea
              id="asm-comments"
              rows={3}
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
              placeholder="e.g. Candidate demonstrated strong analytical skills..."
            />
          </Field>
        </form>
      </Modal>
    </PageTemplate>
  );
}
