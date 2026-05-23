// app/api/story/agora-token/route.ts
//
// Mint an Agora publish-side join token for a Story voice call. Hit by
// BOTH sides:
//   - the admin (Tredoux), authenticated via the story-admin Bearer token
//   - the Story user, authenticated via the story-auth cookie / Bearer
//
// The caller MUST pass ?as=admin|user — an explicit role hint. This is the
// Session 120 lesson from the Montree calling system (architectural rule
// #221): never let the server "guess" identity from whichever cookie is
// present, or two participants can collapse to the same UID and kick each
// other off the channel.
//
// Reuses the Agora engine wholesale — buildJoinToken + isAgoraConfigured
// from lib/montree/appointments/agora/*. Only the auth + the call lookup
// are Story-specific.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, verifyUserTokenFromRequest } from '@/lib/story-db';
import { buildJoinToken } from '@/lib/montree/appointments/agora/token-builder';
import { isAgoraConfigured } from '@/lib/montree/appointments/agora/config';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  if (!isAgoraConfigured()) {
    return NextResponse.json(
      { error: 'Voice calls are not configured on this server yet.' },
      { status: 503 }
    );
  }

  const asHint = (new URL(req.url).searchParams.get('as') || '').toLowerCase();
  if (asHint !== 'admin' && asHint !== 'user') {
    return NextResponse.json({ error: 'Missing ?as=admin|user' }, { status: 400 });
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

  // Identify the caller through the correct Story auth path. The two
  // verifiers are mutually exclusive — verifyAdminToken requires
  // role='admin', verifyUserToken REJECTS role='admin' — so a token sent
  // down the wrong path fails cleanly.
  let identityRole: 'story-admin' | 'story-user';
  let identityId: string;
  if (asHint === 'admin') {
    const adminUser = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    identityRole = 'story-admin';
    identityId = adminUser;
  } else {
    const username = await verifyUserTokenFromRequest(req);
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    identityRole = 'story-user';
    identityId = username;
  }

  const supabase = getSupabase();
  const { data: call, error } = await supabase
    .from('story_calls')
    .select('id, username, channel, status, mode, initiated_by')
    .eq('id', callId)
    .maybeSingle();
  if (error || !call) {
    return NextResponse.json({ error: 'Call not found.' }, { status: 404 });
  }
  if (call.status === 'ended') {
    return NextResponse.json({ error: 'This call has ended.' }, { status: 409 });
  }

  // Cross-pollination: a user may ONLY join a call addressed to them.
  if (asHint === 'user' && call.username !== identityId) {
    return NextResponse.json({ error: 'This call is not yours.' }, { status: 403 });
  }

  // Distinct role prefixes ('story-admin' vs 'story-user') guarantee the two
  // participants hash to different Agora UIDs even inside the same channel.
  const token = buildJoinToken({
    channel: call.channel,
    role: identityRole,
    identityId,
  });
  if (!token) {
    return NextResponse.json({ error: 'Could not mint a token.' }, { status: 500 });
  }

  // The user committing to join flips the call ringing -> active. Guarded
  // on status='ringing' so a late token refresh can't resurrect an ended
  // call (it would already have failed the 'ended' check above anyway).
  if (asHint === 'user' && call.status === 'ringing') {
    await supabase
      .from('story_calls')
      .update({ status: 'active' })
      .eq('id', callId)
      .eq('status', 'ringing');
  }

  console.log('[story-agora-token]', {
    callId,
    asHint,
    identityId,
    channel: token.channel,
    uid: token.uid,
  });

  return NextResponse.json({
    appId: token.appId,
    channel: token.channel,
    uid: token.uid,
    token: token.token,
    expiresAt: token.expiresAt,
    // voice or video — the call UI uses this to decide on the camera.
    mode: call.mode === 'video' ? 'video' : 'voice',
    // Who the OTHER person is, for the call UI.
    remoteName: asHint === 'admin' ? call.username : call.initiated_by,
  });
}
