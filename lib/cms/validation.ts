// lib/cms/validation.ts
// ============================================================================
// The gate between "a parent is typing" and "the school has a record".
// ============================================================================
// Montree carries no schema-validation dependency (no zod, no yup) and CMS adds
// none — REUSE-FIRST LAW. The rules below are lifted, deliberately, from
// lib/onboarding-core/validation.ts, which is this repo's existing answer to
// the same problem for Montree's and PSS's intake forms:
//
//   · strict ISO dates that must ROUND-TRIP (rejects 2019-02-31, which
//     `new Date()` silently turns into March 3rd),
//   · a plausible age window rather than a bare "is a date",
//   · forgiving everywhere else — a half-filled form from a busy family still
//     beats no form.
//
// It is re-implemented rather than imported because that module's entry point
// takes an `IntakeForm`, a different shape from the CMS wizard's step values.
// If the two intake models ever converge (the stated long-term intent), this
// file is the thing that should disappear into lib/onboarding-core/.
//
// Client AND server both call these. The server call is the one that counts.
// ============================================================================

export interface FieldError {
  /** The form field this belongs to, so the UI can point at it. */
  field: string;
  /** English. UI-facing messages are translated at the call site via t(). */
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: FieldError[];
}

/** Plausible age window for an early-years intake, from onboarding-core. */
const MIN_AGE_YEARS = 0;
const MAX_AGE_YEARS = 12;

/** Length ceilings. Not security (the DB is parameterised and React escapes on
 *  render) — they stop a paste accident becoming a 2MB row. */
export const MAX_NAME = 120;
export const MAX_NOTES = 2000;
export const MAX_EMAIL = 254;

export function isBlank(v: string | undefined | null): boolean {
  return !v || !String(v).trim();
}

/** Trim, collapse runs of whitespace, and cap. Every string that reaches the
 *  database goes through this. */
export function clean(v: string | undefined | null, max = MAX_NAME): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Strict ISO date that round-trips. Returns null for anything else. */
export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

function yearsBetween(then: Date, now: Date): number {
  let years = now.getUTCFullYear() - then.getUTCFullYear();
  const m = now.getUTCMonth() - then.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < then.getUTCDate())) years -= 1;
  return years;
}

/** A syntactically plausible address. Deliverability is the mail server's job. */
export function isEmailShaped(value: string): boolean {
  const v = value.trim();
  return v.length <= MAX_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export interface ChildStepValues {
  legalName: string;
  preferredName: string;
  dateOfBirth: string;
  homeLanguage: string;
  requestedStartDate: string;
  classGroupId: string;
  settlingNotes: string;
}

/**
 * Wizard step 1. Required: the four things a school cannot open a file without
 * — who the child legally is, when they were born, what they speak at home, and
 * which room the family is asking for. Everything else is optional.
 */
export function validateChildStep(
  values: ChildStepValues,
  now: Date = new Date()
): ValidationResult {
  const errors: FieldError[] = [];

  if (isBlank(values.legalName)) {
    errors.push({ field: 'legalName', message: "The child's legal name is required." });
  }

  if (isBlank(values.dateOfBirth)) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is required.' });
  } else {
    const dob = parseIsoDate(values.dateOfBirth.trim());
    if (!dob) {
      errors.push({ field: 'dateOfBirth', message: 'That date is not a real date.' });
    } else if (dob.getTime() > now.getTime()) {
      errors.push({ field: 'dateOfBirth', message: 'Date of birth is in the future.' });
    } else {
      const age = yearsBetween(dob, now);
      if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
        errors.push({
          field: 'dateOfBirth',
          message: `That date would make the child ${age} years old — please check the year.`,
        });
      }
    }
  }

  if (isBlank(values.homeLanguage)) {
    errors.push({ field: 'homeLanguage', message: 'Home language is required.' });
  }

  if (isBlank(values.classGroupId)) {
    errors.push({ field: 'classGroupId', message: 'Please choose a room.' });
  }

  if (!isBlank(values.requestedStartDate) && !parseIsoDate(values.requestedStartDate.trim())) {
    errors.push({ field: 'requestedStartDate', message: 'That start date is not a real date.' });
  }

  return { ok: errors.length === 0, errors };
}

/** Normalise a validated step into exactly what the database should store. */
export function normaliseChildStep(values: ChildStepValues) {
  return {
    legalName: clean(values.legalName),
    preferredName: clean(values.preferredName) || clean(values.legalName),
    dateOfBirth: values.dateOfBirth.trim(),
    homeLanguage: clean(values.homeLanguage, 60),
    requestedStartDate: values.requestedStartDate.trim() || null,
    classGroupId: values.classGroupId.trim() || null,
    settlingNotes: clean(values.settlingNotes, MAX_NOTES) || null,
  };
}

/** Signup: an address, a password long enough to be worth hashing, a name. */
export function validateSignup(input: {
  email: string;
  password: string;
  fullName: string;
}): ValidationResult {
  const errors: FieldError[] = [];
  if (!isEmailShaped(input.email ?? '')) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }
  if ((input.password ?? '').length < 8) {
    errors.push({ field: 'password', message: 'Use at least 8 characters.' });
  }
  if (isBlank(input.fullName)) {
    errors.push({ field: 'fullName', message: 'Your full name is required.' });
  }
  return { ok: errors.length === 0, errors };
}
