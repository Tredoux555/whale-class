// app/api/whale/reports/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

// GET - Generate report data for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!childId) {
      return NextResponse.json(
        { error: 'childId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get child details
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();

    if (childError) throw childError;

    // Get date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Get activities in date range
    const { data: activities, error: activitiesError } = await supabase
      .from('daily_activity_assignments')
      .select(`
        *,
        activity:activities(*)
      `)
      .eq('child_id', childId)
      .gte('assigned_date', startStr)
      .lte('assigned_date', endStr)
      .order('assigned_date', { ascending: false });

    if (activitiesError) throw activitiesError;

    // Get progress data with area from skills -> skill_categories
    const { data: progress, error: progressError } = await supabase
      .from('child_progress')
      .select(`
        *,
        skill:skills(
          category:skill_categories(area)
        )
      `)
      .eq('child_id', childId);

    if (progressError) throw progressError;

    // Calculate statistics
    const totalActivities = activities?.length || 0;
    const completedActivities = activities?.filter(a => a.completed).length || 0;
    const completionRate = totalActivities > 0 
      ? (completedActivities / totalActivities) * 100 
      : 0;

    // Group by area
    const byArea: Record<string, Record<string, unknown>> = {};
    activities?.forEach(assignment => {
      const area = assignment.activity.area;
      if (!byArea[area]) {
        byArea[area] = {
          total: 0,
          completed: 0,
          activities: []
        };
      }
      byArea[area].total++;
      if (assignment.completed) {
        byArea[area].completed++;
      }
      byArea[area].activities.push(assignment);
    });

    // Progress by area
    const progressByArea: Record<string, Record<string, unknown>> = {};
    progress?.forEach((p: Record<string, unknown>) => {
      // Handle Supabase join structure - skill might be object or array
      const skill = Array.isArray(p.skill) ? p.skill[0] : p.skill;
      const category = Array.isArray(skill?.category) ? skill?.category[0] : skill?.category;
      const area = category?.area;
      
      if (!area) return; // Skip if no area found
      
      if (!progressByArea[area]) {
        progressByArea[area] = {
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

      progressByArea[area].skills.push(p);
      progressByArea[area].totalSkills++;
      const status = p.status_level || p.status || 0;
      progressByArea[area].totalStatus += status;

      if (status === 1) progressByArea[area].introduced++;
      else if (status === 2) progressByArea[area].practicing++;
      else if (status === 3) progressByArea[area].independent++;
      else if (status >= 4) progressByArea[area].mastery++;
    });

    // Calculate averages
    Object.keys(progressByArea).forEach(area => {
      const data = progressByArea[area];
      data.averageStatus = data.totalSkills > 0 
        ? data.totalStatus / data.totalSkills 
        : 0;
    });

    // Generate report data
    const reportData = {
      child: {
        name: child.name,
        age_group: child.age_group,
        enrollment_date: child.enrollment_date,
        photo_url: child.photo_url
      },
      dateRange: {
        start: startStr,
        end: endStr
      },
      summary: {
        totalActivities,
        completedActivities,
        completionRate,
        totalSkills: progress?.length || 0,
        masteredSkills: progress?.filter(p => (p.status_level || p.status || 0) >= 4).length || 0
      },
      activitiesByArea: byArea,
      progressByArea,
      recentActivities: activities?.slice(0, 10) || [] // Last 10 activities
    };

    return NextResponse.json({
      success: true,
      data: reportData
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
