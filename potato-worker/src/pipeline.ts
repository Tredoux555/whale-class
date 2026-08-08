// Orchestrates one job end-to-end, with a hard per-job timeout and complete
// temp-file hygiene. Throws on real errors (caller records the failure);
// returns a result for normal outcomes (done / skipped).
//
// Trimmed from montree-worker/src/pipeline.ts to ONE photo source: a Potato
// Snaps job always carries an explicit, server-validated media_ids list. No
// report branch, no scope branch, no completion callback.
//
// v1.1 adds a second JOB KIND, not a second photo source:
//   kind='child' — one child's week, hygiene-filtered, <= 20 photos, ~50s.
//   kind='class' — the whole class's week, teacher-curated, 8..40 photos,
//                  ~1m50s–2m30s, curated hygiene (no photo is ever dropped).
// Both render through the identical Remotion -> ffmpeg pipeline and both get
// the branded end card.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { makeCancelSignal } from '@remotion/renderer';
import type { WorkerConfig } from './config';
import { JOB_PHOTOS_DIR } from './config';
import type { MontageJob, MontageJobKind } from './db';
import { getChildName, getClassRow, jobKind, markDone, markFailed } from './db';
import { fetchEligiblePhotos, downloadPhotos } from './media';
import { runHygiene, PhotoDecision, MAX_CLASS_PHOTOS } from './hygiene';
import { prepareBranding, resetJobBranding } from './branding';
import { trackForReport } from './music';
import { renderMontage, killActiveFfmpeg } from './render';
import { uploadMontage } from './upload';
import type { MontageProps } from '../remotion/src/timing';

export type JobOutcome =
  | { outcome: 'done'; durationSec: number; storagePath: string }
  | { outcome: 'skipped'; reason: string };

/**
 * The API enforces >= 8 photos at enqueue (contract §5). By the time the
 * worker picks a CHILD job up a teacher may have deleted a few, so this is the
 * lower floor at which a film is still worth making. Below it the job is
 * recorded `failed` with a plain-English reason rather than rendering a
 * three-photo video.
 */
export const MIN_RENDER_PHOTOS = 4;

/**
 * A class film is held to its enqueue floor instead. The picker validated
 * 8..40 photos AND that every active child appears in one of them; letting a
 * heavily-pruned selection through would quietly ship a "class film" that is
 * no longer the thing the teacher approved.
 */
export const MIN_CLASS_RENDER_PHOTOS = 8;

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

export function minPhotosForKind(kind: MontageJobKind): number {
  return kind === 'class' ? MIN_CLASS_RENDER_PHOTOS : MIN_RENDER_PHOTOS;
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

/** Clear BOTH per-job public dirs — photos and branding. */
function resetJobAssets(): void {
  wipeDir(JOB_PHOTOS_DIR);
  fs.mkdirSync(JOB_PHOTOS_DIR, { recursive: true });
  resetJobBranding();
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
  resetJobAssets();
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
  const kind = jobKind(job);
  const isClass = kind === 'class';
  const workDir = jobWorkDir(job.id);
  wipeDir(workDir);
  fs.mkdirSync(workDir, { recursive: true });
  resetJobAssets();

  const { cancelSignal, cancel } = makeCancelSignal();
  // A class film is 3300–4450 frames against a child film's ~1500.
  const timeoutMs = isClass ? cfg.classJobTimeoutMs : cfg.jobTimeoutMs;
  const minPhotos = minPhotosForKind(kind);

  try {
    return await withTimeout(
      timeoutMs,
      async () => {
        // A child job with no child_id is malformed — fail it clearly rather
        // than rendering a nameless film. (Cannot happen for kind='class'.)
        if (!isClass && !job.child_id) {
          const reason =
            'This film is missing its child. Try making it again from the board.';
          await markFailed(job.id, reason);
          return { outcome: 'skipped', reason } as JobOutcome;
        }

        // --- eligible photos: the job's own curated set, re-verified ---
        // Checked BEFORE any branding work so a job that is going to skip
        // never downloads a logo it will not use.
        const eligible = await fetchEligiblePhotos(job);
        if (eligible.length < minPhotos) {
          const reason = isClass
            ? `Only ${eligible.length} of the ${job.media_ids?.length ?? 0} chosen photos are still there ` +
              `(a class film needs at least ${minPhotos}). Pick the week again.`
            : `Only ${eligible.length} of the ${job.media_ids?.length ?? 0} chosen photos are still there ` +
              `(need at least ${minPhotos}). Take a few more and try again.`;
          await markFailed(job.id, reason);
          return { outcome: 'skipped', reason } as JobOutcome;
        }

        const downloaded = await downloadPhotos(cfg, eligible);
        // 🚨 Curated mode for class films: no blur gate, no near-dupe collapse.
        // Dropping a hand-picked photo could drop the only shot a child is in.
        const { photos, decisions } = await runHygiene(
          downloaded,
          isClass ? { maxPhotos: MAX_CLASS_PHOTOS, curated: true } : {}
        );
        logDecisions(decisions);

        if (photos.length < minPhotos) {
          const reason =
            `Only ${photos.length} photos were usable ` +
            `(need at least ${minPhotos}). Take a few more and try again.`;
          await markFailed(job.id, reason);
          return { outcome: 'skipped', reason } as JobOutcome;
        }

        // --- class row: the film's own name + the white-label lockup ---
        // getClassRow uses SELECT * and never throws, so a pre-migration
        // database (no branding columns) simply yields undefined for them.
        // prepareBranding likewise degrades to an initials mark rather than
        // failing a film that is otherwise perfectly renderable.
        const classRow = await getClassRow(job.class_id);
        const branding = await prepareBranding(cfg, {
          classRow,
          weekStart: job.week_start,
        });

        const title = isClass
          ? branding.className
          : (await getChildName(job.child_id as string, job.class_id))?.trim() ||
            'This Week';

        // --- write normalized photos into the render public dir ---
        // Chronological throughout: the SQL orders by captured_at and the
        // hygiene pass re-sorts on it before emitting.
        const propPhotos: { file: string }[] = [];
        for (let i = 0; i < photos.length; i++) {
          const name = `${String(i).padStart(2, '0')}.jpg`;
          fs.writeFileSync(path.join(JOB_PHOTOS_DIR, name), photos[i].buffer);
          propPhotos.push({ file: `photos/job/${name}` });
        }

        // --- music track (rotates by ISO week of week_start) ---
        // Unchanged for both kinds: the timeline stretches to fit the photo
        // count against the same precomputed downbeat grid.
        const { track, mp3 } = trackForReport(job.week_start);

        const firstCapturedAt = photos[0]?.capturedAt ?? null;
        // "The app advertises the school, not itself" (design tab 09) — the
        // eyebrow carries the school, never the product name.
        const eyebrow =
          branding.schoolName ??
          (isClass ? 'Our Week' : branding.className);

        const props: MontageProps = {
          childName: title,
          subtitle: formatSubtitle(job.week_start, firstCapturedAt),
          eyebrow,
          photos: propPhotos,
          track,
          branding,
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
          // null on a class job -> the literal `class` path segment.
          childId: isClass ? null : job.child_id,
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
    resetJobAssets();
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
