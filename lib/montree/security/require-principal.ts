// lib/montree/security/require-principal.ts
//
// One guard for the principal cockpit's API surface.
//
// ── The hole this closes ─────────────────────────────────────────────────────
// Everything under /api/montree/admin/* runs verifySchoolRequest(), which proves
// the caller holds a valid session FOR SOME SCHOOL. It does not say which ROLE.
// Seventeen of those routes never checked, so an ordinary TEACHER token was
// accepted by endpoints that:
//
//   * delete classrooms and children      (classrooms, students)
//   * deactivate colleagues and reassign
//     their classrooms                    (teachers/[teacherId], .../classrooms)
//   * rewrite school settings             (settings)
//   * read school-wide analytics and
//     every classroom's roster            (reports, overview, today, activity,
//                                          students/search, classrooms/[id])
//   * bulk-import and overwrite curricula
//     and children                        (import, import-students,
//                                          backfill-curriculum, backfill-guides,
//                                          reseed-curriculum)
//   * read and rewrite the principal's
//     private Astra thread                (astra-thread)
//
// A teacher already has a legitimate login, so this needs no attack — just the
// URL. It is privilege escalation inside the school, not a cross-tenant break
// (schoolId still scopes the queries), but "any teacher can delete the school's
// children or read the principal's private notes" is not the intended model.
//
// The same reasoning, and the same fix, was already applied by hand to
// /api/montree/admin/teachers in Aug 2026; this generalises it instead of
// repeating the check seventeen more times.
//
// ── Who passes ───────────────────────────────────────────────────────────────
//   role === 'principal'  — the cockpit's own sessions. An ORG DIRECTOR who has
//                           entered one of their schools carries a principal
//                           token too (/api/montree/org/enter-school mints one),
//                           so God's-Eye access keeps working, exactly as the
//                           teachers-route fix intended.
//   super-admin headers   — the platform console operating on a school.
//
// ── Who is refused, deliberately ─────────────────────────────────────────────
//   role === 'teacher'    — including a PRINCIPAL who has stepped into one of
//                           their own classrooms (/api/montree/admin/enter-classroom
//                           mints a teacher token). That is a deliberate
//                           downscope: while holding it they are acting as a
//                           teacher. The sanctioned way back up is
//                           /api/montree/admin/return-to-admin, which is NOT
//                           guarded by this helper precisely because it must
//                           accept a teacher token — it has its own check on the
//                           actingPrincipalId claim.
//   'homeschool_parent', 'agent', 'org_admin' — none of them have a school
//                           cockpit. (agent and org_admin carry an INERT
//                           schoolId, so letting them near school-scoped writes
//                           would be actively wrong.)

import { NextRequest, NextResponse } from 'next/server';
import type { VerifiedRequest } from '@/lib/montree/verify-request';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

/**
 * Gate a principal-only admin route.
 *
 * Returns `null` when the caller may proceed, or a 403 `NextResponse` to return
 * as-is when they may not.
 *
 * Usage — immediately after verifySchoolRequest:
 *
 *     const auth = await verifySchoolRequest(request);
 *     if (auth instanceof NextResponse) return auth;
 *     const denied = await requirePrincipalOrSuperAdmin(request, auth);
 *     if (denied) return denied;
 */
export async function requirePrincipalOrSuperAdmin(
  request: NextRequest,
  auth: VerifiedRequest,
): Promise<NextResponse | null> {
  if (auth.role === 'principal') return null;

  // Only pay for the super-admin check when the caller actually presented
  // super-admin credentials — the common case is a plain principal cookie.
  const hasSuperAdminCredential =
    !!request.headers.get('x-super-admin-token') ||
    !!request.headers.get('x-super-admin-password');

  if (hasSuperAdminCredential) {
    try {
      const { valid } = await verifySuperAdminAuth(request.headers);
      if (valid) return null;
    } catch (e) {
      // Never let a misconfigured super-admin secret turn into an open door.
      console.error('[requirePrincipalOrSuperAdmin] super-admin check failed:', e);
    }
  }

  return NextResponse.json(
    {
      error: 'This action is restricted to the school principal.',
      code: 'principal_only',
    },
    { status: 403 },
  );
}
