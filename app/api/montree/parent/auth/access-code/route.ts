// /api/montree/parent/auth/access-code/route.ts
// POST: Validate parent invite/access code and create session
// GET: Check if session is valid
// UNIFIED: Uses montree_parent_invites table for all access codes

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
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
      return NextResponse.json({
        success: false,
        error: 'Invalid access code. Please check and try again.'
      }, { status: 401 });
    }

    // Check if code is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'This access code has expired. Please contact your teacher for a new code.'
      }, { status: 401 });
    }

    // Check max uses only if max_uses is set (not unlimited/null)
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return NextResponse.json({
        success: false,
        error: 'This access code has reached its use limit. Please contact your teacher for a new code.'
      }, { status: 401 });
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, nickname, classroom_id')
      .eq('id', invite.child_id)
      .single();

    if (childError || !child) {
      console.error('Child lookup error:', childError);
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

    // Create session data
    const sessionData = {
      child_id: child.id,
      child_name: child.name || child.nickname,
      classroom_id: child.classroom_id,
      invite_id: invite.id,
      created_at: new Date().toISOString(),
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('montree_parent_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
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
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('montree_parent_session');

    if (!sessionCookie?.value) {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

    // Validate session
    try {
      const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());

      if (!session.child_id) {
        return NextResponse.json({
          success: false,
          authenticated: false
        });
      }

      return NextResponse.json({
        success: true,
        authenticated: true,
        child_id: session.child_id,
        child_name: session.child_name,
        classroom_id: session.classroom_id,
      });
    } catch {
      return NextResponse.json({
        success: false,
        authenticated: false
      });
    }

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Session check failed'
    }, { status: 500 });
  }
}
