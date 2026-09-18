// app/api/dark-phonics/event/route.ts
//
// The hub's one measurement endpoint. POST {event, lesson?, stage?, props?}.
//
// 🚨 IT IS OPEN TO THE WORLD, so it is narrow on purpose:
//   - the event name must be on the allow-list in lib/.../events.ts;
//   - the body is capped at 4 KB before it is parsed at all;
//   - every row is bucketed per anonymous id (dp_aid) by the existing
//     database-backed rate limiter, 120 events per 10 minutes, which is far
//     more than a real lesson produces and far less than a script wants;
//   - the answer is ALWAYS 204, even for a rejected body. A sendBeacon cannot
//     read a status code, and telling a prober which names are valid is the
//     one thing this route can leak.
//
// Pre-migration (montree_dp_events missing) it is a silent no-op: the hub ships
// before the owner runs migration 360 by hand, and a 42P01 in the log every
// time a child turns a page would bury everything else.

import { NextResponse, type NextRequest } from 'next/server';

import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import {
  DP_AID_COOKIE,
  DP_UTM_COOKIE,
  isAid,
  parseUtmCookie,
} from '@/lib/montree/dark-phonics/attribution';
import { validateEvent } from '@/lib/montree/dark-phonics/events';

export const dynamic = 'force-dynamic';

const MAX_BODY = 4096;
const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (!raw || raw.length > MAX_BODY) return NO_CONTENT();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NO_CONTENT();
    }

    const result = validateEvent(parsed);
    if (!result.ok) return NO_CONTENT();

    const cookieAid = request.cookies.get(DP_AID_COOKIE)?.value;
    // An aid we cannot vouch for is dropped rather than stored: a row keyed on
    // a hand-typed string is worse than an anonymous row.
    const aid = isAid(cookieAid) ? cookieAid : null;

    const supabase = getSupabase();

    // Bucket on the aid where there is one, on the IP where there is not.
    const bucket =
      aid ??
      (request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown');
    const { allowed } = await checkRateLimit(supabase, bucket, '/api/dark-phonics/event', 120, 10);
    if (!allowed) return NO_CONTENT();

    const utm = parseUtmCookie(request.cookies.get(DP_UTM_COOKIE)?.value);

    const { error } = await supabase.from('montree_dp_events').insert({
      aid,
      event: result.value.event,
      lesson: result.value.lesson,
      stage: result.value.stage,
      utm: utm ?? null,
      props: result.value.props ?? null,
      ua: (request.headers.get('user-agent') || '').slice(0, 400) || null,
      host: request.headers.get('host') || null,
    });

    if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
      console.error('[dp/event] insert failed:', error.message);
    }
  } catch (err) {
    // Measurement is never allowed to become an incident.
    console.error('[dp/event] threw:', err);
  }
  return NO_CONTENT();
}
