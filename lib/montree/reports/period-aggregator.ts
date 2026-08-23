// lib/montree/reports/period-aggregator.ts
// Period aggregator — "where did each child spend time, and how did their
// work move" for one classroom over one week or one calendar month.
// Plan: docs/handoffs/PLAN_ALL_AREAS_REPORTS_AUG22.md §6.
//
// PURE DATA. No AI, no writes. The output (PeriodAggregate) is what the
// dashboard heatmap, the child cards, the docx/pptx derivations and the
// weekly-wrap fix all read — they are views over this one object.
//
// ─── SOURCES (all scoped to classroom + date range) ─────────────────────
//  1. montree_children               — active roster (children with no signal
//                                      still appear: "nowhere this week" is data).
//  2. montree_observation_sessions (336)     — PRIMARY frequency/time source.
//     FALLBACK: montree_paper_scan_extractions approved/edited rows (scans
//     committed before 336, or 336 not applied yet) — only when sessions has
//     zero rows for the range, to keep Work Rhythm parity.
//  3. montree_progress_events (314)   — status transitions.
//     FALLBACK: montree_child_progress (presented_at / mastered_at /
//     updated_at + status) when the journal is missing or silent.
//  4. montree_behavioral_observations — notes: count + last 3 snippets per child.
//  5. montree_media (+ _children)     — photo proxy, work → area hop, counted
//                                      as photo_moments, NEVER as minutes.
//  6. montree_classroom_curriculum_works — for next_works (sequence gap-fill,
//                                      reusing recommendNextWork from the
//                                      monthly summary builder).
//
// ─── MISSING TABLES ARE NOT ERRORS ──────────────────────────────────────
// Migrations here are pasted by hand, so this code must run before 336 (and
// 314) exist in prod. Every source read is wrapped: a relation-missing error
// (42P01 / 42703 / PGRST204 / PGRST205) or any other query error degrades to an
// empty slice and a line in `warnings[]`. The aggregate is always returned.

import type { UntypedClient } from '@/lib/supabase-client';
import { recommendNextWork, type WorkRef } from '@/lib/montree/weekly-admin/monthly-summary-builder';
import {
  AREA_ORDER,
  BUCKET_MINUTES,
  UNTIMED_SESSION_MINUTES,
  type AggregatePeriodInput,
  type AggregateSources,
  type AreaAggregate,
  type AreaKey,
  type ChildAggregate,
  type ClassAreaTotal,
  type Concentration,
  type MasteredWork,
  type PeriodAggregate,
  type PeriodBounds,
  type PeriodType,
  type ProgressStatus,
  type StatusTransition,
  type TimeBucket,
  type WorkTouch,
} from './period-types';

export * from './period-types';

// ───────────────────────── constants ─────────────────────────

const AREA_SET = new Set<string>(AREA_ORDER);
// Same aliases as work-rhythm: anything else is DROPPED, not guessed.
const AREA_ALIASES: Record<string, AreaKey> = { math: 'mathematics', culture: 'cultural' };

const STATUS_SET = new Set<string>(['presented', 'practicing', 'mastered']);
const BUCKET_SET = new Set<string>(['short', 'medium', 'long']);
const CONC_SET = new Set<string>(['wd', 'wc', 'dc']);

const NOTE_SNIPPETS = 3;
const NOTE_SNIPPET_MAX = 140;

// House convention: Supabase caps a range at 1000 rows; loop until short batch.
const PAGE_SIZE = 1000;
const ID_CHUNK = 500;

const MISSING_RELATION_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

// ───────────────────────── small helpers ─────────────────────────

export function normaliseArea(raw: string | null | undefined): AreaKey | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (AREA_SET.has(key)) return key as AreaKey;
  return AREA_ALIASES[key] ?? null;
}

function normaliseStatus(raw: string | null | undefined): ProgressStatus | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return STATUS_SET.has(s) ? (s as ProgressStatus) : null;
}

function normaliseBucket(raw: string | null | undefined): TimeBucket | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return BUCKET_SET.has(s) ? (s as TimeBucket) : null;
}

