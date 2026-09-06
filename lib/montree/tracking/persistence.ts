// lib/montree/tracking/persistence.ts
//
// The ONLY place the pure engine meets Supabase.
//
// lib/montree/tracking/* is deliberately I/O-free: types, ledger, resolve,
// derive, summary and invariants reason about a `Ledger` object and nothing
// else, which is what lets tests/tracking play a whole simulated term in
// memory. This file is the adapter that BUILDS that Ledger out of real rows,
// and the one that pushes the engine's rebuilt current-status map back down.
//
//   loadLedger()           rows  → Ledger        (every reader/route uses this)
//   rebuildChildProgress() Ledger → montree_child_progress   (rule 3's cache)
//
// RULE 2 (ONE DOOR) NOTE: this file NEVER writes montree_child_progress
// itself. rebuildChildProgress computes the rebuilt rows with the engine and
// hands them to applyRebuiltProgress() in lib/montree/progress/write-progress.ts,
// which is the one sanctioned writer. The mirror of that rebuild also exists
// server-side as montree_rebuild_child_progress(uuid) (migration 346) for the
// nightly job; the two are kept deliberately equivalent.
//
// COLUMN TOLERANCE: migrations here are pasted by hand, so a deploy can be
// ahead of the database. Every optional column (events.reason, events.evidence_id,
// children.pronoun / children.gender) is selected optimistically and retried
// without it on Postgres 42703 (undefined_column) / 42P01 (undefined_table) —
// the same pattern write-progress.ts already uses for `reason`.

import type { getSupabase } from '@/lib/supabase-client';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { applyRebuiltProgress } from '@/lib/montree/progress/write-progress';
import { rebuildCurrent, sortEvents } from './ledger';
import type {
  Child,
  CurriculumWork,
  Ledger,
  ProgressEvent,
  Source,
  Status,
  WorkGroup,
} from './types';

type SupabaseClient = ReturnType<typeof getSupabase>;

const LIVE_LETTERS = TRACKER_LETTERS.filter((l) => l.status === 'live').map((l) => l.letter);

/** Postgres error codes we treat as "this environment is behind the code". */
const UNDEFINED_COLUMN = '42703';
const UNDEFINED_TABLE = '42P01';

interface Postgrestish {
  code?: string;
  message?: string;
}

function isMissingColumn(error: unknown): boolean {
  const e = error as Postgrestish | null;
  return !!e && (e.code === UNDEFINED_COLUMN || /column .* does not exist/i.test(e.message || ''));
}

function isMissingTable(error: unknown): boolean {
  const e = error as Postgrestish | null;
  return !!e && (e.code === UNDEFINED_TABLE || /relation .* does not exist/i.test(e.message || ''));
}

// ── vocabulary normalisation ────────────────────────────────────────────────
//
// Rule 3 names eight sources. The database has years of free-text values in
// that column ('photo_confirm', 'teacher_update', 'voice_observation', 'guru',
// 'paper_scan', …) written before the vocabulary existed. The engine's Source
// type is closed, and exactly ONE of its members has a behavioural consequence
// (`correction` is the only source allowed to move a child down the ladder), so
// mapping is safe as long as nothing unknown maps to 'correction'.

const SOURCE_ALIASES: Record<string, Source> = {
  tap: 'tap',
  teacher_update: 'tap',
  teacher_tap: 'tap',
  manual: 'tap',
  photo: 'photo',
  photo_confirm: 'photo',
  photo_audit: 'photo',
  paper_scan: 'photo',
  gallery: 'photo',
  ai: 'ai',
  guru: 'ai',
  ai_capture: 'ai',
  photo_insight: 'ai',
  voice_observation: 'ai',
  digital: 'digital',
  shelf_player: 'digital',
  book_works: 'digital',
  game: 'digital',
  live: 'live',
  live_lesson: 'live',
  class_recap: 'live',
  import: 'import',
  admin_import: 'import',
  onboarding: 'import',
  bulk: 'import',
  backfill: 'backfill',
  correction: 'correction',
  teacher_correction: 'correction',
};

/** Anything unrecognised becomes 'tap' — a human-ish observation that cannot downgrade. */
export function normaliseSource(raw: string | null | undefined): Source {
  const key = String(raw ?? '').trim().toLowerCase();
  return SOURCE_ALIASES[key] ?? 'tap';
}

