// lib/montree/montage-tracker/media.ts
//
// Montage Manager — the photo LIST behind the picker grid, plus per-child
// all-time photo totals for the child-grid badges.
//
// 🚨 WYSIWYG RULE. Everything in this file is parent_visible=true ONLY, and
// that is deliberate: the picker grid, the "you have N photos" badge and the
// film the worker finally renders must all agree on the same set. A photo the
// teacher hid from parents can never reach a montage (enforced again in
// enqueue.ts and three more times in the worker), so it must not be offered
// in the picker or counted in the badge either.
//
//   The COVERAGE BOARDS (coverage.ts) deliberately do the opposite — they
//   count every tagged photo regardless of parent_visible, because they answer
//   "did anyone photograph this child today?", not "what can go in a film?".
//   Do not "align" the two; the divergence is the design.
//
// 🚨 ZERO AI. No teacher_confirmed filter, no identification pipeline. Same
// contract as the rest of the tracker module.
//
// 🚨 Every paged read .order()s on a stable unique key set. The junction
// montree_media_children has no single unique column, so it is ordered on the
// (child_id, media_id) composite — the table's UNIQUE pair (migration 092).
// Without that, .range() page boundaries are undefined and rows are silently
// skipped or duplicated.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { exclusiveEndDate } from './weekRange';

/** Supabase caps a plain select at 1000 rows — page every unbounded read. */
const PAGE_SIZE = 1000;
/** Hard safety cap so a runaway loop can never hammer the DB (20k rows). */
const MAX_PAGES = 20;
/** Keep `in(...)` lists short enough to stay well inside the URL limit. */
const ID_CHUNK = 200;

/**
 * The picker never renders more than this many thumbnails. A teacher curating
 * 2,000 photos by hand is not a real workflow, and the montage's own `media_ids`
 * payload has to stay a sane size. Past the cap the response says so.
 */
export const MAX_PICKER_PHOTOS = 500;

export type MediaScope = 'child' | 'classroom' | 'event';

export interface PickerPhoto {
  id: string;
  storage_path: string;
  captured_at: string | null;
  /** The photo's PRIMARY tagged child (montree_media.child_id), may be null. */
  child_id: string | null;
}

export interface ListPhotosArgs {
  schoolId: string;
  scope: MediaScope;
  childId?: string | null;
  classroomId?: string | null;
  eventId?: string | null;
  /** Inclusive YYYY-MM-DD. Both absent = all-time. */
  dateStart?: string | null;
  /** Inclusive YYYY-MM-DD. Both absent = all-time. */
  dateEnd?: string | null;
}

export interface ListPhotosResult {
  photos: PickerPhoto[];
  /** Distinct photos found BEFORE the display cap. */
  total: number;
  /** True when `total` exceeded MAX_PICKER_PHOTOS and the list was trimmed. */
  truncated: boolean;
}

const SELECT_COLUMNS = 'id, storage_path, captured_at, child_id';

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** captured_at ASC, nulls last, id as the stable tiebreak. */
function sortForFilm(rows: PickerPhoto[]): PickerPhoto[] {
  return [...rows].sort((a, b) => {
    if (a.captured_at === b.captured_at) return a.id.localeCompare(b.id);
    if (!a.captured_at) return 1;
    if (!b.captured_at) return -1;
    return a.captured_at < b.captured_at ? -1 : 1;
  });
}

/**
 * The base predicate every scope shares: this school's parent-visible photos,
 * optionally bounded to an inclusive calendar range (expressed half-open so
 * the end day is fully covered). Dates are the teacher's LOCAL calendar days —
 * see the API route for why the client owns them.
 */
