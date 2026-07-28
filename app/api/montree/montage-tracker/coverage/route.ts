// /api/montree/montage-tracker/coverage
//
// Montage Tracker — school-wide photo coverage for a date range.
//
//   GET ?date_start=YYYY-MM-DD&date_end=YYYY-MM-DD&mode=daily|weekly
//       → { classrooms: [{ id, name, children: [{ id, name, photo_url,
//                          classroom_id, photo_count }] }],
//           totals: { children, covered, total_photos } }
//
// 🚨 NO teacher_confirmed filter and NO parent_visible filter — the tracker
// counts every photo a teacher tagged with a child, immediately. This route
// is READ-ONLY and touches no AI / photo-identification code.
//
// 🚨 TIMEZONE: date_start/date_end are the CLIENT's browser-local calendar
// dates (schools have no stored timezone — same rule as the montage route).
// This route only validates the YYYY-MM-DD shape.
//
// School-wide by design: every teacher and principal sees ALL classrooms, so
// "who still needs photos" is a team view, not a per-room secret.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { buildCoverage } from '@/lib/montree/montage-tracker/coverage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Classroom tool — teachers and principals only.
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get('date_start') || '';
  const dateEnd = searchParams.get('date_end') || dateStart;
  const mode = searchParams.get('mode') === 'weekly' ? 'weekly' : 'daily';

  if (!DATE_RE.test(dateStart) || !DATE_RE.test(dateEnd)) {
    return NextResponse.json(
      { error: 'date_start / date_end must be YYYY-MM-DD' },
      { status: 400 }
    );
  }
  if (dateStart > dateEnd) {
    return NextResponse.json(
      { error: 'date_start must be on or before date_end' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const coverage = await buildCoverage(supabase, {
      schoolId: auth.schoolId,
      dateStart,
      dateEnd,
      mode,
    });
    return NextResponse.json({ success: true, ...coverage });
  } catch (error) {
    console.error('[montage-tracker/coverage] GET error:', error);
    return NextResponse.json({ error: 'Failed to load coverage' }, { status: 500 });
  }
}
