// app/api/dark-phonics/lead/route.ts
//
// "New books land every few weeks — get them first." POST {email, role?, website}.
//
// One row in montree_dp_leads, one welcome email, and never a second of either
// for the same address:
//   - `email` is UNIQUE, and the insert is an upsert that IGNORES a duplicate,
//     so a double-tap or a second visit is a 200 with `{ok:true}` rather than a
//     conflict the strip would have to explain;
//   - `welcomed_at` is stamped only when the row is new, so re-subscribing does
//     not re-send the welcome.
//
// Honeypot + rate limit, both the same shapes the community signup route uses.
// The email send is awaited but never allowed to fail the request: a Resend
// outage must not lose the address.

import { NextResponse, type NextRequest } from 'next/server';

import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { sendDarkPhonicsWelcomeEmail } from '@/lib/montree/email';
import {
  DP_AID_COOKIE,
  DP_UTM_COOKIE,
  isAid,
  parseUtmCookie,
} from '@/lib/montree/dark-phonics/attribution';
import { validateLead } from '@/lib/montree/dark-phonics/leads';

export const dynamic = 'force-dynamic';

const OK = () => NextResponse.json({ ok: true });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = validateLead(body);
  if (!parsed.ok) {
    // A honeypot hit is thanked, not told. Telling a bot it was caught only
    // teaches it to leave the field empty next time.
    if (parsed.honeypot) return OK();
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const supabase = getSupabase();
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase,
    ip,
    '/api/dark-phonics/lead',
    8,
    10,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many tries. Give it a minute.', retryAfterSeconds },
      { status: 429 },
    );
  }

  const cookieAid = request.cookies.get(DP_AID_COOKIE)?.value;
  const utm = parseUtmCookie(request.cookies.get(DP_UTM_COOKIE)?.value);

  // `ignoreDuplicates` turns the unique-email conflict into "no row inserted"
  // instead of an error — and `data` then tells us whether this address is new.
  const { data, error } = await supabase
    .from('montree_dp_leads')
    .upsert(
      {
        email: parsed.value.email,
        role: parsed.value.role,
        utm: utm ?? null,
        aid: isAid(cookieAid) ? cookieAid : null,
      },
      { onConflict: 'email', ignoreDuplicates: true },
    )
    .select('id, welcomed_at');

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      // Migration 360 has not been run yet. Say so honestly rather than
      // pretending the address was saved.
      console.warn('[dp/lead] montree_dp_leads is missing — migration 360 not run');
      return NextResponse.json(
        { error: 'The mailing list is not set up yet. Try again tomorrow.', code: 'migration_pending' },
        { status: 503 },
      );
    }
    console.error('[dp/lead] insert failed:', error.message);
    return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 500 });
  }

  const inserted = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (inserted && !inserted.welcomed_at) {
    try {
      const res = await sendDarkPhonicsWelcomeEmail(parsed.value.email, parsed.value.role);
      if (res.success) {
        const { error: stampError } = await supabase
          .from('montree_dp_leads')
          .update({ welcomed_at: new Date().toISOString() })
          .eq('id', inserted.id);
        if (stampError) console.error('[dp/lead] welcomed_at stamp failed:', stampError.message);
      } else {
        console.error('[dp/lead] welcome email failed:', res.error);
      }
    } catch (err) {
      // The address is saved; the email can be re-sent by hand. Never 500 here.
      console.error('[dp/lead] welcome email threw:', err);
    }
  }

  return OK();
}
