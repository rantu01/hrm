'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, ErrorBanner, SectionCard, readApiError } from '@/components/recruitment/recruitment-ui';
import { useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  APPLICANT_FIELDS,
  JOB_PRIORITIES,
  JOB_STATUSES,
  VISIBILITY_FIELDS,
  parseList,
} from '@/lib/recruitment';

const EMPTY = {
  title: '',
  job_code: '',
  job_type_id: '',
  location_id: '',
  department_id: '',
  branch_id: '',
  category_id: '',
  priority: 'Medium',
  positions: 1,
  min_experience: 0,
  max_experience: '',
  min_salary: 0,
  max_salary: 0,
  start_date: '',
  application_deadline: '',
  description: '',
  requirements: '',
  benefits: '',
  skills: '',
  is_featured: false,
  status: 'Draft',
  applicant: [],
  visibility: [],
  custom_question: [],
};

function dateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toForm(job) {
  return {
    ...EMPTY,
    title: job.title || '',
    job_code: job.job_code || '',
    job_type_id: job.job_type_id?._id || job.job_type_id || '',
    location_id: job.location_id?._id || job.location_id || '',
    department_id: job.department_id?._id || job.department_id || '',
    branch_id: job.branch_id?._id || job.branch_id || '',
    category_id: job.category_id?._id || job.category_id || '',
    priority: job.priority || 'Medium',
    positions: job.positions ?? 1,
    min_experience: job.min_experience ?? 0,
    max_experience: job.max_experience ?? '',
    min_salary: job.min_salary ?? 0,
    max_salary: job.max_salary ?? 0,
    start_date: dateInput(job.start_date),
    application_deadline: dateInput(job.application_deadline),
    description: job.description || '',
    requirements: job.requirements || '',
    benefits: job.benefits || '',
    skills: Array.isArray(job.skills) ? job.skills.join(', ') : '',
    is_featured: Boolean(job.is_featured),
    status: job.status || 'Draft',
    applicant: Array.isArray(job.applicant) ? job.applicant : [],
    visibility: Array.isArray(job.visibility) ? job.visibility : [],
    custom_question: Array.isArray(job.custom_question)
      ? job.custom_question.map((q) => (typeof q === 'string' ? q : q?._id)).filter(Boolean)
      : [],
  };
}

