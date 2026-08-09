// app/api/montree/admin/enter-classroom/route.ts
//
// POST — a principal steps INTO one of their own classrooms and sees exactly what that
// classroom's teacher sees. One level below /api/montree/org/enter-school, and deliberately
// built to the same shape.
//
// { classroomId } → a teacher-shaped montree-auth cookie for that classroom + redirect
// /montree/dashboard.
//
// ── Why this exists ───────────────────────────────────────────────────────────────────────
// A principal supporting a teacher ("where is the Confirm button?", "why is her report
// empty?") could previously only look at aggregate cockpit views, or ask the teacher for
// their login code. Asking for the code is the bad outcome this closes: a shared credential
// outlives the conversation, cannot be attributed, and cannot be withdrawn. This route hands
// the principal the real teacher experience for eight hours and writes down that it did.
//
// ── The scope check is the whole route ────────────────────────────────────────────────────
// classroomId arrives from the client, so it is an unverified claim: the classroom is loaded
// and its school_id must equal the schoolId on the caller's own signed token. Anything else
// is a hard 403 — never a redirect, never a silent no-op. A principal cannot reach a
// classroom outside their school even knowing its id.
//
// ── What the minted token is, and what it is not ──────────────────────────────────────────
// It is an ORDINARY teacher token — role 'teacher', that classroom's id, `sub` set to a REAL
// montree_teachers row of that classroom (load-bearing; see resolveTeacherRow()) — with two
// differences from a real teacher's:
//
//   • A SHORT TTL (8 hours). A principal inside a classroom has FULL teacher powers: they can
//     confirm photos, write observations, send parent reports. Precisely because those powers
//     are real and land in a teacher's name, the session that carries them must not be the
//     effectively-permanent 10-year token a teacher holds on their own device. It is a
//     borrowed seat, not a home device; when it lapses the principal clicks again. This is the
//     one revocation lever an otherwise-unrevocable JWT scheme has.
//   • Acting claims (actingPrincipalId, plus any org / super-admin claims PRESERVED from the
//     incoming principal token) that carry the way back and let the dashboard render an honest
//     banner. They grant nothing — every teacher route scopes on schoolId/classroomId exactly
//     as it always did.
//
// ── Why the principal's own row is not re-read here ───────────────────────────────────────
// actingPrincipalId is written straight from the verified session's `sub`. The row it names is
// re-verified on the way back (/api/montree/admin/return-to-admin re-reads it, scoped to the
// school, and refuses an inactive one) — which is the hop that MINTS authority, and therefore
// the hop that must not trust a claim. Checking it again here would only change when a
// deleted-mid-session principal learns the bad news, at the cost of a query on every entry.
//
// ── Why there is no rate limit ────────────────────────────────────────────────────────────
// House posture: credential endpoints (login, register) are metered because an anonymous
// attacker can hammer them. This one requires a live principal session that was already
// established through a metered door, and it can only ever reach classrooms the caller
// already owns. It is audit-logged isSensitive instead, like every other impersonation path.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

/** Where a teacher session lands. Matches setMontreeAuthCookie's own surface hint. */
const TEACHER_HOME = '/montree/dashboard';

/**
 * How long a borrowed teacher seat lasts. 8 hours — long enough to sit beside a teacher for a
 * full working day, short enough that a walked-away session lapses on its own. Same number and
 * same reasoning as ENTER_SCHOOL_TTL_SECONDS in /api/montree/org/enter-school; if one moves,
 * move both.
 */
const ENTER_CLASSROOM_TTL_SECONDS = 8 * 60 * 60;

