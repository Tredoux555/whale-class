import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

// HARDCODED ADMIN CREDENTIALS - fallback if DB/bcrypt fails
const ADMIN_USERS: Record<string, string> = {
  'T': 'redoux',
  'Z': 'oe',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export async function POST(req: NextRequest) {
  console.log('[AdminAuth] POST request');
  
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
  console.log('[AdminAuth] Login:', username);

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  // CHECK 1: Hardcoded fallback (always works)
  if (ADMIN_USERS[username] === password) {
    console.log('[AdminAuth] Hardcoded auth success');
    const token = await new SignJWT({ username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJWTSecret());
    return NextResponse.json({ session: token });
  }

  // CHECK 2: Database with bcrypt (if configured)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getSupabase();
      const { data: users, error } = await supabase
        .from('story_admin_users')
        .select('username, password_hash')
        .eq('username', username)
        .limit(1);

      if (!error && users && users.length > 0) {
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, users[0].password_hash);
        
        if (valid) {
          console.log('[AdminAuth] DB auth success');
          const token = await new SignJWT({ username, role: 'admin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(getJWTSecret());
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
