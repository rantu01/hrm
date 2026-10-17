'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConductReviewClient({ id }) {
  const router = useRouter();
  const [review, setReview] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [overallComments, setOverallComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [revRes, indRes] = await Promise.all([
          fetch(`/api/performance/reviews/${id}`, { credentials: 'include' }),
          fetch('/api/performance/indicators?limit=100', { credentials: 'include' }),
        ]);
        const revJson = await revRes.json();
        if (!revRes.ok) throw new Error(revJson.message || revJson.error || 'Failed to fetch review');
        const indJson = await indRes.json().catch(() => ({}));
        setReview(revJson.review);
        const list = Array.isArray(indJson.indicators) ? indJson.indicators : [];
        setIndicators(list);
        const initialRatings = {};
        const initialComments = {};
        for (const r of revJson.ratings || []) {
          const key = String(r.indicator_id?._id || r.indicator_id);
          initialRatings[key] = r.rating ?? 3;
          initialComments[key] = r.comments || '';
        }
        for (const ind of list) {
          const key = String(ind._id || ind.id);
          if (initialRatings[key] === undefined) initialRatings[key] = 3;
          if (initialComments[key] === undefined) initialComments[key] = '';
        }
        setRatings(initialRatings);
        setComments(initialComments);
        setOverallComments(revJson.review?.comments || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const grouped = useMemo(() => {
    return indicators.reduce((acc, ind) => {
      const name = ind.category_id?.name || 'Uncategorized';
      if (!acc[name]) acc[name] = [];
      acc[name].push(ind);
      return acc;
    }, {});
  }, [indicators]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ratings: indicators.map((ind) => ({
          indicator_id: String(ind._id || ind.id),
          rating: Number(ratings[String(ind._id || ind.id)] ?? 3),
          comments: comments[String(ind._id || ind.id)] || null,
        })),
        comments: overallComments || null,
      };
      const res = await fetch(`/api/performance/reviews/${id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to submit review');
      router.push(`/hr/performance/employee-reviews/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTemplate
      title="Conduct Performance Review"
      description="Rate the employee on each performance indicator"
      actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/hr/performance/employee-reviews') }]}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error && !review ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Information</CardTitle>
                <CardDescription>You are conducting a performance review for:</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employee</p>
                    <p className="mt-1 text-sm font-medium">{review?.employee_id?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Review Cycle</p>
                    <p className="mt-1 text-sm font-medium">{review?.review_cycle_id?.name || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Ratings</CardTitle>
                <CardDescription>Rate the employee on each performance indicator (0-5)</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-8">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="flex flex-col gap-4">
                      <h3 className="text-base font-semibold">{category}</h3>
                      <div className="flex flex-col gap-6">
                        {items.map((ind) => {
                          const key = String(ind._id || ind.id);
                          return (
                            <div key={key} className="rounded-md border p-4">
                              <div className="flex flex-col gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold">{ind.name}</h4>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {ind.description || 'No description'}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {ind.measurement_unit && <Badge variant="outline">Measurement: {ind.measurement_unit}</Badge>}
                                    {ind.target_value && <Badge variant="outline">Target: {ind.target_value}</Badge>}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`rating-${key}`}>Rating (0-5): {ratings[key] ?? 3}</Label>
                                  <Input
                                    id={`rating-${key}`}
                                    type="number"
                                    min={0}
                                    max={5}
                                    step={0.5}
                                    value={ratings[key] ?? 3}
                                    onChange={(e) =>
                                      setRatings((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    required
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`comments-${key}`}>Comments</Label>
                                  <Textarea
                                    id={`comments-${key}`}
                                    value={comments[key] || ''}
                                    onChange={(e) =>
                                      setComments((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    placeholder="Add specific feedback for this indicator"
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="overall-comments">Overall Comments</Label>
                      <Textarea
                        id="overall-comments"
                        value={overallComments}
                        onChange={(e) => setOverallComments(e.target.value)}
                        placeholder="Add overall feedback and recommendations"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end space-x-4 px-6 pb-6">
                <Button type="button" variant="outline" onClick={() => router.push('/hr/performance/employee-reviews')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </Card>
          </div>
        </form>
      )}
    </PageTemplate>
  );
}
