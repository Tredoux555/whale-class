// app/api/story/push/public-key/route.ts
//
// Hands the VAPID public key to the browser so it can create a push
// subscription. Public by definition — the key is meant to be shipped to
// clients. 503 when push isn't configured (no VAPID env) so the opt-in
// UI can show a clean "not available yet" state.

import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/story/push';

export const maxDuration = 15;

export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json(
      { error: 'Push notifications are not configured on this server yet.' },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key });
}
