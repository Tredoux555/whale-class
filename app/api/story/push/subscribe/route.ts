// app/api/story/push/subscribe/route.ts
//
// A Story user's browser registers its Web Push subscription here so the
// admin's call can reach them when the app is closed. User-auth gated
// (story-auth cookie / Bearer). Upserts on the push endpoint — a device
// re-subscribing updates its row rather than duplicating it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserTokenFromRequest } from '@/lib/story-db';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const username = await verifyUserTokenFromRequest(req);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }
  if (sub.endpoint.length > 2000) {
    return NextResponse.json({ error: 'Endpoint too long.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('story_push_subscriptions')
    .upsert(
      {
        username,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: (req.headers.get('user-agent') || '').slice(0, 400) || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('[story-push] subscribe failed:', error.message);
    return NextResponse.json({ error: 'Could not save the subscription.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
