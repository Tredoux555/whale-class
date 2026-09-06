// /api/montree/auth/me/route.ts
// Session recovery: validates httpOnly cookie and returns session data.
// Used when localStorage is cleared but cookie is still valid (e.g., PWA relaunch on iOS).
//
// ── SLIDING REFRESH (Sep 2026) ───────────────────────────────────────────────
// Every Montree surface calls this route on load, which makes it the one place
// that reliably sees an active session — so it is where the session gets
// renewed. If the current token is more than REFRESH_AFTER_DAYS old, a fresh one
// is minted and the cookie re-set, with the full TTL again.
//
// This is what makes a SHORT MONTREE_JWT_TTL_DAYS safe to adopt. Today the TTL
// is 3650 days (≈10 years) on purpose — a teacher on their own classroom device
// must never be logged out mid-class — but the price is a credential that cannot
// expire and, until migration 351, could not be revoked either. With sliding
// refresh in place, anyone who opens the app at all keeps their session alive
// indefinitely, so the TTL only ever bites on a device that has been UNUSED for
// the whole window. That converts the TTL from "how long until a teacher is
// locked out" into "how long a stolen device stays useful", which is the number
// that actually matters.
//
// 🚨 The TTL default is deliberately NOT changed here. Shortening it is a
// product decision with a real classroom cost (a school holiday can easily
// exceed 30 days of non-use), and it is one environment variable —
// MONTREE_JWT_TTL_DAYS — whenever that call is made. See
// docs/handoffs/SECURITY_FIXES_2026-09-07.md.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import {
  createMontreeToken,
  setMontreeAuthCookie,
  MONTREE_JWT_TTL_DAYS,
} from '@/lib/montree/server-auth';
import { getSupabase } from '@/lib/supabase-client';

/**
 * Re-mint a session once it is this many days old. Capped at a quarter of the
 * TTL so the refresh always lands comfortably inside the token's own lifetime
 * (with a 30-day TTL that is every 7 days; with the current 3650-day TTL the
 * 7-day floor applies, which simply means an active session is always fresh).
 */
const REFRESH_AFTER_DAYS = Math.max(1, Math.min(7, MONTREE_JWT_TTL_DAYS / 4));

/**
 * Should this token be renewed? True once it is older than REFRESH_AFTER_DAYS.
 * A token with no readable iat is left alone — never renewed on a guess.
 */