function normaliseConcentration(raw: string | null | undefined): Concentration | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  return CONC_SET.has(s) ? (s as Concentration) : null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toYMD(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function parseYMD(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) throw new Error(`period-aggregator: invalid date "${s}" (expected YYYY-MM-DD)`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** Date portion (YYYY-MM-DD) of an ISO timestamp, shifted by utcOffsetHours. */
function localDateOf(iso: string, utcOffsetHours: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  return toYMD(new Date(t + utcOffsetHours * 3_600_000));
}

function isMissingRelation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };
  if (typeof e.code === 'string' && MISSING_RELATION_CODES.has(e.code)) return true;
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  return msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('schema cache');
}

function errMessage(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  const e = err as { message?: unknown; code?: unknown };
  const code = typeof e.code === 'string' ? `${e.code}: ` : '';
  return code + (typeof e.message === 'string' ? e.message : JSON.stringify(err));
}

/** Estimated minutes for one session row. Exact > bucket midpoint × frequency > untimed default. */
export function estimateSessionMinutes(
  minutesEst: number | null | undefined,
  bucket: TimeBucket | null,
  frequency: number,
): number {
  if (typeof minutesEst === 'number' && minutesEst > 0) return Math.round(minutesEst);
  const f = Math.max(1, frequency);
  if (bucket) return BUCKET_MINUTES[bucket] * f;
  return UNTIMED_SESSION_MINUTES * f;
}

// ───────────────────────── period bounds ─────────────────────────

/**
 * Inclusive YYYY-MM-DD bounds of the period containing `anchorDate`.
 * week  → weekStartsOn (1 = Monday, default) … +6 days.
 * month → first … last day of the calendar month.
 * Pure UTC date arithmetic — no local-timezone surprises on the server.
 */
export function computePeriodBounds(
  periodType: PeriodType,
  anchorDate: string | Date,
  weekStartsOn: number = 1,
): PeriodBounds {
  const anchor = typeof anchorDate === 'string' ? parseYMD(anchorDate) : parseYMD(toYMD(anchorDate));
  if (periodType === 'month') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return { start: toYMD(start), end: toYMD(end) };
  }
  const wso = ((weekStartsOn % 7) + 7) % 7;
  const dow = anchor.getUTCDay(); // 0 = Sunday
  const back = (dow - wso + 7) % 7;
  const start = addDays(anchor, -back);
  return { start: toYMD(start), end: toYMD(addDays(start, 6)) };
}

// ───────────────────────── row shapes ─────────────────────────

interface RosterRow { id: string; name: string | null }

interface SessionRow {
  child_id: string | null;
  work_key: string | null;
  work_name: string | null;
  area: string | null;
  occurred_on: string | null;
  frequency: number | null;
  time_bucket: string | null;
  minutes_est: number | null;
  concentration: string | null;
  status_mark: string | null;
}

interface LegacyExtractionRow {
  id: string;
  child_id: string | null;
  work_key: string | null;
  work_name: string | null;
  work_name_raw: string | null;
  area: string | null;
  time_minutes: number | null;
  created_at: string;
  scan: { sheet_date: string | null } | Array<{ sheet_date: string | null }> | null;
}

interface EventRow {
  child_id: string;
  work_key: string | null;
  work_name: string;
  area: string | null;
  old_status: string | null;
  new_status: string;
  created_at: string;
}

interface ProgressRow {
  child_id: string;
  work_key: string | null;
  work_name: string;
  area: string | null;
  status: string | null;
  presented_at: string | null;
  mastered_at: string | null;
  updated_at: string | null;
}

interface ObservationRow {
  child_id: string;
  behavior_description: string | null;
  observed_at: string | null;
}

interface MediaRow { id: string; child_id: string | null; work_id: string | null }
interface MediaChildRow { media_id: string; child_id: string | null }
interface WorkRow {
  id: string;
  name: string | null;
  sequence: number | null;
  area: { area_key: string | null } | Array<{ area_key: string | null }> | null;
}

function relOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

// ───────────────────────── query wrapper ─────────────────────────

type QueryResult<T> = { data: T[] | null; error: unknown };

/**
 * Run one source read. Never throws: returns rows, or [] plus a warning.
 * `missing` is true when the relation does not exist (migration not applied).
 */
async function safeRead<T>(
  label: string,
  warnings: string[],
  run: () => PromiseLike<QueryResult<T>>,
): Promise<{ rows: T[]; missing: boolean; failed: boolean }> {
  try {
    const { data, error } = await run();
    if (error) {
      const missing = isMissingRelation(error);
      warnings.push(
        missing
          ? `${label}: table/column missing (migration not applied yet) — ${errMessage(error)}`
          : `${label}: query failed — ${errMessage(error)}`,
      );
      return { rows: [], missing, failed: true };
    }
    return { rows: (data ?? []) as T[], missing: false, failed: false };
  } catch (err) {
    const missing = isMissingRelation(err);
    warnings.push(`${label}: threw — ${errMessage(err)}`);
    return { rows: [], missing, failed: true };
  }
}

/** Paginated variant: `build(from, to)` returns the query for one page. */
async function safeReadAll<T>(
  label: string,
  warnings: string[],
  build: (from: number, to: number) => PromiseLike<QueryResult<T>>,
): Promise<{ rows: T[]; missing: boolean; failed: boolean }> {
  const all: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await safeRead<T>(label, warnings, () => build(offset, offset + PAGE_SIZE - 1));
    if (page.failed) return { rows: all, missing: page.missing, failed: true };
    all.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) break;
  }
  return { rows: all, missing: false, failed: false };
}

// ───────────────────────── accumulators ─────────────────────────

function emptyArea(): AreaAggregate {
  return { sessions: 0, minutes_est: 0, works: [], concentration: { wd: 0, wc: 0, dc: 0 }, photo_moments: 0 };
}

function emptyByArea(): Record<AreaKey, AreaAggregate> {
  const out = {} as Record<AreaKey, AreaAggregate>;
  for (const a of AREA_ORDER) out[a] = emptyArea();
  return out;
}

function emptyNextWorks(): Record<AreaKey, string | null> {
  const out = {} as Record<AreaKey, string | null>;
  for (const a of AREA_ORDER) out[a] = null;
  return out;
}

interface ChildAcc {
  child_id: string;
  name: string;
  by_area: Record<AreaKey, AreaAggregate>;
  /** area → work key (work_key ?? lowercased name) → touch */
  workIndex: Map<string, WorkTouch>;
  transitions: StatusTransition[];
  notes: string[];
  noteCount: number;
  /** lowercased work names touched ever (sessions + progress), for next_works */
  touchedEver: Map<AreaKey, Set<string>>;
}

function addSession(
  acc: ChildAcc,
  area: AreaKey,
  workKey: string | null,
  workName: string,
  frequency: number,
  minutes: number,
  concentration: Concentration | null,
): void {
  const a = acc.by_area[area];
  a.sessions += frequency;
  a.minutes_est += minutes;
  if (concentration) a.concentration[concentration] += 1;

  const idx = `${area}::${workKey ?? workName.trim().toLowerCase()}`;
  let touch = acc.workIndex.get(idx);
  if (!touch) {
    touch = { work_key: workKey, work_name: workName, sessions: 0, minutes_est: 0 };
    acc.workIndex.set(idx, touch);
    a.works.push(touch);
  }
  touch.sessions += frequency;
  touch.minutes_est += minutes;
  acc.touchedEver.get(area)?.add(workName.trim().toLowerCase());
}

// ───────────────────────── main ─────────────────────────

