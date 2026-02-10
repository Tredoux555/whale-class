// /api/montree/auth/set-password/route.ts
// Set password for teacher (first-time setup)
// Phase 5: Added auth check — requires either:
//   1. Teacher has no password set yet (first-time setup, checked via DB)
//   2. x-super-admin-password header (admin reset)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { hashPassword } from '@/lib/montree/password';
import { validatePassword } from '@/lib/password-policy';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting: 3 attempts per IP per 15 min
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/auth/set-password', 3, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { teacher_id, password, email } = body;

    if (!teacher_id || !password) {
      return NextResponse.json({ error: 'teacher_id and password required' }, { status: 400 });
    }

    // Password policy validation (Phase 5)
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // AUTH CHECK: Verify caller is authorized
    const superAdminPassword = request.headers.get('x-super-admin-password');
    const expectedSuperAdmin = process.env.SUPER_ADMIN_PASSWORD;

    // Path 1: Super-admin can reset any teacher's password
    const isSuperAdmin = superAdminPassword && expectedSuperAdmin && superAdminPassword === expectedSuperAdmin;

    if (!isSuperAdmin) {
      // Path 2: First-time setup — teacher must not have a password set yet
      const { data: teacher, error: lookupError } = await supabase
        .from('montree_teachers')
        .select('id, password_set_at')
        .eq('id', teacher_id)
        .single();

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
    const password_hash = await hashPassword(password);

    // Update teacher record
    const updateData: Record<string, unknown> = {
      password_hash,
      password_set_at: new Date().toISOString()
    };

    if (email) {
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
      adminIdentifier: isSuperAdmin ? 'super_admin' : teacher_id,
      action: 'password_change',
      resourceType: 'teacher',
      resourceId: teacher_id,
      resourceDetails: { method: isSuperAdmin ? 'admin_reset' : 'first_time_setup' },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
