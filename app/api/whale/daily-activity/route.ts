// app/api/whale/daily-activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { selectDailyActivity, markActivityComplete } from '@/lib/algorithms/activity-selection';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { childId, preferredAreas, excludeAreas, forceNewArea } = body;

    if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 });

    const supabase = await createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_activity_assignments')
      .select(`*, activity:activities (*), child:children (*)`)
      .eq('child_id', childId)
      .eq('assigned_date', today)
      .single();

    if (existing && !existing.completed) {
      return NextResponse.json({ data: existing, message: 'Activity already assigned for today', existing: true });
    }

    const activity = await selectDailyActivity(childId, { preferredAreas, excludeAreas, forceNewArea });

    const { data: assignment, error } = await supabase
      .from('daily_activity_assignments')
      .insert({ child_id: childId, activity_id: activity.id, assigned_date: today, completed: false })
      .select(`*, activity:activities (*), child:children (*)`)
      .single();

    if (error) throw new Error(`Failed to create assignment: ${error.message}`);
    return NextResponse.json({ data: assignment, message: 'Daily activity generated successfully', existing: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate daily activity' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 });

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('daily_activity_assignments')
      .select(`*, activity:activities (*), child:children (*)`)
      .eq('child_id', childId)
      .eq('assigned_date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Failed to get assignment: ${error.message}`);
    if (!data) return NextResponse.json({ data: null, message: 'No activity assigned for this date' });
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch daily activity' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, completed, notes, engagementLevel } = body;

    if (!assignmentId) return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });

    const supabase = await createServerClient();
    const updateData: any = { notes };
    if (completed !== undefined) {
      updateData.completed = completed;
      if (completed) updateData.completed_date = new Date().toISOString().split('T')[0];
    }

    const { data: assignment, error: updateError } = await supabase
      .from('daily_activity_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select(`*, activity:activities (*), child:children (*)`)
      .single();

    if (updateError) throw new Error(`Failed to update assignment: ${updateError.message}`);

    if (completed && assignment) {
      await markActivityComplete(assignment.child_id, assignment.activity_id, true, notes, engagementLevel);
    }

    return NextResponse.json({ data: assignment, message: completed ? 'Activity marked as complete' : 'Activity updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update activity' }, { status: 500 });
  }
}