function OptionFields({ label, options, selected, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => onToggle(option.value, checked === true)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function JobPostingForm({ job = null }) {
  const router = useRouter();
  const editing = Boolean(job);
  const [form, setForm] = useState(job ? toForm(job) : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const jobTypes = useOptionList('/api/recruitment/job-types', 'jobTypes', { status: 'active' });
  const locations = useOptionList('/api/recruitment/job-locations', 'jobLocations', { status: 'active' });
  const departments = useOptionList('/api/departments', 'departments', { status: 'active' });
  const branches = useOptionList('/api/branches', 'branches', { status: 'active' });
  const categories = useOptionList('/api/recruitment/job-categories', 'jobCategories', { status: 'active' });
  const questions = useOptionList('/api/recruitment/custom-questions', 'customQuestions');

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleArray(name, value, checked) {
    setForm((prev) => {
      const current = Array.isArray(prev[name]) ? prev[name] : [];
      return {
        ...prev,
        [name]: checked ? [...new Set([...current, value])] : current.filter((v) => v !== value),
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        job_code: form.job_code.trim(),
        job_type_id: form.job_type_id,
        location_id: form.location_id,
        department_id: form.department_id,
        branch_id: form.branch_id,
        category_id: form.category_id,
        priority: form.priority,
        positions: Number(form.positions) || 1,
        min_experience: form.min_experience === '' ? 0 : Number(form.min_experience),
        max_experience: form.max_experience === '' ? null : Number(form.max_experience),
        min_salary: form.min_salary === '' ? 0 : Number(form.min_salary),
        max_salary: form.max_salary === '' ? 0 : Number(form.max_salary),
        start_date: form.start_date || null,
        application_deadline: form.application_deadline || null,
        description: form.description,
        requirements: form.requirements,
        benefits: form.benefits,
        skills: parseList(form.skills),
        is_featured: form.is_featured,
        status: form.status,
        applicant: form.applicant,
        visibility: form.visibility,
        custom_question: form.custom_question,
      };
      for (const key of Object.keys(payload)) {
        if (payload[key] === '' || payload[key] === undefined) delete payload[key];
      }

      const res = await fetch(
        editing ? `/api/recruitment/job-postings/${job._id}` : '/api/recruitment/job-postings',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save job posting'));
      router.push('/recruitment/job-postings');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTemplate
      title={editing ? 'Edit Job Posting' : 'Post a Job'}
      description={editing ? `Updating ${job.title}` : 'Create a new opening and publish it to the careers pipeline'}
      breadcrumbs
      actions={[
        { label: 'Cancel', variant: 'outline', onClick: () => router.push('/recruitment/job-postings') },
      ]}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error ? <ErrorBanner message={error} /> : null}

        <SectionCard title="Job Information" description="Core details shown on the careers listing">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Job Title" htmlFor="job-title" required>
              <Input
                id="job-title"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
                placeholder="e.g. Senior Frontend Engineer"
              />
            </Field>
            <Field label="Job Code" htmlFor="job-code" hint="Leave blank to generate automatically">
              <Input
                id="job-code"
                value={form.job_code}
                onChange={(e) => setField('job_code', e.target.value)}
                placeholder="JOB-0001"
              />
            </Field>
            <Field label="Job Type" htmlFor="job-type">
              <Select value={form.job_type_id || 'none'} onValueChange={(v) => setField('job_type_id', v === 'none' ? '' : v)}>
                <SelectTrigger id="job-type">
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">None</SelectItem>
                  {jobTypes.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location" htmlFor="job-location">
              <Select value={form.location_id || 'none'} onValueChange={(v) => setField('location_id', v === 'none' ? '' : v)}>
                <SelectTrigger id="job-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">None</SelectItem>
                  {locations.options.map((o) => {
                    const isRemote = o.raw?.is_remote;
                    return (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}{isRemote ? ' (Remote)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department" htmlFor="job-department">
              <Select value={form.department_id || 'none'} onValueChange={(v) => setField('department_id', v === 'none' ? '' : v)}>
                <SelectTrigger id="job-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">None</SelectItem>
                  {departments.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch" htmlFor="job-branch">
              <Select value={form.branch_id || 'none'} onValueChange={(v) => setField('branch_id', v === 'none' ? '' : v)}>
                <SelectTrigger id="job-branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">None</SelectItem>
                  {branches.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category" htmlFor="job-category">
              <Select value={form.category_id || 'none'} onValueChange={(v) => setField('category_id', v === 'none' ? '' : v)}>
                <SelectTrigger id="job-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">None</SelectItem>
                  {categories.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority" htmlFor="job-priority">
              <Select value={form.priority} onValueChange={(v) => setField('priority', v)}>
                <SelectTrigger id="job-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Positions" htmlFor="job-positions" required>
              <Input
                id="job-positions"
                type="number"
                min={1}
                value={form.positions}
                onChange={(e) => setField('positions', e.target.value)}
              />
            </Field>
            <Field label="Skills" htmlFor="job-skills" hint="Separate skills with commas">
              <Input
                id="job-skills"
                value={form.skills}
                onChange={(e) => setField('skills', e.target.value)}
                placeholder="React, Node.js, MongoDB"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Experience & Compensation">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Min Experience (years)" htmlFor="job-min-exp">
              <Input
                id="job-min-exp"
                type="number"
                min={0}
                value={form.min_experience}
                onChange={(e) => setField('min_experience', e.target.value)}
              />
            </Field>
            <Field label="Max Experience (years)" htmlFor="job-max-exp">
              <Input
                id="job-max-exp"
                type="number"
                min={0}
                value={form.max_experience}
                onChange={(e) => setField('max_experience', e.target.value)}
              />
            </Field>
            <Field label="Min Salary" htmlFor="job-min-salary">
              <Input
                id="job-min-salary"
                type="number"
                min={0}
                value={form.min_salary}
                onChange={(e) => setField('min_salary', e.target.value)}
              />
            </Field>
            <Field label="Max Salary" htmlFor="job-max-salary">
              <Input
                id="job-max-salary"
                type="number"
                min={0}
                value={form.max_salary}
                onChange={(e) => setField('max_salary', e.target.value)}
              />
            </Field>
            <Field label="Start Date" htmlFor="job-start">
              <Input
                id="job-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
              />
            </Field>
            <Field label="Application Deadline" htmlFor="job-deadline">
              <Input
                id="job-deadline"
                type="date"
                value={form.application_deadline}
                onChange={(e) => setField('application_deadline', e.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Description">
          <div className="flex flex-col gap-4">
            <Field label="Job Description" htmlFor="job-description">
              <Textarea
                id="job-description"
                rows={5}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Role overview, responsibilities and day-to-day work..."
              />
            </Field>
            <Field label="Requirements" htmlFor="job-requirements">
              <Textarea
                id="job-requirements"
                rows={4}
                value={form.requirements}
                onChange={(e) => setField('requirements', e.target.value)}
                placeholder="Qualifications, certifications, must-have experience..."
              />
            </Field>
            <Field label="Benefits" htmlFor="job-benefits">
              <Textarea
                id="job-benefits"
                rows={3}
                value={form.benefits}
                onChange={(e) => setField('benefits', e.target.value)}
                placeholder="Health insurance, remote work, learning budget..."
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Application Form" description="Choose which optional fields applicants must fill in">
          <div className="flex flex-col gap-5">
            <OptionFields
              label="Applicant fields"
              options={APPLICANT_FIELDS}
              selected={form.applicant}
              onToggle={(value, checked) => toggleArray('applicant', value, checked)}
            />
            <OptionFields
              label="Additional sections"
              options={VISIBILITY_FIELDS}
              selected={form.visibility}
              onToggle={(value, checked) => toggleArray('visibility', value, checked)}
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Custom questions</p>
              {questions.loading ? (
                <p className="text-xs text-muted-foreground">Loading questions...</p>
              ) : questions.options.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No custom questions yet. Create them under Recruitment → Custom Questions.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {questions.options.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={form.custom_question.includes(option.value)}
                        onCheckedChange={(checked) => toggleArray('custom_question', option.value, checked === true)}
                      />
                      <span>
                        {option.label}
                        {option.raw?.required ? <span className="ml-1 text-xs text-muted-foreground">(required)</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Publishing">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="job-status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger id="job-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-md border px-3 py-2 text-sm">
              <Checkbox
                checked={form.is_featured}
                onCheckedChange={(checked) => setField('is_featured', checked === true)}
              />
              Feature this job
            </label>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/recruitment/job-postings')} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update Job Posting' : 'Create Job Posting'}
          </Button>
        </div>
      </form>
    </PageTemplate>
  );
}
