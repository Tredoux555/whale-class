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

    // Fetch from Supabase public bucket
    const supabaseImageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    const res = await fetch(supabaseImageUrl, {
      // 30s timeout to prevent hanging
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const blob = await res.arrayBuffer();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': blob.byteLength.toString(),
        ...CACHE_HEADERS,
        // Allow CORS for image loading
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[PROXY] Image proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
