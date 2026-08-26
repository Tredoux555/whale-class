// POST /api/lens/auth/logout — drop the cookie.
//
// Unauthenticated on purpose: signing out must work even when the cookie is
// already expired or malformed, and there is nothing to protect — the only
// effect is clearing a cookie the caller already holds.

import { NextResponse } from 'next/server';
import { clearObserverCookie } from '@/lib/lens/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearObserverCookie(response);
  return response;
}
