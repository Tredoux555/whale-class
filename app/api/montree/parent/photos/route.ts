// /api/montree/parent/photos/route.ts
// Fetch approved photos for a child (parent view)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';


export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // 🚨 Session 113 V2 Parent audit F-1.1 — re-verify parent↔child link.
    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-child safe: requested child must be in the parent's authorized
    // set, not just the JWT-stamped one.
    if (!session.authorizedChildIds.includes(childId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 🚨 Session 113 V2 Parent audit F-3.2 + F-3.3 — only return:
    //   1. media_type = 'photo' (no videos / documents)
    //   2. teacher_confirmed = true (NOT the weaker
    //      identification_status.neq.pending_review filter, which let
    //      haiku_drafted + sonnet_drafted + failed rows through to parents)
    //   3. parent_visible != false (default-true with explicit-hide override)
    const { data: photos, error, count } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, caption, captured_at, work_id', { count: 'exact' })
      .eq('child_id', childId)
      .eq('media_type', 'photo')
      .eq('teacher_confirmed', true)
      .neq('parent_visible', false)
      .order('captured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Table might not exist yet
      return NextResponse.json({
        success: true,
        photos: [],
        total: 0
      });
    }

    // Generate proxy URLs for thumbnails (Cloudflare-cached, no Supabase call needed)
    const photoList = photos || [];

    const photosWithUrls = photoList.map(photo => {
      const path = photo.thumbnail_path || photo.storage_path;
      return {
        ...photo,
        thumbnail_url: path ? getProxyUrl(path) : null,
      };
    });

    const response = NextResponse.json({
      success: true,
      photos: photosWithUrls,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;

  } catch (error) {
    console.error('Parent photos API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
