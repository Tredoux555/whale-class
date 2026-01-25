// app/api/whale/daily-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getNextCurriculumWork, markWorkComplete } from '@/lib/curriculum/progression';

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

    // Otherwise, generate activity using curriculum progression
    try {
      // Get next curriculum work
      const curriculumWork = await getNextCurriculumWork(childId);

      // Find activity mapped to this curriculum work
      const { data: mappings, error: mappingError } = await supabase
        .from('activity_to_curriculum_mapping')
        .select('activity_id, is_primary')
        .eq('curriculum_work_id', curriculumWork.id)
        .order('is_primary', { ascending: false }); // Primary activities first

      let selectedActivityId: string | null = null;

      if (!mappingError && mappings && mappings.length > 0) {
        // Use primary activity if available, otherwise pick randomly
        const primaryMapping = mappings.find(m => m.is_primary);
        if (primaryMapping) {
          selectedActivityId = primaryMapping.activity_id;
        } else {
          // Pick random variant
          const randomMapping = mappings[Math.floor(Math.random() * mappings.length)];
          selectedActivityId = randomMapping.activity_id;
        }
      }

      // If no mapping exists, fall back to finding activity by name match
      if (!selectedActivityId) {
        const { data: matchedActivity } = await supabase
          .from('activities')
          .select('id')
          .ilike('name', `%${curriculumWork.work_name}%`)
          .limit(1)
          .single();

        if (matchedActivity) {
          selectedActivityId = matchedActivity.id;
        }
      }

      // If still no activity found, fall back to old random selection logic
      if (!selectedActivityId) {
        const ageGroupParts = child.age_group.split('-');
        const ageInYears = parseFloat(ageGroupParts[0]) + 0.5;
        
        const { data: fallbackActivities } = await supabase
          .from('activities')
          .select('*')
          .lte('age_min', ageInYears)
          .gte('age_max', ageInYears)
          .eq('area', curriculumWork.area)
          .limit(10);

        if (fallbackActivities && fallbackActivities.length > 0) {
          selectedActivityId = fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)].id;
        }
      }

      if (!selectedActivityId) {
        return NextResponse.json(
          { error: 'No activities found for this curriculum work. Please map activities to curriculum works.', code: 'NO_ACTIVITIES' },
          { status: 404 }
        );
      }

      // Get the selected activity
      const { data: selectedActivity, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', selectedActivityId)
        .single();

      if (activityError || !selectedActivity) {
        throw new Error('Failed to get selected activity');
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

      // Return assignment with curriculum work info
      return NextResponse.json({
        success: true,
        data: {
          ...assignment,
          curriculum_work: {
            id: curriculumWork.id,
            sequence_order: curriculumWork.sequence_order,
            work_name: curriculumWork.work_name,
            area: curriculumWork.area,
            stage: curriculumWork.stage,
            description: curriculumWork.description,
          },
        },
      });
    } catch (curriculumError: any) {
      console.error('Curriculum progression error:', curriculumError);
      // Fall back to old random selection if curriculum fails
      // (This ensures backward compatibility)
      const ageGroupParts = child.age_group.split('-');
      const ageInYears = parseFloat(ageGroupParts[0]) + 0.5;
      
      const { data: fallbackActivities } = await supabase
        .from('activities')
        .select('*')
        .lte('age_min', ageInYears)
        .gte('age_max', ageInYears)
        .limit(10);

      if (!fallbackActivities || fallbackActivities.length === 0) {
        return NextResponse.json(
          { error: 'No activities found. Please add activities to the database.', code: 'NO_ACTIVITIES' },
          { status: 404 }
        );
      }

      const selectedActivity = fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)];
      
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_activity_assignments')
        .delete()
        .eq('child_id', childId)
        .eq('assigned_date', today);

      const { data: assignment } = await supabase
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

      return NextResponse.json({ success: true, data: assignment });
    }
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
    const { assignmentId, completed, notes, curriculumWorkId } = body;

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

    // If completed and curriculumWorkId provided, mark curriculum work as complete
    if (completed && curriculumWorkId) {
      try {
        await markWorkComplete(data.child_id, curriculumWorkId);
      } catch (curriculumError) {
        console.error('Error marking curriculum work complete:', curriculumError);
        // Don't fail the request if curriculum update fails
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}
