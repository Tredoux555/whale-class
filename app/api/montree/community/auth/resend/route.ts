// /api/montree/community/auth/resend
// Re-sends the confirmation email for an account that hasn't confirmed yet.
//
// 🚨 ALWAYS returns the same generic success. A confirmed account, an unknown
// address and a genuine re-send are indistinguishable from the outside —
// including when the mail provider fails (we log it and still answer 200,
// because a 502 here would itself reveal that the address exists and is
// unconfirmed). The 3/15min limit is what stops this being a mail cannon.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { makeToken } from '@/lib/montree/community/auth';
import { sendCommunityConfirmEmail } from '@/lib/montree/community/emails';
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

const GENERIC_OK = {
  ok: true,
  message: 'If that address needs confirming, a new link is on its way.',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/auth/resend',
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
      .select('id, display_name, email_confirmed_at')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('resend', error);
    }

    // Unknown address or already confirmed → say the same thing, send nothing.
    if (!user || user.email_confirmed_at) {
      return NextResponse.json(GENERIC_OK);
    }

    const token = makeToken();
    const { error: updateError } = await supabase
      .from('montree_community_users')
      .update({ confirm_token: token, confirm_sent_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      if (isMissingTable(updateError)) return migrationPending();
      return serverError('resend', updateError);
    }

    const sent = await sendCommunityConfirmEmail(
      email,
      (user.display_name as string) || '',
      token
    );
    if (!sent.success) {
      // Logged inside the mailer. Answer stays generic on purpose.
      console.error('[community/resend] confirmation email failed for an existing account');
    }

    return NextResponse.json(GENERIC_OK);
  } catch (err) {
    return serverError('resend', err);
  }
}
