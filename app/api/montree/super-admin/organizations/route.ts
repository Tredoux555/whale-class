// app/api/montree/super-admin/organizations/route.ts
//
// The platform owner's view of the organization tier (migrations 315 + 317).
//
//   GET  — every organisation, its school count, and its DIRECTORS: name, email, plaintext
//          login code, last sign-in. This is the org-tier half of the god view that
//          /api/montree/super-admin/all-logins is for schools, and it carries the same
//          no-store posture for the same reason.
//
//   POST — the two recoveries Tredoux gets asked for by name:
//            { action: 'regenerate_login_code', adminId }  → a fresh code, returned once.
//            { action: 'reset_password', adminId }         → a fresh password, returned once
//                                                            (bcrypt-hashed on the row).
//          Both are audit-logged isSensitive.
//
// "View as organisation" lives one level down, at
// /api/montree/super-admin/organizations/[id]/view-as, because it mints a session rather than
// returning data and deserves to be impossible to confuse with either of the above.
//
// Minting the invite links that create organisations is POST /api/montree/org/invites with
// inviteType='organization', super-admin gated by the same helper.
//
// Auth: super-admin only, via verifySuperAdminAuth — the same door the rest of
// /api/montree/super-admin/* uses.
//
// 🚨 Every response here can contain a live credential. All of them are no-store, and none of
// them is ever reachable without the super-admin gate — this is the highest-value payload in
// the organization tier.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';
import { issueDirectorLoginCode } from '@/lib/montree/org/director-login-code';
import { hashPassword } from '@/lib/montree/password';
import { generateTempPassword } from '@/lib/montree/secure-code';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

/** Credentials in the body — never let a proxy or the browser keep them. */
const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

interface OrgAdminRow {
  id: string;
  organization_id: string;
  name: string | null;
  email: string | null;
  login_code: string | null;
  last_login_at: string | null;
  created_at: string | null;
}

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('montree_organizations')
    .select('id, name, slug, contact_name, contact_email, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] super-admin organization list failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgs = (data ?? []) as OrgRow[];
  const ids = orgs.map((o) => o.id);

  // Directors, in ONE read for the whole platform rather than one per organisation.
  // 🚨 login_code is selected in plaintext deliberately — this endpoint IS the recovery path
  // for a director who lost their code, exactly as all-logins is for a teacher who lost theirs.
  // Selecting it is guarded by nothing but verifySuperAdminAuth above; keep it that way.
  const adminsByOrg = new Map<string, OrgAdminRow[]>();
  if (ids.length) {
    const { data: admins, error: adminErr } = await supabase
      .from('montree_organization_admins')
      .select('id, organization_id, name, email, login_code, last_login_at, created_at')
      .in('organization_id', ids)
      .order('created_at', { ascending: true });
    if (adminErr) {
      // A database without migration 317 has no login_code column. Rather than fail the whole
      // console, retry without it — every other field still answers "who leads this group?".
      if (isOrgMigrationPending(adminErr)) {
        const { data: fallback } = await supabase
          .from('montree_organization_admins')
          .select('id, organization_id, name, email, last_login_at, created_at')
          .in('organization_id', ids);
        for (const row of ((fallback ?? []) as unknown) as OrgAdminRow[]) {
          const list = adminsByOrg.get(row.organization_id) ?? [];
          list.push({ ...row, login_code: null });
          adminsByOrg.set(row.organization_id, list);
        }
      } else {
        console.error('[montree-org] super-admin director list failed:', adminErr);
      }
    } else {
      for (const row of ((admins ?? []) as unknown) as OrgAdminRow[]) {
        const list = adminsByOrg.get(row.organization_id) ?? [];
        list.push(row);
        adminsByOrg.set(row.organization_id, list);
      }
    }
  }

  // School counts in one read rather than one query per organisation.
  // ⚠️ Unpaged .in() read — caps at PostgREST's ~1000-row default (total schools across ALL
  // organisations, not per-org). Comfortably under that today; .order('id') keeps the truncation
  // point stable if it is ever approached. Promote to a paged read if the platform outgrows it.
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: schools, error: schErr } = await supabase
      .from('montree_schools')
      .select('id, organization_id')
      .in('organization_id', ids)
      .order('id', { ascending: true });
    if (schErr) {
      console.error('[montree-org] school count failed:', schErr);
    } else {
      for (const row of (schools ?? []) as Array<{ organization_id: string | null }>) {
        if (!row.organization_id) continue;
        counts.set(row.organization_id, (counts.get(row.organization_id) ?? 0) + 1);
      }
    }
  }

  return NextResponse.json(
    {
      available: true,
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        contactName: o.contact_name,
        contactEmail: o.contact_email,
        createdAt: o.created_at,
        schoolCount: counts.get(o.id) ?? 0,
        admins: (adminsByOrg.get(o.id) ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          loginCode: a.login_code,   // plaintext, super-admin only — see the note above
          lastLoginAt: a.last_login_at,
        })),
      })),
      totals: {
        organizations: orgs.length,
        schools: [...counts.values()].reduce((a, b) => a + b, 0),
        directors: [...adminsByOrg.values()].reduce((a, list) => a + list.length, 0),
      },
    },
    { headers: NO_STORE },
  );
}

