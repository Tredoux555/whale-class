// lib/montree/montage-tracker/coverage.ts
//
// Montage Tracker — school-wide photo-coverage aggregation.
//
// "Covered" here means ONE thing: a photo exists in the range that this child
// is tagged in. There is NO AI in this path and NO teacher-confirmation gate —
// a photo counts the instant it is captured and tagged. (The AI
// identification / confirmation pipeline runs untouched in parallel; only
// confirmed photos flow into it. Nothing in this file reads or writes it.)
//
// Two tag sources, deduped per media row:
//   montree_media_children  — the multi-child tagging junction (group shots)
//   montree_media.child_id  — the first tagged child (fallback / single tags)
// A child tagged via BOTH on the same photo counts ONCE.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { exclusiveEndDate } from './weekRange';

/** Weekly goal: every child should appear in 8 photos per calendar week. */
export const WEEKLY_PHOTO_TARGET = 8;

export interface TrackerChild {
  id: string;
  name: string;
  photo_url: string | null;
  classroom_id: string | null;
  photo_count: number;
}

export interface TrackerClassroom {
  id: string;
  name: string;
  children: TrackerChild[];
}

export interface CoverageTotals {
  /** Active children in the school (across all classrooms). */
  children: number;
  /** How many of them have >= 1 photo in the range. */
  covered: number;
  /** Distinct photos in the range that are tagged with at least one child. */
  total_photos: number;
}

export interface CoverageResult {
  date_start: string;
  date_end: string;
  mode: 'daily' | 'weekly';
  classrooms: TrackerClassroom[];
  totals: CoverageTotals;
}

export interface BuildCoverageArgs {
  schoolId: string;
  /** Inclusive YYYY-MM-DD, in the teacher's local calendar. */
  dateStart: string;
  /** Inclusive YYYY-MM-DD, in the teacher's local calendar. */
  dateEnd: string;
  mode?: 'daily' | 'weekly';
}

// Supabase caps a plain select at 1000 rows. A busy school-week easily beats
// that, so every unbounded read below pages explicitly with .range().
//
// 🚨 Every paged read MUST .order() on a stable, unique-per-row key set —
// without one, page boundaries are undefined and rows are skipped or
// duplicated. montree_media_children has no single unique column, so it is
// ordered on (media_id, child_id) — the table's UNIQUE pair (migration 092),
// same as app/api/montree/dashboard/class-progress/route.ts.
const PAGE_SIZE = 1000;
/** Hard safety cap so a runaway loop can never hammer the DB (20k rows). */
const MAX_PAGES = 20;
/** Junction lookups are chunked so the `in(...)` list never blows the URL. */
const ID_CHUNK = 400;

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Every photo (media_type='photo') the school captured in the range.
 * NO teacher_confirmed filter and NO parent_visible filter — the tracker
 * measures what the teacher actually shot, not what has been reviewed.
 */
async function fetchMediaInRange(
  supabase: SupabaseClient,
  schoolId: string,
  dateStart: string,
  dateEnd: string
): Promise<Array<{ id: string; child_id: string | null }>> {
  const rows: Array<{ id: string; child_id: string | null }> = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('montree_media')
      .select('id, child_id')
      .eq('school_id', schoolId)
      .eq('media_type', 'photo')
      .gte('captured_at', `${dateStart}T00:00:00`)
      .lt('captured_at', `${exclusiveEndDate(dateEnd)}T00:00:00`)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const pageRows = (data || []) as Array<{ id: string; child_id: string | null }>;
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Multi-child tags for the given media ids, chunked + paged. */
async function fetchJunctionTags(
  supabase: SupabaseClient,
  mediaIds: string[]
): Promise<Array<{ media_id: string; child_id: string }>> {
  const rows: Array<{ media_id: string; child_id: string }> = [];
  for (const ids of chunk(mediaIds, ID_CHUNK)) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const { data, error } = await supabase
        .from('montree_media_children')
        .select('media_id, child_id')
        .in('media_id', ids)
        // (media_id, child_id) is the table's UNIQUE pair — media_id alone is
        // NOT stable across pages (a group shot has many rows per media_id).
        .order('media_id', { ascending: true })
        .order('child_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const pageRows = (data || []) as Array<{ media_id: string; child_id: string }>;
      rows.push(...pageRows);
      if (pageRows.length < PAGE_SIZE) break;
    }
  }
  return rows;
}

