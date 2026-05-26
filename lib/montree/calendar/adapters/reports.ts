// lib/montree/calendar/adapters/reports.ts
// Calendar Plan §4 — adapter for `montree_weekly_reports`.
//
// One calendar entry per child per week per report_type. Parent sees the
// PARENT report only (the teacher draft is never surfaced to families).
// Status drives `done` / `planned` / `cancelled`.

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter, CalendarEvent, CalendarStatus } from '../types';

interface ReportRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;
  report_type: 'teacher' | 'parent';
  status: 'draft' | 'pending_review' | 'approved' | 'sent';
  sent_at: string | null;
  generated_at: string | null;
}

function statusToCalendar(s: ReportRow['status']): CalendarStatus {
  switch (s) {
    case 'sent':
      return 'done';
    case 'approved':
    case 'pending_review':
    case 'draft':
      return 'planned';
    default:
      return 'planned';
  }
}

export const reportsAdapter: CalendarAdapter = async (window, scope) => {
  const supabase = getSupabase();

  // We filter by week_start, which is a DATE (no tz). Compare against the
  // window's YYYY-MM-DD bounds directly — adequate for week-level placement.
  let q = supabase
    .from('montree_weekly_reports')
    .select(
      'id, school_id, classroom_id, child_id, week_start, week_end, report_type, status, sent_at, generated_at',
    )
    .eq('school_id', scope.schoolId)
    .gte('week_start', window.from)
    .lte('week_start', window.to)
    .order('week_start', { ascending: true })
    .limit(500);

  if (scope.role === 'parent') {
    if (scope.childIds.length === 0) return [];
    q = q.eq('report_type', 'parent').in('child_id', scope.childIds);
  } else if (scope.role === 'teacher' && scope.classroomId) {
    q = q.eq('classroom_id', scope.classroomId);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarReports] error', error);
    return [];
  }

  const rows = (data || []) as ReportRow[];
  // Resolve child names in a single batch for the title.
  const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
  const childNames = new Map<string, string>();
  if (childIds.length > 0) {
    const { data: kids } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);
    for (const k of (kids || []) as Array<{ id: string; name: string }>) {
      childNames.set(k.id, k.name);
    }
  }

  return rows.map<CalendarEvent>((r) => {
    const name = childNames.get(r.child_id) || 'Child';
    const isParent = r.report_type === 'parent';
    const title =
      r.status === 'sent'
        ? `${name}'s weekly report sent`
        : `${name}'s weekly report${isParent ? '' : ' (teacher draft)'}`;
    return {
      id: `report:${r.id}`,
      source: 'report',
      kind: 'allday',
      // The report is dated to the END of the week it covers.
      start: `${r.week_end}T00:00:00.000Z`,
      end: null,
      all_day: true,
      title,
      detail:
        r.status === 'sent' && r.sent_at
          ? `Sent ${new Date(r.sent_at).toLocaleDateString()}`
          : 'Weekly wrap-up',
      status: statusToCalendar(r.status),
      link:
        scope.role === 'parent'
          ? `/montree/parent/report/${r.id}`
          : `/montree/dashboard/weekly-wrap?week=${r.week_start}`,
      icon: '📝',
      accent: '#9bd5b0',
      school_id: r.school_id,
      classroom_id: r.classroom_id,
      child_id: r.child_id,
      visibility: isParent ? 'child' : 'classroom',
    };
  });
};
