'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StatCard,
  SectionCard,
  DetailItem,
  Field,
  StatusBadge,
  ErrorBanner,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  CANDIDATE_GENDERS,
  CANDIDATE_STATUS_LABELS,
  GENDER_LABELS,
  formatDate,
  formatMoney,
  fullName,
} from '@/lib/recruitment';
import { ArrowLeft, UserPlus, Briefcase, Banknote, CalendarDays } from 'lucide-react';

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const EMPLOYEE_STATUSES = ['active', 'inactive', 'probation', 'terminated'];

const EMPTY = {
  name: '',
  email: '',
  password: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  employee_status: 'active',
  biometric_emp_id: '',
  branch_id: '',
  department_id: '',
  designation_id: '',
  employment_type: 'Full-time',
  date_of_joining: '',
  salary: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  emergency_contact_name: '',
  relationship: '',
  number: '',
  bank_name: '',
  account_holder_name: '',
  account_number: '',
  bank_identifier_code: '',
  bank_branch: '',
  tax_payer_id: '',
};

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

export default function ConvertCandidatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const branches = useOptionList('/api/branches', 'branches', { status: 'active' });
  const departments = useOptionList('/api/departments', 'departments', { status: 'active' });
  const designations = useOptionList('/api/designations', 'designations', { status: 'active' });

  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/candidates/${id}/convert-to-employee`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load candidate'));
      const json = await res.json();
      const candidate = json.candidate || null;
      setData({ ...json, candidate });

      if (candidate) {
        setForm({
          ...EMPTY,
          name: fullName(candidate),
          email: candidate.email || '',
          phone: candidate.phone || '',
          gender: candidate.gender || '',
          date_of_birth: dateInput(candidate.date_of_birth),
          branch_id: refId(candidate.branch_id),
          department_id: refId(candidate.department_id),
          date_of_joining: new Date().toISOString().slice(0, 10),
          address_line_1: candidate.address || '',
          city: candidate.city || '',
          state: candidate.state || '',
          country: candidate.country || '',
          postal_code: candidate.zip_code || '',
          account_holder_name: fullName(candidate),
          salary: candidate.final_salary || '',
        });
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

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBranchChange(value) {
    setForm((prev) => ({ ...prev, branch_id: value, department_id: '', designation_id: '' }));
  }

  function handleDepartmentChange(value) {
    setForm((prev) => ({ ...prev, department_id: value, designation_id: '' }));
  }

  function buildPayload() {
    const required = [
      ['name', 'full name'],
      ['email', 'email'],
      ['phone', 'phone'],
      ['date_of_birth', 'date of birth'],
      ['gender', 'gender'],
      ['branch_id', 'branch'],
      ['department_id', 'department'],
      ['designation_id', 'designation'],
      ['date_of_joining', 'date of joining'],
      ['employment_type', 'employment type'],
      ['address_line_1', 'address'],
      ['city', 'city'],
      ['state', 'state'],
      ['country', 'country'],
      ['postal_code', 'postal code'],
      ['emergency_contact_name', 'emergency contact name'],
      ['relationship', 'emergency contact relationship'],
      ['number', 'emergency contact number'],
      ['bank_name', 'bank name'],
      ['account_holder_name', 'account holder name'],
      ['account_number', 'account number'],
      ['salary', 'salary'],
    ];

    const missing = required.filter(([key]) => !String(form[key] ?? '').trim()).map(([, label]) => label);
    if (!form.password) missing.unshift('password');
    if (missing.length > 0) {
      throw new Error(`Please provide the ${missing.join(', ')}.`);
    }
    if (form.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    const salary = Number(form.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      throw new Error('Salary must be a valid positive number.');
    }

    const payload = { salary };
    for (const key of Object.keys(EMPTY)) {
      if (key === 'salary') continue;
      const value = form[key];
      if (value !== '' && value !== undefined && value !== null) payload[key] = value;
    }
    return payload;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      const res = await fetch(`/api/recruitment/candidates/${id}/convert-to-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to convert candidate'));
      router.push(`/recruitment/candidates/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageTemplate title="Convert to Employee" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading conversion form...</p>
      </PageTemplate>
    );
  }

  const candidate = data?.candidate;
  const guards = data?.guards || {};

  if (!candidate) {
    return (
      <PageTemplate
        title="Convert to Employee"
        description="Unable to load this candidate"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/candidates') }]}
      >
        <ErrorBanner message={error || 'Candidate not found'} />
      </PageTemplate>
    );
  }

  const blockedReasons = [];
  if (!guards.isHired) {
    blockedReasons.push(
      `Only candidates with the Hired status can be converted (current status: ${CANDIDATE_STATUS_LABELS[candidate.status] || candidate.status}).`
    );
  }
  if (guards.isEmployee) {
    blockedReasons.push('This candidate has already been converted to an employee.');
  }
  if (!guards.hasAcceptedOffer) {
    blockedReasons.push('This candidate needs an accepted offer before they can be converted.');
  }

  return (
    <PageTemplate
      title="Convert to Employee"
      description={`Create an employee record for ${fullName(candidate)}`}
      actions={[
        {
          label: 'Back',
          variant: 'outline',
          icon: <ArrowLeft className="mr-1 h-4 w-4" />,
          onClick: () => router.push(`/recruitment/candidates/${id}`),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Current Status" value={CANDIDATE_STATUS_LABELS[candidate.status] || candidate.status} icon={UserPlus} accent="emerald" />
          <StatCard label="Experience" value={`${candidate.experience_years ?? 0} yrs`} icon={Briefcase} accent="blue" />
          <StatCard label="Final Salary" value={formatMoney(candidate.final_salary)} icon={Banknote} accent="violet" />
          <StatCard label="Applied" value={formatDate(candidate.application_date)} icon={CalendarDays} accent="amber" />
        </div>

        <SectionCard title="Candidate Summary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Name">{fullName(candidate)}</DetailItem>
            <DetailItem label="Email">{candidate.email}</DetailItem>
            <DetailItem label="Phone">{candidate.phone}</DetailItem>
            <DetailItem label="Job Posting">{candidate.job_id?.title}</DetailItem>
            <DetailItem label="Status">
              <StatusBadge status={candidate.status} labels={CANDIDATE_STATUS_LABELS} />
            </DetailItem>
            <DetailItem label="Employee ID">
              {data.generatedEmployeeId ? (
                <span className="font-mono text-xs">{data.generatedEmployeeId}</span>
              ) : null}
            </DetailItem>
          </div>
        </SectionCard>

        {blockedReasons.length > 0 ? (
          <ErrorBanner message={blockedReasons.join(' ')} />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <SectionCard title="Account" description="Login account created for the new employee">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full Name" htmlFor="convert-name" required>
                  <Input
                    id="convert-name"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Email" htmlFor="convert-email" required>
                  <Input
                    id="convert-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Password" htmlFor="convert-password" required hint="At least 8 characters">
                  <Input
                    id="convert-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    required
                    minLength={8}
                  />
                </Field>
                <Field label="Phone" htmlFor="convert-phone" required>
                  <Input
                    id="convert-phone"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Gender" htmlFor="convert-gender" required>
                  <Select
                    value={form.gender || 'none'}
                    onValueChange={(v) => setField('gender', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="convert-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        Select gender
                      </SelectItem>
                      {CANDIDATE_GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender}>
                          {GENDER_LABELS[gender]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date of Birth" htmlFor="convert-dob" required>
                  <Input
                    id="convert-dob"
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setField('date_of_birth', e.target.value)}
                    required
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Employment">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Branch" htmlFor="convert-branch" required>
                  <Select value={form.branch_id || 'none'} onValueChange={handleBranchChange}>
                    <SelectTrigger id="convert-branch">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent searchable>
                      <SelectItem value="none" disabled>
                        Select branch
                      </SelectItem>
                      {branches.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Department" htmlFor="convert-department" required>
                  <Select value={form.department_id || 'none'} onValueChange={handleDepartmentChange}>
                    <SelectTrigger id="convert-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent searchable>
                      <SelectItem value="none" disabled>
                        Select department
                      </SelectItem>
                      {departments.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Designation" htmlFor="convert-designation" required>
                  <Select
                    value={form.designation_id || 'none'}
                    onValueChange={(v) => setField('designation_id', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="convert-designation">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent searchable>
                      <SelectItem value="none" disabled>
                        Select designation
                      </SelectItem>
                      {designations.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Employment Type" htmlFor="convert-employment-type" required>
                  <Select
                    value={form.employment_type}
                    onValueChange={(v) => setField('employment_type', v)}
                  >
                    <SelectTrigger id="convert-employment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Employee Status" htmlFor="convert-employee-status">
                  <Select
                    value={form.employee_status}
                    onValueChange={(v) => setField('employee_status', v)}
                  >
                    <SelectTrigger id="convert-employee-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date of Joining" htmlFor="convert-joining" required>
                  <Input
                    id="convert-joining"
                    type="date"
                    value={form.date_of_joining}
                    onChange={(e) => setField('date_of_joining', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Base Salary" htmlFor="convert-salary" required>
                  <Input
                    id="convert-salary"
                    type="number"
                    min={0}
                    value={form.salary}
                    onChange={(e) => setField('salary', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Biometric Employee Code" htmlFor="convert-biometric" hint="Optional">
                  <Input
                    id="convert-biometric"
                    value={form.biometric_emp_id}
                    onChange={(e) => setField('biometric_emp_id', e.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Address">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Address Line 1" htmlFor="convert-address1" required>
                  <Input
                    id="convert-address1"
                    value={form.address_line_1}
                    onChange={(e) => setField('address_line_1', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Address Line 2" htmlFor="convert-address2">
                  <Input
                    id="convert-address2"
                    value={form.address_line_2}
                    onChange={(e) => setField('address_line_2', e.target.value)}
                  />
                </Field>
                <Field label="City" htmlFor="convert-city" required>
                  <Input
                    id="convert-city"
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    required
                  />
                </Field>
                <Field label="State" htmlFor="convert-state" required>
                  <Input
                    id="convert-state"
                    value={form.state}
                    onChange={(e) => setField('state', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Country" htmlFor="convert-country" required>
                  <Input
                    id="convert-country"
                    value={form.country}
                    onChange={(e) => setField('country', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Postal Code" htmlFor="convert-postal" required>
                  <Input
                    id="convert-postal"
                    value={form.postal_code}
                    onChange={(e) => setField('postal_code', e.target.value)}
                    required
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Emergency Contact">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Contact Name" htmlFor="convert-emergency-name" required>
                  <Input
                    id="convert-emergency-name"
                    value={form.emergency_contact_name}
                    onChange={(e) => setField('emergency_contact_name', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Relationship" htmlFor="convert-emergency-relationship" required>
                  <Input
                    id="convert-emergency-relationship"
                    value={form.relationship}
                    onChange={(e) => setField('relationship', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Contact Number" htmlFor="convert-emergency-number" required>
                  <Input
                    id="convert-emergency-number"
                    value={form.number}
                    onChange={(e) => setField('number', e.target.value)}
                    required
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Banking" description="Payroll details for the new employee">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Bank Name" htmlFor="convert-bank-name" required>
                  <Input
                    id="convert-bank-name"
                    value={form.bank_name}
                    onChange={(e) => setField('bank_name', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Account Holder Name" htmlFor="convert-account-holder" required>
                  <Input
                    id="convert-account-holder"
                    value={form.account_holder_name}
                    onChange={(e) => setField('account_holder_name', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Account Number" htmlFor="convert-account-number" required>
                  <Input
                    id="convert-account-number"
                    value={form.account_number}
                    onChange={(e) => setField('account_number', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Bank Identifier Code" htmlFor="convert-bic" hint="Optional">
                  <Input
                    id="convert-bic"
                    value={form.bank_identifier_code}
                    onChange={(e) => setField('bank_identifier_code', e.target.value)}
                  />
                </Field>
                <Field label="Bank Branch" htmlFor="convert-bank-branch" hint="Optional">
                  <Input
                    id="convert-bank-branch"
                    value={form.bank_branch}
                    onChange={(e) => setField('bank_branch', e.target.value)}
                  />
                </Field>
                <Field label="Tax Payer ID" htmlFor="convert-tax-id" hint="Optional">
                  <Input
                    id="convert-tax-id"
                    value={form.tax_payer_id}
                    onChange={(e) => setField('tax_payer_id', e.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/recruitment/candidates/${id}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Converting...' : 'Convert to Employee'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageTemplate>
  );
}
