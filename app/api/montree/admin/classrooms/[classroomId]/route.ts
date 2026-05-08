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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const studentIds = (students || []).map((s) => s.id);
    const teacherIdList = (teachers || []).map((t) => t.id);

    // ── Session 97 progress scan additions ─────────────────────────────────
    // Per-student progress (works mastered/practicing/presented per area).
    // Per-teacher activity (photos confirmed this week + last login already
    // available). Surfaced inline in the classroom drill-down.
    let progressByStudent: Map<string, { mastered: number; practicing: number; presented: number; by_area: Record<string, { mastered: number; practicing: number; presented: number }> }> = new Map();
    if (studentIds.length) {
      try {
        const { data: progressRows } = await supabase
          .from('montree_child_progress')
          .select('child_id, area, status')
          .in('child_id', studentIds);
        progressByStudent = new Map();
        for (const id of studentIds) {
          progressByStudent.set(id, { mastered: 0, practicing: 0, presented: 0, by_area: {} });
        }
        for (const p of progressRows || []) {
          const bucket = progressByStudent.get(p.child_id);
          if (!bucket) continue;
          const status = (p.status || 'presented') as 'mastered' | 'practicing' | 'presented';
          if (status === 'mastered' || status === 'practicing' || status === 'presented') {
            bucket[status] += 1;
            const area = p.area || 'unspecified';
            if (!bucket.by_area[area]) {
              bucket.by_area[area] = { mastered: 0, practicing: 0, presented: 0 };
            }
            bucket.by_area[area][status] += 1;
          }
        }
      } catch (e) {
        console.warn('[classroom drill-down] progress query failed:', e);
      }
    }

    // Photos this week per student.
    const photosByStudent = new Map<string, number>();
    if (studentIds.length) {
      try {
        const { data: photos } = await supabase
          .from('montree_media')
          .select('child_id, confirmed_by')
          .in('child_id', studentIds)
          .eq('teacher_confirmed', true)
          .gte('captured_at', sevenDaysAgo);
        for (const p of photos || []) {
          photosByStudent.set(p.child_id, (photosByStudent.get(p.child_id) || 0) + 1);
        }
      } catch (e) {
        console.warn('[classroom drill-down] media query failed:', e);
      }
    }

    // Photos confirmed by each teacher this week.
    const photosByTeacher = new Map<string, number>();
    const notesByTeacher = new Map<string, number>();
    if (teacherIdList.length) {
      try {
        const { data: photos } = await supabase
          .from('montree_media')
          .select('confirmed_by')
          .in('confirmed_by', teacherIdList)
          .eq('teacher_confirmed', true)
          .gte('captured_at', sevenDaysAgo);
        for (const p of photos || []) {
          if (p.confirmed_by) {
            photosByTeacher.set(p.confirmed_by, (photosByTeacher.get(p.confirmed_by) || 0) + 1);
          }
        }
      } catch (e) {
        console.warn('[classroom drill-down] teacher media query failed:', e);
      }
      try {
        const { data: notes } = await supabase
          .from('montree_teacher_notes')
          .select('teacher_id')
          .in('teacher_id', teacherIdList)
          .gte('created_at', sevenDaysAgo);
        for (const n of notes || []) {
          if (n.teacher_id) notesByTeacher.set(n.teacher_id, (notesByTeacher.get(n.teacher_id) || 0) + 1);
        }
      } catch (e) {
        console.warn('[classroom drill-down] teacher notes query failed:', e);
      }
    }

    let reportsThisMonth = 0;
    try {
      const { count } = await supabase
        .from('montree_weekly_reports')
        .select('id', { count: 'exact', head: true })
        .in('child_id', studentIds)
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
        photos_this_week: photosByTeacher.get(t.id) || 0,
        notes_this_week: notesByTeacher.get(t.id) || 0,
      })),
      students: (students || []).map((s) => ({
        ...s,
        progress: progressByStudent.get(s.id) || { mastered: 0, practicing: 0, presented: 0, by_area: {} },
        photos_this_week: photosByStudent.get(s.id) || 0,
      })),
      stats: {
        total_students: (students || []).length,
        total_teachers: (teachers || []).length,
        reports_this_month: reportsThisMonth,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error('Classroom detail error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
