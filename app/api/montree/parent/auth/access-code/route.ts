// /api/montree/parent/auth/access-code/route.ts
// POST: Validate parent invite/access code and create session
// GET: Check if session is valid
// UNIFIED: Uses montree_parent_invites table for all access codes

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { cookies } from 'next/headers';
import { createParentToken } from '@/lib/montree/server-auth';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);
    const userAgent = getUserAgent(request.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/parent/auth/access-code', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { code } = await request.json();

    if (!code || code.length < 4) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid access code'
      }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();

    // Look up the invite code in montree_parent_invites
    const { data: invite, error: inviteError } = await supabase
      .from('montree_parent_invites')
      .select(`
        id,
        invite_code,
        child_id,
        expires_at,
        is_active,
        is_reusable,
        use_count,
        max_uses,
        used_at
      `)
      .eq('invite_code', cleanCode)
      .eq('is_active', true)
      .single();

    if (inviteError || !invite) {
      console.error('Invite lookup error:', inviteError);
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'parent_access_code',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({
        success: false,
        error: 'Invalid access code. Please check and try again.'
      }, { status: 401 });
    }

    // Check if code is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'parent_access_code',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({
        success: false,
        error: 'This access code has expired. Please contact your teacher for a new code.'
      }, { status: 401 });
    }

    // Check max uses only if max_uses is set (not unlimited/null)
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'parent_access_code',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({
        success: false,
        error: 'This access code has reached its use limit. Please contact your teacher for a new code.'
      }, { status: 401 });
    }

    // Get child info — school_id needed for provisioning the lightweight
    // parent row below (Session 117 continued fix).
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname, classroom_id, school_id')
      .eq('id', invite.child_id)
      .single();

    if (childError || !child) {
      console.error('Child lookup error:', childError);
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'parent_access_code',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({
        success: false,
        error: 'Could not find child record. Please contact your teacher.'
      }, { status: 404 });
    }

    // Update usage tracking
    await supabase
      .from('montree_parent_invites')
      .update({
        use_count: (invite.use_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    // ── Session 117 continued — Provision a lightweight montree_parents
    // row on first invite redemption. Without this:
    //   - Staff appointment-invite picker can't see the parent
    //   - Parent can't see incoming appointment invitations
    //   - Any route that requires session.parentId returns 403
    //
    // The provisioned row uses placeholders for email/name (the parent
    // hasn't done a full signup yet) but has school_id + is_active=true so
    // it's a first-class queryable entity. Idempotent via the
    // UNIQUE(email, school_id) constraint — re-redemption hits ON CONFLICT
    // and we read the existing row back.
    let provisionedParentId: string | undefined;
    try {
      const placeholderEmail = `pending-${invite.id}@parent.montree.local`;
      const childDisplay = (child.name || child.nickname || 'child').trim();
      const placeholderName = `${childDisplay}'s parent`;
      // Random hash — parent never logs in with email/password until they
      // complete a full signup. The invite code remains their auth path.
      const placeholderHash = `pending:${invite.id}:${Date.now()}`;

      const { data: existingParent } = await supabase
        .from('montree_parents')
        .select('id')
        .eq('email', placeholderEmail)
        .eq('school_id', child.school_id)
        .maybeSingle();

      if (existingParent) {
        provisionedParentId = (existingParent as { id: string }).id;
      } else {
        const { data: newParent, error: parentInsertErr } = await supabase
          .from('montree_parents')
          .insert({
            school_id: child.school_id,
            email: placeholderEmail,
            password_hash: placeholderHash,
            name: placeholderName,
            is_active: true,
          })
          .select('id')
          .single();
        if (parentInsertErr) {
          // 23505 unique_violation race: someone provisioned just before
          // us. Read back.
          if (parentInsertErr.code === '23505') {
            const { data: raced } = await supabase
              .from('montree_parents')
              .select('id')
              .eq('email', placeholderEmail)
              .eq('school_id', child.school_id)
              .maybeSingle();
            if (raced) provisionedParentId = (raced as { id: string }).id;
          } else {
            console.error('[parent/auth] provision parent insert failed', parentInsertErr);
          }
        } else if (newParent) {
          provisionedParentId = (newParent as { id: string }).id;
        }
      }

      // Junction link parent↔child. Idempotent via UNIQUE(parent_id, child_id).
      if (provisionedParentId) {
        const { error: linkErr } = await supabase
          .from('montree_parent_children')
          .insert({
            parent_id: provisionedParentId,
            child_id: child.id,
          });
        // 23505 = link already exists; safe to ignore.
        if (linkErr && linkErr.code !== '23505') {
          console.error('[parent/auth] provision link insert failed', linkErr);
        }
      }
    } catch (provErr) {
      // Don't block login on provisioning failure — fall through to the
      // original invite-only behaviour. Parent will still get into the
      // dashboard; staff just won't see them in the picker until the
      // next code redemption succeeds.
      console.error('[parent/auth] provisioning failed (non-fatal)', provErr);
    }

    // Create signed JWT token (replaces forgeable base64)
    const sessionToken = await createParentToken({
      sub: child.id,
      childName: child.name || child.nickname,
      classroomId: child.classroom_id,
      inviteId: invite.id,
      // Include parentId when provisioning succeeded — unlocks the routes
      // that gate on session.parentId (appointments, messaging, etc.).
      ...(provisionedParentId ? { parentId: provisionedParentId } : {}),
    });

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('montree_parent_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Phase 8: Log successful parent access
    logAudit(supabase, {
      adminIdentifier: `parent:${invite.id}`,
      action: 'login_success',
      resourceType: 'parent',
      resourceId: invite.id,
      resourceDetails: { endpoint: '/api/montree/parent/auth/access-code', childId: child?.id },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return NextResponse.json({
      success: true,
      redirect: '/montree/parent/dashboard',
      child: {
        id: child.id,
        name: child.name || child.nickname,
      }
    });

  } catch (error) {
    console.error('Parent auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // 🚨 Session 113 V2 Parent audit F-1.1 — session-check endpoint must
    // re-verify parent↔child link. Without this, a stale 30-day cookie
    // continues to report "authenticated: true" after invite revocation.
    const supabase = getSupabase();
    const session = await resolveAuthorizedParent(supabase);

    if (!session) {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      child_id: session.childId,
      child_name: session.childName,
      classroom_id: session.classroomId,
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Session check failed'
    }, { status: 500 });
  }
}
