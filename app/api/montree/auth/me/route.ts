// /api/montree/auth/me/route.ts
// Session recovery: validates httpOnly cookie and returns session data.
// Used when localStorage is cleared but cookie is still valid (e.g., PWA relaunch on iOS).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { userId, schoolId, classroomId, role } = auth;

  try {
    const supabase = getSupabase();

    // Fetch teacher + principal-admin + school + classroom in parallel.
    // A principal of a school may have NO montree_teachers row (the principal
    // signup path creates only a montree_school_admins row). Looking up BOTH
    // is what makes auth/me authoritative for principals — without the admin
    // lookup, /admin/conversations and other principal surfaces mis-resolve
    // the role (handoff bug #6).
    const [teacherRes, adminRes, schoolRes, classroomRes] = await Promise.all([
      supabase.from('montree_teachers').select('id, name, email, role').eq('id', userId).maybeSingle(),
      supabase.from('montree_school_admins').select('id, name, email, role').eq('id', userId).eq('school_id', schoolId).maybeSingle(),
      supabase.from('montree_schools').select('id, name, slug').eq('id', schoolId).maybeSingle(),
      classroomId
        ? supabase.from('montree_classrooms').select('id, name, age_group, school_id').eq('id', classroomId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Authenticated if the school exists AND the user is EITHER a teacher OR a
    // school admin of it. (Was: teacher-only — which 401'd every pure principal.)
    if (!schoolRes.data || (!teacherRes.data && !adminRes.data)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Effective session role. A montree_school_admins row means principal;
    // otherwise fall back to the teacher row's role, then the JWT role.
    const effectiveRole: string = adminRes.data
      ? (adminRes.data.role || 'principal')
      : (teacherRes.data?.role || role);

    // Identity block. Named `teacher` for backward-compat with existing
    // consumers that read meData.teacher.id; for a pure principal it carries
    // the school-admin identity instead. `role` is ALWAYS `effectiveRole` so
    // it agrees with the top-level `role` — otherwise a founder-principal
    // (has BOTH a teacher row and an admin row) would get `role:'principal'`
    // at top level but `teacher.role:'teacher'`, and recoverSession() — which
    // builds the session from `teacher` — would see the wrong role.
    const identity = teacherRes.data
      ? {
          id: teacherRes.data.id,
          name: teacherRes.data.name,
          role: effectiveRole,
          email: teacherRes.data.email,
        }
      : {
          id: adminRes.data!.id,
          name: adminRes.data!.name,
          role: effectiveRole,
          email: adminRes.data!.email,
        };

    // Security: verify classroom belongs to the authenticated school
    // Prevents cross-school data leakage if token contains a mismatched classroomId
    let classroom: { id: string; name: string; age_group: string | null } | null = null;
    if (classroomRes.data) {
      if (classroomRes.data.school_id === schoolId) {
        // Strip school_id from response (internal field, not needed by client)
        const { school_id: _sid, ...rest } = classroomRes.data;
        classroom = rest;
      } else {
        console.warn(`[auth/me] Classroom ${classroomId} does not belong to school ${schoolId} — clearing`);
      }
    }

    return NextResponse.json({
      authenticated: true,
      // Top-level session role — the authoritative "what am I logged in as"
      // signal. Principal surfaces (e.g. /admin/conversations) gate on this.
      role: effectiveRole,
      teacher: identity,
      school: schoolRes.data,
      classroom,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
