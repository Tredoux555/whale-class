// tests/feedback/identity.test.ts
//
// Who the board thinks you are, and — the part that matters — who it refuses
// to think you are.
//
// The Montree token verifier and Supabase are faked; the tests are about
// identity.ts's OWN decisions: the order it tries cookies in, what it does
// with nothing at all, and where isAdmin comes from.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const verifyMontreeToken = vi.fn();
const verifyCommunityToken = vi.fn();
const verifySuperAdminAuth = vi.fn();

vi.mock('@/lib/montree/server-auth', () => ({
  MONTREE_AUTH_COOKIE: 'montree-auth',
  verifyMontreeToken: (...args: unknown[]) => verifyMontreeToken(...args),
}));

vi.mock('@/lib/montree/community/auth', () => ({
  COMMUNITY_COOKIE: 'montree_community',
  verifyCommunityToken: (...args: unknown[]) => verifyCommunityToken(...args),
}));

vi.mock('@/lib/verify-super-admin', () => ({
  verifySuperAdminAuth: (...args: unknown[]) => verifySuperAdminAuth(...args),
}));

// A Supabase that answers every lookup with "nothing", so a display name falls
// back to the role word and a guest profile comes back empty.
vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  }),
}));

import { resolveViewer, readCookie, publicBoardAdminIds, authorFields } from '@/lib/montree/feedback/identity';
import { hashGuestToken } from '@/lib/montree/feedback/keys';
import type { Board } from '@/lib/montree/feedback/types';

const PUBLIC_BOARD: Board = {
  id: 'b1',
  ref: 'public',
  scope: 'public',
  schoolId: null,
  name: 'Montree product board',
  localeDefault: 'en',
};

const SCHOOL_A: Board = {
  id: 'b2',
  ref: 'school:11111111-1111-4111-8111-111111111111',
  scope: 'school',
  schoolId: '11111111-1111-4111-8111-111111111111',
  name: 'School feedback',
  localeDefault: 'en',
};

/** The minimal request identity.ts reads: headers, and a cookie jar. */
function fakeRequest(cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ');
  const h = new Headers({ ...headers });
  if (cookieHeader) h.set('cookie', cookieHeader);
  return { headers: h };
}

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FEEDBACK_TOKEN_SECRET = 'test-only-feedback-secret-0123456789abcdef';
  delete process.env.FEEDBACK_ADMIN_USER_IDS;
  verifyMontreeToken.mockResolvedValue(null);
  verifyCommunityToken.mockResolvedValue(null);
  verifySuperAdminAuth.mockResolvedValue({ valid: false });
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('readCookie', () => {
  it('reads from a raw Cookie header', () => {
    const req = fakeRequest({ fb_lang: 'zh', other: 'x' });
    expect(readCookie(req, 'fb_lang')).toBe('zh');
    expect(readCookie(req, 'missing')).toBeNull();
  });

  it('prefers a NextRequest-style cookie jar when there is one', () => {
    const req = {
      headers: new Headers(),
      cookies: { get: (name: string) => (name === 'fb_lang' ? { value: 'en' } : undefined) },
    };
    expect(readCookie(req, 'fb_lang')).toBe('en');
  });
});

describe('resolveViewer', () => {
  it('is anon with no cookies at all, and anon cannot vote', () => {
    return resolveViewer(fakeRequest(), PUBLIC_BOARD).then((viewer) => {
      expect(viewer.kind).toBe('anon');
      // `key` is null, which is exactly why votes and subscriptions are refused.
      expect(viewer.key).toBeNull();
      expect(viewer.isAdmin).toBe(false);
    });
  });

  it('resolves a Montree session from `sub`, not from a body field', async () => {
    verifyMontreeToken.mockResolvedValue({ sub: 'teacher-1', schoolId: 's1', role: 'teacher' });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), PUBLIC_BOARD);
    expect(viewer.kind).toBe('user');
    expect(viewer.key).toBe('user:teacher-1');
    expect(viewer.role).toBe('teacher');
  });

  it('degrades to anon when the token does not verify', async () => {
    verifyMontreeToken.mockResolvedValue(null);
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'forged' }), PUBLIC_BOARD);
    expect(viewer.kind).toBe('anon');
  });

  it('degrades to anon when the verifier throws, rather than 500ing the board', async () => {
    verifyMontreeToken.mockRejectedValue(new Error('jwt library exploded'));
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), PUBLIC_BOARD);
    expect(viewer.kind).toBe('anon');
  });

  it('falls through to the community cookie, and a community account is never an admin', async () => {
    verifyCommunityToken.mockResolvedValue('community-9');
    const viewer = await resolveViewer(fakeRequest({ montree_community: 'tok' }), PUBLIC_BOARD);
    expect(viewer.kind).toBe('user');
    expect(viewer.key).toBe('community:community-9');
    expect(viewer.isAdmin).toBe(false);
  });

  it('resolves a guest from the fb_guest cookie', async () => {
    const token = 'a'.repeat(64);
    const viewer = await resolveViewer(fakeRequest({ fb_guest: token }), PUBLIC_BOARD);
    expect(viewer.kind).toBe('guest');
    expect(viewer.key).toBe(`guest:${hashGuestToken(token)}`);
    expect(viewer.isAdmin).toBe(false);
  });

  it('ignores a malformed guest cookie instead of hashing junk', async () => {
    const viewer = await resolveViewer(fakeRequest({ fb_guest: 'not-a-token' }), PUBLIC_BOARD);
    expect(viewer.kind).toBe('anon');
  });

  it('prefers the app session over the community cookie when both are present', async () => {
    verifyMontreeToken.mockResolvedValue({ sub: 'teacher-1', schoolId: 's1', role: 'teacher' });
    verifyCommunityToken.mockResolvedValue('community-9');
    const viewer = await resolveViewer(
      fakeRequest({ 'montree-auth': 'a', montree_community: 'b' }),
      PUBLIC_BOARD,
    );
    expect(viewer.key).toBe('user:teacher-1');
  });
});

