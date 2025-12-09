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

    // Check for existing activity for today (use maybeSingle to handle no results gracefully)
    const { data: existing, error: existingError } = await supabase
      .from('daily_activity_assignments')
      .select(`*, activity:activities (*), child:children (*)`)
      .eq('child_id', childId)
      .eq('assigned_date', today)
      .maybeSingle();

    // If there's an existing incomplete activity, return it
    if (existing && !existing.completed) {
      return NextResponse.json({ data: existing, message: 'Activity already assigned for today', existing: true });
    }

    // Generate the new activity
    const activity = await selectDailyActivity(childId, { preferredAreas, excludeAreas, forceNewArea });

    let assignment;
    let error;

    // If there's an existing completed activity, UPDATE it with the new activity
    if (existing && existing.completed) {
      const { data: updated, error: updateError } = await supabase
        .from('daily_activity_assignments')
        .update({ 
          activity_id: activity.id, 
          completed: false, 
          completed_date: null,
          notes: null
        })
        .eq('id', existing.id)
        .select(`*, activity:activities (*), child:children (*)`)
        .single();
      
      assignment = updated;
      error = updateError;
    } else {
      // No existing activity, INSERT a new one
      const { data: inserted, error: insertError } = await supabase
        .from('daily_activity_assignments')
        .insert({ child_id: childId, activity_id: activity.id, assigned_date: today, completed: false })
        .select(`*, activity:activities (*), child:children (*)`)
        .single();
      
      assignment = inserted;
      error = insertError;
    }

    if (error) {
      // Handle unique constraint violation more gracefully
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        // Race condition - try to get the existing record
        const { data: existingRecord } = await supabase
          .from('daily_activity_assignments')
          .select(`*, activity:activities (*), child:children (*)`)
          .eq('child_id', childId)
          .eq('assigned_date', today)
          .single();
        
        if (existingRecord) {
          return NextResponse.json({ data: existingRecord, message: 'Activity assigned', existing: true });
        }
      }
      throw new Error(`Failed to ${existing && existing.completed ? 'update' : 'create'} assignment: ${error.message}`);
    }
    
    return NextResponse.json({ data: assignment, message: 'Daily activity generated successfully', existing: false });
  } catch (error: any) {
    console.error('Daily activity generation error:', error);
    const errorMessage = error.message || 'Failed to generate daily activity';
    
    // Provide helpful error messages
    if (errorMessage.includes('No suitable activities found') || errorMessage.includes('No activities')) {
      return NextResponse.json({ 
        error: 'No activities found in database. Please add activities first. The system needs activities to generate daily assignments.',
        code: 'NO_ACTIVITIES'
      }, { status: 404 });
    }
    
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Database tables not set up. Please run the MONTESSORI-DATABASE-SCHEMA.sql in Supabase.',
        code: 'DB_NOT_SETUP'
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
      .maybeSingle();

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
