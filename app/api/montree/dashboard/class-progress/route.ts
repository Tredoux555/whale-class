// app/api/montree/dashboard/class-progress/route.ts
// Class Progress — classroom-wide summary across all 5 curriculum areas.
//
// Backs the "Class Progress" tab on Classroom Overview. Aggregates confirmed
// photo evidence over a period (week | month) into:
//   - Per-area card data (children active, photos, works touched, top works)
//   - Per-child row data (areas touched, photos, last_active, per-area counts)
//
// Photo confirmation rules mirror english-missing/route.ts:
//   - teacher_confirmed = TRUE is the only "really happened" signal
//   - Group photos via montree_media_children junction count toward the linked child
//   - Area is resolved via montree_classroom_curriculum_areas.area_key
//
// Period boundary is the school-timezone Monday 00:00 (canonical helper from
// lib/montree/school-time.ts per Calendar Plan §7a / rule #228).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import {
  getSchoolTimezone,
  currentWeekStartInTz,
  localDateInTzToUtcInstant,
} from '@/lib/montree/school-time';

export const dynamic = 'force-dynamic';

// 'english' = the flag-gated 58-Week English Program (a conditional 6th area).
// It aggregates like any other area, but empty english entries are filtered out
// of the response (see areasOut below) so non-participating schools are unaffected.
type AreaKey = 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural' | 'english';

const AREA_ORDER: AreaKey[] = [
  'practical_life',
  'sensorial',
  'mathematics',
  'language',
  'cultural',
  'english',
];

const AREA_LABEL: Record<AreaKey, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
  english: 'English Program',
};

interface ChildRow { id: string; name: string; photo_url: string | null }
interface AreaRow { id: string; area_key: string }
interface WorkRow { id: string; name: string; area_id: string }
interface MediaRow {
  id: string;
  child_id: string | null;
  work_id: string;
  captured_at: string;
}
interface JunctionRow { media_id: string; child_id: string }

interface TopWork { work_name: string; photo_count: number; children_count: number }

interface AreaSummary {
  area_key: AreaKey;
  area_label: string;
  children_active: number;
  photos_total: number;
  works_active: number;
  top_works: TopWork[];
}

interface PerChild {
  child_id: string;
  child_name: string;
  photo_url: string | null;
  areas_active: number;
  photos_total: number;
  last_active: string | null;
  area_breakdown: Record<AreaKey, number>;
}

interface ClassProgressResponse {
  success: true;
  classroom_id: string;
  children_count: number;
  period: 'week' | 'month';
  areas: AreaSummary[];
  per_child: PerChild[];
  week_start: string;
  generated_at: string;
}

function emptyAreaBreakdown(): Record<AreaKey, number> {
  return {
    practical_life: 0,
    sensorial: 0,
    mathematics: 0,
    language: 0,
    cultural: 0,
    english: 0,
  };
}

