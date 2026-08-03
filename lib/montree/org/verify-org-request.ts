// lib/montree/org/verify-org-request.ts
//
// The one gate every /api/montree/org/* route uses. Follows the shape of
// lib/montree/verify-request.ts's verifySchoolRequest(): returns either the context to
// carry on with, or a NextResponse to send straight back.
//
// Two callers, two gates:
//   • verifyOrgRequest()  — an organisation leader acting on their OWN organisation.
//   • requireIssuer()     — whoever is allowed to MINT a link of a given kind: super-admin
//                           for organisation invites, an org leader for school invites.
//
// Why this is not just `role === 'org_admin'`: the JWT is effectively permanent (10-year
// TTL, house policy), so a token minted for an organisation that has since been deleted
// would keep working. Every call re-reads the admin row and its organisation, which also
// gives routes the organisation's name for free.

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import type { OrgInviteType } from './invite-tokens';

/** Postgres/PostgREST codes that mean "migration 315 has not been run on this database". */
export function isOrgMigrationPending(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42P01' || code === '42703' || code === 'PGRST205' || code === 'PGRST204';
}

/** 503 rather than a bare 500, so the UI can say "run the migration" instead of "error". */
export function orgMigrationPending(detail?: string): NextResponse {
  return NextResponse.json(
    {
      available: false,
      migration_pending: true,
      message: 'The organization tables are not installed on this database yet.',
      detail: detail ?? null,
      migration: 'migrations/315_montree_organizations.sql',
    },
    { status: 503 },
  );
}

export interface OrgContext {
  /** montree_organization_admins.id */
  adminId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  adminName: string;
  adminEmail: string;
}

/**
 * Authenticated organisation leader, scoped to their own organisation.
 *
 * Never trusts `schoolId` on the token (it is INERT for this role) and never accepts an
 * organizationId from the request body — the only source is the JWT, re-checked against the
 * admin row on every call.
 */
export async function verifyOrgRequest(
  request: NextRequest,
): Promise<{ ctx: OrgContext } | { response: NextResponse }> {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return { response: auth };

  if (auth.role !== 'org_admin' || !auth.organizationId) {
    return {
      response: NextResponse.json(
        { error: 'This area is for organization leaders.', code: 'not_org_admin' },
        { status: 403 },
      ),
    };
  }

  const supabase = getSupabase();
  const { data: admin, error } = await supabase
    .from('montree_organization_admins')
    .select('id, name, email, organization_id')
    .eq('id', auth.userId)
    .maybeSingle();

  if (error) {
    if (isOrgMigrationPending(error)) return { response: orgMigrationPending(error.message) };
    console.error('[montree-org] admin lookup failed:', error);
    return { response: NextResponse.json({ error: 'Could not verify your account.' }, { status: 500 }) };
  }
  if (!admin || admin.organization_id !== auth.organizationId) {
    return {
      response: NextResponse.json(
        { error: 'This organization account is no longer active.', code: 'org_admin_gone' },
        { status: 403 },
      ),
    };
  }

  const { data: org, error: orgErr } = await supabase
    .from('montree_organizations')
    .select('id, name, slug')
    .eq('id', auth.organizationId)
    .maybeSingle();

  if (orgErr) {
    if (isOrgMigrationPending(orgErr)) return { response: orgMigrationPending(orgErr.message) };
    console.error('[montree-org] organization lookup failed:', orgErr);
    return { response: NextResponse.json({ error: 'Could not load your organization.' }, { status: 500 }) };
  }
  if (!org) {
    return {
      response: NextResponse.json(
        { error: 'This organization no longer exists.', code: 'org_gone' },
        { status: 403 },
      ),
    };
  }

  return {
    ctx: {
      adminId: admin.id,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      adminName: admin.name,
      adminEmail: admin.email,
    },
  };
}

/**
 * Who may mint which kind of link.
 *
 *   'organization' → super-admin only. Tredoux hands these out personally; there is no
 *                    self-serve path into the organisation tier, deliberately.
 *   'school'       → the organisation leader, and only for their own organisation.
 *
 * Returns `{ issuer, organizationId }` where organizationId is NULL for an organisation
 * invite (the organisation does not exist yet — it gets backfilled at redemption).
 */
export async function requireIssuer(
  request: NextRequest,
  inviteType: OrgInviteType,
): Promise<
  | { issuer: string; organizationId: string | null; ctx: OrgContext | null }
  | { response: NextResponse }
> {
  if (inviteType === 'organization') {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) {
      return {
        response: NextResponse.json(
          { error: 'Only the platform owner can invite a new organization.' },
          { status: 401 },
        ),
      };
    }
    return { issuer: 'super-admin', organizationId: null, ctx: null };
  }

  const opened = await verifyOrgRequest(request);
  if ('response' in opened) return { response: opened.response };
  return { issuer: opened.ctx.adminId, organizationId: opened.ctx.organizationId, ctx: opened.ctx };
}
