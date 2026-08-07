// Potato Snaps montage render worker.
//   (default)        poll loop — claim + render jobs forever
//   --once           process at most one job, then exit 0
//   --plan <jobId>   dry-run: print hygiene decisions + chosen track, no render

import { ensureBrowser } from '@remotion/renderer';
import { loadConfig, WorkerConfig } from './config';
import {
  initPool,
  closePool,
  claimNextJob,
  recoverStaleJobs,
  markFailure,
  getJobById,
  getChildName,
} from './db';
import { fetchEligiblePhotos, downloadPhotos } from './media';
import { runHygiene } from './hygiene';
import { validateMusicAssets, trackForReport } from './music';
import { processJob, cleanupOrphanTemp, MIN_RENDER_PHOTOS } from './pipeline';

let shuttingDown = false;
let processing = false;

function installSignals() {
  const handler = (sig: string) => {
    console.log(`[worker] ${sig} received — finishing current job then exiting`);
    shuttingDown = true;
    if (!processing) {
      // Not mid-job: exit promptly.
      shutdown(0);
    }
  };
  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));
}

async function shutdown(code: number) {
  try {
    await closePool();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    // Allow a fast exit on shutdown.
    const check = setInterval(() => {
      if (shuttingDown) {
        clearTimeout(t);
        clearInterval(check);
        resolve();
      }
    }, 250);
    t.unref?.();
  });
}

async function ensureBrowserBoot(cfg: WorkerConfig) {
  try {
    await ensureBrowser({
      browserExecutable: cfg.browserExecutable || undefined,
    });
  } catch (e) {
    console.warn('[worker] ensureBrowser warning:', (e as Error).message);
  }
}

/**
 * Returns 'none' when the queue was empty, 'ok' when a job finished (done or
 * gracefully skipped), and 'retry' when a job failed but was requeued — the
 * loop then waits one poll interval before trying again. This schema has no
 * `next_attempt_at` column, so that pause IS the backoff; without it a
 * deterministically-failing job would be re-claimed in a tight spin.
 */
type JobTick = 'none' | 'ok' | 'retry';

async function handleOneJob(cfg: WorkerConfig): Promise<JobTick> {
  const job = await claimNextJob();
  if (!job) return 'none';
  processing = true;
  let tick: JobTick = 'ok';
  console.log(
    `[worker] claimed job ${job.id} (class ${job.class_id}, child ${job.child_id}, ` +
      `week ${job.week_start}, ${job.media_ids?.length ?? 0} photos, attempt ${job.attempt})`
  );
  try {
    const result = await processJob(cfg, job);
    if (result.outcome === 'done') {
      console.log(
        `[worker] job ${job.id} DONE — ${result.durationSec.toFixed(1)}s -> ${result.storagePath}`
      );
    } else {
      console.log(`[worker] job ${job.id} SKIPPED — ${result.reason}`);
    }
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error(`[worker] job ${job.id} FAILED:`, message);
    const disposition = await markFailure(
      job.id,
      job.attempt,
      cfg.maxAttempts,
      message
    );
    console.log(`[worker] job ${job.id} -> ${disposition}`);
    if (disposition === 'retry') tick = 'retry';
  } finally {
    processing = false;
  }
  return tick;
}

async function runLoop(cfg: WorkerConfig) {
  console.log('[worker] starting poll loop');
  while (!shuttingDown) {
    try {
      const recovered = await recoverStaleJobs(cfg.staleMinutes, cfg.maxAttempts);
      if (recovered > 0) console.log(`[worker] recovered ${recovered} stale job(s)`);
      const tick = await handleOneJob(cfg);
      if (shuttingDown) break;
      // Idle queue, or a job we just requeued: wait before looking again.
      if (tick !== 'ok') await sleep(cfg.pollIntervalMs);
    } catch (err) {
      console.error('[worker] loop error:', (err as Error).message);
      await sleep(cfg.pollIntervalMs);
    }
  }
  await shutdown(0);
}

async function runOnce(cfg: WorkerConfig) {
  await recoverStaleJobs(cfg.staleMinutes, cfg.maxAttempts);
  const tick = await handleOneJob(cfg);
  if (tick === 'none') console.log('[worker] --once: queue empty');
  await shutdown(0);
}

async function runPlan(cfg: WorkerConfig, jobId: string) {
  const job = await getJobById(jobId);
  if (!job) {
    console.error(`[plan] job ${jobId} not found`);
    await shutdown(1);
    return;
  }
  const childName = await getChildName(job.child_id, job.class_id);
  const eligible = await fetchEligiblePhotos(job);
  console.log(`\n=== PLAN for job ${jobId} ===`);
  console.log(
    `child ${childName ?? job.child_id} · class ${job.class_id} · week ${job.week_start} · status ${job.status}`
  );
  console.log(
    `selected: ${job.media_ids?.length ?? 0}   still present: ${eligible.length}`
  );

  const downloaded = await downloadPhotos(cfg, eligible);
  const { photos, decisions } = await runHygiene(downloaded);

  console.log('\nphoto_id                              captured_at            decision');
  console.log('-'.repeat(90));
  // Print kept (in final order) then dropped.
  const kept = decisions.filter((d) => d.kept).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const dropped = decisions.filter((d) => !d.kept);
  for (const d of kept) {
    console.log(
      `${d.id.padEnd(38)}${(d.capturedAt ?? '—').padEnd(24)}KEEP #${d.order} (blur ${d.blur?.toFixed(1) ?? '?'})`
    );
  }
  for (const d of dropped) {
    console.log(
      `${d.id.padEnd(38)}${(d.capturedAt ?? '—').padEnd(24)}DROP — ${d.reason}`
    );
  }

  const { slug, track } = trackForReport(job.week_start);
  console.log(
    `\nfinal photos: ${photos.length}   chosen track: ${slug} (${track.bpm} bpm, ${track.durationSec}s, ${track.downbeats.length} downbeats)`
  );
  if (photos.length < MIN_RENDER_PHOTOS) {
    console.log('=> would SKIP (insufficient photos)');
  }
  await shutdown(0);
}

async function main() {
  const cfg = loadConfig();
  initPool(cfg);
  installSignals();

  const args = process.argv.slice(2);
  const planIdx = args.indexOf('--plan');

  if (planIdx !== -1) {
    const jobId = args[planIdx + 1];
    if (!jobId) {
      console.error('usage: --plan <jobId>');
      await shutdown(1);
      return;
    }
    await runPlan(cfg, jobId);
    return;
  }

  // Render modes need music assets + a browser.
  validateMusicAssets();
  await ensureBrowserBoot(cfg);
  cleanupOrphanTemp();

  if (args.includes('--once')) {
    await runOnce(cfg);
  } else {
    await runLoop(cfg);
  }
}

main().catch(async (err) => {
  console.error('[worker] fatal:', err);
  await shutdown(1);
});
