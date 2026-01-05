import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // Get all curriculum works
    const { data: works, error: worksError } = await supabase
      .from('curriculum_roadmap')
      .select('id, work_name, area, stage')
      .order('sequence_order', { ascending: true });

    if (worksError) {
      console.error('Error fetching works:', worksError);
      return NextResponse.json({ success: false, error: 'Failed to fetch works' }, { status: 500 });
    }

    // Get all works that have approved videos
    const { data: videosData } = await supabase
      .from('curriculum_videos')
      .select('work_id')
      .eq('is_approved', true)
      .eq('is_active', true);

    const worksWithVideos = new Set((videosData || []).map(v => v.work_id));

    // Also check curriculum_roadmap.video_url
    const { data: directVideos } = await supabase
      .from('curriculum_roadmap')
      .select('id')
      .not('video_url', 'is', null);

    (directVideos || []).forEach(w => worksWithVideos.add(w.id));

    // Enrich works with video status
    const enrichedWorks = (works || []).map(work => ({
      ...work,
      has_video: worksWithVideos.has(work.id)
    }));

    return NextResponse.json({
      success: true,
      works: enrichedWorks,
      total: enrichedWorks.length,
      withVideos: enrichedWorks.filter(w => w.has_video).length,
      missingVideos: enrichedWorks.filter(w => !w.has_video).length
    });

  } catch (error) {
    console.error('Curriculum works error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
