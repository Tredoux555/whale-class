// app/api/story/messages/unlock/route.ts
//
// Hidden-Messages gate. The personal platform disguises /story/admin as a
// Diary; the real Story comms live at /story/admin/dashboard, reachable ONLY
// after a long-press on the diary logo + the correct secret phrase. This route
// verifies that phrase (on top of the existing admin session) and mints a
// short-lived hidden-view token the dashboard guard checks.
//
// The phrase is held in the STORY_MESSAGES_PHRASE env var (Railway), compared
// timing-safe. If unset, the gate stays CLOSED (fail-closed) — set the env to
// enable access. story_messages_secret (migration 257) is reserved for a future
// "set the phrase in-app" feature.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { verifyAdminToken, getJWTSecret } from '@/lib/story-db';

export const dynamic = 'force-dynamic';

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // Always do a constant-length comparison to avoid leaking length via timing.
  const len = Math.max(ba.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ba.copy(pa); bb.copy(pb);
  const equal = crypto.timingSafeEqual(pa, pb);
  return equal && ba.length === bb.length;
}

export async function POST(req: NextRequest) {
  // Must already be an authenticated admin (the phrase is a SECOND gate).
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expected = process.env.STORY_MESSAGES_PHRASE;
  if (!expected) {
    return NextResponse.json({ error: 'Gate not configured.' }, { status: 503 });
  }

  let body: { phrase?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const phrase = typeof body.phrase === 'string' ? body.phrase : '';
  if (!phrase || !timingSafeEqualStr(phrase, expected)) {
    return NextResponse.json({ error: 'Incorrect' }, { status: 401 });
  }

  // Mint a 1h hidden-view token.
  const token = await new SignJWT({ hiddenView: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getJWTSecret());

  return NextResponse.json({ token });
}
