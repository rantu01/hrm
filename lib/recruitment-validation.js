// Shared validation rules and small helpers for the Recruitment module's
// complex API routes (candidates, interviews, feedback, assessments, offers,
// onboarding). Server-only: imports mongoose models — keep out of client code.
import Branch from '@/lib/models/Branch';
import Candidate from '@/lib/models/Candidate';
import Department from '@/lib/models/Department';
import Employee from '@/lib/models/Employee';
import InterviewRound from '@/lib/models/InterviewRound';
import InterviewType from '@/lib/models/InterviewType';
import JobCategory from '@/lib/models/JobCategory';
import JobLocation from '@/lib/models/JobLocation';
import JobPosting from '@/lib/models/JobPosting';
import JobType from '@/lib/models/JobType';
import CandidateSource from '@/lib/models/CandidateSource';
import OnboardingChecklist from '@/lib/models/OnboardingChecklist';
import User from '@/lib/models/User';
import { isValidId, normalizeStringArray, sanitize } from '@/lib/recruitment-server';
import {
  ASSESSMENT_STATUSES,
  CANDIDATE_GENDERS,
  CANDIDATE_STATUSES,
  FEEDBACK_RECOMMENDATIONS,
  INTERVIEW_STATUSES,
  JOB_PRIORITIES,
  JOB_STATUSES,
  OFFER_STATUSES,
  ONBOARDING_STATUSES,
} from '@/lib/recruitment';

/** Shape an entry for the `{ errors }` 400 response (express-validator style). */
export function fieldError(path, msg, value) {
  return { type: 'field', value: value === undefined ? '' : value, msg, path, location: 'body' };
}

/**
 * Check that a referenced document id is a valid ObjectId that exists.
 * Returns the error message, or null when the value is acceptable. Optional
 * values (undefined / null / '') pass unless `required` is set.
 */
export async function refError(value, Model, message, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? message : null;
  }
  if (!isValidId(value)) return message;
  const exists = await Model.exists({ _id: value });
  return exists ? null : message;
}

