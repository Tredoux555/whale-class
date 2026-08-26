// POST /api/lens/auth/observer — the only door into Montree Lens.
//
//   { code: "LENSV1AA" }  — 8-character invite code -> `lens_observer` cookie
//
// There is no password and no email. She is one person; a code she can type on
// a phone in a hallway is the right weight of credential for v1, and the 34^8
// space plus the rate limit in lib/lens/auth.ts is what makes that defensible.
// See lib/lens/auth.ts for the cookie's payload and the `aud` check that stops
// a Montree token from ever satisfying it.

import { NextRequest, NextResponse } from 'next/server';
import {
  checkLensRateLimit,
  clientKey,
  createObserverToken,
  setObserverCookie,
} from '@/lib/lens/auth';
import { isWellFormedCode, normalizeCode } from '@/lib/lens/codes';
import { findObserverByCode, lensDb } from '@/lib/lens/db';
import { lensError } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!checkLensRateLimit(clientKey(request, 'lens-login'))) {
    return NextResponse.json(
      { error: 'Too many tries. Wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const code = normalizeCode((body as { code?: unknown } | null)?.code);
  if (!isWellFormedCode(code)) {
    return NextResponse.json({ error: 'That code should be 8 characters.' }, { status: 400 });
  }

  try {
    const observer = await findObserverByCode(lensDb(), code);
    if (!observer) {
      // Deliberately the same message for "no such code" and "that observer is
      // switched off" — the door should not tell a stranger which it was.
      return NextResponse.json({ error: 'We don’t know that code.' }, { status: 401 });
    }

    const token = await createObserverToken(observer.id);
    const response = NextResponse.json({
      ok: true,
      observer: { id: observer.id, name: observer.name, title: observer.title },
    });
    setObserverCookie(response, token);
    return response;
  } catch (error) {
    return lensError('auth/observer', error);
  }
}
