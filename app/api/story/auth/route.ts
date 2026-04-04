import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase, getJWTSecret } from '@/lib/story-db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

// NOTE: Hardcoded plaintext passwords removed in Phase 4 security hardening.
// All users must authenticate via bcrypt hashes in the story_users table.

async function logLogin(username: string, ip: string, userAgent: string, token: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('story_login_logs').insert({
      username,
      login_at: new Date().toISOString(),
      session_token: token.substring(0, 50),
      ip_address: ip,
      user_agent: userAgent
    });

    if (error) {
      console.error('[Auth] Login log FAILED — code:', error.code, 'message:', error.message, 'details:', error.details, 'hint:', error.hint);
    }
  } catch (e) {
    console.error('[Auth] Login log exception:', e);
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const supabaseStory = getSupabase();
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);

  // Rate limiting
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabaseStory, ip, '/api/story/auth', 5, 15
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
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

  // Database bcrypt authentication (only path)
  try {
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
        const token = await new SignJWT({ username })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(getJWTSecret());

        // Log the login
        await logLogin(username, ip, userAgent, token);

        return NextResponse.json({ session: token });
      }
    }
  } catch (e) {
    console.error('[Auth] DB check failed:', e);
  }

  await logAudit(supabaseStory, {
    adminIdentifier: username || ip,
    action: 'login_failed',
    resourceType: 'story_user',
    ipAddress: ip,
    userAgent,
  });
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}

export async function DELETE(req: NextRequest) {
  // Logout - mark as logged out
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = getSupabase();
      
      // Mark recent login as logged out
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
