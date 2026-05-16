import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getSupabase, getJWTSecret } from '@/lib/story-db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

// NOTE: Hardcoded plaintext passwords removed in Phase 4 security hardening.
// All users must authenticate via bcrypt hashes in the story_users table.

async function logLogin(username: string, ip: string, userAgent: string, token: string): Promise<boolean> {
  const shortToken = token.substring(0, 50);
  const payload = {
    username,
    login_at: new Date().toISOString(),
    session_token: shortToken,
    ip_address: ip,
    user_agent: userAgent
  };

  // Try up to 3 times — the single most important write in the Story system
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('story_login_logs')
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (!error && data) {
        console.log(`[Auth] Login logged: user=${username} ip=${ip} log_id=${data.id} attempt=${attempt}`);
        return true;
      }

      // Check if row already exists (duplicate session_token from retry)
      if (error?.code === '23505') {
        console.log(`[Auth] Login log already exists for token (attempt ${attempt})`);
        return true;
      }

      console.error(`[Auth] Login log attempt ${attempt}/3 FAILED:`, error?.code, error?.message);
    } catch (e) {
      console.error(`[Auth] Login log attempt ${attempt}/3 exception:`, e);
    }

    // Brief pause before retry
    if (attempt < 3) await new Promise(r => setTimeout(r, 200));
  }

  console.error(`[Auth] LOGIN LOG FAILED ALL 3 ATTEMPTS: user=${username} ip=${ip} token=${shortToken}`);
  return false;
}

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const supabaseStory = getSupabase();
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);

  // Rate limiting — bumped from 5/15min to 30/15min since this endpoint is
  // keyed by IP and families/schools share a single public IP. The heartbeat
  // self-heal now catches any missed login rows, but we still want legitimate
  // POSTs to go through most of the time.
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabaseStory, ip, '/api/story/auth', 30, 15
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
        // 🚨 Session 113 V2 Story audit F-1.4 — stamp role: 'user' so the
        // user-token verifier can eventually positive-require it. For now
        // the verifier negative-checks role !== 'admin' for backward
        // compat with legacy no-role tokens; tighten to positive-require
        // once existing tokens have rolled over (24h TTL).
        const token = await new SignJWT({ username, role: 'user' })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(getJWTSecret());

        // Log the login (3 retries). Even if all fail, return token —
        // heartbeat self-heal will catch it, and Z can still use the site.
        const logged = await logLogin(username, ip, userAgent, token);

        return NextResponse.json({ session: token, _loginLogged: logged });
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
