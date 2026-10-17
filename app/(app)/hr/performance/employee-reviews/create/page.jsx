'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function CreateEmployeeReviewPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    reviewer_id: '',
    review_cycle_id: '',
    review_date: '',
    completion_date: '',
    comments: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [empRes, cycRes] = await Promise.all([
          fetch('/api/employees?limit=100', { credentials: 'include' }),
          fetch('/api/performance/review-cycles?limit=100', { credentials: 'include' }),
        ]);
        const empJson = await empRes.json().catch(() => ({}));
        const cycJson = await cycRes.json().catch(() => ({}));
        setEmployees(Array.isArray(empJson.employees) ? empJson.employees : []);
        setCycles(Array.isArray(cycJson.reviewCycles) ? cycJson.reviewCycles : []);
      } catch {
        setEmployees([]);
        setCycles([]);
      }
    }
    load();
  }, []);

  function handleChange(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validation = {};
    if (!formData.employee_id) validation.employee_id = 'Employee is required';
    if (!formData.reviewer_id) validation.reviewer_id = 'Reviewer is required';
    if (!formData.review_cycle_id) validation.review_cycle_id = 'Review cycle is required';
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...formData };
      if (!payload.review_date) delete payload.review_date;
      if (!payload.completion_date) delete payload.completion_date;
      if (!payload.comments) delete payload.comments;
      const res = await fetch('/api/performance/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json.message ||
            json.error ||
            (Array.isArray(json.errors) ? json.errors.map((er) => er.msg).join(', ') : null) ||
            'Failed to schedule review'
        );
      }
      router.push('/hr/performance/employee-reviews');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTemplate
      title="Schedule Employee Review"
      description="Schedule a new performance review for an employee"
      actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/hr/performance/employee-reviews') }]}
    >
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Schedule New Review</CardTitle>
            <CardDescription>Create a new performance review for an employee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee_id" required>Employee</Label>
                <Select value={formData.employee_id} onValueChange={(v) => handleChange('employee_id', v)}>
                  <SelectTrigger className={errors.employee_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent searchable>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id || emp.id} value={String(emp._id || emp.id)}>
                        {emp.email ? `${emp.name} (${emp.email})` : emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employee_id && <p className="text-sm text-red-500">{errors.employee_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewer_id" required>Reviewer</Label>
                <Select value={formData.reviewer_id} onValueChange={(v) => handleChange('reviewer_id', v)}>
                  <SelectTrigger className={errors.reviewer_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent searchable>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id || emp.id} value={String(emp._id || emp.id)}>
                        {emp.email ? `${emp.name} (${emp.email})` : emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reviewer_id && <p className="text-sm text-red-500">{errors.reviewer_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_cycle_id" required>Review Cycle</Label>
                <Select value={formData.review_cycle_id} onValueChange={(v) => handleChange('review_cycle_id', v)}>
                  <SelectTrigger className={errors.review_cycle_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select review cycle" />
                  </SelectTrigger>
                  <SelectContent searchable>
                    {cycles.map((c) => (
                      <SelectItem key={c._id || c.id} value={String(c._id || c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.review_cycle_id && <p className="text-sm text-red-500">{errors.review_cycle_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_date">Review Date</Label>
                <Input
                  id="review_date"
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => handleChange('review_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completion_date">Completion Date</Label>
                <Input
                  id="completion_date"
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => handleChange('completion_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => handleChange('comments', e.target.value)}
                  placeholder="Add comments or objectives for this review"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
          <div className="flex justify-end space-x-4 px-6 pb-6">
            <Button type="button" variant="outline" onClick={() => router.push('/hr/performance/employee-reviews')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Scheduling...' : 'Schedule Review'}
            </Button>
          </div>
        </Card>
      </form>
    </PageTemplate>
  );
}
