// /api/montree/dashboard/curriculum-gaps/route.ts
//
// ✨ Curriculum Gap Radar (Jun 10, 2026) — second cross-child intelligence
// surface. Catches the blind spots every teacher has: areas of the
// curriculum that NO child has touched in a while.
//
//   "Your Cultural shelf has had no new activity in 5 weeks."
//   "8 of 40 Sensorial works have never been presented to anyone."
//
// Signal = montree_child_progress.updated_at. Session 84 wired a real-time
// progress write on every photo confirmation (upsertProgressObservation),
// so updated_at reliably reflects "a child did something with this work
// recently." We match progress rows to curriculum works (NOT the free-text
// .area column, which has a known 'cultural' vs 'culture' mismatch) and
// roll up to the area.
//
// Three gap types per area, in descending severity:
//   - 'stale'    — the area's most-recent activity is older than STALE_DAYS
//                  (hard cutoff; a genuine red flag).
//   - 'quiet'    — the area is NOT stale, but it's gone notably quieter than
//                  the rest of the classroom: at least QUIET_DAYS old AND at
//                  least QUIET_RATIO times older than the median area. This is
//                  the always-useful signal for a well-run classroom — it
//                  finds the quietest corner relative to everything else,
//                  rather than waiting for a hard cutoff.
//   - 'untouched'— a meaningful share of an otherwise-active area's works have
//                  never been touched by ANY child.
//
// Cross-pollination: classroom comes from the JWT; verified against
// auth.schoolId before any child reads. Cache: private, no-store.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

const STALE_DAYS = 21;            // 3 weeks with no activity in an area = stale (red)
const QUIET_DAYS = 12;            // an area must be at least this quiet to flag as 'quiet'
const QUIET_RATIO = 2.5;          // ...AND this many times quieter than the median area
const UNTOUCHED_MIN_FRACTION = 0.4; // >=40% of an active area's works never touched
const UNTOUCHED_MIN_WORKS = 4;    // ...and at least this many, to be worth saying

