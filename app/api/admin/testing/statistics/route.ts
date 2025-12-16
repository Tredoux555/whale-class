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

    // Total watches
    const { count: totalWatches } = await supabase
      .from('child_video_watches')
      .select('*', { count: 'exact', head: true });

    // Completion rate
    const { count: completedWatches } = await supabase
      .from('child_video_watches')
      .select('*', { count: 'exact', head: true })
      .eq('is_complete', true);

    const completionRate = totalWatches && totalWatches > 0
      ? (completedWatches || 0) / totalWatches * 100
      : 0;

    // Average watch percentage
    const { data: allWatches } = await supabase
      .from('child_video_watches')
      .select('watch_percentage');

    const avgWatchPercentage = allWatches && allWatches.length > 0
      ? allWatches.reduce((sum, w) => sum + (w.watch_percentage || 0), 0) / allWatches.length
      : 0;

    // Watches by device
    const { data: deviceCounts } = await supabase
      .from('child_video_watches')
      .select('device_type');

    const watchesByDevice = {
      desktop: deviceCounts?.filter(d => d.device_type === 'desktop').length || 0,
      mobile: deviceCounts?.filter(d => d.device_type === 'mobile').length || 0,
      tablet: deviceCounts?.filter(d => d.device_type === 'tablet').length || 0,
      unknown: deviceCounts?.filter(d => d.device_type === 'unknown' || !d.device_type).length || 0,
    };

    // Most watched videos
    const { data: videoWatches } = await supabase
      .from('child_video_watches')
      .select(`
        curriculum_video_id,
        curriculum_videos!inner(title)
      `);

    const videoCountMap = new Map<string, { title: string; count: number }>();
    videoWatches?.forEach(w => {
      const videoId = w.curriculum_video_id;
      const title = (w.curriculum_videos as any)?.title || 'Unknown';
      const existing = videoCountMap.get(videoId);
      if (existing) {
        existing.count++;
      } else {
        videoCountMap.set(videoId, { title, count: 1 });
      }
    });

    const mostWatchedVideos = Array.from(videoCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(v => ({
        video_id: v.title, // Simplified
        video_title: v.title,
        watch_count: v.count,
      }));

    // Children with most watches
    const { data: childWatches } = await supabase
      .from('child_video_watches')
      .select(`
        child_id,
        children!inner(name)
      `);

    const childCountMap = new Map<string, { name: string; count: number }>();
    childWatches?.forEach(w => {
      const childId = w.child_id;
      const name = (w.children as any)?.name || 'Unknown';
      const existing = childCountMap.get(childId);
      if (existing) {
        existing.count++;
      } else {
        childCountMap.set(childId, { name, count: 1 });
      }
    });

    const childrenWithMostWatches = Array.from(childCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(c => ({
        child_id: c.name, // Simplified
        child_name: c.name,
        watch_count: c.count,
      }));

    // Recent watches
    const { data: recentWatches } = await supabase
      .from('child_video_watches')
      .select(`
        *,
        children!inner(name),
        curriculum_roadmap!inner(work_name)
      `)
      .order('watch_started_at', { ascending: false })
      .limit(10);

    const formattedRecentWatches = recentWatches?.map(w => ({
      ...w,
      child_name: (w.children as any)?.name || 'Unknown',
      work_name: (w.curriculum_roadmap as any)?.work_name || 'Unknown',
      video_title: 'Video', // Simplified
    })) || [];

    return NextResponse.json({
      totalWatches: totalWatches || 0,
      completionRate,
      averageWatchPercentage: avgWatchPercentage,
      watchesByDevice,
      mostWatchedVideos,
      childrenWithMostWatches,
      recentWatches: formattedRecentWatches,
    });

  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

