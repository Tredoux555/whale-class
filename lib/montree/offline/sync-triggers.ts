// lib/montree/offline/sync-triggers.ts
// Registers sync triggers: app resume, network change, periodic cleanup
//
// Usage (call once in app root, e.g. dashboard layout):
//   import { registerSyncTriggers } from '@/lib/montree/offline/sync-triggers';
//   useEffect(() => registerSyncTriggers(), []);

import { syncQueue } from './sync-manager';
import { cleanupOldEntries } from './queue-store';
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

  // ============================================
  // TRIGGER 1: App resume / tab visible
  // ============================================

  if (isNative()) {
    // Capacitor: Listen for app state changes
    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log('[SYNC_TRIGGER] App resumed, starting sync');
          syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
        }
      });
      cleanups.push(() => listener.then(l => l.remove()).catch(() => {}));
    }).catch(e => console.warn('[SYNC_TRIGGER] Capacitor App not available:', e));
  } else {
    // Web: Listen for tab visibility
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SYNC_TRIGGER] Tab visible, starting sync');
        syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    cleanups.push(() => document.removeEventListener('visibilitychange', handleVisibility));
  }

  // ============================================
  // TRIGGER 2: Network reconnection
  // ============================================

  if (isNative()) {
    // Capacitor: Network plugin
    import('@capacitor/network').then(({ Network }) => {
      const listener = Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          console.log('[SYNC_TRIGGER] Network reconnected, starting sync');
          syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
        }
      });
      cleanups.push(() => listener.then(l => l.remove()).catch(() => {}));
    }).catch(e => console.warn('[SYNC_TRIGGER] Capacitor Network not available:', e));
  } else {
    // Web: Online/offline events
    const handleOnline = () => {
      console.log('[SYNC_TRIGGER] Browser online, starting sync');
      syncQueue().catch(e => console.error('[SYNC_TRIGGER]', e));
    };
    window.addEventListener('online', handleOnline);
    cleanups.push(() => window.removeEventListener('online', handleOnline));
  }

  // ============================================
  // TRIGGER 3: Periodic cleanup (every 30 min)
  // ============================================

  const cleanupInterval = setInterval(() => {
    cleanupOldEntries().then(cleaned => {
      if (cleaned > 0) {
        console.log(`[SYNC_TRIGGER] Cleaned ${cleaned} old uploaded entries`);
      }
    }).catch(e => console.error('[SYNC_TRIGGER] Cleanup error:', e));
  }, 30 * 60 * 1000);

  cleanups.push(() => clearInterval(cleanupInterval));

  // ============================================
  // TRIGGER 4: Initial sync on registration
  // ============================================

  // Sync immediately when triggers are registered (app just loaded)
  setTimeout(() => {
    syncQueue().catch(e => console.error('[SYNC_TRIGGER] Initial sync:', e));
  }, 3000); // 3s delay to let the app hydrate first

  // Return cleanup
  return () => {
    registered = false;
    cleanups.forEach(fn => fn());
  };
}