/**
 * POST — director credential recovery.
 *
 * Two actions, both operating on ONE director by id and both returning the new secret exactly
 * once. Neither touches the organisation, its schools or anything else: the whole point is a
 * surgical fix for "our director cannot get in", made by the only person on the platform who
 * is allowed to make it.
 */
export async function POST(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  const body = await request.json().catch(() => ({}));
  const action = typeof (body as { action?: unknown }).action === 'string'
    ? (body as { action: string }).action
    : '';
  const adminId = typeof (body as { adminId?: unknown }).adminId === 'string'
    ? (body as { adminId: string }).adminId.trim()
    : '';

  if (!adminId) return NextResponse.json({ error: 'adminId is required.' }, { status: 400 });

  // Read the director first so an action against a stale id fails cleanly, and so the audit
  // entry can name the organisation rather than only an opaque uuid.
  const { data: admin, error: adminErr } = await supabase
    .from('montree_organization_admins')
    .select('id, name, email, organization_id')
    .eq('id', adminId)
    .maybeSingle();

  if (adminErr) {
    if (isOrgMigrationPending(adminErr)) return orgMigrationPending(adminErr.message);
    console.error('[montree-org] super-admin director lookup failed:', adminErr);
    return NextResponse.json({ error: adminErr.message }, { status: 500 });
  }
  if (!admin) return NextResponse.json({ error: 'Director not found.' }, { status: 404 });

  if (action === 'regenerate_login_code') {
    const code = await issueDirectorLoginCode(supabase, admin.id);
    if (!code) {
      return NextResponse.json(
        {
          error: 'Could not issue a login code. Run migrations/317_montree_org_director_logins.sql.',
          migration: 'migrations/317_montree_org_director_logins.sql',
        },
        { status: 503 },
      );
    }

    const { error: updateErr } = await supabase
      .from('montree_organization_admins')
      .update({ login_code: code })
      .eq('id', admin.id);

    if (updateErr) {
      if (isOrgMigrationPending(updateErr)) return orgMigrationPending(updateErr.message);
      console.error('[montree-org] director code regenerate failed:', updateErr);
      return NextResponse.json({ error: 'Could not issue a login code.' }, { status: 500 });
    }

    await logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'org_director_code_regenerated',
      resourceType: 'org_admin',
      resourceId: admin.id,
      resourceDetails: { organizationId: admin.organization_id, email: admin.email },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });

    // Plaintext, once. It is also readable again from the GET above — this is the god view,
    // not a one-way door — but the caller should not have to reload to see what they just made.
    return NextResponse.json({ success: true, loginCode: code }, { headers: NO_STORE });
  }

  if (action === 'reset_password') {
    // The server mints it. A platform owner typing a password for somebody else invites a
    // weak one, and it would have to travel back in this response either way.
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);

    const { error: updateErr } = await supabase
      .from('montree_organization_admins')
      .update({ password_hash: passwordHash })
      .eq('id', admin.id);

    if (updateErr) {
      if (isOrgMigrationPending(updateErr)) return orgMigrationPending(updateErr.message);
      console.error('[montree-org] director password reset failed:', updateErr);
      return NextResponse.json({ error: 'Could not reset the password.' }, { status: 500 });
    }

    await logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'password_change',
      resourceType: 'org_admin',
      resourceId: admin.id,
      resourceDetails: {
        method: 'super_admin_reset',
        organizationId: admin.organization_id,
        email: admin.email,
      },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });

    // 🚨 The ONLY time this password exists in readable form. It is bcrypt on the row.
    return NextResponse.json({ success: true, password }, { headers: NO_STORE });
  }

  return NextResponse.json({ error: `Unknown action: ${action || '(none)'}` }, { status: 400 });
}
