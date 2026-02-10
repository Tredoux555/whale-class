// app/api/montree/parent/login/route.ts
// Session 116: Parent login
// Session 125: Fixed to use bcrypt
// Phase 2: Migrated to shared password utility with dual-verify

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase-client';
import { createParentToken } from '@/lib/montree/server-auth';
import { verifyPassword, isLegacyHash, hashPassword } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/parent/login', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    
    // 1. Find parent by email
    const { data: parent, error: parentError } = await supabase
      .from('montree_parents')
      .select(`
        id, name, email, password_hash, is_active, school_id,
        montree_schools!inner ( id, name )
      `)
      .eq('email', email.toLowerCase())
      .single();
    
    if (parentError || !parent) {
      await logAudit(supabase, {
        adminIdentifier: email || ip,
        action: 'login_failed',
        resourceType: 'parent',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!parent.is_active) {
      await logAudit(supabase, {
        adminIdentifier: email || ip,
        action: 'login_failed',
        resourceType: 'parent',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Account is disabled' }, { status: 401 });
    }

    // 2. Verify password (supports both bcrypt and legacy SHA-256)
    const validPassword = await verifyPassword(password, parent.password_hash);
    if (!validPassword) {
      await logAudit(supabase, {
        adminIdentifier: email || ip,
        action: 'login_failed',
        resourceType: 'parent',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Re-hash legacy SHA-256 to bcrypt on successful login
    if (isLegacyHash(parent.password_hash)) {
      const bcryptHash = await hashPassword(password);
      await supabase.from('montree_parents').update({ password_hash: bcryptHash }).eq('id', parent.id);
    }
    
    // 3. Get parent's children
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select(`
        child_id,
        montree_children!inner ( id, name,
          montree_classrooms!inner ( id, name )
        )
      `)
      .eq('parent_id', parent.id);
    
    const children = (links || []).map((link: Record<string, unknown>) => ({
      id: link.montree_children.id,
      name: link.montree_children.name,
      classroom_name: link.montree_children.montree_classrooms.name
    }));

    // 4. Update last login
    await supabase
      .from('montree_parents')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', parent.id);

    const school = parent.montree_schools as Record<string, unknown>;

    // 5. Set session cookie with signed JWT (replaces forgeable base64)
    const sessionToken = await createParentToken({
      sub: children[0]?.id,
      parentId: parent.id,
      childName: children[0]?.name,
    });
    const cookieStore = await cookies();
    cookieStore.set('montree_parent_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // 6. Return session
    return NextResponse.json({
      success: true,
      session: {
        parent: {
          id: parent.id,
          name: parent.name,
          email: parent.email
        },
        school: {
          id: school.id,
          name: school.name
        },
        children,
        loginAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Parent login error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
