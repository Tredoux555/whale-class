// /api/montree/principal/login/route.ts
// Session 105: Principal login - email + password
// Phase 1: Issues signed JWT token on success
// Phase 2: Dual-verify bcrypt + legacy SHA-256, re-hashes on match
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
      supabase, ip, '/api/montree/principal/login', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { email, password, code } = body;

    // Code-based login (6-char instant trial code)
    if (code && typeof code === 'string' && code.length === 6) {
      const normalizedCode = code.toUpperCase();

      // Legacy SHA-256 lookup (finds old accounts)
      const codeHash = legacySha256(normalizedCode);
      let { data: principal } = await supabase
        .from('montree_school_admins')
        .select('*')
        .eq('password_hash', codeHash)
        .eq('role', 'principal')
        .eq('is_active', true)
        .single();

      // If found with SHA-256, silently re-hash to bcrypt
      if (principal) {
        const bcryptHash = await hashPassword(normalizedCode);
        await supabase
          .from('montree_school_admins')
          .update({ password_hash: bcryptHash })
          .eq('id', principal.id);
      }

      if (!principal) {
        await logAudit(supabase, {
          adminIdentifier: email || ip,
          action: 'login_failed',
          resourceType: 'principal',
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
      }

      // Get school
      const { data: school, error: schoolError } = await supabase
        .from('montree_schools')
        .select('*')
        .eq('id', principal.school_id)
        .single();

      if (schoolError || !school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
      }

      // Check if school has classrooms (needs setup?)
      const { data: classrooms } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('school_id', school.id);

      const needsSetup = !classrooms || classrooms.length === 0;

      // Update last login
      await supabase
        .from('montree_school_admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', principal.id);

      // Issue signed JWT token
      const token = await createMontreeToken({
        sub: principal.id,
        schoolId: school.id,
        role: 'principal',
      });

      const response = NextResponse.json({
        success: true,
        token,
        needsSetup,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        principal: {
          id: principal.id,
          name: principal.name,
          email: principal.email,
          role: principal.role,
        },
      });
      setMontreeAuthCookie(response, token);
      return response;
    }

    // Email + password login
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Fetch by email only (NOT by hash — enables dual-verify)
    const { data: principal, error: principalError } = await supabase
      .from('montree_school_admins')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('is_active', true)
      .single();

    if (principalError || !principal) {
      await logAudit(supabase, {
        adminIdentifier: email || ip,
        action: 'login_failed',
        resourceType: 'principal',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Dual-verify: bcrypt first, SHA-256 fallback
    const validPassword = await verifyPassword(password, principal.password_hash);
    if (!validPassword) {
      await logAudit(supabase, {
        adminIdentifier: email || ip,
        action: 'login_failed',
        resourceType: 'principal',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // If legacy SHA-256 hash matched, silently upgrade to bcrypt
    if (isLegacyHash(principal.password_hash)) {
      const bcryptHash = await hashPassword(password);
      await supabase
        .from('montree_school_admins')
        .update({ password_hash: bcryptHash })
        .eq('id', principal.id);
    }

    // Get school
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', principal.school_id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Check if school has classrooms (needs setup?)
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('school_id', school.id);

    const needsSetup = !classrooms || classrooms.length === 0;

    // Update last login
    await supabase
      .from('montree_school_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', principal.id);

    // Issue signed JWT token
    const token = await createMontreeToken({
      sub: principal.id,
      schoolId: school.id,
      role: 'principal',
    });

    const response = NextResponse.json({
      success: true,
      token,
      needsSetup,
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
      },
      principal: {
        id: principal.id,
        name: principal.name,
        email: principal.email,
        role: principal.role,
      },
    });
    setMontreeAuthCookie(response, token);
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
