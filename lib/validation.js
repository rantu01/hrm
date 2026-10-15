import { ApiError } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const NUMERIC_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

const isEmpty = (value) => value === undefined || value === null || value === '';
/**
 * Validates a JSON request body, mirroring the express-validator rules used by
 * the original Express backend (including the shape of the errors array).
 *
 * Rule flags:
 * - optional: skip validation when the value is empty
 * - required: value must be present
 * - trim / normalizeEmail: sanitize the value before validating
 * - isEmail / minLength / isIn / isNumeric / isISO8601: validators
 * - messages: error text overrides per check
 */
export function validateBody(body = {}, rules = []) {
  const errors = [];
  const data = { ...body };

  for (const rule of rules) {
    let value = data[rule.field];

    if (rule.trim && typeof value === 'string') {
      value = value.trim();
      data[rule.field] = value;
    }

    if (rule.normalizeEmail && typeof value === 'string') {
      value = value.toLowerCase();
      data[rule.field] = value;
    }

    const fail = (msg) => {
      errors.push({
        type: 'field',
        value: value === undefined ? '' : value,
        msg,
        path: rule.field,
        location: 'body',
      });
    };

    if (isEmpty(value)) {
      if (rule.optional) continue;

      if (rule.required) {
        fail(rule.messages?.required ?? `${rule.field} is required`);
        continue;
      }

      // Non-optional validators still apply to empty values (express-validator behaviour)
      if (rule.isEmail) fail(rule.messages?.isEmail ?? 'Please provide a valid email');
      else if (rule.minLength !== undefined) fail(rule.messages?.minLength ?? `${rule.field} is too short`);
      else if (rule.isIn) fail(rule.messages?.isIn ?? `${rule.field} is invalid`);
      else if (rule.isNumeric) fail(rule.messages?.isNumeric ?? `${rule.field} must be a number`);
      else if (rule.isISO8601) fail(rule.messages?.isISO8601 ?? `${rule.field} must be a valid date`);
      continue;
    }

    if (rule.isEmail && !EMAIL_RE.test(value)) {
      fail(rule.messages?.isEmail ?? 'Please provide a valid email');
      continue;
    }

    if (rule.minLength !== undefined && String(value).length < rule.minLength) {
      fail(rule.messages?.minLength ?? `${rule.field} is too short`);
      continue;
    }

    if (rule.isIn && !rule.isIn.includes(value)) {
      fail(rule.messages?.isIn ?? `${rule.field} is invalid`);
      continue;
    }

    if (rule.isNumeric && !NUMERIC_RE.test(String(value))) {
      fail(rule.messages?.isNumeric ?? `${rule.field} must be a number`);
      continue;
    }

    if (rule.isISO8601 && !ISO8601_RE.test(String(value))) {
      fail(rule.messages?.isISO8601 ?? `${rule.field} must be a valid date`);
      continue;
    }
  }

  return { errors, data };
}

// Parses a JSON request body; throws an ApiError on malformed JSON.
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON in request body');
  }
}
