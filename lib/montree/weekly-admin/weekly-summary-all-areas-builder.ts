// lib/montree/weekly-admin/weekly-summary-all-areas-builder.ts
//
// PURE FORMAT LOGIC for the all-areas Weekly Summary
// (PLAN_ALL_AREAS_REPORTS_AUG22.md §8, Phase 7b). Feeds
// generateWeeklySummary()'s existing ChildNotes.englishSummary /
// chineseSummary fields — the docx format itself (doc-generator.ts) is
// UNTOUCHED, it already accepts a multi-line chineseSummary string
// (multilineParagraphs() splits on "\n").
//
//   englishSummary — one short sentence (or two) covering the whole week
//                    across areas: "{Name} worked most in {area} (n
//                    sessions) ...".
//   chineseSummary — one line per ACTIVE area, "日常：…" / "感官：…" / … in
//                    AREA_ORDER, joined by "\n".
//
// Sonnet (lib/montree/reports/weekly-summary-drafter.ts) drafts both from
// these facts. This module is the deterministic fallback used when AI is
// unavailable, plus the pure per-area "what goes in the Weekly Plan cell"
// picker the aggregator feeder uses.

import { AREA_ORDER, type AreaKey, type ChildAggregate } from '@/lib/montree/reports/period-types';
import { AREA_LABELS_EN, AREA_LABELS_ZH, buildActiveAreaFacts, type PeriodAreaFacts } from '@/lib/montree/reports/period-area-facts';

export { buildActiveAreaFacts };
export type { PeriodAreaFacts };

/** "{Name} worked most in {topArea} (n sessions), also {area2}; {transitions}. Next week, {rec}." */
export function buildFallbackWeeklySentence(child: ChildAggregate): string {
  const active = buildActiveAreaFacts(child);
  if (active.length === 0) return `${child.name} had no recorded activity this week.`;

  const byMinutes = [...active].sort((a, b) => b.minutesEst - a.minutesEst || b.sessions - a.sessions);
  const top = byMinutes[0];
  const second = byMinutes[1];

  let sentence = `${child.name} worked most in ${AREA_LABELS_EN[top.area]} (${top.sessions} session${top.sessions === 1 ? '' : 's'})`;
  if (second) sentence += `, also ${AREA_LABELS_EN[second.area]}`;
  sentence += '.';

  const mastered = Array.from(new Set(child.transitions.filter((t) => t.to === 'mastered').map((t) => t.work_name)));
  const practicing = Array.from(new Set(child.transitions.filter((t) => t.to === 'practicing').map((t) => t.work_name)));
  if (mastered.length > 0) {
    sentence += ` Mastered ${mastered.slice(0, 2).join(', ')}.`;
  } else if (practicing.length > 0) {
    sentence += ` Moved to practicing ${practicing.slice(0, 2).join(', ')}.`;
  }

  const withNext = byMinutes.find((f) => f.nextWork);
  if (withNext?.nextWork) {
    sentence += ` Next week, we can look at ${withNext.nextWork}.`;
  }
  return sentence;
}

/** Degraded-mode Chinese lines (AI unavailable) — zh area label + English work names. */
export function buildFallbackChineseLines(facts: PeriodAreaFacts[]): string {
  if (facts.length === 0) return '';
  return facts
    .map((f) => {
      const items = f.topWorks.length > 0 ? f.topWorks.join('、') : `${f.sessions} session${f.sessions === 1 ? '' : 's'}`;
      return `${AREA_LABELS_ZH[f.area]}：${items}`;
    })
    .join('\n');
}

// ─── Weekly Plan feeder helper ─────────────────────────────────

export interface PlanPick {
  workName: string;
  /** true = child is already practicing this work (legacy "-P" suffix convention). */
  isPracticing: boolean;
}

/**
 * Pick the one work to show in a Weekly Plan cell for this area: prefer a
 * transition TO 'practicing' this period (still-live work), else a
 * transition TO 'presented' this period (brand new), else the aggregator's
 * curriculum gap-fill recommendation (next_works[area]) as a forward-looking
 * pick. Returns null when the area has nothing to show.
 */
export function pickPlanWork(area: AreaKey, child: ChildAggregate): PlanPick | null {
  const transitionsHere = child.transitions.filter((t) => t.area === area);
  const practicing = transitionsHere.filter((t) => t.to === 'practicing').slice(-1)[0];
  if (practicing) return { workName: practicing.work_name, isPracticing: true };
  const presented = transitionsHere.filter((t) => t.to === 'presented').slice(-1)[0];
  if (presented) return { workName: presented.work_name, isPracticing: false };
  const next = child.next_works[area];
  if (next) return { workName: next, isPracticing: false };
  return null;
}

export const PLAN_AREA_ORDER: readonly AreaKey[] = AREA_ORDER;
