'use client';

import { useState } from 'react';
import HrCrudPage from '@/components/hr/hr-crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

export default function EmployeeGoalsPage() {
  const [progressRow, setProgressRow] = useState(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleProgressSave(e) {
    e.preventDefault();
    if (!progressRow) return;
    const id = progressRow._id || progressRow.id;
    const progress = Number(progressValue);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      setProgressError('Progress must be an integer between 0 and 100');
      return;
    }
    setProgressSaving(true);
    setProgressError('');
    try {
      const res = await fetch(`/api/performance/employee-goals/${id}/update-progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ progress }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to update progress');
      setProgressRow(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setProgressError(err.message);
    } finally {
      setProgressSaving(false);
    }
  }

  return (
    <>
      <HrCrudPage
        key={refreshKey}
        title="Employee Goals"
        description="Set and track performance goals for your employees"
        apiEndpoint="/api/performance/employee-goals"
        itemKey="employeeGoals"
        searchPlaceholder="Search employee goals..."
        createLabel="Add Goal"
        sortable
        perPageOptions={[10, 25, 50]}
        statusTabs={{
          tabs: [
            { value: 'all', label: 'All' },
            { value: 'not_started', label: 'Not Started' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ],
          countsKey: 'statusCounts',
        }}
        filters={[
          {
            name: 'employee_id',
            label: 'Employee',
            placeholder: 'All Employees',
            optionsEndpoint: '/api/employees',
            optionsKey: 'employees',
            optionLabel: 'name',
            optionValue: '_id',
          },
          {
            name: 'goal_type_id',
            label: 'Goal Type',
            placeholder: 'All Goal Types',
            optionsEndpoint: '/api/performance/goal-types',
            optionsKey: 'goalTypes',
            optionLabel: 'name',
            optionValue: '_id',
          },
        ]}
        viewConfig={{
          title: 'Employee Goal Details',
          fields: [
            { key: 'title', label: 'Goal Title' },
            { key: 'employee_id.name', label: 'Employee' },
            { key: 'employee_id.email', label: 'Employee Email' },
            { key: 'goal_type_id.name', label: 'Goal Type' },
            { key: 'target', label: 'Target' },
            { key: 'start_date', label: 'Start Date', type: 'date' },
            { key: 'end_date', label: 'End Date', type: 'date' },
            { key: 'progress', label: 'Progress' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ],
        }}
        rowActions={[
          {
            label: 'Update Progress',
            variant: 'outline',
            onClick: (row) => {
              setProgressRow(row);
              setProgressValue(row?.progress ?? 0);
              setProgressError('');
            },
          },
        ]}
        columns={[
          {
            key: 'title',
            label: 'Title',
            sortable: true,
            render: (value, row) => (
              <div>
                <div className="font-medium">{value || '—'}</div>
                {row?.goal_type_id?.name ? (
                  <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    {row.goal_type_id.name}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: 'employee_id',
            label: 'Employee',
            render: (value) => (
              <div>
                <div className="font-medium">{value?.name || '—'}</div>
                {value?.email ? <div className="text-sm text-muted-foreground">{value.email}</div> : null}
              </div>
            ),
          },
          {
            key: 'start_date',
            label: 'Duration',
            sortable: true,
            render: (value, row) => (
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>{formatDate(row?.start_date)}</span>
                <span>{formatDate(row?.end_date)}</span>
              </div>
            ),
          },
          {
            key: 'end_date',
            label: 'Days',
            render: (value, row) => {
              const start = row?.start_date ? new Date(row.start_date) : null;
              const end = row?.end_date ? new Date(row.end_date) : null;
              if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
              const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
              return (
                <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                  {days}d
                </span>
              );
            },
          },
          {
            key: 'progress',
            label: 'Progress',
            render: (value) => (
              <div className="flex min-w-[120px] items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${value || 0}%` }} />
                </div>
                <span className="shrink-0 text-xs font-medium">{value ?? 0}%</span>
              </div>
            ),
          },
          { key: 'status', label: 'Status' },
        ]}
        fields={[
          {
            name: 'employee_id',
            label: 'Employee',
            type: 'select',
            required: true,
            placeholder: 'Select Employee',
            optionsEndpoint: '/api/employees',
            optionsKey: 'employees',
            optionLabel: 'name',
            optionValue: '_id',
          },
          {
            name: 'goal_type_id',
            label: 'Goal Type',
            type: 'select',
            required: true,
            placeholder: 'Select Goal Type',
            optionsEndpoint: '/api/performance/goal-types',
            optionsKey: 'goalTypes',
            optionLabel: 'name',
            optionValue: '_id',
          },
          { name: 'title', label: 'Goal Title', type: 'text', required: true, placeholder: 'e.g. Improve Customer Satisfaction' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'e.g. Achieve a customer satisfaction score of 90% or above...' },
          { name: 'start_date', label: 'Start Date', type: 'date', required: true },
          { name: 'end_date', label: 'End Date', type: 'date', required: true },
          { name: 'target', label: 'Target', type: 'text', placeholder: 'e.g. Complete 5 projects, Achieve 95% accuracy, etc.' },
          { name: 'progress', label: 'Progress (%)', type: 'number', placeholder: 'e.g. 50' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            placeholder: 'Select status',
            options: [
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
            ],
          },
        ]}
      />

      {progressRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Update Goal Progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">{progressRow.title}</p>
            {progressError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {progressError}
              </div>
            )}
            <form onSubmit={handleProgressSave} className="mt-4 flex flex-col gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{progressValue}%</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progressValue}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setProgressRow(null)} disabled={progressSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={progressSaving}>
                  {progressSaving ? 'Saving...' : 'Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
