import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// DELETE /api/classroom/child/[childId]/progress/[workId]
// Delete a work progress record (from child_work_progress) or weekly_assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string; workId: string }> }
) {
  const supabase = getSupabase();
  const { childId, workId } = await params;

  // Check if this is a weekly_assignment ID (orphaned work)
  const { data: assignment } = await supabase
    .from('weekly_assignments')
    .select('id')
    .eq('id', workId)
    .single();

  if (assignment) {
    // Delete from weekly_assignments
    const { error } = await supabase
      .from('weekly_assignments')
      .delete()
      .eq('id', workId);

    if (error) {
      console.error('Error deleting weekly assignment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, deleted: 'weekly_assignment' });
  }

  // Otherwise delete from child_work_progress
  const { error } = await supabase
    .from('child_work_progress')
    .delete()
    .eq('child_id', childId)
    .eq('work_id', workId);

  if (error) {
    console.error('Error deleting progress:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: 'child_work_progress' });
}

// PATCH /api/classroom/child/[childId]/progress/[workId]
// Update a work progress record (status or link to curriculum)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string; workId: string }> }
) {
  const supabase = getSupabase();
  const { childId, workId } = await params;
  const body = await request.json();

  // Check if this is a weekly_assignment ID (orphaned work that needs linking)
  const { data: assignment } = await supabase
    .from('weekly_assignments')
    .select('id, work_name, area, progress_status')
    .eq('id', workId)
    .single();

  // Status mapping
  const statusToString: Record<number, string> = {
    0: 'not_started',
    1: 'presented',
    2: 'practicing',
    3: 'mastered'
  };

  if (assignment) {
    // This is an orphaned weekly_assignment
    if (body.work_id) {
      // LINK: Create child_work_progress record with the linked work_id
      const { error: progressError } = await supabase
        .from('child_work_progress')
        .upsert({
          child_id: childId,
          work_id: body.work_id,
          status: body.status ?? 2, // Default to practicing
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'child_id,work_id'
        });

      if (progressError) {
        console.error('Error creating linked progress:', progressError);
        return NextResponse.json({ error: progressError.message }, { status: 500 });
      }

      // Update the weekly_assignment to have the work_id (for future reference)
      await supabase
        .from('weekly_assignments')
        .update({ work_id: body.work_id })
        .eq('id', workId);

      return NextResponse.json({ success: true, linked: true, source: 'weekly_assignment' });
    }

    // Just updating status on weekly_assignment
    if (body.status !== undefined) {
      const { error } = await supabase
        .from('weekly_assignments')
        .update({ progress_status: statusToString[body.status] || 'practicing' })
        .eq('id', workId);

      if (error) {
        console.error('Error updating weekly assignment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, updated: 'weekly_assignment' });
    }

    return NextResponse.json({ success: true });
  }

  // This is a curriculum work_id - update child_work_progress
  const updates: Record<string, any> = {};
  
  if (body.status !== undefined) {
    updates.status = body.status;
  }
  
  if (body.work_id !== undefined && body.work_id !== workId) {
    // Re-linking to a different curriculum work
    // Create/update the new link
    const { error } = await supabase
      .from('child_work_progress')
      .upsert({
        child_id: childId,
        work_id: body.work_id,
        status: body.status ?? 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'child_id,work_id'
      });

    if (error) {
      console.error('Error creating linked progress:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete the old record
    await supabase
      .from('child_work_progress')
      .delete()
      .eq('child_id', childId)
      .eq('work_id', workId);

    return NextResponse.json({ success: true, linked: true });
  }

  // Simple status update
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    
    // First check if record exists
    const { data: existing } = await supabase
      .from('child_work_progress')
      .select('id')
      .eq('child_id', childId)
      .eq('work_id', workId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('child_work_progress')
        .update(updates)
        .eq('child_id', childId)
        .eq('work_id', workId);

      if (error) {
        console.error('Error updating progress:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('child_work_progress')
        .insert({
          child_id: childId,
          work_id: workId,
          status: body.status ?? 0,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating progress:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
