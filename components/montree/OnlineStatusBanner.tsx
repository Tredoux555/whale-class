// components/montree/OnlineStatusBanner.tsx
//
// Small floating pill that tells the user when they've lost connectivity
// and when it comes back. Reads `navigator.onLine` and listens for the
// `online` + `offline` window events.
//
// When offline: a slate-amber pill appears at the top, persists until
// connectivity returns.
// When connectivity returns: pill flips to a brief emerald "Back online"
// confirmation, then auto-dismisses after 2.4s.
//
// Mounted once at the root /montree/layout.tsx — gates on a pathname so
// it doesn't render on the offline page itself (which would be redundant)
// or on full-bleed surfaces like the presentation view (which fills the
// screen). The component is `'use client'`; the SSR output is null until
// the offline event fires.

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff, Wifi } from 'lucide-react';

// Skip the banner on these surfaces. The offline page IS the offline UI;
// the presentation full-bleed view shouldn't get a status overlay during
// a parent meeting.
const SKIP_PREFIXES = [
  '/montree/offline',
  '/montree/dashboard/present',
];

type Status = 'online' | 'offline' | 'just-reconnected';

export default function OnlineStatusBanner() {
  const pathname = usePathname();
  const skipForPath =
    !!pathname && SKIP_PREFIXES.some((p) => pathname.startsWith(p));

  // Start as 'online' even if SSR — we don't know real connectivity until
  // mount. Render nothing until we have a real signal.
  const [status, setStatus] = useState<Status>('online');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    const updateFromNavigator = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus('offline');
      }
    };
    updateFromNavigator();

    let backOnlineTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setStatus((prev) => {
        // Only show 'just-reconnected' if we were actually offline.
        if (prev === 'offline') {
          if (backOnlineTimer) clearTimeout(backOnlineTimer);
          backOnlineTimer = setTimeout(() => {
            setStatus('online');
          }, 2400);
          return 'just-reconnected';
        }
        return 'online';
      });
    };
    const handleOffline = () => {
      if (backOnlineTimer) {
        clearTimeout(backOnlineTimer);
        backOnlineTimer = null;
      }
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (backOnlineTimer) clearTimeout(backOnlineTimer);
    };
  }, []);

  if (!hasMounted) return null;
  if (skipForPath) return null;
  if (status === 'online') return null;

  const isOffline = status === 'offline';
  // Tokens — match the rest of the app's dark-forest scheme.
  const bg = isOffline
    ? 'rgba(40,28,12,0.92)' // amber-tinted dark
    : 'rgba(8,32,20,0.92)'; // emerald-tinted dark
  const border = isOffline
    ? '1px solid rgba(232,201,106,0.55)'
    : '1px solid rgba(52,211,153,0.55)';
  const fg = isOffline ? '#E8C96A' : '#34d399';
  const label = isOffline ? 'You’re offline' : 'Back online';
  const Icon = isOffline ? WifiOff : Wifi;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        // Below the iOS notch / dynamic island — respect safe-area-inset-top.
        top: 'calc(env(safe-area-inset-top) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998, // below AppLockOverlay (99999), above everything else
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 999,
        background: bg,
        border,
        color: fg,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.2,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        pointerEvents: 'none', // never blocks interaction underneath
        userSelect: 'none',
      }}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </div>
  );
}
