// Orchestrates one job end-to-end, with a hard per-job timeout and complete
// temp-file hygiene. Throws on real errors (caller records the failure);
// returns a result for normal outcomes (done / skipped).
//
// Trimmed from montree-worker/src/pipeline.ts to ONE path: a Potato Snaps job
// always carries an explicit, server-derived media_ids list. No report branch,
// no scope branch, no completion callback.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { makeCancelSignal } from '@remotion/renderer';
import type { WorkerConfig } from './config';
import { JOB_PHOTOS_DIR } from './config';
import type { MontageJob } from './db';
import { getChildName, markDone, markFailed } from './db';
import { fetchEligiblePhotos, downloadPhotos } from './media';
import { runHygiene, PhotoDecision } from './hygiene';
import { trackForReport } from './music';
import { renderMontage, killActiveFfmpeg } from './render';
import { uploadMontage } from './upload';
import type { MontageProps } from '../remotion/src/timing';

export type JobOutcome =
  | { outcome: 'done'; durationSec: number; storagePath: string }
  | { outcome: 'skipped'; reason: string };

/**
 * The API enforces >= 8 photos at enqueue (contract §5). By the time the
 * worker picks the job up a teacher may have deleted a few, so this is the
 * lower floor at which a film is still worth making. Below it the job is
 * recorded `failed` with a plain-English reason rather than rendering a
 * three-photo video.
 */
export const MIN_RENDER_PHOTOS = 4;

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

function jobWorkDir(jobId: string): string {
  return path.join(os.tmpdir(), `potato-${jobId}`);
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

// Remove any leftover /tmp/potato-* from a previous crashed run.
export function cleanupOrphanTemp(): void {
  const tmp = os.tmpdir();
  try {
    for (const name of fs.readdirSync(tmp)) {
      if (name.startsWith('potato-')) {
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
        // --- the child's name for the title card ---
        const childName = await getChildName(job.child_id, job.class_id);

        // --- eligible photos: the job's own curated set, re-verified ---
        const eligible = await fetchEligiblePhotos(job);
        if (eligible.length < MIN_RENDER_PHOTOS) {
          const reason =
            `Only ${eligible.length} of the ${job.media_ids?.length ?? 0} chosen photos are still there ` +
            `(need at least ${MIN_RENDER_PHOTOS}). Take a few more and try again.`;
          await markFailed(job.id, reason);
          return { outcome: 'skipped', reason } as JobOutcome;
        }

        const downloaded = await downloadPhotos(cfg, eligible);
        const { photos, decisions } = await runHygiene(downloaded);
        logDecisions(decisions);

        if (photos.length < MIN_RENDER_PHOTOS) {
          const reason =
            `Only ${photos.length} photos were usable after the blur/duplicate check ` +
            `(need at least ${MIN_RENDER_PHOTOS}). Take a few more and try again.`;
          await markFailed(job.id, reason);
          return { outcome: 'skipped', reason } as JobOutcome;
        }

        // --- write normalized photos into the render public dir ---
        const propPhotos: { file: string }[] = [];
        for (let i = 0; i < photos.length; i++) {
          const name = `${String(i).padStart(2, '0')}.jpg`;
          fs.writeFileSync(path.join(JOB_PHOTOS_DIR, name), photos[i].buffer);
          propPhotos.push({ file: `photos/job/${name}` });
        }

        // --- music track (rotates by ISO week of week_start) ---
        const { track, mp3 } = trackForReport(job.week_start);

        const firstCapturedAt = photos[0]?.capturedAt ?? null;
        const props: MontageProps = {
          childName: (childName ?? '').trim() || 'This Week',
          subtitle: formatSubtitle(job.week_start, firstCapturedAt),
          eyebrow: 'Potato Snaps',
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

        // --- upload + stamp the job row (the job row IS the pointer) ---
        const storagePath = await uploadMontage(cfg, {
          classId: job.class_id,
          childId: job.child_id,
          weekStart: job.week_start,
          jobId: job.id,
          mp4Path: render.mp4Path,
        });

        await markDone(job.id, storagePath);

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
