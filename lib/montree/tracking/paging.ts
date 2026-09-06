// lib/montree/tracking/paging.ts
//
// ONE loop, for the one thing PostgREST does silently.
//
// Split out of persistence.ts only to keep the module graph acyclic:
// persistence.ts imports write-progress.ts (rule 2 — the one sanctioned
// writer), so write-progress.ts cannot import persistence.ts back. Both import
// this. persistence.ts RE-EXPORTS fetchAllRows, so
// `import { fetchAllRows } from './persistence'` keeps working.

// ── PostgREST paging (the 1000-row ceiling) ─────────────────────────────────
//
// PostgREST answers EVERY request with at most the project's `max-rows`
// (1000 on Supabase), and it does so SILENTLY: no error, no truncation flag,
// and `.limit(5000)` does not raise it — it only lowers it. So any read whose
// result set can exceed 1000 rows for one classroom (or one school) has to ask
// for the rows a page at a time with `.range(from, to)` until a SHORT page
// proves the end of the table. This is what made today's tap vanish from the
// class grid after migration 347 backfilled the journal: the classroom's
// montree_progress_events passed 1000 rows, and the read silently kept the
// OLDEST 1000.
//
// fetchAllRows() is the one place that loop lives. The CALLER supplies a
// builder that applies its own select/filters/order, because the order is the
// part that must be right: paging is only coherent if consecutive requests see
// the same row order, so every builder MUST order by a primary sort PLUS `id`
// as a tiebreak. Every table read through here has an `id` UUID primary key.

/** PostgREST page size — Supabase's default max-rows. Never ask for more per request. */
export const PAGE_SIZE = 1000;

/** Default runaway guard. A classroom-term is a few thousand rows at most. */
export const MAX_ROWS = 20000;

/** Structurally a PostgrestError, without dragging the generic into every caller. */
export interface PagedError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/** What one page of a PostgREST query resolves to. */
export type PagedResponse = { data: unknown; error: PagedError | null };

/**
 * Read EVERY row a query matches, one `.range()` page at a time.
 *
 * `build(from, to)` must return a fresh builder each call — a supabase-js
 * builder is single-use and `.order()` mutates it, so re-awaiting one would
 * both re-issue the same page and pile the order clauses up.
 *
 * Stops at the first short page, at `max` rows, or at the first error — and an
 * error returns the pages already read alongside it, so a caller that would
 * rather degrade than fail can still see them.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<PagedResponse>,
  opts: { pageSize?: number; max?: number } = {},
): Promise<{ rows: T[]; error: PagedError | null }> {
  // Clamped to PAGE_SIZE: asking for a bigger page than the server will ever
  // return makes every page look "short" and stops the loop after page one.
  const pageSize = Math.max(1, Math.min(PAGE_SIZE, opts.pageSize ?? PAGE_SIZE));
  const max = Math.max(0, opts.max ?? MAX_ROWS);
  const rows: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const to = Math.min(from + pageSize, max) - 1;
    const { data, error } = await build(from, to);
    if (error) return { rows, error };
    const page = (data || []) as unknown as T[];
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }
  return { rows, error: null };
}