const STATUSES: readonly Status[] = ['not_started', 'presented', 'practicing', 'mastered'];

/** 'completed' is migration 111's legacy alias for 'mastered'; anything else is not_started. */
export function normaliseStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'completed') return 'mastered';
  return (STATUSES as readonly string[]).includes(s) ? (s as Status) : 'not_started';
}

function nullableStatus(raw: string | null | undefined): Status | null {
  if (raw === null || raw === undefined || raw === '') return null;
  return normaliseStatus(raw);
}

/** Rule 1's key prefixes decide the shelf; everything else is narrated by nobody. */
export function groupOf(workKey: string): WorkGroup {
  if (workKey.startsWith('dp:')) return 'dark-phonics';
  if (workKey.startsWith('ws:')) return 'writing-shelf';
  return 'other';
}

export function pronounFrom(row: Record<string, unknown>): Child['pronoun'] {
  const explicit = String(row.pronoun ?? '').trim().toLowerCase();
  if (explicit === 'he' || explicit === 'she' || explicit === 'they') return explicit;
  const gender = String(row.gender ?? '').trim().toLowerCase();
  if (gender === 'boy' || gender === 'male' || gender === 'm') return 'he';
  if (gender === 'girl' || gender === 'female' || gender === 'f') return 'she';
  // Rule 11: nothing is guessed. No stated pronoun means 'they'.
  return 'they';
}

/** 'YYYY-MM-DD' of the Monday on or before `day` (UTC). */
export function mondayOf(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/** Every Monday from `from` to `to` inclusive, in order. Capped so a stray old row can't explode. */
export function weekStartsBetween(from: string, to: string, maxWeeks = 104): string[] {
  const first = mondayOf(from);
  const last = mondayOf(to);
  const out: string[] = [];
  const d = new Date(`${first}T00:00:00.000Z`);
  while (d.toISOString().slice(0, 10) <= last && out.length < maxWeeks) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  if (out.length === 0) out.push(last);
  return out;
}

export interface LoadLedgerOptions {
  classroomId: string;
  /** Narrow to specific children. Defaults to the classroom's active roster. */
  childIds?: string[];
  /** ISO timestamp or 'YYYY-MM-DD'; only events at or after it are loaded. */
  since?: string;
  /** The day the derivations are "as of" — defaults to today (UTC). */
  asOf?: string;
  /** Override the computed Monday list (tests, or a fixed reporting window). */
  weekStarts?: string[];
}

/**
 * Build the engine's Ledger for one classroom.
 *
 * Five reads, none of which may fail the whole load: a classroom with no
 * curriculum rows yet, no week letter set, or an environment where migration
 * 314 has not been pasted must still produce a usable (if empty) Ledger — the
 * tracker screen showing "nothing yet" is right, a 500 is not.
 */
export async function loadLedger(
  supabase: SupabaseClient,
  options: LoadLedgerOptions
): Promise<Ledger> {
  const { classroomId } = options;
  const asOf = (options.asOf ?? new Date().toISOString()).slice(0, 10);

  const children = await loadChildren(supabase, classroomId, options.childIds);
  const childIds = children.map((c) => c.id);
  const works = await loadWorks(supabase, classroomId);
  const events = childIds.length
    ? await loadEvents(supabase, childIds, options.since)
    : [];
  const classWeekLetter = await loadClassWeekLetter(supabase, classroomId);

  const earliest = events.length ? events[0].created_at.slice(0, 10) : asOf;
  const weekStarts = options.weekStarts ?? weekStartsBetween(earliest, asOf);

  return { events, works, children, classWeekLetter, weekStarts };
}

async function loadChildren(
  supabase: SupabaseClient,
  classroomId: string,
  childIds?: string[]
): Promise<Child[]> {
  // Optimistic → degrading select list. `pronoun` does not exist today;
  // `gender` (migration 119) does. Both are optional by design.
  const selects = ['id, name, pronoun, gender', 'id, name, gender', 'id, name'];
  for (const select of selects) {
    let query = supabase
      .from('montree_children')
      .select(select)
      .eq('classroom_id', classroomId)
      .eq('is_active', true);
    if (childIds && childIds.length > 0) query = query.in('id', childIds);
    const { data, error } = await query.order('name');
    if (error) {
      if (isMissingColumn(error)) continue;
      console.error('[persistence] children load failed:', error.message || error);
      return [];
    }
    const rows = (data || []) as unknown as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      pronoun: pronounFrom(row),
    }));
  }
  return [];
}

