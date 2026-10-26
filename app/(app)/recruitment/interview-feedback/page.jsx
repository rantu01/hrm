'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  ErrorBanner,
  SuccessBanner,
  Field,
  FilterSelect,
  Pagination,
  RatingSelect,
  RatingStars,
  StatusBadge,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  FEEDBACK_RECOMMENDATIONS,
  RECOMMENDATION_LABELS,
  formatDate,
  fullName,
  parseList,
} from '@/lib/recruitment';
import { MessageSquare, Plus, Star, ThumbsDown, ThumbsUp } from 'lucide-react';

const HEX_ID = /^[a-f\d]{24}$/i;

const RATING_FIELDS = [
  { key: 'technical_rating', label: 'Technical Rating' },
  { key: 'communication_rating', label: 'Communication Rating' },
  { key: 'cultural_fit_rating', label: 'Cultural Fit Rating' },
  { key: 'overall_rating', label: 'Overall Rating' },
];

const emptyForm = {
  interview_id: '',
  interviewer_ids: [],
  technical_rating: '',
  communication_rating: '',
  cultural_fit_rating: '',
  overall_rating: '',
  strengths: '',
  weaknesses: '',
  comments: '',
  recommendation: '',
};

function InterviewFeedbackContent() {
  const searchParams = useSearchParams();
  const prefillInterviewId = searchParams.get('interview_id') || '';

  const list = useRecruitmentList('/api/recruitment/interview-feedback', 'interviewFeedback', {
    sortField: 'createdAt',
    sortDirection: 'desc',
  });
  const users = useOptionList('/api/recruitment/users', 'users');

  const [interviews, setInterviews] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [stats, setStats] = useState({ positive: 0, maybe: 0, negative: 0 });

  const [success, setSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefillHandled, setPrefillHandled] = useState(false);

  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  // Interview dropdown: the list endpoint caps `limit` at 200 server-side.
  useEffect(() => {
    let cancelled = false;
    async function loadInterviews() {
      try {
        const res = await fetch('/api/recruitment/interviews?limit=1000&sort_field=scheduled_date&sort_direction=desc', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setInterviews(Array.isArray(json.interviews) ? json.interviews : []);
      } catch {
        /* ignore dropdown errors */
      }
    }
    loadInterviews();
    return () => {
      cancelled = true;
    };
  }, [list.refreshKey]);

  // Distinct interviewers + recommendation counts. The feedback list endpoint
  // has no statusCounts, so the counts are derived from one capped page.
  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      try {
        const [interviewersRes, statsRes] = await Promise.all([
          fetch('/api/recruitment/interview-feedback/interviewers', { credentials: 'include' }),
          fetch('/api/recruitment/interview-feedback?limit=200&page=1', { credentials: 'include' }),
        ]);
        if (cancelled) return;
        if (interviewersRes.ok) {
          const json = await interviewersRes.json().catch(() => ({}));
          setInterviewers(Array.isArray(json.interviewers) ? json.interviewers : []);
        }
        if (statsRes.ok) {
          const json = await statsRes.json().catch(() => ({}));
          const rows = Array.isArray(json.interviewFeedback) ? json.interviewFeedback : [];
          const next = { positive: 0, maybe: 0, negative: 0 };
          for (const row of rows) {
            if (row.recommendation === 'Strong Hire' || row.recommendation === 'Hire') next.positive += 1;
            else if (row.recommendation === 'Maybe') next.maybe += 1;
            else if (row.recommendation === 'Reject' || row.recommendation === 'Strong Reject') next.negative += 1;
          }
          setStats(next);
        }
      } catch {
        /* ignore stat errors */
      }
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [list.refreshKey]);

  // Pre-select the interview when arriving from the interview detail page.
  useEffect(() => {
    if (prefillHandled || !prefillInterviewId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditing(null);
    setForm({ ...emptyForm, interview_id: prefillInterviewId });
    setFormError('');
    setFormOpen(true);
    setPrefillHandled(true);
  }, [prefillInterviewId, prefillHandled]);

  const userMap = useMemo(() => {
    const map = new Map();
    for (const user of users.items) map.set(String(user._id), user);
    for (const user of interviewers) map.set(String(user._id), user);
    return map;
  }, [users.items, interviewers]);

  const interviewOptions = useMemo(
    () =>
      interviews.map((interview) => ({
        value: String(interview._id),
        label: `${fullName(interview.candidate_id)}${
          interview.round_id?.name ? ` — ${interview.round_id.name}` : ''
        } · ${formatDate(interview.scheduled_date)}`,
      })),
    [interviews]
  );

  function interviewerNames(value) {
    const ids = parseList(value);
    if (ids.length === 0) return '—';
    return ids
      .map((id) => userMap.get(String(id))?.name || (HEX_ID.test(String(id)) ? 'Unknown user' : String(id)))
      .join(', ');
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      interview_id: row.interview_id?._id ? String(row.interview_id._id) : String(row.interview_id || ''),
      interviewer_ids: parseList(row.interviewer_id),
      technical_rating: row.technical_rating != null ? String(row.technical_rating) : '',
      communication_rating: row.communication_rating != null ? String(row.communication_rating) : '',
      cultural_fit_rating: row.cultural_fit_rating != null ? String(row.cultural_fit_rating) : '',
      overall_rating: row.overall_rating != null ? String(row.overall_rating) : '',
      strengths: row.strengths || '',
      weaknesses: row.weaknesses || '',
      comments: row.comments || '',
      recommendation: row.recommendation || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  function toggleInterviewer(userId) {
    setForm((prev) => ({
      ...prev,
      interviewer_ids: prev.interviewer_ids.includes(userId)
        ? prev.interviewer_ids.filter((id) => id !== userId)
        : [...prev.interviewer_ids, userId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!form.interview_id) return setFormError('Select an interview.');
    if (form.interviewer_ids.length === 0) return setFormError('Select at least one interviewer.');
    for (const field of RATING_FIELDS) {
      const value = Number(form[field.key]);
      if (!form[field.key] || !Number.isFinite(value) || value < 0.5 || value > 5) {
        return setFormError(`${field.label} must be between 0.5 and 5.`);
      }
    }
    if (!form.recommendation) return setFormError('Select a recommendation.');

    setSaving(true);
    try {
      const payload = {
        interview_id: form.interview_id,
        interviewer_id: form.interviewer_ids.join(','),
        technical_rating: Number(form.technical_rating),
        communication_rating: Number(form.communication_rating),
        cultural_fit_rating: Number(form.cultural_fit_rating),
        overall_rating: Number(form.overall_rating),
        strengths: form.strengths,
        weaknesses: form.weaknesses,
        comments: form.comments,
        recommendation: form.recommendation,
      };
      const res = await fetch(
        editing ? `/api/recruitment/interview-feedback/${editing._id}` : '/api/recruitment/interview-feedback',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save interview feedback'));
      const json = await res.json().catch(() => ({}));
      setFormOpen(false);
      setSuccess(json.message || (editing ? 'Feedback updated.' : 'Feedback submitted.'));
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const interview = row.interview_id || {};
    const label = `${fullName(interview.candidate_id)}${interview.round_id?.name ? ` — ${interview.round_id.name}` : ''}`;
    if (!window.confirm(`Delete this feedback record for "${label}"?`)) return;
    setBusyId(row._id);
    setActionError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/interview-feedback/${row._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete feedback'));
      setSuccess('Feedback deleted.');
      list.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageTemplate
      title="Interview Feedback"
      description="Structured ratings and recommendations submitted by interview panels"
      actions={[
        {
          label: 'Add Feedback',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: openCreate,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Feedback" value={list.total ?? 0} icon={MessageSquare} accent="blue" />
          <StatCard label="Strong Hire / Hire" value={stats.positive} icon={ThumbsUp} accent="emerald" />
          <StatCard label="Maybe" value={stats.maybe} icon={Star} accent="amber" />
          <StatCard label="Reject / Strong Reject" value={stats.negative} icon={ThumbsDown} accent="rose" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search candidate name or email..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search interview feedback"
          />
          <FilterSelect
            placeholder="All Recommendations"
            ariaLabel="Filter by recommendation"
            value={list.filters.recommendation}
            onValueChange={(v) => list.setFilter('recommendation', v)}
            options={FEEDBACK_RECOMMENDATIONS.map((value) => ({
              value,
              label: RECOMMENDATION_LABELS[value] || value,
            }))}
            className="w-[200px]"
          />
          <FilterSelect
            placeholder="All Interviewers"
            ariaLabel="Filter by interviewer"
            value={list.filters.interviewer_id}
            onValueChange={(v) => list.setFilter('interviewer_id', v)}
            options={interviewers.map((interviewer) => ({
              value: String(interviewer._id),
              label: interviewer.name || interviewer.email || String(interviewer._id),
            }))}
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

        {success ? <SuccessBanner message={success} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {list.error ? <ErrorBanner message={list.error} /> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interview</TableHead>
                <TableHead>Interviewers</TableHead>
                <TableHead>Ratings</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={6} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={6} label="No interview feedback found." />
              ) : (
                list.items.map((row) => {
                  const interview = row.interview_id || {};
                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{fullName(interview.candidate_id)}</span>
                          <span className="text-xs text-muted-foreground">{interview.job_id?.title || '—'}</span>
                          {interview.round_id?.name ? (
                            <span className="mt-0.5 text-[10px] text-muted-foreground">{interview.round_id.name}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <span className="line-clamp-2 text-sm">{interviewerNames(row.interviewer_id)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-cols-1 gap-1">
                          {RATING_FIELDS.map((field) => (
                            <div key={field.key} className="flex items-center gap-2">
                              <span className="w-[86px] shrink-0 text-[10px] text-muted-foreground">
                                {field.label.replace(' Rating', '')}
                              </span>
                              <RatingStars value={row[field.key]} />
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.recommendation} labels={RECOMMENDATION_LABELS} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.createdAt || row.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === row._id}
                            onClick={() => handleDelete(row)}
                          >
                            Delete
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
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="xl"
        title={editing ? 'Edit Interview Feedback' : 'Add Interview Feedback'}
        description={
          editing
            ? 'Update the ratings and recommendation for this interviewer'
            : 'Record a panel member’s assessment of the interview'
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="feedback-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          </>
        }
      >
        <form id="feedback-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <Field label="Interview" htmlFor="fb-interview" required>
            <Select
              value={form.interview_id || 'none'}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, interview_id: value === 'none' ? '' : value }))
              }
            >
              <SelectTrigger id="fb-interview">
                <SelectValue placeholder="Select an interview" />
              </SelectTrigger>
              <SelectContent searchable>
                <SelectItem value="none">Select an interview...</SelectItem>
                {interviewOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Interviewers" required hint="Only interviewers who have not yet submitted feedback can be saved">
            {users.loading ? (
              <p className="text-sm text-muted-foreground">Loading interviewers...</p>
            ) : users.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active users found.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-md border p-2">
                <div className="flex flex-col gap-2">
                  {users.items.map((user) => {
                    const userId = String(user._id);
                    return (
                      <label
                        key={userId}
                        htmlFor={`fb-interviewer-${userId}`}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          id={`fb-interviewer-${userId}`}
                          checked={form.interviewer_ids.includes(userId)}
                          onCheckedChange={() => toggleInterviewer(userId)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{user.name || 'Unnamed user'}</span>
                          {user.email ? (
                            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {RATING_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={`fb-${field.key}`} required hint="0.5 to 5">
                <RatingSelect
                  id={`fb-${field.key}`}
                  value={form[field.key]}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                  allowEmpty={false}
                />
              </Field>
            ))}
          </div>

          <Field label="Recommendation" htmlFor="fb-recommendation" required>
            <Select
              value={form.recommendation}
              onValueChange={(value) => setForm((prev) => ({ ...prev, recommendation: value }))}
            >
              <SelectTrigger id="fb-recommendation">
                <SelectValue placeholder="Select a recommendation" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_RECOMMENDATIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {RECOMMENDATION_LABELS[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Strengths" htmlFor="fb-strengths">
            <Textarea
              id="fb-strengths"
              rows={2}
              value={form.strengths}
              onChange={(e) => setForm((prev) => ({ ...prev, strengths: e.target.value }))}
              placeholder="What stood out positively?"
            />
          </Field>

          <Field label="Weaknesses" htmlFor="fb-weaknesses">
            <Textarea
              id="fb-weaknesses"
              rows={2}
              value={form.weaknesses}
              onChange={(e) => setForm((prev) => ({ ...prev, weaknesses: e.target.value }))}
              placeholder="Areas of concern or improvement"
            />
          </Field>

          <Field label="Comments" htmlFor="fb-comments">
            <Textarea
              id="fb-comments"
              rows={3}
              value={form.comments}
              onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
              placeholder="Overall notes for the hiring team"
            />
          </Field>
        </form>
      </Modal>
    </PageTemplate>
  );
}

export default function InterviewFeedbackPage() {
  return (
    <Suspense
      fallback={
        <PageTemplate title="Interview Feedback" description="Loading...">
          <p className="py-10 text-center text-sm text-muted-foreground">Loading interview feedback...</p>
        </PageTemplate>
      }
    >
      <InterviewFeedbackContent />
    </Suspense>
  );
}