/** A well-formed UUID. classroomId arrives from the client, so a malformed one must be
 *  rejected BEFORE it reaches Postgres — an invalid uuid raises 22P02, which would surface as
 *  a 500 and leak that "this id is shaped wrong" apart from the deliberately-identical
 *  not-yours 403. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TeacherRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

/**
 * Which montree_teachers row this session should BE.
 *
 * 🚨 The decision this route turns on, and the exact mirror of resolvePrincipalRow() in
 * /api/montree/org/enter-school. A Montree teacher token's `sub` is not decoration — the
 * teacher surfaces resolve it against montree_teachers:
 *
 *   • /api/montree/auth/me returns authenticated:false unless `sub` is a teacher row OR a
 *     school-admin row of that school. The dashboard gates its whole body on that call, so a
 *     token with a `sub` that resolves to nothing renders an empty shell.
 *   • montree_teacher_notes.teacher_id, montree_meeting_notes.teacher_id and the teacher
 *     settings blob (settings.menu, which drives the More menu) all hang off a real row —
 *     an invented id would fail the insert or render a menu-less shell.
 *
 * So the token must point at a real row, and the ONLY correct row is one that already belongs
 * to the target classroom. Using the principal's own montree_school_admins id was never an
 * option: it is a different table, it satisfies none of the above, and the dashboard would
 * look broken while the principal stood in it.
 *
 * Preference order, and the fallback:
 *   1. The active LEAD teacher (oldest first, when a classroom has several). This is the
 *      person whose experience the principal is actually trying to see.
 *   2. Any other ACTIVE teacher row for the classroom (assistant, unset role). auth/me
 *      reports its role honestly and the dashboard renders that teacher's own menu.
 *   3. Nothing → a clean 409 that names the problem. Deliberately NOT a shadow row:
 *      fabricating a montree_teachers row would spawn a phantom colleague in the school's own
 *      teacher list, in its parent-facing report bylines, and in its login-code screen — a
 *      different thing from acting as an existing teacher. A classroom with no teacher yet is
 *      an ordinary state right after setup; the honest answer there is "add a teacher first".
 */