/** 'yyyy-mm-dd' in server-local time (for day-granularity date comparisons). */
export function localDateStr(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Day-granularity ">=" comparison of an ISO date value against today or
 * another yyyy-mm-dd string. Compares the raw yyyy-mm-dd prefix so date-only
 * strings are not shifted by timezone parsing.
 */
export function isOnOrAfter(value, reference) {
  const given = String(value ?? '').slice(0, 10);
  const ref = String(reference ?? '').slice(0, 10);
  return given >= ref;
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
export const CANDIDATE_RULES = [
  { field: 'job_id', optional: true, messages: { required: 'Job posting is required' } },
  { field: 'source_id', optional: true },
  {
    field: 'first_name',
    required: true,
    trim: true,
    maxLength: 100,
    messages: { required: 'First name is required' },
  },
  { field: 'last_name', optional: true, trim: true, maxLength: 100 },
  {
    field: 'email',
    required: true,
    isEmail: true,
    normalizeEmail: true,
    messages: { required: 'Email is required', isEmail: 'Please provide a valid email' },
  },
  { field: 'phone', optional: true, trim: true },
  { field: 'gender', optional: true, isIn: CANDIDATE_GENDERS, messages: { isIn: 'Gender is invalid' } },
  { field: 'branch_id', optional: true },
  { field: 'department_id', optional: true },
  {
    field: 'date_of_birth',
    optional: true,
    isISO8601: true,
    messages: { isISO8601: 'Date of birth must be a valid date' },
  },
  { field: 'address', optional: true, trim: true },
  { field: 'city', optional: true, trim: true },
  { field: 'state', optional: true, trim: true },
  { field: 'zip_code', optional: true, trim: true },
  { field: 'country', optional: true, trim: true },
  { field: 'current_company', optional: true, trim: true },
  { field: 'current_position', optional: true, trim: true },
  { field: 'education', optional: true, trim: true },
  { field: 'portfolio_url', optional: true, trim: true },
  { field: 'linkedin_url', optional: true, trim: true },
  { field: 'resume_url', optional: true, trim: true },
  { field: 'cover_letter_url', optional: true, trim: true },
  { field: 'coverletter_message', optional: true },
  {
    field: 'experience_years',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Experience years must be a number' },
  },
  {
    field: 'current_salary',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Current salary must be a number' },
  },
  {
    field: 'expected_salary',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Expected salary must be a number' },
  },
  {
    field: 'final_salary',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Final salary must be a number' },
  },
  {
    field: 'notice_period',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Notice period must be a number' },
  },
  { field: 'referral_employee_id', optional: true },
  { field: 'status', optional: true, isIn: CANDIDATE_STATUSES, messages: { isIn: 'Status is invalid' } },
  {
    field: 'application_date',
    optional: true,
    isISO8601: true,
    messages: { isISO8601: 'Application date must be a valid date' },
  },
  { field: 'rating', optional: true, isNumeric: true, messages: { isNumeric: 'Rating must be a number' } },
  { field: 'terms_condition_check', optional: true },
];

// job_id is required on create; on update it is optional but still validated
// when present.
export const CANDIDATE_CREATE_RULES = CANDIDATE_RULES.map((r) =>
  r.field === 'job_id' ? { ...r, required: true, optional: false } : r
);

/**
 * Referenced-document checks shared by candidate create/update. Returns the
 * first error message, or null.
 */
export async function candidateRefErrors(data, { requiredJob = false } = {}) {
  const results = await Promise.all([
    refError(data.job_id, JobPosting, 'Invalid job posting selected', { required: requiredJob }),
    refError(data.source_id, CandidateSource, 'Invalid source selected'),
    refError(data.branch_id, Branch, 'Invalid branch selected'),
    refError(data.department_id, Department, 'Invalid department selected'),
    refError(data.referral_employee_id, Employee, 'Invalid referral employee selected'),
  ]);
  return results.find(Boolean) || null;
}

/** Extra field checks shared by candidate create/update (post-validateBody). */
export function candidatePostErrors(data) {
  const errors = [];
  if (data.rating !== undefined && data.rating !== '' && (Number(data.rating) < 0 || Number(data.rating) > 5)) {
    errors.push(fieldError('rating', 'Rating must be between 0 and 5', data.rating));
  }
  if (data.custom_question !== undefined && data.custom_question !== '' && !Array.isArray(data.custom_question)) {
    errors.push(fieldError('custom_question', 'Custom questions must be an array', data.custom_question));
  }
  return errors;
}

/** Drop empty values and normalize list/boolean fields before saving. */
export function cleanCandidatePayload(data) {
  const cleaned = sanitize(data);
  if (cleaned.skills !== undefined) cleaned.skills = normalizeStringArray(cleaned.skills);
  for (const key of ['is_archive', 'is_employee', 'terms_condition_check']) {
    if (cleaned[key] !== undefined && typeof cleaned[key] !== 'boolean') delete cleaned[key];
  }
  if (cleaned.custom_question !== undefined && !Array.isArray(cleaned.custom_question)) {
    delete cleaned.custom_question;
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------
export const INTERVIEW_RULES = [
  { field: 'candidate_id', required: true, messages: { required: 'Candidate is required' } },
  { field: 'round_id', required: true, messages: { required: 'Interview round is required' } },
  { field: 'interview_type_id', required: true, messages: { required: 'Interview type is required' } },
  {
    field: 'scheduled_date',
    required: true,
    isISO8601: true,
    messages: { required: 'Scheduled date is required', isISO8601: 'Scheduled date must be a valid date' },
  },
  {
    field: 'scheduled_time',
    required: true,
    trim: true,
    messages: { required: 'Scheduled time is required' },
  },
  {
    field: 'duration',
    required: true,
    isNumeric: true,
    messages: { required: 'Duration is required', isNumeric: 'Duration must be a number' },
  },
  { field: 'location', optional: true, trim: true, maxLength: 255 },
  { field: 'meeting_link', optional: true, trim: true },
];

/** Referenced-document checks for interviews. Returns the first error or null. */
export async function interviewRefErrors(data) {
  const results = await Promise.all([
    refError(data.candidate_id, Candidate, 'Invalid candidate selected'),
    refError(data.round_id, InterviewRound, 'Invalid interview round selected'),
    refError(data.interview_type_id, InterviewType, 'Invalid interview type selected'),
  ]);
  return results.find(Boolean) || null;
}

/** Extra field checks shared by interview create/update (post-validateBody). */
export function interviewPostErrors(data) {
  const errors = [];
  if (data.scheduled_date && !isOnOrAfter(data.scheduled_date, localDateStr())) {
    errors.push(fieldError('scheduled_date', 'Scheduled date must be today or later', data.scheduled_date));
  }
  if (data.scheduled_time && !/^\d{1,2}:\d{2}$/.test(data.scheduled_time)) {
    errors.push(fieldError('scheduled_time', 'Scheduled time must be in HH:MM format', data.scheduled_time));
  }
  const duration = Number(data.duration);
  if (
    data.duration !== undefined &&
    data.duration !== '' &&
    (!Number.isInteger(duration) || duration < 15 || duration > 480)
  ) {
    errors.push(fieldError('duration', 'Duration must be between 15 and 480 minutes', data.duration));
  }
  if (data.meeting_link && !/^https?:\/\//i.test(data.meeting_link)) {
    errors.push(fieldError('meeting_link', 'Meeting link must be a valid URL', data.meeting_link));
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Interview feedback
// ---------------------------------------------------------------------------
export const FEEDBACK_RULES = [
  { field: 'interview_id', required: true, messages: { required: 'Interview is required' } },
  { field: 'interviewer_id', required: true, trim: true, messages: { required: 'Interviewer is required' } },
  {
    field: 'technical_rating',
    required: true,
    isNumeric: true,
    messages: { required: 'Technical rating is required', isNumeric: 'Technical rating must be a number' },
  },
  {
    field: 'communication_rating',
    required: true,
    isNumeric: true,
    messages: { required: 'Communication rating is required', isNumeric: 'Communication rating must be a number' },
  },
  {
    field: 'cultural_fit_rating',
    required: true,
    isNumeric: true,
    messages: { required: 'Cultural fit rating is required', isNumeric: 'Cultural fit rating must be a number' },
  },
  {
    field: 'overall_rating',
    required: true,
    isNumeric: true,
    messages: { required: 'Overall rating is required', isNumeric: 'Overall rating must be a number' },
  },
  { field: 'strengths', optional: true },
  { field: 'weaknesses', optional: true },
  { field: 'comments', optional: true },
  {
    field: 'recommendation',
    required: true,
    isIn: FEEDBACK_RECOMMENDATIONS,
    messages: { required: 'Recommendation is required', isIn: 'Recommendation is invalid' },
  },
];

export const FEEDBACK_RATING_FIELDS = [
  'technical_rating',
  'communication_rating',
  'cultural_fit_rating',
  'overall_rating',
];

/** Validate a normalized list of interviewer user ids; returns a field error or null. */
export async function interviewerIdsError(ids) {
  if (ids.length === 0) return fieldError('interviewer_id', 'Interviewer is required');
  if (!ids.every(isValidId)) return fieldError('interviewer_id', 'Invalid interviewer selected');
  const count = await User.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) return fieldError('interviewer_id', 'Invalid interviewer selected');
  return null;
}

// ---------------------------------------------------------------------------
// Candidate assessments
// ---------------------------------------------------------------------------
export const ASSESSMENT_RULES = [
  { field: 'candidate_id', required: true, messages: { required: 'Candidate is required' } },
  {
    field: 'assessment_name',
    required: true,
    trim: true,
    maxLength: 255,
    messages: { required: 'Assessment name is required' },
  },
  {
    field: 'score',
    required: true,
    isNumeric: true,
    messages: { required: 'Score is required', isNumeric: 'Score must be a number' },
  },
  {
    field: 'max_score',
    required: true,
    isNumeric: true,
    messages: { required: 'Max score is required', isNumeric: 'Max score must be a number' },
  },
  {
    field: 'pass_fail_status',
    required: true,
    isIn: ASSESSMENT_STATUSES,
    messages: { required: 'Pass/fail status is required', isIn: 'Status is invalid' },
  },
  { field: 'comments', optional: true },
  {
    field: 'conducted_by',
    required: true,
    trim: true,
    messages: { required: 'Conducted by is required' },
  },
  {
    field: 'assessment_date',
    optional: true,
    isISO8601: true,
    messages: { isISO8601: 'Assessment date must be a valid date' },
  },
];

/** Referenced-document checks for assessments. Returns the first error or null. */
export async function assessmentRefErrors(data) {
  const results = await Promise.all([
    refError(data.candidate_id, Candidate, 'Invalid candidate selected'),
    refError(data.conducted_by, User, 'Invalid interviewer selected'),
  ]);
  return results.find(Boolean) || null;
}

export function assessmentPostErrors(data) {
  const errors = [];
  if (data.score !== undefined && data.score !== '' && Number(data.score) < 0) {
    errors.push(fieldError('score', 'Score cannot be negative', data.score));
  }
  if (data.max_score !== undefined && data.max_score !== '' && Number(data.max_score) < 1) {
    errors.push(fieldError('max_score', 'Max score must be at least 1', data.max_score));
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
export const OFFER_RULES = [
  { field: 'candidate_id', required: true, messages: { required: 'Candidate is required' } },
  {
    field: 'position',
    required: true,
    trim: true,
    maxLength: 255,
    messages: { required: 'Position is required' },
  },
  { field: 'department_id', optional: true },
  {
    field: 'salary',
    required: true,
    isNumeric: true,
    messages: { required: 'Salary is required', isNumeric: 'Salary must be a number' },
  },
  { field: 'bonus', optional: true, isNumeric: true, messages: { isNumeric: 'Bonus must be a number' } },
  { field: 'equity', optional: true, trim: true },
  { field: 'benefits', optional: true },
  {
    field: 'start_date',
    required: true,
    isISO8601: true,
    messages: { required: 'Start date is required', isISO8601: 'Start date must be a valid date' },
  },
  {
    field: 'expiration_date',
    required: true,
    isISO8601: true,
    messages: { required: 'Expiration date is required', isISO8601: 'Expiration date must be a valid date' },
  },
  { field: 'offer_letter_url', optional: true, trim: true },
  { field: 'approved_by', optional: true },
];

/** Referenced-document checks for offers (candidate copy of job_id happens after). */
export async function offerRefErrors(data) {
  const results = await Promise.all([
    refError(data.candidate_id, Candidate, 'Invalid candidate selected'),
    refError(data.department_id, Department, 'Invalid department selected'),
    refError(data.approved_by, User, 'Invalid approver selected'),
  ]);
  return results.find(Boolean) || null;
}

export function offerPostErrors(data) {
  const errors = [];
  const today = localDateStr();
  if (data.salary !== undefined && data.salary !== '' && Number(data.salary) < 0) {
    errors.push(fieldError('salary', 'Salary cannot be negative', data.salary));
  }
  if (data.start_date && !isOnOrAfter(data.start_date, today)) {
    errors.push(fieldError('start_date', 'Start date must be today or later', data.start_date));
  }
  if (data.expiration_date) {
    if (!isOnOrAfter(data.expiration_date, today)) {
      errors.push(fieldError('expiration_date', 'Expiration date must be today or later', data.expiration_date));
    } else if (data.start_date && !isOnOrAfter(data.expiration_date, data.start_date)) {
      errors.push(
        fieldError('expiration_date', 'Expiration date must be on or after the start date', data.expiration_date)
      );
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Candidate onboarding
// ---------------------------------------------------------------------------
export const ONBOARDING_RULES = [
  { field: 'employee_id', required: true, messages: { required: 'Employee is required' } },
  { field: 'checklist_id', required: true, messages: { required: 'Checklist is required' } },
  {
    field: 'start_date',
    required: true,
    isISO8601: true,
    messages: { required: 'Start date is required', isISO8601: 'Start date must be a valid date' },
  },
  { field: 'buddy_employee_id', optional: true },
];

/** Referenced-document checks for onboarding. Returns the first error or null. */
export async function onboardingRefErrors(data) {
  const results = await Promise.all([
    refError(data.employee_id, User, 'Invalid employee selected'),
    refError(data.checklist_id, OnboardingChecklist, 'Invalid checklist selected'),
    refError(data.buddy_employee_id, User, 'Invalid buddy employee selected'),
  ]);
  return results.find(Boolean) || null;
}

// ---------------------------------------------------------------------------
// Job postings
// ---------------------------------------------------------------------------
export const JOB_POSTING_RULES = [
  {
    field: 'title',
    required: true,
    trim: true,
    maxLength: 255,
    messages: { required: 'Title is required' },
  },
  { field: 'job_code', optional: true, trim: true, maxLength: 50 },
  { field: 'job_type_id', optional: true },
  { field: 'location_id', optional: true },
  { field: 'branch_id', optional: true },
  { field: 'department_id', optional: true },
  { field: 'category_id', optional: true },
  {
    field: 'priority',
    optional: true,
    isIn: JOB_PRIORITIES,
    messages: { isIn: 'Priority is invalid' },
  },
  { field: 'positions', optional: true, isNumeric: true, messages: { isNumeric: 'Positions must be a number' } },
  {
    field: 'min_experience',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Minimum experience must be a number' },
  },
  {
    field: 'max_experience',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Maximum experience must be a number' },
  },
  {
    field: 'min_salary',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Minimum salary must be a number' },
  },
  {
    field: 'max_salary',
    optional: true,
    isNumeric: true,
    messages: { isNumeric: 'Maximum salary must be a number' },
  },
  { field: 'description', optional: true },
  { field: 'requirements', optional: true },
  { field: 'benefits', optional: true },
  {
    field: 'start_date',
    optional: true,
    isISO8601: true,
    messages: { isISO8601: 'Start date must be a valid date' },
  },
  {
    field: 'application_deadline',
    optional: true,
    isISO8601: true,
    messages: { isISO8601: 'Application deadline must be a valid date' },
  },
  {
    field: 'status',
    optional: true,
    isIn: JOB_STATUSES,
    messages: { isIn: 'Status is invalid' },
  },
];

/** Referenced-document checks for job postings. Returns the first error or null. */
export async function jobPostingRefErrors(data) {
  const results = await Promise.all([
    refError(data.job_type_id, JobType, 'Invalid job type selected'),
    refError(data.location_id, JobLocation, 'Invalid job location selected'),
    refError(data.branch_id, Branch, 'Invalid branch selected'),
    refError(data.department_id, Department, 'Invalid department selected'),
    refError(data.category_id, JobCategory, 'Invalid job category selected'),
  ]);
  return results.find(Boolean) || null;
}

/** Extra field checks shared by job posting create/update. */
export function jobPostingPostErrors(data) {
  const errors = [];
  const numeric = (value) => Number(value);

  if (data.positions !== undefined && data.positions !== '') {
    const positions = numeric(data.positions);
    if (!Number.isInteger(positions) || positions < 1) {
      errors.push(fieldError('positions', 'Positions must be at least 1', data.positions));
    }
  }

  const hasMinExp = data.min_experience !== undefined && data.min_experience !== '';
  const hasMaxExp = data.max_experience !== undefined && data.max_experience !== '';
  if (hasMinExp && numeric(data.min_experience) < 0) {
    errors.push(fieldError('min_experience', 'Minimum experience cannot be negative', data.min_experience));
  }
  if (hasMaxExp && numeric(data.max_experience) < 0) {
    errors.push(fieldError('max_experience', 'Maximum experience cannot be negative', data.max_experience));
  }
  if (hasMinExp && hasMaxExp && numeric(data.max_experience) < numeric(data.min_experience)) {
    errors.push(
      fieldError('max_experience', 'Maximum experience must be on or after the minimum experience', data.max_experience)
    );
  }

  const hasMinSalary = data.min_salary !== undefined && data.min_salary !== '';
  const hasMaxSalary = data.max_salary !== undefined && data.max_salary !== '';
  if (hasMinSalary && numeric(data.min_salary) < 0) {
    errors.push(fieldError('min_salary', 'Minimum salary cannot be negative', data.min_salary));
  }
  if (hasMaxSalary && numeric(data.max_salary) < 0) {
    errors.push(fieldError('max_salary', 'Maximum salary cannot be negative', data.max_salary));
  }
  if (
    hasMinSalary &&
    hasMaxSalary &&
    numeric(data.max_salary) > 0 &&
    numeric(data.max_salary) < numeric(data.min_salary)
  ) {
    errors.push(fieldError('max_salary', 'Maximum salary must be on or after the minimum salary', data.max_salary));
  }

  if (data.start_date && data.application_deadline && !isOnOrAfter(data.application_deadline, data.start_date)) {
    errors.push(
      fieldError(
        'application_deadline',
        'Application deadline must be on or after the start date',
        data.application_deadline
      )
    );
  }
  return errors;
}

/**
 * Normalize a job posting payload: list fields, numbers, publish flags and the
 * publish date. `existing` is the current document on update (so an edit keeps
 * the original publish date).
 */
export function cleanJobPostingPayload(data, existing = null) {
  const cleaned = sanitize(data);

  if (cleaned.skills !== undefined) cleaned.skills = normalizeStringArray(cleaned.skills);
  for (const key of ['applicant', 'visibility']) {
    if (cleaned[key] !== undefined) cleaned[key] = normalizeStringArray(cleaned[key], 20);
  }
  if (cleaned.custom_question !== undefined) {
    cleaned.custom_question = (Array.isArray(cleaned.custom_question) ? cleaned.custom_question : []).filter(isValidId);
  }
  for (const key of ['positions', 'min_experience', 'max_experience', 'min_salary', 'max_salary']) {
    if (cleaned[key] !== undefined && cleaned[key] !== '') cleaned[key] = Number(cleaned[key]);
  }

  const explicitStatus = cleaned.status;
  const flag = cleaned.is_published === true;
  const isPublished = explicitStatus ? explicitStatus === 'Published' : flag;

  cleaned.is_published = isPublished;
  if (!explicitStatus) cleaned.status = isPublished ? 'Published' : 'Draft';
  cleaned.publish_date = isPublished ? (existing?.publish_date ?? new Date()) : null;

  return cleaned;
}

/** Generate the next sequential job code (JOB-0001). */
export async function generateJobCode() {
  const last = await JobPosting.findOne({ job_code: /^JOB-\d+$/ })
    .sort({ job_code: -1 })
    .select('job_code')
    .lean();
  let next = last ? parseInt(String(last.job_code).replace(/^JOB-/, ''), 10) + 1 : 1;
  let code = `JOB-${String(next).padStart(4, '0')}`;
  let guard = 0;
  while (await JobPosting.exists({ job_code: code })) {
    guard += 1;
    if (guard > 25) break;
    next += 1;
    code = `JOB-${String(next).padStart(4, '0')}`;
  }
  return code;
}
