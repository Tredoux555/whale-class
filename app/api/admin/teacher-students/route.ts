import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();

  // Fetch all teachers
  const { data: teachers, error: teachersError } = await supabase
    .from('simple_teachers')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name');

  if (teachersError) {
    return NextResponse.json({ error: teachersError.message }, { status: 500 });
  }

  // Fetch all active children
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, name, age_group, active_status')
    .eq('active_status', true)
    .order('name');

  if (childrenError) {
    return NextResponse.json({ error: childrenError.message }, { status: 500 });
  }

  // Fetch all teacher-child assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('teacher_children')
    .select('teacher_id, child_id');

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  }

  // Create assignment lookup
  const childToTeacher = new Map<string, string>();
  (assignments || []).forEach(a => {
    childToTeacher.set(a.child_id, a.teacher_id);
  });

  // Create teacher name lookup
  const teacherNames = new Map<string, string>();
  (teachers || []).forEach(t => {
    teacherNames.set(t.id, t.name);
  });

  // Count students per teacher
  const teacherCounts = new Map<string, number>();
  (assignments || []).forEach(a => {
    teacherCounts.set(a.teacher_id, (teacherCounts.get(a.teacher_id) || 0) + 1);
  });

  // Format response
  const formattedTeachers = (teachers || []).map(t => ({
    id: t.id,
    name: t.name,
    studentCount: teacherCounts.get(t.id) || 0,
  }));

  const formattedChildren = (children || []).map(c => ({
    id: c.id,
    name: c.name,
    age_group: c.age_group,
    assignedTo: childToTeacher.get(c.id) || null,
    assignedTeacherName: childToTeacher.has(c.id) 
      ? teacherNames.get(childToTeacher.get(c.id)!) || null 
      : null,
  }));

  return NextResponse.json({
    teachers: formattedTeachers,
    children: formattedChildren,
  });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { childId, teacherId } = body;

  if (!childId) {
    return NextResponse.json({ error: 'childId required' }, { status: 400 });
  }

  // If teacherId is null, remove assignment
  if (!teacherId) {
    const { error } = await supabase
      .from('teacher_children')
      .delete()
      .eq('child_id', childId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'unassigned' });
  }

  // First, remove any existing assignment for this child
  await supabase
    .from('teacher_children')
    .delete()
    .eq('child_id', childId);

  // Then create new assignment
  const { data, error } = await supabase
    .from('teacher_children')
    .insert({
      teacher_id: teacherId,
      child_id: childId,
      assigned_by: 'admin',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, action: 'assigned', data });
}
