// app/api/whale/parent/dashboard/[childId]/route.ts
// Get comprehensive dashboard data for a child

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = await createClient();
  const { childId } = await params;

  try {
    // Verify parent has access to this child
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get progress by area
    const { data: areaProgress } = await supabase
      .from('child_curriculum_progress')
      .select('*')
      .eq('child_id', childId);

    // Get recent completions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get completed works separately (avoid nested selects)
    const { data: completedWorksData } = await supabase
      .from('child_work_completion')
      .select('work_id, status, current_level, max_level, started_at, completed_at')
      .eq('child_id', childId)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // Get work details separately
    const workIds = completedWorksData?.map(c => c.work_id).filter(Boolean) || [];
    let recentCompletions: any[] = [];
    
    if (workIds.length > 0) {
      const { data: works } = await supabase
        .from('curriculum_roadmap')
        .select('id, name, area_id, category_id, levels')
        .in('id', workIds);

      const { data: areas } = await supabase
        .from('curriculum_areas')
        .select('id, name, color, icon');

      const { data: categories } = await supabase
        .from('curriculum_categories')
        .select('id, name');

      // Join in JavaScript
      recentCompletions = (completedWorksData || []).map(completion => {
        const work = works?.find(w => w.id === completion.work_id);
        const area = areas?.find(a => a.id === work?.area_id);
        const category = categories?.find(c => c.id === work?.category_id);
        return {
          ...completion,
          curriculum_roadmap: work ? {
            ...work,
            curriculum_areas: area || null,
            curriculum_categories: category || null,
          } : null,
        };
      });
    }

    // Get in-progress works
    const { data: inProgressData } = await supabase
      .from('child_work_completion')
      .select('work_id, status, current_level, max_level, started_at')
      .eq('child_id', childId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });

    const inProgressWorkIds = inProgressData?.map(w => w.work_id).filter(Boolean) || [];
    let inProgressWorks: any[] = [];

    if (inProgressWorkIds.length > 0) {
      const { data: works } = await supabase
        .from('curriculum_roadmap')
        .select('id, name, area_id, category_id, levels')
        .in('id', inProgressWorkIds);

      const { data: areas } = await supabase
        .from('curriculum_areas')
        .select('id, name, color, icon');

      const { data: categories } = await supabase
        .from('curriculum_categories')
        .select('id, name');

      inProgressWorks = (inProgressData || []).map(work => {
        const workDetail = works?.find(w => w.id === work.work_id);
        const area = areas?.find(a => a.id === workDetail?.area_id);
        const category = categories?.find(c => c.id === workDetail?.category_id);
        return {
          ...work,
          curriculum_roadmap: workDetail ? {
            ...workDetail,
            curriculum_areas: area || null,
            curriculum_categories: category || null,
          } : null,
        };
      });
    }

    // Get weekly stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: weeklyCompletions } = await supabase
      .from('child_work_completion')
      .select('completed_at')
      .eq('child_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', sevenDaysAgo.toISOString());

    // Get video watch stats (FIXED: use correct column names)
    const { data: videoWatches } = await supabase
      .from('child_video_watches')
      .select('watch_duration_seconds, is_complete')
      .eq('child_id', childId)
      .gte('watch_started_at', thirtyDaysAgo.toISOString());

    const totalWatchTime = videoWatches?.reduce(
      (sum, v) => sum + (v.watch_duration_seconds || 0), 0
    ) || 0;

    const completedVideos = videoWatches?.filter(v => v.is_complete).length || 0;

    // Calculate streaks
    const { data: allCompletions } = await supabase
      .from('child_work_completion')
      .select('completed_at')
      .eq('child_id', childId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    const currentStreak = calculateStreak(allCompletions?.map(c => c.completed_at).filter(Boolean) as string[] || []);

    // Get milestones
    const milestones = calculateMilestones(areaProgress || [], recentCompletions || []);

    return NextResponse.json({
      child: {
        ...child,
        age: child.date_of_birth 
          ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
      },
      areaProgress: areaProgress || [],
      recentCompletions: recentCompletions || [],
      inProgressWorks: inProgressWorks || [],
      stats: {
        totalCompleted: areaProgress?.reduce((sum, a) => sum + a.completed_works, 0) || 0,
        totalInProgress: inProgressWorks?.length || 0,
        weeklyCompletions: weeklyCompletions?.length || 0,
        currentStreak,
        totalWatchTimeMinutes: Math.round(totalWatchTime / 60),
        completedVideos,
      },
      milestones,
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function calculateStreak(completionDates: string[]): number {
  if (!completionDates.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = completionDates
    .map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
    .filter((v, i, a) => a.indexOf(v) === i) // unique dates
    .sort((a, b) => b - a); // newest first

  const oneDayMs = 24 * 60 * 60 * 1000;
  let expectedDate = today.getTime();

  // Check if there's activity today or yesterday
  if (dates[0] !== expectedDate && dates[0] !== expectedDate - oneDayMs) {
    return 0;
  }

  if (dates[0] === expectedDate - oneDayMs) {
    expectedDate = expectedDate - oneDayMs;
  }

  for (const date of dates) {
    if (date === expectedDate) {
      streak++;
      expectedDate -= oneDayMs;
    } else if (date < expectedDate) {
      break;
    }
  }

  return streak;
}

function calculateMilestones(
  areaProgress: any[],
  recentCompletions: any[]
): { type: string; title: string; date?: string; area?: string }[] {
  const milestones: { type: string; title: string; date?: string; area?: string }[] = [];

  // Check for area completion milestones
  for (const area of areaProgress) {
    if (area.completion_percentage >= 100) {
      milestones.push({
        type: 'area_complete',
        title: `Completed all ${area.area_name} works!`,
        area: area.area_name,
      });
    } else if (area.completion_percentage >= 50) {
      milestones.push({
        type: 'area_halfway',
        title: `Halfway through ${area.area_name}!`,
        area: area.area_name,
      });
    }
  }

  // First completion milestone
  const totalCompleted = areaProgress.reduce((sum, a) => sum + a.completed_works, 0);
  if (totalCompleted === 1) {
    milestones.push({ type: 'first_work', title: 'Completed first work!' });
  } else if (totalCompleted === 10) {
    milestones.push({ type: 'ten_works', title: 'Completed 10 works!' });
  } else if (totalCompleted === 50) {
    milestones.push({ type: 'fifty_works', title: 'Completed 50 works!' });
  } else if (totalCompleted === 100) {
    milestones.push({ type: 'hundred_works', title: 'Completed 100 works!' });
  }

  return milestones.slice(0, 5); // Return top 5 milestones
}

