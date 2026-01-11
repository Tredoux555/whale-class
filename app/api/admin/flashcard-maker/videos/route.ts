import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get all videos from the main videos table (the ones on the homepage)
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getSupabase()
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Videos API] Query error:', error);
      throw error;
    }

    console.log('[Videos API] Found videos:', data?.length);

    // Map to expected format
    const videos = (data || []).map(v => ({
      id: v.id,
      original_filename: v.title,
      public_url: v.video_url,
      week_number: v.week_number,
      file_type: 'video/mp4',
      created_at: v.created_at,
      category: v.category
    }));

    return NextResponse.json({ 
      success: true, 
      videos
    });
  } catch (error) {
    console.error('[Videos API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch videos',
      videos: []
    });
  }
}
