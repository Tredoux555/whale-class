// app/api/story/coach/push/subscribe/route.ts
//
// A Lyf Coach browser registers its Web Push subscription here so the coach's
// reminders can reach it when the app is closed. Story-admin-auth gated; the
// subscription is keyed by the caller's SPACE (from the verified token, never
// the client). Upserts on the endpoint so a re-subscribe updates rather than
// duplicates. Distinct from /api/story/push/{subscribe,member-subscribe}.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };
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
    .from('story_coach_push_subscriptions')
    .upsert(
      {
        space,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: (req.headers.get('user-agent') || '').slice(0, 400) || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('[coach-push] subscribe failed:', error.message);
    return NextResponse.json({ error: 'Could not save the subscription.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
