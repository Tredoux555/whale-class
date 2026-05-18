// components/montree/AppLockOverlay.tsx
//
// Mobile-style privacy lock. The moment the page is hidden (screen locks, app
// backgrounds, tab loses focus on a phone), an overlay snaps in over the
// app. When the user comes back, the overlay STAYS until they tap the Montree
// logo to dismiss — banking-app pattern. Keeps Tracy chats, parent messages,
// child data off the screen if someone else picks up the device.
//
// Cookie-based session is preserved underneath — tapping the logo is a
// one-tap dismiss, no password retype. If the cookie has expired in the
// meantime the next API call will redirect to login as it would normally.
//
// Mounted ONCE in /montree/layout.tsx. Self-decides via pathname whether
// the current route is sensitive enough to lock. Public surfaces (landing,
// library, login, signup) opt out.
//
// 🚨 FEATURE FLAG: APP_LOCK_ENABLED is currently FALSE. Tredoux turned the
// feature off on 2026-05-18 ("don't really understand the point of it") but
// kept the code for future re-enable. Flip the flag to true to bring it
// back. When flipped back on, the dismiss surface is the Montree logo
// itself (not the old top-left lock icon, which has been removed).
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MontreeLogo from './MonteeLogo';

// Toggle to re-enable the privacy lock. False = component is a no-op.
const APP_LOCK_ENABLED = false;

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
  const lockable = isLockable(pathname) && APP_LOCK_ENABLED;
  const [locked, setLocked] = useState(false);

  // Belt-and-braces: if a stale `locked=true` somehow survived a hot reload
  // while the flag was being flipped off, clear it on mount.
  useEffect(() => {
    if (!APP_LOCK_ENABLED) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defensive cleanup on flag flip
      setLocked(false);
      // Defensively restore body scroll in case a prior render had locked it.
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stuck overlay on route change
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
      {/* Tap the logo to come back — the entire logo + wordmark cluster is
          the dismiss surface. Banking-app style, but the affordance is the
          brand itself (warmer than a separate lock icon). */}
      <button
        type="button"
        onClick={() => setLocked(false)}
        aria-label="Tap the Montree logo to come back"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          userSelect: 'none',
          background: 'transparent',
          border: 'none',
          padding: 24,
          margin: 0,
          color: 'inherit',
          cursor: 'pointer',
          transition: 'transform 140ms ease',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
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
          Tap to come back
        </div>
      </button>
    </div>
  );
}