function baseQuery(
  supabase: SupabaseClient,
  args: Pick<ListPhotosArgs, 'schoolId' | 'dateStart' | 'dateEnd'>
) {
  let q = supabase
    .from('montree_media')
    .select(SELECT_COLUMNS)
    .eq('school_id', args.schoolId)
    .eq('media_type', 'photo')
    .eq('parent_visible', true);
  if (args.dateStart) q = q.gte('captured_at', `${args.dateStart}T00:00:00`);
  if (args.dateEnd) q = q.lt('captured_at', `${exclusiveEndDate(args.dateEnd)}T00:00:00`);
  return q;
}

/** Page a montree_media read that is already narrowed by an equality filter. */
async function pageMedia(
  build: () => ReturnType<typeof baseQuery>,
  sink: Map<string, PickerPhoto>
): Promise<void> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build()
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data || []) as PickerPhoto[];
    for (const row of rows) sink.set(row.id, row);
    if (rows.length < PAGE_SIZE) break;
  }
}

/**
 * Media ids this child is tagged in through the junction (group shots).
 * Ordered on the (child_id, media_id) composite: child_id is pinned by the
 * filter, so media_id is the unique tiebreaker within this child's rows.
 */
async function fetchJunctionMediaIds(
  supabase: SupabaseClient,
  childId: string
): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('montree_media_children')
      .select('media_id, child_id')
      .eq('child_id', childId)
      .order('child_id', { ascending: true })
      .order('media_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data || []) as Array<{ media_id: string }>;
    for (const row of rows) ids.push(row.media_id);
    if (rows.length < PAGE_SIZE) break;
  }
  return ids;
}

/**
 * List the photos a montage over this scope would draw from — the exact set
 * the picker grid renders and (after the teacher removes any) the exact set
 * the worker is handed as `media_ids`.
 *
 * Scope semantics MIRROR the worker's own SQL (montage-worker/src/db.ts
 * getScopedEligiblePhotos) so the grid and the film never disagree:
 *   child      — montree_media.child_id UNION the montree_media_children
 *                junction, deduped by media id (the bypass path's union).
 *   classroom  — montree_media.classroom_id equality (NOT the roster).
 *   event      — montree_media.event_id equality, no date range.
 *
 * Throws on a Supabase error so the route can map it to a status code
 * (42P01 / 42703 → 503, everything else → 500).
 */
export async function listScopePhotos(
  supabase: SupabaseClient,
  args: ListPhotosArgs
): Promise<ListPhotosResult> {
  const found = new Map<string, PickerPhoto>();

  if (args.scope === 'event') {
    // An event IS its own boundary — the worker ignores the date range for
    // this scope, so the picker must too or the grid would under-report.
    const eventId = args.eventId as string;
    await pageMedia(
      () => baseQuery(supabase, { schoolId: args.schoolId }).eq('event_id', eventId),
      found
    );
  } else if (args.scope === 'classroom') {
    const classroomId = args.classroomId as string;
    await pageMedia(() => baseQuery(supabase, args).eq('classroom_id', classroomId), found);
  } else {
    const childId = args.childId as string;
    // 1) Photos where she is the primary (first-tagged) child.
    await pageMedia(() => baseQuery(supabase, args).eq('child_id', childId), found);

    // 2) Photos she is tagged in via the junction (group shots). The junction
    //    carries no date/scope columns, so its media ids are re-filtered
    //    against montree_media with the identical predicates above.
    const taggedIds = (await fetchJunctionMediaIds(supabase, childId)).filter(
      (id) => !found.has(id)
    );
    for (const ids of chunkIds(taggedIds, ID_CHUNK)) {
      const { data, error } = await baseQuery(supabase, args).in('id', ids);
      if (error) throw error;
      for (const row of (data || []) as PickerPhoto[]) found.set(row.id, row);
    }
  }

  const all = sortForFilm([...found.values()]);
  return {
    photos: all.slice(0, MAX_PICKER_PHOTOS),
    total: all.length,
    truncated: all.length > MAX_PICKER_PHOTOS,
  };
}

