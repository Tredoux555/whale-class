import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/classrooms/[id] - Get classroom with students and teachers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get classroom with school info
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select(`
        *,
        school:schools(id, name)
      `)
      .eq('id', id)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Get students in this classroom
    const { data: classroomChildren } = await supabase
      .from('classroom_children')
      .select(`
        enrolled_date,
        status,
        child:children(
          id,
          name,
          date_of_birth,
          photo_url
        )
      `)
      .eq('classroom_id', id)
      .eq('status', 'active');

    // Calculate age and progress for each student
    const studentsWithProgress = await Promise.all(
      (classroomChildren || []).map(async (cc: any) => {
        const child = cc.child;
        
        // Calculate age
        const dob = new Date(child.date_of_birth);
        const today = new Date();
        const ageInYears = (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        // Get progress counts
        const { data: progressData } = await supabase
          .from('child_work_progress')
          .select('status')
          .eq('child_id', child.id);

        const progress = {
          presented: 0,
          practicing: 0,
          mastered: 0,
          total: 0,
        };

        (progressData || []).forEach((p: any) => {
          if (p.status === 1) progress.presented++;
          if (p.status === 2) progress.practicing++;
          if (p.status === 3) progress.mastered++;
        });
        progress.total = progress.presented + progress.practicing + progress.mastered;

        return {
          id: child.id,
          name: child.name,
          date_of_birth: child.date_of_birth,
          age: ageInYears,
          photo_url: child.photo_url,
          enrolled_date: cc.enrolled_date,
          status: cc.status,
          progress,
        };
      })
    );

    // Sort by name
    studentsWithProgress.sort((a, b) => a.name.localeCompare(b.name));

    // Get teachers assigned to this classroom
    const { data: teacherAssignments } = await supabase
      .from('teacher_classrooms')
      .select(`
        role,
        teacher:users(id, name, email)
      `)
      .eq('classroom_id', id);

    const teachers = (teacherAssignments || []).map((ta: any) => ({
      id: ta.teacher.id,
      name: ta.teacher.name,
      email: ta.teacher.email,
      role: ta.role,
    }));

    return NextResponse.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        age_group: classroom.age_group,
        is_active: classroom.is_active,
        school_id: classroom.school.id,
        school_name: classroom.school.name,
      },
      students: studentsWithProgress,
      teachers,
    });
  } catch (error) {
    console.error('Error fetching classroom:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classroom' },
      { status: 500 }
    );
  }
}
