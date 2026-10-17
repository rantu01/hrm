'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const STEPS = [
  { key: 'personal', label: 'Personal' },
  { key: 'employment', label: 'Employment' },
  { key: 'contact', label: 'Contact' },
  { key: 'banking', label: 'Banking' },
  { key: 'documents', label: 'Documents' },
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const EMPLOYEE_STATUSES = ['active', 'inactive', 'probation', 'terminated'];
const GENDERS = ['male', 'female', 'other'];

export function emptyEmployeeForm() {
  return {
    name: '',
    biometric_emp_id: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    branch_id: '',
    department_id: '',
    designation_id: '',
    date_of_joining: '',
    employment_type: 'Full-time',
    employee_status: 'active',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: '',
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    bank_identifier_code: '',
    bank_branch: '',
    tax_payer_id: '',
    base_salary: '',
    profile_image: '',
    documents: [],
  };
}

export function employeeFromApi(emp) {
  const base = emptyEmployeeForm();
  if (!emp) return base;
  const idOf = (v) => {
    if (!v) return '';
    if (typeof v === 'object') return String(v._id || '');
    return String(v);
  };
  const dateOf = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };
  return {
    ...base,
    name: emp.name || '',
    biometric_emp_id: emp.biometric_emp_id || '',
    email: emp.email || '',
    phone: emp.phone || '',
    date_of_birth: dateOf(emp.date_of_birth),
    gender: emp.gender || '',
    branch_id: idOf(emp.branch_id),
    department_id: idOf(emp.department_id),
    designation_id: idOf(emp.designation_id),
    date_of_joining: dateOf(emp.date_of_joining),
    employment_type: emp.employment_type || 'Full-time',
    employee_status: emp.employee_status || 'active',
    address_line_1: emp.address_line_1 || '',
    address_line_2: emp.address_line_2 || '',
    city: emp.city || '',
    state: emp.state || '',
    country: emp.country || '',
    postal_code: emp.postal_code || '',
    emergency_contact_name: emp.emergency_contact_name || '',
    emergency_contact_relationship: emp.emergency_contact_relationship || '',
    emergency_contact_number: emp.emergency_contact_number || '',
    bank_name: emp.bank_name || '',
    account_holder_name: emp.account_holder_name || '',
    account_number: emp.account_number || '',
    bank_identifier_code: emp.bank_identifier_code || '',
    bank_branch: emp.bank_branch || '',
    tax_payer_id: emp.tax_payer_id || '',
    base_salary: emp.base_salary ?? '',
    profile_image: emp.profile_image || '',
    password: '',
    documents: [],
  };
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export default function EmployeeWizard({ mode = 'create', initialData, onSubmit, submitting, serverError }) {
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState(initialData || emptyEmployeeForm());
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialData) setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [b, d, g] = await Promise.all([
          fetch('/api/branches?limit=100', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/departments?limit=100', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/designations?limit=100', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
        ]);
        if (cancelled) return;
        setBranches(Array.isArray(b.branches) ? b.branches : []);
        setDepartments(Array.isArray(d.departments) ? d.departments : []);
        setDesignations(Array.isArray(g.designations) ? g.designations : []);
      } catch {
        if (!cancelled) {
          setBranches([]);
          setDepartments([]);
          setDesignations([]);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const parentIdOf = (item, key) => {
    const v = item?.[key];
    if (!v) return '';
    if (typeof v === 'object') return String(v._id || v.id || '');
    return String(v);
  };

  const filteredDepartments = formData.branch_id
    ? departments.filter((d) => parentIdOf(d, 'branch') === String(formData.branch_id))
    : departments;
  const filteredDesignations = formData.department_id
    ? designations.filter((d) => parentIdOf(d, 'department') === String(formData.department_id))
    : designations;

  function handleChange(name, value) {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'branch_id') {
        next.department_id = '';
        next.designation_id = '';
      }
      if (name === 'department_id') {
        next.designation_id = '';
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleDocumentChange(index, field, value) {
    setFormData((prev) => {
      const docs = [...(prev.documents || [])];
      docs[index] = { ...docs[index], [field]: value };
      return { ...prev, documents: docs };
    });
  }

  function addDocument() {
    setFormData((prev) => ({
      ...prev,
      documents: [...(prev.documents || []), { document_type: '', file: '', expiry_date: '' }],
    }));
  }

  function removeDocument(index) {
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index),
    }));
  }

  function validateStep(s) {
    const e = {};
    const f = formData;
    if (s === 0) {
      if (!f.name.trim()) e.name = 'Full name is required';
      if (!f.email.trim()) e.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Please provide a valid email';
      if (!isEdit && f.password && f.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (isEdit && f.password && f.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (!f.phone.trim()) e.phone = 'Phone is required';
      if (!f.date_of_birth) e.date_of_birth = 'Date of birth is required';
      if (!f.gender) e.gender = 'Gender is required';
    }
    if (s === 1) {
      if (!f.branch_id) e.branch_id = 'Branch is required';
      if (!f.department_id) e.department_id = 'Department is required';
      if (!f.designation_id) e.designation_id = 'Designation is required';
      if (!f.date_of_joining) e.date_of_joining = 'Date of joining is required';
      if (!f.employment_type) e.employment_type = 'Employment type is required';
      if (!f.employee_status) e.employee_status = 'Employee status is required';
    }
    if (s === 2) {
      if (!f.address_line_1.trim()) e.address_line_1 = 'Address is required';
      if (!f.city.trim()) e.city = 'City is required';
      if (!f.state.trim()) e.state = 'State is required';
      if (!f.country.trim()) e.country = 'Country is required';
      if (!f.postal_code.trim()) e.postal_code = 'Postal code is required';
      if (!f.emergency_contact_name.trim()) e.emergency_contact_name = 'Emergency contact name is required';
      if (!f.emergency_contact_relationship.trim()) e.emergency_contact_relationship = 'Relationship is required';
      if (!f.emergency_contact_number.trim()) e.emergency_contact_number = 'Emergency contact phone is required';
    }
    if (s === 3) {
      if (!f.bank_name.trim()) e.bank_name = 'Bank name is required';
    }
    if (s === 4) {
      (f.documents || []).forEach((d, i) => {
        if (!d.document_type.trim()) e[`documents.${i}.document_type`] = 'Document type is required';
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (validateStep(currentStep)) setCurrentStep((s) => s + 1);
  }

  function handleFinish() {
    if (!validateStep(4)) return;
    const payload = { ...formData };
    // Omit blank optionals so the API doesn't trip on empty casts
    for (const k of Object.keys(payload)) {
      if (payload[k] === '') delete payload[k];
    }
    if (payload.base_salary !== undefined && payload.base_salary !== null) {
      const n = Number(payload.base_salary);
      if (!Number.isNaN(n)) payload.base_salary = n;
    }
    payload.documents = (formData.documents || [])
      .filter((d) => d.document_type && d.document_type.trim())
      .map((d) => ({
        document_type: d.document_type.trim(),
        file: d.file?.trim() || undefined,
        expiry_date: d.expiry_date || undefined,
      }));
    onSubmit(payload);
  }

  const stepFields = [
    ['name', 'email', 'password', 'phone', 'date_of_birth', 'gender'],
    ['branch_id', 'department_id', 'designation_id', 'date_of_joining', 'employment_type', 'employee_status'],
    ['address_line_1', 'city', 'state', 'country', 'postal_code', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_number'],
    ['bank_name'],
    [],
  ];
  const stepHasError = (i) => (stepFields[i] || []).some((f) => errors[f]);

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const hasErr = stepHasError(i);
          return (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    hasErr
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : active
                          ? 'border-primary bg-background text-primary'
                          : 'border-muted bg-background text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-sm font-medium ${hasErr ? 'text-destructive' : active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-3 h-px min-w-[20px] flex-1 ${done ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          );
        })}
      </div>

      {serverError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" required>Full Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. John Doe" />
              <FieldError message={errors.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" required>Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="e.g. john@example.com" />
              <FieldError message={errors.email} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password{isEdit ? ' (optional)' : ' (optional)'}</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters for login access'} />
              <FieldError message={errors.password} />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Leave blank to keep the current login password. A new password updates the linked login account.'
                  : 'Optional. When provided, a login account is created for this employee.'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="biometric_emp_id">Biometric Employee ID</Label>
              <Input id="biometric_emp_id" value={formData.biometric_emp_id} onChange={(e) => handleChange('biometric_emp_id', e.target.value)} placeholder="e.g. EMP001" />
              <p className="text-xs text-muted-foreground">Used to map the employee with a biometric device.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone" required>Phone Number</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="e.g. +1 234 567 8900" />
              <FieldError message={errors.phone} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_of_birth" required>Date of Birth</Label>
              <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
              <FieldError message={errors.date_of_birth} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender" required>Gender</Label>
              <Select value={formData.gender || '__none'} onValueChange={(v) => handleChange('gender', v === '__none' ? '' : v)}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select gender</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.gender} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile_image">Profile Image URL</Label>
              <Input id="profile_image" value={formData.profile_image} onChange={(e) => handleChange('profile_image', e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branch_id" required>Branch</Label>
              <Select value={formData.branch_id || '__none'} onValueChange={(v) => handleChange('branch_id', v === '__none' ? '' : v)}>
                <SelectTrigger id="branch_id">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="__none">Select branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={String(b._id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.branch_id} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department_id" required>Department</Label>
              <Select value={formData.department_id || '__none'} onValueChange={(v) => handleChange('department_id', v === '__none' ? '' : v)} disabled={!formData.branch_id}>
                <SelectTrigger id="department_id">
                  <SelectValue placeholder={formData.branch_id ? 'Select department' : 'Select branch first'} />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="__none">Select department</SelectItem>
                  {filteredDepartments.map((d) => (
                    <SelectItem key={d._id} value={String(d._id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.department_id} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="designation_id" required>Designation</Label>
              <Select value={formData.designation_id || '__none'} onValueChange={(v) => handleChange('designation_id', v === '__none' ? '' : v)} disabled={!formData.department_id}>
                <SelectTrigger id="designation_id">
                  <SelectValue placeholder={formData.department_id ? 'Select designation' : 'Select department first'} />
                </SelectTrigger>
                <SelectContent searchable>
                  <SelectItem value="__none">Select designation</SelectItem>
                  {filteredDesignations.map((d) => (
                    <SelectItem key={d._id} value={String(d._id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.designation_id} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_of_joining" required>Date of Joining</Label>
              <Input id="date_of_joining" type="date" value={formData.date_of_joining} onChange={(e) => handleChange('date_of_joining', e.target.value)} />
              <FieldError message={errors.date_of_joining} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employment_type" required>Employment Type</Label>
              <Select value={formData.employment_type} onValueChange={(v) => handleChange('employment_type', v)}>
                <SelectTrigger id="employment_type">
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.employment_type} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employee_status" required>Employee Status</Label>
              <Select value={formData.employee_status} onValueChange={(v) => handleChange('employee_status', v)}>
                <SelectTrigger id="employee_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.employee_status} />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address_line_1" required>Address Line 1</Label>
                <Input id="address_line_1" value={formData.address_line_1} onChange={(e) => handleChange('address_line_1', e.target.value)} placeholder="e.g. 123 Main Street" />
                <FieldError message={errors.address_line_1} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address_line_2">Address Line 2</Label>
                <Input id="address_line_2" value={formData.address_line_2} onChange={(e) => handleChange('address_line_2', e.target.value)} placeholder="Apartment, floor, building" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city" required>City</Label>
                <Input id="city" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="e.g. New York" />
                <FieldError message={errors.city} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state" required>State</Label>
                <Input id="state" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="e.g. California" />
                <FieldError message={errors.state} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country" required>Country</Label>
                <Input id="country" value={formData.country} onChange={(e) => handleChange('country', e.target.value)} placeholder="e.g. United States" />
                <FieldError message={errors.country} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postal_code" required>Postal Code</Label>
                <Input id="postal_code" value={formData.postal_code} onChange={(e) => handleChange('postal_code', e.target.value)} placeholder="e.g. 10001" />
                <FieldError message={errors.postal_code} />
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="mb-4 text-base font-medium">Emergency Contact</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="emergency_contact_name" required>Name</Label>
                  <Input id="emergency_contact_name" value={formData.emergency_contact_name} onChange={(e) => handleChange('emergency_contact_name', e.target.value)} placeholder="e.g. Jane Doe" />
                  <FieldError message={errors.emergency_contact_name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="emergency_contact_relationship" required>Relationship</Label>
                  <Input id="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={(e) => handleChange('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse" />
                  <FieldError message={errors.emergency_contact_relationship} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="emergency_contact_number" required>Phone Number</Label>
                  <Input id="emergency_contact_number" value={formData.emergency_contact_number} onChange={(e) => handleChange('emergency_contact_number', e.target.value)} placeholder="e.g. +1 234 567 8900" />
                  <FieldError message={errors.emergency_contact_number} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Banking Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank_name" required>Bank Name</Label>
              <Input id="bank_name" value={formData.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)} placeholder="e.g. Bank of America" />
              <FieldError message={errors.bank_name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account_holder_name">Account Holder Name</Label>
              <Input id="account_holder_name" value={formData.account_holder_name} onChange={(e) => handleChange('account_holder_name', e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account_number">Account Number</Label>
              <Input id="account_number" value={formData.account_number} onChange={(e) => handleChange('account_number', e.target.value)} placeholder="e.g. 1234567890" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank_identifier_code">Bank Identifier Code (BIC/SWIFT)</Label>
              <Input id="bank_identifier_code" value={formData.bank_identifier_code} onChange={(e) => handleChange('bank_identifier_code', e.target.value)} placeholder="e.g. BOFAUS3N" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank_branch">Bank Branch</Label>
              <Input id="bank_branch" value={formData.bank_branch} onChange={(e) => handleChange('bank_branch', e.target.value)} placeholder="e.g. New York Main Branch" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax_payer_id">Tax Payer ID</Label>
              <Input id="tax_payer_id" value={formData.tax_payer_id} onChange={(e) => handleChange('tax_payer_id', e.target.value)} placeholder="e.g. 123-45-6789" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="base_salary">Base Salary</Label>
              <Input id="base_salary" type="number" step="0.01" value={formData.base_salary} onChange={(e) => handleChange('base_salary', e.target.value)} placeholder="e.g. 5000.00" />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents (optional)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(formData.documents || []).map((doc, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Document #{i + 1}</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDocument(i)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`doc-type-${i}`} required>Document Type</Label>
                    <Input id={`doc-type-${i}`} value={doc.document_type} onChange={(e) => handleDocumentChange(i, 'document_type', e.target.value)} placeholder="e.g. Passport, ID Card" />
                    <FieldError message={errors[`documents.${i}.document_type`]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`doc-file-${i}`}>File URL</Label>
                    <Input id={`doc-file-${i}`} value={doc.file} onChange={(e) => handleDocumentChange(i, 'file', e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`doc-expiry-${i}`}>Expiry Date</Label>
                    <Input id={`doc-expiry-${i}`} type="date" value={doc.expiry_date} onChange={(e) => handleDocumentChange(i, 'expiry_date', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" onClick={addDocument}>
                Add Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>
          Back
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handleFinish} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
          </Button>
        )}
      </div>
    </div>
  );
}
