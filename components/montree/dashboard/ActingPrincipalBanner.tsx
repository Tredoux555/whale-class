// components/montree/dashboard/ActingPrincipalBanner.tsx
//
// "Principal view · {classroom} · Return to my school" — the slim strip a principal sees
// while standing inside one of their own classrooms (POST /api/montree/admin/enter-classroom).
// The teacher-side twin of the organisation-view banner in app/montree/admin/layout.tsx, and
// deliberately the same gold visual language: this is a FRAME around somebody else's surface,
// not a notification inside it.
//
// 🚨 The signal comes from /api/montree/auth/me — i.e. from the signed token — never from
// localStorage. A banner that says "somebody is looking through this teacher's seat" must not
// be forgeable by editing a browser store, in EITHER direction: neither faked onto an ordinary
// teacher's screen, nor removed from a principal's.
//
// Failure-proof by construction: any error, any non-200, any missing field → render nothing.
// A teacher whose /me call blips must never see a stray bar, and must never see a crash.
'use client';

import { useEffect, useRef, useState } from 'react';

const GOLD = '#f0d68a';
const SANS = "'Inter', -apple-system, system-ui, sans-serif";

/**
 * 🚨 Scoped chrome surgery, live ONLY while this strip is mounted (i.e. only for a principal
 * standing inside a classroom). Two things it fixes, both of which exist because DashboardHeader
 * is a shared component that cannot know a banner appeared above it:
 *
 *   1. SAFE AREA — ONE OWNER. The header carries `pt-[env(safe-area-inset-top)]` because it is
 *      normally the topmost thing on screen. With this strip above it, BOTH were paying the inset
 *      and a notched iPhone got it twice — a fat dead band under the banner. The topmost element
 *      owns it, so the banner keeps its inset padding and the header's is zeroed here.
 *   2. STACKED STICKIES. The header is `sticky top-0`. This strip is sticky too, so the header
 *      has to stick BELOW it or the two would overlap at the same offset. --acting-banner-h is
 *      published from the strip's measured height (below) with a 0px fallback, so the rule is
 *      harmless even for the frame before the first measurement lands.
 *
 * Rendered via dangerouslySetInnerHTML, not <style jsx>: this sits inside a conditional return,
 * which Turbopack rejects for styled-jsx (see the May-29 2026 rule in CLAUDE.md).
 */
const CHROME_CSS = `
[data-dashboard-header] {
  padding-top: 0 !important;
  top: var(--acting-banner-h, 0px) !important;
}
`;

interface ActingState {
  /** What to call the room in the banner — classroom name, else school name, else nothing. */
  label: string;
}

