// lib/montree/weekly-admin/monthly-all-areas-builder.ts
//
// PURE FORMAT LOGIC for the all-areas Monthly Summary paragraph
// (PLAN_ALL_AREAS_REPORTS_AUG22.md §8/§10, Phase 7a). Sits BESIDE the
// locked Language-only builder in monthly-summary-builder.ts — that
// module and its format rules (see the 🚨 block at its top) are UNTOUCHED.
// This is a new function for the new all-areas doc: one compact sentence
// group per area the child had >=1 session or transition in this month,
// via the period aggregator (lib/montree/reports/period-aggregator.ts).
//
// The primary text comes from Sonnet (monthly-all-areas-drafter.ts, one
// call per classroom, forced tool, temperature 0, grounded only in these
// facts — never invented). Everything in THIS file is the deterministic
// fallback used when AI is disabled or the call fails, so the teacher's
// textarea is never empty, plus the pure fact-shaping the drafter's prompt
// is built from.

import { AREA_LABELS_EN, buildActiveAreaFacts, type PeriodAreaFacts } from '@/lib/montree/reports/period-area-facts';

export { buildActiveAreaFacts };
export type { PeriodAreaFacts };

function areaSentence(childName: string, label: string, f: PeriodAreaFacts, monthName: string): string {
  const parts: string[] = [];
  if (f.topWorks.length === 0) {
    parts.push(
      `In ${label}, ${childName} had ${f.sessions} session${f.sessions === 1 ? '' : 's'} recorded in ${monthName} with no named work.`,
    );
  } else if (f.topWorks.length === 1) {
    parts.push(`In ${label}, ${childName} worked with ${f.topWorks[0]} this month.`);
  } else {
    parts.push(`In ${label}, ${childName} worked with ${f.topWorks.join(' and ')} this month.`);
  }
  if (f.masteredWorks.length > 0) {
    parts.push(`Reached mastery on ${f.masteredWorks.join(', ')}.`);
  } else if (f.practicingWorks.length > 0) {
    parts.push(`Currently practicing ${f.practicingWorks.join(' and ')}.`);
  }
  if (f.nextWork) parts.push(`Next, we can look at ${f.nextWork}.`);
  return parts.join(' ');
}

/**
 * Deterministic fallback paragraph — one sentence group per active area,
 * joined in AREA_ORDER (~40-60 words per area, matching the locked
 * Language-only builder's per-sentence density). Used when Sonnet is
 * unavailable; also the reference shape the AI prompt asks Sonnet to match.
 */
export function buildFallbackAllAreasParagraph(
  childName: string,
  facts: PeriodAreaFacts[],
  monthName: string,
  areaLabels: Record<string, string> = AREA_LABELS_EN,
): string {
  if (facts.length === 0) {
    return `${childName} had no recorded activity across any area in ${monthName}.`;
  }
  return facts.map((f) => areaSentence(childName, areaLabels[f.area], f, monthName)).join(' ');
}
