// lib/montree/offline/sync-triggers.ts
// Registers sync triggers: app resume, network change, periodic cleanup
//
// HARDENED after 10x audit:
//   - Capacitor plugin import failures fall back to web events
//   - Initial sync delay reduced 3s → 500ms
//   - Periodic cleanup skips if queue empty
//   - All cleanups have .catch() guards
//
// Usage (call once in app root, e.g. dashboard layout):
//   import { registerSyncTriggers } from '@/lib/montree/offline/sync-triggers';
//   useEffect(() => registerSyncTriggers(), []);

import { syncQueue } from './sync-manager';
import { cleanupOldEntries, getQueueSize } from './queue-store';
import { isNative } from '@/lib/montree/platform';

let registered = false;

/**
 * Register all sync triggers. Safe to call multiple times (idempotent).
 * Returns cleanup function.
 */
export function registerSyncTriggers(): () => void {
  if (registered) return () => {};
  registered = true;

  const cleanups: (() => void)[] = [];

  // Helper: register web visibility listener (used as primary or fallback)
  function registerWebVisibility() {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    cleanups.push(() => document.removeEventListener('visibilitychange', handleVisibility));
  }

  // Helper: register web online listener (used as primary or fallback)
  function registerWebOnline() {
    const handleOnline = () => {
      syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
    };
    window.addEventListener('online', handleOnline);
    cleanups.push(() => window.removeEventListener('online', handleOnline));
  }

  // ============================================
  // TRIGGER 1: App resume / tab visible
  // ============================================

  if (isNative()) {
    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
        }
      });
      cleanups.push(() => listener.then(l => l.remove()).catch(() => {}));
    }).catch(() => {
      // Capacitor plugin failed — fall back to web visibility events
      registerWebVisibility();
    });
  } else {
    registerWebVisibility();
  }

  // ============================================
  // TRIGGER 2: Network reconnection
  // ============================================

  if (isNative()) {
    import('@capacitor/network').then(({ Network }) => {
      const listener = Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
        }
      });
      cleanups.push(() => listener.then(l => l.remove()).catch(() => {}));
    }).catch(() => {
      // Capacitor plugin failed — fall back to web online events
      registerWebOnline();
    });
  } else {
    registerWebOnline();
  }

  // ============================================
  // TRIGGER 3: Periodic cleanup (every 30 min)
  // ============================================

  const cleanupInterval = setInterval(async () => {
    try {
      // Skip DB transaction if queue is empty
      const size = await getQueueSize();
      if (size === 0) return;

      const cleaned = await cleanupOldEntries();
      if (cleaned > 0) {
        console.log(`[SYNC_TRIGGER] Cleaned ${cleaned} old uploaded entries`);
      }
    } catch (e) {
      console.error('[SYNC_TRIGGER] Cleanup error:', e);
    }
  }, 30 * 60 * 1000);

  cleanups.push(() => clearInterval(cleanupInterval));

  // ============================================
  // TRIGGER 4: Initial sync on registration
  // ============================================

  const initialTimer = setTimeout(() => {
    syncQueue().catch(e => console.error('[SYNC_TRIGGER] Initial sync:', e));
  }, 500); // 500ms — enough for hydration, 2.5s faster than before

  cleanups.push(() => clearTimeout(initialTimer));

  // Return cleanup
  return () => {
    registered = false;
    cleanups.forEach(fn => fn());
  };
}