export async function aggregatePeriod(
  supabase: UntypedClient,
  input: AggregatePeriodInput,
): Promise<PeriodAggregate> {
  const { classroomId } = input;
  const utcOffsetHours = input.utcOffsetHours ?? 0;
  const includePhotos = input.includePhotos ?? true;
  const { start, end } = computePeriodBounds(input.periodType, input.periodStart);
  const warnings: string[] = [];

  // timestamptz filters: [start 00:00 local, end+1 00:00 local)
  const startTs = new Date(parseYMD(start).getTime() - utcOffsetHours * 3_600_000).toISOString();
  const endTs = new Date(addDays(parseYMD(end), 1).getTime() - utcOffsetHours * 3_600_000).toISOString();
  // Compare as instants, not strings: PostgREST returns timestamptz as
  // '2026-09-07T02:00:00.123456+00:00' (or with a non-UTC offset), which does
  // not sort lexicographically against a '...Z' ISO string.
  const startMs = Date.parse(startTs);
  const endMs = Date.parse(endTs);
  const inRangeTs = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return !Number.isNaN(t) && t >= startMs && t < endMs;
  };
  const tsMs = (iso: string): number => {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? 0 : t;
  };
  const inRangeDate = (ymd: string | null | undefined): boolean => !!ymd && ymd.slice(0, 10) >= start && ymd.slice(0, 10) <= end;

  const sources: AggregateSources = { sessions: 'none', transitions: 'none', photos: includePhotos ? 'none' : 'skipped', notes: 'none' };

  // ── 1. roster ────────────────────────────────────────────────────────
  const roster = await safeRead<RosterRow>('montree_children', warnings, () =>
    supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      // NULL-safe like app/api/montree/children/route.ts and the sheet printer:
      // older rows never had is_active set and must not vanish from the report.
      .neq('is_active', false)
      .order('name', { ascending: true }),
  );

  const byChild = new Map<string, ChildAcc>();
  const order: string[] = [];
  for (const row of roster.rows) {
    if (!row.id || byChild.has(row.id)) continue;
    const touchedEver = new Map<AreaKey, Set<string>>();
    for (const a of AREA_ORDER) touchedEver.set(a, new Set());
    byChild.set(row.id, {
      child_id: row.id,
      name: row.name || '',
      by_area: emptyByArea(),
      workIndex: new Map(),
      transitions: [],
      notes: [],
      noteCount: 0,
      touchedEver,
    });
    order.push(row.id);
  }
  const childIds = order;

  // ── 2. sessions (primary) ─────────────────────────────────────────────
  const sessions = await safeReadAll<SessionRow>('montree_observation_sessions', warnings, (from, to) =>
    supabase
      .from('montree_observation_sessions')
      .select('child_id, work_key, work_name, area, occurred_on, frequency, time_bucket, minutes_est, concentration, status_mark')
      .eq('classroom_id', classroomId)
      .gte('occurred_on', start)
      .lte('occurred_on', end)
      .order('occurred_on', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  let sessionRowsUsed = 0;
  for (const row of sessions.rows) {
    if (!row.child_id) continue;
    const acc = byChild.get(row.child_id);
    if (!acc) continue; // child left the classroom
    const area = normaliseArea(row.area);
    if (!area) continue;
    const workName = (row.work_name || '').trim();
    if (!workName) continue;
    const frequency = typeof row.frequency === 'number' && row.frequency >= 1 ? Math.round(row.frequency) : 1;
    const bucket = normaliseBucket(row.time_bucket);
    const minutes = estimateSessionMinutes(row.minutes_est, bucket, frequency);
    addSession(acc, area, row.work_key ?? null, workName, frequency, minutes, normaliseConcentration(row.concentration));
    sessionRowsUsed += 1;
  }
  if (sessionRowsUsed > 0) sources.sessions = 'sessions';

  // ── 2b. legacy extraction fallback (pre-336 scans / 336 not applied) ──
  if (sessionRowsUsed === 0) {
    // Filter on extraction created_at (widened by a day each side so a sheet
    // dated inside the period but scanned just outside is not lost), then
    // keep rows whose sheet_date ?? created_at falls inside the period.
    const wideStart = new Date(new Date(startTs).getTime() - 86_400_000).toISOString();
    const wideEnd = new Date(new Date(endTs).getTime() + 86_400_000).toISOString();
    const legacy = await safeReadAll<LegacyExtractionRow>('montree_paper_scan_extractions', warnings, (from, to) =>
      supabase
        .from('montree_paper_scan_extractions')
        .select('id, child_id, work_key, work_name, work_name_raw, area, time_minutes, created_at, scan:montree_paper_scans!scan_id(sheet_date)')
        .eq('classroom_id', classroomId)
        .in('review_status', ['approved', 'edited'])
        .not('child_id', 'is', null)
        .gte('created_at', wideStart)
        .lt('created_at', wideEnd)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    );
    let used = 0;
    for (const row of legacy.rows) {
      if (!row.child_id) continue;
      const acc = byChild.get(row.child_id);
      if (!acc) continue;
      const area = normaliseArea(row.area);
      if (!area) continue;
      const sheetDate = relOne(row.scan)?.sheet_date ?? null;
      const occurredOn = sheetDate ? sheetDate.slice(0, 10) : localDateOf(row.created_at, utcOffsetHours);
      if (!inRangeDate(occurredOn)) continue;
      const workName = (row.work_name || row.work_name_raw || '').trim();
      if (!workName) continue;
      const minutes = estimateSessionMinutes(row.time_minutes, null, 1);
      addSession(acc, area, row.work_key ?? null, workName, 1, minutes, null);
      used += 1;
    }
    if (used > 0) sources.sessions = 'legacy_extractions';
  }

  // ── 3. progress (all-time, roster-scoped) — fallback transitions + next_works ──
  // One query serves both: current status per work (touched-ever set for the
  // curriculum gap-fill) and the presented_at/mastered_at/updated_at stamps
  // used when the events journal is missing or silent.
  const progressRows: ProgressRow[] = [];
  if (childIds.length > 0) {
    for (const ids of chunk(childIds, ID_CHUNK)) {
      const page = await safeReadAll<ProgressRow>('montree_child_progress', warnings, (from, to) =>
        supabase
          .from('montree_child_progress')
          .select('child_id, work_key, work_name, area, status, presented_at, mastered_at, updated_at')
          .in('child_id', ids)
          .order('id', { ascending: true })
          .range(from, to),
      );
      progressRows.push(...page.rows);
      if (page.failed) break;
    }
  }
  for (const row of progressRows) {
    const acc = byChild.get(row.child_id);
    if (!acc) continue;
    const area = normaliseArea(row.area);
    const status = normaliseStatus(row.status);
    if (area && status && row.work_name) acc.touchedEver.get(area)?.add(row.work_name.trim().toLowerCase());
  }

  // ── 4. transitions: events journal, else progress fallback ───────────
  const events = await safeReadAll<EventRow>('montree_progress_events', warnings, (from, to) =>
    supabase
      .from('montree_progress_events')
      .select('child_id, work_key, work_name, area, old_status, new_status, created_at')
      .eq('classroom_id', classroomId)
      .gte('created_at', startTs)
      .lt('created_at', endTs)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  let eventTransitions = 0;
  for (const row of events.rows) {
    const acc = byChild.get(row.child_id);
    if (!acc) continue;
    const to = normaliseStatus(row.new_status);
    if (!to || !row.work_name) continue;
    acc.transitions.push({
      work_name: row.work_name,
      work_key: row.work_key ?? null,
      area: normaliseArea(row.area),
      from: row.old_status ?? null,
      to,
      at: row.created_at,
    });
    eventTransitions += 1;
  }

  if (eventTransitions > 0) {
    sources.transitions = 'events';
  } else {
    // Derive from current-state stamps. mastered_at in range → mastered;
    // presented_at in range → presented; updated_at in range & practicing → practicing.
    let derived = 0;
    for (const row of progressRows) {
      const acc = byChild.get(row.child_id);
      if (!acc || !row.work_name) continue;
      const area = normaliseArea(row.area);
      const base = { work_name: row.work_name, work_key: row.work_key ?? null, area, from: null as string | null };
      if (inRangeTs(row.mastered_at)) {
        acc.transitions.push({ ...base, from: 'practicing', to: 'mastered', at: row.mastered_at as string });
        derived += 1;
      }
      if (inRangeTs(row.presented_at)) {
        acc.transitions.push({ ...base, from: 'not_started', to: 'presented', at: row.presented_at as string });
        derived += 1;
      }
      if (
        normaliseStatus(row.status) === 'practicing' &&
        inRangeTs(row.updated_at) &&
        !inRangeTs(row.presented_at) &&
        !inRangeTs(row.mastered_at)
      ) {
        acc.transitions.push({ ...base, from: 'presented', to: 'practicing', at: row.updated_at as string });
        derived += 1;
      }
    }
    if (derived > 0) sources.transitions = 'progress_fallback';
    else if (events.missing) warnings.push('transitions: montree_progress_events missing and no progress stamps in range — transitions empty');
  }
  for (const acc of byChild.values()) acc.transitions.sort((a, b) => tsMs(a.at) - tsMs(b.at));

  // ── 5. notes ─────────────────────────────────────────────────────────
  if (childIds.length > 0) {
    let noteRows = 0;
    for (const ids of chunk(childIds, ID_CHUNK)) {
      const page = await safeReadAll<ObservationRow>('montree_behavioral_observations', warnings, (from, to) =>
        supabase
          .from('montree_behavioral_observations')
          .select('child_id, behavior_description, observed_at')
          .in('child_id', ids)
          .gte('observed_at', startTs)
          .lt('observed_at', endTs)
          .order('observed_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
      );
      for (const row of page.rows) {
        const acc = byChild.get(row.child_id);
        if (!acc) continue;
        acc.noteCount += 1;
        noteRows += 1;
        const text = (row.behavior_description || '').trim();
        if (text && acc.notes.length < NOTE_SNIPPETS) {
          acc.notes.push(text.length > NOTE_SNIPPET_MAX ? `${text.slice(0, NOTE_SNIPPET_MAX - 1)}…` : text);
        }
      }
      if (page.failed) break;
    }
    if (noteRows > 0) sources.notes = 'observations';
  }

  // ── 6. curriculum (next_works) + photo work→area hop ─────────────────
  const curriculum = await safeReadAll<WorkRow>('montree_classroom_curriculum_works', warnings, (from, to) =>
    supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, sequence, area:montree_classroom_curriculum_areas!area_id(area_key)')
      .eq('classroom_id', classroomId)
      .order('sequence', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  const workArea = new Map<string, AreaKey>();
  const curriculumByArea = new Map<AreaKey, WorkRef[]>();
  for (const a of AREA_ORDER) curriculumByArea.set(a, []);
  for (const w of curriculum.rows) {
    const area = normaliseArea(relOne(w.area)?.area_key);
    if (!area) continue;
    workArea.set(w.id, area);
    if (w.name) {
      const list = curriculumByArea.get(area) as WorkRef[];
      list.push({ id: w.id, name: w.name, sequence: typeof w.sequence === 'number' ? w.sequence : list.length });
    }
  }

  // ── 7. photos proxy ──────────────────────────────────────────────────
  if (includePhotos && childIds.length > 0) {
    const media = await safeReadAll<MediaRow>('montree_media', warnings, (from, to) =>
      supabase
        .from('montree_media')
        .select('id, child_id, work_id')
        .eq('classroom_id', classroomId)
        .gte('captured_at', startTs)
        .lt('captured_at', endTs)
        .not('work_id', 'is', null)
        .eq('teacher_confirmed', true)
        .or('identification_status.is.null,identification_status.neq.pending_review')
        .order('captured_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    );

    if (media.rows.length > 0) {
      const links = new Set<string>();
      const pairs: Array<{ mediaId: string; childId: string }> = [];
      const addPair = (mediaId: string, childId: string | null) => {
        if (!childId) return;
        const key = `${mediaId}:${childId}`;
        if (links.has(key)) return;
        links.add(key);
        pairs.push({ mediaId, childId });
      };
      for (const m of media.rows) addPair(m.id, m.child_id);

      for (const ids of chunk(media.rows.map((m) => m.id), ID_CHUNK)) {
        const junction = await safeReadAll<MediaChildRow>('montree_media_children', warnings, (from, to) =>
          supabase.from('montree_media_children').select('media_id, child_id').in('media_id', ids).order('id', { ascending: true }).range(from, to),
        );
        for (const row of junction.rows) addPair(row.media_id, row.child_id);
        if (junction.failed) break;
      }

      const areaOfMedia = new Map<string, AreaKey>();
      for (const m of media.rows) {
        const area = m.work_id ? workArea.get(m.work_id) : undefined;
        if (area) areaOfMedia.set(m.id, area);
      }
      let counted = 0;
      for (const pair of pairs) {
        const acc = byChild.get(pair.childId);
        const area = areaOfMedia.get(pair.mediaId);
        if (!acc || !area) continue;
        acc.by_area[area].photo_moments += 1;
        counted += 1;
      }
      if (counted > 0) sources.photos = 'media';
    }
  }

  // ── 8. assemble ──────────────────────────────────────────────────────
  const classTotals = {} as Record<AreaKey, ClassAreaTotal>;
  for (const a of AREA_ORDER) classTotals[a] = { sessions: 0, minutes_est: 0, children_active: 0 };
  const classMastered: MasteredWork[] = [];
  const heatmap: number[][] = [];

  const children: ChildAggregate[] = order.map((id) => {
    const acc = byChild.get(id) as ChildAcc;
    let totalSessions = 0;
    let totalMinutes = 0;
    let topArea: AreaKey | null = null;
    let topMinutes = 0;
    const row: number[] = [];

    for (const a of AREA_ORDER) {
      const area = acc.by_area[a];
      area.works.sort((x, y) => y.sessions - x.sessions || y.minutes_est - x.minutes_est || x.work_name.localeCompare(y.work_name));
      totalSessions += area.sessions;
      totalMinutes += area.minutes_est;
      if (area.sessions > 0) {
        classTotals[a].sessions += area.sessions;
        classTotals[a].minutes_est += area.minutes_est;
        classTotals[a].children_active += 1;
        // top area = most estimated minutes; ties → more sessions; still tied → fixed order
        const prevSessions = topArea ? acc.by_area[topArea].sessions : -1;
        if (area.minutes_est > topMinutes || (area.minutes_est === topMinutes && area.sessions > prevSessions)) {
          topMinutes = area.minutes_est;
          topArea = a;
        }
      }
      row.push(area.sessions);
    }
    heatmap.push(row);

    const statusCounts = { presented: 0, practicing: 0, mastered: 0 };
    for (const t of acc.transitions) {
      statusCounts[t.to] += 1;
      if (t.to === 'mastered') {
        classMastered.push({ child_id: acc.child_id, child_name: acc.name, work_name: t.work_name, work_key: t.work_key, area: t.area, at: t.at });
      }
    }

    const nextWorks = emptyNextWorks();
    for (const a of AREA_ORDER) {
      const list = curriculumByArea.get(a) ?? [];
      if (list.length === 0) continue;
      nextWorks[a] = recommendNextWork(acc.touchedEver.get(a) ?? new Set(), list);
    }

    return {
      child_id: acc.child_id,
      name: acc.name,
      by_area: acc.by_area,
      transitions: acc.transitions,
      status_counts: statusCounts,
      notes: { count: acc.noteCount, snippets: acc.notes },
      top_area: topArea,
      total_sessions: totalSessions,
      total_minutes_est: totalMinutes,
      next_works: nextWorks,
    };
  });

  classMastered.sort((a, b) => tsMs(a.at) - tsMs(b.at));

  return {
    classroom_id: classroomId,
    school_id: input.schoolId ?? null,
    period_type: input.periodType,
    period_start: start,
    period_end: end,
    generated_at: new Date().toISOString(),
    sources,
    areas: AREA_ORDER,
    children,
    class_totals: classTotals,
    class_mastered: classMastered,
    heatmap,
    warnings,
  };
}
