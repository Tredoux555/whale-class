// /api/montree/parent/photos/route.ts
// Fetch approved photos for a child (parent view)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';


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

    // SECURITY: Authenticate parent via session cookie
    const session = await verifyParentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Verify the requested child matches the authenticated session
    if (session.childId !== childId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get approved photos for this child
    const { data: photos, error, count } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, caption, captured_at, work_id', { count: 'exact' })
      .eq('child_id', childId)
      .neq('parent_visible', false)  // Only parent-visible photos (neq false = true + null for backward compat)
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

    // Generate signed URLs for thumbnails
    const photosWithUrls = await Promise.all(
      (photos || []).map(async (photo) => {
        const path = photo.thumbnail_path || photo.storage_path;
        const { data: urlData } = await supabase.storage
          .from('montree-media')
          .createSignedUrl(path, 3600); // 1 hour expiry

        return {
          ...photo,
          thumbnail_url: urlData?.signedUrl || null
        };
      })
    );

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
