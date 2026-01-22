// /api/montree/parent/auth/access-code/route.ts
// Validate teacher-provided access code and link parent to child
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code || code.length < 6) {
      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Look up the access code in parent_access_codes table
    const { data: accessCode, error: codeError } = await supabase
      .from('parent_access_codes')
      .select('*, children(id, name, photo_url)')
      .eq('code', code.toUpperCase())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !accessCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired access code' 
      }, { status: 400 });
    }

    // Generate a parent session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day session

    // Create parent session
    const { error: sessionError } = await supabase
      .from('parent_sessions')
      .insert({
        token: sessionToken,
        child_id: accessCode.child_id,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
    }

    // Mark access code as used
    await supabase
      .from('parent_access_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', accessCode.id);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('parent_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      redirect: '/montree/parent/dashboard',
      child: accessCode.children,
    });

  } catch (error) {
    console.error('Access code error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
