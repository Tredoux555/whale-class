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
import { getReportMeta, markDone, markSkipped } from './db';
import { fetchEligiblePhotos, downloadPhotos } from './media';
import { runHygiene, MIN_PHOTOS, PhotoDecision } from './hygiene';
import { trackForReport } from './music';
import { renderMontage, killActiveFfmpeg } from './render';
import { uploadMontage } from './upload';
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
        // --- report metadata (title/subtitle + music rotation) ---
        const meta = await getReportMeta(job.report_id, job.child_id);

        // --- eligible photos (parent-visible re-asserted in media layer) ---
        const eligible = await fetchEligiblePhotos(job.report_id);
        if (eligible.length < MIN_PHOTOS) {
          await markSkipped(job.id);
          return {
            outcome: 'skipped',
            reason: `only ${eligible.length} eligible photos (< ${MIN_PHOTOS})`,
          } as JobOutcome;
        }

        const downloaded = await downloadPhotos(cfg, eligible);
        const { photos, decisions } = await runHygiene(downloaded);
        logDecisions(decisions);

        if (photos.length < MIN_PHOTOS) {
          await markSkipped(job.id);
          return {
            outcome: 'skipped',
            reason: `only ${photos.length} photos after hygiene (< ${MIN_PHOTOS})`,
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
        const { track, mp3 } = trackForReport(meta.week_start);

        const firstCapturedAt = photos[0]?.capturedAt ?? null;
        const props: MontageProps = {
          childName: (meta.child_name ?? '').trim() || 'This Week',
          subtitle: formatSubtitle(meta.week_start, firstCapturedAt),
          eyebrow: 'Weekly Moments',
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

        // --- upload + stamp report ---
        const storagePath = await uploadMontage(cfg, {
          schoolId: job.school_id,
          childId: job.child_id,
          reportId: job.report_id,
          mp4Path: render.mp4Path,
        });

        await markDone(job.id, storagePath, render.durationSec);

        // --- completion callback (skipped for staging jobs) ---
        if (!job.is_staging) {
          await notifyComplete(cfg, {
            report_id: job.report_id,
            child_id: job.child_id,
            school_id: job.school_id,
          });
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
