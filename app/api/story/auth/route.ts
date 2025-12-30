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

  // CHECK 1: Hardcoded fallback (always works)
  if (USER_PASSWORDS[username] === password) {
    console.log('[Auth] Hardcoded auth success');
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJWTSecret());

    // Log the login
    try {
      const supabase = getSupabase();
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      await supabase.from('story_login_logs').insert({
        username,
        login_at: new Date().toISOString(),
        session_token: token.substring(0, 50),
        ip_address: ip,
        user_agent: userAgent,
        user_id: username
      });
    } catch (e) {
      console.error('[Auth] Log failed:', e);
    }

    return NextResponse.json({ session: token });
  }

  // CHECK 2: Database with bcrypt (if configured)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabase();
      const { data: users, error } = await supabase
        .from('story_users')
        .select('username, password_hash')
        .eq('username', username)
        .limit(1);

      if (!error && users && users.length > 0) {
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, users[0].password_hash);
        
        if (valid) {
          console.log('[Auth] DB auth success');
          const token = await new SignJWT({ username })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(getJWTSecret());

          // Log the login
          try {
            const ip = req.headers.get('x-forwarded-for') || 'unknown';
            const userAgent = req.headers.get('user-agent') || 'unknown';
            
            await supabase.from('story_login_logs').insert({
              username,
              login_at: new Date().toISOString(),
              session_token: token.substring(0, 50),
              ip_address: ip,
              user_agent: userAgent,
              user_id: username
            });
          } catch (e) {
            console.error('[Auth] Log failed:', e);
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

export async function DELETE() {
  return NextResponse.json({ success: true });
}
