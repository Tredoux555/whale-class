import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workId = searchParams.get('workId');

    if (!workId) {
      return NextResponse.json(
        { error: 'workId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: videos, error } = await supabase
      .from('curriculum_videos')
      .select('id, title, youtube_video_id')
      .eq('work_id', workId)
      .eq('is_approved', true)
      .order('relevance_score', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      videos: videos || [],
    });

  } catch (error: any) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

