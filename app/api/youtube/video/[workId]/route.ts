// =====================================================
// API: Get video for specific work
// =====================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { workId: string } }
) {
  try {
    const { workId } = params;

    const supabase = createClient();

    // Get work
    const { data: work, error: workError } = await supabase
      .from('curriculum_roadmap')
      .select('*')
      .eq('id', workId)
      .single();

    if (workError || !work) {
      return NextResponse.json(
        { error: 'Work not found' },
        { status: 404 }
      );
    }

    // Get approved video
    const { data: video } = await supabase
      .from('curriculum_videos')
      .select('*')
      .eq('work_id', workId)
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('relevance_score', { ascending: false })
      .limit(1)
      .single();

    // Get alternatives (other videos for this work)
    const { data: alternatives } = await supabase
      .from('curriculum_videos')
      .select('*')
      .eq('work_id', workId)
      .eq('is_active', true)
      .order('relevance_score', { ascending: false })
      .limit(5);

    return NextResponse.json({
      work,
      video: video || null,
      alternatives: alternatives || [],
      hasVideo: video !== null,
    });
  } catch (error) {
    console.error('Get video error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

