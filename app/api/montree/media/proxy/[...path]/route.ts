// /api/montree/media/proxy/[...path]/route.ts
// Proxies image + video requests through Cloudflare edge cache for fast loading in China.
// Browser → montree.xyz/api/montree/media/proxy/path/to/file → Supabase public bucket.
// Cloudflare caches at edge → subsequent requests served from nearest POP (Asia-Pacific for China).
//
// Supports HTTP Range requests (required for video seek/resume on iOS Safari + all browsers).
// Supports multiple public buckets via ?bucket= query param (allowlisted).
// Video streams are NOT timeout-capped on body (only initial response), so long downloads finish.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Allow long video streams on slow mobile networks
export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Allowlist of public buckets this proxy serves.
// Only public buckets — never add private buckets here.
const ALLOWED_BUCKETS = new Set([
  'montree-media',
  'story-uploads',
  'photo-bank',
  'dark-phonics', // public — Dark Phonics films/pictures for the curriculum Studio
]);
const DEFAULT_BUCKET = 'montree-media';

// 24 hours browser + CDN cache, 7 days stale-while-revalidate
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
  'CDN-Cache-Control': 'public, max-age=604800', // Cloudflare-specific: 7 day edge cache
};

// Video content types where we do NOT run Supabase image render transforms
const VIDEO_MIME_PREFIX = 'video/';

function resolveBucket(raw: string | null): string {
  if (!raw) return DEFAULT_BUCKET;
  return ALLOWED_BUCKETS.has(raw) ? raw : DEFAULT_BUCKET;
}

async function handleRequest(
  request: NextRequest,
  path: string[],
  method: 'GET' | 'HEAD'
) {
  try {
    const storagePath = path.join('/');

    if (!storagePath || !SUPABASE_URL) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate path doesn't escape bucket (prevent path traversal)
    if (storagePath.includes('..') || storagePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const bucket = resolveBucket(searchParams.get('bucket'));

    // Optional image transforms: ?w=N (width in px), ?q=N (quality 20-100).
    // Uses Supabase's render endpoint when params present; falls back to raw
    // object if render fails (e.g. Supabase plan without transforms, or video file).
    const w = searchParams.get('w');
    const q = searchParams.get('q');
    const wantTransform = !!(w || q);

    const rawUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
    const renderParams = new URLSearchParams();
    if (w) renderParams.set('width', w);
    if (q) renderParams.set('quality', q);
    renderParams.set('resize', 'contain');
    const renderUrl = `${SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${storagePath}?${renderParams.toString()}`;

    // Forward Range header for seekable video playback.
    // Without this, iOS Safari can't seek and long videos timeout mid-download.
    const rangeHeader = request.headers.get('range');
    const upstreamHeaders: Record<string, string> = {};
    if (rangeHeader) upstreamHeaders['range'] = rangeHeader;

    // Initial response timeout only — body stream is NOT timeout-capped
    // (AbortSignal.timeout on fetch kills the body stream too, which cuts
    // off long videos on slow networks. Use a timeout only for headers.)
    const controller = new AbortController();
    const initialTimeout = setTimeout(() => controller.abort(), 30000);

    let res: Response;
    try {
      res = wantTransform
        ? await fetch(renderUrl, {
            method,
            headers: upstreamHeaders,
            signal: controller.signal,
          })
        : await fetch(rawUrl, {
            method,
            headers: upstreamHeaders,
            signal: controller.signal,
          });
    } finally {
      clearTimeout(initialTimeout);
    }

    // Fallback to raw object if render endpoint fails (plan limit, unsupported format, or video)
    if (wantTransform && !res.ok) {
      res = await fetch(rawUrl, { method, headers: upstreamHeaders });
    }

    if (!res.ok && res.status !== 206) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');
    const acceptRanges = res.headers.get('accept-ranges') || 'bytes';
    const etag = res.headers.get('etag');
    const lastModified = res.headers.get('last-modified');
    const isVideo = contentType.startsWith(VIDEO_MIME_PREFIX);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...CACHE_HEADERS,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': acceptRanges,
    };
    if (contentLength) headers['Content-Length'] = contentLength;
    if (contentRange) headers['Content-Range'] = contentRange;
    if (etag) headers['ETag'] = etag;
    if (lastModified) headers['Last-Modified'] = lastModified;

    // Videos: slightly shorter browser cache so thumbnail regenerations land faster,
    // but keep the long CDN cache so China POPs still serve hot.
    if (isVideo) {
      headers['Cache-Control'] = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
    }

    // HEAD: return headers only
    if (method === 'HEAD') {
      return new Response(null, { status: res.status, headers });
    }

    // Stream response body through — never buffer whole blob in RAM.
    // NOTE: body stream has no timeout attached; large videos on slow networks finish.
    return new Response(res.body, {
      status: res.status, // preserves 206 Partial Content from upstream
      headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[PROXY] Media proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'GET');
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'HEAD');
}
