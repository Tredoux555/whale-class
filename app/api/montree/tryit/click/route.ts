import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';

// POST /api/montree/tryit/click
//
// Fire-and-forget interest signal: one row per press of a "Try it" CTA on the
// public landing page. The client does NOT await this — the gate modal opens
// regardless — so this route must never be able to make a visitor's click feel
// broken. Every failure path still answers 200 { ok: true }, exactly like
// /api/montree/visitors/track does.
//
// Rate limit is deliberately generous (20 / 15 min / IP): a genuinely
// interested visitor may open and close the modal several times while reading,
// and losing those clicks would understate real demand. It exists only to stop
// a loop writing junk rows forever.

const MAX_REFERRER_LEN = 2048;
const MAX_UA_LEN = 1024;
const MAX_LOCALE_LEN = 12;

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const ip = getClientIP(req.headers);
    const { allowed } = await checkRateLimit(
      supabase, ip, '/api/montree/tryit/click', 20, 15
    );
    if (!allowed) {
      // Silently accepted — a rate-limited click is not an error the visitor
      // should ever see, and a 429 would only make the client retry.
      return NextResponse.json({ ok: true });
    }

    // Body is optional: the click is worth recording even if it arrives empty.
    let body: { referrer?: string; locale?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const userAgent = req.headers.get('user-agent')?.slice(0, MAX_UA_LEN) || null;
    const referrer =
      typeof body.referrer === 'string' ? body.referrer.slice(0, MAX_REFERRER_LEN) : null;
    const locale =
      typeof body.locale === 'string' ? body.locale.slice(0, MAX_LOCALE_LEN) : null;

    const { error } = await supabase.from('montree_tryit_clicks').insert({
      ip: ip?.slice(0, 45) || null,
      user_agent: userAgent,
      referrer,
      locale,
    });

    if (error) {
      // 42P01 = undefined_table → migration 316 hasn't run yet. Not an
      // incident: the gate still works, we just aren't counting yet.
      if (error.code !== '42P01') {
        console.error('[tryit/click] insert failed:', error.code);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[tryit/click POST] failed:', err);
    // Always 200 — a tracking failure must never surface to the visitor.
    return NextResponse.json({ ok: true });
  }
}