/**
 * The school's active roster. Paged for the same reason as everything else —
 * a large school (or a multi-campus school_id) can exceed 1000 children, and a
 * silently truncated roster would show phantom "full coverage".
 */
async function fetchRoster(
  supabase: SupabaseClient,
  schoolId: string
): Promise<Array<{ id: string; name: string | null; photo_url: string | null; classroom_id: string | null }>> {
  type Row = { id: string; name: string | null; photo_url: string | null; classroom_id: string | null };
  const rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('montree_children')
      .select('id, name, photo_url, classroom_id')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      // name is not unique — id is the tiebreaker that makes paging stable.
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const pageRows = (data || []) as Row[];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Build the school-wide coverage board: every classroom, every active child,
 * with the number of DISTINCT photos they appear in over the range.
 * Throws on a Supabase error so the route can map it to a status code.
 */
export async function buildCoverage(
  supabase: SupabaseClient,
  { schoolId, dateStart, dateEnd, mode = 'daily' }: BuildCoverageArgs
): Promise<CoverageResult> {
  // --- classrooms + children (school-wide: any teacher sees every room) ----
  // Classrooms are bounded (a school has tens, not thousands) so that read
  // stays a single query; the roster is paged.
  const [{ data: roomRows, error: roomErr }, children] = await Promise.all([
    supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('school_id', schoolId)
      .order('name'),
    fetchRoster(supabase, schoolId),
  ]);

  if (roomErr) throw roomErr;

  const rooms = (roomRows || []) as Array<{ id: string; name: string | null }>;

  // --- photo → child tags, deduped per media row --------------------------
  const media = await fetchMediaInRange(supabase, schoolId, dateStart, dateEnd);
  const tags = media.length
    ? await fetchJunctionTags(supabase, media.map((m) => m.id))
    : [];

  const knownChildIds = new Set(children.map((c) => c.id));
  /** childId → set of media ids (the Set IS the dedupe). */
  const perChild = new Map<string, Set<string>>();
  const countedMedia = new Set<string>();

  const record = (childId: string | null | undefined, mediaId: string) => {
    if (!childId || !knownChildIds.has(childId)) return;
    let set = perChild.get(childId);
    if (!set) { set = new Set<string>(); perChild.set(childId, set); }
    set.add(mediaId);
    countedMedia.add(mediaId);
  };

  for (const m of media) record(m.child_id, m.id);
  for (const tag of tags) record(tag.child_id, tag.media_id);

  // --- shape the board ----------------------------------------------------
  const byRoom = new Map<string, TrackerChild[]>();
  for (const room of rooms) byRoom.set(room.id, []);

  let covered = 0;
  for (const c of children) {
    const count = perChild.get(c.id)?.size ?? 0;
    if (count > 0) covered += 1;
    const entry: TrackerChild = {
      id: c.id,
      name: c.name || 'Child',
      photo_url: c.photo_url ?? null,
      classroom_id: c.classroom_id ?? null,
      photo_count: count,
    };
    // A child whose classroom was deleted/unset still belongs to the school —
    // give her a bucket so she never silently vanishes off the board.
    const key = c.classroom_id && byRoom.has(c.classroom_id) ? c.classroom_id : '__unassigned__';
    if (!byRoom.has(key)) byRoom.set(key, []);
    byRoom.get(key)!.push(entry);
  }

  const classrooms: TrackerClassroom[] = rooms.map((room) => ({
    id: room.id,
    name: room.name || 'Classroom',
    children: byRoom.get(room.id) || [],
  }));

  const unassigned = byRoom.get('__unassigned__') || [];
  if (unassigned.length > 0) {
    classrooms.push({ id: '__unassigned__', name: 'No classroom', children: unassigned });
  }

  return {
    date_start: dateStart,
    date_end: dateEnd,
    mode,
    classrooms,
    totals: {
      children: children.length,
      covered,
      total_photos: countedMedia.size,
    },
  };
}
