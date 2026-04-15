// /api/montree/media/proxy/[...path]/route.ts
// Proxies image requests through Cloudflare edge cache for fast loading in China
// Browser → montree.xyz/api/montree/media/proxy/path/to/photo.jpg → Supabase public bucket
// Cloudflare caches at edge → subsequent requests served from nearest POP (Asia-Pacific for China)

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = 'montree-media';

// 24 hours browser + CDN cache, 7 days stale-while-revalidate
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
  'CDN-Cache-Control': 'public, max-age=604800', // Cloudflare-specific: 7 day edge cache
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const storagePath = path.join('/');

    if (!storagePath || !SUPABASE_URL) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate path doesn't escape bucket (prevent path traversal)
    if (storagePath.includes('..') || storagePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Optional image transforms: ?w=N (width in px), ?q=N (quality 20-100).
    // Uses Supabase's render endpoint when params present; falls back to raw
    // object if render fails (e.g. Supabase plan without transforms).
    const { searchParams } = new URL(request.url);
    const w = searchParams.get('w');
    const q = searchParams.get('q');
    const wantTransform = !!(w || q);

    const rawUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    const renderParams = new URLSearchParams();
    if (w) renderParams.set('width', w);
    if (q) renderParams.set('quality', q);
    renderParams.set('resize', 'contain');
    const renderUrl = `${SUPABASE_URL}/storage/v1/render/image/public/${BUCKET}/${storagePath}?${renderParams.toString()}`;

    let res = wantTransform
      ? await fetch(renderUrl, { signal: AbortSignal.timeout(30000) })
      : await fetch(rawUrl, { signal: AbortSignal.timeout(30000) });

    // Fallback to raw object if render endpoint fails (plan limit, unsupported format, etc.)
    if (wantTransform && !res.ok) {
      res = await fetch(rawUrl, { signal: AbortSignal.timeout(30000) });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const contentLength = res.headers.get('content-length');

    // Stream response body through instead of buffering whole blob in RAM.
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...CACHE_HEADERS,
      'Access-Control-Allow-Origin': '*',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[PROXY] Image proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