describe('the admin model', () => {
  it('PUBLIC board: a signed-in teacher is not an admin', async () => {
    verifyMontreeToken.mockResolvedValue({ sub: 'teacher-1', schoolId: 's1', role: 'teacher' });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), PUBLIC_BOARD);
    expect(viewer.isAdmin).toBe(false);
  });

  it('PUBLIC board: a principal is not an admin either — only the allow-list is', async () => {
    verifyMontreeToken.mockResolvedValue({ sub: 'principal-1', schoolId: 's1', role: 'principal' });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), PUBLIC_BOARD);
    expect(viewer.isAdmin).toBe(false);
  });

  it('PUBLIC board: FEEDBACK_ADMIN_USER_IDS makes an admin', async () => {
    process.env.FEEDBACK_ADMIN_USER_IDS = 'someone-else, teacher-1 ,another';
    verifyMontreeToken.mockResolvedValue({ sub: 'teacher-1', schoolId: 's1', role: 'teacher' });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), PUBLIC_BOARD);
    expect(viewer.isAdmin).toBe(true);
  });

  it('PUBLIC board: a super-admin token makes an admin', async () => {
    verifySuperAdminAuth.mockResolvedValue({ valid: true });
    verifyMontreeToken.mockResolvedValue({ sub: 'teacher-1', schoolId: 's1', role: 'teacher' });
    const viewer = await resolveViewer(
      fakeRequest({ 'montree-auth': 'tok' }, { 'x-super-admin-token': 'st' }),
      PUBLIC_BOARD,
    );
    expect(viewer.isAdmin).toBe(true);
  });

  it('SCHOOL board: the principal of THAT school is the admin', async () => {
    verifyMontreeToken.mockResolvedValue({
      sub: 'principal-1',
      schoolId: SCHOOL_A.schoolId,
      role: 'principal',
    });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), SCHOOL_A);
    expect(viewer.isAdmin).toBe(true);
  });

  it('SCHOOL board: a principal of ANOTHER school is not', async () => {
    verifyMontreeToken.mockResolvedValue({
      sub: 'principal-2',
      schoolId: '22222222-2222-4222-8222-222222222222',
      role: 'principal',
    });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), SCHOOL_A);
    expect(viewer.isAdmin).toBe(false);
  });

  it('SCHOOL board: a teacher of that school is a member, not an admin', async () => {
    verifyMontreeToken.mockResolvedValue({
      sub: 'teacher-1',
      schoolId: SCHOOL_A.schoolId,
      role: 'teacher',
    });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), SCHOOL_A);
    expect(viewer.isAdmin).toBe(false);
  });

  it('SCHOOL board: the public allow-list does NOT carry over', async () => {
    // Being trusted with the product board must not hand you a school's private one.
    process.env.FEEDBACK_ADMIN_USER_IDS = 'teacher-1';
    verifyMontreeToken.mockResolvedValue({
      sub: 'teacher-1',
      schoolId: SCHOOL_A.schoolId,
      role: 'teacher',
    });
    const viewer = await resolveViewer(fakeRequest({ 'montree-auth': 'tok' }), SCHOOL_A);
    expect(viewer.isAdmin).toBe(false);
  });
});

describe('publicBoardAdminIds', () => {
  it('is empty when unset, so nobody is an admin by default', () => {
    delete process.env.FEEDBACK_ADMIN_USER_IDS;
    expect(publicBoardAdminIds().size).toBe(0);
  });

  it('trims and drops blanks', () => {
    process.env.FEEDBACK_ADMIN_USER_IDS = ' a , ,b,';
    expect([...publicBoardAdminIds()].sort()).toEqual(['a', 'b']);
  });
});

describe('authorFields', () => {
  it('refuses to invent an author for anon', () => {
    expect(authorFields({ kind: 'anon', key: null, displayName: null, role: null, isAdmin: false })).toBeNull();
  });

  it('writes a guest as a guest, never with a user id', () => {
    const fields = authorFields({
      kind: 'guest',
      key: 'guest:abc',
      displayName: 'Lin W.',
      role: 'guest',
      isAdmin: false,
      guestTokenHash: 'abc',
    });
    expect(fields).toEqual({
      author_kind: 'guest',
      author_id: null,
      author_name: 'Lin W.',
      author_role: 'guest',
    });
  });
});
