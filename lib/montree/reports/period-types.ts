// lib/montree/reports/period-types.ts
// Types for the period aggregator (PLAN_ALL_AREAS_REPORTS_AUG22.md §6).
//
// Pure data shapes. Shared by period-aggregator.ts, the period report API
// route, the dashboard page, and the docx/pptx derivations — so a change here
// is a contract change for all of them. JSON-safe on purpose: the whole
// PeriodAggregate is cached verbatim in montree_period_reports.data (336).

/** The five canonical areas, in the fixed display order used everywhere. */
export const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
export type AreaKey = (typeof AREA_ORDER)[number];

export type PeriodType = 'week' | 'month';

export type TimeBucket = 'short' | 'medium' | 'long';
export type Concentration = 'wd' | 'wc' | 'dc';
export type ProgressStatus = 'presented' | 'practicing' | 'mastered';

/** Bucket midpoint in minutes — the ONLY place this mapping lives for charts. */
export const BUCKET_MINUTES: Record<TimeBucket, number> = { short: 10, medium: 22, long: 40 };

/**
 * A session with no bucket and no exact minutes still represents real work.
 * 15 minutes is the school's own rule of thumb for one un-timed sheet entry —
 * identical to UNTIMED_ENTRY_MINUTES in app/api/montree/work-rhythm/route.ts
 * so the heatmap and Work Rhythm agree.
 */
export const UNTIMED_SESSION_MINUTES = 15;

export interface PeriodBounds {
  /** YYYY-MM-DD inclusive */
  start: string;
  /** YYYY-MM-DD inclusive */
  end: string;
}

export interface AggregatePeriodInput {
  classroomId: string;
  schoolId?: string | null;
  periodType: PeriodType;
  /**
   * YYYY-MM-DD. Normally the period start, but any date inside the period is
   * accepted — the bounds are always recomputed via computePeriodBounds so a
   * mid-week anchor snaps to Monday.
   */
  periodStart: string;
  /**
   * Hours east of UTC used to turn the inclusive date range into timestamptz
   * filters for created_at / observed_at / captured_at columns. Default 0.
   * (Whale Class is +8; date-typed columns such as occurred_on are unaffected.)
   */
  utcOffsetHours?: number;
  /** Include the photo proxy (montree_media hop). Default true. */
  includePhotos?: boolean;
}

export interface WorkTouch {
  work_key: string | null;
  work_name: string;
  sessions: number;
  minutes_est: number;
}

export interface AreaAggregate {
  /** Sum of `frequency` across sessions in this area (tally strokes). */
  sessions: number;
  /** Estimated minutes: bucket midpoint × frequency, exact minutes when recorded. */
  minutes_est: number;
  works: WorkTouch[];
  concentration: { wd: number; wc: number; dc: number };
  /** Confirmed photos attributed to this area. A proxy, never minutes. */
  photo_moments: number;
}

export interface StatusTransition {
  work_name: string;
  work_key: string | null;
  area: AreaKey | null;
  from: string | null;
  to: ProgressStatus;
  /** ISO timestamp */
  at: string;
}

export interface ChildAggregate {
  child_id: string;
  name: string;
  by_area: Record<AreaKey, AreaAggregate>;
  transitions: StatusTransition[];
  /** Movement in the period, counted by destination status. */
  status_counts: { presented: number; practicing: number; mastered: number };
  notes: { count: number; snippets: string[] };
  top_area: AreaKey | null;
  total_sessions: number;
  total_minutes_est: number;
  /** Recommended next work per area (curriculum sequence gap-fill), null when unknown. */
  next_works: Record<AreaKey, string | null>;
}

export interface ClassAreaTotal {
  sessions: number;
  minutes_est: number;
  /** Children with ≥1 session in this area. */
  children_active: number;
}

export interface MasteredWork {
  child_id: string;
  child_name: string;
  work_name: string;
  work_key: string | null;
  area: AreaKey | null;
  at: string;
}

export interface AggregateSources {
  /** Which table fed sessions/minutes. 'none' = nothing recorded. */
  sessions: 'sessions' | 'legacy_extractions' | 'none';
  /** Which table fed transitions. */
  transitions: 'events' | 'progress_fallback' | 'none';
  photos: 'media' | 'skipped' | 'none';
  notes: 'observations' | 'none';
}

export interface PeriodAggregate {
  classroom_id: string;
  school_id: string | null;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  generated_at: string;
  sources: AggregateSources;
  areas: readonly AreaKey[];
  children: ChildAggregate[];
  class_totals: Record<AreaKey, ClassAreaTotal>;
  /** Works that reached `mastered` in the period, across the class. */
  class_mastered: MasteredWork[];
  /** children × areas, sessions — same row order as `children`, column order as `areas`. */
  heatmap: number[][];
  /**
   * Non-fatal problems: a table that does not exist yet (migration 336 / 314
   * not applied), a source that errored and was skipped. Empty when clean.
   */
  warnings: string[];
}
