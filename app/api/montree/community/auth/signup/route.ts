// /api/montree/community/auth/signup
// Teachers' Room account creation. Public, rate-limited, honeypot-guarded.
//
// 🚨 NO EMAIL ENUMERATION. Every non-error outcome returns the SAME body:
//   - brand-new address        → row created, confirmation sent
//   - existing UNCONFIRMED     → token rotated, confirmation re-sent
//   - existing CONFIRMED       → nothing happens, nothing sent
// A stranger cannot use this route to learn whether an address has an
// account. The only distinguishable failures are validation (400), rate
// limit (429) and a genuine mail-provider outage (502) — none of which
// depend on whether the address exists.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { hashCommunityPassword, makeToken } from '@/lib/montree/community/auth';
import { sendCommunityConfirmEmail } from '@/lib/montree/community/emails';
import {
  badRequest,
  isMissingTable,
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  migrationPending,
  normalizeDisplayName,
  normalizeEmail,
  rateLimited,
  readJson,
  serverError,
  MIN_PASSWORD_LENGTH,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

/** Identical for every non-error outcome — see the enumeration note above. */
const GENERIC_OK = {
  ok: true,
  message: 'Check your inbox for a confirmation link.',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/auth/signup',
      5,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const body = await readJson(request);
    if (!body) return badRequest('Malformed request.');

    // Honeypot: a real teacher never sees or fills this field. Accept the
    // submission so the bot believes it worked, and do absolutely nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json(GENERIC_OK);
    }

    const email = normalizeEmail(body.email);
    const displayName = normalizeDisplayName(body.displayName);
    const password = body.password;

    if (!isValidEmail(email)) return badRequest('Please enter a valid email address.');
    if (!isValidDisplayName(displayName)) {
      return badRequest('Please enter a name between 2 and 40 characters.');
    }
    if (!isValidPassword(password)) {
      return badRequest(`Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const { data: existing, error: lookupError } = await supabase
      .from('montree_community_users')
      .select('id, email_confirmed_at, display_name')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      if (isMissingTable(lookupError)) return migrationPending();
      return serverError('signup', lookupError);
    }

    // Already confirmed: say nothing, send nothing. (They can sign in, or use
    // "forgot password" — both are one tap away in the same modal.)
    if (existing?.email_confirmed_at) {
      return NextResponse.json(GENERIC_OK);
    }

    const token = makeToken();
    const passwordHash = await hashCommunityPassword(password);
    const now = new Date().toISOString();

    if (existing) {
      // Unconfirmed re-signup. The account has no value yet (it can't sign in
      // and owns no content), and the new credentials only become usable via a
      // token delivered to the mailbox itself — so letting the latest attempt
      // win is safe and avoids a dead-end where someone is locked out of an
      // account they never finished creating.
      const { error: updateError } = await supabase
        .from('montree_community_users')
        .update({
          password_hash: passwordHash,
          display_name: displayName,
          confirm_token: token,
          confirm_sent_at: now,
        })
        .eq('id', existing.id);

      if (updateError) {
        if (isMissingTable(updateError)) return migrationPending();
        return serverError('signup', updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from('montree_community_users')
        .insert({
          email,
          password_hash: passwordHash,
          display_name: displayName,
          confirm_token: token,
          confirm_sent_at: now,
        });

      if (insertError) {
        if (isMissingTable(insertError)) return migrationPending();
        // 23505: someone raced us to the same address between the lookup and
        // the insert. Indistinguishable from "already registered" — same
        // generic answer, no second email.
        if ((insertError as { code?: string }).code === '23505') {
          return NextResponse.json(GENERIC_OK);
        }
        return serverError('signup', insertError);
      }
    }

    // Awaited deliberately: an account whose confirmation never arrives is a
    // dead end the teacher can't diagnose. If the provider is down we say so
    // honestly and the UI offers "resend" — we do NOT claim success.
    const sent = await sendCommunityConfirmEmail(email, displayName, token);
    if (!sent.success) {
      return NextResponse.json(
        {
          error: "We couldn't send the confirmation email just now. Please try again in a moment.",
          code: 'email_failed',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(GENERIC_OK);
  } catch (err) {
    return serverError('signup', err);
  }
}
