// app/api/montree/org/login/route.ts
//
// POST — organisation leader sign-in. TWO doors into one route:
//
//   { code }              → a 6-character login code (migration 317), case-insensitive,
//                           looked up against montree_organization_admins.login_code.
//   { email, password }   → the original email + password against the same table.
//
// Both mint the SAME org_admin JWT, take the SAME fail-CLOSED rate limit (5 per IP per 15
// minutes), write the SAME audit trail and stamp the SAME last_login_at. Nothing about the
// email + password path changed when the code path was added — it is checked second and only
// when no usable code was presented, so a director who has never been issued a code (every
// director who registered before migration 317) signs in exactly as they always did.
//
// Mirrors /api/montree/principal/login: dual-verify on the password (bcrypt first, legacy
// SHA-256 fallback with a silent upgrade to bcrypt on match) and one deliberately identical
// error for BOTH a missing account and a wrong credential, so the endpoint never tells an
// attacker which emails or codes exist.
//
// Why this route still exists: the unified login at /montree/login-select DOES now resolve
// director codes — it tries montree_organization_admins between principal and teacher, and a
// director typing their 6-character code into the one box everybody else uses lands in
// /montree/org exactly as they should. (That funnel was widened deliberately; the older comment
// here argued against it, and the argument lost. The counter-argument that stands is the one in
// director-login-code.ts: because the three login_code columns now share ONE namespace at that
// route, every code minted for ANY of them must be probed against ALL of them.)
//
// What unified CANNOT do is the other door: EMAIL + PASSWORD. Those are the credentials a
// director chose when they redeemed their invite link, they are the only credentials every
// director who registered before migration 317 has at all, and the unified box takes a single
// code field. So this route remains the director's own door — and it is also the place where a
// director-shaped failure gets a director-shaped answer (a 503 that names the missing migration,
// an explicit 'org_gone'), rather than the deliberately uniform "Invalid code" the unified chain
// has to return so it never reveals which of five tables a code belongs to.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { verifyPassword, isLegacyHash, hashPassword } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';
import { normalizeDirectorCode } from '@/lib/montree/org/director-login-code';

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

    const body = await request.json().catch(() => ({}));
    const { email, password } = body as { email?: unknown; password?: unknown };

    // A code, if one was typed. normalizeDirectorCode() trims + upper-cases and returns null
    // for anything that is not 6 characters, so a half-typed code falls through to the
    // email + password validation below rather than burning a lookup.
    const code = normalizeDirectorCode((body as { code?: unknown }).code);

    if (!code && (typeof email !== 'string' || !email.trim() || !password)) {
      return NextResponse.json(
        { error: 'Enter your login code, or your email and password.' },
        { status: 400 },
      );
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    /**
     * One failure shape for both doors. The identifier logged is the email when there is one
     * and the IP otherwise — 🚨 a login CODE is a credential and never goes into the audit
     * table, the same posture the teacher and principal code paths take.
     */
    const failed = async (via: 'code' | 'password') => {
      await logAudit(supabase, {
        adminIdentifier: cleanEmail || ip,
        action: 'login_failed',
        resourceType: 'org_admin',
        resourceDetails: { via },
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json(
        { error: code ? 'Invalid login code' : 'Invalid email or password' },
        { status: 401 },
      );
    };

    const SELECT = 'id, name, email, password_hash, organization_id';

    interface DirectorRow {
      id: string;
      name: string;
      email: string;
      password_hash: string;
      organization_id: string;
    }

    let admin: DirectorRow | null = null;

    if (code) {
      // ── Door 1: the login code ────────────────────────────────────────────────────────
      // The column is UNIQUE (migration 317) so this is a single-row lookup, exactly like the
      // teacher code path. A NULL code can never match — normalizeDirectorCode() only ever
      // hands back a 6-character string.
      const { data, error } = await supabase
        .from('montree_organization_admins')
        .select(SELECT)
        .eq('login_code', code)
        .maybeSingle();

      if (error) {
        if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
        console.error('[montree-org] login code lookup failed:', error);
        return NextResponse.json({ error: 'Could not sign you in right now.' }, { status: 500 });
      }
      if (!data) return failed('code');
      admin = (data as unknown) as DirectorRow;
    } else {
      // ── Door 2: email + password (unchanged) ──────────────────────────────────────────
      const { data, error: adminErr } = await supabase
        .from('montree_organization_admins')
        .select(SELECT)
        .eq('email', cleanEmail)
        .maybeSingle();

      if (adminErr) {
        if (isOrgMigrationPending(adminErr)) return orgMigrationPending(adminErr.message);
        console.error('[montree-org] login lookup failed:', adminErr);
        return NextResponse.json({ error: 'Could not sign you in right now.' }, { status: 500 });
      }
      if (!data) return failed('password');
      admin = (data as unknown) as DirectorRow;

      const validPassword = await verifyPassword(String(password), admin!.password_hash);
      if (!validPassword) return failed('password');

      // Legacy SHA-256 hash matched → silently upgrade to bcrypt, as everywhere else.
      if (isLegacyHash(admin!.password_hash)) {
        const bcryptHash = await hashPassword(String(password));
        await supabase
          .from('montree_organization_admins')
          .update({ password_hash: bcryptHash })
          .eq('id', admin!.id);
      }
    }

    if (!admin) return failed(code ? 'code' : 'password');

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

    // 🚨 A SUCCESSFUL director sign-in is audited (only failures were, before). The code path
    // matters most: a plaintext code the super-admin console displays, then someone signs in with,
    // otherwise leaves no trace at all. `via` records which door; the code itself is NEVER logged.
    await logAudit(supabase, {
      adminIdentifier: admin.id,
      action: 'login_success',
      resourceType: 'org_admin',
      resourceId: admin.id,
      resourceDetails: { via: code ? 'code' : 'password', organizationId: org.id },
      ipAddress: ip,
      userAgent,
    });

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
