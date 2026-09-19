// instrumentation.ts
//
// Next.js calls register() once per server process, at boot. Node runtime only
// — the same file is also loaded in the edge runtime, where child_process, fs
// and setInterval-for-hours do not belong.
//
// 🚨 WHY THERE IS A TIMER IN HERE AT ALL
// Teacher video uploads kick off their transcode fire-and-forget. Railway
// redeploys this app many times a day and SIGKILLs whatever ffmpeg is running,
// so those rows sat on 'pending' forever: /api/montree/cron/video-transcode was
// built as the safety net but nothing was ever scheduled to call it. Rather
// than add an external cron (another secret, another service, another thing to
// silently stop), the web process drains its own queue every 5 minutes. The
// work is claimed row-by-row with a conditional UPDATE, so several Railway
// instances running this at once is correct, not a race.
//
// It is deliberately small: 5 rows per pass, sequential, and every failure is
// swallowed — a sweep must never be able to take the web process down.

/** First pass this long after boot: let the app finish warming up first. */
const FIRST_SWEEP_DELAY_MS = 20_000;
/** Then every 5 minutes, for the life of the process. */
const SWEEP_INTERVAL_MS = 5 * 60_000;
/** Rows per pass. Each one is a full download + ffmpeg + upload. */
const SWEEP_BATCH = 5;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // A build-time render pass must not start background timers.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  // Opt-out for local dev / one-off scripts that share this codebase.
  if (process.env.MONTREE_DISABLE_TRANSCODE_SWEEP === '1') return;

  let running = false;
  const sweep = async () => {
    // A pass that overruns the interval (a long clip) must not be re-entered.
    if (running) return;
    running = true;
    try {
      const { runTranscodeSweep } = await import('@/lib/montree/media/transcode-sweep');
      await runTranscodeSweep(SWEEP_BATCH);
    } catch (err) {
      console.error('[instrumentation] transcode sweep failed:', err instanceof Error ? err.message : err);
    } finally {
      running = false;
    }
  };

  setTimeout(() => {
    void sweep();
    const timer = setInterval(() => { void sweep(); }, SWEEP_INTERVAL_MS);
    // Never hold the process open on shutdown.
    if (typeof timer.unref === 'function') timer.unref();
  }, FIRST_SWEEP_DELAY_MS).unref?.();

  console.log('[instrumentation] video transcode sweep armed (every 5 min)');
}
