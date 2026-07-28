// Orchestrates one job end-to-end, with a hard per-job timeout and complete
// temp-file hygiene. Throws on real errors (caller records the failure);
// returns a result for normal outcomes (done / skipped).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { makeCancelSignal } from '@remotion/renderer';
import type { WorkerConfig } from './config';
import { JOB_PHOTOS_DIR } from './config';
import type { MontageJob } from './db';
import { getReportMeta, getScopedJobMeta, isReportJob, markDone, markSkipped } from './db';
import { fetchEligiblePhotos, fetchScopedEligiblePhotos, downloadPhotos } from './media';
import { runHygiene, MIN_PHOTOS, PhotoDecision } from './hygiene';
import { trackForReport } from './music';
import { renderMontage, killActiveFfmpeg } from './render';
import { uploadMontage, uploadScopedMontage } from './upload';
import { notifyComplete } from './callback';
import type { MontageProps } from '../remotion/src/timing';

export type JobOutcome =
  | { outcome: 'done'; durationSec: number; storagePath: string }
  | { outcome: 'skipped'; reason: string };

const MONTH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatSubtitle(
  weekStart: string | null,
  firstCapturedAt: string | null
): string {
  if (weekStart) {
    const d = new Date(weekStart);
    if (!Number.isNaN(d.getTime())) {
      return `Week of ${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`;
    }
  }
  if (firstCapturedAt) {
    const d = new Date(firstCapturedAt);
    if (!Number.isNaN(d.getTime())) {
      return `${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }
  }
  return 'This Week';
}

// --- scoped montage helpers (migration 304) ------------------------------

// An event is a single occasion, often a couple of hours of one afternoon —
// demanding 8 keepers there would make the feature unusable. Everything else
// keeps the report montage's floor untouched.
export const MIN_EVENT_PHOTOS = 4;

export function minPhotosForJob(job: MontageJob): number {
  return job.scope_type === 'event' ? MIN_EVENT_PHOTOS : MIN_PHOTOS;
}

function prettyDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "July 28" for a single day, "July 22 – July 28" for a range. */
export function formatScopedSubtitle(
  dateStart: string | null,
  dateEnd: string | null,
  fallback: string
): string {
  if (dateStart && dateEnd) {
    return dateStart === dateEnd
      ? prettyDate(dateStart)
      : `${prettyDate(dateStart)} – ${prettyDate(dateEnd)}`;
  }
  if (dateStart) return prettyDate(dateStart);
  if (dateEnd) return prettyDate(dateEnd);
  return fallback;
}

export function eyebrowForJob(job: MontageJob): string {
  if (job.montage_kind === 'daily') return 'Daily Montage';
  if (job.montage_kind === 'weekly') return 'Weekly Montage';
  return 'Montage';
}

/** The entity a scoped montage's storage path is keyed on. */
function scopeIdForJob(job: MontageJob): string {
  if (job.scope_type === 'event') return job.event_id ?? job.id;
  if (job.scope_type === 'child') return job.child_id ?? job.id;
  return job.classroom_id ?? job.school_id;
}

function jobWorkDir(jobId: string): string {
  return path.join(os.tmpdir(), `montage-${jobId}`);
}

function wipeDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function resetJobPhotos(): void {
  wipeDir(JOB_PHOTOS_DIR);
  fs.mkdirSync(JOB_PHOTOS_DIR, { recursive: true });
}

// Remove any leftover /tmp/montage-* from a previous crashed run.
export function cleanupOrphanTemp(): void {
  const tmp = os.tmpdir();
  try {
    for (const name of fs.readdirSync(tmp)) {
      if (name.startsWith('montage-')) {
        wipeDir(path.join(tmp, name));
      }
    }
  } catch {
    /* ignore */
  }
  resetJobPhotos();
}

async function withTimeout<T>(
  ms: number,
  work: (signal: { cancelled: boolean }) => Promise<T>,
  onTimeout: () => void
): Promise<T> {
  const state = { cancelled: false };
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      state.cancelled = true;
      onTimeout();
      reject(new Error(`job exceeded ${Math.round(ms / 60000)}-minute timeout`));
    }, ms);
  });
  try {
    return await Promise.race([work(state), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function processJob(
  cfg: WorkerConfig,
  job: MontageJob
): Promise<JobOutcome> {
  const workDir = jobWorkDir(job.id);
  wipeDir(workDir);
  fs.mkdirSync(workDir, { recursive: true });
  resetJobPhotos();

  const { cancelSignal, cancel } = makeCancelSignal();

  try {
    return await withTimeout(
      cfg.jobTimeoutMs,
      async () => {
        // Migration 304: 'report' keeps the exact pre-304 path; every other
        // scope reads its photos straight off montree_media.
        const reportJob = isReportJob(job);
        const minPhotos = reportJob ? MIN_PHOTOS : minPhotosForJob(job);

        // --- metadata (title/subtitle + music rotation) ---
        const meta = reportJob
          ? await getReportMeta(job.report_id as string, job.child_id as string)
          : null;
        const scopedMeta = reportJob ? null : await getScopedJobMeta(job);

        // --- eligible photos (parent-visible re-asserted in media layer) ---
        const eligible = reportJob
          ? await fetchEligiblePhotos(job.report_id as string)
          : await fetchScopedEligiblePhotos(job);
        if (eligible.length < minPhotos) {
          await markSkipped(job.id);
          return {
            outcome: 'skipped',
            reason: `only ${eligible.length} eligible photos (< ${minPhotos})`,
          } as JobOutcome;
        }

        const downloaded = await downloadPhotos(cfg, eligible);
        const { photos, decisions } = await runHygiene(downloaded);
        logDecisions(decisions);

        if (photos.length < minPhotos) {
          await markSkipped(job.id);
          return {
            outcome: 'skipped',
            reason: `only ${photos.length} photos after hygiene (< ${minPhotos})`,
          } as JobOutcome;
        }

        // --- write normalized photos into the render public dir ---
        const propPhotos: { file: string }[] = [];
        for (let i = 0; i < photos.length; i++) {
          const name = `${String(i).padStart(2, '0')}.jpg`;
          fs.writeFileSync(path.join(JOB_PHOTOS_DIR, name), photos[i].buffer);
          propPhotos.push({ file: `photos/job/${name}` });
        }

        // --- music track (rotates by ISO week) ---
        // Report jobs rotate on the report's week_start; scoped jobs rotate on
        // their range start (falls back to "now" inside trackForReport).
        const rotationAnchor = reportJob ? meta!.week_start : job.date_start;
        const { track, mp3 } = trackForReport(rotationAnchor);

        const firstCapturedAt = photos[0]?.capturedAt ?? null;
        const props: MontageProps = reportJob
          ? {
              childName: (meta!.child_name ?? '').trim() || 'This Week',
              subtitle: formatSubtitle(meta!.week_start, firstCapturedAt),
              eyebrow: 'Weekly Moments',
              photos: propPhotos,
              track,
            }
          : {
              childName: scopedMeta!.title,
              subtitle: formatScopedSubtitle(
                job.date_start,
                job.date_end,
                formatSubtitle(null, firstCapturedAt)
              ),
              eyebrow: eyebrowForJob(job),
              photos: propPhotos,
              track,
            };

        // --- render ---
        const render = await renderMontage({
          cfg,
          props,
          mp3Path: mp3,
          workDir,
          concurrency: cfg.renderConcurrency,
          cancelSignal,
        });

        // --- upload + stamp the pointer row ---
        const storagePath = reportJob
          ? await uploadMontage(cfg, {
              schoolId: job.school_id,
              childId: job.child_id as string,
              reportId: job.report_id as string,
              mp4Path: render.mp4Path,
            })
          : await uploadScopedMontage(cfg, {
              schoolId: job.school_id,
              scopeType: job.scope_type,
              scopeId: scopeIdForJob(job),
              jobId: job.id,
              mp4Path: render.mp4Path,
            });

        await markDone(job.id, storagePath, render.durationSec);

        // --- completion callback (skipped for staging jobs) ---
        // Report jobs drive the parent push. Scoped jobs just acknowledge —
        // the route 200s without any report lookup or push.
        if (!job.is_staging) {
          await notifyComplete(
            cfg,
            reportJob
              ? {
                  report_id: job.report_id as string,
                  child_id: job.child_id as string,
                  school_id: job.school_id,
                }
              : {
                  job_id: job.id,
                  scope_type: job.scope_type,
                  school_id: job.school_id,
                }
          );
        }

        return {
          outcome: 'done',
          durationSec: render.durationSec,
          storagePath,
        } as JobOutcome;
      },
      () => {
        // On timeout: cancel the chrome render + kill any ffmpeg child.
        try {
          cancel();
        } catch {
          /* ignore */
        }
        killActiveFfmpeg();
      }
    );
  } finally {
    wipeDir(workDir);
    resetJobPhotos();
  }
}

function logDecisions(decisions: PhotoDecision[]): void {
  const kept = decisions.filter((d) => d.kept).length;
  const dropped = decisions.filter((d) => !d.kept);
  console.log(`[hygiene] kept ${kept}, dropped ${dropped.length}`);
  for (const d of dropped) {
    console.log(`[hygiene]   drop ${d.id}: ${d.reason}`);
  }
}
