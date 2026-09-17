// app/api/montree/cron/feedback-outbox/route.ts
//
// Drain the feedback board's email outbox.
//
// WHY IT EXISTS: notify.ts writes a durable outbox row and then tries to send
// immediately, so the common case needs nothing scheduled. This route is the
// safety net for the cases where that inline attempt cannot finish — the
// container is recycled mid-request, Resend is briefly down, a burst of twenty
// subscribers outlives the response. Without it, "we'll email you when someone
// replies" would be true only most of the time, which on a feedback board is
// the same as not being true.
//
// Hit it every few minutes, exactly like the other crons:
//   POST https://montree.xyz/api/montree/cron/feedback-outbox
//   header: x-cron-secret: <CRON_SECRET>
//
// FAIL-CLOSED AUTH: sends mail, so a missing env or a wrong header is a 401.
// No super-admin fallback — this must never run from a browser session.

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { drainOutbox } from '@/lib/montree/feedback/notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const supplied = request.headers.get('x-cron-secret');
  if (typeof supplied !== 'string' || !supplied) return false;
  // Timing-safe: a naive === leaks how many leading bytes matched through
  // response latency, which is exactly the side channel this header exists
  // to close.
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  try {
    const result = await drainOutbox(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[feedback/cron/outbox]', err);
    return NextResponse.json({ error: 'Drain failed.' }, { status: 500 });
  }
}