interface AreaGap {
  area_id: string;
  area_key: string;
  area_name: string;
  gap_type: 'stale' | 'quiet' | 'untouched';
  // stale / quiet:
  last_activity_at?: string | null;
  days_since?: number;
  median_days?: number; // quiet only — context for the comparison
  // untouched:
  untouched_count?: number;
  total_works?: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id') || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'No classroom in session' },
        { status: 400 }
      );
    }

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found in your school' },
        { status: 403 }
      );
    }

    const [childrenRes, areasRes, worksRes] = await Promise.all([
      supabase
        .from('montree_children')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('is_active', true),
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key, name, sequence')
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .order('sequence', { ascending: true }),
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, area_id, name')
        .eq('classroom_id', classroomId)
        .eq('is_active', true),
    ]);

    const childIds = (childrenRes.data || []).map((c: { id: string }) => c.id);
    const areas = (areasRes.data || []) as Array<{ id: string; area_key: string; name: string; sequence: number }>;
    const works = (worksRes.data || []) as Array<{ id: string; area_id: string; name: string }>;

    if (childIds.length === 0 || areas.length === 0 || works.length === 0) {
      return NextResponse.json(
        { success: true, gaps: [] },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // work name (lower) → work; total works per area
    const workByNameLower = new Map<string, (typeof works)[number]>();
    const totalWorksByArea = new Map<string, number>();
    for (const w of works) {
      workByNameLower.set(w.name.toLowerCase(), w);
      totalWorksByArea.set(w.area_id, (totalWorksByArea.get(w.area_id) || 0) + 1);
    }

    // Page through all progress (a busy classroom can exceed the 1000 default).
    let progressRows: Array<{ work_name: string; updated_at: string }> = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from('montree_child_progress')
        .select('work_name, updated_at')
        .in('child_id', childIds)
        .range(from, from + 999);
      const batch = (data || []) as Array<{ work_name: string; updated_at: string }>;
      progressRows = progressRows.concat(batch);
      if (batch.length < 1000) break;
    }

    // Per area: newest activity timestamp + set of touched work ids
    const lastActivityByArea = new Map<string, number>(); // area_id → epoch ms
    const touchedWorkIdsByArea = new Map<string, Set<string>>();
    for (const row of progressRows) {
      const work = workByNameLower.get((row.work_name || '').toLowerCase());
      if (!work) continue; // off-curriculum note
      const ts = row.updated_at ? Date.parse(row.updated_at) : NaN;
      if (!Number.isNaN(ts)) {
        const prev = lastActivityByArea.get(work.area_id) || 0;
        if (ts > prev) lastActivityByArea.set(work.area_id, ts);
      }
      let set = touchedWorkIdsByArea.get(work.area_id);
      if (!set) { set = new Set(); touchedWorkIdsByArea.set(work.area_id, set); }
      set.add(work.id);
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const staleMs = STALE_DAYS * dayMs;

    // Median days-since across areas that HAVE activity — the baseline the
    // 'quiet' comparison is relative to. Only meaningful with >=3 active areas
    // (otherwise "quietest of two" is noise).
    const activeDaysSince: number[] = [];
    for (const area of areas) {
      const lastTs = lastActivityByArea.get(area.id) || 0;
      if (lastTs > 0) activeDaysSince.push((now - lastTs) / dayMs);
    }
    activeDaysSince.sort((a, b) => a - b);
    const medianDays =
      activeDaysSince.length > 0
        ? activeDaysSince[Math.floor(activeDaysSince.length / 2)]
        : 0;
    const canUseQuiet = activeDaysSince.length >= 3;

    const gaps: AreaGap[] = [];

    for (const area of areas) {
      const total = totalWorksByArea.get(area.id) || 0;
      if (total === 0) continue;
      const lastTs = lastActivityByArea.get(area.id) || 0;
      const touched = touchedWorkIdsByArea.get(area.id)?.size || 0;

      // An area never started in a brand-new classroom is NOT a gap — avoid
      // lighting up every area on day 1. We only speak about active areas.
      const hasAnyActivity = lastTs > 0;
      if (!hasAnyActivity) continue;

      // Exact (unfloored) days for all comparisons — flooring only for display
      // avoids dropping a borderline-quiet area (audit fix Jun 10).
      const daysSinceExact = (now - lastTs) / dayMs;
      const daysSince = Math.floor(daysSinceExact);

      // 1. STALE (hard red). >= so an area inactive for exactly STALE_DAYS
      // flags (consistent with the QUIET_DAYS >= floor below).
      if (now - lastTs >= staleMs) {
        gaps.push({
          area_id: area.id, area_key: area.area_key, area_name: area.name,
          gap_type: 'stale',
          last_activity_at: new Date(lastTs).toISOString(),
          days_since: daysSince,
        });
        continue; // stale's untouched count is implied — don't double-report
      }

      // 2. QUIET (relative amber) — notably quieter than the rest of the room.
      // When the median is 0 (the rest of the room was all active today), the
      // ratio test is trivially satisfied — and that's correct: a 12+ day quiet
      // area IS the quiet one when everyone else worked today. The QUIET_DAYS
      // floor is what makes the signal meaningful in that case.
      if (
        canUseQuiet &&
        daysSinceExact >= QUIET_DAYS &&
        daysSinceExact >= medianDays * QUIET_RATIO
      ) {
        gaps.push({
          area_id: area.id, area_key: area.area_key, area_name: area.name,
          gap_type: 'quiet',
          last_activity_at: new Date(lastTs).toISOString(),
          days_since: daysSince,
          median_days: Math.round(medianDays),
        });
        continue;
      }

      // 3. UNTOUCHED — lots of never-presented works in an otherwise-active area.
      const untouched = total - touched;
      if (untouched >= UNTOUCHED_MIN_WORKS && untouched / total >= UNTOUCHED_MIN_FRACTION) {
        gaps.push({
          area_id: area.id, area_key: area.area_key, area_name: area.name,
          gap_type: 'untouched',
          untouched_count: untouched,
          total_works: total,
        });
      }
    }

    // Severity order: stale → quiet → untouched; within that, stalest/biggest first.
    const sev: Record<AreaGap['gap_type'], number> = { stale: 0, quiet: 1, untouched: 2 };
    gaps.sort(
      (a, b) =>
        sev[a.gap_type] - sev[b.gap_type] ||
        (b.days_since || 0) - (a.days_since || 0) ||
        (b.untouched_count || 0) - (a.untouched_count || 0)
    );

    return NextResponse.json(
      { success: true, gaps },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[CurriculumGaps] error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
