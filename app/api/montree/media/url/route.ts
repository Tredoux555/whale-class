// /api/montree/media/url/route.ts
// Generate proxy URL for a single media file
// Now returns Cloudflare-cached proxy URL instead of Supabase signed URL

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 });
    }

    // Generate proxy URL (instant, no Supabase call needed)
    return NextResponse.json({
      success: true,
      url: getProxyUrl(path)
    });

  } catch (error) {
    console.error('Media URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
