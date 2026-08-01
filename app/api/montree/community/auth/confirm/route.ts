// /api/montree/community/auth/confirm
// Redeems the emailed confirmation token. Called by the SATPIN page when it
// finds ?tr_confirm=<token> in the URL on mount.
//
// 🚨 The token is validated to 64 hex chars BEFORE it touches a query.
// confirm_token is a NULLABLE column: matching an empty/undefined value
// against it is how you accidentally confirm a random dormant account. The
// `.not(...is null)` guard is a second belt on the same trousers.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { isValidToken } from '@/lib/montree/community/auth';
import {
  isMissingTable,
  migrationPending,
  rateLimited,
  readJson,
  serverError,
} from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const INVALID = {
  ok: false,
  error: 'That link has expired or has already been used.',
  code: 'invalid_token',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/auth/confirm',
      10,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const body = await readJson(request);
    const token = body?.token;
    if (!isValidToken(token)) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('montree_community_users')
      .select('id, email_confirmed_at')
      .eq('confirm_token', token)
      .not('confirm_token', 'is', null)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('confirm', error);
    }
    if (!user) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('montree_community_users')
      .update({
        // Re-confirming an already-confirmed account keeps the original
        // timestamp — the token is single-use either way (cleared below).
        email_confirmed_at: user.email_confirmed_at || new Date().toISOString(),
        confirm_token: null,
      })
      .eq('id', user.id);

    if (updateError) {
      if (isMissingTable(updateError)) return migrationPending();
      return serverError('confirm', updateError);
    }

    return NextResponse.json({
      ok: true,
      message: 'Email confirmed — you can sign in now.',
    });
  } catch (err) {
    return serverError('confirm', err);
  }
}
