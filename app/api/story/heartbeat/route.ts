import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getSessionToken } from '@/lib/story-db';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

// A new "visit" is logged when the user returns after this many ms of inactivity
const VISIT_GAP_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const username = await verifyUserToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ ok: true }); // Don't 401 heartbeats
    }

    const sessionToken = getSessionToken(req.headers.get('authorization'));
    if (!sessionToken) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabase();
    const shortToken = sessionToken.substring(0, 50);
    const now = new Date();
    const nowISO = now.toISOString();
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // 1. Check current online session to detect visit gaps
    const { data: existing } = await supabase
      .from('story_online_sessions')
      .select('last_seen_at')
      .eq('session_token', sessionToken)
      .maybeSingle() as { data: { last_seen_at: string } | null };

    const lastSeenAt = existing?.last_seen_at ? new Date(existing.last_seen_at) : null;
    const gap = lastSeenAt ? now.getTime() - lastSeenAt.getTime() : Infinity;
    const isNewVisit = gap > VISIT_GAP_MS;

    // 2. Log a new visit if returning after 5+ min gap (or first heartbeat ever)
    if (isNewVisit) {
      try {
        await supabase
          .from('story_visits')
          .insert({
            username,
            visited_at: nowISO,
            last_active_at: nowISO,
            ip_address: ip,
            user_agent: userAgent,
          });
        console.log(`[Heartbeat] New visit logged: user=${username} gap=${gap === Infinity ? 'first' : Math.round(gap / 1000) + 's'}`);
      } catch (e) {
        console.error('[Heartbeat] Visit log error:', e);
      }
    } else {
      // Update last_active_at on the most recent visit (extends duration)
      try {
        await supabase
          .from('story_visits')
          .update({ last_active_at: nowISO })
          .eq('username', username)
          .order('visited_at', { ascending: false })
          .limit(1);
      } catch (e) {
        // Non-fatal — visit duration just won't update
      }
    }

    // 3. Upsert into story_online_sessions (existing behavior)
    const { error } = await supabase
      .from('story_online_sessions')
      .upsert(
        {
          username,
          session_token: sessionToken,
          last_seen_at: nowISO,
          is_online: true,
        },
        { onConflict: 'session_token' }
      );

    if (error) {
      console.error('[Heartbeat] Online session update failed:', error.message);
    }

    // 4. Self-healing login log (existing behavior — ensures login row exists)
    try {
      const { data: existingLog } = await supabase
        .from('story_login_logs')
        .select('id')
        .eq('session_token', shortToken)
        .limit(1)
        .maybeSingle();

      if (!existingLog) {
        let healed = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          const { error: insErr } = await supabase
            .from('story_login_logs')
            .insert({
              username,
              login_at: nowISO,
              session_token: shortToken,
              ip_address: ip,
              user_agent: userAgent,
            });

          if (!insErr) {
            console.log(`[Heartbeat] Self-healed login log: user=${username} attempt=${attempt}`);
            healed = true;
            break;
          }
          if (insErr.code === '23505') { healed = true; break; }
          console.error(`[Heartbeat] Self-heal attempt ${attempt}/2 FAILED: ${insErr.message}`);
          if (attempt < 2) await new Promise(r => setTimeout(r, 300));
        }
        if (!healed) {
          console.error(`[Heartbeat] SELF-HEAL FAILED: user=${username} token=${shortToken}`);
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
