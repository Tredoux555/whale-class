// app/api/montree/dashboard/english-missing/route.ts
// Returns the list of active children in the caller's classroom who have NOT
// had any Language-area photo confirmed this week.
//
// "Confirmed" = montree_media.teacher_confirmed = TRUE. identification_status
// is intentionally NOT used here — confirmed is the only state that counts as
// "really happened" (Session 119 architectural rule).
//
// "Language" is resolved via montree_classroom_curriculum_areas.area_key = 'language'.
// Work names are NOT inspected — the area is the source of truth.
//
// Group photos via montree_media_children junction MUST count toward the
// linked child (Session 113 architectural rule). A child credited via the
// junction counts as "did English" even if the parent montree_media row's
// child_id is someone else.
//
// Week boundary is the classroom-timezone Monday 00:00. For now we use the
// teacher's local Date semantics, mirroring english-schedule/route.ts.
// (Whale Class runs in Asia/Shanghai; Railway runs UTC. This matches the
// behavior of the rest of the dashboard.)

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

interface MissingChild {
  id: string;
  name: string;
}

interface EnglishMissingResponse {
  success: true;
  week_start: string;   // YYYY-MM-DD
  week_end: string;     // YYYY-MM-DD (Sunday — exclusive upper bound is next Monday 00:00)
  missing: MissingChild[];
  total_in_class: number;
  language_area_present: boolean;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId } = auth;
  if (!classroomId) {
    return NextResponse.json(
      { error: 'No classroom in session' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // ─── Week boundary (classroom-local Monday 00:00 inclusive → next Monday 00:00 exclusive) ───
  const weekStart = getCurrentWeekMonday();
  const weekEndExclusive = new Date(weekStart);
  weekEndExclusive.setDate(weekStart.getDate() + 7);

  const weekStartIso = weekStart.toISOString();
  const weekEndExclusiveIso = weekEndExclusive.toISOString();
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = new Date(weekEndExclusive.getTime() - 1)
    .toISOString()
    .split('T')[0];

  // ─── 1. Active roster for this classroom ───
  const { data: rosterRaw } = await supabase
    .from('montree_children')
    .select('id, name')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');

  const roster = (rosterRaw || []) as Array<{ id: string; name: string }>;
  if (roster.length === 0) {
    const payload: EnglishMissingResponse = {
      success: true,
      week_start: weekStartStr,
      week_end: weekEndStr,
      missing: [],
      total_in_class: 0,
      language_area_present: false,
    };
    return jsonOk(payload);
  }

  // ─── 2. Resolve Language area ───
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();

  // No Language area configured for this classroom — every child is "missing"
  // by definition, but that would be misleading. Return an empty missing list
  // with language_area_present=false so the UI can render an inert state.
  if (!langArea) {
    const payload: EnglishMissingResponse = {
      success: true,
      week_start: weekStartStr,
      week_end: weekEndStr,
      missing: [],
      total_in_class: roster.length,
      language_area_present: false,
    };
    return jsonOk(payload);
  }

  // ─── 3. All work_ids in the Language area ───
  const { data: langWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_id', (langArea as { id: string }).id);

  const langWorkIds = ((langWorks || []) as Array<{ id: string }>).map(w => w.id);

  // If the Language area has no works, nobody can have "done English" — return
  // the whole roster as missing.
  if (langWorkIds.length === 0) {
    const payload: EnglishMissingResponse = {
      success: true,
      week_start: weekStartStr,
      week_end: weekEndStr,
      missing: roster,
      total_in_class: roster.length,
      language_area_present: true,
    };
    return jsonOk(payload);
  }

  const rosterIds = roster.map(c => c.id);
  const doneChildIds = new Set<string>();

  // ─── 4. Direct photos: child_id is the primary link ───
  const { data: directRaw } = await supabase
    .from('montree_media')
    .select('child_id')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('child_id', rosterIds)
    .in('work_id', langWorkIds)
    .gte('captured_at', weekStartIso)
    .lt('captured_at', weekEndExclusiveIso);

  for (const row of (directRaw || []) as Array<{ child_id: string | null }>) {
    if (row.child_id) doneChildIds.add(row.child_id);
  }

  // ─── 5. Group photos via montree_media_children junction ───
  // First find candidate media rows (any teacher_confirmed Language photo
  // captured this week in this classroom). Then look up junction-linked
  // children whose ids are on our roster.
  const { data: candidateMediaRaw } = await supabase
    .from('montree_media')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('work_id', langWorkIds)
    .gte('captured_at', weekStartIso)
    .lt('captured_at', weekEndExclusiveIso);

  const candidateMediaIds = ((candidateMediaRaw || []) as Array<{ id: string }>).map(m => m.id);

  if (candidateMediaIds.length > 0) {
    const { data: junctionRaw } = await supabase
      .from('montree_media_children')
      .select('child_id')
      .in('media_id', candidateMediaIds)
      .in('child_id', rosterIds);

    for (const row of (junctionRaw || []) as Array<{ child_id: string | null }>) {
      if (row.child_id) doneChildIds.add(row.child_id);
    }
  }

  // ─── 6. Compute missing list, preserving roster order ───
  const missing = roster.filter(c => !doneChildIds.has(c.id));

  const payload: EnglishMissingResponse = {
    success: true,
    week_start: weekStartStr,
    week_end: weekEndStr,
    missing,
    total_in_class: roster.length,
    language_area_present: true,
  };
  return jsonOk(payload);
}

// ─── Helpers ───

/**
 * Returns this week's Monday at 00:00:00.000 (server-local Date semantics —
 * same as english-schedule/route.ts). Whale Class runs in Asia/Shanghai;
 * Railway runs UTC. For now we accept the slight tz mismatch on the boundary
 * day — fixing it requires a per-classroom timezone column, which is out of
 * scope for the Session 119 ship.
 */
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offsetToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function jsonOk(payload: EnglishMissingResponse) {
  return NextResponse.json(payload, {
    headers: {
      // Per-session-scoped data — Session 117 rule #185 says session-scoped
      // endpoints get private + no-store unless cache key safety is proven.
      // useMontreeData on the client handles "feels instant"; we don't need
      // browser/CDN caching layered underneath.
      'Cache-Control': 'private, no-store',
    },
  });
}
