// app/api/whale/parent/weekly-report/[childId]/route.ts
// Generate weekly progress report for a child

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  try {
    // Verify parent has access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: child } = await supabase
      .from('children')
      .select('id, name')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Get completions this week
    const { data: completionsData } = await supabase
      .from('child_work_completion')
      .select('work_id, status, completed_at, current_level, max_level')
      .eq('child_id', childId)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())
      .eq('status', 'completed');

    // Get work details separately
    const workIds = completionsData?.map(c => c.work_id).filter(Boolean) || [];
    let completions: any[] = [];

    if (workIds.length > 0) {
      const { data: works } = await supabase
        .from('curriculum_roadmap')
        .select('id, name, area_id')
        .in('id', workIds);

      const { data: areas } = await supabase
        .from('curriculum_areas')
        .select('id, name, color, icon');

      completions = (completionsData || []).map(c => {
        const work = works?.find(w => w.id === c.work_id);
        const area = areas?.find(a => a.id === work?.area_id);
        return {
          ...c,
          curriculum_roadmap: work ? {
            ...work,
            curriculum_areas: area || null,
          } : null,
        };
      });
    }

    // Get video watches this week (FIXED: use correct column names)
    const { data: videoWatches } = await supabase
      .from('child_video_watches')
      .select(`
        watch_duration_seconds,
        is_complete,
        watch_started_at,
        curriculum_video_id
      `)
      .eq('child_id', childId)
      .gte('watch_started_at', startDate.toISOString())
      .lte('watch_started_at', endDate.toISOString());

    // Get video details separately
    const videoIds = videoWatches?.map(v => v.curriculum_video_id).filter(Boolean) || [];
    let enrichedVideos: any[] = [];

    if (videoIds.length > 0) {
      const { data: videos } = await supabase
        .from('curriculum_videos')
        .select('id, title, curriculum_work_id')
        .in('id', videoIds);

      const { data: works } = await supabase
        .from('curriculum_roadmap')
        .select('id, name')
        .in('id', videos?.map(v => v.curriculum_work_id).filter(Boolean) || []);

      enrichedVideos = (videoWatches || []).map(v => {
        const video = videos?.find(vid => vid.id === v.curriculum_video_id);
        const work = works?.find(w => w.id === video?.curriculum_work_id);
        return {
          ...v,
          curriculum_videos: video ? {
            ...video,
            curriculum_roadmap: work || null,
          } : null,
        };
      });
    }

    // Group completions by day
    const completionsByDay: Record<string, number> = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayKey = dayNames[date.getDay()];
      completionsByDay[dayKey] = 0;
    }

    completions?.forEach(c => {
      if (c.completed_at) {
        const day = dayNames[new Date(c.completed_at).getDay()];
        completionsByDay[day] = (completionsByDay[day] || 0) + 1;
      }
    });

    // Group by area
    const byArea: Record<string, { count: number; color: string; icon: string }> = {};
    completions?.forEach(c => {
      const areaName = c.curriculum_roadmap?.curriculum_areas?.name || 'Unknown';
      if (!byArea[areaName]) {
        byArea[areaName] = {
          count: 0,
          color: c.curriculum_roadmap?.curriculum_areas?.color || '#gray',
          icon: c.curriculum_roadmap?.curriculum_areas?.icon || '📚',
        };
      }
      byArea[areaName].count++;
    });

    // Calculate totals
    const totalWatchMinutes = Math.round(
      (enrichedVideos?.reduce((sum, v) => sum + (v.watch_duration_seconds || 0), 0) || 0) / 60
    );

    return NextResponse.json({
      childName: child?.name || 'Child',
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        worksCompleted: completions?.length || 0,
        videosWatched: enrichedVideos?.filter(v => v.is_complete).length || 0,
        totalWatchMinutes,
        activeDays: Object.values(completionsByDay).filter(v => v > 0).length,
      },
      completionsByDay,
      completionsByArea: byArea,
      completedWorks: completions?.map(c => ({
        name: c.curriculum_roadmap?.name,
        area: c.curriculum_roadmap?.curriculum_areas?.name,
        areaIcon: c.curriculum_roadmap?.curriculum_areas?.icon,
        completedAt: c.completed_at,
      })) || [],
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}


