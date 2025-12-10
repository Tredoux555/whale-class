// app/api/whale/daily-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// GET - Get today's activity for a child
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
    const today = new Date().toISOString().split('T')[0];

    // Get today's activity assignment with activity details
    const { data, error } = await supabase
      .from('daily_activity_assignments')
      .select(`
        *,
        activity:activities(*)
      `)
      .eq('child_id', childId)
      .eq('assigned_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({ success: true, data: data || null });
  } catch (error: any) {
    console.error('Error fetching daily activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch daily activity' },
      { status: 500 }
    );
  }
}

// POST - Generate a new activity for today (or assign specific activity if activityId provided)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childId, activityId } = body;

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
    if (!child) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }

    // If specific activityId provided, assign that activity directly
    if (activityId) {
      // Verify activity exists
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (activityError || !activity) {
        return NextResponse.json(
          { error: 'Activity not found' },
          { status: 404 }
        );
      }

      // Delete any existing assignment for today
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_activity_assignments')
        .delete()
        .eq('child_id', childId)
        .eq('assigned_date', today);

      // Create new assignment with specific activity
      const { data: assignment, error: assignError } = await supabase
        .from('daily_activity_assignments')
        .insert({
          child_id: childId,
          activity_id: activityId,
          assigned_date: today,
          completed: false,
        })
        .select(`
          *,
          activity:activities(*)
        `)
        .single();

      if (assignError) throw assignError;

      return NextResponse.json({ success: true, data: assignment });
    }

    // Otherwise, generate activity automatically
    // Get age in years (for filtering activities)
    // age_group is stored as '2-3', '3-4', etc. - use the lower bound + 0.5
    const ageGroupParts = child.age_group.split('-');
    const ageInYears = parseFloat(ageGroupParts[0]) + 0.5; // '2-3' → 2.5, '3-4' → 3.5

    // Get recently completed activities (last 10 days)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const { data: recentActivities, error: recentError } = await supabase
      .from('daily_activity_assignments')
      .select('activity_id')
      .eq('child_id', childId)
      .gte('assigned_date', tenDaysAgo.toISOString().split('T')[0]);

    if (recentError) throw recentError;

    const recentActivityIds = recentActivities?.map(a => a.activity_id) || [];

    // Get all eligible activities (age-appropriate, not recently done)
    let query = supabase
      .from('activities')
      .select('*')
      .lte('age_min', ageInYears)
      .gte('age_max', ageInYears);

    // Exclude recently done activities
    if (recentActivityIds.length > 0) {
      // Supabase .not() with 'in' requires array format
      query = query.not('id', 'in', `(${recentActivityIds.join(',')})`);
    }

    const { data: eligibleActivities, error: activitiesError } = await query;

    if (activitiesError) throw activitiesError;

    if (!eligibleActivities || eligibleActivities.length === 0) {
      return NextResponse.json(
        { error: 'No activities found for this child. Please add activities to the database.', code: 'NO_ACTIVITIES' },
        { status: 404 }
      );
    }

    // Get child's progress to determine skill gaps (optional - if no progress, skip prioritization)
    const { data: progressData, error: progressError } = await supabase
      .from('child_progress')
      .select(`
        status_level,
        skill:skills(
          category:skill_categories(area)
        )
      `)
      .eq('child_id', childId);

    // Calculate area priorities (areas with lower average progress)
    const areaPriorities: Record<string, number> = {};
    const areaSkills: Record<string, any[]> = {};

    if (!progressError && progressData) {
      progressData.forEach((progress: any) => {
        // Handle Supabase join structure - skill might be object or array
        const skill = Array.isArray(progress.skill) ? progress.skill[0] : progress.skill;
        const category = Array.isArray(skill?.category) ? skill?.category[0] : skill?.category;
        const area = category?.area;
        
        if (!area) return;
        
        if (!areaSkills[area]) {
          areaSkills[area] = [];
        }
        areaSkills[area].push({
          status: progress.status_level || 0
        });
      });

      Object.keys(areaSkills).forEach(area => {
        const skills = areaSkills[area];
        const avgStatus = skills.reduce((sum, s) => sum + (s.status || 0), 0) / skills.length;
        areaPriorities[area] = avgStatus;
      });
    }

    // Intelligent selection algorithm
    // Priority: areas with lower progress > variety > skill level appropriateness
    
    // Group activities by area
    const activitiesByArea: Record<string, any[]> = {};
    eligibleActivities.forEach(activity => {
      if (!activitiesByArea[activity.area]) {
        activitiesByArea[activity.area] = [];
      }
      activitiesByArea[activity.area].push(activity);
    });

    let selectedActivity = null;

    // Try to select from underperforming areas first
    const sortedAreas = Object.keys(areaPriorities).sort(
      (a, b) => areaPriorities[a] - areaPriorities[b]
    );

    for (const area of sortedAreas) {
      if (activitiesByArea[area] && activitiesByArea[area].length > 0) {
        // Pick appropriate skill level (slightly above current average)
        const areaAvg = areaPriorities[area];
        const targetSkillLevel = Math.min(Math.ceil(areaAvg) + 1, 4);
        
        const suitable = activitiesByArea[area].filter(
          a => a.skill_level <= targetSkillLevel
        );

        if (suitable.length > 0) {
          selectedActivity = suitable[Math.floor(Math.random() * suitable.length)];
          break;
        }
      }
    }

    // If no activity from priority areas, pick randomly from eligible
    if (!selectedActivity) {
      selectedActivity = eligibleActivities[Math.floor(Math.random() * eligibleActivities.length)];
    }

    // Delete any existing assignment for today
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_activity_assignments')
      .delete()
      .eq('child_id', childId)
      .eq('assigned_date', today);

    // Create new assignment
    const { data: assignment, error: assignError } = await supabase
      .from('daily_activity_assignments')
      .insert({
        child_id: childId,
        activity_id: selectedActivity.id,
        assigned_date: today,
        completed: false,
      })
      .select(`
        *,
        activity:activities(*)
      `)
      .single();

    if (assignError) throw assignError;

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    console.error('Error generating daily activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate daily activity' },
      { status: 500 }
    );
  }
}

// PUT - Update activity completion status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, completed, notes } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const updateData: any = {
      completed,
      notes: notes || null,
    };

    if (completed) {
      updateData.completed_date = new Date().toISOString().split('T')[0]; // Use DATE format, not TIMESTAMP
    }

    const { data, error } = await supabase
      .from('daily_activity_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select(`
        *,
        activity:activities(*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}
