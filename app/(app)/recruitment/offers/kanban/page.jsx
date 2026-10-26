'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Input } from '@/components/ui/input';
import {
  ErrorBanner,
  KanbanBoard,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { OFFER_STATUSES, formatDate, formatMoney, fullName, initialsOf } from '@/lib/recruitment';
import { List } from 'lucide-react';

const COLUMNS = [
  { value: 'Draft', label: 'Draft', accent: 'bg-brand-white' },
  { value: 'Sent', label: 'Sent', accent: 'bg-brand-yellow' },
  { value: 'Accepted', label: 'Accepted', accent: 'bg-brand-yellow' },
  { value: 'Negotiating', label: 'Negotiating', accent: 'bg-brand-yellow' },
  { value: 'Declined', label: 'Declined', accent: 'bg-brand-red' },
  { value: 'Expired', label: 'Expired', accent: 'bg-brand-white' },
];

export default function OffersKanbanPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({ view: 'kanban' });
      if (query) sp.set('search', query);
      const res = await fetch(`/api/recruitment/offers?${sp.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load offers'));
      const json = await res.json().catch(() => ({}));
      setItems(Array.isArray(json.offers) ? json.offers : []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleMove(offer, nextStatus) {
    if (!nextStatus || nextStatus === offer.status) return;
    setMovingId(offer._id);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/offers/${offer._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to move offer'));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <PageTemplate
      title="Offers Kanban"
      description="Drag offers between stages to track them from draft to acceptance"
      actions={[
        {
          label: 'List View',
          variant: 'outline',
          icon: <List className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/offers'),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search candidate name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search offers"
          />
          <span className="text-xs text-muted-foreground">
            {loading ? 'Loading offers...' : `${items.length} offer${items.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        {loading && items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading offers...</p>
        ) : (
          <KanbanBoard
            columns={COLUMNS}
            items={items}
            movingId={movingId}
            getColumn={(offer) => (OFFER_STATUSES.includes(offer.status) ? offer.status : 'Draft')}
            onMove={handleMove}
            emptyLabel="No offers in this stage"
            renderCard={(offer) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initialsOf(fullName(offer.candidate_id))}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/recruitment/offers/${offer._id}`}
                      className="block truncate text-sm font-semibold hover:underline"
                    >
                      {fullName(offer.candidate_id)}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{offer.candidate_id?.email || '—'}</p>
                  </div>
                </div>

                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{offer.job_id?.title || offer.position || '—'}</span>
                </p>

                <div className="flex items-center justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Salary</span>
                  <span className="font-mono font-semibold">{formatMoney(offer.salary)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Offer: {formatDate(offer.offer_date)}</span>
                  <span>Exp: {formatDate(offer.expiration_date)}</span>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </PageTemplate>
  );
}
