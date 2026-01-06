import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { classroomId: string } }
) {
  const supabase = createSupabaseAdmin();
  
  try {
    const { classroomId } = params;

    // Get classroom with school
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select(`
        id, name, age_group,
        schools:school_id (name)
      `)
      .eq('id', classroomId)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get students in classroom
    const { data: enrollments } = await supabase
      .from('classroom_children')
      .select('child_id')
      .eq('classroom_id', classroomId)
      .eq('status', 'active');

    const students = [];
    for (const enrollment of enrollments || []) {
      const { data: child } = await supabase
        .from('children')
        .select('id, name, date_of_birth, photo_url')
        .eq('id', enrollment.child_id)
        .single();

      if (child) {
        // Get mastered count
        const { count: masteredCount } = await supabase
          .from('child_work_progress')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', child.id)
          .eq('status', 3);

        // Get recent mastered works
        const { data: recentWorks } = await supabase
          .from('child_work_progress')
          .select('work_id')
          .eq('child_id', child.id)
          .eq('status', 3)
          .order('mastered_date', { ascending: false })
          .limit(3);

        const workNames = [];
        for (const w of recentWorks || []) {
          const { data: work } = await supabase
            .from('curriculum_roadmap')
            .select('name')
            .eq('id', w.work_id)
            .single();
          if (work) workNames.push(work.name);
        }

        // Calculate age
        const birth = new Date(child.date_of_birth);
        const now = new Date();
        const age = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        students.push({
          ...child,
          age,
          mastered_count: masteredCount || 0,
          recent_works: workNames,
        });
      }
    }

    students.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      classroom: {
        ...classroom,
        school_name: (classroom.schools as any)?.name || 'Unknown',
      },
      students,
    });
  } catch (error) {
    console.error('Failed to fetch classroom view:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
