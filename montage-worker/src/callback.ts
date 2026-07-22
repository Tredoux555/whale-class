// Notify the main app that a montage finished (drives the completion push).
// Best-effort: a callback failure NEVER fails the job.

import type { WorkerConfig } from './config';

export async function notifyComplete(
  cfg: WorkerConfig,
  payload: { report_id: string; child_id: string; school_id: string }
): Promise<void> {
  if (!cfg.workerSecret) {
    console.log('[callback] MONTAGE_WORKER_SECRET unset — skipping callback');
    return;
  }
  const url = `${cfg.mainAppUrl.replace(/\/$/, '')}/api/montree/internal/montage-complete`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-worker-secret': cfg.workerSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[callback] ${url} -> ${res.status}`);
    }
  } catch (err) {
    console.error('[callback] failed', (err as Error).message);
  }
}
