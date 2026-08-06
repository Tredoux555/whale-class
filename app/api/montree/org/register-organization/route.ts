// app/api/montree/org/register-organization/route.ts
//
// POST — redeem an ORGANIZATION invite link and create the organisation in one call.
//
// This is the second link in the chain:
//   Tredoux mints the link → THIS ROUTE turns it into a real organisation → the org leader
//   lands on /montree/org already signed in and starts inviting schools.
//
// Shape follows /api/montree/principal/register deliberately: validate, create the tenant
// row, create the admin row, roll the tenant back if the admin fails, mint a JWT, set the
// cookie, and hand the client back exactly what it needs to render the dashboard.
//
// The one addition is the token, and its ORDER is load-bearing: the invite is CLAIMED
// atomically BEFORE any row is created (claimInvite), and released if creation then fails
// (releaseInvite). Stamping it afterwards would not make the link single-use — two people
// opening the same forwarded link at the same moment would each get an organisation. See
// the long note in lib/montree/org/claim-invite.ts.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { hashPassword } from '@/lib/montree/password';
import { validatePassword } from '@/lib/password-policy';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { orgSlug } from '@/lib/montree/org/invite-tokens';
import { claimInvite, releaseInvite } from '@/lib/montree/org/claim-invite';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';
import { issueDirectorLoginCode } from '@/lib/montree/org/director-login-code';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    // Same 3-per-15-minutes as principal registration.
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/org/register-organization', 3, 15,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    }

    const { token, organizationName, contactName, email, password } = await request.json();

    if (typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({ error: 'Missing invitation token.' }, { status: 400 });
    }
    if (!organizationName?.trim()) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }
    if (!contactName?.trim()) {
      return NextResponse.json({ error: 'Your name is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${validation.errors.join(', ')}` },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // ── 1. Everything that can be checked WITHOUT burning the link ────────────────────
    // One email, one identity across the product. A person who is already a principal
    // cannot also be an organisation leader on the same address — the unified login has no
    // way to disambiguate them. Checked before the claim so a typo'd email does not cost
    // somebody their invitation.
    const { data: existingOrgAdmin } = await supabase
      .from('montree_organization_admins')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existingOrgAdmin) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }
    const { data: existingSchoolAdmin } = await supabase
      .from('montree_school_admins')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existingSchoolAdmin) {
      return NextResponse.json(
        { error: 'That email already has a Montree school account. Please use a different address.' },
        { status: 400 },
      );
    }

    // ── 2. CLAIM THE TOKEN — the atomic gate, before a single tenant row exists ────────
    // 🚨 Order matters and is load-bearing. Checking used_at with a SELECT and stamping it
    // after creating the organisation does NOT make a link single-use: two people opening
    // the same forwarded link at once both pass the SELECT and both get an organisation.
    // claimInvite() does it in one UPDATE ... WHERE used_at IS NULL, so exactly one of any
    // number of concurrent callers proceeds. See lib/montree/org/claim-invite.ts.
    const claim = await claimInvite(supabase, token, 'organization', cleanEmail);
    if (!claim.ok) {
      if (claim.migrationPending) return orgMigrationPending(claim.error);
      return NextResponse.json({ error: claim.error, code: claim.code }, { status: claim.status });
    }
    const invite = claim.invite;

    // From here on we HOLD the claim. Every failure path below must release it, or an
    // invitation is burned for nothing.

    // ── 3. The organisation ───────────────────────────────────────────────────────────
    // Slug collisions get a short numeric suffix rather than an error: two groups really can
    // both be called "Montessori Network", and neither should be turned away at the door.
    const baseSlug = orgSlug(organizationName) || 'organization';
    let slug = baseSlug;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data: taken } = await supabase
        .from('montree_organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${baseSlug}-${Math.floor(Math.random() * 9000) + 1000}`;
    }

    const { data: org, error: orgErr } = await supabase
      .from('montree_organizations')
      .insert({
        name: organizationName.trim(),
        slug,
        contact_name: contactName.trim(),
        contact_email: cleanEmail,
      })
      .select('id, name, slug')
      .single();

    if (orgErr || !org) {
      await releaseInvite(supabase, invite.id);
      if (isOrgMigrationPending(orgErr)) return orgMigrationPending((orgErr as { message?: string }).message);
      console.error('[montree-org] organization creation failed:', orgErr);
      return NextResponse.json({ error: 'Failed to create the organization' }, { status: 500 });
    }

    // ── 4. The leader's login ─────────────────────────────────────────────────────────
    // Two credentials, issued together (migration 317): the email + password they just chose,
    // and a 6-character code from the same generator every teacher and principal gets. The
    // code is the uniform porthole — a director standing next to their principals types a code
    // into the same kind of box. It is returned ONCE, on the success screen; after that only
    // the super-admin console can read it back.
    //
    // 🚨 Never fatal. issueDirectorLoginCode() returns null on a database where migration 317
    // has not been run, and registration carries on without a code — a bonus credential must
    // not be able to cost somebody their organisation.
    const loginCode = await issueDirectorLoginCode(supabase);

    const passwordHash = await hashPassword(password);
    const baseInsert = {
      organization_id: org.id,
      name: contactName.trim(),
      email: cleanEmail,
      password_hash: passwordHash,
      last_login_at: new Date().toISOString(),
    };

    let issuedCode = loginCode;
    let { data: admin, error: adminErr } = await supabase
      .from('montree_organization_admins')
      .insert({ ...baseInsert, ...(issuedCode ? { login_code: issuedCode } : {}) })
      .select('id, name, email')
      .single();

    // 🚨 The bonus credential must NEVER cost someone their organisation (L4). If the ONLY reason
    // the insert failed is a unique collision AND we were attaching a code, retry once WITHOUT it
    // — the director registers code-less (they still have email + password, and super-admin can
    // issue a code later) rather than the whole registration aborting. A collision on the email
    // (the other unique column) will fail the retry too and correctly fall through to rollback.
    if (adminErr && (adminErr as { code?: string }).code === '23505' && issuedCode) {
      issuedCode = null;
      ({ data: admin, error: adminErr } = await supabase
        .from('montree_organization_admins')
        .insert(baseInsert)
        .select('id, name, email')
        .single());
    }

    if (adminErr || !admin) {
      console.error('[montree-org] organization admin creation failed:', adminErr);
      // Roll the organisation back — same posture as principal/register. A half-created
      // tenant with no way to sign into it is worse than no tenant at all. And hand the
      // invitation back, so the person can simply try again.
      await supabase.from('montree_organizations').delete().eq('id', org.id);
      await releaseInvite(supabase, invite.id);
      return NextResponse.json({ error: 'Failed to create the organization account' }, { status: 500 });
    }

    // ── 5. Point the spent invite at what it made ─────────────────────────────────────
    // used_at and used_by_email were already stamped by the claim in step 2; this only
    // backfills the organisation the link turned into, so a used invite always says what
    // it produced.
    await supabase
      .from('montree_org_invites')
      .update({ organization_id: org.id })
      .eq('id', invite.id);

    // ── 6. Sign them in ───────────────────────────────────────────────────────────────
    // schoolId carries the organisation id purely so the token keeps its uniform shape; it
    // is INERT for org routes, which self-scope on organizationId. Same posture as 'agent'.
    const jwt = await createMontreeToken({
      sub: admin.id,
      schoolId: org.id,
      role: 'org_admin',
      organizationId: org.id,
    });

    const response = NextResponse.json(
      {
        success: true,
        organization: { id: org.id, name: org.name, slug: org.slug },
        admin: { id: admin.id, name: admin.name, email: admin.email, role: 'org_admin' },
        // Plaintext, exactly once. null when migration 317 has not been run OR the code was
        // dropped on a collision retry (L4) — the wizard simply omits the code panel in that case.
        loginCode: issuedCode ?? null,
      },
      // A credential is in this body. Never let a proxy or the browser cache keep it.
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
    setMontreeAuthCookie(response, jwt, 'org_admin');
    return response;
  } catch (error) {
    console.error('[montree-org] register-organization failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