interface WorkRow {
  work_key: string | null;
  name: string | null;
  description?: string | null;
  sequence: number | null;
  area_id?: string | null;
}

async function loadWorks(
  supabase: SupabaseClient,
  classroomId: string
): Promise<CurriculumWork[]> {
  const { data, error } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('work_key, name, description, sequence, area_id')
    .eq('classroom_id', classroomId)
    .order('sequence');
  if (error) {
    console.error('[persistence] curriculum works load failed:', error.message || error);
    return [];
  }

  const rows = ((data || []) as unknown as WorkRow[]).filter((r) => !!r.work_key);
  const areaKeyById = await loadAreaKeys(supabase, classroomId);

  const seen = new Set<string>();
  const works: CurriculumWork[] = [];
  for (const row of rows) {
    const key = String(row.work_key);
    // Rule 1: one work, one key. A duplicated key in the table is a data bug the
    // invariants report; here the first (lowest sequence) row wins so reads stay stable.
    if (seen.has(key)) continue;
    seen.add(key);
    works.push({
      work_key: key,
      name: String(row.name ?? key),
      // Rule 1: the tray's material lives in `description`, never in the name.
      description: row.description == null ? null : String(row.description),
      area: areaKeyById.get(String(row.area_id ?? '')) ?? 'language',
      sequence: Number(row.sequence ?? 0),
      group: groupOf(key),
    });
  }
  return works;
}

async function loadAreaKeys(
  supabase: SupabaseClient,
  classroomId: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key')
    .eq('classroom_id', classroomId);
  if (error) return map;
  for (const row of (data || []) as unknown as { id: string; area_key: string }[]) {
    map.set(String(row.id), String(row.area_key ?? ''));
  }
  return map;
}

const EVENT_COLUMNS_FULL =
  'child_id, classroom_id, work_key, work_name, area, old_status, new_status, source, actor, created_at, reason, evidence_id';
const EVENT_COLUMNS_NO_EVIDENCE =
  'child_id, classroom_id, work_key, work_name, area, old_status, new_status, source, actor, created_at, reason';
const EVENT_COLUMNS_BASE =
  'child_id, classroom_id, work_key, work_name, area, old_status, new_status, source, actor, created_at';

/** Guard against a runaway read; a classroom-term is a few thousand rows at most. */
export const EVENT_LIMIT = 20000;

async function loadEvents(
  supabase: SupabaseClient,
  childIds: string[],
  since?: string
): Promise<ProgressEvent[]> {
  for (const columns of [EVENT_COLUMNS_FULL, EVENT_COLUMNS_NO_EVIDENCE, EVENT_COLUMNS_BASE]) {
    let query = supabase
      .from('montree_progress_events')
      .select(columns)
      .in('child_id', childIds);
    if (since) query = query.gte('created_at', since);
    const { data, error } = await query.order('created_at', { ascending: true }).limit(EVENT_LIMIT);
    if (error) {
      if (isMissingColumn(error)) continue;
      if (isMissingTable(error)) {
        console.warn('[persistence] montree_progress_events missing — run migration 314');
        return [];
      }
      console.error('[persistence] events load failed:', error.message || error);
      return [];
    }
    return sortEvents(((data || []) as unknown as Record<string, unknown>[]).map(toProgressEvent));
  }
  return [];
}

export function toProgressEvent(row: Record<string, unknown>): ProgressEvent {
  return {
    child_id: String(row.child_id),
    classroom_id: (row.classroom_id as string | null) ?? null,
    work_key: (row.work_key as string | null) || null,
    work_name: String(row.work_name ?? ''),
    area: (row.area as string | null) ?? null,
    old_status: nullableStatus(row.old_status as string | null),
    new_status: normaliseStatus(row.new_status as string | null),
    source: normaliseSource(row.source as string | null),
    actor: (row.actor as string | null) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    reason: (row.reason as string | null) ?? null,
    evidence_id: (row.evidence_id as string | null) ?? null,
  };
}

