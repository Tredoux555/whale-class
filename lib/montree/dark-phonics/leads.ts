// lib/montree/dark-phonics/leads.ts
//
// The email-capture strip's vocabulary and validation. Pure — no next/*, no db.
//
// One email, one optional role, and whatever attribution the visitor arrived
// with. That is the whole record: the strip promises "new books land every few
// weeks", so anything more than an address would be asking for something we are
// not going to use.

export const DP_LEAD_ROLES = ['teacher', 'parent'] as const;
export type DpLeadRole = (typeof DP_LEAD_ROLES)[number];

export function isDpLeadRole(v: unknown): v is DpLeadRole {
  return typeof v === 'string' && (DP_LEAD_ROLES as readonly string[]).includes(v);
}

export const DP_EMAIL_MAX = 254;

/**
 * Deliberately loose. An address that looks like an address is accepted; the
 * only real test of an email is sending to it, and a clever regex here mostly
 * rejects valid addresses from other countries.
 */
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/;

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (!s || s.length > DP_EMAIL_MAX) return null;
  return EMAIL_RE.test(s) ? s : null;
}

export interface DpLeadInput {
  email: string;
  role: DpLeadRole | null;
}

export type LeadResult = { ok: true; value: DpLeadInput } | { ok: false; error: string };

/**
 * Validate a lead submission.
 *
 * `website` is the honeypot: a real person never fills a field they cannot see,
 * so anything in it is a bot. The caller answers 200 OK to a honeypot hit
 * anyway (`{ ok: false, honeypot: true }` here, a cheerful "thanks" there) —
 * telling a bot it was caught only teaches it to try again.
 */
export function validateLead(body: unknown): LeadResult & { honeypot?: boolean } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body must be an object.' };
  }
  const o = body as Record<string, unknown>;

  if (typeof o.website === 'string' && o.website.trim() !== '') {
    return { ok: false, error: 'honeypot', honeypot: true };
  }

  const email = normalizeEmail(o.email);
  if (!email) return { ok: false, error: 'That does not look like an email address.' };

  const role = isDpLeadRole(o.role) ? o.role : null;
  return { ok: true, value: { email, role } };
}
