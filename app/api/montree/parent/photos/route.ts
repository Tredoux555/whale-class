// /api/montree/parent/photos/route.ts
// Fetch approved photos for a child (parent view)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    // Get approved photos for this child
    const { data: photos, error, count } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path, caption, captured_at, work_id', { count: 'exact' })
      .eq('child_id', childId)
      .eq('parent_visible', true)  // Only approved photos
      .order('captured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Table might not exist yet
      console.log('Photos query error (table may not exist):', error.message);
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

    return NextResponse.json({
      success: true,
      photos: photosWithUrls,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    });

  } catch (error) {
    console.error('Parent photos API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
