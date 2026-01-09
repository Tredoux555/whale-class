import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  try {
    // Get classroom with teacher
    const { data: classroom, error: classError } = await supabase
      .from('classrooms')
      .select('*, teacher:users(id, name, email), school:schools(id, name)')
      .eq('id', id)
      .single();

    if (classError) throw classError;

    // Get students in classroom
    const { data: enrollments } = await supabase
      .from('classroom_children')
      .select('*, child:children(*)')
      .eq('classroom_id', id)
      .eq('status', 'active');

    const students = (enrollments || []).map(e => e.child);

    return NextResponse.json({ classroom, students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  try {
    const body = await request.json();
    const { teacher_id, name, age_group } = body;

    const updateData: any = {};
    if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
    if (name) updateData.name = name;
    if (age_group) updateData.age_group = age_group;

    const { data, error } = await supabase
      .from('classrooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ classroom: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
