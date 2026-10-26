'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Modal,
  StatCard,
  StatusBadge,
  SectionCard,
  DetailItem,
  ErrorBanner,
  SuccessBanner,
  Field,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import {
  OFFER_STATUSES,
  OFFER_STATUS_LABELS,
  daysUntil,
  formatDate,
  formatMoney,
  fullName,
  initialsOf,
} from '@/lib/recruitment';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarClock, CheckCircle2, CircleDollarSign, RefreshCw, Trash2 } from 'lucide-react';

const TIMELINE = [
  { value: 'Draft', hint: 'Offer prepared but not shared with the candidate yet.' },
  { value: 'Sent', hint: 'Offer sent to the candidate and awaiting a response.' },
  { value: 'Negotiating', hint: 'Candidate is discussing salary or terms.' },
  { value: 'Accepted', hint: 'Candidate accepted — they are moved to Hired automatically.' },
  { value: 'Declined', hint: 'Candidate declined — they are moved to Rejected automatically.' },
  { value: 'Expired', hint: 'No response was received before the expiration date.' },
];

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [showStatus, setShowStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: 'Draft', decline_reason: '' });
  const [statusError, setStatusError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/offers/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load offer'));
      const json = await res.json().catch(() => ({}));
      setOffer(json.offer || null);
    } catch (err) {
      setError(err.message);
      setOffer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function openStatus() {
    if (!offer) return;
    setStatusForm({ status: offer.status || 'Draft', decline_reason: offer.decline_reason || '' });
    setStatusError('');
    setShowStatus(true);
  }

  async function handleStatusSubmit(event) {
    event.preventDefault();
    if (!offer) return;
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
      const res = await fetch(`/api/recruitment/offers/${offer._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update offer status'));
      const json = await res.json().catch(() => ({}));
      setShowStatus(false);
      setSuccess(json.message || `Status changed to ${OFFER_STATUS_LABELS[statusForm.status] || statusForm.status}.`);
      await load(true);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDelete() {
    if (!offer) return;
    const name = offer.candidate_id ? fullName(offer.candidate_id) : 'this candidate';
    if (!window.confirm(`Delete the offer for "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/offers/${offer._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete offer'));
      router.push('/recruitment/offers');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageTemplate title="Offer" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading offer...</p>
      </PageTemplate>
    );
  }

  if (error || !offer) {
    return (
      <PageTemplate
        title="Offer"
        description="Unable to load this offer"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/offers') }]}
      >
        <ErrorBanner message={error || 'Offer not found'} />
      </PageTemplate>
    );
  }

  const candidate = offer.candidate_id;
  const job = offer.job_id;
  const expiresIn = daysUntil(offer.expiration_date);
  const currency = offer.currency || 'USD';

  return (
    <PageTemplate
      title={`Offer — ${fullName(candidate)}`}
      description={`${job?.title || offer.position || 'Job'} · ${OFFER_STATUS_LABELS[offer.status] || offer.status}`}
      actions={[
        {
          label: 'Back',
          variant: 'outline',
          icon: <ArrowLeft className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/offers'),
        },
        {
          label: 'Change Status',
          variant: 'default',
          icon: <RefreshCw className="mr-1 h-4 w-4" />,
          onClick: openStatus,
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
          <StatCard label="Salary" value={formatMoney(offer.salary, currency)} icon={CircleDollarSign} accent="emerald" />
          <StatCard
            label="Status"
            value={OFFER_STATUS_LABELS[offer.status] || offer.status || '—'}
            icon={CheckCircle2}
            accent={offer.status === 'Accepted' ? 'emerald' : offer.status === 'Declined' ? 'rose' : 'blue'}
          />
          <StatCard label="Offer Date" value={formatDate(offer.offer_date)} icon={CalendarClock} accent="violet" />
          <StatCard
            label="Expiration Date"
            value={formatDate(offer.expiration_date)}
            icon={CalendarClock}
            accent={expiresIn !== null && expiresIn < 0 ? 'rose' : 'amber'}
            hint={
              expiresIn === null
                ? undefined
                : expiresIn < 0
                  ? `Expired ${Math.abs(expiresIn)} day${Math.abs(expiresIn) === 1 ? '' : 's'} ago`
                  : `${expiresIn} day${expiresIn === 1 ? '' : 's'} remaining`
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Candidate" actions={<StatusBadge status={offer.status} labels={OFFER_STATUS_LABELS} />}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {initialsOf(fullName(candidate))}
              </span>
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem label="Name">
                  {candidate?._id ? (
                    <Link href={`/recruitment/candidates/${candidate._id}`} className="font-medium hover:underline">
                      {fullName(candidate)}
                    </Link>
                  ) : (
                    '—'
                  )}
                </DetailItem>
                <DetailItem label="Email">
                  {candidate?.email ? (
                    <a href={`mailto:${candidate.email}`} className="hover:underline">
                      {candidate.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </DetailItem>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Job">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Job Title">
                {job?._id ? (
                  <Link href={`/recruitment/job-postings/${job._id}`} className="font-medium hover:underline">
                    {job.title || '—'}
                  </Link>
                ) : (
                  job?.title || '—'
                )}
              </DetailItem>
              <DetailItem label="Job Code">{job?.job_code || '—'}</DetailItem>
              <DetailItem label="Department">{offer.department_id?.name || '—'}</DetailItem>
              <DetailItem label="Position">{offer.position || '—'}</DetailItem>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Offer Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Position">{offer.position || '—'}</DetailItem>
            <DetailItem label="Salary">{formatMoney(offer.salary, currency)}</DetailItem>
            <DetailItem label="Currency">{currency}</DetailItem>
            <DetailItem label="Bonus">{offer.bonus ? formatMoney(offer.bonus, currency) : '—'}</DetailItem>
            <DetailItem label="Equity">{offer.equity || '—'}</DetailItem>
            <DetailItem label="Start Date">{formatDate(offer.start_date)}</DetailItem>
            <DetailItem label="Expiration Date">{formatDate(offer.expiration_date)}</DetailItem>
            <DetailItem label="Offer Date">{formatDate(offer.offer_date)}</DetailItem>
            <DetailItem label="Response Date">{formatDate(offer.response_date)}</DetailItem>
            <DetailItem label="Approved By">{offer.approved_by?.name || '—'}</DetailItem>
            <DetailItem label="Offer Letter">
              {offer.offer_letter_url ? (
                <a
                  href={offer.offer_letter_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-charcoal hover:underline"
                >
                  View offer letter
                </a>
              ) : (
                '—'
              )}
            </DetailItem>
          </div>

          {offer.decline_reason ? (
            <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">Decline Reason</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{offer.decline_reason}</p>
            </div>
          ) : null}

          <div className="mt-5 border-t pt-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Benefits</p>
            <p className="whitespace-pre-wrap text-sm">{offer.benefits || '—'}</p>
          </div>
        </SectionCard>

        <SectionCard title="Status Timeline" description="What each offer status means">
          <ol className="flex flex-col gap-3">
            {TIMELINE.map((step) => {
              const active = offer.status === step.value;
              return (
                <li key={step.value} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      active ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className={cn('text-sm', active ? 'font-semibold' : 'font-medium')}>
                      {OFFER_STATUS_LABELS[step.value] || step.value}
                      {active ? <span className="ml-2 text-xs text-muted-foreground">Current status</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </div>

      <Modal
        open={showStatus}
        onClose={() => setShowStatus(false)}
        title="Change Offer Status"
        description={`${fullName(candidate)} — ${job?.title || offer.position || 'Offer'}`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowStatus(false)} disabled={statusSaving}>
              Cancel
            </Button>
            <Button type="submit" form="offer-detail-status-form" disabled={statusSaving}>
              {statusSaving ? 'Updating...' : 'Update Status'}
            </Button>
          </>
        }
      >
        <form id="offer-detail-status-form" onSubmit={handleStatusSubmit} className="flex flex-col gap-4">
          {statusError ? <ErrorBanner message={statusError} /> : null}
          <Field
            label="Status"
            htmlFor="offer-detail-status"
            required
            hint="Accepted hires the candidate and stores the offered salary as their final salary. Declined rejects the candidate."
          >
            <Select
              value={statusForm.status}
              onValueChange={(v) =>
                setStatusForm((f) => ({ ...f, status: v, decline_reason: v === 'Declined' ? f.decline_reason : '' }))
              }
            >
              <SelectTrigger id="offer-detail-status">
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
            <Field label="Decline Reason" htmlFor="offer-detail-decline-reason" required>
              <Textarea
                id="offer-detail-decline-reason"
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
