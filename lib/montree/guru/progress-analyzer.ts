// lib/montree/guru/progress-analyzer.ts
// Stale / inactive progress patterns, for proactive Guru suggestions.
//
// 🚨 "Stale" is an ENGINE flag now (2026-09-06, Engine v2). This helper used
// to run its own SQL definition of stale — "any row still practicing or
// presented and untouched for 14 days" — which happily reported a work the
// child had mastered around, a work below a gap, and a work the teacher had
// deliberately parked, all with the same voice. The engine already decides
// what a cold work is (guidance.ts, reason 're-present') and can say WHY.
//
// The shape returned is unchanged, so both callers
// (app/api/montree/guru/dashboard-summary, .../guru/suggestions) are untouched.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { nextWorks, type AreaGuidance } from '@/lib/montree/tracking/guidance';
import { loadGuidanceLedger } from '@/lib/montree/tracking/guidance-ledger';

export interface StaleWork {
  work_name: string;
  area: string;
  status: string;
  last_updated: string;
  days_stale: number;
  /** The engine's sentence for why this is stale. Safe to show a teacher. */
  because?: string;
}

export interface ProgressAnalysis {
  staleWorks: StaleWork[];
  daysInactive: number; // days since any progress update
  hasActivity: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Analyze a child's progress for cold works and inactivity.
 * `staleWorks` = every area whose engine answer is 're-present'.
 */
export async function analyzeChildProgress(
  supabase: SupabaseClient,
  childId: string
): Promise<ProgressAnalysis> {
  const now = new Date();

  // Last activity of any kind — the cache's updated_at is the cheapest read.
  const { data: recentActivity } = await supabase
    .from('montree_child_progress')
    .select('updated_at')
    .eq('child_id', childId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastActivity = recentActivity?.updated_at ? new Date(recentActivity.updated_at as string) : null;
  const daysInactive = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / DAY_MS)
    : 999;

  const staleWorks: StaleWork[] = [];
  try {
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .maybeSingle();
    const classroomId = child?.classroom_id as string | undefined;

    if (classroomId) {
      const asOf = now.toISOString();
      const ledger = await loadGuidanceLedger(supabase, {
        classroomId,
        childIds: [childId],
        asOf,
      });
      const guidance = nextWorks(ledger, childId, { asOf });
      for (const g of guidance) {
        if (g.reason !== 're-present' || !g.current) continue;
        staleWorks.push(toStaleWork(g, ledger.events, childId, now));
      }
    }
  } catch (err) {
    console.error('[progress-analyzer] engine read failed:', err);
  }

  return {
    staleWorks,
    daysInactive,
    hasActivity: daysInactive < 7,
  };
}

function toStaleWork(
  g: AreaGuidance,
  events: { child_id: string; work_key: string | null; created_at: string }[],
  childId: string,
  now: Date
): StaleWork {
  const current = g.current!;
  let last = '';
  for (const e of events) {
    if (e.child_id !== childId || e.work_key !== current.work_key) continue;
    if (e.created_at > last) last = e.created_at;
  }
  const days = last ? Math.floor((now.getTime() - Date.parse(last)) / DAY_MS) : 999;
  return {
    work_name: current.name,
    area: g.area,
    status: current.status,
    last_updated: last || '',
    days_stale: days,
    because: g.because,
  };
}
