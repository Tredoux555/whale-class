// lib/cms/auth/server.ts
// Server-side half of CMS auth. SERVER COMPONENTS + ROUTE HANDLERS ONLY —
// imports next/headers, so it must never be pulled into a client component or
// into middleware (middleware imports lib/cms/auth/session.ts directly).

import { cookies } from 'next/headers';
import {
  CMS_SESSION_COOKIE,
  CMS_SESSION_TTL_DAYS,
  verifyCmsSession,
  type CmsSession,
} from './session';

/** The signed-in session for THIS request, or null. */
export async function getCmsSession(): Promise<CmsSession | null> {
  const store = await cookies();
  return verifyCmsSession(store.get(CMS_SESSION_COOKIE)?.value);
}

export async function setCmsSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(CMS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * CMS_SESSION_TTL_DAYS,
    path: '/',
  });
}

export async function clearCmsSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CMS_SESSION_COOKIE);
}
