// lib/montree/calendar/adapters/english-schedule.ts
// Calendar Plan §4 — adapter for `montree_english_schedule`.
//
// One row per (classroom, week_start) with a JSONB `schedule.days[]` array:
//   [{ day: 'YYYY-MM-DD', weekday: 'monday', child_ids: [...] }, ...]
//
// We expand each day with at least one scheduled child into a calendar event
// at the school-tz midnight of that day. Detail = "N children scheduled".
// Teachers tap → the English Schedule tab.

import { getSupabase } from '@/lib/supabase-client';
import { localDateInTzToUtcInstant } from '@/lib/montree/school-time';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface ScheduleRow {
  id: string;
  school_id: string;
  classroom_id: string;
  week_start: string;
  schedule: {
    days?: Array<{ day: string; weekday: string; child_ids?: string[] }>;
  } | null;
}

export const englishScheduleAdapter: CalendarAdapter = async (window, scope) => {
  // Parents do not see internal staff plans.
  if (scope.role === 'parent') return [];

  const supabase = getSupabase();

  // Widen the SQL filter by 7 days on the left so we catch a week whose
  // Monday sits BEFORE window.from but whose Tue–Sun still fall inside the
  // window. We re-filter expanded days against window.from / window.to below
  // so nothing outside the window leaks in.
  const widenedFrom = (() => {
    const d = new Date(`${window.from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  let q = supabase
    .from('montree_english_schedule')
    .select('id, school_id, classroom_id, week_start, schedule')
    .eq('school_id', scope.schoolId)
    .gte('week_start', widenedFrom)
    .lte('week_start', window.to)
    .order('week_start', { ascending: true })
    .limit(30);

  if (scope.classroomId) {
    q = q.eq('classroom_id', scope.classroomId);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarEnglishSchedule] error', error);
    return [];
  }

  const rows = (data || []) as ScheduleRow[];
  const events: CalendarEvent[] = [];

  for (const row of rows) {
    const days = row.schedule?.days || [];
    for (const day of days) {
      if (!day.day || !/^\d{4}-\d{2}-\d{2}$/.test(day.day)) continue;
      // Re-filter expanded days against the actual window — a week_start
      // outside the window can still have days inside it, and vice versa.
      if (day.day < window.from || day.day > window.to) continue;
      const n = Array.isArray(day.child_ids) ? day.child_ids.length : 0;
      if (n === 0) continue;
      // Place the event at school-tz midnight of the scheduled date.
      const instant = localDateInTzToUtcInstant(day.day, window.tz);
      events.push({
        id: `english_schedule:${row.id}:${day.day}`,
        source: 'english_schedule',
        kind: 'allday',
        start: instant.toISOString(),
        end: null,
        all_day: true,
        title: `English: ${n} ${n === 1 ? 'child' : 'children'}`,
        detail: 'Scheduled English session',
        status: 'planned',
        link: '/montree/dashboard?tab=english-schedule',
        icon: '📚',
        accent: '#6366f1',
        school_id: row.school_id,
        classroom_id: row.classroom_id,
        child_id: null,
        visibility: 'classroom',
      });
    }
  }

  return events;
};
