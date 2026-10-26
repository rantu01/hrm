'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  RatingStars,
  RatingSelect,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  CANDIDATE_GENDERS,
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABELS,
  GENDER_LABELS,
  formatDate,
  fullName,
  parseList,
} from '@/lib/recruitment';
import { Users, Sparkles, Workflow, UserCheck, LayoutGrid, Plus } from 'lucide-react';

const PIPELINE_STATUSES = ['Screening', 'Interview', 'Offer'];

const emptyForm = {
  job_id: '',
  source_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  current_company: '',
  current_position: '',
  experience_years: '',
  current_salary: '',
  expected_salary: '',
  notice_period: '',
  skills: '',
  branch_id: '',
  department_id: '',
  referral_employee_id: '',
  resume_url: '',
  portfolio_url: '',
  linkedin_url: '',
  application_date: '',
  coverletter_message: '',
  rating: '',
  status: 'New',
};

const NUMERIC_FIELDS = ['experience_years', 'current_salary', 'expected_salary', 'notice_period'];

function dateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function refId(value) {
  if (!value) return '';
  return typeof value === 'object' ? value._id || '' : value;
}

function toForm(candidate) {
  if (!candidate) return { ...emptyForm };
  return {
    ...emptyForm,
    job_id: refId(candidate.job_id),
    source_id: refId(candidate.source_id),
    branch_id: refId(candidate.branch_id),
    department_id: refId(candidate.department_id),
    referral_employee_id: refId(candidate.referral_employee_id),
    first_name: candidate.first_name || '',
    last_name: candidate.last_name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    gender: candidate.gender || '',
    date_of_birth: dateInput(candidate.date_of_birth),
    current_company: candidate.current_company || '',
    current_position: candidate.current_position || '',
    experience_years: candidate.experience_years ?? '',
    current_salary: candidate.current_salary ?? '',
    expected_salary: candidate.expected_salary ?? '',
    notice_period: candidate.notice_period ?? '',
    skills: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : '',
    resume_url: candidate.resume_url || '',
    portfolio_url: candidate.portfolio_url || '',
    linkedin_url: candidate.linkedin_url || '',
    application_date: dateInput(candidate.application_date),
    coverletter_message: candidate.coverletter_message || '',
    rating: candidate.rating ? candidate.rating : '',
    status: candidate.status || 'New',
  };
}

