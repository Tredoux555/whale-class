// /api/montree/auth/teacher/route.ts
// Teacher login with 6-character code OR email+password
// Issues a signed JWT token on success (Phase 1 security upgrade)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { verifyPassword, isLegacyHash, hashPassword, legacySha256 } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/auth/teacher', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { code, email, password } = body;

    let teacher: Record<string, unknown> | null = null;

    // Method 1: Login with code (dual-verify: legacy SHA-256 or new bcrypt)
    if (code) {
      if (code.length !== 6) {
        return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
      }

      const normalizedCode = code.toUpperCase();

      // Try legacy SHA-256 lookup first (old accounts)
      const codeHash = legacySha256(normalizedCode);
      const { data, error } = await supabase
        .from('montree_teachers')
        .select(`
          id, name, email, classroom_id, school_id, is_active,
          password_hash, password_set_at, role
        `)
        .eq('password_hash', codeHash)
        .eq('is_active', true)
        .single();

      if (!data) {
        // Try login_code lookup (new accounts with bcrypt hashes)
        const { data: newData, error: newError } = await supabase
          .from('montree_teachers')
          .select(`
            id, name, email, classroom_id, school_id, is_active,
            password_hash, password_set_at, login_code, role
          `)
          .eq('login_code', normalizedCode)
          .eq('is_active', true)
          .single();

        if (newData) {
          // Verify with bcrypt
          const valid = await verifyPassword(normalizedCode, newData.password_hash);
          if (!valid) {
            await logAudit(supabase, {
              adminIdentifier: email || ip,
              action: 'login_failed',
              resourceType: 'teacher',
              ipAddress: ip,
              userAgent,
            });
            return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
          }
          teacher = newData;
        }
      } else {
        teacher = data;
      }

      // Step 3: Fallback for accounts created with bcrypt hashes (before fix)
      if (!teacher) {
        const { data: bcryptCandidates } = await supabase
          .from('montree_teachers')
          .select('id, name, email, classroom_id, school_id, is_active, password_hash, password_set_at, role')
          .eq('is_active', true)
          .limit(50);

        for (const t of (bcryptCandidates || [])) {
          if (t.password_hash?.startsWith('$2')) {
            const valid = await verifyPassword(normalizedCode, t.password_hash);
            if (valid) {
              teacher = t;
              break;
            }
          }
        }
      }

      if (!teacher) {
        await logAudit(supabase, {
          adminIdentifier: email || ip,
          action: 'login_failed',
          resourceType: 'teacher',
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
      }
    }
    // Method 2: Login with email+password (dual-verify: bcrypt or legacy SHA-256)
    else if (email && password) {
      const { data, error } = await supabase
        .from('montree_teachers')
        .select(`
          id, name, email, classroom_id, school_id, is_active,
          password_hash, password_set_at, role
        `)
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        await logAudit(supabase, {
          adminIdentifier: email || ip,
          action: 'login_failed',
          resourceType: 'teacher',
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Verify password
      if (!data.password_hash) {
        await logAudit(supabase, {
          adminIdentifier: email || ip,
          action: 'login_failed',
          resourceType: 'teacher',
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Password not set. Use your login code instead.' }, { status: 401 });
      }

      const validPassword = await verifyPassword(password, data.password_hash);
      if (!validPassword) {
        await logAudit(supabase, {
          adminIdentifier: email || ip,
          action: 'login_failed',
          resourceType: 'teacher',
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Silently re-hash legacy SHA-256 to bcrypt
      if (isLegacyHash(data.password_hash)) {
        const bcryptHash = await hashPassword(password);
        await supabase.from('montree_teachers').update({ password_hash: bcryptHash }).eq('id', data.id);
      }

      teacher = data;
    }
    else {
      return NextResponse.json({ error: 'Provide code OR email+password' }, { status: 400 });
    }

    if (!teacher) {
      await logAudit(supabase, {
        adminIdentifier: email || ip,
        action: 'login_failed',
        resourceType: 'teacher',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get classroom info
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon, color')
      .eq('id', teacher.classroom_id)
      .single();

    // Get school info
    const { data: school } = await supabase
      .from('montree_schools')
      .select('id, name, slug')
      .eq('id', teacher.school_id)
      .single();

    // Update last login
    await supabase
      .from('montree_teachers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', teacher.id);

    // Check if teacher has onboarded (has students in classroom)
    let onboarded = false;
    if (classroom) {
      const { count } = await supabase
        .from('montree_children')
        .select('id', { count: 'exact', head: true })
        .eq('classroom_id', classroom.id);
      onboarded = (count || 0) > 0;
    }

    // Issue signed JWT token for authenticated API calls
    // Use role from DB — 'teacher' or 'homeschool_parent' (stored in montree_teachers.role)
    const teacherRole = (teacher.role === 'homeschool_parent' ? 'homeschool_parent' : 'teacher') as 'teacher' | 'homeschool_parent';
    const token = await createMontreeToken({
      sub: teacher.id as string,
      schoolId: (school?.id || teacher.school_id) as string,
      classroomId: (classroom?.id || teacher.classroom_id) as string,
      role: teacherRole,
    });

    // Phase 8: Log successful teacher login
    logAudit(supabase, {
      adminIdentifier: teacher.email || teacher.name || 'unknown',
      action: 'login_success',
      resourceType: 'teacher',
      resourceId: teacher.id,
      resourceDetails: { endpoint: '/api/montree/auth/teacher', schoolId: teacher.school_id },
      ipAddress: ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      token,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        role: teacherRole,
        email: teacher.email,
        password_set_at: teacher.password_set_at || null,
      },
      classroom: classroom || null,
      school: school || null,
      onboarded,
    });
    setMontreeAuthCookie(response, token, teacherRole);
    return response;

  } catch (error) {
    console.error('Teacher auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}