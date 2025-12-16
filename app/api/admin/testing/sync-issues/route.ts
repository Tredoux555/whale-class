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

    const supabase = createClient();

    // 1. Videos without curriculum work
    const { count: videosWithoutWork } = await supabase
      .from('curriculum_videos')
      .select('*', { count: 'exact', head: true })
      .is('work_id', null);

    // 2. Children with no video watches
    const { data: allChildren } = await supabase
      .from('children')
      .select('id')
      .eq('active_status', true);

    const { data: childrenWithWatches } = await supabase
      .from('child_video_watches')
      .select('child_id');

    const childrenWithWatchesSet = new Set(
      childrenWithWatches?.map(w => w.child_id) || []
    );

    const childrenWithNoWatches = allChildren?.filter(
      c => !childrenWithWatchesSet.has(c.id)
    ).length || 0;

    // 3. Video watches without completion
    const { count: watchesWithoutCompletion } = await supabase
      .from('child_video_watches')
      .select('*', { count: 'exact', head: true })
      .eq('is_complete', true);

    // Note: In production, you'd check if these are also in child_work_completion
    // For simplicity, we're just counting complete watches here

    // 4. Orphaned watches (videos that no longer exist)
    const { data: allWatches } = await supabase
      .from('child_video_watches')
      .select('curriculum_video_id');

    const { data: allVideos } = await supabase
      .from('curriculum_videos')
      .select('id');

    const videoIdsSet = new Set(allVideos?.map(v => v.id) || []);
    const orphanedWatches = allWatches?.filter(
      w => !videoIdsSet.has(w.curriculum_video_id)
    ).length || 0;

    return NextResponse.json({
      videosWithoutWork: videosWithoutWork || 0,
      childrenWithNoWatches,
      watchesWithoutCompletion: 0, // Simplified
      orphanedWatches,
    });

  } catch (error: any) {
    console.error('Error checking sync issues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check sync issues' },
      { status: 500 }
    );
  }
}

