// app/api/lyf-coach/verify/route.ts
//
// Email confirmation link target. Marks the account verified, clears the token,
// logs the user in on THIS device (they may have clicked from a phone), and
// drops them into the coach. Never starts the trial — signup already did.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';
import { mintCoachPublicToken, coachSessionCookie } from '@/lib/story/coach/public-account';
import {
  VERIFY_TOKEN_TTL_MS,
  FIRST_N_WELCOME,
  countVerifiedPublicAccounts,
  sendCoachWelcomeFirst100Email,
} from '@/lib/story/coach/email-verification';
import { currentPeriodMonth } from '@/lib/story/coach/entitlement';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';
function bounce(path: string) {
  return NextResponse.redirect(new URL(path, APP_URL), 303);
}

export async function GET(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return bounce('/lyf-coach/login?verify=missing');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('username, space, email_verified, email_verify_sent_at')
    .eq('email_verify_token', token)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42703' || error.code === '42P01') return bounce('/lyf-coach/login?verify=unavailable');
    console.error('[lyf-coach/verify] lookup error:', error);
    return bounce('/lyf-coach/login?verify=error');
  }
  if (!data) return bounce('/lyf-coach/login?verify=invalid');

  const row = data as {
    username: string; space: string;
    email_verified: boolean; email_verify_sent_at: string | null;
  };

  if (row.email_verify_sent_at) {
    const sent = new Date(row.email_verify_sent_at).getTime();
    if (Number.isFinite(sent) && Date.now() - sent > VERIFY_TOKEN_TTL_MS) {
      return bounce('/lyf-coach/login?verify=expired');
    }
  }

  // Confirm + clear the token, conditional on the token still matching so a
  // replayed old link can't re-confirm after rotation.
  const { error: upErr } = await supabase
    .from('story_admin_users')
    .update({ email_verified: true, email_verify_token: null })
    .eq('email_verify_token', token);
  if (upErr) {
    console.error('[lyf-coach/verify] confirm error:', upErr);
    return bounce('/lyf-coach/login?verify=error');
  }

  // First-100 welcome bonus. Single-fire: the token was just cleared above, so a
  // replayed link bounces 'invalid' before reaching here. Entirely best-effort —
  // a failure here must NEVER block the login redirect below. We only send the
  // "1000 prompts" email if the stamp actually landed (so we never promise a cap
  // the entitlement layer can't honour, e.g. if migration 271 hasn't run yet).
  let welcomeGranted = false;
  try {
    const verifiedCount = await countVerifiedPublicAccounts(supabase);
    console.log(
      `[lyf-coach/verify][welcome] verifiedCount=${verifiedCount} threshold=${FIRST_N_WELCOME} space=${row.space}`,
    );
    if (verifiedCount <= FIRST_N_WELCOME) {
      const period = currentPeriodMonth();
      const { error: bonusErr } = await supabase
        .from('story_admin_users')
        .update({ welcome_bonus_period: period })
        .eq('space', row.space);
      if (bonusErr) {
        if (bonusErr.code === '42703') {
          console.warn('[lyf-coach/verify][welcome] welcome_bonus_period column missing — run migration 271; email skipped');
        } else {
          console.error('[lyf-coach/verify][welcome] stamp error:', bonusErr);
        }
      } else {
        // Bonus is granted by the STAMP (not the email) — flag it so the
        // post-verify coach page can show the first-100 line.
        welcomeGranted = true;
        // row.username IS the lowercased email on public accounts.
        console.log(`[lyf-coach/verify][welcome] stamped ${period} — sending welcome to ${row.username}`);
        await sendCoachWelcomeFirst100Email(row.username);
        console.log('[lyf-coach/verify][welcome] welcome email send attempted');
      }
    } else {
      console.log('[lyf-coach/verify][welcome] cohort full — no bonus');
    }
  } catch (e) {
    console.error('[lyf-coach/verify][welcome] step failed:', e);
  }

  // Log in on this device too, then land in the coach. The cookie->sessionStorage
  // bridge runs on /lyf-coach/coach.
  const jwt = await mintCoachPublicToken(row.username, row.space);
  const coachPath = welcomeGranted
    ? '/lyf-coach/coach?verified=1&welcome=1'
    : '/lyf-coach/coach?verified=1';
  const res = NextResponse.redirect(new URL(coachPath, APP_URL), 303);
  res.cookies.set(coachSessionCookie(jwt));
  return res;
}
