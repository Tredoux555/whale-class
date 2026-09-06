// tests/security/admin-principal-guard.test.ts
//
// Guards the fix in lib/montree/security/require-principal.ts.
//
// Seventeen routes under /api/montree/admin/* ran verifySchoolRequest() — which
// proves "some valid session for this school" — and then never checked the ROLE.
// An ordinary teacher's token was therefore accepted by endpoints that delete
// classrooms and children, deactivate colleagues, rewrite school settings, bulk
// import curricula, and read the principal's private Astra thread. No exploit
// needed: a teacher has a real login already, they only need the URL.
//
// Two layers are tested:
//   1. the guard's own decision table, and
//   2. a STRUCTURAL sweep asserting every one of the seventeen routes actually
//      calls it after every verifySchoolRequest(). The sweep is the part that
//      stops the fix rotting — a new admin route, or a new handler in an
//      existing one, is caught here rather than in production.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..');

const verifySuperAdminAuthMock = vi.fn();
vi.mock('@/lib/verify-super-admin', () => ({
  verifySuperAdminAuth: (...a: unknown[]) => verifySuperAdminAuthMock(...a),
}));

const { requirePrincipalOrSuperAdmin } = await import(
  '@/lib/montree/security/require-principal'
);

type Role = 'teacher' | 'principal' | 'homeschool_parent' | 'agent' | 'org_admin';

const authFor = (role: Role, extra: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  schoolId: 'school-1',
  role,
  ...extra,
}) as never;

const req = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/montree/admin/settings', { headers });

beforeEach(() => {
  verifySuperAdminAuthMock.mockReset();
  verifySuperAdminAuthMock.mockResolvedValue({ valid: false });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('requirePrincipalOrSuperAdmin', () => {
  it('lets a principal through', async () => {
    expect(await requirePrincipalOrSuperAdmin(req(), authFor('principal'))).toBeNull();
  });

  it('REFUSES a teacher — the escalation this fix exists to stop', async () => {
    const denied = await requirePrincipalOrSuperAdmin(req(), authFor('teacher'));
    expect(denied).toBeInstanceOf(NextResponse);
    expect(denied!.status).toBe(403);
    expect(await denied!.json()).toMatchObject({ code: 'principal_only' });
  });

  it('refuses every other non-principal role', async () => {
    for (const role of ['homeschool_parent', 'agent', 'org_admin'] as Role[]) {
      const denied = await requirePrincipalOrSuperAdmin(req(), authFor(role));
      expect(denied, role).not.toBeNull();
      expect(denied!.status, role).toBe(403);
    }
  });

  it('refuses a principal who has stepped INTO a classroom (they hold a teacher token)', async () => {
    // enter-classroom deliberately downscopes. The way back is
    // /api/montree/admin/return-to-admin, which is not guarded by this helper.
    const denied = await requirePrincipalOrSuperAdmin(
      req(),
      authFor('teacher', { actingPrincipalId: 'principal-9' }),
    );
    expect(denied!.status).toBe(403);
  });

  it('lets a valid super-admin through', async () => {
    verifySuperAdminAuthMock.mockResolvedValue({ valid: true });
    expect(
      await requirePrincipalOrSuperAdmin(
        req({ 'x-super-admin-token': 'tok' }),
        authFor('teacher'),
      ),
    ).toBeNull();
  });

  it('refuses an INVALID super-admin credential', async () => {
    verifySuperAdminAuthMock.mockResolvedValue({ valid: false });
    const denied = await requirePrincipalOrSuperAdmin(
      req({ 'x-super-admin-token': 'forged' }),
      authFor('teacher'),
    );
    expect(denied!.status).toBe(403);
  });

  it('does not even consult the super-admin check without a credential header', async () => {
    await requirePrincipalOrSuperAdmin(req(), authFor('teacher'));
    expect(verifySuperAdminAuthMock).not.toHaveBeenCalled();
  });

  it('fails CLOSED when the super-admin check throws (e.g. missing signing secret)', async () => {
    verifySuperAdminAuthMock.mockRejectedValue(new Error('SUPER_ADMIN_JWT_SECRET is required'));
    const denied = await requirePrincipalOrSuperAdmin(
      req({ 'x-super-admin-token': 'tok' }),
      authFor('teacher'),
    );
    expect(denied!.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/** The seventeen routes that were accepting a teacher token. */
const GUARDED_ROUTES = [
  'activity',
  'astra-thread',
  'backfill-curriculum',
  'backfill-guides',
  'classrooms/[classroomId]',
  'classrooms',
  'import-students',
  'import',
  'overview',
  'reports',
  'reseed-curriculum',
  'settings',
  'students',
  'students/search',
  'teachers/[teacherId]/classrooms',
  'teachers/[teacherId]',
  'today',
];

describe('every principal-only admin route actually applies the guard', () => {
  it.each(GUARDED_ROUTES)('%s', (route) => {
    const p = join(REPO, 'app/api/montree/admin', route, 'route.ts');
    expect(existsSync(p), `${route}/route.ts is missing`).toBe(true);
    const src = readFileSync(p, 'utf8');

    expect(
      src.includes('requirePrincipalOrSuperAdmin'),
      `${route} does not import/apply requirePrincipalOrSuperAdmin`
    ).toBe(true);

    // Every handler that verifies a school session must ALSO gate on role —
    // otherwise a newly added verb silently reopens the hole.
    const verifies = (src.match(/if \(auth instanceof NextResponse\) return auth;/g) ?? []).length;
    const guards = (src.match(/await requirePrincipalOrSuperAdmin\(/g) ?? []).length;

    expect(verifies, `${route} has no verifySchoolRequest guard at all`).toBeGreaterThan(0);
    expect(
      guards,
      `${route} verifies a session ${verifies}x but only gates on role ${guards}x — ` +
        `a handler is unguarded.`
    ).toBe(verifies);
  });

  it('return-to-admin is deliberately NOT guarded (it must accept a teacher token)', () => {
    const src = readFileSync(
      join(REPO, 'app/api/montree/admin/return-to-admin/route.ts'),
      'utf8'
    );
    expect(src.includes('requirePrincipalOrSuperAdmin')).toBe(false);
    // ...but it is not ungated: it requires the actingPrincipalId claim.
    expect(src.includes('actingPrincipalId')).toBe(true);
  });
});
