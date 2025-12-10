// app/api/whale/progress/enhanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// GET - Get enhanced progress data for charts and visualizations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json(
        { error: 'childId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get all progress records
    const { data: progressData, error: progressError } = await supabase
      .from('child_progress')
      .select('*')
      .eq('child_id', childId);

    if (progressError) throw progressError;

    // Get activity completion history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activityHistory, error: historyError } = await supabase
      .from('daily_activity_assignments')
      .select(`
        *,
        activity:activities(area, name)
      `)
      .eq('child_id', childId)
      .gte('assigned_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('assigned_date', { ascending: true });

    if (historyError) throw historyError;

    // Calculate progress by area
    const areaProgress: Record<string, any> = {};
    const areaLabels: Record<string, string> = {
      practical_life: 'Practical Life',
      sensorial: 'Sensorial',
      mathematics: 'Mathematics',
      language: 'Language Arts',
      english: 'English',
      cultural: 'Cultural Studies'
    };

    progressData?.forEach(progress => {
      const area = progress.curriculum_area;
      if (!areaProgress[area]) {
        areaProgress[area] = {
          area,
          label: areaLabels[area] || area,
          skills: [],
          totalSkills: 0,
          introduced: 0,
          practicing: 0,
          independent: 0,
          mastery: 0,
          averageStatus: 0,
          totalStatus: 0
        };
      }

      areaProgress[area].skills.push(progress);
      areaProgress[area].totalSkills++;
      areaProgress[area].totalStatus += progress.status;

      // Count by status level
      if (progress.status === 1) areaProgress[area].introduced++;
      else if (progress.status === 2) areaProgress[area].practicing++;
      else if (progress.status === 3) areaProgress[area].independent++;
      else if (progress.status >= 4) areaProgress[area].mastery++;
    });

    // Calculate averages
    Object.keys(areaProgress).forEach(area => {
      const data = areaProgress[area];
      data.averageStatus = data.totalSkills > 0 
        ? data.totalStatus / data.totalSkills 
        : 0;
      data.completionPercentage = data.totalSkills > 0
        ? ((data.independent + data.mastery) / data.totalSkills) * 100
        : 0;
    });

    // Calculate activity completion timeline (for chart)
    const completionTimeline: Record<string, number> = {};
    activityHistory?.forEach(assignment => {
      if (assignment.completed) {
        const date = assignment.assigned_date;
        completionTimeline[date] = (completionTimeline[date] || 0) + 1;
      }
    });

    // Convert to array for charting
    const timelineData = Object.keys(completionTimeline)
      .sort()
      .map(date => ({
        date,
        count: completionTimeline[date]
      }));

    // Calculate activities by area (for pie chart)
    const activitiesByArea: Record<string, number> = {};
    activityHistory?.forEach(assignment => {
      const area = assignment.activity?.area || 'unknown';
      activitiesByArea[area] = (activitiesByArea[area] || 0) + 1;
    });

    // Overall stats
    const totalActivities = activityHistory?.length || 0;
    const completedActivities = activityHistory?.filter(a => a.completed).length || 0;
    const completionRate = totalActivities > 0 
      ? (completedActivities / totalActivities) * 100 
      : 0;

    const totalSkills = progressData?.length || 0;
    const masteredSkills = progressData?.filter(p => p.status >= 4).length || 0;
    const independentSkills = progressData?.filter(p => p.status === 3).length || 0;
    const skillMasteryRate = totalSkills > 0
      ? ((masteredSkills + independentSkills) / totalSkills) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        areaProgress: Object.values(areaProgress),
        timelineData,
        activitiesByArea,
        overallStats: {
          totalActivities,
          completedActivities,
          completionRate,
          totalSkills,
          masteredSkills,
          independentSkills,
          skillMasteryRate
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching enhanced progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch enhanced progress' },
      { status: 500 }
    );
  }
}
