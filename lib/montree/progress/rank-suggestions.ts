// lib/montree/progress/rank-suggestions.ts
//
// The ranking behind the "Suggested" chip row in the "This is…" sheet
// (components/montree/photo-audit/ThisIsSheet.tsx), served by
// GET /api/montree/progress/recent-works.
//
// Pure functions only — no Supabase, no Next, no clock. The route does the
// (bounded, school-scoped) reads and hands the rows in; everything that
// decides WHICH works a teacher sees lives here so tests/progress can assert
// it without a database. See tests/progress/recent-works-ranking.test.ts.
//
// READ PATH (Tracking Constitution rule 8 — everything a human reads is
// derived): the counts come from montree_progress_events, the append-only
// journal, NOT from identification_status or any AI artefact. A work is
// "tagged" as many times as the journal says it was.
//
// THE RULE, in one breath:
//   • rank the works THIS child has journal rows for, most rows first,
//     most-recent-row first on a tie, name as the final tiebreak;
//   • 'all' bucket — only when the child has fewer than 3 such works, top up
//     from the classroom's most-tagged works in the same window;
//   • an area bucket — top up from the classroom in that area whenever the
//     bucket is short, and then from the area's curriculum in shelf order, so
//     tapping an area pill can never land on an empty row;
//   • never more than 8, never a work that is not live curriculum.

/** How many chips the Suggested row shows at most. */
export const SUGGESTION_LIMIT = 8;

/** Below this many of the child's own works, the classroom tops up the 'all' bucket. */
export const CHILD_MIN_BEFORE_CLASSROOM = 3;

/** Lookback for both the child and the classroom tallies. */
export const SUGGESTION_WINDOW_WEEKS = 8;

/** The sentinel area key for "every area" — the first pill in the sheet. */
export const ALL_AREA_KEY = 'all';

/** A live classroom curriculum work, projected to just what ranking needs. */
export interface SuggestionWork {
  id: string;
  /** Permanent key (constitution rule 1). Null on legacy rows; name is then the only join. */
  work_key: string | null;
  name: string;
  area_key: string;
  area_label: string;
  /** Shelf order within the area — the curriculum top-up order. */
  sequence: number;
}

/** One journal row, projected to just what ranking needs. */
export interface SuggestionEvent {
  work_key: string | null;
  work_name: string | null;
  created_at: string;
}

export interface RankedSuggestion {
  id: string;
  name: string;
  /** Canonical area key, e.g. 'practical_life'. */
  area_key: string;
  /** What the school calls that area, for display. */
  area_label: string;
  /** Journal rows in the window. 0 for a pure curriculum top-up. */
  count: number;
  /** Where the chip came from — useful for debugging, ignored by the UI. */
  reason: 'child' | 'classroom' | 'curriculum';
}

/** count + the most recent occurrence (epoch ms), keyed by curriculum work id. */
export type Tally = Map<string, { count: number; last: number }>;

interface WorkIndex {
  byKey: Map<string, SuggestionWork>;
  byName: Map<string, SuggestionWork>;
}

function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function indexWorks(works: readonly SuggestionWork[]): WorkIndex {
  const byKey = new Map<string, SuggestionWork>();
  const byName = new Map<string, SuggestionWork>();
  for (const w of works) {
    if (w.work_key && !byKey.has(w.work_key)) byKey.set(w.work_key, w);
    const n = normaliseName(w.name || '');
    if (n && !byName.has(n)) byName.set(n, w);
  }
  return { byKey, byName };
}

/**
 * Resolve a journal row to a LIVE curriculum work — key first (rule 1: names
 * are for people, keys for the system), name as the legacy fallback. A row we
 * cannot resolve is dropped: a suggestion you cannot tag with is worse than
 * no suggestion.
 */
function resolveEvent(event: SuggestionEvent, index: WorkIndex): SuggestionWork | null {
  if (event.work_key) {
    const hit = index.byKey.get(event.work_key);
    if (hit) return hit;
  }
  const n = normaliseName(event.work_name || '');
  if (n) {
    const hit = index.byName.get(n);
    if (hit) return hit;
  }
  return null;
}

/** Count journal rows per curriculum work, remembering the most recent one. */
export function tallyEvents(
  events: readonly SuggestionEvent[],
  works: readonly SuggestionWork[],
  index?: WorkIndex
): Tally {
  const idx = index ?? indexWorks(works);
  const tally: Tally = new Map();
  for (const e of events) {
    const work = resolveEvent(e, idx);
    if (!work) continue;
    const at = Date.parse(e.created_at || '');
    const seen = tally.get(work.id);
    if (seen) {
      seen.count += 1;
      if (Number.isFinite(at) && at > seen.last) seen.last = at;
    } else {
      tally.set(work.id, { count: 1, last: Number.isFinite(at) ? at : 0 });
    }
  }
  return tally;
}

