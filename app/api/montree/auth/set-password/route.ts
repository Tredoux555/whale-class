// /api/montree/auth/set-password/route.ts
// Set password for teacher (first-time setup)
// Phase 5: Added auth check — requires ONE of:
//   1. Teacher has no password set yet (first-time setup, checked via DB)
//   2. x-super-admin-password header (admin reset)
//   3. Phase 6b — an authenticated PRINCIPAL of the teacher's own school (school reset)
//
// ── Why (3) exists ────────────────────────────────────────────────────────────────────────
// Path (1) is one-shot by design: once password_set_at is stamped, a teacher who forgot their
// password had exactly one route back — ask Tredoux. That is a platform-owner ticket for a
// problem the principal standing in the same building can solve, and it does not scale past a
// handful of schools. A principal already regenerates their teachers' LOGIN CODES from the
// classroom page (PATCH /api/montree/admin/teachers {regenerate_code:true}); resetting a
// password is the same authority over the same people.
//
// The gate is deliberately narrow and is checked against the DATABASE, never the request:
// verifySchoolRequest gives a JWT-derived schoolId, role must be 'principal', and the target
// teacher's own school_id must equal it. A principal cannot reach a teacher in another school
// even by guessing their id, and no client-supplied school_id is read anywhere in this route.
//
// A principal reset may leave the new password to the server (`generate: true`), which returns
// a policy-compliant temporary password ONCE so the principal can hand it over — the same
// show-it-once shape as a regenerated login code.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { hashPassword } from '@/lib/montree/password';
import { validatePassword } from '@/lib/password-policy';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { checkRateLimit } from '@/lib/rate-limiter';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { generateTempPassword } from '@/lib/montree/secure-code';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting: 3 attempts per IP per 15 min
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/auth/set-password', 3, 15, 'closed'
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { teacher_id, password, email, generate } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id required' }, { status: 400 });
    }

    // AUTH CHECK: Verify caller is authorized
    const superAdminPassword = request.headers.get('x-super-admin-password');
    const expectedSuperAdmin = process.env.SUPER_ADMIN_PASSWORD;

    // Path 1: Super-admin can reset any teacher's password
    const isSuperAdmin = !!(superAdminPassword && expectedSuperAdmin && superAdminPassword === expectedSuperAdmin);

    // Path 3: an authenticated principal, resetting a teacher of their OWN school.
    // Resolved before the first-time-setup branch because it is the only path that may
    // overwrite an EXISTING password without the super-admin header.
    let isSchoolPrincipal = false;
    let principalId: string | null = null;
    if (!isSuperAdmin) {
      const auth = await verifySchoolRequest(request);
      // Not authenticated at all is fine here — that is the first-time-setup path below,
      // which a teacher hits with no session. Only a live PRINCIPAL session unlocks path 3.
      if (!(auth instanceof NextResponse) && auth.role === 'principal') {
        const { data: target } = await supabase
          .from('montree_teachers')
          .select('id, school_id')
          .eq('id', teacher_id)
          .maybeSingle();

        if (!target) {
          return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }
        // 🚨 The scope check. schoolId comes from the JWT, never the body.
        if ((target as { school_id: string | null }).school_id !== auth.schoolId) {
          await logAudit(supabase, {
            adminIdentifier: auth.userId,
            action: 'password_change_unauthorized',
            resourceType: 'teacher',
            resourceId: teacher_id,
            resourceDetails: { reason: 'cross_school', principalSchoolId: auth.schoolId },
            ipAddress: ip,
            userAgent,
            isSensitive: true,
          });
          return NextResponse.json(
            { error: 'That teacher is not in your school.' },
            { status: 403 }
          );
        }
        isSchoolPrincipal = true;
        principalId = auth.userId;
      }
    }

    // The password itself. An administrator (super-admin or principal) may ask the server to
    // mint one — that is the show-it-once flow, and it is the only way a password leaves this
    // route in the response body. A teacher setting their own for the first time always sends
    // their own choice.
    const wantsGenerated = generate === true && (isSuperAdmin || isSchoolPrincipal);
    const effectivePassword: string = wantsGenerated ? generateTempPassword() : password;

    if (!effectivePassword) {
      return NextResponse.json({ error: 'teacher_id and password required' }, { status: 400 });
    }

    // Password policy validation (Phase 5). A generated password satisfies it by construction
    // (see generateTempPassword) but is checked anyway — one gate, no exceptions.
    const validation = validatePassword(effectivePassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    if (!isSuperAdmin && !isSchoolPrincipal) {
      // Path 2: First-time setup — teacher must not have a password set yet
      const { data: teacher, error: lookupError } = await supabase
        .from('montree_teachers')
        .select('id, password_set_at')
        .eq('id', teacher_id)
        .maybeSingle();

      if (lookupError || !teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }

      if ((teacher as Record<string, unknown>).password_set_at) {
        // Password already set — cannot change without super-admin auth
        await logAudit(supabase, {
          adminIdentifier: ip,
          action: 'password_change_unauthorized',
          resourceType: 'teacher',
          resourceId: teacher_id,
          ipAddress: ip,
          userAgent,
          isSensitive: true,
        });
        return NextResponse.json(
          { error: 'Password already set. Contact admin to reset.' },
          { status: 401 }
        );
      }
    }

    // Hash password
    const password_hash = await hashPassword(effectivePassword);

    // Update teacher record
    const updateData: Record<string, unknown> = {
      password_hash,
      password_set_at: new Date().toISOString()
    };

    // 🚨 email is applied ONLY on the paths where it belongs: first-time setup (a teacher setting
    // their own account up may supply their address) and the super-admin path. It is NOT applied
    // on the principal reset path — montree_teachers.email has no UNIQUE index, so accepting a
    // body-supplied email there would let a principal set a teacher's login email to an address
    // another teacher already uses, breaking that other teacher's email+password login (a
    // cross-tenant login DoS). A principal resetting a password has no business rewriting the
    // email in the same call.
    if (email && !isSchoolPrincipal) {
      updateData.email = email;
    }

    const { error } = await supabase
      .from('montree_teachers')
      .update(updateData as never)
      .eq('id', teacher_id);

    if (error) {
      console.error('Set password error:', error);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    // Audit log
    await logAudit(supabase, {
      adminIdentifier: isSuperAdmin ? 'super_admin' : (principalId ?? teacher_id),
      action: 'password_change',
      resourceType: 'teacher',
      resourceId: teacher_id,
      resourceDetails: {
        method: isSuperAdmin
          ? 'admin_reset'
          : isSchoolPrincipal
            ? 'principal_reset'
            : 'first_time_setup',
        generated: wantsGenerated,
      },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });

    // The generated password is returned exactly once, to the administrator who asked for it.
    // 🚨 no-store: this body carries a live credential.
    return NextResponse.json(
      { success: true, ...(wantsGenerated ? { password: effectivePassword } : {}) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );

  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
