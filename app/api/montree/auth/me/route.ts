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

    // Fetch teacher + school + classroom in parallel
    const [teacherRes, schoolRes, classroomRes] = await Promise.all([
      supabase.from('montree_teachers').select('id, name, email, role').eq('id', userId).maybeSingle(),
      supabase.from('montree_schools').select('id, name, slug').eq('id', schoolId).maybeSingle(),
      classroomId
        ? supabase.from('montree_classrooms').select('id, name, age_group').eq('id', classroomId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (!teacherRes.data || !schoolRes.data) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      teacher: {
        id: teacherRes.data.id,
        name: teacherRes.data.name,
        role: teacherRes.data.role || role,
        email: teacherRes.data.email,
      },
      school: schoolRes.data,
      classroom: classroomRes.data || null,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
