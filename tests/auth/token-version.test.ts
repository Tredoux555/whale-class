// tests/auth/token-version.test.ts
//
// The "is this session still allowed in?" rules, end to end: a REAL signed token
// through the REAL verifySchoolRequest, with only the identity-row read faked.
//
// ── What this file pins ──────────────────────────────────────────────────────
// Montree sessions are stateless signed JWTs. Nothing inside a token can say
// "this account was deleted an hour ago", so verifySchoolRequest pairs the
// signature check with ONE cached read of the identity row the token's `sub`
// points at (lib/montree/session-revocation.ts). Three separate holes close on
// that single read, and all three are regressions waiting to happen because the
// happy path looks identical with the check removed:
//
//   1. account DELETED      — the row is gone; absence IS the revocation.
//   2. account DEACTIVATED  — is_active = false (a principal removing a teacher).
//   3. sessions REVOKED     — sessions_revoked_at (migration 351), compared
//                             against the token's `iat`.
//
// ── And the rule that keeps a deploy from logging the world out ─────────────
// The version marker is carried by the standard `iat` claim rather than a
// bespoke one, so "a token minted before this feature existed" is not a special
// case — but the comparison still has to be one-sided. A token whose `iat`
// cannot be compared, or an account whose marker is NULL (which is every row
// until someone deliberately signs out everywhere), must be treated as VALID.
// Anything else turns the deploy itself into a mass logout, which is the single
// outcome this product refuses.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/** The fake identity row served to the auth path. `null` = no such row. */
let identityRow: Record<string, unknown> | null = { sessions_revoked_at: null };
/** Set to make the lookup fail, so the fail-open contract can be checked. */
let lookupError: { message: string } | null = null;

vi.mock('@/lib/montree/school-lock', () => ({
  isSchoolLocked: async () => false,
}));

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from() {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () =>
          lookupError
            ? { data: null, error: lookupError }
            : { data: identityRow, error: null },
      };
      return b;
    },
  }),
}));

const { createMontreeToken, verifyMontreeToken, MONTREE_AUTH_COOKIE } =
  await import('@/lib/montree/server-auth');
const { verifySchoolRequest } = await import('@/lib/montree/verify-request');
const { invalidateSessionRevocation, getSessionIdentityState } = await import(
  '@/lib/montree/session-revocation'
);

const TEACHER = '11111111-2222-3333-4444-555555555555';
const SCHOOL = '99999999-8888-7777-6666-555555555555';

async function signedRequest(): Promise<NextRequest> {
  const token = await createMontreeToken({
    sub: TEACHER,
    schoolId: SCHOOL,
    role: 'teacher',
  });
  return new NextRequest('http://localhost/api/montree/anything', {
    headers: { cookie: `${MONTREE_AUTH_COOKIE}=${token}` },
  });
}

async function codeOf(res: unknown): Promise<string | undefined> {
  const body = await (res as NextResponse).json();
  return (body as { code?: string }).code;
}

beforeEach(() => {
  identityRow = { sessions_revoked_at: null, is_active: true };
  lookupError = null;
  invalidateSessionRevocation();
});

// ─────────────────────────────────────────────────────────── claim round-trip ──
describe('the version marker survives the round trip', () => {
  it('stamps every minted token with an iat, and verify hands it back', async () => {
    const token = await createMontreeToken({
      sub: TEACHER,
      schoolId: SCHOOL,
      role: 'teacher',
    });
    const payload = await verifyMontreeToken(token);
    expect(payload).not.toBeNull();
    expect(typeof payload!.iat).toBe('number');
    // Within a few seconds of now — this is what the comparison is made against.
    expect(Math.abs(payload!.iat! - Math.floor(Date.now() / 1000))).toBeLessThan(10);
  });

  it('carries it all the way through to the verified request', async () => {
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).not.toBeInstanceOf(NextResponse);
    expect(typeof (res as { iat?: number }).iat).toBe('number');
  });
});

// ───────────────────────────────────────────────────────────── the rejections ──
describe('verifySchoolRequest rejects a session the database has ended', () => {
  it('rejects a token issued BEFORE sessions_revoked_at', async () => {
    const req = await signedRequest();
    identityRow = {
      sessions_revoked_at: new Date(Date.now() + 60_000).toISOString(),
      is_active: true,
    };
    invalidateSessionRevocation();

    const res = await verifySchoolRequest(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
    expect(await codeOf(res)).toBe('session_revoked');
  });

  it('rejects a token whose account row has been DELETED', async () => {
    identityRow = null; // successful query, no row
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
    expect(await codeOf(res)).toBe('account_deleted');
  });

  it('rejects a token whose account has been DEACTIVATED', async () => {
    identityRow = { sessions_revoked_at: null, is_active: false };
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
    expect(await codeOf(res)).toBe('account_inactive');
  });
});

// ──────────────────────────────────────── the rule that prevents a mass logout ──
describe('a marker that says nothing must never log anybody out', () => {
  it('accepts a session when sessions_revoked_at is NULL (every row, today)', async () => {
    identityRow = { sessions_revoked_at: null, is_active: true };
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it('accepts a session when the column is absent entirely (pre-migration DB)', async () => {
    identityRow = {}; // neither sessions_revoked_at nor is_active present
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it('accepts a session issued AFTER the revocation — logging back in works', async () => {
    identityRow = {
      sessions_revoked_at: new Date(Date.now() - 60_000).toISOString(),
      is_active: true,
    };
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it('FAILS OPEN when the lookup errors — a DB wobble is not a logout', async () => {
    lookupError = { message: 'column "sessions_revoked_at" does not exist' };
    const res = await verifySchoolRequest(await signedRequest());
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it('has no opinion about a server-internal synthetic subject', async () => {
    // The photo-sweep cron mints `sub: 'cron:photo-sweep'`, which matches no row.
    identityRow = null;
    const state = await getSessionIdentityState('teacher', 'cron:photo-sweep');
    expect(state.known).toBe(false);
    expect(state.missing).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────── the cached read ──
describe('the check costs one read per account per window', () => {
  it('caches, and invalidateSessionRevocation() forces a refetch', async () => {
    // Two consecutive checks with a revoked marker, separated by an
    // invalidation, must both see the CURRENT value — the point of the hook the
    // sign-out-everywhere route calls.
    identityRow = { sessions_revoked_at: null, is_active: true };
    expect((await getSessionIdentityState('teacher', TEACHER)).revokedAt).toBeNull();

    identityRow = {
      sessions_revoked_at: new Date(Date.now() + 60_000).toISOString(),
      is_active: true,
    };
    // Still cached — deliberately stale for up to 60s.
    expect((await getSessionIdentityState('teacher', TEACHER)).revokedAt).toBeNull();

    invalidateSessionRevocation('teacher', TEACHER);
    expect(
      (await getSessionIdentityState('teacher', TEACHER)).revokedAt,
    ).not.toBeNull();
  });
});