/** The class's Dark Phonics book this week; the first live letter when nobody has set one. */
export async function loadClassWeekLetter(
  supabase: SupabaseClient,
  classroomId: string
): Promise<string> {
  const fallback = LIVE_LETTERS[0] ?? 's';
  try {
    const { data, error } = await supabase
      .from('montree_class_dark_phonics_week')
      .select('letter')
      .eq('class_id', classroomId)
      .maybeSingle();
    if (error) {
      if (!isMissingTable(error)) {
        console.error('[persistence] class week letter load failed:', error.message || error);
      }
      return fallback;
    }
    const letter = (data as { letter?: string } | null)?.letter;
    return letter && LIVE_LETTERS.includes(letter) ? letter : (letter || fallback);
  } catch (err) {
    console.error('[persistence] class week letter load threw:', err);
    return fallback;
  }
}

// ── rule 3: the cache, rebuilt from the journal ─────────────────────────────

export interface RebuiltRow {
  child_id: string;
  work_name: string;
  work_key: string;
  area: string | null;
  status: Status;
  classroom_id: string | null;
  school_id: string | null;
  presented_at: string | null;
  mastered_at: string | null;
}

export interface RebuildResult {
  childId: string;
  rows: RebuiltRow[];
  written: number;
  error?: string;
}

/**
 * Recompute one child's montree_child_progress rows from montree_progress_events
 * alone (rule 3) and write them through the door.
 *
 * The journal is authoritative for STATUS. presented_at / mastered_at are the
 * first day each rung was reached, read off the journal too — so a rebuild
 * reproduces the same dates the original writes stamped rather than resetting
 * them to now.
 */
export async function rebuildChildProgress(
  supabase: SupabaseClient,
  childId: string,
  /** Injectable for tests; production always uses the door. */
  applyRows: (
    supabase: SupabaseClient,
    childId: string,
    rows: RebuiltRow[]
  ) => Promise<{ written: number; error?: string }> = applyRebuiltProgress
): Promise<RebuildResult> {
  const events = await loadEvents(supabase, [childId]);
  const rows = rebuiltRowsFor(childId, events);
  if (rows.length === 0) return { childId, rows, written: 0 };
  const { written, error } = await applyRows(supabase, childId, rows);
  return { childId, rows, written, error };
}

/** The pure half of the rebuild — everything the engine decides, no I/O. Tested directly. */
export function rebuiltRowsFor(childId: string, events: readonly ProgressEvent[]): RebuiltRow[] {
  const mine = sortEvents(events.filter((e) => e.child_id === childId && !!e.work_key));
  const current = rebuildCurrent(mine).get(childId) ?? new Map<string, Status>();

  const firstAt = new Map<string, { presented: string | null; mastered: string | null }>();
  const meta = new Map<string, { work_name: string; area: string | null; classroom_id: string | null }>();
  for (const e of mine) {
    const key = e.work_key as string;
    const stamps = firstAt.get(key) ?? { presented: null, mastered: null };
    if (!stamps.presented && e.new_status === 'presented') stamps.presented = e.created_at;
    if (!stamps.mastered && e.new_status === 'mastered') stamps.mastered = e.created_at;
    firstAt.set(key, stamps);
    // Last non-empty wins: a work renamed mid-term files under its current name.
    meta.set(key, {
      work_name: e.work_name || meta.get(key)?.work_name || key,
      area: e.area ?? meta.get(key)?.area ?? null,
      classroom_id: e.classroom_id ?? meta.get(key)?.classroom_id ?? null,
    });
  }

  const rows: RebuiltRow[] = [];
  for (const [workKey, status] of current) {
    const m = meta.get(workKey);
    const stamps = firstAt.get(workKey) ?? { presented: null, mastered: null };
    rows.push({
      child_id: childId,
      work_name: m?.work_name || workKey,
      work_key: workKey,
      area: m?.area ?? null,
      status,
      classroom_id: m?.classroom_id ?? null,
      school_id: null,
      presented_at: stamps.presented,
      // A work that jumped straight to mastered still has a mastery date.
      mastered_at: status === 'mastered' ? (stamps.mastered ?? null) : stamps.mastered,
    });
  }
  return rows.sort((a, b) => a.work_key.localeCompare(b.work_key));
}
