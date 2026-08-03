// app/api/montree/org/register-school/route.ts
//
// POST — redeem a SCHOOL invite link: create the school, create its principal, link the
// school to the inviting organisation, and sign the principal in.
//
// This is the third link in the chain. Below it, nothing changes: the new principal invites
// teachers with the existing 6-character login codes (/api/montree/admin/teachers) and
// teachers add children directly (/api/montree/children). Phase 6 stops here on purpose.
//
// The school row this writes is deliberately IDENTICAL to what
// /api/montree/principal/register writes — same trial length, same plan_type, same
// montage_enabled, same subscription_status — plus organization_id. A school that arrived
// through an organisation must be indistinguishable from a self-serve school everywhere
// else in the product; the organisation is a reporting and onboarding relationship, not a
// different kind of account.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { hashPassword } from '@/lib/montree/password';
import { validatePassword } from '@/lib/password-policy';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { getLocationFromRequest } from '@/lib/ip-geolocation';
import { DEFAULTS } from '@/lib/montree/constants';
import { orgSlug } from '@/lib/montree/org/invite-tokens';
import { claimInvite, releaseInvite } from '@/lib/montree/org/claim-invite';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/org/register-school', 3, 15,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    }

    const { token, schoolName, principalName, email, password } = await request.json();

    if (typeof token !== 'string' || !token.trim()) {
      return NextResponse.json({ error: 'Missing invitation token.' }, { status: 400 });
    }
    if (!schoolName?.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }
    if (!principalName?.trim()) {
      return NextResponse.json({ error: 'Principal name is required' }, { status: 400 });
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
    const { data: existingAdmin } = await supabase
      .from('montree_school_admins')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existingAdmin) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // ── 2. CLAIM THE TOKEN — the atomic gate, before a single tenant row exists ────────
    // 🚨 Same load-bearing ordering as register-organization. A SELECT-then-create-then-
    // stamp sequence does NOT make a link single-use: an org leader who pastes one school
    // link into a group chat with two principals in it would get two schools. claimInvite()
    // does it in one UPDATE ... WHERE used_at IS NULL, so exactly one caller proceeds.
    const claim = await claimInvite(supabase, token, 'school', cleanEmail);
    if (!claim.ok) {
      if (claim.migrationPending) return orgMigrationPending(claim.error);
      return NextResponse.json({ error: claim.error, code: claim.code }, { status: claim.status });
    }
    const invite = claim.invite;

    // From here on we HOLD the claim. Every failure path below must release it.

    if (!invite.organizationId) {
      await releaseInvite(supabase, invite.id);
      return NextResponse.json(
        { error: 'This invitation is not attached to an organization.', code: 'wrong_type' },
        { status: 409 },
      );
    }

    const { data: org, error: orgErr } = await supabase
      .from('montree_organizations')
      .select('id, name')
      .eq('id', invite.organizationId)
      .maybeSingle();
    if (orgErr || !org) {
      await releaseInvite(supabase, invite.id);
      console.error('[montree-org] register-school organization missing:', orgErr);
      return NextResponse.json(
        { error: 'The organization behind this invitation no longer exists.', code: 'org_gone' },
        { status: 410 },
      );
    }

    // ── 3. The school ─────────────────────────────────────────────────────────────────
    // Slug collision handling is friendlier than principal/register's hard "a school with
    // this name already exists": inside an organisation, two branches genuinely can share a
    // name, and an org leader should not have to coach a principal through renaming.
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

    // Launch pricing (plan amendment A1): every 'trialing' school MUST carry a
    // trial_ends_at — see the long note in /api/montree/principal/register.
    const trialEndsAt = new Date(Date.now() + DEFAULTS.TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .insert({
        name: schoolName.trim(),
        slug,
        owner_email: cleanEmail,
        owner_name: principalName.trim(),
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        plan_type: 'school',
        subscription_tier: 'free',
        is_active: true,
        montage_enabled: true,
        organization_id: org.id,
      })
      .select('id, name, slug')
      .single();

    if (schoolError || !school) {
      await releaseInvite(supabase, invite.id);
      if (isOrgMigrationPending(schoolError)) {
        return orgMigrationPending((schoolError as { message?: string }).message);
      }
      console.error('[montree-org] school creation failed:', schoolError);
      return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
    }

    // ── 4. The principal ──────────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);
    const { data: principal, error: adminError } = await supabase
      .from('montree_school_admins')
      .insert({
        school_id: school.id,
        email: cleanEmail,
        password_hash: passwordHash,
        name: principalName.trim(),
        role: 'principal',
        is_active: true,
      })
      .select('id, name, email, role')
      .single();

    if (adminError || !principal) {
      console.error('[montree-org] principal creation failed:', adminError);
      await supabase.from('montree_schools').delete().eq('id', school.id);
      await releaseInvite(supabase, invite.id);
      return NextResponse.json({ error: 'Failed to create principal account' }, { status: 500 });
    }

    // The invite was already stamped used (and stamped with this email) by the claim in
    // step 2. Nothing left to burn — a school invite already carries its organisation, so
    // unlike an organisation invite there is nothing to backfill either.

    // signup_country parity with principal/register. Fire-and-forget analytics — must
    // never block or fail a signup.
    void (async () => {
      try {
        const location = await getLocationFromRequest(request);
        if (location.country) {
          await supabase
            .from('montree_schools')
            .update({
              signup_country: location.country,
              signup_country_code: location.countryCode,
              signup_city: location.city,
              signup_region: location.region,
              signup_ip: location.ip,
              signup_timezone: location.timezone,
            })
            .eq('id', school.id);
        }
      } catch (err) {
        console.error('[montree-org] register-school geo failed:', err);
      }
    })();

    // ── 5. Sign the principal in ──────────────────────────────────────────────────────
    // Identical to principal/register so the follow-on /montree/principal/setup call has
    // the session it needs to scope classroom + teacher creation to this school.
    const jwt = await createMontreeToken({
      sub: principal.id,
      schoolId: school.id,
      role: 'principal',
    });

    const response = NextResponse.json({
      success: true,
      organization: { id: org.id, name: org.name },
      school: { id: school.id, name: school.name, slug: school.slug },
      principal: {
        id: principal.id, name: principal.name, email: principal.email, role: principal.role,
      },
    });
    setMontreeAuthCookie(response, jwt, 'principal');
    return response;
  } catch (error) {
    console.error('[montree-org] register-school failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
