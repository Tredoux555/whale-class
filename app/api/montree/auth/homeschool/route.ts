// /api/montree/auth/homeschool/route.ts
// Homeschool parent login with 6-character code
// Same pattern as teacher login — code lookup → bcrypt verify → JWT → httpOnly cookie

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { verifyPassword, isLegacyHash, hashPassword } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/auth/homeschool', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase();

    // Look up homeschool parent by login_code
    const { data: parentData, error: lookupErr } = await supabase
      .from('montree_homeschool_parents')
      .select('id, name, email, school_id, is_active, password_hash, login_code, guru_plan, guru_prompts_used')
      .eq('login_code', normalizedCode)
      .eq('is_active', true)
      .single();

    const parent = parentData as Record<string, unknown> | null;

    if (lookupErr || !parent) {
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'homeschool_parent',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    // Verify password with bcrypt
    const valid = await verifyPassword(normalizedCode, parent.password_hash as string);
    if (!valid) {
      await logAudit(supabase, {
        adminIdentifier: (parent.email as string) || ip,
        action: 'login_failed',
        resourceType: 'homeschool_parent',
        resourceId: parent.id as string,
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    // Silently re-hash legacy SHA-256 to bcrypt (future-proofing)
    if (isLegacyHash(parent.password_hash as string)) {
      const bcryptHash = await hashPassword(normalizedCode);
      await (supabase.from('montree_homeschool_parents') as any).update({ password_hash: bcryptHash }).eq('id', parent.id as string);
    }

    // Get school info
    const { data: school } = await supabase
      .from('montree_schools')
      .select('id, name, slug')
      .eq('id', parent.school_id as string)
      .single();

    // Get children count for this parent's school
    const { count: childCount } = await supabase
      .from('montree_children')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', parent.school_id as string);

    // Update last login
    await (supabase.from('montree_homeschool_parents') as any)
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', parent.id as string);

    // Issue signed JWT token
    const token = await createMontreeToken({
      sub: parent.id as string,
      schoolId: parent.school_id as string,
      role: 'homeschool_parent',
    });

    // Log successful login
    logAudit(supabase, {
      adminIdentifier: (parent.email as string) || (parent.name as string) || 'unknown',
      action: 'login_success',
      resourceType: 'homeschool_parent',
      resourceId: parent.id as string,
      resourceDetails: { endpoint: '/api/montree/auth/homeschool', schoolId: parent.school_id as string },
      ipAddress: ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      token,
      homeschoolParent: {
        id: parent.id as string,
        name: parent.name as string,
        email: (parent.email as string) || null,
        guru_plan: parent.guru_plan as string,
        guru_prompts_used: parent.guru_prompts_used as number,
      },
      school: school || null,
      childCount: childCount || 0,
    });
    setMontreeAuthCookie(response, token, 'homeschool_parent');
    return response;

  } catch (error) {
    console.error('Homeschool auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