/**
 * Per-child ALL-TIME parent-visible photo totals, for the child-grid badges.
 * Counted from BOTH tag sources and deduped per (child, media) pair, so the
 * badge matches what the child picker will actually show her.
 *
 * Scoped to one classroom when `classroomId` is given (a teacher only ever
 * sees her own room's tiles); school-wide otherwise (principal view).
 * Throws on a Supabase error, same contract as listScopePhotos.
 */
export async function childPhotoTotals(
  supabase: SupabaseClient,
  { schoolId, classroomId }: { schoolId: string; classroomId?: string | null }
): Promise<Record<string, number>> {
  // 1) Every parent-visible photo in the school, with its primary child.
  //    (school_id is the tenant boundary; classroom_id is NOT used to filter
  //    the media — a child can appear in a photo captured in another room, and
  //    the child-scope picker would show it, so the badge must count it too.)
  const media = new Map<string, string | null>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('montree_media')
      .select('id, child_id')
      .eq('school_id', schoolId)
      .eq('media_type', 'photo')
      .eq('parent_visible', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string; child_id: string | null }>;
    for (const row of rows) media.set(row.id, row.child_id ?? null);
    if (rows.length < PAGE_SIZE) break;
  }

  // 2) The roster we report totals for. Children with zero photos must still
  //    appear (as 0) so the grid can show the amber "needs N more" badge.
  const roster: string[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    let q = supabase
      .from('montree_children')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_active', true);
    if (classroomId) q = q.eq('classroom_id', classroomId);
    const { data, error } = await q
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string }>;
    for (const row of rows) roster.push(row.id);
    if (rows.length < PAGE_SIZE) break;
  }

  const known = new Set(roster);
  /** childId → set of media ids (the Set IS the dedupe). */
  const perChild = new Map<string, Set<string>>();
  const record = (childId: string | null | undefined, mediaId: string) => {
    if (!childId || !known.has(childId)) return;
    let set = perChild.get(childId);
    if (!set) { set = new Set<string>(); perChild.set(childId, set); }
    set.add(mediaId);
  };

  for (const [mediaId, childId] of media) record(childId, mediaId);

  // 3) Junction tags for those same photos (group shots), chunked + paged.
  //    Ordered on the (media_id, child_id) composite — the UNIQUE pair — for
  //    the same stable-paging reason as everywhere else in this module.
  for (const ids of chunkIds([...media.keys()], ID_CHUNK * 2)) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const { data, error } = await supabase
        .from('montree_media_children')
        .select('media_id, child_id')
        .in('media_id', ids)
        .order('media_id', { ascending: true })
        .order('child_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data || []) as Array<{ media_id: string; child_id: string }>;
      for (const row of rows) record(row.child_id, row.media_id);
      if (rows.length < PAGE_SIZE) break;
    }
  }

  const totals: Record<string, number> = {};
  for (const childId of roster) totals[childId] = perChild.get(childId)?.size ?? 0;
  return totals;
}

/**
 * Re-verify a teacher-supplied media id list before it becomes a job.
 * Keeps ONLY rows that are this school's parent-visible photos — the client
 * is never trusted with the safety gate. Returns the surviving ids in the
 * caller's original order, deduped.
 *
 * Throws on a Supabase error (the route maps 42P01/42703 → 503).
 */
export async function verifyMediaIds(
  supabase: SupabaseClient,
  { schoolId, mediaIds }: { schoolId: string; mediaIds: string[] }
): Promise<string[]> {
  const wanted = [...new Set(mediaIds)];
  if (wanted.length === 0) return [];

  const ok = new Set<string>();
  for (const ids of chunkIds(wanted, ID_CHUNK)) {
    const { data, error } = await supabase
      .from('montree_media')
      .select('id')
      .in('id', ids)
      .eq('school_id', schoolId)
      .eq('media_type', 'photo')
      .eq('parent_visible', true);
    if (error) throw error;
    for (const row of (data || []) as Array<{ id: string }>) ok.add(row.id);
  }
  return wanted.filter((id) => ok.has(id));
}
