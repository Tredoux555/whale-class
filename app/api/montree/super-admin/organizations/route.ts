// app/api/montree/super-admin/organizations/route.ts
//
// The platform owner's view of the organization tier (migrations 315 + 317).
//
//   GET  — every organisation, its school count, and its DIRECTORS: name, email, plaintext
//          login code, last sign-in. This is the org-tier half of the god view that
//          /api/montree/super-admin/all-logins is for schools, and it carries the same
//          no-store posture for the same reason.
//
//   POST — the two recoveries Tredoux gets asked for by name, plus the one creation:
//            { action: 'regenerate_login_code', adminId }  → a fresh code, returned once.
//            { action: 'reset_password', adminId }         → a fresh password, returned once
//                                                            (bcrypt-hashed on the row).
//            { action: 'create_school', organizationId, schoolName, principalName,
//              principalEmail? }                           → a whole school + its principal,
//                                                            with the principal's login code
//                                                            returned once to be sent on.
//          All three are audit-logged isSensitive.
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
import { issueDirectorLoginCode, probeLoginCode } from '@/lib/montree/org/director-login-code';
import { hashPassword, legacySha256 } from '@/lib/montree/password';
import { generateSecureCode, generateTempPassword } from '@/lib/montree/secure-code';
import { orgSlug } from '@/lib/montree/org/invite-tokens';
import { ORG_SCHOOL_GRANT, applyOrgSchoolGrant } from '@/lib/montree/org/free-for-life';
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

