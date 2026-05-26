// lib/montree/calendar/adapters/observations.ts
// Calendar Plan §4 — adapter for `montree_media` (confirmed photo
// observations). Each confirmed photo with a work attached is a point event
// at `captured_at` — the calendar groups them into per-day batches at the
// UI layer.
//
// Caps at 500 per window to keep the prompt cheap; in practice a single
// month's confirmed photos per classroom is well under that.

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface MediaRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  captured_at: string;
  work_id: string | null;
  caption: string | null;
}

export const observationsAdapter: CalendarAdapter = async (window, scope) => {
  // Parents do NOT see the raw observation stream — the weekly report is the
  // canonical parent-facing surface.
  if (scope.role === 'parent') return [];

  const supabase = getSupabase();
  const fromIso = window.fromInstant.toISOString();
  const toIso = window.toInstant.toISOString();

  let q = supabase
    .from('montree_media')
    .select('id, school_id, classroom_id, child_id, captured_at, work_id, caption')
    .eq('school_id', scope.schoolId)
    .eq('media_type', 'photo')
    .eq('teacher_confirmed', true)
    .gte('captured_at', fromIso)
    .lt('captured_at', toIso)
    .order('captured_at', { ascending: true })
    .limit(500);

  if (scope.role === 'teacher' && scope.classroomId) {
    q = q.eq('classroom_id', scope.classroomId);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarObservations] error', error);
    return [];
  }

  const rows = (data || []) as MediaRow[];

  // Hydrate child + work names.
  const childIds = Array.from(new Set(rows.map((r) => r.child_id).filter(Boolean) as string[]));
  const workIds = Array.from(new Set(rows.map((r) => r.work_id).filter(Boolean) as string[]));
  const [kidsRes, worksRes] = await Promise.all([
    childIds.length
      ? supabase.from('montree_children').select('id, name').in('id', childIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    workIds.length
      ? supabase.from('montree_classroom_curriculum_works').select('id, name').in('id', workIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const childName = new Map<string, string>();
  for (const k of (kidsRes.data || []) as Array<{ id: string; name: string }>) {
    childName.set(k.id, k.name);
  }
  const workName = new Map<string, string>();
  for (const w of (worksRes.data || []) as Array<{ id: string; name: string }>) {
    workName.set(w.id, w.name);
  }

  return rows.map<CalendarEvent>((r) => {
    const name = r.child_id ? childName.get(r.child_id) || 'Child' : 'Group';
    const work = r.work_id ? workName.get(r.work_id) : null;
    const title = work ? `${name} · ${work}` : name;
    return {
      id: `observation:${r.id}`,
      source: 'observation',
      kind: 'point',
      start: r.captured_at,
      end: null,
      all_day: false,
      title,
      detail: r.caption ? r.caption.slice(0, 120) : null,
      status: 'done',
      link: r.child_id ? `/montree/dashboard/${r.child_id}` : `/montree/dashboard/photo-audit`,
      icon: '📷',
      accent: '#34d399',
      school_id: r.school_id,
      classroom_id: r.classroom_id,
      child_id: r.child_id,
      visibility: 'classroom',
    };
  });
};
