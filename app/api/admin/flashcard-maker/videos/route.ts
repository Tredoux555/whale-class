import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get all uploaded videos, newest first
export async function GET(request: NextRequest) {
  try {
    // First, let's see ALL documents to debug
    const { data: allDocs, error: allError } = await getSupabase()
      .from('lesson_documents')
      .select('id, original_filename, file_type')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('[Videos API] All docs sample:', allDocs?.map(d => ({ name: d.original_filename, type: d.file_type })));
    
    // Now filter for videos
    const { data, error } = await getSupabase()
      .from('lesson_documents')
      .select('*')
      .like('file_type', 'video/%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Videos API] Query error:', error);
      throw error;
    }

    console.log('[Videos API] Found videos:', data?.length);

    return NextResponse.json({ 
      success: true, 
      videos: data || [],
      debug: {
        totalDocs: allDocs?.length,
        sampleTypes: allDocs?.map(d => d.file_type),
        videoCount: data?.length
      }
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
