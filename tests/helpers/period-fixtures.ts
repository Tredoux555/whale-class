// Shared test fixture builder — mirrors the shape aggregatePeriod() returns
// for one child (period-aggregator.ts), without needing a real Supabase
// client. Used by period-area-facts / monthly-all-areas-builder /
// weekly-summary-all-areas-builder tests.

import { AREA_ORDER, type AreaKey, type ChildAggregate, type StatusTransition } from '../../lib/montree/reports/period-types';

export function emptyByArea() {
  const out: Record<AreaKey, ChildAggregate['by_area'][AreaKey]> = {} as never;
  for (const a of AREA_ORDER) {
    out[a] = { sessions: 0, minutes_est: 0, works: [], concentration: { wd: 0, wc: 0, dc: 0 }, photo_moments: 0 };
  }
  return out;
}

export function emptyNextWorks() {
  const out: Record<AreaKey, string | null> = {} as never;
  for (const a of AREA_ORDER) out[a] = null;
  return out;
}

export interface BuildChildOpts {
  name?: string;
  /** area -> { sessions, minutesEst, works: [{name, sessions, minutesEst}] } */
  areas?: Partial<Record<AreaKey, { sessions: number; minutesEst: number; works: Array<{ name: string; sessions: number; minutesEst: number }> }>>;
  transitions?: StatusTransition[];
  nextWorks?: Partial<Record<AreaKey, string | null>>;
}

export function buildChildAggregate(opts: BuildChildOpts = {}): ChildAggregate {
  const by_area = emptyByArea();
  let totalSessions = 0;
  let totalMinutes = 0;
  for (const [area, data] of Object.entries(opts.areas || {}) as Array<[AreaKey, NonNullable<BuildChildOpts['areas']>[AreaKey]]>) {
    if (!data) continue;
    by_area[area] = {
      sessions: data.sessions,
      minutes_est: data.minutesEst,
      works: data.works.map((w) => ({ work_key: null, work_name: w.name, sessions: w.sessions, minutes_est: w.minutesEst })),
      concentration: { wd: 0, wc: 0, dc: 0 },
      photo_moments: 0,
    };
    totalSessions += data.sessions;
    totalMinutes += data.minutesEst;
  }
  const transitions = opts.transitions || [];
  const statusCounts = { presented: 0, practicing: 0, mastered: 0 };
  for (const t of transitions) statusCounts[t.to] += 1;
  const nextWorks = { ...emptyNextWorks(), ...(opts.nextWorks || {}) };

  return {
    child_id: 'child-1',
    name: opts.name ?? 'Amy',
    by_area,
    transitions,
    status_counts: statusCounts,
    notes: { count: 0, snippets: [] },
    top_area: null,
    total_sessions: totalSessions,
    total_minutes_est: totalMinutes,
    next_works: nextWorks,
  };
}

export function transition(partial: Partial<StatusTransition> & Pick<StatusTransition, 'work_name' | 'area' | 'to'>): StatusTransition {
  return {
    work_key: null,
    from: null,
    at: '2026-08-10T00:00:00Z',
    ...partial,
  };
}
