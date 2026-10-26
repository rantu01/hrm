'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  StatusBadge,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_MIN_DURATION,
  INTERVIEW_MAX_DURATION,
  formatDate,
  formatTime,
  fullName,
  parseList,
} from '@/lib/recruitment';
import { CalendarDays, CheckCircle2, Clock, Kanban, Plus, XCircle } from 'lucide-react';

const HEX_ID = /^[a-f\d]{24}$/i;

function todayInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateInput(value) {
  if (!value) return '';
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

const emptyForm = {
  candidate_id: '',
  round_id: '',
  interview_type_id: '',
  scheduled_date: '',
  scheduled_time: '',
  duration: '60',
  location: '',
  meeting_link: '',
  notes: '',
  interviewers: [],
};

export default function InterviewsPage() {
  const router = useRouter();
  const list = useRecruitmentList('/api/recruitment/interviews', 'interviews', {
    sortField: 'scheduled_date',
    sortDirection: 'desc',
  });
  const candidates = useOptionList('/api/recruitment/candidates', 'candidates');
  const interviewTypes = useOptionList('/api/recruitment/interview-types', 'interviewTypes', { status: 'active' });
  const users = useOptionList('/api/recruitment/users', 'users');

  const [success, setSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Schedule / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundsError, setRoundsError] = useState('');

  const counts = list.statusCounts || {};
  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  const candidateOptions = useMemo(
    () =>
      candidates.items.map((candidate) => ({
        value: String(candidate._id),
        label: `${fullName(candidate)}${candidate.job_id?.title ? ` — ${candidate.job_id.title}` : ''}`,
      })),
    [candidates.items]
  );

  const userMap = useMemo(() => {
    const map = new Map();
    for (const user of users.items) map.set(String(user._id), user);
    return map;
  }, [users.items]);

  function interviewerNames(interviewers) {
    const ids = parseList(interviewers);
    if (ids.length === 0) return '—';
    return ids
      .map((id) => userMap.get(String(id))?.name || (HEX_ID.test(String(id)) ? 'Unknown user' : String(id)))
      .join(', ');
  }

  async function loadRounds(candidateId) {
    setRounds([]);
    setRoundsError('');
    if (!candidateId) return;
    setRoundsLoading(true);
    try {
      const res = await fetch(`/api/recruitment/interviews/rounds-by-candidate/${candidateId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load interview rounds'));
      const json = await res.json().catch(() => ({}));
      setRounds(Array.isArray(json.rounds) ? json.rounds : []);
    } catch (err) {
      setRoundsError(err.message);
    } finally {
      setRoundsLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, scheduled_date: todayInput() });
    setRounds([]);
    setRoundsError('');
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(interview) {
    const candidateId = interview.candidate_id?._id ? String(interview.candidate_id._id) : '';
    setEditing(interview);
    setForm({
      candidate_id: candidateId,
      round_id: interview.round_id?._id ? String(interview.round_id._id) : '',
      interview_type_id: interview.interview_type_id?._id ? String(interview.interview_type_id._id) : '',
      scheduled_date: toDateInput(interview.scheduled_date),
      scheduled_time: toTimeInput(interview.scheduled_time),
      duration: String(interview.duration ?? 60),
      location: interview.location || '',
      meeting_link: interview.meeting_link || '',
      notes: interview.notes || '',
      interviewers: parseList(interview.interviewers),
    });
    setRounds([]);
    setRoundsError('');
    setFormError('');
    setFormOpen(true);
    if (candidateId) loadRounds(candidateId);
  }

  function toggleInterviewer(userId) {
    setForm((prev) => ({
      ...prev,
      interviewers: prev.interviewers.includes(userId)
        ? prev.interviewers.filter((id) => id !== userId)
        : [...prev.interviewers, userId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const duration = Number(form.duration);
    if (!form.candidate_id) return setFormError('Select a candidate.');
    if (!form.round_id) return setFormError('Select an interview round.');
    if (!form.interview_type_id) return setFormError('Select an interview type.');
    if (!form.scheduled_date) return setFormError('Select an interview date.');
    if (!form.scheduled_time) return setFormError('Select an interview time.');
    if (
      !Number.isInteger(duration) ||
      duration < INTERVIEW_MIN_DURATION ||
      duration > INTERVIEW_MAX_DURATION
    ) {
      return setFormError(`Duration must be between ${INTERVIEW_MIN_DURATION} and ${INTERVIEW_MAX_DURATION} minutes.`);
    }
    if (form.interviewers.length === 0) return setFormError('Select at least one interviewer.');

    setSaving(true);
    try {
      const payload = {
        candidate_id: form.candidate_id,
        round_id: form.round_id,
        interview_type_id: form.interview_type_id,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        duration,
        location: form.location,
        meeting_link: form.meeting_link,
        notes: form.notes,
        interviewers: form.interviewers,
      };
      const res = await fetch(
        editing ? `/api/recruitment/interviews/${editing._id}` : '/api/recruitment/interviews',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save interview'));
      const json = await res.json().catch(() => ({}));
      setFormOpen(false);
      setSuccess(json.message || (editing ? 'Interview updated.' : 'Interview scheduled.'));
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(interview, status) {
    if (!status || status === interview.status) return;
    setBusyId(interview._id);
    setActionError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/interviews/${interview._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update interview status'));
      setSuccess('Interview status updated.');
      list.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(interview) {
    const label = fullName(interview.candidate_id);
    if (!window.confirm(`Delete the interview for "${label}"? This cannot be undone.`)) return;
    setBusyId(interview._id);
    setActionError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/interviews/${interview._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete interview'));
      setSuccess('Interview deleted.');
      list.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageTemplate
      title="Interviews"
      description="Schedule interviews, track status and collect structured feedback"
      actions={[
        {
          label: 'Kanban View',
          variant: 'outline',
          icon: <Kanban className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/interviews/kanban'),
        },
        {
          label: 'Schedule Interview',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: openCreate,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Interviews" value={counts.all ?? 0} icon={CalendarDays} accent="blue" />
          <StatCard label="Scheduled" value={counts.Scheduled ?? 0} icon={Clock} accent="amber" />
          <StatCard label="Completed" value={counts.Completed ?? 0} icon={CheckCircle2} accent="emerald" />
          <StatCard
            label="Cancelled / No-show"
            value={(counts.Cancelled ?? 0) + (counts['No-show'] ?? 0)}
            icon={XCircle}
            accent="rose"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search candidate name or email..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search interviews"
          />
          <FilterSelect
            placeholder="All Candidates"
            ariaLabel="Filter by candidate"
            value={list.filters.candidate_id}
            onValueChange={(v) => list.setFilter('candidate_id', v)}
            options={candidateOptions}
            className="w-[240px]"
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
            ...INTERVIEW_STATUSES.map((status) => ({
              value: status,
              label: INTERVIEW_STATUS_LABELS[status] || status,
              count: counts[status],
            })),
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
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {list.error ? <ErrorBanner message={list.error} /> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Interviewers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={10} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={10} label="No interviews found. Schedule your first interview." />
              ) : (
                list.items.map((interview) => (
                  <TableRow key={interview._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/recruitment/interviews/${interview._id}`}
                          className="font-medium hover:underline"
                        >
                          {fullName(interview.candidate_id)}
                        </Link>
                        <span className="text-xs text-muted-foreground">{interview.candidate_id?.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{interview.job_id?.title || '—'}</TableCell>
                    <TableCell>{interview.round_id?.name || '—'}</TableCell>
                    <TableCell>{interview.interview_type_id?.name || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{formatDate(interview.scheduled_date)}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(interview.scheduled_time)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{interview.duration ?? '—'} min</TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2 text-sm">{interviewerNames(interview.interviewers)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={interview.status} labels={INTERVIEW_STATUS_LABELS} />
                    </TableCell>
                    <TableCell>
                      {interview.feedback_submitted ? (
                        <Badge variant="success">Submitted</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/recruitment/interviews/${interview._id}`)}
                        >
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(interview)}>
                          Edit
                        </Button>
                        <Select
                          value={interview.status}
                          onValueChange={(value) => handleStatusChange(interview, value)}
                          disabled={busyId === interview._id}
                        >
                          <SelectTrigger
                            className="h-8 w-[130px] text-xs"
                            aria-label={`Change status for ${fullName(interview.candidate_id)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERVIEW_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {INTERVIEW_STATUS_LABELS[status] || status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === interview._id}
                          onClick={() => handleDelete(interview)}
                        >
                          Delete
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
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={editing ? 'Edit Interview' : 'Schedule Interview'}
        description={
          editing
            ? `Update the interview for ${fullName(editing.candidate_id)}`
            : 'Pick a candidate, round and interview details'
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="interview-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Interview' : 'Schedule Interview'}
            </Button>
          </>
        }
      >
        <form id="interview-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          {roundsError ? <ErrorBanner message={roundsError} /> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Candidate" htmlFor="iv-candidate" required>
              <Select
                value={form.candidate_id || 'none'}
                onValueChange={(value) => {
                  const candidateId = value === 'none' ? '' : value;
                  setForm((prev) => ({ ...prev, candidate_id: candidateId, round_id: '' }));
                  loadRounds(candidateId);
                }}
              >
                <SelectTrigger id="iv-candidate">
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Select a candidate...</SelectItem>
                  {candidateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Interview Round"
              htmlFor="iv-round"
              required
              hint={!form.candidate_id ? 'Select a candidate first' : undefined}
            >
              <Select
                value={form.round_id || 'none'}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, round_id: value === 'none' ? '' : value }))
                }
                disabled={!form.candidate_id || roundsLoading}
              >
                <SelectTrigger id="iv-round">
                  <SelectValue placeholder={roundsLoading ? 'Loading rounds...' : 'Select a round'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a round...</SelectItem>
                  {rounds.map((round) => (
                    <SelectItem key={round._id} value={String(round._id)}>
                      {round.name}
                      {round.sequence_number ? ` (Round ${round.sequence_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Interview Type" htmlFor="iv-type" required>
              <Select
                value={form.interview_type_id || 'none'}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, interview_type_id: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger id="iv-type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Select a type...</SelectItem>
                  {interviewTypes.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Duration (minutes)" htmlFor="iv-duration" required hint="Between 15 and 480 minutes">
              <Input
                id="iv-duration"
                type="number"
                min={INTERVIEW_MIN_DURATION}
                max={INTERVIEW_MAX_DURATION}
                step={5}
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                required
              />
            </Field>

            <Field label="Date" htmlFor="iv-date" required>
              <Input
                id="iv-date"
                type="date"
                min={todayInput()}
                value={form.scheduled_date}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduled_date: e.target.value }))}
                required
              />
            </Field>

            <Field label="Time" htmlFor="iv-time" required>
              <Input
                id="iv-time"
                type="time"
                value={form.scheduled_time}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduled_time: e.target.value }))}
                required
              />
            </Field>

            <Field label="Location" htmlFor="iv-location">
              <Input
                id="iv-location"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Meeting Room 2"
              />
            </Field>

            <Field label="Meeting Link" htmlFor="iv-link" hint="Optional, must start with http:// or https://">
              <Input
                id="iv-link"
                value={form.meeting_link}
                onChange={(e) => setForm((prev) => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://meet.example.com/..."
              />
            </Field>
          </div>

          <Field label="Interviewers" required hint="Select at least one interviewer">
            {users.loading ? (
              <p className="text-sm text-muted-foreground">Loading interviewers...</p>
            ) : users.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active users found.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                <div className="flex flex-col gap-2">
                  {users.items.map((user) => {
                    const userId = String(user._id);
                    const checked = form.interviewers.includes(userId);
                    return (
                      <label
                        key={userId}
                        htmlFor={`iv-interviewer-${userId}`}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          id={`iv-interviewer-${userId}`}
                          checked={checked}
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

          <Field label="Notes" htmlFor="iv-notes">
            <Textarea
              id="iv-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Anything the panel should know..."
            />
          </Field>
        </form>
      </Modal>
    </PageTemplate>
  );
}
