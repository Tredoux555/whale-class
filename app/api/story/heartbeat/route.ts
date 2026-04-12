import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getSessionToken } from '@/lib/story-db';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      console.warn('[Heartbeat] Auth failed — no valid user token');
      return NextResponse.json({ ok: true }); // Don't 401 heartbeats
    }

    const sessionToken = getSessionToken(req.headers.get('authorization'));
    if (!sessionToken) {
      console.warn('[Heartbeat] No session token for user:', username);
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabase();
    const shortToken = sessionToken.substring(0, 50);

    // Upsert into story_online_sessions
    const { error } = await supabase
      .from('story_online_sessions')
      .upsert(
        {
          username,
          session_token: sessionToken,
          last_seen_at: new Date().toISOString(),
          is_online: true,
        },
        { onConflict: 'session_token' }
      );

    if (error) {
      console.error('[Heartbeat] Update failed:', error.message);
    }

    // Self-healing login log: ensure every distinct session_token has a
    // row in story_login_logs. If the original POST /api/story/auth call
    // was rate-limited (shared IP) or its insert silently failed, this
    // recovers the missing login so the admin dashboard sees Z every time.
    //
    // This is the LAST LINE OF DEFENSE. If this also fails, the login is
    // truly lost. So we retry twice and log loudly.
    try {
      const { data: existing } = await supabase
        .from('story_login_logs')
        .select('id')
        .eq('session_token', shortToken)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const ip = getClientIP(req.headers);
        const userAgent = getUserAgent(req.headers);
        let healed = false;

        for (let attempt = 1; attempt <= 2; attempt++) {
          const { error: insErr } = await supabase
            .from('story_login_logs')
            .insert({
              username,
              login_at: new Date().toISOString(),
              session_token: shortToken,
              ip_address: ip,
              user_agent: userAgent,
            });

          if (!insErr) {
            console.log(`[Heartbeat] Self-healed login log: user=${username} ip=${ip} attempt=${attempt}`);
            healed = true;
            break;
          }

          // Duplicate key means it was inserted between our SELECT and INSERT — that's fine
          if (insErr.code === '23505') {
            console.log(`[Heartbeat] Login log already exists (race condition ok): user=${username}`);
            healed = true;
            break;
          }

          console.error(`[Heartbeat] Self-heal attempt ${attempt}/2 FAILED: code=${insErr.code} msg=${insErr.message}`);
          if (attempt < 2) await new Promise(r => setTimeout(r, 300));
        }

        if (!healed) {
          console.error(`[Heartbeat] SELF-HEAL FAILED ALL ATTEMPTS: user=${username} token=${shortToken}`);
        }
      }
    } catch (e) {
      console.error('[Heartbeat] Self-heal exception:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Heartbeat] Error:', e);
    return NextResponse.json({ ok: true }); // Never fail heartbeats
  }
}
