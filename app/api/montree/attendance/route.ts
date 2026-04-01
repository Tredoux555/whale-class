// GET  /api/montree/attendance?date=YYYY-MM-DD  — Today's attendance (derived from photos + overrides)
// POST /api/montree/attendance                   — Mark child present manually
//
// Data sources:
//   montree_attendance_view — SQL view (migration 155) that derives attendance from:
//     - montree_media.captured_at (photo timestamps, converted to school timezone)
//     - montree_attendance_override (manual "Mark Present" entries)
//     Joined via FULL OUTER JOIN on child_id + attendance_date
//   montree_children — classroom roster
//   montree_schools.settings.timezone — school timezone (default: Asia/Shanghai)
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

/** Fetch school timezone from settings JSONB. Returns 'Asia/Shanghai' as default. */
async function getSchoolTimezone(supabase: ReturnType<typeof getSupabase>, schoolId: string): Promise<string> {
  const { data: school } = await supabase
    .from('montree_schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle();
  return school?.settings?.timezone || 'Asia/Shanghai';
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');

  // Default to today in school timezone — let the view handle timezone conversion
  // If date provided, validate format
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
  }

  try {
    // Fetch school timezone once — reused for view query and response date
    const tz = dateParam ? 'Asia/Shanghai' : await getSchoolTimezone(supabase, auth.schoolId);
    const today = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: tz });

    // 1. Get all children in the classroom
    const { data: children, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('classroom_id', auth.classroomId)
      .order('name')
      .limit(200);

    if (childrenErr) {
      console.error('[Attendance] Children fetch error:', childrenErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        date: today,
        children: [],
        present_count: 0,
        total_count: 0,
      });
    }

    // 2. Query the attendance view for this school + date
    const { data: attendance, error: attendanceErr } = await supabase
      .from('montree_attendance_view')
      .select('child_id, attendance_date, has_photos, manually_marked')
      .eq('school_id', auth.schoolId)
      .eq('attendance_date', today);

    if (attendanceErr) {
      console.error('[Attendance] View query error:', attendanceErr);
      return NextResponse.json({ error: 'Failed to load attendance' }, { status: 500 });
    }

    // 3. Build attendance map: child_id -> { present, has_photos, manually_marked }
    const attendanceMap = new Map<string, { has_photos: boolean; manually_marked: boolean }>();
    if (attendance) {
      for (const row of attendance) {
        attendanceMap.set(row.child_id, {
          has_photos: row.has_photos,
          manually_marked: row.manually_marked,
        });
      }
    }

    // 4. Merge children with attendance status
    const childrenWithAttendance = children.map((child: { id: string; name: string; photo_url?: string }) => {
      const att = attendanceMap.get(child.id);
      return {
        id: child.id,
        name: child.name,
        photo_url: child.photo_url || null,
        present: !!att,
        has_photos: att?.has_photos || false,
        manually_marked: att?.manually_marked || false,
      };
    });

    // Sort: absent children first (so teacher sees who's missing), then alphabetical
    childrenWithAttendance.sort((a: { present: boolean; name: string }, b: { present: boolean; name: string }) => {
      if (a.present === b.present) return a.name.localeCompare(b.name);
      return a.present ? 1 : -1; // absent first
    });

    const presentCount = childrenWithAttendance.filter((c: { present: boolean }) => c.present).length;

    return NextResponse.json({
      date: today,
      children: childrenWithAttendance,
      present_count: presentCount,
      total_count: children.length,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[Attendance] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { child_id, date } = body;

    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }

    // Validate date format if provided
    let attendanceDate = date;
    if (attendanceDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
      }
    } else {
      // Default to today in school timezone
      const tz = await getSchoolTimezone(supabase, auth.schoolId);
      attendanceDate = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    }

    // Verify child belongs to this school AND classroom
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('id', child_id)
      .eq('school_id', auth.schoolId)
      .eq('classroom_id', auth.classroomId)
      .maybeSingle();

    if (childErr || !child) {
      return NextResponse.json({ error: 'Child not found in your classroom' }, { status: 404 });
    }

    // Upsert attendance override (UNIQUE on child_id + attendance_date handles duplicates)
    const { error: upsertErr } = await supabase
      .from('montree_attendance_override')
      .upsert({
        child_id,
        school_id: auth.schoolId,
        attendance_date: attendanceDate,
        marked_by: auth.userId,
      }, {
        onConflict: 'child_id,attendance_date',
      });

    if (upsertErr) {
      console.error('[Attendance] Override upsert error:', upsertErr);
      return NextResponse.json({ error: 'Failed to mark present' }, { status: 500 });
    }

    return NextResponse.json({ success: true, child_id, date: attendanceDate });
  } catch (err) {
    console.error('[Attendance] POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
