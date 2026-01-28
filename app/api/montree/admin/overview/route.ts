// /api/montree/admin/overview/route.ts
// Principal dashboard overview - school, classrooms, teachers, stats
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Get school ID from header (set by client from localStorage)
    const schoolId = request.headers.get('x-school-id');
    const principalId = request.headers.get('x-principal-id');
    
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get classrooms for this school
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon, color, is_active, created_at')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    const classroomIds = (classrooms || []).map(c => c.id);

    // Get teachers for this school
    const { data: teachers } = await supabase
      .from('montree_teachers')
      .select('id, name, email, classroom_id, is_active, last_login_at')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    // Get students for school classrooms (via classroom_id, not school_id)
    let students: any[] = [];
    if (classroomIds.length > 0) {
      const { data: studentData } = await supabase
        .from('montree_children')
        .select('id, classroom_id')
        .in('classroom_id', classroomIds)
        .eq('is_active', true);
      students = studentData || [];
    }

    // Build classroom data with teachers and student counts
    const classroomsWithData = (classrooms || []).map(classroom => {
      const teacher = teachers?.find(t => t.classroom_id === classroom.id);
      const studentCount = students?.filter(s => s.classroom_id === classroom.id).length || 0;
      
      return {
        ...classroom,
        teacher_id: teacher?.id || null,
        teacher_name: teacher?.name || null,
        teacher_email: teacher?.email || null,
        teacher_last_login: teacher?.last_login_at || null,
        student_count: studentCount,
      };
    });

    // Get principal info
    const { data: principal } = await supabase
      .from('montree_school_admins')
      .select('id, name, email, role, last_login')
      .eq('school_id', schoolId)
      .eq('role', 'principal')
      .single();

    // Calculate stats
    const stats = {
      total_classrooms: classrooms?.length || 0,
      total_teachers: teachers?.length || 0,
      total_students: students?.length || 0,
      classrooms_without_teacher: classroomsWithData.filter(c => !c.teacher_id).length,
    };

    return NextResponse.json({
      school,
      principal,
      classrooms: classroomsWithData,
      stats,
    });

  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
