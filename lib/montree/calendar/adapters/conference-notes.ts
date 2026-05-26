// lib/montree/calendar/adapters/conference-notes.ts
// Calendar Plan §4 — adapter for `montree_conference_notes` (migration 155).
//
// Each note is dated to its `created_at`. Notes with `status='shared'`
// surface to parents (when the calendar is rendered for a parent) using the
// `shared_at` timestamp; drafts and retracted notes stay staff-only.

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface NoteRow {
  id: string;
  school_id: string;
  child_id: string;
  status: 'draft' | 'shared' | 'retracted';
  shared_at: string | null;
  created_at: string;
  note_text: string;
}

export const conferenceNotesAdapter: CalendarAdapter = async (window, scope) => {
  const supabase = getSupabase();
  const fromIso = window.fromInstant.toISOString();
  const toIso = window.toInstant.toISOString();

  let q = supabase
    .from('montree_conference_notes')
    .select('id, school_id, child_id, status, shared_at, created_at, note_text')
    .eq('school_id', scope.schoolId)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .order('created_at', { ascending: true })
    .limit(500);

  if (scope.role === 'parent') {
    if (scope.childIds.length === 0) return [];
    q = q.eq('status', 'shared').in('child_id', scope.childIds);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarConferenceNotes] error', error);
    return [];
  }

  const rows = (data || []) as NoteRow[];
  if (rows.length === 0) return [];

  const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
  const { data: kids } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id')
    .in('id', childIds);
  const childName = new Map<string, string>();
  const childClassroom = new Map<string, string | null>();
  for (const k of (kids || []) as Array<{ id: string; name: string; classroom_id: string | null }>) {
    childName.set(k.id, k.name);
    childClassroom.set(k.id, k.classroom_id);
  }

  return rows.map<CalendarEvent>((r) => {
    const name = childName.get(r.child_id) || 'Child';
    const isShared = r.status === 'shared';
    const startIso = scope.role === 'parent' && r.shared_at ? r.shared_at : r.created_at;
    return {
      id: `conference_note:${r.id}`,
      source: 'conference_note',
      kind: 'point',
      start: startIso,
      end: null,
      all_day: false,
      title: `${name} · Conference note${isShared ? '' : ' (draft)'}`,
      detail: r.note_text.slice(0, 120),
      status: r.status === 'retracted' ? 'cancelled' : 'done',
      link:
        scope.role === 'parent'
          ? `/montree/parent/dashboard`
          : `/montree/dashboard/${r.child_id}`,
      icon: '🗣️',
      // Session 129 — sky blue in the canonical calendar dot palette.
      // (Was orange #fb923c which collided with meeting notes' new orange.)
      accent: '#38bdf8',
      school_id: r.school_id,
      classroom_id: childClassroom.get(r.child_id) || null,
      child_id: r.child_id,
      visibility: isShared ? 'child' : 'staff',
    };
  });
};
