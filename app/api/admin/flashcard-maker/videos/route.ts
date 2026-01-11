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
    const { data, error } = await getSupabase()
      .from('lesson_documents')
      .select('*')
      .like('file_type', 'video/%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      videos: data || [] 
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch videos',
      videos: []
    });
  }
}