/** count desc → most recent first → name A-Z. Deterministic for a given input. */
function rankTallied(works: readonly SuggestionWork[], tally: Tally): SuggestionWork[] {
  return works
    .filter((w) => tally.has(w.id))
    .sort((a, b) => {
      const ta = tally.get(a.id)!;
      const tb = tally.get(b.id)!;
      if (tb.count !== ta.count) return tb.count - ta.count;
      if (tb.last !== ta.last) return tb.last - ta.last;
      return a.name.localeCompare(b.name);
    });
}

/** Shelf order within an area: sequence asc, then name, so the fill is stable. */
function shelfOrder(works: readonly SuggestionWork[]): SuggestionWork[] {
  return works.slice().sort((a, b) => {
    const sa = Number.isFinite(a.sequence) ? a.sequence : Number.MAX_SAFE_INTEGER;
    const sb = Number.isFinite(b.sequence) ? b.sequence : Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });
}

export interface RankOptions {
  /** Live classroom curriculum. */
  works: readonly SuggestionWork[];
  /** This child's journal rows in the window, tallied. */
  childTally: Tally;
  /** The classroom's journal rows in the window, tallied. */
  classroomTally: Tally;
  /**
   * 'all'  — every area; classroom tops up ONLY when the child has fewer than
   *          CHILD_MIN_BEFORE_CLASSROOM works of their own, and the curriculum
   *          never tops up (an empty row here honestly means "nothing yet").
   * 'area' — one area pill; classroom tops up whenever the bucket is short and
   *          the area's curriculum fills the rest, so the row is never empty.
   */
  mode: 'all' | 'area';
  /** Restrict to this canonical area key. Ignored in 'all' mode. */
  area?: string | null;
  limit?: number;
}

export function rankSuggestions(opts: RankOptions): RankedSuggestion[] {
  const limit = opts.limit ?? SUGGESTION_LIMIT;
  const scoped =
    opts.mode === 'area' && opts.area && opts.area !== ALL_AREA_KEY
      ? opts.works.filter((w) => w.area_key === opts.area)
      : opts.works.slice();

  const out: RankedSuggestion[] = [];
  const seen = new Set<string>();
  const push = (w: SuggestionWork, count: number, reason: RankedSuggestion['reason']) => {
    if (seen.has(w.id) || out.length >= limit) return;
    seen.add(w.id);
    out.push({ id: w.id, name: w.name, area_key: w.area_key, area_label: w.area_label, count, reason });
  };

  // 1. The child's own history — the whole point of the row.
  const childRanked = rankTallied(scoped, opts.childTally);
  for (const w of childRanked) push(w, opts.childTally.get(w.id)!.count, 'child');

  // 2. The classroom, on the rules above.
  const classroomAllowed =
    opts.mode === 'area' ? out.length < limit : childRanked.length < CHILD_MIN_BEFORE_CLASSROOM;
  if (classroomAllowed) {
    for (const w of rankTallied(scoped, opts.classroomTally)) {
      push(w, opts.classroomTally.get(w.id)!.count, 'classroom');
    }
  }

  // 3. The shelf itself — area pills only, so a pill never opens on nothing.
  if (opts.mode === 'area' && out.length < limit) {
    for (const w of shelfOrder(scoped)) push(w, 0, 'curriculum');
  }

  return out;
}

/**
 * Every bucket in one pass: the 'all' row plus one row per area, in the
 * curriculum's own order. The sheet fetches this once and switches pills with
 * zero network.
 */
export function buildAreaBuckets(opts: {
  works: readonly SuggestionWork[];
  childTally: Tally;
  classroomTally: Tally;
  /** Canonical area keys in curriculum (shelf) order. */
  areaKeys: readonly string[];
  limit?: number;
}): Record<string, RankedSuggestion[]> {
  const buckets: Record<string, RankedSuggestion[]> = {
    [ALL_AREA_KEY]: rankSuggestions({
      works: opts.works,
      childTally: opts.childTally,
      classroomTally: opts.classroomTally,
      mode: 'all',
      limit: opts.limit,
    }),
  };
  for (const key of opts.areaKeys) {
    buckets[key] = rankSuggestions({
      works: opts.works,
      childTally: opts.childTally,
      classroomTally: opts.classroomTally,
      mode: 'area',
      area: key,
      limit: opts.limit,
    });
  }
  return buckets;
}
