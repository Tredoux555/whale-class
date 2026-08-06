// app/api/montree/super-admin/organizations/[id]/view-as/route.ts
//
// POST — the platform owner looks at an organisation's dashboard through its own eyes.
//
// Mints an org_admin montree-auth cookie for the organisation in the path, carrying the extra
// claim actingAsSuperAdmin so /montree/org can say, permanently and unmissably, whose seat is
// being sat in. The client then navigates to /montree/org.
//
// ── Why this rather than the existing login-as ────────────────────────────────────────────
// /api/montree/super-admin/login-as returns a principal + school JSON blob and lets the client
// build a session; it predates the httpOnly-cookie posture. Anything new mints the cookie
// SERVER-SIDE — the browser never handles a token — which is also the only way the acting
// claim can be trusted, since it is signed into the JWT rather than kept in a store the client
// can edit.
//
// ── What it does NOT do ───────────────────────────────────────────────────────────────────
// It does not need, and never reads, a director's password or login code. Impersonation by
// borrowing somebody's actual credential is the pattern this replaces: the platform owner is
// already the platform owner, and an audit line that says "super_admin viewed org X" is more
// honest than one that cannot tell that apart from the director signing in themselves.
//
// The session it mints is scoped to that ONE organisation, exactly like a director's. Every
// /api/montree/org/* route re-derives the organisation from the JWT and filters on it, so this
// grants nothing beyond what a director of that organisation could already do.
//
// Audit-logged isSensitive, matching /api/montree/super-admin/login-as — the two are the same
// kind of act. Rate-limited fail-CLOSED but keyed on the AUTHENTICATED identity and applied only
// AFTER the super-admin gate, so anonymous traffic can neither trip it nor lock the owner out.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

const ORG_HOME = '/montree/org';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  // 🚨 Auth FIRST, rate-limit SECOND (audit fix): metering before authenticating lets anonymous
  // traffic burn the shared bucket for this endpoint and lock the platform owner out of his own
  // tool. Now an unauthenticated request is rejected before it ever touches the limiter, and the
  // limit is keyed on the authenticated identity ('super_admin') rather than a spoofable IP — so
  // only real, authenticated over-use can ever trip it.
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    await logAudit(supabase, {
      adminIdentifier: ip,
      action: 'login_failed',
      resourceType: 'super_admin',
      resourceDetails: { endpoint: 'organizations/view-as' },
      ipAddress: ip,
      userAgent,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase, 'super_admin', '/api/montree/super-admin/organizations/view-as', 30, 15, 'closed',
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  const { id: organizationId } = await context.params;
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization id is required.' }, { status: 400 });
  }

  const { data: org, error: orgErr } = await supabase
    .from('montree_organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr) {
    if (isOrgMigrationPending(orgErr)) return orgMigrationPending(orgErr.message);
    console.error('[montree-org] view-as organization lookup failed:', orgErr);
    return NextResponse.json({ error: 'Could not open that organization.' }, { status: 500 });
  }
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  // Which director row the session BECOMES. verifyOrgRequest re-reads `sub` against
  // montree_organization_admins on every org request and refuses a session whose row is gone
  // or belongs elsewhere, so this cannot be an invented id — it has to be a real director of
  // this organisation. Oldest first: the founder, on the overwhelmingly common one-director
  // organisation, and a stable choice on the rare multi-director one.
  const { data: admins, error: adminErr } = await supabase
    .from('montree_organization_admins')
    .select('id, name, email, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (adminErr) {
    if (isOrgMigrationPending(adminErr)) return orgMigrationPending(adminErr.message);
    console.error('[montree-org] view-as director lookup failed:', adminErr);
    return NextResponse.json({ error: 'Could not open that organization.' }, { status: 500 });
  }

  const seat = ((admins ?? []) as Array<{ id: string; name: string | null; email: string | null }>)[0];
  if (!seat) {
    // An organisation whose director row was deleted. There is no seat to sit in, and
    // fabricating one would put a session behind a person who does not exist.
    return NextResponse.json(
      {
        error: 'That organization has no leader account, so there is no dashboard to open.',
        code: 'no_director',
      },
      { status: 409 },
    );
  }

  const token = await createMontreeToken({
    sub: seat.id,
    // schoolId carries the organisation id purely so the token keeps its uniform shape; it is
    // INERT for org routes. Same as every other org_admin token — see server-auth.ts.
    schoolId: org.id,
    role: 'org_admin',
    organizationId: org.id,
    actingAsSuperAdmin: true,
  });

  await logAudit(supabase, {
    adminIdentifier: 'super_admin',
    action: 'login_as',
    resourceType: 'organization',
    resourceId: org.id,
    resourceDetails: {
      endpoint: '/api/montree/super-admin/organizations/[id]/view-as',
      organizationName: org.name,
      seatAdminId: seat.id,
      seatEmail: seat.email,
    },
    ipAddress: ip,
    userAgent,
    isSensitive: true,
  });

  const response = NextResponse.json(
    {
      success: true,
      organization: { id: org.id, name: org.name, slug: org.slug },
      redirect: ORG_HOME,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
  setMontreeAuthCookie(response, token, 'org_admin');
  return response;
}