export default function ActingPrincipalBanner() {
  const [acting, setActing] = useState<ActingState | null>(null);
  const [returning, setReturning] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/montree/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.authenticated) return;
        // Only the principal→classroom hop. A session carrying ONLY the org claim is a
        // director in a cockpit — that banner is the admin layout's job, not this one's.
        if (!data?.acting?.principalId) return;
        setActing({
          label: data.classroom?.name || data.school?.name || '',
        });
      })
      .catch(() => { /* no banner is the safe answer — never break the dashboard */ });
    return () => { cancelled = true; };
  }, []);

  // This strip appears AFTER first paint (it waits on /me), and it takes real height at the very
  // top of the shell. Pages that size themselves against the chrome — Guru's `100dvh − header −
  // banner` chat column — measure on window resize, so nudge them once the extra height exists.
  // Harmless everywhere else; a resize listener re-running is the cheapest possible no-op.
  //
  // 🚨 Keyed on `acting` and NOT fired from a requestAnimationFrame inside the fetch callback.
  // That was a race: React 18 schedules the render from that callback on a task, so the rAF
  // could run BEFORE the banner was committed to the DOM — Guru's measure() would then find no
  // `[data-dashboard-banner]`, subtract nothing, and leave the composer below the fold for
  // exactly the session this banner exists for, with nothing to recover it until a real resize.
  // An effect keyed on the state that renders the strip runs AFTER commit, every time, by
  // construction.
  useEffect(() => {
    if (!acting) return;
    const bar = barRef.current;
    if (!bar) return;

    // Publish the strip's real height so the sticky header can stack under it (CHROME_CSS above)
    // and re-nudge the pages that measure the chrome. Re-run on any height change — the strip
    // wraps to two lines on a narrow phone with a long classroom name, and the safe-area inset
    // changes on rotation.
    const publish = () => {
      document.documentElement.style.setProperty('--acting-banner-h', `${bar.offsetHeight}px`);
      window.dispatchEvent(new Event('resize'));
    };
    publish();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(publish);
      ro.observe(bar);
    }
    return () => {
      ro?.disconnect();
      document.documentElement.style.removeProperty('--acting-banner-h');
    };
  }, [acting]);

  // Hand the session back to the cockpit. The endpoint reads the way back off the signed
  // token — nothing is sent — and swaps the cookie in place, so this is a HARD navigation for
  // the same reason logout is: a clean slate with no stale React state holding a classroom
  // that is no longer the session's.
  const returnToAdmin = async () => {
    if (returning) return;
    setReturning(true);
    try {
      const res = await fetch('/api/montree/admin/return-to-admin', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The claim outlived the principal account, or the borrowed seat lapsed. Sending them
        // to the login chooser is the honest next step — it is where they can prove who
        // they are.
        window.location.href = '/montree/login-select';
        return;
      }
      // The teacher surfaces mirror the session into localStorage; drop it so the cockpit
      // cannot render a stale classroom for a beat before auth/me re-resolves.
      try {
        localStorage.removeItem('montree_session');
        localStorage.removeItem('montree_school');
        localStorage.removeItem('montree_principal');
      } catch { /* private browsing — the cookie is the real session */ }
      window.location.href = data.redirect || '/montree/admin';
    } catch {
      setReturning(false);
    }
  };

  if (!acting) return null;

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: CHROME_CSS }} />
    <div
      ref={barRef}
      // 🚨 Measured by pages that size themselves against the sticky dashboard header
      // (see app/montree/dashboard/guru/page.tsx). This strip sits ABOVE the header and
      // takes real height, so anything computing `100dvh - header` must subtract it too.
      data-dashboard-banner
      style={{
        // STICKY, not relative. "Return to my school" is the ONLY way out of a borrowed seat;
        // in flow it scrolled off the top of a long class list and stranded the principal in a
        // teacher's session with no visible exit. Sticky also keeps Guru's
        // `100dvh − header − banner` arithmetic true at every scroll position — in flow, the
        // banner's height stopped being subtractable the moment the page moved.
        // z-index sits ABOVE the header's z-50; the header is pushed down to stack under this
        // strip by CHROME_CSS rather than colliding with it at the same offset.
        position: 'sticky',
        top: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '8px 16px',
        // This strip is the topmost chrome, so it is the ONE owner of the safe-area inset —
        // the header's copy is zeroed in CHROME_CSS. See the note there.
        paddingTop: 'calc(8px + env(safe-area-inset-top))',
        // OPAQUE, unlike the in-flow version this replaced: a sticky bar that lets content
        // scroll visibly through it reads as a rendering fault. The base is the same near-black
        // the header below it uses (rgba(7,18,12,·)), with the gold wash laid on top as an
        // image layer so the strip still reads as the same "borrowed surface" gold frame.
        background: '#07120c',
        backgroundImage: 'linear-gradient(rgba(232,201,106,0.10), rgba(232,201,106,0.10))',
        borderBottom: '1px solid rgba(232,201,106,0.24)',
        fontFamily: SANS,
        fontSize: 12.5,
        color: GOLD,
      }}
      className="print:hidden"
    >
      <span>
        Principal view{acting.label ? <> · <strong style={{ fontWeight: 600 }}>{acting.label}</strong></> : null}
      </span>
      <button
        type="button"
        onClick={() => void returnToAdmin()}
        disabled={returning}
        style={{
          background: 'rgba(232,201,106,0.16)',
          border: '1px solid rgba(232,201,106,0.34)',
          borderRadius: 8,
          padding: '4px 12px',
          color: GOLD,
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 600,
          cursor: returning ? 'default' : 'pointer',
          opacity: returning ? 0.6 : 1,
        }}
      >
        {returning ? 'Returning…' : 'Return to my school'}
      </button>
    </div>
    </>
  );
}
