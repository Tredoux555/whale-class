import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase } from '@/lib/supabase-client';

// HARDCODED ADMIN CREDENTIALS - fallback if DB/bcrypt fails
const ADMIN_USERS: Record<string, string> = {
  'T': 'redoux',
  'Z': 'oe',
};

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

// Log admin login to database
async function logAdminLogin(
  supabase: any, 
  username: string, 
  token: string,
  req: NextRequest
): Promise<void> {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    await supabase.from('story_admin_login_logs').insert({
      username,
      login_time: new Date().toISOString(),
      session_token: token.substring(0, 50),
      ip_address: ip,
      user_agent: userAgent
    });
  } catch (e) {
    console.error('[AdminAuth] Login log failed:', e);
  }
}

export async function POST(req: NextRequest) {
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

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const supabase = getSupabase();

  // CHECK 1: Hardcoded fallback (always works)
  if (ADMIN_USERS[username] === password) {
    const token = await new SignJWT({ username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJWTSecret());
    
    // Log the login
    await logAdminLogin(supabase, username, token, req);
    
    return NextResponse.json({ session: token });
  }

  // CHECK 2: Database with bcrypt (if configured)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: users, error } = await supabase
        .from('story_admin_users')
        .select('username, password_hash')
        .eq('username', username)
        .limit(1);

      if (!error && users && users.length > 0) {
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, users[0].password_hash);

        if (valid) {
          const token = await new SignJWT({ username, role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(getJWTSecret());
          
          // Log the login
          await logAdminLogin(supabase, username, token, req);
          
          return NextResponse.json({ session: token });
        }
      }
    }
  } catch (e) {
    console.error('[AdminAuth] DB check failed:', e);
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, getJWTSecret());

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, username: payload.username });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = getSupabase();
      
      // Mark the session as logged out
      await supabase
        .from('story_admin_login_logs')
        .update({ logout_at: new Date().toISOString() })
        .eq('session_token', token.substring(0, 50))
        .is('logout_at', null);
    }
  } catch (e) {
    console.error('[AdminAuth] Logout tracking failed:', e);
  }
  return NextResponse.json({ success: true });
}
