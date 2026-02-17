// /api/montree/admin/classrooms/[classroomId]/route.ts
// Classroom detail API — teachers + students for principal drill-down
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    const schoolId = auth.schoolId;
    const { classroomId } = await params;

    // Get classroom (verify it belongs to this school)
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon, color, created_at')
      .eq('id', classroomId)
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get teachers for this classroom
    const { data: teachers } = await supabase
      .from('montree_teachers')
      .select('id, name, email, role, login_code, last_login_at, is_active, created_at')
      .eq('school_id', schoolId)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    // Sort: lead_teacher first
    const sortedTeachers = (teachers || []).sort((a, b) => {
      const order: Record<string, number> = { lead_teacher: 0, teacher: 1, assistant_teacher: 2 };
      return (order[a.role || 'teacher'] ?? 1) - (order[b.role || 'teacher'] ?? 1);
    });

    // Get students for this classroom
    const { data: students } = await supabase
      .from('montree_children')
      .select('id, name, photo_url, age, is_active, created_at')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    // Get report count for this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    let reportsThisMonth = 0;
    try {
      const { count } = await supabase
        .from('montree_weekly_reports')
        .select('id', { count: 'exact', head: true })
        .in('child_id', (students || []).map(s => s.id))
        .gte('generated_at', monthStart.toISOString());
      reportsThisMonth = count || 0;
    } catch {
      // Table might not exist yet — ignore
    }

    return NextResponse.json({
      classroom,
      teachers: sortedTeachers.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role || 'teacher',
        login_code: t.login_code,
        last_login: t.last_login_at,
        is_active: t.is_active,
      })),
      students: students || [],
      stats: {
        total_students: (students || []).length,
        total_teachers: (teachers || []).length,
        reports_this_month: reportsThisMonth,
      },
    });
  } catch (error) {
    console.error('Classroom detail error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
