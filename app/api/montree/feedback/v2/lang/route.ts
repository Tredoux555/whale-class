// app/api/montree/feedback/v2/lang/route.ts
//
// POST { lang: 'en' | 'zh' } — set the board's language cookie.
//
// A cookie and not localStorage, deliberately: the WeChat WKWebView wipes web
// storage between sessions, so a parent who chose 中文 would be handed English
// again every time they opened the board from a chat. A cookie also means the
// SERVER renders the right language on the first paint, with no flash.
//
// Not httpOnly — it is a display preference, the client reads it too — but
// SameSite=Lax and validated to exactly two values on the way in.

import { NextRequest, NextResponse } from 'next/server';
import { LANG_COOKIE } from '@/lib/montree/feedback/keys';
import { isLang } from '@/lib/montree/feedback/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let lang: unknown;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    lang = body?.lang;
  } catch {
    lang = request.nextUrl.searchParams.get('lang');
  }

  if (!isLang(lang)) {
    return NextResponse.json({ error: 'lang must be en or zh', code: 'bad_lang' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, lang });
  response.cookies.set(LANG_COOKIE, lang, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
