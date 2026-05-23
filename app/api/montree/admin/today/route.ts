// /api/montree/admin/today/route.ts
// Principal cockpit endpoint — powers the Today page on /montree/admin.
//
// Returns:
//   - school + principal identity
//   - school stats (classrooms, teachers, students)
//   - 7-day digest: photos confirmed, teacher logins, active teachers
//   - attention items: idle teachers (no login 3+d), classrooms without teachers,
//     children with no observation 8+d
//
// All queries are school-scoped via verifySchoolRequest. Cached 5 min, SWR 10 min.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    const schoolId = auth.schoolId;

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * ONE_DAY_MS).toISOString();
    const threeDaysAgo = new Date(now - 3 * ONE_DAY_MS).toISOString();
    const eightDaysAgo = new Date(now - 8 * ONE_DAY_MS).toISOString();

    // ── 1. Identity + roster (parallel) ────────────────────────────────────
    const [schoolRes, principalRes, classroomsRes, teachersRes] = await Promise.all([
      supabase.from('montree_schools').select('id, name, slug, plan_type, subscription_status, founding_teacher_id').eq('id', schoolId).maybeSingle(),
      supabase
        .from('montree_school_admins')
        .select('id, name, email, role, last_login')
        .eq('school_id', schoolId)
        .eq('role', 'principal')
        .maybeSingle(),
      supabase
        .from('montree_classrooms')
        .select('id, name, icon, color, is_active')
        .eq('school_id', schoolId)
        .eq('is_active', true),
      supabase
        .from('montree_teachers')
        .select('id, name, email, classroom_id, last_login_at')
        .eq('school_id', schoolId)
        .eq('is_active', true),
    ]);

    if (schoolRes.error || !schoolRes.data) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const school = schoolRes.data;
    const principal = principalRes.data;
    const classrooms = classroomsRes.data || [];
    const teachers = teachersRes.data || [];
    const classroomIds = classrooms.map(c => c.id);

    // ── Plan / billing state — drives the principal cockpit gates ───────────
    // A "teacher-led" school is one created via the /try/instant TEACHER path
    // (plan_type === 'personal_classroom'). A principal invited into such a
    // school is a viewer. A principal who creates their own school via the
    // wizard gets plan_type === 'school' and is the owner — never a viewer.
    //
    // founding_teacher_id is deliberately NOT used here: it is overloaded —
    // on a referral signup it holds the AGENT's id (try/instant ~line 157), so
    // a principal-created, agent-referred school would be wrongly flagged
    // teacher-led and the OWNING principal shown a viewer banner + an "Upgrade
    // to add classrooms" gate on their own school (handoff bug #8).
    const isTeacherLed = school.plan_type === 'personal_classroom';
    const planSummary = {
      plan_type: school.plan_type || 'school',
      subscription_status: school.subscription_status || 'trialing',
      is_teacher_led: isTeacherLed,
    };

    // ── 2. Children, photos (depends on classroomIds) ──────────────────────
    let children: { id: string; name: string; classroom_id: string }[] = [];
    let confirmedPhotos7d: { child_id: string; classroom_id: string; created_at: string }[] = [];
    let recentObservedChildIds = new Set<string>();

    if (classroomIds.length > 0) {
      const [childrenRes, photosRes, recentObs] = await Promise.all([
        supabase
          .from('montree_children')
          .select('id, name, classroom_id')
          .in('classroom_id', classroomIds)
          .eq('is_active', true),
        supabase
          .from('montree_media')
          .select('child_id, classroom_id, created_at')
          .in('classroom_id', classroomIds)
          .eq('teacher_confirmed', true)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('montree_media')
          .select('child_id')
          .in('classroom_id', classroomIds)
          .eq('teacher_confirmed', true)
          .gte('created_at', eightDaysAgo),
      ]);
      children = childrenRes.data || [];
      confirmedPhotos7d = (photosRes.data || []).filter(p => p.child_id) as typeof confirmedPhotos7d;
      for (const r of recentObs.data || []) {
        if (r.child_id) recentObservedChildIds.add(r.child_id);
      }
    }

    // ── 3. Build digest ────────────────────────────────────────────────────
    const activeTeachers7d = teachers.filter(
      t => t.last_login_at && t.last_login_at >= sevenDaysAgo
    ).length;

    const digest = {
      photos_confirmed_7d: confirmedPhotos7d.length,
      teacher_logins_7d: activeTeachers7d,
      active_teacher_count: activeTeachers7d,
      total_teacher_count: teachers.length,
    };

    // ── 4. Build attention items ───────────────────────────────────────────
    const idleTeachers = teachers.filter(
      t => !t.last_login_at || t.last_login_at < threeDaysAgo
    );

    const teachersByClassroom = new Map<string, number>();
    for (const t of teachers) {
      if (!t.classroom_id) continue;
      teachersByClassroom.set(t.classroom_id, (teachersByClassroom.get(t.classroom_id) || 0) + 1);
    }
    const classroomsWithoutTeacher = classrooms
      .filter(c => (teachersByClassroom.get(c.id) || 0) === 0)
      .map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));

    const idleChildren = children
      .filter(c => !recentObservedChildIds.has(c.id))
      .map(c => {
        const classroom = classrooms.find(cl => cl.id === c.classroom_id);
        return {
          id: c.id,
          name: c.name,
          classroom_id: c.classroom_id,
          classroom_name: classroom?.name || '',
        };
      })
      .slice(0, 12); // cap for UI

    const attention = {
      idle_teachers: idleTeachers.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email,
        classroom_id: t.classroom_id,
        last_login_at: t.last_login_at,
      })),
      classrooms_without_teacher: classroomsWithoutTeacher,
      idle_children: idleChildren,
      idle_children_total: children.length - recentObservedChildIds.size,
    };

    // ── 5. Stats (school totals) ───────────────────────────────────────────
    const stats = {
      total_classrooms: classrooms.length,
      total_teachers: teachers.length,
      total_students: children.length,
      total_observed_this_week: recentObservedChildIds.size,
    };

    const response = NextResponse.json({
      school,
      principal,
      stats,
      digest,
      attention,
      plan: planSummary,
    });
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('[Admin Today] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
