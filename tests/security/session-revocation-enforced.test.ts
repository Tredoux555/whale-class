// tests/security/session-revocation-enforced.test.ts
//
// The half of the revocation fix that matters in production: verifySchoolRequest
// — the function every authenticated Montree API route calls — must actually
// REFUSE a revoked token. A revocation column nothing reads is decoration.
//
// This drives the real verifySchoolRequest with a real signed JWT (the vitest
// config supplies MONTREE_JWT_SECRET) and only fakes the database lookup.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

let revokedAt: string | null = null;

vi.mock('@/lib/montree/school-lock', () => ({
  isSchoolLocked: async () => false,
}));

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from() {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({
          data: { sessions_revoked_at: revokedAt },
          error: null,
        }),
      };
      return b;
    },
  }),
}));

const { createMontreeToken, MONTREE_AUTH_COOKIE } = await import(
  '@/lib/montree/server-auth'
);
const { verifySchoolRequest } = await import('@/lib/montree/verify-request');
const { invalidateSessionRevocation } = await import(
  '@/lib/montree/session-revocation'
);

const TEACHER = 'teacher-abc';
const SCHOOL = 'school-abc';

async function requestWithSession() {
  const token = await createMontreeToken({
    sub: TEACHER,
    schoolId: SCHOOL,
    role: 'teacher',
  });
  const req = new NextRequest('http://localhost/api/montree/anything', {
    headers: { cookie: `${MONTREE_AUTH_COOKIE}=${token}` },
  });
  return req;
}

beforeEach(() => {
  revokedAt = null;
  invalidateSessionRevocation();
});

describe('verifySchoolRequest enforces session revocation', () => {
  it('accepts an ordinary session', async () => {
    const res = await verifySchoolRequest(await requestWithSession());
    expect(res).not.toBeInstanceOf(NextResponse);
    expect((res as { userId: string }).userId).toBe(TEACHER);
  });

  it('REJECTS a session issued before the account signed out everywhere', async () => {
    const req = await requestWithSession();
    // Sign out everywhere, one minute into the future relative to the token's iat.
    revokedAt = new Date(Date.now() + 60_000).toISOString();
    invalidateSessionRevocation();

    const res = await verifySchoolRequest(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
    expect(await (res as NextResponse).json()).toMatchObject({
      code: 'session_revoked',
    });
  });

  it('accepts a session issued AFTER the revocation (logging back in works)', async () => {
    revokedAt = new Date(Date.now() - 60_000).toISOString();
    invalidateSessionRevocation();

    const res = await verifySchoolRequest(await requestWithSession());
    expect(res).not.toBeInstanceOf(NextResponse);
  });

  it('surfaces the token iat, which the sliding refresh in auth/me depends on', async () => {
    const res = await verifySchoolRequest(await requestWithSession());
    const iat = (res as { iat?: number }).iat;
    expect(typeof iat).toBe('number');
    expect(Math.abs((iat as number) - Math.floor(Date.now() / 1000))).toBeLessThan(10);
  });
});