/** Trim a string field off an untyped JSON body, or ''. */
function str(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * POST — director credential recovery, and direct school creation.
 *
 * Two of the three actions operate on ONE director by id and return the new secret exactly
 * once: a surgical fix for "our director cannot get in", made by the only person on the
 * platform who is allowed to make it.
 *
 * The third, `create_school`, is the shortcut around the whole onboarding chain. Normally a
 * school appears when a director mints a school link and a principal redeems it. But the
 * founder is often sitting WITH the director — on a call, in a school office — and the fastest
 * path is for him to make the school himself and read the principal's code down the phone.
 * That is exactly what this does, and it produces the same rows the invite path produces,
 * including the free-for-life billing grant (ORG_SCHOOL_GRANT).
 */
export async function POST(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const ip = getClientIP(request.headers);
  const userAgent = getUserAgent(request.headers);

  const body = await request.json().catch(() => ({}));
  const action = str(body, 'action');

  // ── create_school ─────────────────────────────────────────────────────────────────────
  // Handled before the adminId gate below: this action is scoped to an ORGANISATION, not to a
  // director, and it is the only one here that writes tenant rows.
  if (action === 'create_school') {
    return createOrganizationSchool(supabase, body, { ip, userAgent });
  }

  const adminId = str(body, 'adminId');

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

/**
 * Create a school inside an organisation, with its principal, in one shot.
 *
 * The rows are deliberately the SAME rows /api/montree/org/register-school writes — same slug
 * collision handling, same ORG_SCHOOL_GRANT billing, same permanent Sonnet grant, same
 * organization_id — with ONE difference, and it is the point of the whole action: the
 * principal is created the way /api/montree/super-admin/principals creates one, with a
 * 6-character login code (plaintext on the row, legacySha256 in password_hash) instead of a
 * password they chose. Nobody is standing at a keyboard to choose one, and a code is what the
 * founder can read down a phone line.
 *
 * 🚨 The code comes back exactly once in this response, and is readable again afterwards from
 * the schools god view (/api/montree/super-admin/all-logins) — this is a recovery-capable
 * platform, not a one-way door.
 */
async function createOrganizationSchool(
  supabase: ReturnType<typeof getSupabase>,
  body: unknown,
  ctx: { ip: string; userAgent: string },
): Promise<NextResponse> {
  const organizationId = str(body, 'organizationId');
  const schoolName = str(body, 'schoolName');
  const principalName = str(body, 'principalName');
  const principalEmailRaw = str(body, 'principalEmail').toLowerCase();

  if (!organizationId) return NextResponse.json({ error: 'organizationId is required.' }, { status: 400 });
  if (!schoolName) return NextResponse.json({ error: 'School name is required.' }, { status: 400 });
  if (principalName.length < 2) return NextResponse.json({ error: 'Principal name is required.' }, { status: 400 });
  if (principalEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principalEmailRaw)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }

  // The organisation must exist — a school pointed at a dead uuid would be an orphan the
  // console cannot show, and the FK would reject it anyway with a far less readable error.
  const { data: org, error: orgErr } = await supabase
    .from('montree_organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr) {
    if (isOrgMigrationPending(orgErr)) return orgMigrationPending(orgErr.message);
    console.error('[montree-org] create_school organization lookup failed:', orgErr);
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  // Slug collision handling, identical to register-school: inside an organisation two branches
  // genuinely can share a name, so a collision renames rather than refuses.
  const baseSlug = orgSlug(schoolName) || 'school';
  let slug = baseSlug;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data: taken } = await supabase
      .from('montree_schools')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${baseSlug}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  // montree_school_admins.email is NOT NULL and the table's UNIQUE is (school_id, email), so a
  // principal always needs one. When the founder does not have it yet — common on a phone call
  // — synthesise a per-school placeholder in the house shape (see the parent-invite path's
  // `pending-…@parent.montree.local`). The .local TLD never resolves, so nothing can ever be
  // sent to it by accident, and the principal signs in with the CODE regardless. Fill the real
  // address in later from the super-admin schools view.
  const principalEmail = principalEmailRaw || `principal-${slug}@school.montree.local`;

  // ── The principal's login code, minted BEFORE anything is written ──────────────────────
  // 🚨 Probed against ALL THREE code tables (see probeLoginCode) — not just this one. The
  // partial UNIQUE on montree_school_admins.login_code (migration 194) only stops a duplicate
  // WITHIN that table; a code that collides with a TEACHER's would sail past it and then, at
  // /api/montree/auth/unified, outrank that teacher (principal is tried first) and hand the
  // founder's new principal session to whoever typed it — across tenants.
  //
  // Minted here, ahead of the school insert, so the failure path writes NOTHING and needs no
  // rollback: a school that exists but has no signable-into principal is the exact state the
  // rollback below exists to prevent, and not creating it in the first place is cheaper.
  let loginCode = '';
  for (let attempt = 0; attempt < 6 && !loginCode; attempt += 1) {
    const candidate = generateSecureCode();
    const verdict = await probeLoginCode(supabase, candidate);
    if (verdict === 'free') loginCode = candidate;
    if (verdict === 'error') {
      // Already logged inside probeLoginCode. Refusing to mint is a retry for the founder;
      // minting a code we could not verify is a takeover we would never find out about.
      return NextResponse.json(
        { error: 'Could not check the login code right now. Try again in a moment.' },
        { status: 503 },
      );
    }
  }
  if (!loginCode) {
    console.error('[montree-org] create_school could not find a free principal login code after 6 attempts');
    return NextResponse.json(
      { error: 'Could not mint a login code. Try again.' },
      { status: 503 },
    );
  }

  const { data: school, error: schoolError } = await supabase
    .from('montree_schools')
    .insert({
      name: schoolName,
      slug,
      owner_email: principalEmail,
      owner_name: principalName,
      ...ORG_SCHOOL_GRANT,
      plan_type: 'school',
      subscription_tier: 'free',
      is_active: true,
      montage_enabled: true,
      organization_id: org.id,
    })
    .select('id, name, slug')
    .single();

  if (schoolError || !school) {
    if (isOrgMigrationPending(schoolError)) {
      return orgMigrationPending((schoolError as { message?: string }).message);
    }
    console.error('[montree-org] create_school school insert failed:', schoolError);
    return NextResponse.json({ error: 'Could not create the school.' }, { status: 500 });
  }

  // Both credential columns, exactly as /api/montree/super-admin/principals writes them:
  // login_code is the readable half (so the god view can hand it back later) and password_hash
  // is legacySha256 of the same code, because THAT is what the principal login path compares
  // against. Writing one without the other produces an account that cannot sign in.
  // `loginCode` was minted and cross-table-probed above, before any row existed; the partial
  // UNIQUE on login_code (migration 194) remains the last-resort backstop and lands in the
  // rollback below if it ever fires.
  const { data: principal, error: adminError } = await supabase
    .from('montree_school_admins')
    .insert({
      school_id: school.id,
      email: principalEmail,
      name: principalName,
      login_code: loginCode,
      password_hash: legacySha256(loginCode),
      role: 'principal',
      is_active: true,
    })
    .select('id, name, email, role')
    .single();

  if (adminError || !principal) {
    // A school nobody can sign into is worse than no school: it would sit in the org's count
    // forever and the only fix would be a manual delete. Roll it back, same as register-school.
    console.error('[montree-org] create_school principal insert failed:', adminError);
    await supabase.from('montree_schools').delete().eq('id', school.id);
    return NextResponse.json({ error: 'Could not create the principal account.' }, { status: 500 });
  }

  // The other half of free-for-life. Non-fatal by contract — the school exists and works
  // either way, and the AI tier is one click away in the super-admin schools view.
  await applyOrgSchoolGrant(supabase, school.id, 'super_admin_org_school_created');

  await logAudit(supabase, {
    adminIdentifier: 'super_admin',
    action: 'org_school_created_by_super_admin',
    resourceType: 'school',
    resourceId: school.id,
    resourceDetails: {
      organizationId: org.id,
      organizationName: org.name,
      schoolName: school.name,
      principalId: principal.id,
      principalEmail,
      placeholderEmail: !principalEmailRaw,
    },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    isSensitive: true,
  });

  return NextResponse.json(
    {
      success: true,
      school: { id: school.id, name: school.name, slug: school.slug },
      principal: { id: principal.id, name: principal.name, email: principal.email, loginCode },
    },
    { headers: NO_STORE },
  );
}
