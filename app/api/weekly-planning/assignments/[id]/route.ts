import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const id = params.id;
    const body = await request.json();

    // Build update object from allowed fields
    const updates: Record<string, any> = {};
    if (body.work_id !== undefined) updates.work_id = body.work_id;
    if (body.work_name !== undefined) updates.work_name = body.work_name;
    if (body.work_name_chinese !== undefined) updates.work_name_chinese = body.work_name_chinese;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.progress_status !== undefined) {
      updates.progress_status = body.progress_status;
      updates.status = body.progress_status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('weekly_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Assignment update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment: data });

  } catch (error) {
    console.error('Failed to update assignment:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
