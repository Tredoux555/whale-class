// app/api/montree/dashboard/english-schedule/route.ts
// Generates a weekly English schedule: 6 children per day, Mon-Fri.
// Priority: (1) K-bound children first, (2) within each group, children with
// fewest recent English/Language visits go first.
// Also supports saving a generated schedule and retrieving the saved one.

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
      const s = saved as any;
      return NextResponse.json({
        success: true,
        schedule: s.schedule,
        week_start: s.week_start,
        generated_at: s.generated_at,
        source: 'saved',
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

  return NextResponse.json({
    success: true,
    schedule,
    week_start: weekStartStr,
    generated_at: new Date().toISOString(),
    source: 'generated',
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

  return NextResponse.json({
    success: true,
    schedule,
    week_start: weekStartStr,
    generated_at: new Date().toISOString(),
    source: 'generated',
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
