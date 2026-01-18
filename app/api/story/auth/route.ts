import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase, getJWTSecret } from '@/lib/story-db';

// HARDCODED USER CREDENTIALS - fallback if DB/bcrypt fails
const USER_PASSWORDS: Record<string, string> = {
  'T': 'redoux',
  'Z': 'oe',
};

export async function POST(req: NextRequest) {
  console.log('[Auth] POST login request');
  
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { username, password } = body;
  console.log('[Auth] Login attempt for:', username);

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const supabase = getSupabase();
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // CHECK 1: Hardcoded fallback (always works)
  if (USER_PASSWORDS[username] === password) {
    console.log('[Auth] Hardcoded auth success for:', username);
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJWTSecret());

    // Log the login - use only core columns
    try {
      const { error: logError } = await supabase.from('story_login_logs').insert({
        username,
        login_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent
      });
      
      if (logError) {
        console.error('[Auth] Login log insert error:', logError);
      } else {
        console.log('[Auth] Login logged successfully for:', username);
      }
    } catch (e) {
      console.error('[Auth] Login log exception:', e);
    }

    return NextResponse.json({ session: token });
  }

  // CHECK 2: Database with bcrypt (if configured)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: users, error } = await supabase
        .from('story_users')
        .select('username, password_hash')
        .eq('username', username)
        .limit(1);

      if (!error && users && users.length > 0) {
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, users[0].password_hash);
        
        if (valid) {
          console.log('[Auth] DB auth success for:', username);
          const token = await new SignJWT({ username })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(getJWTSecret());

          // Log the login
          try {
            const { error: logError } = await supabase.from('story_login_logs').insert({
              username,
              login_at: new Date().toISOString(),
              ip_address: ip,
              user_agent: userAgent
            });
            
            if (logError) {
              console.error('[Auth] Login log insert error:', logError);
            } else {
              console.log('[Auth] Login logged successfully for:', username);
            }
          } catch (e) {
            console.error('[Auth] Login log exception:', e);
          }

          return NextResponse.json({ session: token });
        }
      }
    }
  } catch (e) {
    console.error('[Auth] DB check failed:', e);
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = getSupabase();
      
      // Mark the session as logged out
      await supabase
        .from('story_login_logs')
        .update({ logout_at: new Date().toISOString() })
        .eq('session_token', token.substring(0, 50))
        .is('logout_at', null);
    }
  } catch (e) {
    console.error('[Auth] Logout tracking failed:', e);
  }
  return NextResponse.json({ success: true });
}
