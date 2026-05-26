// lib/montree/calendar/adapters/milestones.ts
// Calendar Plan §4 — adapter for `montree_milestones` (migration 152).
//
// Each milestone row is one transition for a (child, work, type) — e.g.
// "Practicing → Mastered". Surfaces to everyone scoped to the child.

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter, CalendarEvent } from '../types';

interface MilestoneRow {
  id: string;
  school_id: string;
  child_id: string;
  work_id: string;
  milestone_type: 'presented' | 'practicing' | 'ready_for_review' | 'mastered';
  achieved_at: string;
}

const MILESTONE_ICON: Record<MilestoneRow['milestone_type'], string> = {
  presented: '🌱',
  practicing: '🌿',
  ready_for_review: '🌾',
  mastered: '🌟',
};

const MILESTONE_LABEL: Record<MilestoneRow['milestone_type'], string> = {
  presented: 'Presented',
  practicing: 'Practising',
  ready_for_review: 'Ready for review',
  mastered: 'Mastered',
};

export const milestonesAdapter: CalendarAdapter = async (window, scope) => {
  const supabase = getSupabase();
  const fromIso = window.fromInstant.toISOString();
  const toIso = window.toInstant.toISOString();

  let q = supabase
    .from('montree_milestones')
    .select('id, school_id, child_id, work_id, milestone_type, achieved_at')
    .eq('school_id', scope.schoolId)
    .gte('achieved_at', fromIso)
    .lt('achieved_at', toIso)
    .order('achieved_at', { ascending: true })
    .limit(500);

  if (scope.role === 'parent') {
    if (scope.childIds.length === 0) return [];
    q = q.in('child_id', scope.childIds);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    console.error('[CalendarMilestones] error', error);
    return [];
  }

  const rows = (data || []) as MilestoneRow[];

  const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
  const workIds = Array.from(new Set(rows.map((r) => r.work_id)));
  const [kidsRes, worksRes] = await Promise.all([
    childIds.length
      ? supabase.from('montree_children').select('id, name, classroom_id').in('id', childIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; classroom_id: string | null }> }),
    workIds.length
      ? supabase.from('montree_classroom_curriculum_works').select('id, name').in('id', workIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);
  const childName = new Map<string, string>();
  const childClassroom = new Map<string, string | null>();
  for (const k of (kidsRes.data || []) as Array<{ id: string; name: string; classroom_id: string | null }>) {
    childName.set(k.id, k.name);
    childClassroom.set(k.id, k.classroom_id);
  }
  const workName = new Map<string, string>();
  for (const w of (worksRes.data || []) as Array<{ id: string; name: string }>) {
    workName.set(w.id, w.name);
  }

  return rows.map<CalendarEvent>((r) => {
    const name = childName.get(r.child_id) || 'Child';
    const work = workName.get(r.work_id) || 'a work';
    const label = MILESTONE_LABEL[r.milestone_type];
    return {
      id: `milestone:${r.id}`,
      source: 'milestone',
      kind: 'point',
      start: r.achieved_at,
      end: null,
      all_day: false,
      title: `${name} · ${label}`,
      detail: work,
      status: 'done',
      link:
        scope.role === 'parent'
          ? `/montree/parent/dashboard`
          : `/montree/dashboard/${r.child_id}`,
      icon: MILESTONE_ICON[r.milestone_type],
      accent: r.milestone_type === 'mastered' ? '#E8C96A' : '#34d399',
      school_id: r.school_id,
      classroom_id: childClassroom.get(r.child_id) || null,
      child_id: r.child_id,
      visibility: 'child',
    };
  });
};