export default function CandidatesPage() {
  const router = useRouter();
  const list = useRecruitmentList('/api/recruitment/candidates', 'candidates', {
    initialFilters: { status: '' },
  });

  const jobPostings = useOptionList('/api/recruitment/job-postings', 'jobPostings');
  const sources = useOptionList('/api/recruitment/candidate-sources', 'candidateSources', { status: 'active' });
  const branches = useOptionList('/api/branches', 'branches', { status: 'active' });
  const departments = useOptionList('/api/departments', 'departments', { status: 'active' });
  const users = useOptionList('/api/recruitment/users', 'users');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(null);

  const counts = list.statusCounts || {};
  const inPipeline = PIPELINE_STATUSES.reduce((total, status) => total + (counts[status] || 0), 0);
  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError('');
    setShowModal(true);
  }

  function openEdit(candidate) {
    setEditing(candidate);
    setForm(toForm(candidate));
    setFormError('');
    setShowModal(true);
  }

  function buildPayload() {
    const missing = [];
    if (!form.first_name.trim()) missing.push('first name');
    if (!form.last_name.trim()) missing.push('last name');
    if (!form.email.trim()) missing.push('email');
    if (!form.job_id) missing.push('job posting');
    if (missing.length > 0) {
      throw new Error(`Please provide the ${missing.join(', ')}.`);
    }

    const payload = {};
    for (const key of [
      'job_id',
      'source_id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'gender',
      'date_of_birth',
      'current_company',
      'current_position',
      'branch_id',
      'department_id',
      'referral_employee_id',
      'resume_url',
      'portfolio_url',
      'linkedin_url',
      'application_date',
      'coverletter_message',
      'status',
    ]) {
      const value = form[key];
      if (value !== '' && value !== undefined && value !== null) payload[key] = value;
    }

    for (const key of NUMERIC_FIELDS) {
      const value = form[key];
      if (value === '' || value === undefined || value === null) continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        throw new Error(`${key.replace(/_/g, ' ')} must be a valid positive number.`);
      }
      payload[key] = numeric;
    }

    if (form.rating !== '' && form.rating !== undefined && form.rating !== null) {
      payload.rating = Number(form.rating);
    }

    payload.skills = parseList(form.skills);
    return payload;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setError('');
    setSuccess('');
    try {
      const payload = buildPayload();
      const isEdit = Boolean(editing);
      const res = await fetch(isEdit ? `/api/recruitment/candidates/${editing._id}` : '/api/recruitment/candidates', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save candidate'));
      setShowModal(false);
      setSuccess(isEdit ? 'Candidate updated successfully.' : 'Candidate added successfully.');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(candidate) {
    if (!window.confirm(`Delete candidate "${fullName(candidate)}"? This cannot be undone.`)) return;
    setDeleting(candidate._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidate._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete candidate'));
      setSuccess('Candidate deleted successfully.');
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <PageTemplate
      title="Candidates"
      description="Track applicants through every stage of the hiring pipeline"
      actions={[
        {
          label: 'Kanban View',
          variant: 'outline',
          icon: <LayoutGrid className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/candidates/kanban'),
        },
        {
          label: 'Add Candidate',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: openCreate,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Candidates" value={counts.all ?? 0} icon={Users} accent="blue" />
          <StatCard label="New" value={counts.New ?? 0} icon={Sparkles} accent="slate" />
          <StatCard label="In Pipeline" value={inPipeline} icon={Workflow} accent="amber" hint="Screening, Interview & Offer" />
          <StatCard label="Hired" value={counts.Hired ?? 0} icon={UserCheck} accent="emerald" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or email..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search candidates"
          />
          <FilterSelect
            placeholder="All Jobs"
            ariaLabel="Filter by job posting"
            value={list.filters.job_id}
            onValueChange={(v) => list.setFilter('job_id', v)}
            options={jobPostings.options}
            className="w-[220px]"
          />
          <FilterSelect
            placeholder="All Sources"
            ariaLabel="Filter by source"
            value={list.filters.source_id}
            onValueChange={(v) => list.setFilter('source_id', v)}
            options={sources.options}
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
            ...CANDIDATE_STATUSES.map((status) => ({
              value: status,
              label: CANDIDATE_STATUS_LABELS[status] || status,
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
        {error ? <ErrorBanner message={error} /> : null}
        {list.error ? <ErrorBanner message={list.error} /> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={8} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={8} label="No candidates found. Add a candidate to start building your pipeline." />
              ) : (
                list.items.map((candidate) => (
                  <TableRow key={candidate._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="w-fit text-left font-medium hover:underline"
                          onClick={() => router.push(`/recruitment/candidates/${candidate._id}`)}
                        >
                          {fullName(candidate)}
                        </button>
                        <span className="text-xs text-muted-foreground">{candidate.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{candidate.job_id?.title || '—'}</span>
                        {candidate.job_id?.job_code ? (
                          <span className="text-xs text-muted-foreground">{candidate.job_id.job_code}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{candidate.source_id?.name || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.experience_years ?? 0} yrs</TableCell>
                    <TableCell>
                      <RatingStars value={candidate.rating} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(candidate.application_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={candidate.status} labels={CANDIDATE_STATUS_LABELS} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/recruitment/candidates/${candidate._id}`)}
                        >
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(candidate)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleting === candidate._id}
                          onClick={() => handleDelete(candidate)}
                        >
                          {deleting === candidate._id ? 'Deleting...' : 'Delete'}
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
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Candidate' : 'Add Candidate'}
        description={editing ? `Updating "${fullName(editing)}"` : 'Add a new applicant to the hiring pipeline'}
        size="xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="candidate-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Candidate' : 'Create Candidate'}
            </Button>
          </>
        }
      >
        <form id="candidate-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {formError ? <ErrorBanner message={formError} /> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First Name" htmlFor="cand-first-name" required>
              <Input
                id="cand-first-name"
                value={form.first_name}
                onChange={(e) => setField('first_name', e.target.value)}
                required
                placeholder="e.g. Jane"
              />
            </Field>
            <Field label="Last Name" htmlFor="cand-last-name" required>
              <Input
                id="cand-last-name"
                value={form.last_name}
                onChange={(e) => setField('last_name', e.target.value)}
                required
                placeholder="e.g. Doe"
              />
            </Field>
            <Field label="Email" htmlFor="cand-email" required>
              <Input
                id="cand-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                placeholder="name@example.com"
              />
            </Field>
            <Field label="Phone" htmlFor="cand-phone">
              <Input id="cand-phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </Field>
            <Field label="Gender" htmlFor="cand-gender">
              <Select
                value={form.gender || 'none'}
                onValueChange={(v) => setField('gender', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="cand-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {CANDIDATE_GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {GENDER_LABELS[gender]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of Birth" htmlFor="cand-dob">
              <Input
                id="cand-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setField('date_of_birth', e.target.value)}
              />
            </Field>
            <Field label="Job Posting" htmlFor="cand-job" required>
              <Select value={form.job_id || 'none'} onValueChange={(v) => setField('job_id', v === 'none' ? '' : v)}>
                <SelectTrigger id="cand-job">
                  <SelectValue placeholder="Select a job posting" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Select a job...</SelectItem>
                  {jobPostings.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.raw?.job_code ? `${option.raw.job_code} - ${option.label}` : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source" htmlFor="cand-source">
              <Select
                value={form.source_id || 'none'}
                onValueChange={(v) => setField('source_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="cand-source">
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Not specified</SelectItem>
                  {sources.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch" htmlFor="cand-branch">
              <Select
                value={form.branch_id || 'none'}
                onValueChange={(v) => setField('branch_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="cand-branch">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Not specified</SelectItem>
                  {branches.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department" htmlFor="cand-department">
              <Select
                value={form.department_id || 'none'}
                onValueChange={(v) => setField('department_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="cand-department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Not specified</SelectItem>
                  {departments.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Referred By" htmlFor="cand-referral" hint="Existing employee who referred this candidate">
              <Select
                value={form.referral_employee_id || 'none'}
                onValueChange={(v) => setField('referral_employee_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="cand-referral">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="none">Not referred</SelectItem>
                  {users.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Application Date" htmlFor="cand-applied">
              <Input
                id="cand-applied"
                type="date"
                value={form.application_date}
                onChange={(e) => setField('application_date', e.target.value)}
              />
            </Field>
            <Field label="Current Company" htmlFor="cand-company">
              <Input
                id="cand-company"
                value={form.current_company}
                onChange={(e) => setField('current_company', e.target.value)}
              />
            </Field>
            <Field label="Current Position" htmlFor="cand-position">
              <Input
                id="cand-position"
                value={form.current_position}
                onChange={(e) => setField('current_position', e.target.value)}
              />
            </Field>
            <Field label="Experience (years)" htmlFor="cand-experience">
              <Input
                id="cand-experience"
                type="number"
                min={0}
                step="0.5"
                value={form.experience_years}
                onChange={(e) => setField('experience_years', e.target.value)}
              />
            </Field>
            <Field label="Notice Period (days)" htmlFor="cand-notice">
              <Input
                id="cand-notice"
                type="number"
                min={0}
                value={form.notice_period}
                onChange={(e) => setField('notice_period', e.target.value)}
              />
            </Field>
            <Field label="Current Salary" htmlFor="cand-current-salary">
              <Input
                id="cand-current-salary"
                type="number"
                min={0}
                value={form.current_salary}
                onChange={(e) => setField('current_salary', e.target.value)}
              />
            </Field>
            <Field label="Expected Salary" htmlFor="cand-expected-salary">
              <Input
                id="cand-expected-salary"
                type="number"
                min={0}
                value={form.expected_salary}
                onChange={(e) => setField('expected_salary', e.target.value)}
              />
            </Field>
            <Field label="Resume URL" htmlFor="cand-resume">
              <Input
                id="cand-resume"
                value={form.resume_url}
                onChange={(e) => setField('resume_url', e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Portfolio URL" htmlFor="cand-portfolio">
              <Input
                id="cand-portfolio"
                value={form.portfolio_url}
                onChange={(e) => setField('portfolio_url', e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="LinkedIn URL" htmlFor="cand-linkedin">
              <Input
                id="cand-linkedin"
                value={form.linkedin_url}
                onChange={(e) => setField('linkedin_url', e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Rating" htmlFor="cand-rating">
              <RatingSelect id="cand-rating" value={form.rating} onValueChange={(v) => setField('rating', v)} />
            </Field>
            <Field label="Status" htmlFor="cand-status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger id="cand-status">
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
            </Field>
          </div>

          <Field label="Skills" htmlFor="cand-skills" hint="Separate skills with commas">
            <Input
              id="cand-skills"
              value={form.skills}
              onChange={(e) => setField('skills', e.target.value)}
              placeholder="React, Node.js, Communication"
            />
          </Field>

          <Field label="Cover Letter" htmlFor="cand-cover-letter">
            <Textarea
              id="cand-cover-letter"
              rows={4}
              value={form.coverletter_message}
              onChange={(e) => setField('coverletter_message', e.target.value)}
              placeholder="Motivation, availability and relevant experience..."
            />
          </Field>
        </form>
      </Modal>
    </PageTemplate>
  );
}
