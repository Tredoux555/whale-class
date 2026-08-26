// POST /api/lens/auth/auto — open-beta auto sign-in. GET does the same, for
// convenience (this route has no side effect beyond minting a cookie, so
// there is no reason to force POST on a caller that only wants GET).
//
// While LENS_OPEN_BETA is on (lib/lens/flags.ts), Montree Lens has exactly one
// lens_observers row and no invite-code door: anyone who opens /lens is
// signed in as that one observer automatically, via this route. Flip the flag
// to false to retire this route back to a 404 and restore the door at
// /api/lens/auth/observer.

import { NextResponse } from 'next/server';
import { createObserverToken, setObserverCookie } from '@/lib/lens/auth';
import { LENS_OPEN_BETA } from '@/lib/lens/flags';
import { lensError, notFound, resolveBetaObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';

async function autoSignIn() {
  if (!LENS_OPEN_BETA) return notFound();

  try {
    const observer = await resolveBetaObserver();
    if (!observer) return notFound();

    const token = await createObserverToken(observer.observerId);
    const response = NextResponse.json({ ok: true });
    setObserverCookie(response, token);
    return response;
  } catch (error) {
    return lensError('auth/auto', error);
  }
}

export async function POST() {
  return autoSignIn();
}

export async function GET() {
  return autoSignIn();
}
