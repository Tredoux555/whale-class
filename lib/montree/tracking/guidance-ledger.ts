// lib/montree/tracking/guidance-ledger.ts
//
// The bridge between the tables that exist TODAY and the pure engine.
//
// lib/montree/tracking/persistence.ts (agent C) already loads a Ledger from
// the journal (montree_progress_events). Guidance cannot wait for the journal
// to be complete, though: every classroom running right now has years of
// status in montree_child_progress — the CACHE — and only recent rows in the
// journal. So this loader does exactly one extra thing:
//
//   for every (child, work) the journal does NOT mention, synthesise ONE
//   event from the cache row (status + updated_at, source 'import').
//
// The journal always wins where it speaks. The cache only fills silence, so
// turning the journal on for a classroom can never lose history, and rule 3
// ("current status is a cache of the journal") stays true of everything the
// engine reasons about.
//
// Rule 5 is respected: a cache row whose work cannot be resolved to a
// curriculum key is DROPPED, never guessed onto a neighbouring work.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { fetchAllRows, loadLedger } from './persistence';
import { normaliseName } from './resolve';
import type { CurriculumWork, Ledger, ProgressEvent, Status } from './types';

const VALID_STATUS = new Set<string>(['not_started', 'presented', 'practicing', 'mastered']);

export interface GuidanceLedgerOptions {
  classroomId: string;
  /** Narrow to specific children (a per-child replan loads one). */
  childIds?: string[];
  /** ISO timestamp the guidance is "as of". Defaults to now. */
  asOf?: string;
}

interface CacheRow {
  child_id: string;
  work_name: string | null;
  work_key: string | null;
  area: string | null;
  status: string | null;
  updated_at: string | null;
}

/** montree_child_progress → the events the journal is missing. */
export function synthesiseFromCache(
  rows: readonly CacheRow[],
  works: readonly CurriculumWork[],
  journalled: ReadonlySet<string>,
  fallbackTime: string
): ProgressEvent[] {
  const byKey = new Map(works.map((w) => [w.work_key, w]));
  const byName = new Map<string, CurriculumWork>();
  for (const w of works) {
    const n = normaliseName(w.name);
    // A duplicated name is ambiguous — rule 5 says never guess, so drop both.
    if (byName.has(n)) byName.set(n, null as unknown as CurriculumWork);
    else byName.set(n, w);
  }

  const out: ProgressEvent[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const status = String(row.status ?? '');
    if (!VALID_STATUS.has(status) || status === 'not_started') continue;

    const work =
      (row.work_key ? byKey.get(row.work_key) : undefined) ??
      byName.get(normaliseName(row.work_name ?? '')) ??
      undefined;
    if (!work) continue; // rule 5: no confident key → no write

    const pair = `${row.child_id}|${work.work_key}`;
    if (journalled.has(pair) || seen.has(pair)) continue;
    seen.add(pair);

    out.push({
      child_id: row.child_id,
      classroom_id: null,
      work_key: work.work_key,
      work_name: work.name,
      area: work.area,
      old_status: null,
      new_status: status as Status,
      source: 'import',
      actor: 'cache:montree_child_progress',
      created_at: row.updated_at || fallbackTime,
      reason: null,
      evidence_id: null,
    });
  }
  // Chronological, so a same-day dedupe behaves the same as a real journal.
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * The Ledger the guidance engine reads: journal first, current-status cache
 * only where the journal is silent. Never throws — a classroom with no
 * curriculum rows yet must produce an empty Ledger, not a 500.
 */
export async function loadGuidanceLedger(
  supabase: SupabaseClient,
  options: GuidanceLedgerOptions
): Promise<Ledger> {
  const asOf = options.asOf ?? new Date().toISOString();
  const ledger = await loadLedger(supabase, {
    classroomId: options.classroomId,
    childIds: options.childIds,
    asOf,
  });

  const childIds = options.childIds?.length
    ? options.childIds
    : ledger.children.map((c) => c.id);
  if (childIds.length === 0 || ledger.works.length === 0) return ledger;

  const journalled = new Set<string>();
  for (const e of ledger.events) {
    if (e.work_key) journalled.add(`${e.child_id}|${e.work_key}`);
  }

  // A class's cache is one row per (child, work): 30 children x 330 works is
  // ten thousand rows, so this read is over PostgREST's 1000-row ceiling by an
  // order of magnitude. Paged, with `id` as the tiebreak so the pages line up.
  let rows: CacheRow[] = [];
  try {
    const page = await fetchAllRows<CacheRow>((from, to) =>
      supabase
        .from('montree_child_progress')
        .select('child_id, work_name, work_key, area, status, updated_at')
        .in('child_id', childIds)
        .order('child_id')
        .order('id')
        .range(from, to),
    );
    rows = page.rows;
    if (page.error) {
      console.error('[guidance-ledger] progress cache read failed:', page.error.message || page.error);
    }
  } catch (err) {
    console.error('[guidance-ledger] progress cache read threw:', err);
  }

  const synthesised = synthesiseFromCache(rows, ledger.works, journalled, asOf);
  if (synthesised.length === 0) return ledger;
  return { ...ledger, events: [...ledger.events, ...synthesised] };
}
