// app/api/story/admin/call/route.ts
//
// Admin-only. The admin (Tredoux) starts — or ends — a voice call to a
// Story user.
//
//   POST { username }            -> create a 'ringing' story_calls row,
//                                   return { callId, channel }
//   POST { callId, action:'end' } -> mark the call ended
//
// Starting a call first supersedes any stale ringing/active call to that
// same user, so the incoming-call banner never stacks — one call at a time.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';
import { isAgoraConfigured } from '@/lib/montree/appointments/agora/config';
import { sendCallPush } from '@/lib/story/push';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const adminUser = await verifyAdminToken(req.headers.get('authorization'));
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { username?: string; callId?: string; action?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabase = getSupabase();

  // ── End an existing call ──────────────────────────────────────────
  if (body.action === 'end') {
    const callId = body.callId;
    if (!callId || !UUID_RE.test(callId)) {
      return NextResponse.json({ error: 'Invalid callId.' }, { status: 400 });
    }
    const { error } = await supabase
      .from('story_calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', callId)
      .neq('status', 'ended');
    if (error) {
      return NextResponse.json({ error: 'Could not end the call.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // ── Start a new call ──────────────────────────────────────────────
  if (!isAgoraConfigured()) {
    return NextResponse.json(
      { error: 'Voice calls are not configured on this server yet.' },
      { status: 503 }
    );
  }
  const username = (body.username || '').trim();
  if (!username) {
    return NextResponse.json({ error: 'A username is required.' }, { status: 400 });
  }
  // Voice or video — defaults to voice.
  const mode: 'voice' | 'video' = body.mode === 'video' ? 'video' : 'voice';

  // Supersede any stale ringing/active call to this user.
  await supabase
    .from('story_calls')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('username', username)
    .in('status', ['ringing', 'active']);

  // Channel: 'story-' + 20 chars of base64url entropy (~120 bits). Same
  // anti-collision posture as the Montree appointment channel naming.
  const channel = 'story-' + randomBytes(15).toString('base64url');

  const { data: created, error } = await supabase
    .from('story_calls')
    .insert({ username, channel, status: 'ringing', mode, initiated_by: adminUser })
    .select('id, channel')
    .single();
  if (error || !created) {
    console.error('[story-call] create failed:', error?.message);
    return NextResponse.json({ error: 'Could not start the call.' }, { status: 500 });
  }

  // Push the call to the user's devices so they're alerted even with the
  // Story app closed. Fire-and-forget — Railway keeps the process alive;
  // a push failure never blocks the admin's call.
  void sendCallPush(username, created.id, adminUser, mode);

  return NextResponse.json({ callId: created.id, channel: created.channel, mode });
}
