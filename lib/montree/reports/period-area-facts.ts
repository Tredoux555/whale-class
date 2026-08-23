// lib/montree/reports/period-area-facts.ts
//
// Shared "what happened in each active area, for one child, this period"
// view over a ChildAggregate (period-aggregator.ts). Used by both the
// Monthly Summary all-areas builder and the Weekly Summary all-areas
// builder (PLAN_ALL_AREAS_REPORTS_AUG22.md §8) so the two docs describe
// activity the same way and the Sonnet drafters share one grounding shape.
//
// PURE. No DB, no AI.

import { AREA_ORDER, type AreaKey, type ChildAggregate } from './period-types';

export interface PeriodAreaFacts {
  area: AreaKey;
  sessions: number;
  minutesEst: number;
  /** Up to 3, already sorted by session count desc on the aggregate. */
  topWorks: string[];
  /** Distinct work names that reached 'mastered' in this area this period. */
  masteredWorks: string[];
  /** Distinct work names that moved to 'practicing' in this area this period. */
  practicingWorks: string[];
  /** Distinct work names newly 'presented' in this area this period. */
  presentedWorks: string[];
  /** Curriculum gap-fill recommendation for this area, or null. */
  nextWork: string | null;
}

const MIN_WORK_NAME_LEN = 4;

function validName(n: string | null | undefined): n is string {
  return !!n && n.trim().length >= MIN_WORK_NAME_LEN;
}

function uniqueNames(names: Array<string | null | undefined>, limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    if (!validName(raw)) continue;
    const key = raw.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Areas where the child had >=1 session OR >=1 status transition this
 * period, in the fixed AREA_ORDER. An area with a transition but zero
 * sessions (e.g. a transition derived from the progress-fallback path) still
 * counts as active — the child's status genuinely moved.
 */
export function buildActiveAreaFacts(child: ChildAggregate): PeriodAreaFacts[] {
  const out: PeriodAreaFacts[] = [];
  for (const area of AREA_ORDER) {
    const areaAgg = child.by_area[area];
    const transitionsHere = child.transitions.filter((t) => t.area === area);
    if (areaAgg.sessions <= 0 && transitionsHere.length === 0) continue;
    out.push({
      area,
      sessions: areaAgg.sessions,
      minutesEst: areaAgg.minutes_est,
      topWorks: uniqueNames(areaAgg.works.map((w) => w.work_name), 3),
      masteredWorks: uniqueNames(transitionsHere.filter((t) => t.to === 'mastered').map((t) => t.work_name), 3),
      practicingWorks: uniqueNames(transitionsHere.filter((t) => t.to === 'practicing').map((t) => t.work_name), 2),
      presentedWorks: uniqueNames(transitionsHere.filter((t) => t.to === 'presented').map((t) => t.work_name), 2),
      nextWork: child.next_works[area] ?? null,
    });
  }
  return out;
}

export const AREA_LABELS_EN: Record<AreaKey, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export const AREA_LABELS_ZH: Record<AreaKey, string> = {
  practical_life: '日常',
  sensorial: '感官',
  mathematics: '数学',
  language: '语言',
  cultural: '文化',
};
