// app/api/montree/admin/return-to-admin/route.ts
//
// POST — the way back out of a classroom. The other half of
// /api/montree/admin/enter-classroom.
//
// No body. Everything it needs is on the caller's own signed token: actingPrincipalId (the
// montree_school_admins row to become again) and schoolId (the school to become it in — a
// principal can only ever enter their OWN classrooms, so the school never changes across the
// round trip). Both were written by enter-classroom after that route had already verified the
// principal; they cannot be supplied, only carried.
//
// ── Why this is not just "log in again" ───────────────────────────────────────────────────
// A principal inside one of their classrooms is holding a TEACHER cookie. Signing back into
// the cockpit by hand would mean finding /montree/login-select and typing a code — a dead end
// at the exact moment they want to step back out. This route swaps the cookie in place.
//
// ── The re-verification, and why it is not optional ───────────────────────────────────────
// The claim proves the session was minted by a principal. It does NOT prove that principal
// still exists, is still active, or still belongs to that school. The borrowed teacher token
// is short-lived (8h) but even inside that window a principal can be deactivated, so every one
// of those is re-read here before a cockpit session is minted. Same reasoning as
// /api/montree/org/return-to-org.
//
// Never breaks anything: a teacher token with no acting claim — which is every ordinary
// teacher in the product — gets a clean 403 and nothing changes.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

const PRINCIPAL_HOME = '/montree/admin';

/**
 * TTL for the cockpit session handed back to a principal who was THEMSELVES borrowing that
 * seat — an organisation director who entered this school (8h, ENTER_SCHOOL_TTL_SECONDS) and
 * then stepped one level further into a classroom. Returning must not launder their borrowed
 * 8-hour seat into the effectively-permanent token a real principal holds; they get the same
 * window back. A REAL principal (no org claims) gets the house default, because it is their
 * own account and their own device.
 */
const BORROWED_PRINCIPAL_TTL_SECONDS = 8 * 60 * 60;

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const principalId = auth.actingPrincipalId;

  if (!principalId) {
    return NextResponse.json(
      { error: 'This session did not come from the principal view.', code: 'not_acting' },
      { status: 403 },
    );
  }

  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  // The principal row must still exist AND still belong to the school named on the token.
  // Scoping the lookup by school_id as well as id means a claim can never walk a session into
  // a different school, whatever else went wrong upstream.
  const { data: admin, error: adminErr } = await supabase
    .from('montree_school_admins')
    .select('id, name, email, role, is_active, school_id')
    .eq('id', principalId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  if (adminErr) {
    console.error('[montree-admin] return-to-admin principal lookup failed:', adminErr);
    return NextResponse.json({ error: 'Could not return to your school.' }, { status: 500 });
  }
  if (!admin || (admin as { is_active: boolean | null }).is_active === false) {
    return NextResponse.json(
      { error: 'That principal account is no longer active.', code: 'principal_gone' },
      { status: 403 },
    );
  }

  // A principal token again. The enter→return-specific claim (actingPrincipalId) is
  // deliberately dropped — the way back has been taken. The ORG claims are PRESERVED: if an
  // organisation director entered this school and then a classroom, returning to the cockpit
  // must land them back in the organisation-view cockpit, banner and all, with the way out to
  // /montree/org still on the token.
  const borrowedSeat = Boolean(auth.actingOrgAdminId);
  const token = await createMontreeToken(
    {
      sub: admin.id,
      schoolId: auth.schoolId,
      role: 'principal',
      ...(auth.actingOrgAdminId ? { actingOrgAdminId: auth.actingOrgAdminId } : {}),
      ...(auth.actingOrganizationId ? { actingOrganizationId: auth.actingOrganizationId } : {}),
      ...(auth.actingAsSuperAdmin ? { actingAsSuperAdmin: true } : {}),
    },
    borrowedSeat ? { ttlSeconds: BORROWED_PRINCIPAL_TTL_SECONDS } : undefined,
  );

  await logAudit(supabase, {
    adminIdentifier: admin.id,
    action: 'principal_returned_to_admin',
    resourceType: 'classroom',
    resourceId: auth.classroomId || undefined,
    resourceDetails: {
      schoolId: auth.schoolId,
      fromTeacherId: auth.userId,
      viaOrgAdmin: auth.actingOrgAdminId || undefined,
      viaSuperAdmin: auth.actingAsSuperAdmin || undefined,
    },
    ipAddress: ip,
    userAgent,
    isSensitive: true,
  });

  const response = NextResponse.json(
    {
      success: true,
      principal: { id: admin.id, name: (admin as { name: string | null }).name },
      redirect: PRINCIPAL_HOME,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  // The cookie tracks whatever TTL the token above got: a borrowed cockpit (a director who had
  // stepped down into a classroom) gets 8 hours on both, a real principal on their own device
  // gets the house default on both. 'principal' also re-points the PWA launch hint at the
  // cockpit, undoing the 'teacher' hint enter-classroom set on the way in.
  setMontreeAuthCookie(
    response,
    token,
    'principal',
    borrowedSeat ? { maxAgeSeconds: BORROWED_PRINCIPAL_TTL_SECONDS } : undefined,
  );
  return response;
}
