import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/curriculum/[id] - Get a single work
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;

  const { data: work, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('*')
    .eq('id', id)
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .single();

  if (error || !work) {
    return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  }

  return NextResponse.json({ work });
}

// PATCH /api/admin/curriculum/[id] - Update a work
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, any> = {};
  
  if (body.name !== undefined) {
    updates.name = body.name.trim();
  }
  
  if (body.area !== undefined) {
    // Get area ID
    const { data: areaData } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', WHALE_CLASSROOM_ID)
      .eq('area_key', body.area)
      .single();

    if (areaData) {
      updates.area_id = areaData.id;
    }
  }

  if (body.sequence !== undefined) {
    updates.sequence = body.sequence;
  }

  if (body.category_key !== undefined) {
    updates.category_key = body.category_key;
  }

  if (body.category_name !== undefined) {
    updates.category_name = body.category_name;
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('montree_classroom_curriculum_works')
    .update(updates)
    .eq('id', id)
    .eq('classroom_id', WHALE_CLASSROOM_ID);

  if (error) {
    console.error('Error updating work:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/curriculum/[id] - Delete a work
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;

  // Check if any children have progress on this work
  const { data: progressData, count } = await supabase
    .from('child_work_progress')
    .select('id', { count: 'exact' })
    .eq('work_id', id)
    .limit(1);

  if (count && count > 0) {
    // Delete progress records first (or could warn user)
    await supabase
      .from('child_work_progress')
      .delete()
      .eq('work_id', id);
  }

  // Unlink any weekly_assignments
  await supabase
    .from('weekly_assignments')
    .update({ work_id: null })
    .eq('work_id', id);

  // Delete the work
  const { error } = await supabase
    .from('montree_classroom_curriculum_works')
    .delete()
    .eq('id', id)
    .eq('classroom_id', WHALE_CLASSROOM_ID);

  if (error) {
    console.error('Error deleting work:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, progressDeleted: count || 0 });
}
