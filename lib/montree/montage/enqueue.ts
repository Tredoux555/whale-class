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
