// lib/montree/apply-validation.ts
// audit-fix (Jun 2026): shared input validation for the two PUBLIC
// application endpoints (apply/npo, apply/reduced-rate). These take
// unauthenticated submissions, so without caps a bot could store
// megabyte-sized strings or absurd numbers. Keep limits generous —
// real applicants must never be rejected for length.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: unknown): boolean {
  return typeof email === 'string' && email.length <= 320 && EMAIL_RE.test(email.trim());
}

/** Returns an error string, or null if OK. Trims before measuring. */
export function checkLen(value: unknown, field: string, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return `${field} must be text`;
  if (value.trim().length > max) return `${field} is too long (max ${max} characters)`;
  return null;
}

/** Returns an error string, or null if OK. */
export function checkStudentCount(value: unknown): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100000) {
    return 'estimated_students must be a number between 0 and 100,000';
  }
  return null;
}

/** Validate the common fields of both application forms. */
export function validateApplicationFields(fields: Record<string, unknown>): string | null {
  const caps: Array<[string, number]> = [
    ['organization_name', 200], ['school_name', 200], ['contact_name', 200],
    ['organization_type', 100], ['registration_number', 100],
    ['country', 100], ['city', 100], ['tuition_model', 100],
    ['contact_phone', 50], ['documentation_url', 500],
    ['mission_statement', 5000], ['community_served', 5000],
    ['additional_notes', 5000], ['reason', 5000], ['current_situation', 5000],
  ];
  for (const [field, max] of caps) {
    if (field in fields) {
      const err = checkLen(fields[field], field, max);
      if (err) return err;
    }
  }
  if ('estimated_students' in fields) {
    const err = checkStudentCount(fields['estimated_students']);
    if (err) return err;
  }
  return null;
}
