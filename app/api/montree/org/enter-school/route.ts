// app/api/montree/org/enter-school/route.ts
//
// POST — an organisation director steps INTO one of their own schools and sees exactly what
// that school's principal sees. "God's Eye" (Phase 6b).
//
// { schoolId } → a principal-shaped montree-auth cookie for that school + redirect /montree/admin.
//
// ── The scope check is the whole route ────────────────────────────────────────────────────
// schoolId arrives from the client, so it is treated as an unverified claim: the school is
// loaded and its organization_id must equal the organizationId on the caller's JWT, which
// verifyOrgRequest re-derived from the database on this very request. Anything else is a hard
// 403 — never a redirect, never a silent no-op. A director cannot reach a school outside their
// organisation even knowing its id, and a director whose organisation was deleted cannot reach
// anything at all (verifyOrgRequest already refuses them).
//
// ── What the minted token is, and what it is not ──────────────────────────────────────────
// It is an ORDINARY principal token — role 'principal', that school's id, `sub` set to a REAL
// montree_school_admins row of that school (load-bearing; see resolvePrincipalRow()) — with
// two differences from a real principal's:
//
//   • A SHORT TTL (8 hours). A director gets FULL principal powers while inside a school — read
//     and write, reset codes, toggle features, everything. Precisely because those powers are
//     real, the session that carries them must not be the effectively-permanent 10-year token
//     a real principal holds on their own device: it is a borrowed seat, not a home device, and
//     when it lapses the director simply clicks "Enter school" again. This is the one
//     revocation lever an otherwise-unrevocable JWT scheme has.
//   • Acting claims (actingOrgAdminId / actingOrganizationId, and actingAsSuperAdmin PRESERVED
//     from the incoming org token) that carry the way back and let the cockpit render an honest
//     banner. They grant nothing — every principal route scopes on schoolId as it always did.
//
// ── Why there is no rate limit ────────────────────────────────────────────────────────────
// House posture: credential endpoints (login, register) are metered because an anonymous
// attacker can hammer them. This one requires a live org_admin session that was already
// established through a metered door, and it can only ever reach schools the caller already
// owns. It is audit-logged isSensitive instead, like every other impersonation path.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import {
  isOrgMigrationPending, orgMigrationPending, verifyOrgRequest,
} from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

/** Where a principal session lands. Matches setMontreeAuthCookie's own surface hint. */
const PRINCIPAL_HOME = '/montree/admin';

/**
 * How long a borrowed principal seat lasts. 8 hours — long enough to be inside a school for a
 * full working day, short enough that a walked-away session lapses on its own. The director
 * re-clicks "Enter school" to get another. This is the effective revocation window for a token
 * scheme that is otherwise non-revocable.
 */
const ENTER_SCHOOL_TTL_SECONDS = 8 * 60 * 60;

/** A well-formed UUID. schoolId arrives from the client, so a malformed one must be rejected
 *  BEFORE it reaches Postgres — an invalid uuid raises 22P02, which would surface as a 500 and
 *  leak that "this id is shaped wrong" apart from the deliberately-identical not-yours 403. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AdminRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

/**
 * Which montree_school_admins row this session should BE.
 *
 * 🚨 The decision this route turns on. A Montree principal token's `sub` is not decoration —
 * a meaningful number of principal surfaces resolve it against montree_school_admins:
 *
 *   • /api/montree/auth/me returns authenticated:false unless `sub` is a teacher row OR a
 *     school-admin row of that school. The principal cockpit layout gates its whole body on
 *     that call, so a token with a `sub` that resolves to nothing renders an empty shell.
 *   • /api/montree/admin/principal-agent (Astra) hard-403s unless `sub` is an ACTIVE principal
 *     row in that school.
 *   • montree_meeting_notes.principal_id, montree_parent_meetings.principal_id,
 *     montree_principal_memory.principal_id and montree_conversations.principal_id are all
 *     foreign keys to montree_school_admins — an invented id would fail the insert.
 *
 * So the token must point at a real row, and the ONLY correct row is one that already belongs
 * to the target school. Using the org admin's own id was never an option: it is a
 * montree_organization_admins id, it satisfies none of the above, and the cockpit would look
 * broken while the director stood in it.
 *
 * Preference order, and the fallback:
 *   1. The active PRINCIPAL row (oldest first — the founder, when a school has several).
 *      This is what every school registered through an organisation invite has, because
 *      /api/montree/org/register-school creates exactly one.
 *   2. Any other ACTIVE admin row for the school (e.g. role 'admin'). auth/me accepts it and
 *      reports its role honestly; Astra will decline, which is the correct outcome for a
 *      school that genuinely has no principal.
 *   3. Nothing → a clean 409 that names the problem. Deliberately NOT a shadow row: inventing
 *      a montree_school_admins row would put a fake principal into the school's own
 *      /api/montree/admin/today header and into its teacher-facing surfaces. A director wields
 *      FULL principal powers inside a school (read AND write — resetting codes, editing rosters,
 *      toggling features), so the seat must be a REAL admin row that already belongs there;
 *      fabricating one would spawn a phantom person in somebody's school, which is a different
 *      thing from acting as an existing principal. A school with no admin row at all is the
 *      teacher-led /try/instant shape; the honest answer there is "there is no principal account
 *      to act through yet".
 */
function resolvePrincipalRow(rows: AdminRow[]): AdminRow | null {
  const active = rows.filter((r) => r.is_active !== false);
  const byAge = (a: AdminRow, b: AdminRow) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));

  const principals = active.filter((r) => r.role === 'principal').sort(byAge);
  if (principals.length) return principals[0];

  const anyAdmin = active.slice().sort(byAge);
  return anyAdmin.length ? anyAdmin[0] : null;
}