// 'english' is only surfaced when the classroom actually has English Program
// activity — an empty english entry is dropped so non-participating schools see
// exactly the 5 core areas they saw before.
function isVisibleArea(a: { area_key: AreaKey; photos_total: number; works_active: number }): boolean {
  if (a.area_key !== 'english') return true;
  return a.photos_total > 0 || a.works_active > 0;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { schoolId, classroomId } = auth;
  if (!classroomId) {
    return NextResponse.json(
      { error: 'No classroom in session' },
      { status: 400 },
    );
  }

  // Period — week (default) or month
  const rawPeriod = request.nextUrl.searchParams.get('period') || 'week';
  const period: 'week' | 'month' = rawPeriod === 'month' ? 'month' : 'week';

  // ─── Time boundary (school-tz aware, Calendar Plan §7a) ───
  const tz = await getSchoolTimezone(schoolId);
  const weekStartStr = currentWeekStartInTz(tz);
  const weekStartUtc = localDateInTzToUtcInstant(weekStartStr, tz);
  const monthStartUtc = new Date(weekStartUtc.getTime() - 30 * 24 * 60 * 60 * 1000);

  const periodStartUtc = period === 'month' ? monthStartUtc : weekStartUtc;
  const periodStartIso = periodStartUtc.toISOString();
  const generatedAt = new Date().toISOString();
  // Upper bound — `now`. Without this a future-dated row (clock skew, manual
  // edit, test data) would silently inflate the period numbers.
  const periodEndIso = generatedAt;

  const supabase = getSupabase();

  // ─── 1-3. Roster + curriculum areas + works + period photos ───
  // These four reads are independent (each keyed on classroomId/period only),
  // so fire them in ONE parallel batch instead of four sequential round-trips
  // (~4×network-RTT → ~1). The empty-roster early return happens right after.
  //
  // Audit-fix (Session 129): the media query has an upper bound to refuse
  // future-dated rows (clock skew, manual edit, bad test data).
  const [rosterRes, areasRes, worksRes, candidateRes] = await Promise.all([
    supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroomId),
    supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area_id')
      .eq('classroom_id', classroomId),
    supabase
      .from('montree_media')
      .select('id, child_id, work_id, captured_at')
      .eq('classroom_id', classroomId)
      .eq('teacher_confirmed', true)
      .not('work_id', 'is', null)
      .gte('captured_at', periodStartIso)
      .lte('captured_at', periodEndIso),
  ]);

  const roster = (rosterRes.data || []) as ChildRow[];
  if (roster.length === 0) {
    return emptyResponse(classroomId, period, weekStartStr, generatedAt);
  }
  const rosterIds = roster.map(c => c.id);

  const areas = (areasRes.data || []) as AreaRow[];
  const areaIdToKey = new Map<string, AreaKey>();
  for (const a of areas) {
    if ((AREA_ORDER as string[]).includes(a.area_key)) {
      areaIdToKey.set(a.id, a.area_key as AreaKey);
    }
  }

  const works = (worksRes.data || []) as WorkRow[];
  const workIdToWork = new Map(works.map(w => [w.id, w]));

  const candidateMedia = (candidateRes.data || []) as MediaRow[];
  const candidateMediaById = new Map(candidateMedia.map(m => [m.id, m]));
  const candidateMediaIds = candidateMedia.map(m => m.id);

  // Direct media — media rows where the primary child_id is on the active
  // roster. (Group photos' primary child_id may be off-roster; those flow
  // through the junction step below.)
  const rosterIdSet = new Set(rosterIds);
  const directMedia = candidateMedia.filter(
    m => m.child_id !== null && rosterIdSet.has(m.child_id),
  );

  // Junction links — child_id ∈ roster + media_id ∈ candidates
  let junctionRows: JunctionRow[] = [];
  if (candidateMediaIds.length > 0) {
    const { data: junctionRaw } = await supabase
      .from('montree_media_children')
      .select('media_id, child_id')
      .in('media_id', candidateMediaIds)
      .in('child_id', rosterIds);
    junctionRows = (junctionRaw || []) as JunctionRow[];
  }

  // ─── 4. Build (child_id, media_id, work_id, captured_at) tuples,
  //         de-duplicating so a single photo doesn't double-count when
  //         both direct child_id matches AND a junction row matches. ───
  type Tuple = { child_id: string; media_id: string; work_id: string; captured_at: string };
  const seen = new Set<string>(); // key = `${child_id}::${media_id}`
  const tuples: Tuple[] = [];

  const addTuple = (childId: string, m: MediaRow) => {
    if (!m.work_id) return;
    const key = `${childId}::${m.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    tuples.push({
      child_id: childId,
      media_id: m.id,
      work_id: m.work_id,
      captured_at: m.captured_at,
    });
  };

  for (const m of directMedia) {
    if (m.child_id) addTuple(m.child_id, m);
  }
  for (const link of junctionRows) {
    const m = candidateMediaById.get(link.media_id);
    if (m) addTuple(link.child_id, m);
  }

  // ─── 5. Aggregate per-area + per-child ───
  // Per area: photos, distinct children, distinct works, per-work counts
  type AreaAgg = {
    photos: number;
    childrenSet: Set<string>;
    worksSet: Set<string>;
    workPhotoCount: Map<string, number>;       // work_id → photos
    workChildSet: Map<string, Set<string>>;    // work_id → set of child_ids
  };
  const areaAggs = new Map<AreaKey, AreaAgg>();
  for (const key of AREA_ORDER) {
    areaAggs.set(key, {
      photos: 0,
      childrenSet: new Set(),
      worksSet: new Set(),
      workPhotoCount: new Map(),
      workChildSet: new Map(),
    });
  }

  // Per child: photos, area breakdown, last_active, distinct areas active
  type ChildAgg = {
    photos: number;
    areaBreakdown: Record<AreaKey, number>;
    lastActive: string | null;
    areasSet: Set<AreaKey>;
  };
  const childAggs = new Map<string, ChildAgg>();
  for (const c of roster) {
    childAggs.set(c.id, {
      photos: 0,
      areaBreakdown: emptyAreaBreakdown(),
      lastActive: null,
      areasSet: new Set(),
    });
  }

  for (const t of tuples) {
    const work = workIdToWork.get(t.work_id);
    if (!work) continue;
    const areaKey = areaIdToKey.get(work.area_id);
    if (!areaKey) continue;

    // Area aggregate
    const areaAgg = areaAggs.get(areaKey)!;
    areaAgg.photos += 1;
    areaAgg.childrenSet.add(t.child_id);
    areaAgg.worksSet.add(t.work_id);
    areaAgg.workPhotoCount.set(t.work_id, (areaAgg.workPhotoCount.get(t.work_id) || 0) + 1);
    let workChildren = areaAgg.workChildSet.get(t.work_id);
    if (!workChildren) {
      workChildren = new Set();
      areaAgg.workChildSet.set(t.work_id, workChildren);
    }
    workChildren.add(t.child_id);

    // Child aggregate
    const childAgg = childAggs.get(t.child_id);
    if (!childAgg) continue;
    childAgg.photos += 1;
    childAgg.areaBreakdown[areaKey] += 1;
    childAgg.areasSet.add(areaKey);
    if (!childAgg.lastActive || t.captured_at > childAgg.lastActive) {
      childAgg.lastActive = t.captured_at;
    }
  }

  // ─── 6. Build response payloads ───
  const areasOut: AreaSummary[] = AREA_ORDER.map(key => {
    const agg = areaAggs.get(key)!;
    // Top 5 works by photo count, ties broken by name
    const topWorks: TopWork[] = Array.from(agg.workPhotoCount.entries())
      .map(([workId, count]) => {
        const work = workIdToWork.get(workId);
        return {
          work_name: work?.name || 'Unknown',
          photo_count: count,
          children_count: agg.workChildSet.get(workId)?.size || 0,
        };
      })
      .sort((a, b) => b.photo_count - a.photo_count || a.work_name.localeCompare(b.work_name))
      .slice(0, 5);

    return {
      area_key: key,
      area_label: AREA_LABEL[key],
      children_active: agg.childrenSet.size,
      photos_total: agg.photos,
      works_active: agg.worksSet.size,
      top_works: topWorks,
    };
  }).filter(isVisibleArea);

  const perChild: PerChild[] = roster.map(c => {
    const agg = childAggs.get(c.id)!;
    return {
      child_id: c.id,
      child_name: c.name,
      photo_url: c.photo_url,
      areas_active: agg.areasSet.size,
      photos_total: agg.photos,
      last_active: agg.lastActive,
      area_breakdown: agg.areaBreakdown,
    };
  });

  // Sort: most areas active DESC, then most photos DESC, then name ASC.
  // Children with zero photos float to the bottom naturally because their
  // areas_active and photos_total are both 0.
  perChild.sort((a, b) => {
    if (b.areas_active !== a.areas_active) return b.areas_active - a.areas_active;
    if (b.photos_total !== a.photos_total) return b.photos_total - a.photos_total;
    return a.child_name.localeCompare(b.child_name);
  });

  const payload: ClassProgressResponse = {
    success: true,
    classroom_id: classroomId,
    children_count: roster.length,
    period,
    areas: areasOut,
    per_child: perChild,
    week_start: weekStartStr,
    generated_at: generatedAt,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function emptyResponse(
  classroomId: string,
  period: 'week' | 'month',
  weekStartStr: string,
  generatedAt: string,
) {
  const payload: ClassProgressResponse = {
    success: true,
    classroom_id: classroomId,
    children_count: 0,
    period,
    // No roster → no activity → english (a conditional area) is dropped, leaving
    // the 5 core areas exactly as before.
    areas: AREA_ORDER.map(k => ({
      area_key: k,
      area_label: AREA_LABEL[k],
      children_active: 0,
      photos_total: 0,
      works_active: 0,
      top_works: [],
    })).filter(isVisibleArea),
    per_child: [],
    week_start: weekStartStr,
    generated_at: generatedAt,
  };
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
