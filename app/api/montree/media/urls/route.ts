// /api/montree/media/urls/route.ts
// Batch generate proxy URLs for multiple media files (reduces N requests to 1)
// Now returns Cloudflare-cached proxy URLs instead of Supabase signed URLs

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrls } from '@/lib/montree/media/proxy-url';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths array required' }, { status: 400 });
    }

    // Cap at 500 to prevent abuse while supporting large galleries
    const cappedPaths = paths.slice(0, 500);

    // Generate proxy URLs (instant, no Supabase call needed)
    const urls = getProxyUrls(cappedPaths);

    const response = NextResponse.json({ success: true, urls });
    // Proxy URLs are stable (no expiry) — cache aggressively
    response.headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=7200');
    return response;

  } catch (error) {
    console.error('Media URLs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
