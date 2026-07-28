// lib/montree/montage/enqueue.ts
//
// Shared helper both report-send routes call to queue a weekly-report photo
// montage render. A separate Railway worker drains montree_montage_jobs.
//
// 🚨 This is an ENHANCEMENT, never a blocker. Every failure is swallowed and
// logged — a montage that can't be queued must never affect report delivery.
// Pre-migration (301 not yet run) the jobs table is absent → every path
// 42P01s → we catch and return silently.
//
// Rules:
//   - NO school-level gate (Jul 2026): "Week in Film" is a STANDARD feature of
//     every classroom's weekly report, not an admin-toggled extra. The legacy
//     montree_schools.montage_enabled column is deprecated and no longer read
//     anywhere (see migrations/303_montage_always_on.sql).
//   - A report needs >= 8 eligible photos (confirmed, parent-visible photos
//     linked to the report) or no job is queued. This is the ONLY gate.
//   - The job upsert IGNORES duplicates on report_id, so a re-send never
//     resets an already-queued/rendering/done job (regenerate has its own route).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

const MIN_ELIGIBLE_PHOTOS = 8;

// --- Scoped montage thresholds (Montage Studio, migration 304) -----------
// A classroom / child montage covers a date range and should feel like a
// proper little film — same 8-photo floor as the weekly report montage.
// An EVENT is by nature a smaller, denser set (one afternoon of art camp),
// so it gets a lower floor. Both are exported so the API route can tell the
// teacher exactly how many more photos she needs.
export const MIN_SCOPED_PHOTOS = 8;
export const MIN_EVENT_PHOTOS = 4;

export type MontageScopeType = 'classroom' | 'child' | 'event';
export type MontageKind = 'daily' | 'weekly' | 'custom';

export function minPhotosForScope(scopeType: MontageScopeType): number {
  return scopeType === 'event' ? MIN_EVENT_PHOTOS : MIN_SCOPED_PHOTOS;
}

interface MontageReportInput {
  reportId: string;
  childId: string;
  classroomId?: string | null;
}

interface MaybeEnqueueArgs {
  schoolId: string;
  reports: MontageReportInput[];
}

/**
 * Count the eligible photos for a report.
 *
 * The curated photo set for a PARENT report lives in
 * montree_weekly_reports.content->'photos' (a jsonb array of
 * { id, url, caption, work_name, captured_at }) — NOT montree_report_media
 * (verified against prod: the junction only ever holds teacher-draft rows).
 * We take those photo ids and count how many are confirmed, parent-visible
 * photos in montree_media. Eligible = a confirmed, parent-visible photo
 * (not a video).
 */
