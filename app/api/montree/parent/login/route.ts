// app/api/montree/parent/login/route.ts
// Session 116: Parent login
// Session 125: Fixed to use bcrypt
// Phase 2: Migrated to shared password utility with dual-verify

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase-client';
import { createParentToken, MONTREE_JWT_TTL_DAYS } from '@/lib/montree/server-auth';
import { verifyPassword, isLegacyHash, hashPassword } from '@/lib/montree/password';
import { isSchoolLocked } from '@/lib/montree/school-lock';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { one } from '@/lib/supabase-embed';

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

    // Refuse a locked school BEFORE minting the session cookie. isSchoolLocked is
    // cached + fail-open, so an outage never locks parents out. (Closes the
    // "locked school can still mint a new parent session" gap.)
    if (parent.school_id && (await isSchoolLocked(parent.school_id))) {
      return NextResponse.json(
        { error: 'This account has been locked.', code: 'school_locked' },
        { status: 403 }
      );
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
    
    // Nested to-one embeds: objects at runtime, typed as possibly-arrays.
    const children = (links || []).flatMap((link) => {
      const child = one(link.montree_children);
      if (!child) return [];
      return [{
        id: child.id,
        name: child.name,
        classroom_name: one(child.montree_classrooms)?.name,
      }];
    });

    // 4. Update last login
    await supabase
      .from('montree_parents')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', parent.id);

    const school = one(parent.montree_schools);
    if (!school) {
      // Every parent row carries a school_id, so this only happens if the embed
      // came back empty — a broken row rather than a bad password.
      console.error('[parent/login] parent has no school embed', parent.id);
      return NextResponse.json({ error: 'Account is not linked to a school' }, { status: 500 });
    }

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
      maxAge: MONTREE_JWT_TTL_DAYS * 24 * 60 * 60, // parity with JWT TTL (default 3650d)
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
