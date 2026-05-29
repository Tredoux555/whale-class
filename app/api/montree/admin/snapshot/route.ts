// /api/montree/admin/snapshot/route.ts
// Astra's proactive snapshot for the principal dashboard.
//
// School-scoped (auth.schoolId). Returns signals the principal can act on.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface ClassroomSignal {
  classroom_id: string;
  classroom_name: string | null;
  active_students: number;
  photos_7d: number;
  last_photo_at: string | null;
  signal: 'active' | 'quiet' | 'stale';
}

interface TeacherSignal {
  teacher_id: string;
  teacher_name: string | null;
  last_login_at: string | null;
  days_since_login: number | null;
  signal: 'active' | 'quiet' | 'idle';
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher' && auth.role !== 'homeschool_parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = Date.now();

  // Classrooms in this school + their children counts.
  const { data: classrooms } = await supabase
    .from('montree_classrooms')
    .select('id, name')
    .eq('school_id', auth.schoolId);

  const classroomList = (classrooms || []) as Array<{ id: string; name: string | null }>;

  // Per-classroom children + photos.
  const classroomSignals: ClassroomSignal[] = [];
  for (const c of classroomList) {
    const [childrenRes, mediaRes] = await Promise.all([
      supabase
        .from('montree_children')
        .select('id', { count: 'exact', head: true })
        .eq('classroom_id', c.id)
        .eq('is_active', true),
      supabase
        .from('montree_media')
        .select('created_at')
        .eq('classroom_id', c.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    const photos = (mediaRes.data || []) as Array<{ created_at: string }>;
    const lastPhoto = photos[0]?.created_at || null;
    const photos7d = photos.length;
    let signal: ClassroomSignal['signal'];
    if (photos7d >= 10) signal = 'active';
    else if (photos7d >= 1) signal = 'quiet';
    else signal = 'stale';
    classroomSignals.push({
      classroom_id: c.id,
      classroom_name: c.name,
      active_students: childrenRes.count || 0,
      photos_7d: photos7d,
      last_photo_at: lastPhoto,
      signal,
    });
  }

  // Teachers in this school.
  const { data: teachers } = await supabase
    .from('montree_teachers')
    .select('id, name, last_login_at')
    .eq('school_id', auth.schoolId)
    .eq('is_active', true);

  const teacherSignals: TeacherSignal[] = ((teachers || []) as Array<{ id: string; name: string | null; last_login_at: string | null }>).map((t) => {
    const daysSince = t.last_login_at
      ? Math.floor((now - new Date(t.last_login_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    let signal: TeacherSignal['signal'];
    if (daysSince === null || daysSince > 7) signal = 'idle';
    else if (daysSince > 3) signal = 'quiet';
    else signal = 'active';
    return {
      teacher_id: t.id,
      teacher_name: t.name,
      last_login_at: t.last_login_at,
      days_since_login: daysSince,
      signal,
    };
  });

  // Unprocessed photos count (still flagged for audit).
  const { count: pendingPhotos } = await supabase
    .from('montree_media')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', auth.schoolId)
    .eq('teacher_confirmed', false)
    .gte('created_at', sevenDaysAgo);

  // Build top-line action suggestions.
  const staleClassrooms = classroomSignals.filter((c) => c.signal === 'stale');
  const idleTeachers = teacherSignals.filter((t) => t.signal === 'idle');

  const suggestions: string[] = [];
  const suggestion_keys: Array<{ key: string; params: Record<string, number> }> = [];
  if (staleClassrooms.length > 0) {
    suggestions.push(
      `${staleClassrooms.length} classroom${staleClassrooms.length === 1 ? '' : 's'} had no photos this week`
    );
    suggestion_keys.push({ key: 'tracy.suggestion.staleClassrooms', params: { count: staleClassrooms.length } });
  }
  if (idleTeachers.length > 0) {
    suggestions.push(
      `${idleTeachers.length} teacher${idleTeachers.length === 1 ? '' : 's'} haven't logged in this week`
    );
    suggestion_keys.push({ key: 'tracy.suggestion.idleTeachers', params: { count: idleTeachers.length } });
  }
  if ((pendingPhotos || 0) > 10) {
    suggestions.push(`${pendingPhotos} photos awaiting teacher confirmation`);
    suggestion_keys.push({ key: 'tracy.suggestion.pendingPhotos', params: { count: pendingPhotos || 0 } });
  }

  return NextResponse.json({
    classrooms: classroomSignals,
    teachers: teacherSignals,
    pending_photos_7d: pendingPhotos || 0,
    suggestions,
    suggestion_keys,
  });
}