async function countEligiblePhotos(
  supabase: SupabaseClient,
  reportId: string
): Promise<number> {
  // 1) Pull the report's curated photo id set from content->photos.
  const { data: report, error: rErr } = await supabase
    .from('montree_weekly_reports')
    .select('content')
    .eq('id', reportId)
    .maybeSingle();

  if (rErr) {
    console.error('[montage/enqueue] report content lookup failed:', rErr.message);
    return 0;
  }
  const rawPhotos = ((report as { content?: { photos?: unknown } } | null)?.content?.photos);
  const photosArr = Array.isArray(rawPhotos) ? rawPhotos : [];
  const ids = [
    ...new Set(
      photosArr
        .map((p) => (p as { id?: unknown } | null)?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  if (ids.length < MIN_ELIGIBLE_PHOTOS) return ids.length; // cheap early-out

  // 2) Of those, how many are confirmed, parent-visible photos.
  const { count, error: mErr } = await supabase
    .from('montree_media')
    .select('id', { count: 'exact', head: true })
    .in('id', ids)
    .eq('media_type', 'photo')
    .eq('teacher_confirmed', true)
    .eq('parent_visible', true);

  if (mErr) {
    console.error('[montage/enqueue] media eligibility lookup failed:', mErr.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Best-effort: queue montage jobs for every passed report that has enough
 * eligible photos. Standard for all schools — no opt-in. Never throws.
 */
export async function maybeEnqueueMontageJobs(
  supabase: SupabaseClient,
  { schoolId, reports }: MaybeEnqueueArgs
): Promise<void> {
  try {
    if (!schoolId || !reports || reports.length === 0) return;

    for (const report of reports) {
      try {
        if (!report?.reportId || !report?.childId) continue;

        const eligibleCount = await countEligiblePhotos(supabase, report.reportId);
        if (eligibleCount < MIN_ELIGIBLE_PHOTOS) continue;

        const { error: upsertErr } = await supabase
          .from('montree_montage_jobs')
          .upsert(
            {
              report_id: report.reportId,
              child_id: report.childId,
              school_id: schoolId,
              classroom_id: report.classroomId ?? null,
              status: 'queued',
            },
            { onConflict: 'report_id', ignoreDuplicates: true }
          );

        if (upsertErr) {
          console.error('[montage/enqueue] job upsert failed:', upsertErr.message);
        }
      } catch (perReportErr) {
        console.error('[montage/enqueue] per-report error (non-fatal):', perReportErr);
      }
    }
  } catch (err) {
    // The whole function is decorative — never let it surface.
    console.error('[montage/enqueue] unexpected error (non-fatal):', err);
  }
}

interface RequeueArgs {
  reportId: string;
  childId: string;
  schoolId: string;
  classroomId?: string | null;
}

/**
 * Best-effort: the report's curated photo set changed, so any montage already
 * queued/rendered for it is stale — reset the job to a fresh 'queued' state so
 * the worker re-renders it (same reset shape as POST
 * /api/montree/reports/weekly-wrap/montage). A job that is mid-render is left
 * alone; the teacher's explicit "regenerate film" button covers that case.
 * Still honours the >= 8 eligible photos rule. Never throws to the caller.
 */
export async function requeueMontageJob(
  supabase: SupabaseClient,
  { reportId, childId, schoolId, classroomId }: RequeueArgs
): Promise<void> {
  try {
    if (!reportId || !childId || !schoolId) return;

    const eligibleCount = await countEligiblePhotos(supabase, reportId);
    if (eligibleCount < MIN_ELIGIBLE_PHOTOS) return;

    // Don't disturb a render in flight.
    const { data: existing, error: existErr } = await supabase
      .from('montree_montage_jobs')
      .select('status')
      .eq('report_id', reportId)
      .maybeSingle();

    if (existErr) {
      // 42P01 pre-migration and any other lookup failure — never a blocker.
      console.error('[montage/enqueue] requeue job lookup failed (non-fatal):', existErr.message);
      return;
    }
    if ((existing as { status?: string } | null)?.status === 'rendering') return;

    const { error: upsertErr } = await supabase
      .from('montree_montage_jobs')
      .upsert(
        {
          report_id: reportId,
          child_id: childId,
          school_id: schoolId,
          classroom_id: classroomId ?? null,
          status: 'queued',
          attempts: 0,
          error: null,
          next_attempt_at: null,
          output_path: null,
          finished_at: null,
        },
        { onConflict: 'report_id' }
      );

    if (upsertErr) {
      console.error('[montage/enqueue] requeue upsert failed:', upsertErr.message);
    }
  } catch (err) {
    console.error('[montage/enqueue] requeue unexpected error (non-fatal):', err);
  }
}

// =========================================================================
// Scoped montages (Montage Studio — migration 304)
// =========================================================================
// Unlike the report montage, a scoped montage has NO curated photo list: the
// eligible set is read straight off montree_media with the same three safety
// filters the worker re-asserts (media_type='photo', teacher_confirmed=true,
// parent_visible=true) plus the scope filter.
//
// Unlike maybeEnqueueMontageJobs(), this one is teacher-initiated and its
// result is SHOWN to her, so it returns a structured outcome instead of
// swallowing everything: she needs to know "found 3, need 8".

export interface EnqueueScopedArgs {
  schoolId: string;
  classroomId: string | null;
  scopeType: MontageScopeType;
  childId?: string | null;
  eventId?: string | null;
  kind: MontageKind;
  /** Inclusive YYYY-MM-DD. Required for classroom/child, optional for event. */
  dateStart?: string | null;
  /** Inclusive YYYY-MM-DD. Required for classroom/child, optional for event. */
  dateEnd?: string | null;
  title: string;
  /**
   * Montage Tracker only (migration 305). When false, the teacher_confirmed
   * filter is DROPPED — the tracker counts every tagged photo the moment it
   * is captured. parent_visible=true is still enforced here AND re-asserted
   * in the worker. Defaults to true, so every existing caller is unchanged.
   */
  requireConfirmed?: boolean;
}

export interface EnqueueScopedResult {
  ok: boolean;
  jobId?: string;
  photoCount: number;
  minPhotos: number;
  reason?: string;
}

/**
 * Count the photos a scoped montage would draw from.
 *
 * 🚨 parent_visible=true is NON-NEGOTIABLE and is re-asserted again in the
 * worker (montage-worker/src/media.ts). A photo that is not parent-visible
 * must never reach a rendered film.
 *
 * teacher_confirmed=true is the default and applies to every existing caller.
 * ONLY the Montage Tracker (args.requireConfirmed === false, migration 305)
 * drops it, because a tracker montage is explicitly built from all tagged
 * photos regardless of whether the teacher has reviewed them yet.
 *
 * Date range: `captured_at` is a timestamptz, `dateStart`/`dateEnd` are plain
 * calendar dates supplied by the CLIENT in the teacher's own local timezone
 * (see the route for why). We bound with >= dateStart and < dateEnd+1day so
 * the end date is inclusive without needing a timezone-aware cast.
 */
async function countScopedPhotos(
  supabase: SupabaseClient,
  args: EnqueueScopedArgs
): Promise<number> {
  // Montage Tracker child montages count group shots too — see
  // countTrackerChildPhotos(). Every other path is untouched.
  if (args.requireConfirmed === false && args.scopeType === 'child' && args.childId) {
    return countTrackerChildPhotos(supabase, args, args.childId);
  }

  let query = supabase
    .from('montree_media')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', args.schoolId)
    .eq('media_type', 'photo')
    .eq('parent_visible', true);

  if (args.requireConfirmed !== false) {
    query = query.eq('teacher_confirmed', true);
  }

  if (args.scopeType === 'event') {
    query = query.eq('event_id', args.eventId as string);
  } else if (args.scopeType === 'child') {
    query = query.eq('child_id', args.childId as string);
  } else {
    query = query.eq('classroom_id', args.classroomId as string);
  }

  if (args.dateStart) query = query.gte('captured_at', `${args.dateStart}T00:00:00`);
  if (args.dateEnd) query = query.lt('captured_at', `${exclusiveEnd(args.dateEnd)}T00:00:00`);

  const { count, error } = await query;
  if (error) {
    console.error('[montage/enqueue] scoped photo count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

// --- Montage Tracker child counting --------------------------------------
// The tracker's boards count a child's photos from BOTH tag sources — the
// montree_media_children junction (group shots) and montree_media.child_id
// (the first tagged child) — so a child montage built from the tracker has to
// draw from the same union, or the board says "8 photos" while the montage
// says "found 3". The worker's scoped query mirrors this exact union for
// require_confirmed=false child jobs (montage-worker/src/db.ts).
//
// 🚨 Bypass path ONLY (requireConfirmed === false + scope 'child'). Every
// other caller keeps the plain child_id equality it has always used.
// parent_visible=true is still applied here and re-asserted in the worker.

/** Supabase caps a plain select at 1000 rows — page every unbounded read. */
const MEDIA_PAGE_SIZE = 1000;
/** Hard safety cap so a runaway loop can never hammer the DB (20k rows). */
const MEDIA_MAX_PAGES = 20;
/** Keep `in(...)` lists short enough to stay well inside the URL limit. */
const MEDIA_ID_CHUNK = 200;

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/**
 * Count DISTINCT photos a tracker child montage would draw from:
 * photos whose child_id is this child, UNION photos tagged with her through
 * montree_media_children. Deduped by media id.
 * Returns 0 on any lookup failure (same contract as countScopedPhotos).
 */
async function countTrackerChildPhotos(
  supabase: SupabaseClient,
  args: EnqueueScopedArgs,
  childId: string
): Promise<number> {
  // Same filters as the non-bypass query minus teacher_confirmed, applied to
  // BOTH halves of the union so the two agree on scope and date range.
  const baseQuery = () => {
    let q = supabase
      .from('montree_media')
      .select('id')
      .eq('school_id', args.schoolId)
      .eq('media_type', 'photo')
      .eq('parent_visible', true);
    if (args.dateStart) q = q.gte('captured_at', `${args.dateStart}T00:00:00`);
    if (args.dateEnd) q = q.lt('captured_at', `${exclusiveEnd(args.dateEnd)}T00:00:00`);
    return q;
  };

  const mediaIds = new Set<string>();

  try {
    // 1) Photos where she is the primary (first-tagged) child.
    //    🚨 .order() on a UNIQUE key is required for correct .range() paging —
    //    without a stable sort, page boundaries are undefined and rows are
    //    skipped or duplicated.
    for (let page = 0; page < MEDIA_MAX_PAGES; page++) {
      const from = page * MEDIA_PAGE_SIZE;
      const { data, error } = await baseQuery()
        .eq('child_id', childId)
        .order('id', { ascending: true })
        .range(from, from + MEDIA_PAGE_SIZE - 1);
      if (error) {
        console.error('[montage/enqueue] tracker child count failed:', error.message);
        return 0;
      }
      const pageRows = (data || []) as Array<{ id: string }>;
      for (const row of pageRows) mediaIds.add(row.id);
      if (pageRows.length < MEDIA_PAGE_SIZE) break;
    }

    // 2) Photos she is tagged in via the junction (group shots). The junction
    //    carries no date/scope columns, so its media ids are re-filtered
    //    against montree_media with the identical predicates above.
    //    Ordered on (child_id, media_id): child_id is fixed by the filter, so
    //    media_id is the unique tiebreaker within this child's rows — the same
    //    composite-order rule as the class-progress junction pagination.
    const taggedIds: string[] = [];
    for (let page = 0; page < MEDIA_MAX_PAGES; page++) {
      const from = page * MEDIA_PAGE_SIZE;
      const { data, error } = await supabase
        .from('montree_media_children')
        .select('media_id, child_id')
        .eq('child_id', childId)
        .order('child_id', { ascending: true })
        .order('media_id', { ascending: true })
        .range(from, from + MEDIA_PAGE_SIZE - 1);
      if (error) {
        console.error('[montage/enqueue] tracker junction lookup failed:', error.message);
        return 0;
      }
      const pageRows = (data || []) as Array<{ media_id: string }>;
      for (const row of pageRows) {
        if (!mediaIds.has(row.media_id)) taggedIds.push(row.media_id);
      }
      if (pageRows.length < MEDIA_PAGE_SIZE) break;
    }

    for (const ids of chunkIds(taggedIds, MEDIA_ID_CHUNK)) {
      const { data, error } = await baseQuery().in('id', ids);
      if (error) {
        console.error('[montage/enqueue] tracker tagged-media filter failed:', error.message);
        return 0;
      }
      for (const row of (data || []) as Array<{ id: string }>) mediaIds.add(row.id);
    }

    return mediaIds.size;
  } catch (err) {
    console.error('[montage/enqueue] tracker child count unexpected error:', err);
    return 0;
  }
}

/** YYYY-MM-DD -> the next calendar day, so an inclusive end date can be
 *  expressed as a half-open `< end+1` bound. */
function exclusiveEnd(dateEnd: string): string {
  const d = new Date(`${dateEnd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateEnd;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Queue a classroom / child / event montage. Inserts a fresh row (scoped jobs
 * have no natural unique key — the API route handles duplicate suppression by
 * looking for an identical active job first).
 */
export async function enqueueScopedMontage(
  supabase: SupabaseClient,
  args: EnqueueScopedArgs
): Promise<EnqueueScopedResult> {
  const minPhotos = minPhotosForScope(args.scopeType);
  try {
    const photoCount = await countScopedPhotos(supabase, args);
    if (photoCount < minPhotos) {
      return { ok: false, photoCount, minPhotos, reason: 'insufficient_photos' };
    }

    // Migration 305. The column is only written when it differs from the
    // DB default (true), so a school that has not run 305 yet keeps the
    // existing Montage Studio path working byte-for-byte — only a TRACKER
    // job (requireConfirmed=false) hits the missing column and degrades to
    // the usual clean 'not_migrated' 503.
    const requireConfirmedPatch =
      args.requireConfirmed === false ? { require_confirmed: false } : {};

    const { data, error } = await supabase
      .from('montree_montage_jobs')
      .insert({
        report_id: null,
        child_id: args.scopeType === 'child' ? args.childId ?? null : null,
        school_id: args.schoolId,
        classroom_id: args.classroomId ?? null,
        event_id: args.scopeType === 'event' ? args.eventId ?? null : null,
        scope_type: args.scopeType,
        montage_kind: args.kind,
        date_start: args.dateStart ?? null,
        date_end: args.dateEnd ?? null,
        title: args.title,
        status: 'queued',
        ...requireConfirmedPatch,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.error('[montage/enqueue] scoped insert failed:', error?.message);
      return {
        ok: false,
        photoCount,
        minPhotos,
        reason: error?.code === '42P01' || error?.code === '42703' ? 'not_migrated' : 'insert_failed',
      };
    }

    return { ok: true, jobId: data.id as string, photoCount, minPhotos };
  } catch (err) {
    console.error('[montage/enqueue] scoped unexpected error:', err);
    return { ok: false, photoCount: 0, minPhotos, reason: 'insert_failed' };
  }
}
