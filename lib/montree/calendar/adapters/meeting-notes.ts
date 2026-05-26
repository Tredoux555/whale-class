// lib/montree/calendar/adapters/meeting-notes.ts
// Calendar Plan §4 — adapter for `montree_meeting_notes` (migration 214).
//
// Each saved meeting note is an all-day calendar event on `meeting_date` (or
// `created_at` if meeting_date null). Staff-only — parents see the summary
// when the teacher flips `parent_visible` AND shares to thread; the calendar
// doesn't duplicate that.

import { getSupabase } from '@/lib/supabase-client';
import { localDateInTzToUtcInstant } from '@/lib/montree/school-time';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface NoteRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  child_name: string | null;
  meeting_date: string | null;
  created_at: string;
  summary: string;
}

export const meetingNotesAdapter: CalendarAdapter = async (window, scope) => {
  if (scope.role === 'parent') return [];

  const supabase = getSupabase();

  // We query by created_at over the window; meeting_date is an optional
  // override that we honor below.
  const fromIso = window.fromInstant.toISOString();
  const toIso = window.toInstant.toISOString();

  let q = supabase
    .from('montree_meeting_notes')
    .select('id, school_id, classroom_id, child_id, child_name, meeting_date, created_at, summary')
    .eq('school_id', scope.schoolId)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .order('created_at', { ascending: true })
    .limit(500);

  if (scope.role === 'teacher' && scope.classroomId) {
    q = q.or(`classroom_id.eq.${scope.classroomId},classroom_id.is.null`);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarMeetingNotes] error', error);
    return [];
  }

  const rows = (data || []) as NoteRow[];
  return rows.map<CalendarEvent>((r) => {
    const dateStr = r.meeting_date || r.created_at.slice(0, 10);
    const instant = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? localDateInTzToUtcInstant(dateStr, window.tz)
      : new Date(r.created_at);
    const childLabel = r.child_name || 'Meeting note';
    return {
      id: `meeting_note:${r.id}`,
      source: 'meeting_note',
      kind: 'allday',
      start: instant.toISOString(),
      end: null,
      all_day: true,
      title: `Meeting · ${childLabel}`,
      detail: r.summary.slice(0, 120),
      status: 'done',
      link: '/montree/dashboard/conversations',
      icon: '🗒️',
      // Session 129 — orange in the canonical calendar dot palette.
      // (Was amber #f59e0b — visually close to gold, didn't distinguish
      // cleanly from school events on the day cell.)
      accent: '#fb923c',
      school_id: r.school_id,
      classroom_id: r.classroom_id,
      child_id: r.child_id,
      visibility: 'staff',
    };
  });
};
