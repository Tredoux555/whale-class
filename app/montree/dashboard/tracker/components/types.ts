// app/montree/dashboard/tracker/components/types.ts
//
// The API contract from docs/tracking/ENGINE_V2_PLAN.md, typed once for the
// tracker screens. These shapes are BINDING — agent C's routes answer them.
// Nothing in this folder may widen or rename a field; if a shape has to
// change, the plan changes first.

export type Status = 'not_started' | 'presented' | 'practicing' | 'mastered';
export type RibbonState = 'mastered' | 'in-progress' | 'not-started' | 'coming';
export type EventSource =
  | 'tap' | 'photo' | 'ai' | 'digital' | 'live' | 'import' | 'backfill' | 'correction';

export interface ClassFlag {
  code: string;
  message: string;
}

/**
 * A cell the ENGINE filled in rather than the journal: rule 7's Dark Phonics
 * amendment — an observed work implies the earlier works of that book are
 * mastered. The grid renders these as "Done · implied by work N", lighter than
 * a real tick, and a tap on one records a real observation like any other cell.
 */
export interface ImpliedCell {
  implied: true;
  by_work_key: string;
  by_n: number;
}

export interface ClassChild {
  id: string;
  name: string;
  pronoun?: 'he' | 'she' | 'they';
  /**
   * False when nobody has stated one: 'they' above is only the engine's
   * fallback. The grid highlights these rows, and the summary repeats the
   * child's name instead of narrating a pronoun no one chose.
   */
  pronoun_set?: boolean;
  ribbon: Record<string, RibbonState>;
  current_letter: string | null;
  next_letter: string | null;
  /** The five works of THIS week's letter: work_key → status. */
  week: Record<string, Status>;
  /** Every tracked work's current status (ws: trays live here too). */
  current: Record<string, Status>;
  /** Which of those cells are implied rather than observed. Absent = observed. */
  implied?: Record<string, ImpliedCell>;
  flags: ClassFlag[];
  summary: { text: string; words: number };
  plan_cell: string | null;
}

export interface QueueItem {
  id: string;
  child_id: string;
  raw_work_name: string;
  /** Nullable in the table — an old row may carry no source. */
  source: string | null;
  /** What the refused write WANTED to say; replayed on resolve. */
  requested_status?: Status | null;
  created_at: string;
}

export interface CurriculumWorkRow {
  work_key: string;
  name: string;
  /** The curriculum row's description — for a tray, its material. */
  description?: string | null;
  sequence: number;
  group?: string;
}

export interface ClassResponse {
  week_letter: string;
  week_start: string;
  children: ClassChild[];
  queue: QueueItem[];
  works: CurriculumWorkRow[];
}

export interface EventRow {
  /** False for a repeat observation: the row is evidence, not a rung change. */
  advanced?: boolean;
  work_key: string | null;
  work_name: string;
  old_status: Status | null;
  new_status: Status;
  source: EventSource;
  actor?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface ChildResponse {
  /** The route sends the child as an object; `name` is read from here. */
  child?: { id: string; name: string; pronoun?: 'he' | 'she' | 'they'; pronoun_set?: boolean };
  ribbon: Record<string, RibbonState>;
  current: Record<string, Status>;
  /** Which of those cells are implied rather than observed. Absent = observed. */
  implied?: Record<string, ImpliedCell>;
  current_letter?: string | null;
  next_letter?: string | null;
  events: EventRow[];
  flags: ClassFlag[];
  shelf: Record<string, Status>;
  summary?: { text: string; words: number };
}

export interface EventOutcome {
  outcome: 'applied' | 'noop' | 'queued' | 'rejected';
  work_key?: string;
  old_status?: Status;
  new_status?: Status;
  why?: string;
  queue_id?: string;
}

export interface InvariantIssue {
  code: string;
  child_id?: string;
  work_key?: string;
  message: string;
  fix?: string;
  severity?: 'error' | 'warning';
}

export interface HealthResponse {
  checked_at: string;
  issues: InvariantIssue[];
  classrooms?: { id: string; name?: string | null; issues: number }[];
}
