// app/api/cms/auth/logout/route.ts
// Clears the CMS session cookie. POST-only: a GET logout is a link an <img>
// tag can fire, which is how people get signed out by a forum post.

import { NextResponse } from 'next/server';
import { clearCmsSessionCookie } from '@/lib/cms/auth/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearCmsSessionCookie();
  return NextResponse.json({ ok: true, redirectTo: '/cms/login' });
}
