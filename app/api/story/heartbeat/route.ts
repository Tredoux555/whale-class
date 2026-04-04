import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken, getSessionToken } from '@/lib/story-db';

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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Heartbeat] Error:', e);
    return NextResponse.json({ ok: true }); // Never fail heartbeats
  }
}
