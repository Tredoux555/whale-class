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
import {
  getSchoolTimezone,
  currentWeekdayInTz,
  weekdayInTz,
  tzOffsetMs,
} from '@/lib/montree/school-time';

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
  tz: string,
): Promise<{
  days: LiveScheduleDays;
  meta: LiveStateMeta;
  children_count: number;
  k_bound_count: number;
  done_this_week: Array<{ id: string; name: string; photo_url: string | null; day: string | null }>;
  activity_tracker: Array<{ id: string; name: string; photo_url: string | null; sessions_4w: number; sessions_all: number }>;
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
  const { doneSet, doneDayByChild } = await loadDoneChildInfo(supabase, classroomId, weekStart, rosterIds, tz);
  const activityCounts = await loadEnglishActivityCounts(supabase, classroomId, rosterIds);
  const today = getCurrentWeekDay(tz);

  const { days, meta } = applyLiveState(
    roster,
    kBoundSet,
    daysSinceLastEnglish,
    doneSet,
    doneDayByChild,
    today,
  );

  // "Done this week" panel — children who did English + the weekday each
  // first did it, ordered Monday→Sunday then by name.
  const DONE_DAY_RANK: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
  };
  const done_this_week = roster
    .filter(k => doneSet.has(k.id))
    .map(k => ({
      id: k.id,
      name: k.name,
      photo_url: k.photo_url,
      day: doneDayByChild.get(k.id) || null,
    }))
    .sort((a, b) => {
      const ra = a.day ? (DONE_DAY_RANK[a.day] ?? 99) : 99;
      const rb = b.day ? (DONE_DAY_RANK[b.day] ?? 99) : 99;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

  // Activity tracker — every roster child's English-session counts. The UI
  // sorts/ranks; the server just supplies the raw numbers for both windows.
  const activity_tracker = roster.map(k => ({
    id: k.id,
    name: k.name,
    photo_url: k.photo_url,
    sessions_4w: activityCounts.get(k.id)?.sessions4w ?? 0,
    sessions_all: activityCounts.get(k.id)?.sessionsAll ?? 0,
  }));

  return {
    days,
    meta,
    children_count: roster.length,
    k_bound_count: kBoundSet.size,
    done_this_week,
    activity_tracker,
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
  // School-local time — everything below resolves day/week against THIS tz.
  const tz = await getSchoolTimezone(schoolId);

  // Determine week boundaries
  const weekStartParam = request.nextUrl.searchParams.get('week_start');
  const weekStart = getWeekStart(weekStartParam, tz);
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
        supabase, classroomId, weekStart, s.schedule, tz,
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
        done_this_week: enriched.done_this_week,
        activity_tracker: enriched.activity_tracker,
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
    supabase, classroomId, weekStart, schedule, tz,
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
    done_this_week: enrichedFresh.done_this_week,
    activity_tracker: enrichedFresh.activity_tracker,
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
  const tz = await getSchoolTimezone(schoolId);
  const body = await request.json().catch(() => ({}));
  const weekStartParam = body.week_start || null;
  const weekStart = getWeekStart(weekStartParam, tz);

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
    supabase, classroomId, weekStart, schedule, tz,
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
    done_this_week: enriched.done_this_week,
    activity_tracker: enriched.activity_tracker,
    week_start: weekStartStr,
    generated_at: new Date().toISOString(),
    source: 'generated+live',
  }, { headers: { 'Cache-Control': 'no-store' } });
}


// ─── Helpers ───

// 🚨 Timezone — Calendar Plan §7a. The Railway server is UTC; the school is
// not. All day/week/weekday computation routes through lib/montree/school-time
// which reads montree_schools.timezone (defaults to signup_timezone, then
// UTC). The route resolves the school's tz once and threads it down.
//
// Returns a Date at UTC-midnight of the school-week's Monday calendar date.
// `.toISOString().split('T')[0]` then yields the school-Monday date string
// (used as the DB key + label). loadDoneChildInfo shifts off this Date's
// tz-offset when it needs the true school-Monday-midnight instant for
// captured_at filtering.
function getWeekStart(param: string | null, tz: string): Date {
  if (param) {
    const d = new Date(param + 'T00:00:00Z');
    if (!isNaN(d.getTime())) return d;
  }
  // "Now" in school-local time — read .getUTC* off it for school-local values.
  const shifted = new Date(Date.now() + tzOffsetMs(tz));
  const day = shifted.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + offset,
  ));
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

