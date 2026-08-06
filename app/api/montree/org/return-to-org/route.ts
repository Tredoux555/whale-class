// app/api/montree/org/return-to-org/route.ts
//
// POST — the way back out of a school. The other half of /api/montree/org/enter-school.
//
// No body. Everything it needs is on the caller's own signed token: actingOrgAdminId (the
// montree_organization_admins row to become again) and actingOrganizationId (the organisation
// to become it in). Both were written by enter-school after that route had already verified
// the director; they cannot be supplied, only carried.
//
// ── Why this is not just "log in again" ───────────────────────────────────────────────────
// A director inside one of their schools is holding a PRINCIPAL cookie. Signing back into the
// organisation by hand would mean finding /montree/org/login and typing a code — a dead end at
// the exact moment they want to step back out. This route swaps the cookie in place.
//
// ── The re-verification, and why it is not optional ───────────────────────────────────────
// The claim proves the session was minted by a director. It does NOT prove that director still
// exists, still belongs to that organisation, or that the organisation still exists — the JWT
// TTL is effectively permanent (10 years, house policy), so a token can outlive all three.
// Every one of those is re-read here before a new org session is minted. Same reasoning as the
// long note at the top of lib/montree/org/verify-org-request.ts.
//
// Never breaks anything: a principal token with no acting claims — which is every ordinary
// principal in the product — gets a clean 403 and nothing changes.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

const ORG_HOME = '/montree/org';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const adminId = auth.actingOrgAdminId;
  const organizationId = auth.actingOrganizationId;

  if (!adminId || !organizationId) {
    return NextResponse.json(
      { error: 'This session did not come from an organization.', code: 'not_acting' },
      { status: 403 },
    );
  }

  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  // The director row must still exist AND still belong to the organisation named on the token.
  const { data: admin, error: adminErr } = await supabase
    .from('montree_organization_admins')
    .select('id, name, email, organization_id')
    .eq('id', adminId)
    .maybeSingle();

  if (adminErr) {
    if (isOrgMigrationPending(adminErr)) return orgMigrationPending(adminErr.message);
    console.error('[montree-org] return-to-org admin lookup failed:', adminErr);
    return NextResponse.json({ error: 'Could not return to your organization.' }, { status: 500 });
  }
  if (!admin || admin.organization_id !== organizationId) {
    return NextResponse.json(
      { error: 'That organization account is no longer active.', code: 'org_admin_gone' },
      { status: 403 },
    );
  }

  const { data: org, error: orgErr } = await supabase
    .from('montree_organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr) {
    if (isOrgMigrationPending(orgErr)) return orgMigrationPending(orgErr.message);
    console.error('[montree-org] return-to-org organization lookup failed:', orgErr);
    return NextResponse.json({ error: 'Could not return to your organization.' }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json(
      { error: 'That organization no longer exists.', code: 'org_gone' },
      { status: 403 },
    );
  }

  // An org_admin token again. The enter→return-specific claims (actingOrgAdminId /
  // actingOrganizationId) are deliberately dropped — the way back has been taken. But
  // actingAsSuperAdmin is PRESERVED (H2): if a super-admin entered a school FROM a super-admin
  // org view, returning must land them back in the super-admin org view, not silently demote the
  // session to a real director's. The banner survives the whole enter→return round trip.
  const stillSuperAdmin = auth.actingAsSuperAdmin === true;
  const token = await createMontreeToken({
    sub: admin.id,
    schoolId: org.id,   // INERT for org routes; keeps the token shape uniform. See server-auth.
    role: 'org_admin',
    organizationId: org.id,
    ...(stillSuperAdmin ? { actingAsSuperAdmin: true } : {}),
  });

  await logAudit(supabase, {
    adminIdentifier: stillSuperAdmin ? 'super_admin' : admin.id,
    action: 'org_return_to_org',
    resourceType: 'organization',
    resourceId: org.id,
    resourceDetails: { fromSchoolId: auth.schoolId, viaSuperAdmin: stillSuperAdmin || undefined },
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
