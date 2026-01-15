import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Get all photos for video slideshow generation
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    
    if (!childId) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch all photos for this child
    const { data: media, error } = await supabase
      .from('child_work_media')
      .select('id, work_name, media_url, taken_at, category, notes')
      .eq('child_id', childId)
      .eq('media_type', 'photo')
      .order('taken_at', { ascending: true });

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name')
      .eq('id', childId)
      .single();

    // Get progress
    const { data: progress } = await supabase
      .from('child_curriculum_progress')
      .select('status')
      .eq('child_id', childId);

    const progressCounts = {
      presented: progress?.filter(p => p.status === 1).length || 0,
      practicing: progress?.filter(p => p.status === 2).length || 0,
      mastered: progress?.filter(p => p.status === 3).length || 0
    };

    return NextResponse.json({
      success: true,
      childName: child?.name || 'Student',
      progress: progressCounts,
      photos: media || [],
      totalPhotos: media?.length || 0
    });

  } catch (error) {
    console.error('Video data error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
