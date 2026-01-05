import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { workId, youtubeUrl, youtubeVideoId } = body;

    if (!workId || !youtubeUrl || !youtubeVideoId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify work exists
    const { data: work, error: workError } = await supabase
      .from('curriculum_roadmap')
      .select('id, work_name')
      .eq('id', workId)
      .single();

    if (workError || !work) {
      return NextResponse.json({ success: false, error: 'Work not found' }, { status: 404 });
    }

    // Check if video already exists for this work
    const { data: existing } = await supabase
      .from('curriculum_videos')
      .select('id')
      .eq('work_id', workId)
      .eq('youtube_video_id', youtubeVideoId)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: 'Video already exists for this work' }, { status: 409 });
    }

    // Insert new video - auto-approved since manually added by admin
    const { data: video, error: insertError } = await supabase
      .from('curriculum_videos')
      .insert({
        work_id: workId,
        youtube_video_id: youtubeVideoId,
        youtube_url: youtubeUrl,
        title: `${work.work_name} - Demo Video`,
        is_approved: true,
        is_active: true,
        relevance_score: 90, // High score since manually selected
        added_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to save video' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      video,
      message: `Video added for "${work.work_name}"`
    });

  } catch (error) {
    console.error('Add video error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
