// lib/montree/paper-scan/session-writer.ts
//
// One approved extraction row → one montree_observation_sessions row (336).
//
// The fact table records WHAT a child did on a DAY and roughly HOW MUCH:
// frequency (tally strokes) and a time bucket, never a stopwatch. Minutes are
// an ESTIMATE derived from the bucket midpoint — that is the whole contract
// with the teacher, who ticked a circle, not a clock. The one exception is a
// number the teacher actually wrote, which is used as-is.
//
// Pure and side-effect free on purpose: the commit route decides what to do
// with the row, and tests/paper-scan-session-writer.test.ts pins the maths.

import type {
  PaperScanArea,
  PaperScanConcentration,
  PaperScanProposedStatus,
  PaperScanTimeBucket,
} from './types';

/** Bucket midpoints: short <15 → 10, medium 15-30 → 22, long 30+ → 40. */
export const BUCKET_MINUTES: Record<PaperScanTimeBucket, number> = {
  short: 10,
  medium: 22,
  long: 40,
};

const AREAS: readonly string[] = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const BUCKETS: readonly string[] = ['short', 'medium', 'long'];
const CONCENTRATIONS: readonly string[] = ['wd', 'wc', 'dc'];
const STATUSES: readonly string[] = ['presented', 'practicing', 'mastered'];

/** Insert shape for montree_observation_sessions. */
export interface ObservationSessionInsert {
  school_id: string;
  classroom_id: string;
  child_id: string;
  work_key: string | null;
  work_name: string;
  area: PaperScanArea;
  occurred_on: string;
  frequency: number;
  time_bucket: PaperScanTimeBucket | null;
  minutes_est: number | null;
  concentration: PaperScanConcentration | null;
  status_mark: PaperScanProposedStatus | null;
  source: string;
  scan_id: string | null;
  extraction_id: string | null;
  note: string | null;
  created_by: string | null;
}

export type SessionSkipReason = 'no_child' | 'no_work' | 'no_area';

export type BuildSessionRowResult =
  | { row: ObservationSessionInsert; reason: null }
  | { row: null; reason: SessionSkipReason };

export function normaliseArea(value: unknown): PaperScanArea | null {
  return typeof value === 'string' && AREAS.includes(value) ? (value as PaperScanArea) : null;
}

export function normaliseBucket(value: unknown): PaperScanTimeBucket | null {
  return typeof value === 'string' && BUCKETS.includes(value) ? (value as PaperScanTimeBucket) : null;
}

export function normaliseConcentration(value: unknown): PaperScanConcentration | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase();
  return CONCENTRATIONS.includes(lower) ? (lower as PaperScanConcentration) : null;
}

export function normaliseStatusMark(value: unknown): PaperScanProposedStatus | null {
  return typeof value === 'string' && STATUSES.includes(value) ? (value as PaperScanProposedStatus) : null;
}

/**
 * Tally strokes → frequency. The column is `NOT NULL DEFAULT 1 CHECK (>= 1)`:
 * an unmarked tally box means "once", not "never" — the row only exists
 * because the child did the work.
 */
export function normaliseFrequency(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const n = Math.round(value);
  return n >= 1 ? n : 1;
}

/**
 * minutes_est — an exact written number wins; otherwise the bucket midpoint
 * times the number of sessions that day; otherwise nothing at all (a NULL here
 * is honest, a zero would be read as "worked for no time").
 */
export function estimateMinutes(opts: {
  timeMinutes?: number | null;
  timeBucket?: PaperScanTimeBucket | null;
  frequency?: number | null;
}): number | null {
  const exact = opts.timeMinutes;
  if (typeof exact === 'number' && Number.isFinite(exact) && exact > 0) return Math.round(exact);

  const bucket = normaliseBucket(opts.timeBucket);
  if (!bucket) return null;

  return BUCKET_MINUTES[bucket] * normaliseFrequency(opts.frequency);
}

/**
 * The day this session belongs to: the date written on the sheet when there is
 * one, otherwise the day the photo was taken. Never "today" at commit time —
 * a sheet reviewed on Monday still describes Friday.
 */
export function sessionOccurredOn(sheetDate: string | null | undefined, scanCreatedAt: string | null | undefined): string {
  if (typeof sheetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sheetDate.trim())) return sheetDate.trim();
  if (typeof scanCreatedAt === 'string' && scanCreatedAt.length >= 10) {
    const candidate = scanCreatedAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  }
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface BuildSessionRowInput {
  extraction: {
    id: string;
    child_id: string | null;
    work_key: string | null;
    work_name: string | null;
    work_name_raw: string | null;
    area: string | null;
    frequency: number | null;
    time_bucket: string | null;
    concentration: string | null;
    time_minutes: number | null;
    note: string | null;
    teacher_final_note: string | null;
  };
  scan: {
    id: string;
    school_id: string;
    classroom_id: string;
    sheet_date: string | null;
    created_at: string | null;
  };
  /** Area resolved elsewhere (review edit, or the work_key → area hop). */
  area?: string | null;
  /** Status after review — the same value written to progress. */
  statusMark?: string | null;
  source?: string;
  actorId?: string | null;
}

/**
 * Build the session row for one approved extraction, or say why there isn't
 * one. `area` is NOT defaulted: the fact table's area column is NOT NULL and a
 * guessed area would poison every heatmap built on it.
 */
export function buildSessionRow(input: BuildSessionRowInput): BuildSessionRowResult {
  const { extraction: ext, scan } = input;

  if (!ext.child_id) return { row: null, reason: 'no_child' };

  const workName = (ext.work_name || ext.work_name_raw || '').trim();
  if (!workName) return { row: null, reason: 'no_work' };

  const area = normaliseArea(input.area ?? ext.area);
  if (!area) return { row: null, reason: 'no_area' };

  const frequency = normaliseFrequency(ext.frequency);
  const timeBucket = normaliseBucket(ext.time_bucket);
  const note = (input.extraction.teacher_final_note || ext.note || '').trim() || null;

  return {
    row: {
      school_id: scan.school_id,
      classroom_id: scan.classroom_id,
      child_id: ext.child_id,
      work_key: ext.work_key || null,
      work_name: workName,
      area,
      occurred_on: sessionOccurredOn(scan.sheet_date, scan.created_at),
      frequency,
      time_bucket: timeBucket,
      minutes_est: estimateMinutes({ timeMinutes: ext.time_minutes, timeBucket, frequency }),
      concentration: normaliseConcentration(ext.concentration),
      status_mark: normaliseStatusMark(input.statusMark),
      source: input.source || 'paper_scan',
      scan_id: scan.id,
      extraction_id: ext.id,
      note,
      created_by: input.actorId || null,
    },
    reason: null,
  };
}
