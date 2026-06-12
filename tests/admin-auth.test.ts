// tests/admin-auth.test.ts
// Covers the OTHER half of the auth surface (auth-tokens.test.ts covers
// lib/montree/server-auth.ts):
//   - lib/auth.ts        — admin JWT issue/verify + cookie-backed session
//   - lib/montree/verify-request.ts — cookie/Bearer extraction + 401 mapping
// No network, no DB — next/headers is mocked, tokens are signed with the
// test-only secrets injected via vitest.config.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import { cookies } from 'next/headers';
import { createAdminToken, verifyAdminToken, getAdminSession } from '@/lib/auth';
import { createMontreeToken, MONTREE_AUTH_COOKIE } from '@/lib/montree/server-auth';
import { verifySchoolRequest, getSchoolIdFromRequest } from '@/lib/montree/verify-request';

const ADMIN_SECRET = new TextEncoder().encode(
  'test-only-admin-secret-do-not-use-in-prod-0987654321'
);

describe('admin token (lib/auth.ts)', () => {
  it('round-trips: created token verifies as admin', async () => {
    const token = await createAdminToken();
    expect(await verifyAdminToken(token)).toBe(true);
  });

  it('rejects a tampered token', async () => {
    const token = await createAdminToken();
    expect(await verifyAdminToken(token.slice(0, -3) + 'xyz')).toBe(false);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const wrong = await new SignJWT({ isAdmin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('not-the-admin-secret-at-all-123456'));
    expect(await verifyAdminToken(wrong)).toBe(false);
  });

  it('rejects a correctly-signed token without the isAdmin claim', async () => {
    const noClaim = await new SignJWT({ role: 'admin' }) // wrong claim shape
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(ADMIN_SECRET);
    expect(await verifyAdminToken(noClaim)).toBe(false);
  });

  it('rejects an expired admin token', async () => {
    const expired = await new SignJWT({ isAdmin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(ADMIN_SECRET);
    expect(await verifyAdminToken(expired)).toBe(false);
  });
});

describe('admin session (cookie-backed)', () => {
  type CookieStore = Awaited<ReturnType<typeof cookies>>;
  const mockCookieStore = (token: string | undefined) =>
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === 'admin-token' && token ? { name, value: token } : undefined,
    } as unknown as CookieStore);

  beforeEach(() => vi.mocked(cookies).mockReset());

  it('returns a session for a valid admin-token cookie', async () => {
    mockCookieStore(await createAdminToken());
    expect(await getAdminSession()).toEqual({ isAdmin: true });
  });

  it('returns null when the cookie is missing', async () => {
    mockCookieStore(undefined);
    expect(await getAdminSession()).toBeNull();
  });

  it('returns null when the cookie holds garbage', async () => {
    mockCookieStore('not-a-jwt');
    expect(await getAdminSession()).toBeNull();
  });
});

// ── verify-request: cookie/Bearer extraction for montree API routes ──

function makeRequest(opts: { cookie?: string; bearer?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.bearer !== undefined) headers.set('authorization', `Bearer ${opts.bearer}`);
  return {
    url: 'http://localhost/api/test',
    method: 'GET',
    headers,
    cookies: {
      get: (name: string) =>
        opts.cookie !== undefined && name === MONTREE_AUTH_COOKIE
          ? { name, value: opts.cookie }
          : undefined,
    },
  } as unknown as NextRequest;
}

describe('verifySchoolRequest (lib/montree/verify-request.ts)', () => {
  it('accepts a valid montree-auth cookie and returns the claims', async () => {
    const token = await createMontreeToken({
      sub: 'teacher-7', schoolId: 'school-B', classroomId: 'class-2', role: 'teacher',
    });
    const auth = await verifySchoolRequest(makeRequest({ cookie: token }));
    expect(auth).not.toBeInstanceOf(NextResponse);
    if (auth instanceof NextResponse) return;
    expect(auth.userId).toBe('teacher-7');
    expect(auth.schoolId).toBe('school-B');
    expect(auth.classroomId).toBe('class-2');
    expect(auth.role).toBe('teacher');
  });

  it('accepts a valid Bearer token when no cookie is present', async () => {
    const token = await createMontreeToken({
      sub: 'principal-1', schoolId: 'school-C', role: 'principal',
    });
    const auth = await verifySchoolRequest(makeRequest({ bearer: token }));
    expect(auth).not.toBeInstanceOf(NextResponse);
    if (auth instanceof NextResponse) return;
    expect(auth.role).toBe('principal');
  });

  it('falls through an invalid cookie to a valid Bearer token', async () => {
    const token = await createMontreeToken({
      sub: 'teacher-7', schoolId: 'school-B', role: 'teacher',
    });
    const auth = await verifySchoolRequest(
      makeRequest({ cookie: 'garbage-token', bearer: token })
    );
    expect(auth).not.toBeInstanceOf(NextResponse);
  });

  it('returns 401 when no auth is provided', async () => {
    const auth = await verifySchoolRequest(makeRequest());
    expect(auth).toBeInstanceOf(NextResponse);
    if (!(auth instanceof NextResponse)) return;
    expect(auth.status).toBe(401);
    expect((await auth.json()).error).toBe('Authentication required');
  });

  it('returns 401 for an invalid Bearer token', async () => {
    const auth = await verifySchoolRequest(makeRequest({ bearer: 'broken' }));
    expect(auth).toBeInstanceOf(NextResponse);
    if (!(auth instanceof NextResponse)) return;
    expect(auth.status).toBe(401);
    expect((await auth.json()).error).toBe('Invalid or expired token');
  });

  it('getSchoolIdFromRequest returns null without auth, claims with auth', async () => {
    expect(await getSchoolIdFromRequest(makeRequest())).toBeNull();
    const token = await createMontreeToken({
      sub: 'hp-1', schoolId: 'school-H', role: 'homeschool_parent',
    });
    const got = await getSchoolIdFromRequest(makeRequest({ cookie: token }));
    expect(got).toEqual({ schoolId: 'school-H', userId: 'hp-1', role: 'homeschool_parent' });
  });
});
