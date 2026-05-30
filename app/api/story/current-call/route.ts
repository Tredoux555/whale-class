// app/api/story/current-call/route.ts
//
// User-side call signalling.
//
//   GET  -> the user's latest RINGING call (drives the incoming-call banner
//           poll on the Story page). Returns { call: null } when there's
//           nothing — and never 401s, so the banner poll stays quiet
//           rather than noisy. Only 'ringing' is reported: an 'active' call
//           means the user is already on the call page, and reporting it
//           here would let a never-cleaned-up call show a stale "ongoing"
//           banner forever.
//   POST { callId } -> the user declines / ends a call.
//
// A 'ringing' call older than 2 minutes is treated as unanswered and
// dropped from the GET response, so a missed call doesn't ring forever.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserTokenFromRequest } from '@/lib/story-db';

export const maxDuration = 15;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RING_WINDOW_MS = 2 * 60 * 1000; // unanswered ring goes stale after 2 min

export async function GET(req: NextRequest) {
  const username = await verifyUserTokenFromRequest(req);
  if (!username) {
    return NextResponse.json({ call: null });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_calls')
    .select('id, status, mode, initiated_by, created_at')
    .eq('username', username)
    .eq('status', 'ringing')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ call: null });
  }

  // Drop a ringing call nobody answered inside the window.
  if (Date.now() - new Date(data.created_at).getTime() > RING_WINDOW_MS) {
    return NextResponse.json({ call: null });
  }

  return NextResponse.json({
    call: {
      id: data.id,
      status: data.status,
      mode: data.mode === 'video' ? 'video' : 'voice',
      // Montree facade — never send the real caller identity to the client.
      from: 'Montree',
    },
  });
}

export async function POST(req: NextRequest) {
  const username = await verifyUserTokenFromRequest(req);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { callId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const callId = body.callId;
  if (!callId || !UUID_RE.test(callId)) {
    return NextResponse.json({ error: 'Invalid callId.' }, { status: 400 });
  }

  const supabase = getSupabase();
  // Scoped to this user — a user can only end a call addressed to them.
  const { error } = await supabase
    .from('story_calls')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', callId)
    .eq('username', username)
    .neq('status', 'ended');
  if (error) {
    return NextResponse.json({ error: 'Could not end the call.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
