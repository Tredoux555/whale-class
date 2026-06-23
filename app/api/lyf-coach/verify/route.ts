// app/api/lyf-coach/verify/route.ts
//
// Email confirmation link target. Marks the account verified, clears the token,
// logs the user in on THIS device (they may have clicked from a phone), and
// drops them into the coach. Never starts the trial — signup already did.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';
import { mintCoachPublicToken, coachSessionCookie } from '@/lib/story/coach/public-account';
import { VERIFY_TOKEN_TTL_MS } from '@/lib/story/coach/email-verification';

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

  // Log in on this device too, then land in the coach. The cookie->sessionStorage
  // bridge runs on /lyf-coach/coach.
  const jwt = await mintCoachPublicToken(row.username, row.space);
  const res = NextResponse.redirect(new URL('/lyf-coach/coach?verified=1', APP_URL), 303);
  res.cookies.set(coachSessionCookie(jwt));
  return res;
}
