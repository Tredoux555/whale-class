// /api/montree/media/urls/route.ts
// Batch generate signed URLs for multiple media files (reduces N requests to 1)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'paths array required' }, { status: 400 });
    }

    // Cap at 500 to prevent abuse while supporting large galleries
    const cappedPaths = paths.slice(0, 500);

    // Supabase batch signed URL generation (1 call for all paths)
    const { data, error } = await supabase.storage
      .from('montree-media')
      .createSignedUrls(cappedPaths, 3600);

    if (error) {
      console.error('Failed to create signed URLs:', error);
      return NextResponse.json({ error: 'Failed to generate URLs' }, { status: 500 });
    }

    // Build path→url map
    const urls: Record<string, string> = {};
    for (const item of data || []) {
      if (item.signedUrl && item.path) {
        urls[item.path] = item.signedUrl;
      }
    }

    return NextResponse.json({ success: true, urls });

  } catch (error) {
    console.error('Media URLs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
