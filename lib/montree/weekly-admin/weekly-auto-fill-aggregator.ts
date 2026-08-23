// lib/montree/weekly-admin/weekly-auto-fill-aggregator.ts
//
// Aggregator-driven Weekly Summary + Plan auto-fill feeder
// (PLAN_ALL_AREAS_REPORTS_AUG22.md §8/§9, Phase 7b). Opt-in alternate to the
// legacy heuristic pipeline in app/api/montree/weekly-admin-docs/auto-fill/
// route.ts — reached only via `?engine=aggregator` so the default
// teacher-facing behaviour is unchanged (no regression).
//
// Sources everything from aggregatePeriod(week) instead of re-deriving
// works from Weekly Wrap reports / raw photos / the focus-shelf table, and
// drafts text with Sonnet (weekly-summary-drafter.ts) instead of Haiku.

import type { UntypedClient } from '@/lib/supabase-client';
import { aggregatePeriod, AREA_ORDER, type ChildAggregate } from '@/lib/montree/reports/period-aggregator';
import { draftWeeklySummaries } from '@/lib/montree/reports/weekly-summary-drafter';
import { schoolUtcOffsetHours } from '@/lib/montree/reports/school-timezone';
import { pickPlanWork } from './weekly-summary-all-areas-builder';

// Weekly Plan always shows all five columns, active or not (empty cell when
// the child has nothing this week) — matches the legacy AREAS behaviour.
const PLAN_AREAS = AREA_ORDER;

export interface AggregatorChildSuggestion {
  childId: string;
  childName: string;
  summaryEnglish: string;
  summaryChinese: string;
  planAreas: Record<string, string>;
  planAreasZh: Record<string, string>;
}

interface WorkZhRow {
  name: string | null;
  name_zh: string | null;
}

export async function buildAggregatorWeeklySuggestions(
  supabase: UntypedClient,
  opts: {
    classroomId: string;
    schoolId: string | null;
    classroomName: string;
    weekStart: string;
    children: Array<{ id: string; name: string }>;
  },
): Promise<{ children: AggregatorChildSuggestion[]; warnings: string[] }> {
  const aggregate = await aggregatePeriod(supabase, {
    classroomId: opts.classroomId,
    schoolId: opts.schoolId,
    periodType: 'week',
    periodStart: opts.weekStart,
    // See lib/montree/reports/school-timezone.ts — a 0 offset silently shifts
    // every timestamptz-sourced fact by the school's whole offset.
    utcOffsetHours: await schoolUtcOffsetHours(supabase, opts.schoolId),
  });

  const byChild = new Map<string, ChildAggregate>();
  for (const c of aggregate.children) byChild.set(c.child_id, c);

  // Chinese work-name lookup — real curriculum data only, never invented.
  const { data: worksRaw } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name, name_zh')
    .eq('classroom_id', opts.classroomId)
    .not('name_zh', 'is', null);
  const zhByName = new Map<string, string>();
  for (const w of (worksRaw || []) as WorkZhRow[]) {
    if (w.name && w.name_zh) zhByName.set(w.name.trim().toLowerCase(), w.name_zh);
  }
  const zhOf = (name: string): string => zhByName.get(name.trim().toLowerCase()) || name;

  const draftInput = opts.children
    .map((c) => ({ childId: c.id, child: byChild.get(c.id) }))
    .filter((c): c is { childId: string; child: ChildAggregate } => !!c.child);

  const weekLabel = `${aggregate.period_start} – ${aggregate.period_end}`;
  const drafts = await draftWeeklySummaries(weekLabel, opts.classroomName, draftInput);

  const children: AggregatorChildSuggestion[] = opts.children.map((c) => {
    const agg = byChild.get(c.id);
    const planAreas: Record<string, string> = {};
    const planAreasZh: Record<string, string> = {};
    for (const area of PLAN_AREAS) {
      const pick = agg ? pickPlanWork(area, agg) : null;
      if (!pick) {
        planAreas[area] = '';
        planAreasZh[area] = '';
        continue;
      }
      const suffix = pick.isPracticing ? '-P' : '';
      planAreas[area] = `${pick.workName}${suffix}`;
      planAreasZh[area] = `${zhOf(pick.workName)}${suffix}`;
    }
    const draft = drafts[c.id];
    return {
      childId: c.id,
      childName: c.name,
      summaryEnglish: draft?.english || 'No recorded activities this week.',
      summaryChinese: draft?.chinese || '本周无记录活动。',
      planAreas,
      planAreasZh,
    };
  });

  return { children, warnings: aggregate.warnings };
}
