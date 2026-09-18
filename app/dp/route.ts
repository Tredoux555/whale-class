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
//
// 🚨 THE ORIGIN IS NOT `request.url`. Caught live in audit (2026-09-18):
// behind Railway's edge, `request.url` (and therefore `request.nextUrl`) on
// THIS route resolved to the container's own bind address —
// `https://0.0.0.0:8080/dark-phonics?...` — which is not reachable from
// outside the container at all. Every browser that ever followed a poster's
// /dp link would have hit a dead host. `x-forwarded-host` /
// `x-forwarded-proto` are what the edge actually sets to say who the visitor
// really asked for, so the target is built from those (same fallback chain
// notify.ts's postUrl() already uses for the feedback board's email links).

import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function publicOrigin(request: NextRequest): string {
  // `x-forwarded-host`/`-proto` are what the edge sets to say who the visitor
  // actually asked for; they win when present. request.nextUrl.host is the
  // fallback (and what a bare unit-test request carries) — NOT a hardcoded
  // montree.xyz, because this same route also has to keep a teacherpotato.xyz
  // visitor on teacherpotato.xyz.
  const host = request.headers?.get('x-forwarded-host') || request.headers?.get('host') || request.nextUrl.host;
  const proto = request.headers?.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'https';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const target = new URL('/dark-phonics', publicOrigin(request));
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 302);
}

/** A HEAD from a link checker or a WeChat preview gets the same answer. */
export const HEAD = GET;
