import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// PATCH - update assignment status or work
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const supabase = getSupabase();
    const { assignmentId } = await params;
    const body = await request.json();
    const { status, notes, work_id, work_name, work_name_chinese } = body;

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (work_id) updateData.work_id = work_id;
    if (work_name) updateData.work_name = work_name;
    if (work_name_chinese !== undefined) updateData.work_name_chinese = work_name_chinese;

    const { data, error } = await supabase
      .from('weekly_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assignment: data });
  } catch (error) {
    console.error('Failed to update assignment:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - remove assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const supabase = getSupabase();
    const { assignmentId } = await params;

    const { error } = await supabase
      .from('weekly_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete assignment:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
