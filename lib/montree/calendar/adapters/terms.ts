// lib/montree/calendar/adapters/terms.ts
// Calendar Plan §4 + §7b — academic term boundaries from
// `montree_school_terms` (migration 233). Each term is a span event covering
// start_date → end_date. Surfaces school-wide for every role.

import { getSupabase } from '@/lib/supabase-client';
import { localDateInTzToUtcInstant } from '@/lib/montree/school-time';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface TermRow {
  id: string;
  school_id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
}

export const termsAdapter: CalendarAdapter = async (window, scope) => {
  const supabase = getSupabase();

  // Terms intersecting the window: term.start_date <= window.to AND
  // term.end_date >= window.from.
  const { data, error } = await supabase
    .from('montree_school_terms')
    .select('id, school_id, name, start_date, end_date')
    .eq('school_id', scope.schoolId)
    .lte('start_date', window.to)
    .gte('end_date', window.from)
    .order('start_date', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarTerms] error', error);
    return [];
  }

  const rows = (data || []) as TermRow[];

  return rows.map<CalendarEvent>((r) => {
    const startInstant = localDateInTzToUtcInstant(r.start_date, window.tz);
    // end_date is inclusive in human terms; we represent the span as ending
    // at the START of (end_date + 1) for UI clarity.
    const endPlusOne = new Date(
      Date.UTC(
        Number(r.end_date.slice(0, 4)),
        Number(r.end_date.slice(5, 7)) - 1,
        Number(r.end_date.slice(8, 10)) + 1,
      ),
    )
      .toISOString()
      .slice(0, 10);
    const endInstant = localDateInTzToUtcInstant(endPlusOne, window.tz);
    return {
      id: `term:${r.id}`,
      source: 'term',
      kind: 'span',
      start: startInstant.toISOString(),
      end: endInstant.toISOString(),
      all_day: true,
      title: r.name,
      detail: `${r.start_date} → ${r.end_date}`,
      status: 'info',
      link: '/montree/admin/settings',
      icon: '📘',
      accent: '#a78bfa',
      school_id: r.school_id,
      classroom_id: null,
      child_id: null,
      visibility: 'school',
    };
  });
};
