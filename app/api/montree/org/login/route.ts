// app/api/montree/org/login/route.ts
//
// POST — organisation leader sign-in: email + password against
// montree_organization_admins.
//
// Mirrors the email/password branch of /api/montree/principal/login exactly — same
// fail-CLOSED rate limit (5 per IP per 15 minutes), same dual-verify (bcrypt first, legacy
// SHA-256 fallback with a silent upgrade to bcrypt on match), same audit logging of failed
// attempts, same "Invalid email or password" for BOTH a missing account and a wrong
// password so the endpoint never tells an attacker which emails exist.
//
// Why this exists at all: the unified login at /montree/login-select is a CODE-only door
// (teachers, principals and parents all type a short code into one box). An organisation
// leader never gets a code — they set an email and a password when they redeemed their
// invite link — so they need their own door. It is deliberately a separate route rather
// than a fifth branch inside auth/unified: nothing about that route's code-matching applies
// here, and widening it would put an email/password path inside a code funnel.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { verifyPassword, isLegacyHash, hashPassword } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Fail CLOSED — a credential endpoint must never run unmetered because the
    // rate-limit table happened to be unreachable. Same posture as principal login.
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/org/login', 5, 15, 'closed',
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    }

    const { email, password } = await request.json().catch(() => ({ email: null, password: null }));
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const { data: admin, error: adminErr } = await supabase
      .from('montree_organization_admins')
      .select('id, name, email, password_hash, organization_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (adminErr) {
      if (isOrgMigrationPending(adminErr)) return orgMigrationPending(adminErr.message);
      console.error('[montree-org] login lookup failed:', adminErr);
      return NextResponse.json({ error: 'Could not sign you in right now.' }, { status: 500 });
    }

    const failed = async () => {
      await logAudit(supabase, {
        adminIdentifier: cleanEmail || ip,
        action: 'login_failed',
        resourceType: 'org_admin',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    };

    if (!admin) return failed();

    const validPassword = await verifyPassword(password, admin.password_hash);
    if (!validPassword) return failed();

    // Legacy SHA-256 hash matched → silently upgrade to bcrypt, as everywhere else.
    if (isLegacyHash(admin.password_hash)) {
      const bcryptHash = await hashPassword(password);
      await supabase
        .from('montree_organization_admins')
        .update({ password_hash: bcryptHash })
        .eq('id', admin.id);
    }

    const { data: org, error: orgErr } = await supabase
      .from('montree_organizations')
      .select('id, name, slug')
      .eq('id', admin.organization_id)
      .maybeSingle();

    if (orgErr || !org) {
      console.error('[montree-org] login organization missing:', orgErr);
      return NextResponse.json(
        { error: 'This organization no longer exists.', code: 'org_gone' },
        { status: 403 },
      );
    }

    await supabase
      .from('montree_organization_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // schoolId carries the organisation id purely so the token keeps its uniform shape; it
    // is INERT for org routes, which self-scope on organizationId. Same as registration.
    const token = await createMontreeToken({
      sub: admin.id,
      schoolId: org.id,
      role: 'org_admin',
      organizationId: org.id,
    });

    const response = NextResponse.json({
      success: true,
      organization: { id: org.id, name: org.name, slug: org.slug },
      admin: { id: admin.id, name: admin.name, email: admin.email, role: 'org_admin' },
      redirect: '/montree/org',
    });
    setMontreeAuthCookie(response, token, 'org_admin');
    return response;
  } catch (error) {
    console.error('[montree-org] login failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
