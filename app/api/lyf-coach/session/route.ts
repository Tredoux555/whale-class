// app/api/lyf-coach/session/route.ts
//
// Cookie -> sessionStorage bridge. After email confirmation the user arrives via a
// server redirect holding only the httpOnly `story-admin-token` cookie. The coach
// client authenticates with a Bearer token from sessionStorage, so /lyf-coach/coach
// calls this once on load to read the (valid) cookie token back out for mirroring.
// Returns 401 if there's no valid admin session.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJWTSecret } from '@/lib/story-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!process.env.STORY_JWT_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }
  const token = req.cookies.get('story-admin-token')?.value;
  if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    if (payload.role !== 'admin') return NextResponse.json({ error: 'No session' }, { status: 401 });
    const space = typeof payload.space === 'string' ? payload.space : null;
    return NextResponse.json({ session: token, space });
  } catch {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }
}

// Logout — clear the httpOnly cookie so the cookie->sessionStorage bridge can't
// silently re-authenticate after the client clears sessionStorage.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('story-admin-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}
