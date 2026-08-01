// lib/montree/community/http.ts
// Shared route plumbing for the Teachers' Room API.
//
// Every route in /api/montree/community must behave sanely BEFORE migration
// 309 is run: the tables don't exist, Postgres answers 42P01, and the page
// should quietly render "being set up" rather than throw a 500 at a teacher
// who only came for the SATPIN word lists. That contract is centralised here
// so all eleven handlers can't drift apart on it.

import { NextResponse } from 'next/server';

/** Shape Supabase/PostgREST errors arrive in. */
interface PgLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * True when the failure is "migration 309 hasn't been run".
 * 42P01 = undefined_table. PostgREST sometimes surfaces it as PGRST205
 * ("Could not find the table ... in the schema cache") instead, and storage
 * answers with a plain message, so all three shapes are covered.
 */
export function isMissingTable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as PgLikeError;
  if (e.code === '42P01' || e.code === 'PGRST205') return true;
  const text = `${e.message || ''} ${e.details || ''}`.toLowerCase();
  return (
    text.includes('montree_community') &&
    (text.includes('does not exist') || text.includes('schema cache'))
  );
}

/** The one response the client keys its "being set up" placeholder off. */
export function migrationPending(): NextResponse {
  return NextResponse.json(
    {
      error: 'The staff room is being set up.',
      code: 'migration_pending',
    },
    { status: 503 }
  );
}

export function rateLimited(retryAfterSeconds?: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many attempts. Please try again in a few minutes.', code: 'rate_limited' },
    {
      status: 429,
      headers: retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : undefined,
    }
  );
}

export function badRequest(message: string, code = 'invalid_input'): NextResponse {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

/**
 * Terminal handler for anything unexpected. Logs with a scope tag and returns
 * a JSON body — never an HTML error page, which would break the client's
 * `res.ok` → `res.json()` sequence.
 */
export function serverError(scope: string, err: unknown): NextResponse {
  console.error(`[community/${scope}] error:`, err);
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.', code: 'server_error' },
    { status: 500 }
  );
}

/**
 * Parse a JSON body without letting a malformed one throw past the handler.
 * Returns null on any parse failure; callers treat that as a 400.
 */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Clamp a query-string pagination value. */
export function readPaging(
  url: URL,
  defaultLimit: number,
  maxLimit: number
): { offset: number; limit: number } {
  const rawOffset = Number(url.searchParams.get('offset'));
  const rawLimit = Number(url.searchParams.get('limit'));
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;
  // Hard ceiling on offset so a scripted ?offset=99999999 can't make Postgres
  // walk the whole index for nothing.
  return { offset: Math.min(offset, 100_000), limit };
}

// ============================================
// INPUT VALIDATION (shared by signup / login / reset)
// ============================================

// Deliberately permissive — the confirmation email is the real validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_EMAIL_LENGTH = 200;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;
export const MIN_DISPLAY_NAME = 2;
export const MAX_DISPLAY_NAME = 40;

export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email);
}

/** bcrypt silently truncates past 72 bytes — cap well below and be explicit. */
export function isValidPassword(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}

/** Collapse whitespace and strip control characters out of a display name. */
export function normalizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidDisplayName(name: string): boolean {
  return name.length >= MIN_DISPLAY_NAME && name.length <= MAX_DISPLAY_NAME;
}
