// app/dp/route.ts
//
// montree.xyz/dp → /dark-phonics, 302, query string intact.
//
// The short link is what goes on a poster, in a video description and in a
// WeChat bio, where every character is visible and typed by hand. Keeping the
// query is the whole point of having a route rather than a static redirect:
// /dp?utm_source=youtube must arrive at /dark-phonics?utm_source=youtube so the
// hub's attribution cookie has something to stamp.
//
// 302 and not 308: this is a marketing alias, and a permanently-cached redirect
// is impossible to take back once a few thousand browsers have remembered it.
//
// Listed in middleware's publicPaths alongside '/dark-phonics' — without that
// entry the legacy Supabase gate 302s the redirect itself to '/'.

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const target = new URL('/dark-phonics', request.url);
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 302);
}

/** A HEAD from a link checker or a WeChat preview gets the same answer. */
export const HEAD = GET;
