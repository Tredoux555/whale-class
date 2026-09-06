// /api/montree/auth/sign-out-everywhere/route.ts
//
// POST — end this account's sessions on EVERY device, not just this one.
//
// ── Why this route exists ────────────────────────────────────────────────────
// /api/montree/auth/logout clears the montree-auth cookie in the browser that
// called it. That is all it does, and all it could do: the session is a stateless
// signed JWT with a 3650-day life, so the same token pasted into any other
// browser keeps working for ten years. Until migration 351 there was no way to
// stop it short of rotating MONTREE_JWT_SECRET, which signs out every teacher,
// principal and parent in every school simultaneously.
//
// This route stamps `sessions_revoked_at = NOW()` on the caller's own identity
// row. verifySchoolRequest then refuses any token issued before that instant —
// see lib/montree/session-revocation.ts. The effect is immediate on the
// container that served this request and within 60 seconds on every other one.
//
// ── Scope: strictly self-service ─────────────────────────────────────────────
// A caller can only ever revoke THEMSELVES. The account acted on is taken from
// the verified token's own `sub` and `role`; there is no id parameter, and no
// body is read, so there is nothing to tamper with. Signing out somebody ELSE
// (a departed staff member, a lost device belonging to a colleague) is a
// principal/admin action and stays a deliberate database action for now — the
// SQL for it is in migrations/351_session_revocation.sql.
//
// The caller's own cookie is cleared too, so the device that pressed the button
// lands in a clean logged-out state rather than holding a token every route now
// rejects.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { clearMontreeAuthCookie } from '@/lib/montree/server-auth';
import {
  invalidateSessionRevocation,
  tableForRole,
  type RevocableRole,
} from '@/lib/montree/session-revocation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const role = auth.role as RevocableRole;
  const table = tableForRole(role);

  try {
    const supabase = getSupabase();

    // NOW() is taken on OUR clock rather than the database's so the value is
    // consistent with the `iat` comparison done in session-revocation.ts.
    // One second is added so that a token minted in the SAME second as this
    // request (iat has whole-second resolution) is also revoked — otherwise
    // `iat < revokedAt` could be false for the very session that asked.
    const revokedAt = new Date(Date.now() + 1000).toISOString();

    const { error } = await supabase
      .from(table)
      .update({ sessions_revoked_at: revokedAt })
      .eq('id', auth.userId);

    if (error) {
      // Do NOT clear the cookie or report success — the caller must be able to
      // tell that their other devices are still signed in.
      console.error('[sign-out-everywhere] update failed:', error.message);
      return NextResponse.json(
        {
          error: 'Could not sign out your other devices. Please try again.',
          code: 'revocation_failed',
        },
        { status: 500 },
      );
    }

    // Make it effective immediately on this container.
    invalidateSessionRevocation(role, auth.userId);

    const response = NextResponse.json({
      success: true,
      signed_out_everywhere: true,
      revoked_at: revokedAt,
    });
    clearMontreeAuthCookie(response);
    return response;
  } catch (e) {
    console.error('[sign-out-everywhere] threw:', e);
    return NextResponse.json(
      {
        error: 'Could not sign out your other devices. Please try again.',
        code: 'revocation_failed',
      },
      { status: 500 },
    );
  }
}
