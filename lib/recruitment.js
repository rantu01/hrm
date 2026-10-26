// Shared, client-safe constants and small helpers for the Recruitment module.
// Mirrors the reference (Laravel) HRM recruitment module enums and labels.
// Keep this file free of server-only imports (no mongoose / auth) so it can be
// imported from 'use client' components as well as API routes.

// ---------------------------------------------------------------------------
// Master data statuses (all lookup tables use active/inactive)
// ---------------------------------------------------------------------------
export const ACTIVE_STATUSES = ['active', 'inactive'];
export const ACTIVE_STATUS_LABELS = { active: 'Active', inactive: 'Inactive' };

// ---------------------------------------------------------------------------
// Job Postings
// ---------------------------------------------------------------------------
export const JOB_STATUSES = ['Draft', 'Published', 'Closed'];
export const JOB_STATUS_LABELS = { Draft: 'Draft', Published: 'Published', Closed: 'Closed' };
export const JOB_PRIORITIES = ['Low', 'Medium', 'High'];
export const APPLICATION_TYPES = ['existing', 'custom'];
// applicant[] config checkboxes on a job posting
export const APPLICANT_FIELDS = [
  { value: 'gender', label: 'Gender' },
  { value: 'date_of_birth', label: 'Date of Birth' },
];
// visibility[] config checkboxes on a job posting
export const VISIBILITY_FIELDS = [
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'terms_and_conditions', label: 'Terms & Conditions' },
];

// ---------------------------------------------------------------------------
// Candidates (a candidate IS an application in the reference architecture)
// ---------------------------------------------------------------------------
export const CANDIDATE_STATUSES = ['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
export const CANDIDATE_STATUS_LABELS = {
  New: 'New',
  Screening: 'Screening',
  Interview: 'Interview',
  Offer: 'Offer',
  Hired: 'Hired',
  Rejected: 'Rejected',
};
export const CANDIDATE_GENDERS = ['male', 'female', 'other'];
export const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' };

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------
export const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'No-show'];
export const INTERVIEW_STATUS_LABELS = {
  Scheduled: 'Scheduled',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  'No-show': 'No-show',
};
export const INTERVIEW_MIN_DURATION = 15;
export const INTERVIEW_MAX_DURATION = 480;

// Interview feedback
export const FEEDBACK_RECOMMENDATIONS = ['Strong Hire', 'Hire', 'Maybe', 'Reject', 'Strong Reject'];
export const RECOMMENDATION_LABELS = {
  'Strong Hire': 'Strong Hire',
  Hire: 'Hire',
  Maybe: 'Maybe',
  Reject: 'Reject',
  'Strong Reject': 'Strong Reject',
};

// ---------------------------------------------------------------------------
// Candidate assessments
// ---------------------------------------------------------------------------
export const ASSESSMENT_STATUSES = ['Pass', 'Fail', 'Pending'];
export const ASSESSMENT_STATUS_LABELS = { Pass: 'Pass', Fail: 'Fail', Pending: 'Pending' };

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
export const OFFER_STATUSES = ['Draft', 'Sent', 'Accepted', 'Negotiating', 'Declined', 'Expired'];
export const OFFER_STATUS_LABELS = {
  Draft: 'Draft',
  Sent: 'Sent',
  Accepted: 'Accepted',
  Negotiating: 'Negotiating',
  Declined: 'Declined',
  Expired: 'Expired',
};

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
export const CHECKLIST_CATEGORIES = ['Documentation', 'IT Setup', 'Training', 'HR', 'Facilities', 'Other'];
export const CHECKLIST_CATEGORY_LABELS = Object.fromEntries(CHECKLIST_CATEGORIES.map((c) => [c, c]));
export const ONBOARDING_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const ONBOARDING_STATUS_LABELS = {
  Pending: 'Pending',
  'In Progress': 'In Progress',
  Completed: 'Completed',
};

// ---------------------------------------------------------------------------
// Badge colour maps (match the reference palette)
// ---------------------------------------------------------------------------
export const STATUS_COLORS = {
  // master data
  active: 'success',
  inactive: 'destructive',
  // job postings
  Draft: 'secondary',
  Published: 'success',
  Closed: 'destructive',
  // priorities
  Low: 'outline',
  Medium: 'secondary',
  High: 'destructive',
  // candidates
  New: 'default',
  Screening: 'secondary',
  Interview: 'default',
  Offer: 'secondary',
  Hired: 'success',
  Rejected: 'destructive',
  // interviews
  Scheduled: 'default',
  Completed: 'success',
  Cancelled: 'destructive',
  'No-show': 'secondary',
  // feedback recommendations
  'Strong Hire': 'success',
  Hire: 'default',
  Maybe: 'secondary',
  Reject: 'destructive',
  'Strong Reject': 'destructive',
  // assessments
  Pass: 'success',
  Fail: 'destructive',
  Pending: 'secondary',
  // offers
  Draft: 'outline',
  Sent: 'default',
  Negotiating: 'secondary',
  Expired: 'secondary',
  // onboarding
  'In Progress': 'default',
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
export function labelize(value, labels = {}) {
  if (!value && value !== 0) return '—';
  if (labels[value]) return labels[value];
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function badgeVariantFor(value) {
  return STATUS_COLORS[value] || 'outline';
}

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

export function formatTime(value) {
  if (!value) return '—';
  // Accepts "HH:MM", "HH:MM:SS" or a Date-ish string
  const raw = String(value);
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const d = new Date();
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return formatDate(value, { withTime: true });
}

export function formatMoney(value, currency = 'USD') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${currency} ${n.toLocaleString()}`;
}

export function formatSalaryRange(job, currency = 'USD') {
  const min = Number(job?.min_salary);
  const max = Number(job?.max_salary);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;
  const fmt = (n) => n.toLocaleString();
  if (hasMin && hasMax) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (hasMin) return `${currency} ${fmt(min)}+`;
  if (hasMax) return `Up to ${currency} ${fmt(max)}`;
  return 'Not specified';
}

export function initialsOf(name) {
  if (!name) return '?';
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function fullName(candidate) {
  if (!candidate) return '—';
  if (candidate.first_name || candidate.last_name) {
    return [candidate.first_name, candidate.last_name].filter(Boolean).join(' ');
  }
  return candidate.name || '—';
}

/** Parse a comma separated skills string / array into a clean array. */
export function parseList(value, max = 50) {
  let list = [];
  if (Array.isArray(value)) list = value;
  else if (typeof value === 'string') list = value.split(',');
  else if (value !== undefined && value !== null) list = [value];
  return [...new Set(list.map((v) => String(v ?? '').trim()).filter((v) => v.length > 0))].slice(0, max);
}

/** Days until a deadline (negative = past). */
export function daysUntil(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Offer templates support {{variable}} placeholders. */
export function extractTemplateVariables(content) {
  const matches = String(content || '').match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}\s]/g, '')))];
}

export function renderTemplate(content, variables = {}) {
  return String(content || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, name) =>
    variables[name] !== undefined && variables[name] !== null && variables[name] !== ''
      ? String(variables[name])
      : full
  );
}
