// /api/montree/community/auth/forgot
// Starts a password reset. 🚨 ALWAYS answers the same generic success —
// unknown address, known address and mail-provider failure are all identical
// from the outside. The 3/15min per-IP limit is the abuse control.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { makeToken } from '@/lib/montree/community/auth';
import { sendCommunityResetEmail } from '@/lib/montree/community/emails';
import {
  badRequest,
  isMissingTable,
  isValidEmail,
  migrationPending,
  normalizeEmail,
  rateLimited,
  readJson,
  serverError,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

/** Reset links are short-lived by design. */
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const GENERIC_OK = {
  ok: true,
  message: 'If that address has an account, a reset link is on its way.',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/auth/forgot',
      3,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const body = await readJson(request);
    if (!body) return badRequest('Malformed request.');

    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return badRequest('Please enter a valid email address.');

    const { data: user, error } = await supabase
      .from('montree_community_users')
      .select('id, display_name, is_banned')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('forgot', error);
    }

    // No account (or a banned one) → generic answer, nothing sent, no trace.
    if (!user || user.is_banned) {
      return NextResponse.json(GENERIC_OK);
    }

    const token = makeToken();
    const { error: updateError } = await supabase
      .from('montree_community_users')
      .update({
        reset_token: token,
        reset_expires_at: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      if (isMissingTable(updateError)) return migrationPending();
      return serverError('forgot', updateError);
    }

    const sent = await sendCommunityResetEmail(
      email,
      (user.display_name as string) || '',
      token
    );
    if (!sent.success) {
      // Logged in the mailer; the answer stays generic so a failure can't be
      // used to probe which addresses exist.
      console.error('[community/forgot] reset email failed for an existing account');
    }

    return NextResponse.json(GENERIC_OK);
  } catch (err) {
    return serverError('forgot', err);
  }
}
