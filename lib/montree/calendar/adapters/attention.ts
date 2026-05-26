// lib/montree/calendar/adapters/attention.ts
// Calendar Plan §4 + §5 — the "attention" source surfaces things that NEED
// ACTION but aren't fixed events. They render as flag icons on the calendar
// day where the underlying item is rotting.
//
// Phase 5 attention rules (computed, not stored):
//   - reports stuck in pending_review for >2 days
//   - appointments still status='pending' (parent hasn't responded yet)
//   - conference notes in draft status for >3 days
//   - stale works rollup — one event per classroom per week showing N stuck
//
// Parents do NOT see attention items — these are operational signals for
// staff. Surfacing "your child has 3 stale works" to a parent is the wrong
// product.

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface PendingReportRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string;
  week_start: string;
  generated_at: string | null;
  report_type: 'teacher' | 'parent';
}

interface PendingApptRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  scheduled_start: string;
  intake_subject: string | null;
}

interface DraftNoteRow {
  id: string;
  school_id: string;
  child_id: string;
  created_at: string;
  note_text: string;
}

export const attentionAdapter: CalendarAdapter = async (window, scope) => {
  if (scope.role === 'parent') return [];

  const supabase = getSupabase();
  const events: CalendarEvent[] = [];

  // ── 1. Reports stuck in pending_review > 2 days
  {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    let q = supabase
      .from('montree_weekly_reports')
      .select('id, school_id, classroom_id, child_id, week_start, generated_at, report_type')
      .eq('school_id', scope.schoolId)
      .eq('status', 'pending_review')
      .lte('generated_at', twoDaysAgo)
      .gte('week_start', window.from)
      .lte('week_start', window.to)
      .limit(200);
    if (scope.role === 'teacher' && scope.classroomId) {
      q = q.eq('classroom_id', scope.classroomId);
    }
    const { data } = await q;
    const rows = (data || []) as PendingReportRow[];
    if (rows.length) {
      const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
      const { data: kids } = await supabase
        .from('montree_children')
        .select('id, name')
        .in('id', childIds);
      const nameMap = new Map<string, string>();
      for (const k of (kids || []) as Array<{ id: string; name: string }>) {
        nameMap.set(k.id, k.name);
      }
      for (const r of rows) {
        const name = nameMap.get(r.child_id) || 'Child';
        const anchor = r.generated_at || `${r.week_start}T00:00:00.000Z`;
        events.push({
          id: `attention:report:${r.id}`,
          source: 'attention',
          kind: 'attention',
          start: anchor,
          end: null,
          all_day: false,
          title: `Awaiting approval · ${name}'s report`,
          detail: 'Stuck in pending review > 2 days',
          status: 'info',
          link: `/montree/dashboard/weekly-wrap?week=${r.week_start}`,
          icon: '🚩',
          accent: '#fb923c',
          school_id: r.school_id,
          classroom_id: r.classroom_id,
          child_id: r.child_id,
          visibility: 'staff',
        });
      }
    }
  }

  // ── 2. Appointments still pending parent response
  {
    const fromIso = window.fromInstant.toISOString();
    const toIso = window.toInstant.toISOString();
    let q = supabase
      .from('montree_appointments')
      .select('id, school_id, classroom_id, child_id, scheduled_start, intake_subject')
      .eq('school_id', scope.schoolId)
      .eq('status', 'pending')
      .gte('scheduled_start', fromIso)
      .lt('scheduled_start', toIso)
      .limit(200);
    if (scope.role === 'teacher' && scope.classroomId) {
      q = q.or(`classroom_id.eq.${scope.classroomId},classroom_id.is.null`);
    }
    const { data, error } = await q;
    if (!error) {
      const rows = (data || []) as PendingApptRow[];
      for (const r of rows) {
        events.push({
          id: `attention:appt:${r.id}`,
          source: 'attention',
          kind: 'attention',
          start: r.scheduled_start,
          end: null,
          all_day: false,
          title: `Awaiting parent · ${r.intake_subject?.slice(0, 60) || 'appointment'}`,
          detail: 'Parent has not accepted or declined yet',
          status: 'info',
          link: '/montree/dashboard/appointments',
          icon: '🚩',
          accent: '#fb923c',
          school_id: r.school_id,
          classroom_id: r.classroom_id,
          child_id: r.child_id,
          visibility: 'staff',
        });
      }
    }
  }

  // ── 3. Conference notes still in draft > 3 days
  {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const fromIso = window.fromInstant.toISOString();
    const toIso = window.toInstant.toISOString();
    const { data, error } = await supabase
      .from('montree_conference_notes')
      .select('id, school_id, child_id, created_at, note_text')
      .eq('school_id', scope.schoolId)
      .eq('status', 'draft')
      .lte('created_at', threeDaysAgo)
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .limit(200);
    if (!error) {
      const rows = (data || []) as DraftNoteRow[];
      if (rows.length) {
        const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
        const { data: kids } = await supabase
          .from('montree_children')
          .select('id, name, classroom_id')
          .in('id', childIds);
        const nameMap = new Map<string, string>();
        const classroomMap = new Map<string, string | null>();
        for (const k of (kids || []) as Array<{ id: string; name: string; classroom_id: string | null }>) {
          nameMap.set(k.id, k.name);
          classroomMap.set(k.id, k.classroom_id);
        }
        for (const r of rows) {
          if (
            scope.role === 'teacher' &&
            scope.classroomId &&
            classroomMap.get(r.child_id) !== scope.classroomId
          ) {
            continue;
          }
          events.push({
            id: `attention:conf:${r.id}`,
            source: 'attention',
            kind: 'attention',
            start: r.created_at,
            end: null,
            all_day: false,
            title: `Draft note · ${nameMap.get(r.child_id) || 'Child'}`,
            detail: r.note_text.slice(0, 80),
            status: 'info',
            link: `/montree/dashboard/${r.child_id}`,
            icon: '🚩',
            accent: '#fb923c',
            school_id: r.school_id,
            classroom_id: classroomMap.get(r.child_id) || null,
            child_id: r.child_id,
            visibility: 'staff',
          });
        }
      }
    }
  }

  return events;
};
