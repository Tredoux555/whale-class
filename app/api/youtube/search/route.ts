// =====================================================
// API: Search for video for specific work
// =====================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { discoverVideoForWork } from '@/lib/youtube/discovery';

export async function POST(request: NextRequest) {
  try {
    const { workId, workName, forceRefresh } = await request.json();

    if (!workId || !workName) {
      return NextResponse.json(
        { success: false, error: 'workId and workName required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get work details
    const { data: work } = await supabase
      .from('curriculum_roadmap')
      .select('*')
      .eq('id', workId)
      .single();

    if (!work) {
      return NextResponse.json(
        { success: false, error: 'Work not found' },
        { status: 404 }
      );
    }

    // Discover video
    const result = await discoverVideoForWork(work, { forceRefresh });

    if (!result) {
      return NextResponse.json({
        success: false,
        workId,
        workName,
        videoFound: false,
        message: 'No suitable video found',
      });
    }

    // Get saved video
    const { data: video } = await supabase
      .from('curriculum_videos')
      .select('*')
      .eq('work_id', workId)
      .eq('youtube_video_id', result.video.videoId)
      .single();

    return NextResponse.json({
      success: true,
      workId,
      workName,
      videoFound: true,
      video,
      score: result.relevanceScore,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}








