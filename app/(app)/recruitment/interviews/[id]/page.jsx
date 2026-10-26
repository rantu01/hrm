'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StatCard,
  StatusBadge,
  SectionCard,
  DetailItem,
  RatingStars,
  ErrorBanner,
  SuccessBanner,
  TableEmptyRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  RECOMMENDATION_LABELS,
  formatDate,
  formatTime,
  fullName,
  parseList,
} from '@/lib/recruitment';
import { ArrowLeft, CalendarClock, CalendarDays, Clock, MessageSquarePlus, Pencil, Trash2, Users } from 'lucide-react';

const HEX_ID = /^[a-f\d]{24}$/i;

const RATING_COLUMNS = [
  { key: 'technical_rating', label: 'Technical' },
  { key: 'communication_rating', label: 'Communication' },
  { key: 'cultural_fit_rating', label: 'Cultural Fit' },
  { key: 'overall_rating', label: 'Overall' },
];

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const users = useOptionList('/api/recruitment/users', 'users');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/interviews/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load interview'));
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const userMap = useMemo(() => {
    const map = new Map();
    for (const user of users.items) map.set(String(user._id), user);
    for (const user of data?.interviewerUsers || []) {
      if (!map.has(String(user._id))) map.set(String(user._id), user);
    }
    return map;
  }, [users.items, data]);

  function resolveIds(value) {
    const ids = parseList(value);
    return ids.map((item) => {
      const user = userMap.get(String(item));
      if (user) return { id: String(item), name: user.name || 'Unnamed user', email: user.email || '' };
      if (HEX_ID.test(String(item))) return { id: String(item), name: 'Unknown user', email: '' };
      return { id: String(item), name: String(item), email: '' };
    });
  }

  async function handleStatusChange(status) {
    const interview = data?.interview;
    if (!interview || !status || status === interview.status) return;
    setBusy(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch(`/api/recruitment/interviews/${interview._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update interview status'));
      setSuccess('Interview status updated.');
      await load({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const interview = data?.interview;
    if (!interview) return;
    if (!window.confirm(`Delete the interview for "${fullName(interview.candidate_id)}"? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/interviews/${interview._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete interview'));
      router.push('/recruitment/interviews');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageTemplate title="Interview" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading interview...</p>
      </PageTemplate>
    );
  }

  if (error && !data?.interview) {
    return (
      <PageTemplate
        title="Interview"
        description="Unable to load this interview"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/interviews') }]}
      >
        <ErrorBanner message={error || 'Interview not found'} />
      </PageTemplate>
    );
  }

  const interview = data?.interview;
  if (!interview) {
    return (
      <PageTemplate
        title="Interview"
        description="Interview not found"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/interviews') }]}
      >
        <ErrorBanner message="Interview not found" />
      </PageTemplate>
    );
  }

  const feedback = Array.isArray(data.feedback) ? data.feedback : [];
  const interviewers = resolveIds(interview.interviewers);
  const createdBy = interview.created_by
    ? userMap.get(String(interview.created_by))?.name || '—'
    : '—';

  return (
    <PageTemplate
      title={`Interview — ${fullName(interview.candidate_id)}`}
      description={[interview.job_id?.title, interview.round_id?.name].filter(Boolean).join(' · ')}
      actions={[
        {
          label: 'Back',
          variant: 'outline',
          icon: <ArrowLeft className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/interviews'),
        },
        {
          label: 'Edit',
          variant: 'outline',
          icon: <Pencil className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/interviews'),
        },
        {
          label: 'Delete',
          variant: 'destructive',
          icon: <Trash2 className="mr-1 h-4 w-4" />,
          disabled: busy,
          onClick: handleDelete,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {success ? <SuccessBanner message={success} /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Status"
            value={<StatusBadge status={interview.status} labels={INTERVIEW_STATUS_LABELS} />}
            icon={CalendarClock}
            accent="blue"
          />
          <StatCard label="Date" value={formatDate(interview.scheduled_date)} icon={CalendarDays} accent="violet" />
          <StatCard label="Duration" value={`${interview.duration ?? '—'} min`} icon={Clock} accent="amber" />
          <StatCard label="Interviewers" value={interviewers.length} icon={Users} accent="emerald" />
        </div>

        <SectionCard
          title="Overview"
          actions={
            <div className="flex items-center gap-2">
              {interview.feedback_submitted ? <Badge variant="success">Feedback submitted</Badge> : null}
              <Select
                value={interview.status}
                onValueChange={handleStatusChange}
                disabled={busy || !INTERVIEW_STATUSES.includes(interview.status)}
              >
                <SelectTrigger className="h-8 w-[150px]" aria-label="Change interview status">
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
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Candidate">
              <span className="font-medium">{fullName(interview.candidate_id)}</span>
              {interview.candidate_id?.email ? (
                <span className="block text-xs text-muted-foreground">{interview.candidate_id.email}</span>
              ) : null}
            </DetailItem>
            <DetailItem label="Job">
              {interview.job_id?._id ? (
                <Link href={`/recruitment/job-postings/${interview.job_id._id}`} className="hover:underline">
                  {interview.job_id.title}
                </Link>
              ) : (
                interview.job_id?.title || '—'
              )}
            </DetailItem>
            <DetailItem label="Round">
              {interview.round_id?.name
                ? `${interview.round_id.name}${
                    interview.round_id.sequence_number ? ` (Round ${interview.round_id.sequence_number})` : ''
                  }`
                : '—'}
            </DetailItem>
            <DetailItem label="Interview Type">{interview.interview_type_id?.name}</DetailItem>
            <DetailItem label="Date">{formatDate(interview.scheduled_date)}</DetailItem>
            <DetailItem label="Time">{formatTime(interview.scheduled_time)}</DetailItem>
            <DetailItem label="Duration">{interview.duration ? `${interview.duration} minutes` : '—'}</DetailItem>
            <DetailItem label="Location">{interview.location || '—'}</DetailItem>
            <DetailItem label="Meeting Link">
              {interview.meeting_link ? (
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {interview.meeting_link}
                </a>
              ) : (
                '—'
              )}
            </DetailItem>
            <DetailItem label="Created By">{createdBy}</DetailItem>
            <DetailItem label="Created" className="sm:col-span-2">
              {formatDate(interview.createdAt, { withTime: true })}
            </DetailItem>
            {interview.notes ? (
              <DetailItem label="Notes" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-wrap">{interview.notes}</span>
              </DetailItem>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Interviewers" description={`${interviewers.length} assigned`}>
          {interviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interviewers assigned.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {interviewers.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    {person.email ? (
                      <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Interviewer
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Feedback"
          description={`${feedback.length} response${feedback.length === 1 ? '' : 's'}`}
          actions={
            <Button
              size="sm"
              onClick={() => router.push(`/recruitment/interview-feedback?interview_id=${interview._id}`)}
            >
              <MessageSquarePlus className="mr-1 h-4 w-4" />
              Add Feedback
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interviewers</TableHead>
                  {RATING_COLUMNS.map((column) => (
                    <TableHead key={column.key} className="whitespace-nowrap">
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.length === 0 ? (
                  <TableEmptyRow colSpan={8} label="No feedback submitted yet." />
                ) : (
                  feedback.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {resolveIds(row.interviewer_id).map((person) => (
                            <span key={person.id} className="text-sm">
                              {person.name}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      {RATING_COLUMNS.map((column) => (
                        <TableCell key={column.key} className="whitespace-nowrap">
                          <RatingStars value={row[column.key]} />
                        </TableCell>
                      ))}
                      <TableCell>
                        <StatusBadge status={row.recommendation} labels={RECOMMENDATION_LABELS} />
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="line-clamp-3 whitespace-pre-wrap text-sm">{row.comments || '—'}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(row.createdAt || row.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>
    </PageTemplate>
  );
}
