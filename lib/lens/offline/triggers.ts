// lib/lens/offline/triggers.ts
// When the queue wakes up.
//
// Ported from lib/potato/offline/triggers.ts. Four triggers:
//   1. the tab becoming visible again (app open, unlock, switch back)
//   2. the browser reporting the network came back
//   3. a due-time timer, which is how exponential backoff actually fires
//   4. one pass shortly after registration, for moments left over from last time
//
// The Capacitor branches from Montree's original are deliberately absent — Lens
// is a web/PWA product and may not import lib/montree/platform. The web events
// cover both the browser and the installed PWA.

import { syncQueue } from './sync-manager';
import { nextDueAt, sweepUploaded, getQueueSize } from './queue-store';
import { UPLOADED_TTL_MS } from './types';

let registered = false;

export function registerLensSyncTriggers(visitId: string): () => void {
  if (typeof window === 'undefined') return () => {};
  // Idempotent: a second mount (React strict mode, a re-render) must not stack
  // a second set of listeners and double every sync.
  if (registered) return () => {};
  registered = true;

  const cleanups: (() => void)[] = [];
  let dueTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const run = (why: string) => {
    syncQueue(visitId)
      .catch((e) => console.error(`[lens/queue] sync (${why}) failed:`, e))
      .finally(() => scheduleNextDue());
  };

  /**
   * Sleep exactly until the soonest backed-off entry is due. This is what turns
   * `nextAttemptAt` into real behaviour rather than a stored number — without
   * it a failed moment would sit until she happened to switch tabs.
   */
  function scheduleNextDue() {
    if (stopped) return;
    if (dueTimer) {
      clearTimeout(dueTimer);
      dueTimer = null;
    }
    nextDueAt(visitId)
      .then((due) => {
        if (stopped || due === null) return;
        const wait = Math.max(1_000, Math.min(due - Date.now(), 5 * 60 * 1000));
        dueTimer = setTimeout(() => run('backoff due'), wait);
      })
      .catch((e) => console.error('[lens/queue] scheduling failed:', e));
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') run('app open');
  };
  document.addEventListener('visibilitychange', onVisible);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisible));

  const onOnline = () => run('back online');
  window.addEventListener('online', onOnline);
  cleanups.push(() => window.removeEventListener('online', onOnline));

  // Give hydration a moment, then drain whatever last session left behind.
  const initial = setTimeout(() => run('startup'), 800);
  cleanups.push(() => clearTimeout(initial));

  // Housekeeping: forget entries the server already has.
  const sweep = setInterval(() => {
    getQueueSize()
      .then((size) => (size > 0 ? sweepUploaded(UPLOADED_TTL_MS) : 0))
      .catch((e) => console.error('[lens/queue] sweep failed:', e));
  }, 30 * 60 * 1000);
  cleanups.push(() => clearInterval(sweep));

  scheduleNextDue();

  return () => {
    stopped = true;
    registered = false;
    if (dueTimer) clearTimeout(dueTimer);
    cleanups.forEach((fn) => fn());
  };
}
