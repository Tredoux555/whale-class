// /api/montree/admin/teachers/[teacherId]/classrooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Assign classrooms to teacher
export async function PUT(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const { teacherId } = params;
    const { classroom_ids } = await request.json();
    const supabase = getSupabase();

    // Delete existing assignments
    await supabase
      .from('montree_teacher_classrooms')
      .delete()
      .eq('teacher_id', teacherId);

    // Create new assignments
    if (classroom_ids && classroom_ids.length > 0) {
      const assignments = classroom_ids.map((classroomId: string) => ({
        teacher_id: teacherId,
        classroom_id: classroomId,
      }));

      const { error } = await supabase
        .from('montree_teacher_classrooms')
        .insert(assignments);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assign classrooms error:', error);
    return NextResponse.json({ error: 'Failed to assign classrooms' }, { status: 500 });
  }
}