// (Historical WEEKDAY_NAMES const removed — weekday derivation now flows
// through weekdayInTz / currentWeekdayInTz from lib/montree/school-time.)

/**
 * Resolve the Language-area work IDs for a classroom. Shared by the
 * done-this-week and activity-tracker queries so both use the exact same
 * "what counts as English" definition (area_key='language').
 */
async function resolveLanguageWorkIds(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
): Promise<string[]> {
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();
  if (!langArea) return [];
  const { data: langWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_id', (langArea as { id: string }).id);
  return ((langWorks || []) as Array<{ id: string }>).map(w => w.id);
}

/**
 * Children with a confirmed Language photo THIS WEEK, plus the weekday each
 * one FIRST did English this week (powers the "Done this week" panel).
 * Mirrors the Session 119 english-missing logic exactly:
 *   - area_key='language' (NOT work-name inference)
 *   - teacher_confirmed=true (NOT identification_status)
 *   - includes group photos via montree_media_children junction
 */
async function loadDoneChildInfo(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  weekStart: Date,
  rosterIds: string[],
  tz: string,
): Promise<{ doneSet: Set<string>; doneDayByChild: Map<string, string> }> {
  const empty = { doneSet: new Set<string>(), doneDayByChild: new Map<string, string>() };
  // weekStart is UTC-midnight of the school-Monday date; the true school
  // week window is that minus the tz offset AT THAT INSTANT (so DST is
  // honoured), spanning 7 days. Filtering on the real school-week boundary
  // so an early-morning English session counts.
  const startMs = weekStart.getTime() - tzOffsetMs(tz, weekStart);
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(startMs + 7 * 24 * 60 * 60 * 1000).toISOString();

  const langWorkIds = await resolveLanguageWorkIds(supabase, classroomId);
  if (langWorkIds.length === 0 || rosterIds.length === 0) return empty;

  const doneSet = new Set<string>();
  const earliestByChild = new Map<string, number>(); // childId -> earliest ms this week
  const note = (childId: string, capturedAt: string) => {
    doneSet.add(childId);
    const ts = new Date(capturedAt).getTime();
    if (Number.isNaN(ts)) return;
    const prev = earliestByChild.get(childId);
    if (prev === undefined || ts < prev) earliestByChild.set(childId, ts);
  };

  // Direct photos — filter by roster too (mirrors english-missing pattern)
  const { data: directRaw } = await supabase
    .from('montree_media')
    .select('child_id, captured_at')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('child_id', rosterIds)
    .in('work_id', langWorkIds)
    .gte('captured_at', startIso)
    .lt('captured_at', endIso);
  for (const row of (directRaw || []) as Array<{ child_id: string | null; captured_at: string }>) {
    if (row.child_id) note(row.child_id, row.captured_at);
  }

  // Group photos via junction — also filter by roster on the junction read
  // (Session 119 audit finding #2: prevents a junction row for a child from
  // another classroom surfacing here).
  const { data: candidateMediaRaw } = await supabase
    .from('montree_media')
    .select('id, captured_at')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('work_id', langWorkIds)
    .gte('captured_at', startIso)
    .lt('captured_at', endIso);
  const candidateMedia = ((candidateMediaRaw || []) as Array<{ id: string; captured_at: string }>);
  if (candidateMedia.length > 0) {
    const capturedById = new Map(candidateMedia.map(m => [m.id, m.captured_at]));
    const { data: junctionRaw } = await supabase
      .from('montree_media_children')
      .select('child_id, media_id')
      .in('media_id', candidateMedia.map(m => m.id))
      .in('child_id', rosterIds);
    for (const row of (junctionRaw || []) as Array<{ child_id: string | null; media_id: string }>) {
      if (!row.child_id) continue;
      const cap = capturedById.get(row.media_id);
      if (cap) note(row.child_id, cap);
    }
  }

  // The weekday each child FIRST did English this week — derived in school
  // time so an early-morning session doesn't get tagged as the day before.
  const doneDayByChild = new Map<string, string>();
  for (const [childId, ts] of earliestByChild) {
    doneDayByChild.set(childId, weekdayInTz(ts, tz));
  }
  return { doneSet, doneDayByChild };
}

/**
 * Per-child English-session counts — confirmed Language photos in the last
 * 28 days and all-time. Powers the most/least activity tracker.
 * Dedups on (childId, mediaId) so a photo that is both a direct hit and a
 * junction hit for the same child counts once.
 */
async function loadEnglishActivityCounts(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  rosterIds: string[],
): Promise<Map<string, { sessions4w: number; sessionsAll: number }>> {
  const counts = new Map<string, { sessions4w: number; sessionsAll: number }>();
  for (const id of rosterIds) counts.set(id, { sessions4w: 0, sessionsAll: 0 });
  if (rosterIds.length === 0) return counts;

  const langWorkIds = await resolveLanguageWorkIds(supabase, classroomId);
  if (langWorkIds.length === 0) return counts;

  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const seen = new Set<string>(); // `${childId}:${mediaId}`
  const tally = (childId: string, mediaId: string, capturedAt: string) => {
    const c = counts.get(childId);
    if (!c) return;
    const key = `${childId}:${mediaId}`;
    if (seen.has(key)) return;
    seen.add(key);
    c.sessionsAll += 1;
    const ts = new Date(capturedAt).getTime();
    if (!Number.isNaN(ts) && ts >= fourWeeksAgo) c.sessions4w += 1;
  };

  // Direct photos — all-time
  const { data: directRaw } = await supabase
    .from('montree_media')
    .select('id, child_id, captured_at')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('child_id', rosterIds)
    .in('work_id', langWorkIds);
  for (const row of (directRaw || []) as Array<{ id: string; child_id: string | null; captured_at: string }>) {
    if (row.child_id) tally(row.child_id, row.id, row.captured_at);
  }

  // Group photos via junction — all-time
  const { data: candidateRaw } = await supabase
    .from('montree_media')
    .select('id, captured_at')
    .eq('classroom_id', classroomId)
    .eq('teacher_confirmed', true)
    .in('work_id', langWorkIds);
  const candidates = ((candidateRaw || []) as Array<{ id: string; captured_at: string }>);
  if (candidates.length > 0) {
    const capturedById = new Map(candidates.map(m => [m.id, m.captured_at]));
    const { data: junctionRaw } = await supabase
      .from('montree_media_children')
      .select('child_id, media_id')
      .in('media_id', candidates.map(m => m.id))
      .in('child_id', rosterIds);
    for (const row of (junctionRaw || []) as Array<{ child_id: string | null; media_id: string }>) {
      if (!row.child_id) continue;
      const cap = capturedById.get(row.media_id);
      if (cap) tally(row.child_id, row.media_id, cap);
    }
  }

  return counts;
}

/**
 * Return the current weekday as 'monday'|...|'friday', or null on weekends.
 * Computed in the school's timezone (Calendar Plan §7a).
 */
function getCurrentWeekDay(tz: string): WeekDay | null {
  const name = currentWeekdayInTz(tz);
  if (!name) return null;
  // currentWeekdayInTz already returns only monday..friday | null; this is
  // a safe cast back into the route's WeekDay alias.
  return name as WeekDay;
}

/**
 * Build the week grid from live state — the photo system is the source of
 * truth, no saved snapshot needed.
 *
 * DONE children are placed on the weekday they ACTUALLY did English (the
 * first confirmed Language photo this week) with a ticked box. UNDONE
 * children fill the upcoming plan — distributed across today→Friday (the
 * whole week on a weekend), K-bound first then most-neglected, ~6 per day.
 *
 * So the grid doubles as a record (who's ticked off, and on which day) and
 * a plan (who still needs bingo, on which day).
 */
function applyLiveState(
  roster: Array<{ id: string; name: string; photo_url: string | null }>,
  kBoundSet: Set<string>,
  daysSinceLastEnglish: Map<string, number | null>,
  doneSet: Set<string>,
  doneDayByChild: Map<string, string>,
  today: WeekDay | null,
): { days: LiveScheduleDays; meta: LiveStateMeta } {
  const days: LiveScheduleDays = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [],
  };

  // ─── DONE children → the weekday they actually did English, ticked. ───
  // A weekend / unknown completion day falls back to Monday so the child
  // still appears on the grid (they're also in the Done-this-week panel).
  for (const kid of roster) {
    if (!doneSet.has(kid.id)) continue;
    const raw = doneDayByChild.get(kid.id);
    const day: WeekDay = raw && (DAY_ORDER_LIVE as readonly string[]).includes(raw)
      ? (raw as WeekDay)
      : 'monday';
    days[day].push({
      id: kid.id,
      name: kid.name,
      photo_url: kid.photo_url,
      is_k_bound: kBoundSet.has(kid.id),
      days_since_last_visit: daysSinceLastEnglish.get(kid.id) ?? null,
      is_done: true,
    });
  }

  // ─── UNDONE children → the upcoming plan. ───
  const pool = roster.filter(k => !doneSet.has(k.id));
  // K-bound first, then most-days-since-English, then alphabetical.
  pool.sort((a, b) => {
    const aK = kBoundSet.has(a.id);
    const bK = kBoundSet.has(b.id);
    if (aK !== bK) return aK ? -1 : 1;
    const aDays = daysSinceLastEnglish.get(a.id);
    const bDays = daysSinceLastEnglish.get(b.id);
    if (aDays == null && bDays != null) return -1; // never-visited first
    if (bDays == null && aDays != null) return 1;
    if (aDays == null && bDays == null) return a.name.localeCompare(b.name);
    return (bDays ?? 0) - (aDays ?? 0);
  });

  // Plan window — today→Friday. On a weekend, plan the whole week ahead.
  const todayIdx = today === null ? 0 : DAY_ORDER_LIVE.indexOf(today);
  const planDays = DAY_ORDER_LIVE.slice(todayIdx);
  const SLOTS_PER_DAY = 6;

  let dayIdx = 0;
  for (const kid of pool) {
    if (planDays.length === 0) break;
    // Advance to a plan day with room — done children already on that day
    // count toward the 6 (they're English sessions for that day too).
    let attempts = 0;
    while (
      days[planDays[dayIdx % planDays.length]].length >= SLOTS_PER_DAY
      && attempts < planDays.length
    ) {
      dayIdx += 1;
      attempts += 1;
    }
    if (attempts >= planDays.length) break; // every plan day is full
    const targetDay = planDays[dayIdx % planDays.length];
    days[targetDay].push({
      id: kid.id,
      name: kid.name,
      photo_url: kid.photo_url,
      is_k_bound: kBoundSet.has(kid.id),
      days_since_last_visit: daysSinceLastEnglish.get(kid.id) ?? null,
      is_done: false,
    });
    if (days[targetDay].length >= SLOTS_PER_DAY) dayIdx += 1;
  }

  // Within each day: done (ticked) children first, then the planned ones.
  for (const d of DAY_ORDER_LIVE) {
    days[d].sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  // ─── Shortfall — undone kids who didn't fit any plan day this week. ───
  const planned = new Set<string>();
  for (const d of planDays) {
    for (const k of days[d]) if (!k.is_done) planned.add(k.id);
  }
  const unscheduled = pool.filter(k => !planned.has(k.id));

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
  const tz = await getSchoolTimezone(schoolId);

  // Generate for NEXT week (the week the new plans apply to). "Next" is
  // measured in the school's local time, not the UTC server's.
  const shifted = new Date(Date.now() + tzOffsetMs(tz));
  const day = shifted.getUTCDay();
  const offset = day === 0 ? 1 : 8 - day; // next Monday in school-local terms
  const nextMonday = new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + offset,
  ));

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
