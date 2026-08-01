// /api/montree/community/auth/reset
// Redeems a password-reset token and sets the new password.
//
// 🚨 Token must be 64 hex chars BEFORE it reaches a query (reset_token is
// nullable — see the note in community/auth.ts) AND unexpired. Expiry is
// checked in SQL, not in JS, so a clock-skewed node can't widen the window.
//
// Following a reset link proves control of the mailbox, so a still-unconfirmed
// account is confirmed here too — otherwise someone who lost their password
// before confirming would be stuck in a loop with no way out.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { hashCommunityPassword, isValidToken } from '@/lib/montree/community/auth';
import {
  badRequest,
  isMissingTable,
  isValidPassword,
  migrationPending,
  rateLimited,
  readJson,
  serverError,
  MIN_PASSWORD_LENGTH,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const INVALID = {
  ok: false,
  error: 'That reset link has expired or has already been used.',
  code: 'invalid_token',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/auth/reset',
      10,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const body = await readJson(request);
    if (!body) return badRequest('Malformed request.');

    const token = body.token;
    if (!isValidToken(token)) {
      return NextResponse.json(INVALID, { status: 400 });
    }
    if (!isValidPassword(body.password)) {
      return badRequest(`Please choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const nowIso = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('montree_community_users')
      .select('id, email_confirmed_at, is_banned')
      .eq('reset_token', token)
      .not('reset_token', 'is', null)
      .gt('reset_expires_at', nowIso)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('reset', error);
    }
    // A banned account is treated exactly like a bad token — no signal.
    if (!user || user.is_banned) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    const passwordHash = await hashCommunityPassword(body.password as string);

    const { error: updateError } = await supabase
      .from('montree_community_users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_expires_at: null,
        // Any outstanding confirmation link is void once the mailbox has been
        // proven this way.
        confirm_token: null,
        email_confirmed_at: user.email_confirmed_at || nowIso,
      })
      .eq('id', user.id);

    if (updateError) {
      if (isMissingTable(updateError)) return migrationPending();
      return serverError('reset', updateError);
    }

    return NextResponse.json({
      ok: true,
      message: 'Password changed — you can sign in now.',
    });
  } catch (err) {
    return serverError('reset', err);
  }
}
