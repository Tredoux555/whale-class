// components/montree/NetworkStatusBanner.tsx
// Shows offline/online status banner at top of dashboard
// Detects network status via Capacitor Network plugin (native) or navigator.onLine (web)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { isNative } from '@/lib/montree/platform';

type NetworkState = 'online' | 'offline' | 'reconnecting';

export default function NetworkStatusBanner() {
  const { t } = useI18n();
  const [state, setState] = useState<NetworkState>('online');
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    if (wasOffline) {
      setState('reconnecting');
      setShowReconnected(true);
      // Show "back online" for 3 seconds then hide
      setTimeout(() => {
        setState('online');
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
    } else {
      setState('online');
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setState('offline');
    setWasOffline(true);
  }, []);

  useEffect(() => {
    // Initial state
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState('offline');
      setWasOffline(true);
    }

    if (isNative()) {
      // Capacitor Network plugin
      let cleanup: (() => void) | null = null;
      import('@capacitor/network').then(({ Network }) => {
        // Check initial status
        Network.getStatus().then(status => {
          if (!status.connected) handleOffline();
        });

        // Listen for changes
        const listenerPromise = Network.addListener('networkStatusChange', (status) => {
          if (status.connected) {
            handleOnline();
          } else {
            handleOffline();
          }
        });

        cleanup = () => {
          listenerPromise.then(l => l.remove());
        };
      }).catch(e => console.warn('[NETWORK_BANNER] Capacitor Network not available:', e));

      return () => { cleanup?.(); };
    } else {
      // Web: browser events
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [handleOnline, handleOffline]);

  // Don't render when online and not showing reconnected message
  if (state === 'online' && !showReconnected) return null;

  return (
    <div
      className={`px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${
        state === 'offline'
          ? 'bg-red-500 text-white'
          : state === 'reconnecting'
            ? 'bg-emerald-500 text-white'
            : ''
      }`}
    >
      {state === 'offline' && (
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          {t('offline.offline') || "You're offline — photos are saved locally"}
        </div>
      )}
      {state === 'reconnecting' && (
        <div className="flex items-center justify-center gap-2">
          <span>✓</span>
          {t('offline.backOnline') || 'Back online — syncing photos'}
        </div>
      )}
    </div>
  );
}