export async function POST(request: NextRequest) {
  const opened = await verifyOrgRequest(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;

  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  const body = await request.json().catch(() => ({}));
  const schoolId = typeof (body as { schoolId?: unknown }).schoolId === 'string'
    ? (body as { schoolId: string }).schoolId.trim()
    : '';

  if (!schoolId) {
    return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
  }

  // A malformed id is not a real school this director owns → the SAME answer an out-of-scope
  // real id gets, so this route never distinguishes "wrong shape" from "not yours". Without
  // this, a non-uuid would reach Postgres, raise 22P02, and surface as a 500 — a distinguishable
  // signal that defeats the identical-answer intent.
  if (!UUID_RE.test(schoolId)) {
    return NextResponse.json(
      { error: 'That school is not part of your organization.', code: 'out_of_scope' },
      { status: 403 },
    );
  }

  // ── 1. The school, and the scope check ──────────────────────────────────────────────────
  const { data: school, error: schoolErr } = await supabase
    .from('montree_schools')
    .select('id, name, slug, organization_id, locked_at')
    .eq('id', schoolId)
    .maybeSingle();

  if (schoolErr) {
    if (isOrgMigrationPending(schoolErr)) return orgMigrationPending(schoolErr.message);
    console.error('[montree-org] enter-school lookup failed:', schoolErr);
    return NextResponse.json({ error: 'Could not open that school.' }, { status: 500 });
  }

  // A school outside the organisation and a school that does not exist get the SAME answer.
  // Anything else turns this endpoint into a probe for which school ids are real.
  if (!school || (school as { organization_id: string | null }).organization_id !== ctx.organizationId) {
    await logAudit(supabase, {
      adminIdentifier: ctx.adminId,
      action: 'org_enter_school_denied',
      resourceType: 'school',
      resourceId: schoolId,
      resourceDetails: { organizationId: ctx.organizationId, reason: 'out_of_scope' },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });
    return NextResponse.json(
      { error: 'That school is not part of your organization.', code: 'out_of_scope' },
      { status: 403 },
    );
  }

  // A locked school (migration 286) refuses every role at the door; minting a session for one
  // would only bounce the director to /montree/locked with a confusing school on the screen.
  if ((school as { locked_at: string | null }).locked_at) {
    return NextResponse.json(
      { error: 'That school is locked. Montree support can tell you why.', code: 'school_locked' },
      { status: 403 },
    );
  }

  // ── 2. Whose seat the director sits in ──────────────────────────────────────────────────
  const { data: adminRows, error: adminErr } = await supabase
    .from('montree_school_admins')
    .select('id, name, email, role, is_active, created_at')
    .eq('school_id', schoolId);

  if (adminErr) {
    console.error('[montree-org] enter-school admin lookup failed:', adminErr);
    return NextResponse.json({ error: 'Could not open that school.' }, { status: 500 });
  }

  const seat = resolvePrincipalRow(((adminRows ?? []) as unknown) as AdminRow[]);
  if (!seat) {
    return NextResponse.json(
      {
        error:
          'That school has no principal account yet, so there is no principal view to open. ' +
          'Ask them to finish setting up, or invite a principal to it.',
        code: 'no_principal',
      },
      { status: 409 },
    );
  }

  // ── 3. The session ──────────────────────────────────────────────────────────────────────
  // 🚨 actingAsSuperAdmin is PRESERVED, not dropped: if a super-admin is viewing this org (the
  // org token they hold already carries the claim, surfaced by verifyOrgRequest as
  // ctx.actingAsSuperAdmin), then the principal session they mint by entering a school must keep
  // saying so — otherwise the provenance laundered away the moment they stepped one level down,
  // and return-to-org would hand them back a plain director session with no trace they were ever
  // super-admin. It flows enter → (principal) → return → (org) intact.
  const token = await createMontreeToken(
    {
      sub: seat.id,
      schoolId: school.id,
      role: 'principal',
      actingOrgAdminId: ctx.adminId,
      actingOrganizationId: ctx.organizationId,
      ...(ctx.actingAsSuperAdmin ? { actingAsSuperAdmin: true } : {}),
    },
    // 🚨 SHORT-LIVED (8h), unlike the ~10-year token a real principal holds. A director's powers
    // inside a school are full, so the borrowed session must expire on its own — see the note at
    // the top of this file. The director re-enters when it lapses.
    { ttlSeconds: ENTER_SCHOOL_TTL_SECONDS },
  );

  await logAudit(supabase, {
    adminIdentifier: ctx.adminId,
    action: 'org_enter_school',
    resourceType: 'school',
    resourceId: school.id,
    resourceDetails: {
      organizationId: ctx.organizationId,
      organizationName: ctx.organizationName,
      schoolName: (school as { name: string | null }).name,
      seatAdminId: seat.id,
      seatRole: seat.role,
      viaSuperAdmin: ctx.actingAsSuperAdmin || undefined,
    },
    ipAddress: ip,
    userAgent,
    isSensitive: true,
  });

  const response = NextResponse.json(
    {
      success: true,
      school: { id: school.id, name: (school as { name: string | null }).name, slug: (school as { slug: string | null }).slug },
      redirect: PRINCIPAL_HOME,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  // 'principal' so the PWA launch hint points at the cockpit while they are in there. The
  // return route sets it back to the organisation.
  setMontreeAuthCookie(response, token, 'principal');
  return response;
}
