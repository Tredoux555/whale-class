// lib/montree/tracking/types.ts
//
// The tracking engine's vocabulary. Pure types — no I/O, no React, no imports
// from anything that touches Supabase. Everything the engine reasons about is
// in this file, so a test can build a whole term in memory.
//
// The ProgressEvent shape deliberately MIRRORS the montree_progress_events
// table (migration 314): child_id, classroom_id, work_key, work_name, area,
// old_status, new_status, source, actor, created_at — plus two optional
// fields the journal carries in practice: `reason` (required by rule 4 for a
// downward correction) and `evidence_id` (the photo/recording a same-day
// duplicate gets attached to instead of advancing the ladder a second time).

/** Rule 4's ladder. Ordered; see STATUS_RANK in ledger.ts. */
export type Status = 'not_started' | 'presented' | 'practicing' | 'mastered';

/** Rule 3's source vocabulary. 'correction' is the only one allowed to go down. */
export type Source =
  | 'tap'
  | 'photo'
  | 'ai'
  | 'digital'
  | 'live'
  | 'import'
  | 'backfill'
  | 'correction';

/**
 * One journalled row. `old_status === new_status` is legal and means a REPEAT
 * OBSERVATION: the teacher/photo saw the child at the same work again. It is
 * evidence of activity (it feeds "continued with…" and the stuck flag) but it
 * never moves the ladder — applyEvent() rejects it with why:'no-op'.
 */
export interface ProgressEvent {
  child_id: string;
  classroom_id?: string | null;
  work_key: string | null;
  work_name: string;
  area?: string | null;
  old_status: Status | null;
  new_status: Status;
  source: Source;
  actor?: string | null;
  /** ISO 8601. The calendar day is read from this for the same-day dedupe. */
  created_at: string;
  /** Rule 4: mandatory when source === 'correction'. */
  reason?: string | null;
  /** The photo/recording this row was derived from, when there is one. */
  evidence_id?: string | null;
}

/** Which shelf a work belongs to. Only 'dark-phonics' and 'writing-shelf' are ever narrated (rules 8/9). */
export type WorkGroup = 'dark-phonics' | 'writing-shelf' | 'other';

/** Rule 1 + rule 7: one work, one key, one position. */
export interface CurriculumWork {
  work_key: string;
  name: string;
  /**
   * The curriculum row's `description` column. For a Writing Shelf tray this
   * is the tray's MATERIAL ('Sound boxes', 'Word chains') while `name` is the
   * canonical typeable form ('Writing Shelf tray 3'). Optional because older
   * rows and in-memory fixtures may not carry one; readers must fall back.
   */
  description?: string | null;
  area: string;
  sequence: number;
  group?: WorkGroup;
}

export interface Child {
  id: string;
  name: string;
  pronoun: 'he' | 'she' | 'they';
}

/**
 * Everything a derived read needs. There is no "current status" field: rule 3
 * says current state is a cache of the journal, so it is always recomputed
 * from `events`.
 */
export interface Ledger {
  events: ProgressEvent[];
  works: CurriculumWork[];
  children: Child[];
  /** The Dark Phonics letter the class as a whole is on — the fallback narration uses it. */
  classWeekLetter: string;
  /** Monday-anchored 'YYYY-MM-DD' strings, in order. */
  weekStarts: string[];
  /**
   * The school's IANA timezone ('Asia/Shanghai', 'America/Los_Angeles', …).
   * Every day and week boundary in the engine is read in it — the same rule
   * lib/montree/school-time.ts applies to the other 14 routes. Optional so an
   * in-memory fixture need not carry one; absent means UTC (see ledger.tzOf).
   */
  timezone?: string;
}

/**
 * Rule 7's answer in one word — why the engine chose the work it chose.
 * Declared here (not in guidance.ts) so a reader or an API route can type a
 * column without importing the engine.
 *   continue-practising  the child is already on it; nothing new goes on top
 *   present-next         the first unmastered work in sequence
 *   re-present           presented once, never returned to, gone cold
 *   gap-below            an untouched work below something already mastered
 *   area-complete        nothing left in sequence to present
 */
export type GuidanceReason =
  | 'continue-practising'
  | 'present-next'
  | 're-present'
  | 'gap-below'
  | 'area-complete';

/** The five areas every Montessori shelf is guided across. */
export type AreaKey = 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';
