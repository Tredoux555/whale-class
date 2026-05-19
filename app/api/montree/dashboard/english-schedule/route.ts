// app/api/montree/dashboard/english-schedule/route.ts
// Generates a weekly English schedule: 6 children per day, Mon-Fri.
// Priority: (1) K-bound children first, (2) within each group, children with
// fewest recent English/Language visits go first.
// Also supports saving a generated schedule and retrieving the saved one.
//
// 🚨 Session 119 — DYNAMIC ROLLING SCHEDULE:
// The saved schedule is now an "intent" snapshot. Every GET applies a LIVE
// STATE transform on top of it:
//   - Past days (Mon-yesterday): frozen historical record; each kid marked
//     done (✓) if they have a confirmed Language photo this week.
//   - Today + future days: recomputed from scratch using kids who haven't
//     done English yet this week. K-bound priority preserved.
// This means: photos a teacher takes today instantly redistribute the
// remaining-week plan when she next loads the page. Bingo constraint
// ("every kid attends ≥1× per week") is hard-baked — kids who don't get
// done roll forward as priority on the next available day.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

// Children moving up to K class — get priority scheduling
const K_BOUND_NAMES = new Set([
  'yueze', 'lucky', 'austin', 'mingxi', 'leo', 'eric',
  'jimmy', 'rachel', 'kevin', 'yo-yo', 'joey', 'molly',
]);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

interface ChildActivity {
  id: string;
  name: string;
  photo_url: string | null;
  is_k_bound: boolean;
  language_visit_count: number;      // visits in the last 2 weeks
  days_since_last_visit: number | null; // null = never visited
  last_visit_date: string | null;
}

/**
 * Session 119 — wrap any base schedule with live state. Past days stay
 * as saved; today + future are recomputed from current done set.
 */
async function enrichScheduleWithLiveState(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  weekStart: Date,
  baseSchedule: { days?: Record<string, Array<{
    id: string; name: string; photo_url: string | null;
    is_k_bound: boolean; days_since_last_visit: number | null;
  }>>; children_count?: number; k_bound_count?: number },
): Promise<{
  days: LiveScheduleDays;
  meta: LiveStateMeta;
  children_count: number;
  k_bound_count: number;
}> {
  // Roster (current active kids — not Monday's snapshot)
  const { data: rosterRaw } = await supabase
    .from('montree_children')
    .select('id, name, photo_url')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');
  const roster = (rosterRaw || []) as Array<{
    id: string; name: string; photo_url: string | null;
  }>;

  // K-bound + days-since-last-visit come from the saved snapshot's kids.
  // Anyone NEW to the roster since Monday gets defaults (not K-bound,
  // never-visited) — they'll be top-priority for bingo this week.
  const kBoundSet = new Set<string>();
  const daysSinceLastEnglish = new Map<string, number | null>();
  for (const day of DAY_ORDER_LIVE) {
    const arr = baseSchedule.days?.[day] || [];
    for (const k of arr) {
      if (k.is_k_bound) kBoundSet.add(k.id);
      if (!daysSinceLastEnglish.has(k.id)) {
        daysSinceLastEnglish.set(k.id, k.days_since_last_visit);
      }
    }
  }
  // Defaults for new-since-Monday roster
  for (const k of roster) {
    if (!daysSinceLastEnglish.has(k.id)) {
      daysSinceLastEnglish.set(k.id, null);
      if (K_BOUND_NAMES.has(k.name.toLowerCase())) kBoundSet.add(k.id);
    }
  }

  const rosterIds = roster.map(k => k.id);
  const doneSet = await loadDoneChildIds(supabase, classroomId, weekStart, rosterIds);
  const today = getCurrentWeekDay();

  const { days, meta } = applyLiveState(
    baseSchedule.days || {},
    roster,
    kBoundSet,
    daysSinceLastEnglish,
    doneSet,
    today,
  );

  return {
    days,
    meta,
    children_count: roster.length,
    k_bound_count: kBoundSet.size,
  };
}