function resolveTeacherRow(rows: TeacherRow[]): TeacherRow | null {
  const active = rows.filter((r) => r.is_active !== false);
  const byAge = (a: TeacherRow, b: TeacherRow) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));

  const leads = active.filter((r) => r.role === 'lead_teacher').sort(byAge);
  if (leads.length) return leads[0];

  const anyTeacher = active.slice().sort(byAge);
  return anyTeacher.length ? anyTeacher[0] : null;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Only a principal. A teacher already IS a teacher, and an assistant must not be able to
  // borrow a colleague's seat — the same authority line /api/montree/admin/teachers draws
  // around its credential-minting verbs. An organisation director acting through a school
  // carries role 'principal' (enter-school mints a principal token), so a God's-Eye director
  // passes this gate exactly like a real principal — that is intended, and their provenance
  // rides along on the claims preserved below.
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only a principal can enter a classroom.', code: 'not_principal' },
      { status: 403 },
    );
  }

  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  const body = await request.json().catch(() => ({}));
  const classroomId = typeof (body as { classroomId?: unknown }).classroomId === 'string'
    ? (body as { classroomId: string }).classroomId.trim()
    : '';

  if (!classroomId) {
    return NextResponse.json({ error: 'classroomId is required.' }, { status: 400 });
  }

  // A malformed id is not a real classroom in this school → the SAME answer an out-of-scope
  // real id gets, so this route never distinguishes "wrong shape" from "not yours".
  if (!UUID_RE.test(classroomId)) {
    return NextResponse.json(
      { error: 'That classroom is not part of your school.', code: 'out_of_scope' },
      { status: 403 },
    );
  }

  // ── 1. The classroom, and the scope check ───────────────────────────────────────────────
  const { data: classroom, error: classroomErr } = await supabase
    .from('montree_classrooms')
    .select('id, name, icon, school_id, is_active')
    .eq('id', classroomId)
    .maybeSingle();

  if (classroomErr) {
    console.error('[montree-admin] enter-classroom lookup failed:', classroomErr);
    return NextResponse.json({ error: 'Could not open that classroom.' }, { status: 500 });
  }

  // A classroom in another school and a classroom that does not exist get the SAME answer.
  // Anything else turns this endpoint into a probe for which classroom ids are real.
  if (!classroom || (classroom as { school_id: string | null }).school_id !== auth.schoolId) {
    await logAudit(supabase, {
      adminIdentifier: auth.userId,
      action: 'principal_enter_classroom_denied',
      resourceType: 'classroom',
      resourceId: classroomId,
      resourceDetails: { schoolId: auth.schoolId, reason: 'out_of_scope' },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });
    return NextResponse.json(
      { error: 'That classroom is not part of your school.', code: 'out_of_scope' },
      { status: 403 },
    );
  }

  // A soft-removed classroom (is_active false) still has rows hanging off it, but no teacher
  // is working in it — stepping in would show a frozen room and confuse the support call this
  // route exists for. Only an explicit false counts; older rows carry null.
  if ((classroom as { is_active: boolean | null }).is_active === false) {
    return NextResponse.json(
      { error: 'That classroom has been removed.', code: 'classroom_removed' },
      { status: 409 },
    );
  }

  // ── 2. Whose seat the principal sits in ─────────────────────────────────────────────────
  // Scoped by school_id as well as classroom_id: a stray teacher row pointing at this
  // classroom from another school must never become the seat.
  const { data: teacherRows, error: teacherErr } = await supabase
    .from('montree_teachers')
    .select('id, name, email, role, is_active, created_at')
    .eq('classroom_id', classroomId)
    .eq('school_id', auth.schoolId);

  if (teacherErr) {
    console.error('[montree-admin] enter-classroom teacher lookup failed:', teacherErr);
    return NextResponse.json({ error: 'Could not open that classroom.' }, { status: 500 });
  }

  const seat = resolveTeacherRow(((teacherRows ?? []) as unknown) as TeacherRow[]);
  if (!seat) {
    return NextResponse.json(
      {
        error: 'This classroom has no teacher yet — add a teacher first.',
        code: 'no_teacher',
      },
      { status: 409 },
    );
  }

  // ── 3. The session ──────────────────────────────────────────────────────────────────────
  // 🚨 The org / super-admin claims are PRESERVED, not dropped. If an organisation director
  // (or a super-admin looking through one) is standing in this school, the teacher session
  // they mint by entering a classroom must keep saying so — otherwise the provenance launders
  // away one level down, and return-to-admin would hand them back a plain principal session
  // with no way home to the organisation. They flow enter → (teacher) → return → (principal)
  // → return-to-org → (org) intact.
  const token = await createMontreeToken(
    {
      sub: seat.id,
      schoolId: auth.schoolId,
      classroomId: classroom.id,
      role: 'teacher',
      actingPrincipalId: auth.userId,
      ...(auth.actingOrgAdminId ? { actingOrgAdminId: auth.actingOrgAdminId } : {}),
      ...(auth.actingOrganizationId ? { actingOrganizationId: auth.actingOrganizationId } : {}),
      ...(auth.actingAsSuperAdmin ? { actingAsSuperAdmin: true } : {}),
    },
    // 🚨 SHORT-LIVED (8h), unlike the ~10-year token a real teacher holds. A principal's
    // powers inside a classroom are full, so the borrowed session must expire on its own —
    // see the note at the top of this file. The principal re-enters when it lapses.
    { ttlSeconds: ENTER_CLASSROOM_TTL_SECONDS },
  );

  await logAudit(supabase, {
    adminIdentifier: auth.userId,
    action: 'principal_entered_classroom',
    resourceType: 'classroom',
    resourceId: classroom.id,
    resourceDetails: {
      schoolId: auth.schoolId,
      classroomName: (classroom as { name: string | null }).name,
      seatTeacherId: seat.id,
      seatTeacherName: seat.name,
      seatRole: seat.role,
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
      classroom: { id: classroom.id, name: (classroom as { name: string | null }).name },
      teacher: { id: seat.id, name: seat.name },
      redirect: TEACHER_HOME,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  // 'teacher' so the PWA launch hint points at the dashboard while they are in there. The
  // return route sets it back to the cockpit.
  //
  // 🚨 The cookie is given the SAME 8-hour life as the token it carries. Without that it would
  // outlive the token by ten years, and a principal returning to a lapsed seat would be 401'd
  // by every route — including return-to-admin — while still holding a cookie that overwrote
  // their own principal session. Expiring together turns that into a plain logged-out state.
  setMontreeAuthCookie(response, token, 'teacher', {
    maxAgeSeconds: ENTER_CLASSROOM_TTL_SECONDS,
  });
  return response;
}
