// /api/story/auth/logout/route.ts
//
// 🚨 Session 113 V2 Story audit F-6.1 — beacon-friendly logout endpoint.
//
// navigator.sendBeacon() can only fire POST requests. The existing
// DELETE /api/story/auth route requires an Authorization header that
// beacons can't set. This dedicated POST endpoint accepts a JSON body
// `{ token }` (sent as a Blob by the beacon) and flips the matching
// row in story_login_logs to logged-out.
//
// Auth: the token in the body MUST verify against the JWT secret. No
// token / invalid token / wrong role = silent no-op (so abuse just
// wastes one beacon round-trip; never write or 4xx based on beacon-side
// state).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyUserToken } from '@/lib/story-db';

export async function POST(req: NextRequest) {
  try {
    let token: string | null = null;

    // Beacon path: blob body { token: '...' }.
    try {
      const body = await req.json();
      if (body && typeof body.token === 'string') {
        token = body.token;
      }
    } catch {
      // Body wasn't JSON — fall through and try Authorization header below.
    }

    // Fallback: Authorization header (regular fetch path, in case anyone
    // wants to call this endpoint from a normal client flow).
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      return NextResponse.json({ success: true });
    }

    // Verify the token belongs to a user (not an admin) before writing.
    const username = await verifyUserToken(`Bearer ${token}`);
    if (!username) {
      return NextResponse.json({ success: true });
    }

    const supabase = getSupabase();
    await supabase
      .from('story_login_logs')
      .update({ logout_at: new Date().toISOString() })
      .eq('session_token', token.substring(0, 50))
      .is('logout_at', null);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Story logout beacon] failed:', e);
    return NextResponse.json({ success: true });
  }
}