/**
 * GET — retrieve or generate a weekly English schedule.
 * ?week_start=YYYY-MM-DD — optional, defaults to current week's Monday.
 * ?generate=true — force-generate a new schedule even if one is saved.
 */
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId, schoolId } = auth;
  if (!classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const supabase = getSupabase();
  const forceGenerate = request.nextUrl.searchParams.get('generate') === 'true';

  // Determine week boundaries
  const weekStartParam = request.nextUrl.searchParams.get('week_start');
  const weekStart = getWeekStart(weekStartParam);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Friday
  weekEnd.setHours(23, 59, 59, 999);

  // Check for saved schedule first (unless force-generating)
  if (!forceGenerate) {
    const { data: saved } = await supabase
      .from('montree_english_schedule')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('week_start', weekStart.toISOString().split('T')[0])
      .maybeSingle();

    if (saved) {
      const s = saved as { schedule: { days?: Record<string, Array<{
        id: string; name: string; photo_url: string | null;
        is_k_bound: boolean; days_since_last_visit: number | null;
      }>>; children_count?: number; k_bound_count?: number };
        week_start: string; generated_at: string };
      const enriched = await enrichScheduleWithLiveState(
        supabase, classroomId, weekStart, s.schedule,
      );
      return NextResponse.json({
        success: true,
        schedule: {
          days: enriched.days,
          children_count: enriched.children_count,
          k_bound_count: enriched.k_bound_count,
          week_label: weekStart.toISOString().split('T')[0],
        },
        live_state: enriched.meta,
        week_start: s.week_start,
        generated_at: s.generated_at,
        source: 'saved+live',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // Generate fresh schedule
  const schedule = await generateSchedule(supabase, classroomId, weekStart);

  // Save it
  const weekStartStr = weekStart.toISOString().split('T')[0];
  await (supabase as any)
    .from('montree_english_schedule')
    .upsert({
      classroom_id: classroomId,
      school_id: schoolId,
      week_start: weekStartStr,
      schedule,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'classroom_id,week_start' });

  const enrichedFresh = await enrichScheduleWithLiveState(
    supabase, classroomId, weekStart, schedule,
  );
  return NextResponse.json({
    success: true,
    schedule: {
      days: enrichedFresh.days,
      children_count: enrichedFresh.children_count,
      k_bound_count: enrichedFresh.k_bound_count,
      week_label: weekStartStr,
    },
    live_state: enrichedFresh.meta,
    week_start: weekStartStr,
    generated_at: new Date().toISOString(),
    source: 'generated+live',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * POST — regenerate the schedule for a given week (manual refresh).
 */
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { classroomId, schoolId } = auth;
  if (!classroomId) {
    return NextResponse.json({ error: 'No classroom in session' }, { status: 400 });
  }

  const supabase = getSupabase();
  const body = await request.json().catch(() => ({}));
  const weekStartParam = body.week_start || null;
  const weekStart = getWeekStart(weekStartParam);

  const schedule = await generateSchedule(supabase, classroomId, weekStart);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  await (supabase as any)
    .from('montree_english_schedule')
    .upsert({
      classroom_id: classroomId,
      school_id: schoolId,
      week_start: weekStartStr,
      schedule,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'classroom_id,week_start' });

  const enriched = await enrichScheduleWithLiveState(
    supabase, classroomId, weekStart, schedule,
  );
  return NextResponse.json({
    success: true,
    schedule: {
      days: enriched.days,
      children_count: enriched.children_count,
      k_bound_count: enriched.k_bound_count,
      week_label: weekStartStr,
    },
    live_state: enriched.meta,
    week_start: weekStartStr,
    generated_at: new Date().toISOString(),
    source: 'generated+live',
  }, { headers: { 'Cache-Control': 'no-store' } });
}


// ─── Helpers ───

function getWeekStart(param: string | null): Date {
  if (param) {
    const d = new Date(param + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  // Default: this week's Monday
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ─── Session 119: Live state computation ──────────────────────────────

interface ScheduleChildLive {
  id: string;
  name: string;
  photo_url: string | null;
  is_k_bound: boolean;
  days_since_last_visit: number | null;
  is_done: boolean;            // true if confirmed Language photo this week
  rolled_from_day?: string;    // 'monday'|'tuesday'|... when rolled forward
}

interface LiveScheduleDays {
  monday: ScheduleChildLive[];
  tuesday: ScheduleChildLive[];
  wednesday: ScheduleChildLive[];
  thursday: ScheduleChildLive[];
  friday: ScheduleChildLive[];
}

interface LiveStateMeta {
  today: string | null;            // 'monday'|...|'friday' OR null when weekend
  is_workday: boolean;
  done_count: number;
  undone_count: number;
  total_in_class: number;
  unscheduled_undone_names: string[]; // only populated if shortfall
  shortfall_warning: string | null;   // human-readable warning
}

const DAY_ORDER_LIVE = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
type WeekDay = typeof DAY_ORDER_LIVE[number];

/**
 * Find children who have a confirmed Language photo this week. Mirrors the
 * Session 119 english-missing logic exactly:
 *   - area_key='language' (NOT work-name inference)
 *   - teacher_confirmed=true (NOT identification_status)
 *   - includes group photos via montree_media_children junction
 */
async function loadDoneChildIds(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  weekStart: Date,
  rosterIds: string[],
): Promise<Set<string>> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Resolve Language area for this classroom
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();
  if (!langArea) return new Set();

  const { data: langWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_id', (langArea as { id: string }).id);
  const langWorkIds = ((langWorks || []) as Array<{ id: string }>).map(w => w.id);
  if (langWorkIds.length === 0 || rosterIds.length === 0) return new Set();

  const doneSet = new Set<string>();

  // Direct photos — filter by roster too (mirrors english-missing pattern)
  const { data: directRaw } = await supabase
    .from('montree_media')
    .select('child_id')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('child_id', rosterIds)
    .in('work_id', langWorkIds)
    .gte('captured_at', weekStart.toISOString())
    .lt('captured_at', weekEnd.toISOString());
  for (const row of (directRaw || []) as Array<{ child_id: string | null }>) {
    if (row.child_id) doneSet.add(row.child_id);
  }

  // Group photos via junction — also filter by roster on the junction read.
  // Audit finding #2 (Session 119): without this, a junction row pointing to
  // a child from a different classroom would surface in the set. Cosmetically
  // wasteful before; now matches the english-missing reference exactly.
  const { data: candidateMediaRaw } = await supabase
    .from('montree_media')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('work_id', langWorkIds)
    .gte('captured_at', weekStart.toISOString())
    .lt('captured_at', weekEnd.toISOString());
  const candidateMediaIds = ((candidateMediaRaw || []) as Array<{ id: string }>).map(m => m.id);
  if (candidateMediaIds.length > 0) {
    const { data: junctionRaw } = await supabase
      .from('montree_media_children')
      .select('child_id')
      .in('media_id', candidateMediaIds)
      .in('child_id', rosterIds);
    for (const row of (junctionRaw || []) as Array<{ child_id: string | null }>) {
      if (row.child_id) doneSet.add(row.child_id);
    }
  }

  return doneSet;
}

/**
 * Return the current weekday as 'monday'|...|'friday', or null on weekends.
 * Uses server-local Date semantics (matches generateSchedule's getWeekStart).
 */
function getCurrentWeekDay(): WeekDay | null {
  const dow = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (dow === 0 || dow === 6) return null;
  return DAY_ORDER_LIVE[dow - 1];
}

/**
 * Apply the LIVE STATE transform on top of a saved schedule.
 *
 * Past days: kept frozen (original kids) + is_done flag added.
 * Today + future: pool of undone kids redistributed across remaining days,
 *   K-bound first, then most-days-since-English. Bingo constraint preserved.
 *
 * The original saved schedule (Monday's intent) is what the function reads
 * from — but past days only consult it for who-was-there. Today+future
 * recompute entirely from the current done_set + roster, so a teacher's
 * Wed photo of Rachel removes Rachel from Thu's list automatically.
 */
function applyLiveState(
  savedDays: Record<string, Array<{
    id: string;
    name: string;
    photo_url: string | null;
    is_k_bound: boolean;
    days_since_last_visit: number | null;
  }>>,
  roster: Array<{ id: string; name: string; photo_url: string | null }>,
  kBoundSet: Set<string>,
  daysSinceLastEnglish: Map<string, number | null>,
  doneSet: Set<string>,
  today: WeekDay | null,
): { days: LiveScheduleDays; meta: LiveStateMeta } {
  const days: LiveScheduleDays = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [],
  };

  // Determine past vs today+future. Weekend → all days frozen.
  const todayIdx = today === null ? DAY_ORDER_LIVE.length : DAY_ORDER_LIVE.indexOf(today);
  const pastDays = DAY_ORDER_LIVE.slice(0, todayIdx);
  const liveDays = DAY_ORDER_LIVE.slice(todayIdx);

  // ─── PAST: freeze original kids, add is_done flag ───
  for (const day of pastDays) {
    const original = savedDays[day] || [];
    days[day] = original.map(k => ({
      id: k.id,
      name: k.name,
      photo_url: k.photo_url,
      is_k_bound: k.is_k_bound,
      days_since_last_visit: k.days_since_last_visit,
      is_done: doneSet.has(k.id),
    }));
  }

  // ─── LIVE: redistribute undone pool across [today, ...future] ───
  // Pool = roster minus done. We don't care what saved schedule says for
  // live days — undone kids ALL need a slot somewhere in the live window.
  const pool = roster.filter(k => !doneSet.has(k.id));

  // Sort: K-bound first, then most-days-since-English first, then alpha.
  pool.sort((a, b) => {
    const aK = kBoundSet.has(a.id);
    const bK = kBoundSet.has(b.id);
    if (aK !== bK) return aK ? -1 : 1;
    const aDays = daysSinceLastEnglish.get(a.id);
    const bDays = daysSinceLastEnglish.get(b.id);
    if (aDays === null && bDays !== null && bDays !== undefined) return -1; // never-visited first
    if (bDays === null && aDays !== null && aDays !== undefined) return 1;
    if (aDays === null && bDays === null) return a.name.localeCompare(b.name);
    return (bDays ?? 0) - (aDays ?? 0);
  });

  // Round-robin distribute across live days, 6/day cap.
  const SLOTS_PER_DAY = 6;
  const liveAssignment: Record<string, ScheduleChildLive[]> = {};
  for (const d of liveDays) liveAssignment[d] = [];

  // Where to mark "rolled from" — for each pool kid, find the past day they
  // were originally scheduled (if any). That flags them visually as rolled.
  const originalDayByChildId = new Map<string, WeekDay>();
  for (const day of DAY_ORDER_LIVE) {
    const original = savedDays[day] || [];
    for (const k of original) {
      if (!originalDayByChildId.has(k.id)) {
        originalDayByChildId.set(k.id, day);
      }
    }
  }

  let dayIdx = 0;
  for (const kid of pool) {
    if (liveDays.length === 0) break; // weekend — nothing to schedule

    // Advance dayIdx until we find a day with room
    let attempts = 0;
    while (
      liveAssignment[liveDays[dayIdx % liveDays.length]].length >= SLOTS_PER_DAY
      && attempts < liveDays.length
    ) {
      dayIdx += 1;
      attempts += 1;
    }
    if (attempts >= liveDays.length) break; // all live days full

    const targetDay = liveDays[dayIdx % liveDays.length];
    const orig = originalDayByChildId.get(kid.id);
    liveAssignment[targetDay].push({
      id: kid.id,
      name: kid.name,
      photo_url: kid.photo_url,
      is_k_bound: kBoundSet.has(kid.id),
      days_since_last_visit: daysSinceLastEnglish.get(kid.id) ?? null,
      is_done: false,
      // Mark rolled if their original day was BEFORE today.
      ...(orig && pastDays.includes(orig) ? { rolled_from_day: orig } : {}),
    });

    // Bump dayIdx if this day is now full, so the next kid lands elsewhere
    if (liveAssignment[targetDay].length >= SLOTS_PER_DAY) dayIdx += 1;
  }

  for (const d of liveDays) days[d] = liveAssignment[d];

  // ─── Shortfall: undone kids who didn't fit in any live day ───
  const scheduledInLive = new Set<string>();
  for (const d of liveDays) {
    for (const k of liveAssignment[d]) scheduledInLive.add(k.id);
  }
  const unscheduled = pool.filter(k => !scheduledInLive.has(k.id));

  const meta: LiveStateMeta = {
    today,
    is_workday: today !== null,
    done_count: doneSet.size,
    undone_count: pool.length,
    total_in_class: roster.length,
    unscheduled_undone_names: unscheduled.map(k => k.name),
    shortfall_warning: unscheduled.length > 0
      ? `${unscheduled.length} child${unscheduled.length === 1 ? '' : 'ren'} cannot be fit in the remaining bingo slots this week`
      : null,
  };

  return { days, meta };
}

async function generateSchedule(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  weekStart: Date,
) {
  // 1. Get all active children
  const { data: rawChildren } = await supabase
    .from('montree_children')
    .select('id, name, photo_url')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name');

  const children = (rawChildren || []) as Array<{ id: string; name: string; photo_url: string | null }>;
  if (children.length === 0) return { days: {}, children_count: 0 };

  // 2. Get language area ID
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();

  // 3. Get language work IDs
  let langWorkIds = new Set<string>();
  if (langArea) {
    const { data: langWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('area_id', (langArea as any).id);

    langWorkIds = new Set(((langWorks || []) as Array<{ id: string }>).map(w => w.id));
  }

  // 4. Look back 14 days for English visit history
  const lookbackStart = new Date(weekStart);
  lookbackStart.setDate(lookbackStart.getDate() - 14);

  const childIds = children.map(c => c.id);
  const { data: rawRecentMedia } = await supabase
    .from('montree_media')
    .select('child_id, work_id, captured_at')
    .eq('classroom_id', classroomId)
    .in('child_id', childIds)
    .gte('captured_at', lookbackStart.toISOString())
    .not('work_id', 'is', null)
    .or('identification_status.is.null,identification_status.neq.pending_review');

  const recentMedia = (rawRecentMedia || []) as Array<{ child_id: string; work_id: string; captured_at: string }>;

  // Also check group photos
  const { data: rawGroupLinks } = await supabase
    .from('montree_media_children')
    .select('child_id, media_id')
    .in('child_id', childIds);

  const groupLinks = (rawGroupLinks || []) as Array<{ child_id: string; media_id: string }>;

  let groupMediaMap = new Map<string, { work_id: string; captured_at: string }>();
  if (groupLinks.length > 0) {
    const groupMediaIds = [...new Set(groupLinks.map(l => l.media_id))];
    const { data: groupMedia } = await supabase
      .from('montree_media')
      .select('id, work_id, captured_at')
      .in('id', groupMediaIds)
      .gte('captured_at', lookbackStart.toISOString())
      .not('work_id', 'is', null)
      .or('identification_status.is.null,identification_status.neq.pending_review');

    for (const gm of ((groupMedia || []) as Array<{ id: string; work_id: string; captured_at: string }>)) {
      groupMediaMap.set(gm.id, { work_id: gm.work_id, captured_at: gm.captured_at });
    }
  }

  // 5. Build per-child language activity stats
  const now = new Date();
  const childActivity: ChildActivity[] = children.map((child) => {
    const visits: Date[] = [];

    // Direct photos
    for (const m of recentMedia) {
      if (m.child_id === child.id && langWorkIds.has(m.work_id)) {
        visits.push(new Date(m.captured_at));
      }
    }

    // Group photos
    for (const link of groupLinks) {
      if (link.child_id === child.id) {
        const gm = groupMediaMap.get(link.media_id);
        if (gm && langWorkIds.has(gm.work_id)) {
          visits.push(new Date(gm.captured_at));
        }
      }
    }

    const lastVisit = visits.length > 0
      ? visits.sort((a, b) => b.getTime() - a.getTime())[0]
      : null;

    return {
      id: child.id,
      name: child.name,
      photo_url: child.photo_url,
      is_k_bound: K_BOUND_NAMES.has(child.name.toLowerCase()),
      language_visit_count: visits.length,
      days_since_last_visit: lastVisit
        ? Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      last_visit_date: lastVisit ? lastVisit.toISOString() : null,
    };
  });

  // 6. Sort: K-bound first, then by most neglected (null = never visited → top)
  childActivity.sort((a, b) => {
    // K-bound first
    if (a.is_k_bound && !b.is_k_bound) return -1;
    if (!a.is_k_bound && b.is_k_bound) return 1;

    // Within same group: never-visited first
    if (a.days_since_last_visit === null && b.days_since_last_visit !== null) return -1;
    if (a.days_since_last_visit !== null && b.days_since_last_visit === null) return 1;

    // Both null (never visited) — alphabetical
    if (a.days_since_last_visit === null && b.days_since_last_visit === null) {
      return a.name.localeCompare(b.name);
    }

    // Most days since last visit first
    return (b.days_since_last_visit || 0) - (a.days_since_last_visit || 0);
  });

  // 7. Assign 6 per day round-robin
  const days: Record<string, Array<{
    id: string;
    name: string;
    photo_url: string | null;
    is_k_bound: boolean;
    days_since_last_visit: number | null;
  }>> = {};

  for (const day of DAYS) {
    days[day] = [];
  }

  let dayIndex = 0;
  for (const child of childActivity) {
    const day = DAYS[dayIndex % DAYS.length];
    days[day].push({
      id: child.id,
      name: child.name,
      photo_url: child.photo_url,
      is_k_bound: child.is_k_bound,
      days_since_last_visit: child.days_since_last_visit,
    });

    // Move to next day when current day has 6
    if (days[day].length >= 6) {
      dayIndex++;
    }
  }

  return {
    days,
    children_count: children.length,
    k_bound_count: childActivity.filter(c => c.is_k_bound).length,
    week_label: `${weekStart.toISOString().split('T')[0]}`,
  };
}

/**
 * Standalone function for calling from Weekly Wrap pipeline.
 * Generates and saves the English schedule for next week.
 */
export async function generateAndSaveEnglishSchedule(
  classroomId: string,
  schoolId: string,
) {
  const supabase = getSupabase();

  // Generate for NEXT week (the week the new plans apply to)
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? 1 : 8 - day; // next Monday
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + offset);
  nextMonday.setHours(0, 0, 0, 0);

  const schedule = await generateSchedule(supabase, classroomId, nextMonday);
  const weekStartStr = nextMonday.toISOString().split('T')[0];

  await (supabase as any)
    .from('montree_english_schedule')
    .upsert({
      classroom_id: classroomId,
      school_id: schoolId,
      week_start: weekStartStr,
      schedule,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'classroom_id,week_start' });

  console.log(`[EnglishSchedule] Generated for ${weekStartStr}: ${schedule.children_count} children across 5 days`);
  return { week_start: weekStartStr, schedule };
}
