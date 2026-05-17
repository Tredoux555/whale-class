// components/montree/AppLockOverlay.tsx
//
// Mobile-style privacy lock. The moment the page is hidden (screen locks, app
// backgrounds, tab loses focus on a phone), an overlay snaps in over the
// app. When the user comes back, the overlay STAYS until they tap the top-left
// unlock icon — banking-app pattern. Keeps Tracy chats, parent messages, child
// data off the screen if someone else picks up the device.
//
// Cookie-based session is preserved underneath — tapping the icon is a
// one-tap dismiss, no password retype. If the cookie has expired in the
// meantime the next API call will redirect to login as it would normally.
//
// Mounted ONCE in /montree/layout.tsx. Self-decides via pathname whether
// the current route is sensitive enough to lock. Public surfaces (landing,
// library, login, signup) opt out.
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import MontreeLogo from './MonteeLogo';

// Sensitive routes that should auto-lock on background. Anything else (landing,
// library, login flows, signup) stays unlocked — no surprise overlay on the
// public marketing pages.
const LOCKABLE_PREFIXES = [
  '/montree/admin',           // principal cockpit (Tracy, finance, parent comms)
  '/montree/dashboard',       // teacher dashboard (child data, photos, notes)
  '/montree/agent',           // agent dashboard (Mira, school list, earnings)
  '/montree/super-admin',     // super-admin everything
  '/montree/parent/dashboard',
  '/montree/parent/photos',
  '/montree/parent/report',
  '/montree/parent/milestones',
  '/montree/parent/messages',
  '/montree/parent/weekly-review',
  '/montree/parent/announcements',
  '/montree/parent/stats',
];

function isLockable(pathname: string | null): boolean {
  if (!pathname) return false;
  return LOCKABLE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

const FOREST_BG = '#0a1a0f';
const EMERALD_GLOW =
  'radial-gradient(ellipse 900px 700px at 50% 38%, rgba(39,129,90,0.42), transparent 65%)';

export default function AppLockOverlay() {
  const pathname = usePathname();
  const lockable = isLockable(pathname);
  const [locked, setLocked] = useState(false);

  // Visibility listeners. We add them whenever we're on a lockable route,
  // and tear them down on route change or unmount.
  useEffect(() => {
    if (!lockable) return;

    const onHidden = () => {
      // Trigger on both `visibilitychange→hidden` and the iOS `pagehide`
      // event. Either signals the phone is locking or the app is being
      // sent to the background.
      if (typeof document !== 'undefined' && document.hidden) {
        setLocked(true);
      }
    };
    const onPageHide = () => setLocked(true);

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [lockable]);

  // Lock body scroll while the overlay is visible. The page underneath
  // stays where it was — we just hide it visually.
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);

  // When the route changes to a non-lockable one (e.g. user navigated to
  // landing), make sure we don't leave a stuck overlay behind.
  useEffect(() => {
    if (!lockable && locked) setLocked(false);
  }, [lockable, locked]);

  if (!lockable || !locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999, // above Tracy (9999) and the present-mode overlay (9999)
        background: FOREST_BG,
        backgroundImage: EMERALD_GLOW,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        // Block any pointer / keyboard input from reaching the page beneath.
        pointerEvents: 'auto',
        // Respect device safe areas (iPhone notch / home indicator, iPad rounded).
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Top-left unlock icon — the one tap that gets you back into the app */}
      <button
        type="button"
        onClick={() => setLocked(false)}
        aria-label="Unlock"
        style={{
          position: 'absolute',
          top: `calc(env(safe-area-inset-top) + 14px)`,
          left: `calc(env(safe-area-inset-left) + 14px)`,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1px solid rgba(232,201,106,0.40)',
          background: 'rgba(232,201,106,0.10)',
          color: '#E8C96A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background 140ms ease, transform 140ms ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.94)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Lock size={20} strokeWidth={1.75} />
      </button>

      {/* Centered Montree screensaver — logo + wordmark */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          userSelect: 'none',
        }}
      >
        <MontreeLogo size={96} showBackground={true} />
        <div
          style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: 38,
            letterSpacing: -0.4,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}
        >
          Montree
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 0.4,
            marginTop: 4,
          }}
        >
          Tap the lock to come back
        </div>
      </div>
    </div>
  );
}
