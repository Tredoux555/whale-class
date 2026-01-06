import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { classroomId: string } }
) {
  const supabase = createSupabaseAdmin();
  
  try {
    const { classroomId } = params;

    // Get classroom with school info
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select(`
        id, name, age_group, school_id,
        schools:school_id (name)
      `)
      .eq('id', classroomId)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get teachers assigned to this classroom
    const { data: teacherAssignments } = await supabase
      .from('teacher_classrooms')
      .select('teacher_id, role')
      .eq('classroom_id', classroomId);

    const teachers = [];
    for (const ta of teacherAssignments || []) {
      const { data: teacher } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', ta.teacher_id)
        .single();
      if (teacher) {
        teachers.push({ ...teacher, role: ta.role });
      }
    }

    // Get students in this classroom
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('classroom_children')
      .select('child_id')
      .eq('classroom_id', classroomId)
      .eq('status', 'active');

    if (enrollmentsError) throw enrollmentsError;

    const students = [];
    for (const enrollment of enrollments || []) {
      // Get child info
      const { data: child } = await supabase
        .from('children')
        .select('id, name, date_of_birth, photo_url')
        .eq('id', enrollment.child_id)
        .single();

      if (child) {
        // Get progress counts
        const { data: progressData } = await supabase
          .from('child_work_progress')
          .select('status')
          .eq('child_id', child.id);

        const progress = {
          presented: 0,
          practicing: 0,
          mastered: 0,
        };

        for (const p of progressData || []) {
          if (p.status === 1) progress.presented++;
          else if (p.status === 2) progress.practicing++;
          else if (p.status === 3) progress.mastered++;
        }

        // Calculate age
        const birth = new Date(child.date_of_birth);
        const now = new Date();
        const age = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        students.push({
          ...child,
          age,
          progress,
        });
      }
    }

    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      classroom: {
        ...classroom,
        school_name: (classroom.schools as any)?.name || 'Unknown',
      },
      teachers,
      students,
    });
  } catch (error) {
    console.error('Failed to fetch classroom:', error);
    return NextResponse.json({ error: 'Failed to fetch classroom' }, { status: 500 });
  }
}
