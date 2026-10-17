'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

export default function ShowReviewClient({ id }) {
  const router = useRouter();
  const [review, setReview] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/performance/reviews/${id}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch review');
        setReview(json.review);
        setRatings(Array.isArray(json.ratings) ? json.ratings : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const grouped = ratings.reduce((acc, r) => {
    const name = r.indicator_id?.category_id?.name || 'Uncategorized';
    if (!acc[name]) acc[name] = [];
    acc[name].push(r);
    return acc;
  }, {});

  return (
    <PageTemplate
      title="Review Details"
      description="View the full results and feedback for this performance review"
      actions={[
        { label: 'Back', variant: 'outline', onClick: () => router.push('/hr/performance/employee-reviews') },
      ]}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : !review ? (
        <p className="text-sm text-muted-foreground">Review not found.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Information</CardTitle>
              <CardDescription>Details about this performance review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Employee</p>
                    <p className="text-sm font-medium">{review.employee_id?.name || '-'}</p>
                    {review.employee_id?.email && <p className="text-sm text-muted-foreground">{review.employee_id.email}</p>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Reviewer</p>
                    <p className="text-sm font-medium">{review.reviewer_id?.name || '-'}</p>
                    {review.reviewer_id?.email && <p className="text-sm text-muted-foreground">{review.reviewer_id.email}</p>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Review Cycle</p>
                    <p className="text-sm font-medium">{review.review_cycle_id?.name || '-'}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Review Date</p>
                    <p className="text-sm font-medium">{formatDate(review.review_date)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Completion Date</p>
                    <p className="text-sm font-medium">{formatDate(review.completion_date)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">Status</p>
                    <Badge variant="outline">{review.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-6">
                <p className="text-base font-semibold">Overall Rating</p>
                <p className="text-2xl font-bold">{review.overall_rating ? Number(review.overall_rating).toFixed(1) : '-'}</p>
              </div>
              {review.comments && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">Comments</p>
                  <p className="mt-1 text-sm">{review.comments}</p>
                </div>
              )}
              {review.status !== 'completed' && (
                <div className="mt-6 flex justify-end">
                  <Link href={`/hr/performance/employee-reviews/${id}/conduct`}>
                    <Button>Conduct Review</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Ratings</CardTitle>
              <CardDescription>Individual ratings for each performance indicator</CardDescription>
            </CardHeader>
            <CardContent>
              {ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ratings submitted yet.</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="flex flex-col gap-4">
                      <h3 className="text-base font-semibold">{category}</h3>
                      <div className="flex flex-col gap-4">
                        {items.map((r) => (
                          <div key={r._id || r.id} className="rounded-lg border bg-muted/30 p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold">{r.indicator_id?.name || '-'}</h4>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {r.indicator_id?.description || 'No description'}
                                </p>
                                {r.indicator_id?.measurement_unit && (
                                  <Badge variant="outline" className="mt-2">{r.indicator_id.measurement_unit}</Badge>
                                )}
                              </div>
                              <span className="ml-4 text-xl font-bold">{Number(r.rating).toFixed(1)}</span>
                            </div>
                            {r.comments && (
                              <div className="mt-3 border-t pt-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comments</p>
                                <p className="mt-1 text-sm">{r.comments}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageTemplate>
  );
}
