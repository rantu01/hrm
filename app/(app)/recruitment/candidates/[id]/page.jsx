'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StatCard,
  StatusBadge,
  SectionCard,
  DetailItem,
  SkillsTags,
  ErrorBanner,
  SuccessBanner,
  TableEmptyRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABELS,
  GENDER_LABELS,
  formatDate,
  formatMoney,
  formatTime,
  fullName,
} from '@/lib/recruitment';
import { Star, Briefcase, Banknote, CalendarDays, ArrowLeft, UserPlus, Trash2 } from 'lucide-react';

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [data, setData] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [candidateRes, interviewsRes, offersRes, assessmentsRes] = await Promise.all([
        fetch(`/api/recruitment/candidates/${id}`, { credentials: 'include' }),
        fetch(`/api/recruitment/interviews?candidate_id=${id}&limit=100&per_page=100`, { credentials: 'include' }),
        fetch(`/api/recruitment/offers?candidate_id=${id}&limit=100&per_page=100`, { credentials: 'include' }),
        fetch(`/api/recruitment/candidate-assessments?candidate_id=${id}&limit=100&per_page=100`, {
          credentials: 'include',
        }),
      ]);

      if (!candidateRes.ok) throw new Error(await readApiError(candidateRes, 'Failed to load candidate'));
      const candidateJson = await candidateRes.json();
      setData(candidateJson);

      if (interviewsRes.ok) {
        const json = await interviewsRes.json().catch(() => ({}));
        setInterviews(Array.isArray(json.interviews) ? json.interviews : []);
      } else {
        setInterviews([]);
      }

      if (offersRes.ok) {
        const json = await offersRes.json().catch(() => ({}));
        setOffers(Array.isArray(json.offers) ? json.offers : []);
        setOffersLoaded(true);
      } else {
        setOffers([]);
        setOffersLoaded(false);
      }

      if (assessmentsRes.ok) {
        const json = await assessmentsRes.json().catch(() => ({}));
        setAssessments(Array.isArray(json.candidateAssessments) ? json.candidateAssessments : []);
      } else {
        setAssessments([]);
      }
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

  async function handleStatusChange(status) {
    if (!data?.candidate || status === data.candidate.status) return;
    setChangingStatus(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/candidates/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update candidate status'));
      setSuccess('Candidate status updated successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleDelete() {
    if (!data?.candidate) return;
    if (!window.confirm(`Delete candidate "${fullName(data.candidate)}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/candidates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete candidate'));
      router.push('/recruitment/candidates');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageTemplate title="Candidate" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading candidate...</p>
      </PageTemplate>
    );
  }

  if (error && !data?.candidate) {
    return (
      <PageTemplate
        title="Candidate"
        description="Unable to load this candidate"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/candidates') }]}
      >
        <ErrorBanner message={error} />
      </PageTemplate>
    );
  }

  if (!data?.candidate) {
    return (
      <PageTemplate
        title="Candidate"
        description="Unable to load this candidate"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/candidates') }]}
      >
        <ErrorBanner message="Candidate not found" />
      </PageTemplate>
    );
  }

  const candidate = data.candidate;
  const hasAcceptedOffer = offers.some((offer) => offer.status === 'Accepted');
  const canConvert =
    candidate.status === 'Hired' && !candidate.is_employee && (!offersLoaded || hasAcceptedOffer);

  return (
    <PageTemplate
      title={fullName(candidate)}
      description={`${candidate.email || 'No email'} · ${CANDIDATE_STATUS_LABELS[candidate.status] || candidate.status}`}
      actions={[
        {
          label: 'Back',
          variant: 'outline',
          icon: <ArrowLeft className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/candidates'),
        },
        {
          label: 'Convert to Employee',
          variant: 'default',
          icon: <UserPlus className="mr-1 h-4 w-4" />,
          disabled: !canConvert,
          onClick: () => router.push(`/recruitment/candidates/${id}/convert-to-employee`),
        },
        {
          label: deleting ? 'Deleting...' : 'Delete',
          variant: 'destructive',
          icon: <Trash2 className="mr-1 h-4 w-4" />,
          disabled: deleting,
          onClick: handleDelete,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {success ? <SuccessBanner message={success} /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Rating"
            value={candidate.rating ? Number(candidate.rating).toFixed(1) : '—'}
            hint="out of 5"
            icon={Star}
            accent="amber"
          />
          <StatCard label="Experience" value={`${candidate.experience_years ?? 0} yrs`} icon={Briefcase} accent="blue" />
          <StatCard label="Expected Salary" value={formatMoney(candidate.expected_salary)} icon={Banknote} accent="emerald" />
          <StatCard label="Interviews" value={data.interviewsCount ?? interviews.length} icon={CalendarDays} accent="violet" />
        </div>

        {candidate.status === 'Hired' && !candidate.is_employee && offersLoaded && !hasAcceptedOffer ? (
          <p className="text-xs text-muted-foreground">
            An accepted offer is required before this candidate can be converted to an employee.
          </p>
        ) : null}
        {candidate.is_employee ? (
          <p className="text-xs text-muted-foreground">This candidate has already been converted to an employee.</p>
        ) : null}

        <SectionCard
          title="Overview"
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={candidate.status} labels={CANDIDATE_STATUS_LABELS} />
              <Select
                value={candidate.status}
                onValueChange={handleStatusChange}
                disabled={changingStatus}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Change candidate status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CANDIDATE_STATUS_LABELS[status] || status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Phone">{candidate.phone}</DetailItem>
            <DetailItem label="Email">{candidate.email}</DetailItem>
            <DetailItem label="Gender">{candidate.gender ? GENDER_LABELS[candidate.gender] || candidate.gender : null}</DetailItem>
            <DetailItem label="Date of Birth">{formatDate(candidate.date_of_birth)}</DetailItem>
            <DetailItem label="Current Company">{candidate.current_company}</DetailItem>
            <DetailItem label="Current Position">{candidate.current_position}</DetailItem>
            <DetailItem label="Experience">{`${candidate.experience_years ?? 0} years`}</DetailItem>
            <DetailItem label="Current Salary">{formatMoney(candidate.current_salary)}</DetailItem>
            <DetailItem label="Expected Salary">{formatMoney(candidate.expected_salary)}</DetailItem>
            <DetailItem label="Notice Period">
              {candidate.notice_period ? `${candidate.notice_period} days` : null}
            </DetailItem>
            <DetailItem label="Source">{candidate.source_id?.name}</DetailItem>
            <DetailItem label="Job Posting">
              {candidate.job_id?.title}
              {candidate.job_id?.job_code ? (
                <span className="ml-1 text-xs text-muted-foreground">({candidate.job_id.job_code})</span>
              ) : null}
            </DetailItem>
            <DetailItem label="Branch">{candidate.branch_id?.name}</DetailItem>
            <DetailItem label="Department">{candidate.department_id?.name}</DetailItem>
            <DetailItem label="Referred By">{candidate.referral_employee_id?.name}</DetailItem>
            <DetailItem label="Application Date">{formatDate(candidate.application_date)}</DetailItem>
            <DetailItem label="LinkedIn">
              {candidate.linkedin_url ? (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {candidate.linkedin_url}
                </a>
              ) : null}
            </DetailItem>
            <DetailItem label="Portfolio">
              {candidate.portfolio_url ? (
                <a
                  href={candidate.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {candidate.portfolio_url}
                </a>
              ) : null}
            </DetailItem>
            <DetailItem label="Resume">
              {candidate.resume_url ? (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  View resume
                </a>
              ) : null}
            </DetailItem>
          </div>
        </SectionCard>

        <SectionCard title="Skills">
          <SkillsTags skills={candidate.skills} max={50} />
        </SectionCard>

        <SectionCard title="Cover Letter & Notes">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Cover Letter</p>
              <p className="whitespace-pre-wrap text-sm">{candidate.coverletter_message || '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap text-sm">{candidate.notes || '—'}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Interviews" description="Scheduled and completed interview rounds">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.length === 0 ? (
                  <TableEmptyRow colSpan={5} label="No interviews scheduled yet." />
                ) : (
                  interviews.map((interview) => (
                    <TableRow key={interview._id}>
                      <TableCell>{interview.round_id?.name || '—'}</TableCell>
                      <TableCell>{interview.interview_type_id?.name || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(interview.scheduled_date)}
                        {interview.scheduled_time ? ` · ${formatTime(interview.scheduled_time)}` : ''}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{interview.duration ?? 0} min</TableCell>
                      <TableCell>
                        <StatusBadge status={interview.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard title="Offers" description="Offers extended to this candidate">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salary</TableHead>
                  <TableHead>Offer Date</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length === 0 ? (
                  <TableEmptyRow colSpan={4} label="No offers extended yet." />
                ) : (
                  offers.map((offer) => (
                    <TableRow key={offer._id}>
                      <TableCell className="whitespace-nowrap">{formatMoney(offer.salary)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(offer.offer_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(offer.expiration_date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={offer.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard title="Assessments" description="Tests and evaluations completed by the candidate">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.length === 0 ? (
                  <TableEmptyRow colSpan={4} label="No assessments recorded yet." />
                ) : (
                  assessments.map((assessment) => (
                    <TableRow key={assessment._id}>
                      <TableCell>{assessment.assessment_name || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(assessment.assessment_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {assessment.score ?? 0} / {assessment.max_score ?? 0}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={assessment.pass_fail_status} />
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
