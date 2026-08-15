// /api/montree/media/proxy/bucket/[bucket]/[...path]/route.ts
//
// Sibling of ../../[...path]/route.ts, for the static-asset next.config.ts
// rewrites ONLY (dark-phonics-books, dark-phonics-materials, satpin-books,
// satpin-materials, shelf-packs, and the two montree-splash-video*.mp4 files —
// see next.config.ts's `rewrites()`).
//
// 🚨 Those rewrites used to point straight at ../../[...path]/route.ts with
// `?bucket=static-assets` baked into the destination string. That silently
// 502'd every one of those paths in production: a rewritten request's
// `request.url` / `request.nextUrl` reflects the ORIGINAL client URL, not the
// rewrite destination, so the query string never arrived and the handler fell
// back to DEFAULT_BUCKET ('montree-media') — wrong bucket, Supabase 4xx,
// mapped to a bare 502. Confirmed for both next.config.ts rewrites() and a
// middleware NextResponse.rewrite(), with or without a `:path*` wildcard in
// the destination — this is a general property of Route Handlers, not a
// syntax slip in one rewrite. Route PARAMS (the `[bucket]` and `[...path]`
// segments below), unlike query strings, DO survive a rewrite correctly, so
// this route takes the bucket as a path segment instead and forwards it
// explicitly to the shared handler.
import { NextRequest } from 'next/server';
import { handleRequest } from '../../../[...path]/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  const { bucket, path } = await params;
  return handleRequest(request, path, 'GET', bucket);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  const { bucket, path } = await params;
  return handleRequest(request, path, 'HEAD', bucket);
}
