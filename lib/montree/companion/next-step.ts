// lib/montree/companion/next-step.ts
//
// The spine of the Home Companion: "work by work, step by step."
//
// Given a child, returns THE ONE next work to present — never a menu. It wraps
// the existing V3 8-factor sequencer (lib/montree/guru/work-sequencer.ts), which
// already does unblocking, cross-area bridges, area gaps, age fit and curriculum
// flow — then takes the single highest-priority proposal. The Companion's brain
// turns that into a hand-held Step Card for the parent.
//
// Pure-ish: it only reads the child's data + runs the (pure) sequencer. No writes.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import {
  generateShelfProposals,
  AREA_LABELS,
  type ShelfProposal,
} from '@/lib/montree/guru/work-sequencer';

export interface NextStep {
  work_name: string;
  work_key: string;
  area: string;
  area_label: string;
  /** Raw sequencer reasoning (the Companion brain restates this warmly for the parent). */
  reason: string;
  reasons: string[];
  tier: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  /** When the next step bridges from another area (V3 cross-area bridge). */
  is_bridge: boolean;
  bridge_from_area: string | null;
  /** The child's current work in that area + its status, if any (continuity). */
  current_work: string | null;
  current_work_status: string | null;
}

export type NextStepResult =
  | { ok: true; childName: string; childAgeYears: number | null; step: NextStep; v3_active: boolean }
  | { ok: false; childName: string | null; reason: 'no_child' | 'no_recommendation' };

/**
 * Pick the single next work to present to this child at home.
 * Mirrors the data assembly of Guru's get_prioritized_recommendations, then
 * collapses the ranked list to one step (the home loop shows ONE thing).
 */
export async function pickNextStep(
  supabase: SupabaseClient,
  childId: string,
): Promise<NextStepResult> {
  const { data: child } = await supabase
    .from('montree_children')
    .select('name, date_of_birth')
    .eq('id', childId)
    .maybeSingle();

  if (!child) return { ok: false, childName: null, reason: 'no_child' };
  const childName = (child.name as string) || 'your child';

  const [progressRes, observationsRes, focusRes] = await Promise.all([
    supabase
      .from('montree_child_progress')
      .select('work_name, work_key, area, status, updated_at')
      .eq('child_id', childId),
    supabase
      .from('montree_behavioral_observations')
      .select('observation')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('montree_child_focus_works')
      .select('work_name, area')
      .eq('child_id', childId),
  ]);

  const progress = (progressRes.data || []) as Array<{
    work_name: string; work_key: string | null; area: string; status: string; updated_at: string | null;
  }>;
  const observations = ((observationsRes.data || []) as Array<{ observation: string | null }>)
    .map((o) => o.observation)
    .filter((o): o is string => !!o);
  const focusWorks = (focusRes.data || []) as Array<{ work_name: string; area: string }>;

  // Child age in years (for V3 age-fit scoring).
  let childAgeYears: number | null = null;
  if (child.date_of_birth) {
    const dob = new Date(child.date_of_birth as string);
    if (!Number.isNaN(dob.getTime())) {
      childAgeYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }
  }

  // V3 scoring inputs (mirror of the Guru tool).
  const strugglingWorkKeys = progress
    .filter((p) => p.status === 'struggling' || p.status === 'presented')
    .map((p) => p.work_key || p.work_name);
  const lastObsByArea: Record<string, string> = {};
  for (const p of progress) {
    if (p.updated_at && p.area) {
      if (!lastObsByArea[p.area] || p.updated_at > lastObsByArea[p.area]) {
        lastObsByArea[p.area] = p.updated_at;
      }
    }
  }

  const result = generateShelfProposals(
    childId,
    childName,
    progress.map((p) => ({
      work_name: p.work_name,
      work_key: p.work_key || p.work_name,
      area: p.area,
      status: p.status,
    })),
    focusWorks,
    {
      childAgeYears: childAgeYears ?? undefined,
      observations,
      strugglingWorkKeys,
      lastObservationByArea: lastObsByArea,
    },
  );

  const all: ShelfProposal[] = [...result.proposals, ...(result.bridge_proposals || [])];
  if (all.length === 0) {
    return { ok: false, childName, reason: 'no_recommendation' };
  }

  all.sort((a, b) => (b.v3_score ?? b.score) - (a.v3_score ?? a.score));
  const top = all[0];

  const step: NextStep = {
    work_name: top.proposed_work,
    work_key: top.proposed_work_key,
    area: top.area,
    area_label: AREA_LABELS[top.area] || top.area,
    reason: top.reasons?.join('; ') || top.reason,
    reasons: top.reasons || (top.reason ? [top.reason] : []),
    tier: top.tier || 'available',
    score: top.v3_score ?? top.score,
    confidence: top.confidence,
    is_bridge: !!top.bridge_from_area,
    bridge_from_area: top.bridge_from_area || null,
    current_work: top.current_work,
    current_work_status: top.current_work_status,
  };

  return { ok: true, childName, childAgeYears, step, v3_active: !!result.v3_active };
}
