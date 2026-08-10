// lib/onboarding-core/validation.ts
//
// The ONE gate between "a parent is typing" and "the school has a submission".
// Both adapters call this on submit, and the SERVER calls it too — a client
// that skips it must not be able to write a submitted row.
//
// Deliberately forgiving: only the fields a school genuinely cannot operate
// without are required. Everything else is optional, because a half-filled
// form from a busy family still beats no form.

import type { IntakeForm } from './types';

export interface ValidationError {
  /** Dotted path into IntakeForm, e.g. "family.guardians.0.phone". */
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

/** Plausible age window for an early-years intake. Outside this and the date
 *  is almost certainly a typo (or the year field got today's year). */
const MIN_AGE_YEARS = 1;
const MAX_AGE_YEARS = 8;

function isBlank(v: string | undefined | null): boolean {
  return !v || !String(v).trim();
}

/** Strict ISO date that also round-trips — rejects 2019-02-31. */
function parseIsoDate(value: string): Date | null {
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

export function validateIntake(form: IntakeForm): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Identity ────────────────────────────────────────────────────────────
  if (isBlank(form?.identity?.legalName)) {
    errors.push({ path: 'identity.legalName', message: 'Your child\'s full legal name is required.' });
  }

  const dob = (form?.identity?.dob || '').trim();
  if (!dob) {
    errors.push({ path: 'identity.dob', message: 'Date of birth is required.' });
  } else {
    const parsed = parseIsoDate(dob);
    if (!parsed) {
      errors.push({ path: 'identity.dob', message: 'Date of birth is not a valid date.' });
    } else {
      const age = yearsBetween(parsed, new Date());
      if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
        errors.push({
          path: 'identity.dob',
          message: `That date of birth gives an age of ${age}. Please check it — this form expects a child aged ${MIN_AGE_YEARS}–${MAX_AGE_YEARS}.`,
        });
      }
    }
  }

  // ── Family: at least one guardian WITH a phone ──────────────────────────
  const guardians = Array.isArray(form?.family?.guardians) ? form.family.guardians : [];
  const usableGuardian = guardians.find((g) => g && !isBlank(g.name) && !isBlank(g.phone));
  if (!usableGuardian) {
    errors.push({
      path: 'family.guardians',
      message: 'At least one parent or guardian with a name and phone number is required.',
    });
  }

  // ── Emergency: at least one contact ─────────────────────────────────────
  const contacts = Array.isArray(form?.emergency?.contacts) ? form.emergency.contacts : [];
  const usableContact = contacts.find((c) => c && !isBlank(c.name) && !isBlank(c.phone));
  if (!usableContact) {
    errors.push({
      path: 'emergency.contacts',
      message: 'At least one emergency contact with a name and phone number is required.',
    });
  }

  // ── Consent: data privacy is the non-negotiable one ─────────────────────
  if (form?.consents?.data_privacy?.granted !== true) {
    errors.push({
      path: 'consents.data_privacy',
      message: 'We need your permission to store this information before we can accept the form.',
    });
  }

  // ── Documents: the face photo is what every printed label needs ─────────
  if (isBlank(form?.documents?.facePhotoPath)) {
    errors.push({
      path: 'documents.facePhotoPath',
      message: 'A face photo of your child is required.',
    });
  }

  return { ok: errors.length === 0, errors };
}

/** Convenience for surfaces that want one line per problem. */
export function summarizeErrors(errors: ValidationError[]): string {
  return errors.map((e) => e.message).join(' ');
}
