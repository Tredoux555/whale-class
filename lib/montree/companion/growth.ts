// lib/montree/companion/growth.ts
//
// "How your child is growing" — the data behind Ivy's warm growth snapshot.
// Pure gather (no extra AI call): per-area progress, recent observations, and
// the durable interest/milestone/struggle memories. Ivy (already the model in
// the chat loop) turns this into the parent-facing reflection, so there's one
// voice and no extra cost.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { AREA_LABELS_EN as AREA_LABELS } from '@/lib/montree/i18n/area-labels';
import { loadCompanionMemories } from './memory';

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export interface GrowthData {
  child_name: string;
  total_mastered: number;
  total_practicing: number;
  total_presented: number;
  areas: Array<{ area: string; area_label: string; mastered: number; practicing: number; presented: number }>;
  recent_observations: string[];
  interests: string[];
  milestones: string[];
  struggles: string[];
  recently_mastered: string[]; // work names mastered in the last ~21 days
}

export async function gatherGrowthData(supabase: SupabaseClient, childId: string): Promise<GrowthData | null> {
  const { data: child } = await supabase.from('montree_children').select('name').eq('id', childId).maybeSingle();
  if (!child) return null;
  const childName = (child.name as string) || 'your child';

  const [progressRes, obsRes, memories] = await Promise.all([
    supabase.from('montree_child_progress').select('area, status, work_name, mastered_at').eq('child_id', childId),
    supabase.from('montree_behavioral_observations').select('behavior_description, created_at').eq('child_id', childId).order('created_at', { ascending: false }).limit(6),
    loadCompanionMemories(supabase, childId, 80).catch(() => []),
  ]);

  const progress = (progressRes.data || []) as Array<{ area: string; status: string; work_name: string; mastered_at: string | null }>;

  const byArea = new Map<string, { mastered: number; practicing: number; presented: number }>();
  let totalMastered = 0, totalPracticing = 0, totalPresented = 0;
  const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const recentlyMastered: string[] = [];
  for (const p of progress) {
    const a = byArea.get(p.area) || { mastered: 0, practicing: 0, presented: 0 };
    if (p.status === 'mastered') { a.mastered++; totalMastered++; if (p.mastered_at && new Date(p.mastered_at).getTime() > cutoff) recentlyMastered.push(p.work_name); }
    else if (p.status === 'practicing') { a.practicing++; totalPracticing++; }
    else if (p.status === 'presented') { a.presented++; totalPresented++; }
    byArea.set(p.area, a);
  }

  const areas = AREA_ORDER
    .map((area) => ({ area, area_label: AREA_LABELS[area] || area, ...(byArea.get(area) || { mastered: 0, practicing: 0, presented: 0 }) }))
    .filter((a) => a.mastered + a.practicing + a.presented > 0);

  const recentObservations = ((obsRes.data || []) as Array<{ behavior_description: string | null }>)
    .map((o) => (o.behavior_description || '').trim()).filter(Boolean).slice(0, 4);

  const pick = (type: string) => memories.filter((m) => m.memory_type === type).map((m) => m.content);

  return {
    child_name: childName,
    total_mastered: totalMastered,
    total_practicing: totalPracticing,
    total_presented: totalPresented,
    areas,
    recent_observations: recentObservations,
    interests: pick('interest').slice(0, 6),
    milestones: pick('milestone').slice(0, 6),
    struggles: pick('struggle').slice(0, 6),
    recently_mastered: recentlyMastered.slice(0, 8),
  };
}
