import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { startCoachTrial } from '@/lib/story/coach/billing';
import {
  normaliseEmail,
  generateUniqueSpace,
  mintCoachPublicToken,
  coachSessionCookie,
  MIN_PASSWORD_LEN,
} from '@/lib/story/coach/public-account';
import {
  generateVerifyToken,
  sendCoachVerificationEmail,
  countVerifiedPublicAccounts,
  sendSignupNotificationEmail,
  FIRST_N_WELCOME,
  type VerifyEmailStatus,
} from '@/lib/story/coach/email-verification';

// POST /api/lyf-coach/signup — PUBLIC, word-of-mouth Lyf Coach signup.
//
// A stranger creates their own sealed coach account: email + password →
// (lowercased email AS username, which is UNIQUE) + a freshly-generated UNIQUE
// space + role='adult' (no family surfaces) + e2e=false (plain bcrypt). Then
// the instant 7-day DB-managed trial starts (no card, no Stripe object) and we
// log them straight in. See docs/handoffs/LYF_COACH_PUBLIC_SIGNUP_PLAN.md.

export async function POST(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Sign-up is not configured.' }, { status: 500 });
  }

  const supabase = getSupabase();
  const ip = getClientIP(req.headers);

  // Account creation is rare per person — cap it tightly per IP to blunt
  // mass trial-farming (the per-account 200-prompt cap is the cost ceiling;
  // email verification is the Phase-2 anti-abuse layer).
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    supabase, ip, '/api/lyf-coach/signup', 5, 60,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many sign-ups from this network. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = normaliseEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { error: 'Enter a valid email address (under 50 characters).' },
      { status: 400 },
    );
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < MIN_PASSWORD_LEN) {
    return NextResponse.json(
      { error: `Choose a password of at least ${MIN_PASSWORD_LEN} characters.` },
      { status: 400 },
    );
  }

  try {
    const space = await generateUniqueSpace(supabase, email);

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // role='adult' + e2e=false are set EXPLICITLY (never relying on a default):
    // a public account must never be a parent/child, and must use the bcrypt
    // (not e2e) login path. username==email is UNIQUE → a duplicate email is a
    // 23505 we turn into a friendly "sign in instead".
    const { data: inserted, error: insErr } = await supabase
      .from('story_admin_users')
      .insert({
        username: email,
        password_hash: passwordHash,
        space,
        role: 'adult',
        e2e: false,
      })
      .select('id')
      .maybeSingle();

    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 },
        );
      }
      console.error('[lyf-coach/signup] insert failed:', insErr.code, insErr.message);
      return NextResponse.json(
        { error: 'Could not create your account. Please try again.' },
        { status: 500 },
      );
    }
    if (!inserted) {
      return NextResponse.json(
        { error: 'Could not create your account. Please try again.' },
        { status: 500 },
      );
    }

    // Instant 7-day trial (idempotent, best-effort — never blocks signup).
    await startCoachTrial(supabase, space);

    // Fire-and-forget post-signup emails. NEVER blocks or breaks signup — the
    // user is logged in below regardless. Both steps live in ONE task so the
    // operator ping can REPORT whether the user's confirmation email went out:
    //   1. persist the verify token, then send the confirmation email, capturing
    //      a status that NEVER throws (a 42703 = migration 270 not run → columns
    //      absent → account treated as verified, no email);
    //   2. ALWAYS send the operator ping, carrying that status.
    // The verify step is fully guarded, so the ping fires no matter what — the
    // original "ping always fires" guarantee is preserved.
    void (async () => {
      let verifyEmailStatus: VerifyEmailStatus = 'unknown';
      try {
        const verifyToken = generateVerifyToken();
        const { error: tokErr } = await supabase
          .from('story_admin_users')
          .update({
            email_verified: false,
            email_verify_token: verifyToken,
            email_verify_sent_at: new Date().toISOString(),
          })
          .eq('space', space);
        if (tokErr) {
          // 42703 = verify columns absent (migration 270 not run) → no email
          // expected. Any other error means the token didn't persist, so the
          // confirmation link would be dead — don't send it.
          if (tokErr.code === '42703') {
            verifyEmailStatus = 'skipped_migration';
          } else {
            console.error('[lyf-coach/signup] verify-token persist error:', tokErr.code, tokErr.message);
            verifyEmailStatus = 'persist_failed';
          }
        } else {
          const sendRes = await sendCoachVerificationEmail(email, verifyToken);
          verifyEmailStatus = sendRes.ok
            ? 'sent'
            : sendRes.reason === 'not_configured'
              ? 'not_configured'
              : 'send_failed';
        }
      } catch (e) {
        console.error('[lyf-coach/signup] verification email step failed:', e);
        verifyEmailStatus = 'error';
      }

      // Operator ping — ALWAYS fires, now carrying the confirmation-email outcome.
      // Founder status is finalised at /verify (first 100 VERIFIED); here we report
      // whether the founder window is still open as a projection. countVerified...
      // returns +Infinity on a read error -> founderWindowOpen=null (never a false
      // founder claim).
      try {
        const verifiedCount = await countVerifiedPublicAccounts(supabase);
        const known = Number.isFinite(verifiedCount);
        await sendSignupNotificationEmail({
          username: email,
          founderWindowOpen: known ? verifiedCount < FIRST_N_WELCOME : null,
          verifiedCount: known ? verifiedCount : null,
          verifyEmailStatus,
        });
      } catch (e) {
        console.error('[lyf-coach/signup] signup ping step failed:', e);
      }
    })();

    const token = await mintCoachPublicToken(email, space);
    const response = NextResponse.json({ session: token });
    response.cookies.set(coachSessionCookie(token));
    return response;
  } catch (e) {
    console.error('[lyf-coach/signup] failed:', e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
