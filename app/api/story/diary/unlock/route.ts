// app/api/story/diary/unlock/route.ts
//
// Secret-door gate for the DIARY. The personal platform's front is the Planner;
// the private Diary is reached only via a long-press + this phrase (separate
// from the Messages phrase). Verifies STORY_DIARY_PHRASE (timing-safe) on top
// of the admin session, mints a 1h hidden-view token the diary guard checks.
// Fail-closed: if STORY_DIARY_PHRASE is unset, the Diary stays hidden.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { verifyAdminToken, getJWTSecret } from '@/lib/story-db';

export const dynamic = 'force-dynamic';

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  const len = Math.max(ba.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ba.copy(pa); bb.copy(pb);
  return crypto.timingSafeEqual(pa, pb) && ba.length === bb.length;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminToken(req.headers.get('authorization'));
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expected = process.env.STORY_DIARY_PHRASE;
  if (!expected) return NextResponse.json({ error: 'Gate not configured.' }, { status: 503 });

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

  const token = await new SignJWT({ diaryView: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getJWTSecret());

  return NextResponse.json({ token });
}
