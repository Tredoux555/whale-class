// lib/montree/calendar/adapters/school-events.ts
// Calendar Plan §4 — adapter for `montree_school_events` (migration 218).
//
// School-wide or classroom-scoped events posted by staff. Drafts are hidden
// from parents (is_published = true filter). Cancelled events still appear
// but with status='cancelled' so the UI can strike-through.

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter } from '../types';

interface EventRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  is_published: boolean;
  cancelled_at: string | null;
}

export const schoolEventsAdapter: CalendarAdapter = async (window, scope) => {
  const supabase = getSupabase();
  const fromIso = window.fromInstant.toISOString();
  const toIso = window.toInstant.toISOString();

  let q = supabase
    .from('montree_school_events')
    .select(
      'id, school_id, classroom_id, title, description, start_at, end_at, location, is_published, cancelled_at',
    )
    .eq('school_id', scope.schoolId)
    .gte('start_at', fromIso)
    .lt('start_at', toIso)
    .order('start_at', { ascending: true })
    .limit(500);

  // Parents only see published events.
  if (scope.role === 'parent') {
    q = q.eq('is_published', true);
  }

  // Classroom scoping — parents see school-wide + their child's classroom;
  // teachers see school-wide + their classroom.
  if (scope.role === 'parent' || (scope.role === 'teacher' && scope.classroomId)) {
    const cid = scope.classroomId;
    if (cid) {
      q = q.or(`classroom_id.is.null,classroom_id.eq.${cid}`);
    } else if (scope.role === 'parent') {
      // Parent without resolved classroom — show school-wide only.
      q = q.is('classroom_id', null);
    }
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarSchoolEvents] error', error);
    return [];
  }

  const rows = (data || []) as EventRow[];
  return rows.map((r) => {
    const cancelled = Boolean(r.cancelled_at);
    return {
      id: `event:${r.id}`,
      source: 'school_event',
      kind: 'span',
      start: r.start_at,
      end: r.end_at,
      all_day: false,
      title: r.title.slice(0, 80),
      detail: r.location || (r.description ? r.description.slice(0, 120) : null),
      status: cancelled ? 'cancelled' : 'planned',
      link:
        scope.role === 'parent'
          ? `/montree/parent/events`
          : `/montree/admin/events`,
      icon: '📅',
      // Session 129 — palette aligned with calendar dot system (blue = event).
      // Was gold #E8C96A; gold reads better as a highlight than as the
      // per-event dot color (which needs source-distinctive variety).
      accent: '#60a5fa',
      school_id: r.school_id,
      classroom_id: r.classroom_id,
      child_id: null,
      visibility: r.classroom_id ? 'classroom' : 'school',
    };
  });
};