function shouldRefresh(iat: number | undefined): boolean {
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return false;
  const ageDays = (Date.now() / 1000 - iat) / 86_400;
  return ageDays >= REFRESH_AFTER_DAYS;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { userId, schoolId, classroomId, role } = auth;
  // Phase 6b ("God's Eye") — when an organisation director has stepped into one of their
  // schools, the principal cockpit needs to know so it can say so. The claim is carried on
  // the signed token; this is the only place the client can learn about it, because the
  // cockpit layout already treats auth/me as the single authority on the session.
  const actingOrgAdminId = auth.actingOrgAdminId ?? null;
  // Same idea one level down — a PRINCIPAL has stepped into one of their own classrooms
  // (POST /api/montree/admin/enter-classroom) and is holding a teacher session. The teacher
  // dashboard needs to know so it can say so and offer the way back. Read from the signed
  // token, never from localStorage: a banner claiming somebody is looking through a teacher's
  // seat must not be forgeable by editing a browser store, in either direction.
  const actingPrincipalId = auth.actingPrincipalId ?? null;

  try {
    const supabase = getSupabase();

    // Fetch teacher + principal-admin + school + classroom in parallel.
    // A principal of a school may have NO montree_teachers row (the principal
    // signup path creates only a montree_school_admins row). Looking up BOTH
    // is what makes auth/me authoritative for principals — without the admin
    // lookup, /admin/conversations and other principal surfaces mis-resolve
    // the role (handoff bug #6).
    const [teacherRes, adminRes, schoolRes, classroomRes] = await Promise.all([
      supabase.from('montree_teachers').select('id, name, email, role').eq('id', userId).maybeSingle(),
      supabase.from('montree_school_admins').select('id, name, email, role').eq('id', userId).eq('school_id', schoolId).maybeSingle(),
      supabase.from('montree_schools').select('id, name, slug, plan_type, locked_at, founding_member').eq('id', schoolId).maybeSingle(),
      classroomId
        ? supabase.from('montree_classrooms').select('id, name, age_group, school_id').eq('id', classroomId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Authenticated if the school exists AND the user is EITHER a teacher OR a
    // school admin of it. (Was: teacher-only — which 401'd every pure principal.)
    if (!schoolRes.data || (!teacherRes.data && !adminRes.data)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Effective session role. A montree_school_admins row means principal;
    // otherwise fall back to the teacher row's role, then the JWT role.
    const effectiveRole: string = adminRes.data
      ? (adminRes.data.role || 'principal')
      : (teacherRes.data?.role || role);

    // Identity block. Named `teacher` for backward-compat with existing
    // consumers that read meData.teacher.id; for a pure principal it carries
    // the school-admin identity instead. `role` is ALWAYS `effectiveRole` so
    // it agrees with the top-level `role` — otherwise a founder-principal
    // (has BOTH a teacher row and an admin row) would get `role:'principal'`
    // at top level but `teacher.role:'teacher'`, and recoverSession() — which
    // builds the session from `teacher` — would see the wrong role.
    const identity = teacherRes.data
      ? {
          id: teacherRes.data.id,
          name: teacherRes.data.name,
          role: effectiveRole,
          email: teacherRes.data.email,
        }
      : {
          id: adminRes.data!.id,
          name: adminRes.data!.name,
          role: effectiveRole,
          email: adminRes.data!.email,
        };

    // Security: verify classroom belongs to the authenticated school
    // Prevents cross-school data leakage if token contains a mismatched classroomId
    let classroom: { id: string; name: string; age_group: string | null } | null = null;
    if (classroomRes.data) {
      if (classroomRes.data.school_id === schoolId) {
        // Only expose the fields the client needs (omit internal school_id).
        classroom = { id: classroomRes.data.id, name: classroomRes.data.name, age_group: classroomRes.data.age_group };
      } else {
        console.warn(`[auth/me] Classroom ${classroomId} does not belong to school ${schoolId} — clearing`);
      }
    }

    // ── Sliding refresh ─────────────────────────────────────────────────────
    // 🚨 NEVER refresh a BORROWED seat. /api/montree/org/enter-school and
    // /api/montree/admin/enter-classroom mint deliberately SHORT-lived (8h)
    // tokens carrying acting claims; re-minting one at the house TTL would
    // launder a temporary, supervised seat into a permanent session. Those
    // sessions are meant to lapse. Everything else — a real teacher, a real
    // principal, a homeschool parent on their own device — is renewed.
    const isBorrowedSeat = Boolean(
      auth.actingPrincipalId || auth.actingOrgAdminId || auth.actingAsSuperAdmin,
    );
    const wantsRefresh = !isBorrowedSeat && shouldRefresh(auth.iat);

    const payload = {
      authenticated: true,
      // Top-level session role — the authoritative "what am I logged in as"
      // signal. Principal surfaces (e.g. /admin/conversations) gate on this.
      role: effectiveRole,
      // Abuse lock (migration 286). Belt-and-suspenders for already-authenticated
      // sessions: auth/unified refuses login for locked schools, but a session
      // established BEFORE the lock keeps working until its consumers re-check.
      // The admin layout + teacher dashboard bounce to /montree/locked when true.
      locked: Boolean(schoolRes.data.locked_at),
      lockedSchoolId: schoolRes.data.locked_at ? schoolRes.data.id : undefined,
      teacher: identity,
      school: schoolRes.data,
      classroom,
      // Present ONLY on a session minted by /api/montree/org/enter-school. Informational —
      // the cockpit renders the "Organisation view" banner and its Return button from it.
      // Never a permission: this session is scoped to `schoolId` like any other principal's.
      // `acting` is present when EITHER hop is in play: an organisation director inside a
      // school (orgAdminId), a principal inside a classroom (principalId), or both at once
      // when a director stepped all the way down. Each consumer reads only the key it cares
      // about — the admin cockpit gates its banner on orgAdminId, the teacher dashboard on
      // principalId — so a session carrying both renders the right banner on whichever
      // surface it is standing.
      acting: actingOrgAdminId || actingPrincipalId
        ? {
            orgAdminId: actingOrgAdminId,
            organizationId: auth.actingOrganizationId ?? null,
            principalId: actingPrincipalId,
          }
        : null,
    };

    const response = NextResponse.json(payload);

    if (wantsRefresh) {
      try {
        const fresh = await createMontreeToken({
          sub: userId,
          schoolId,
          classroomId,
          role,
          organizationId: auth.organizationId,
        });
        setMontreeAuthCookie(
          response,
          fresh,
          role as 'teacher' | 'principal' | 'homeschool_parent' | 'agent' | 'org_admin',
        );
      } catch (e) {
        // A failed refresh must never break session recovery — the caller's
        // existing token is still perfectly valid, it just stays as old as it
        // was and will be retried on the next load.
        console.error('[auth/me] session refresh failed (session unaffected):', e);
      }
    }

    return response;
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
