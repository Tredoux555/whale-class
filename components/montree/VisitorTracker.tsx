'use client';

/**
 * VisitorTracker — Invisible component that fires a tracking beacon on every page navigation.
 * Uses navigator.sendBeacon for zero-impact fire-and-forget.
 * Falls back to fetch for browsers without sendBeacon support.
 * Debounced: only fires once per URL per 30 seconds.
 *
 * Jul 7 2026 — also captures utm_* from the URL and drops a first-touch
 * `montree_attrib` cookie (90d, set ONLY if absent — first touch wins) so the
 * signup routes can stamp the school's acquisition source. See
 * lib/montree/attribution.ts. Reads window.location.search directly (NOT
 * useSearchParams — that forces a Suspense boundary on the whole layout).
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ATTRIB_COOKIE, UTM_KEYS, deriveSource } from '@/lib/montree/attribution';

const DEBOUNCE_MS = 30_000; // Match server-side rate limit

// Shared with VisitorsTab.tsx's hidden "mark this device as mine" button —
// keep the key in sync if it ever moves to lib/montree/attribution.ts.
export const INTERNAL_DEVICE_KEY = 'montree_internal_device';

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<{ url: string; at: number }>({ url: '', at: 0 });

  useEffect(() => {
    if (!pathname) return;

    // Read utm_* from the live URL search string (client-only, no Suspense).
    const utm: Record<string, string> = {};
    let searchStr = '';
    try {
      if (typeof window !== 'undefined') {
        searchStr = window.location.search;
        const sp = new URLSearchParams(searchStr);
        for (const key of UTM_KEYS) {
          const v = sp.get(key);
          if (v) utm[key] = v.slice(0, 200);
        }
      }
    } catch {
      // ignore malformed URL
    }

    // First-touch cookie: set only if absent (first touch wins). PII-free.
    try {
      const hasCookie =
        typeof document !== 'undefined' &&
        /(?:^|;\s*)montree_attrib=/.test(document.cookie);
      if (!hasCookie) {
        const referrer =
          typeof document !== 'undefined' ? document.referrer || null : null;
        const attribPayload = {
          source: deriveSource(utm.utm_source, referrer),
          ...utm,
          country: null, // country is captured server-side on the visitor row
          ts: new Date().toISOString(),
        };
        const ninetyDays = 60 * 60 * 24 * 90;
        document.cookie = `${ATTRIB_COOKIE}=${encodeURIComponent(
          JSON.stringify(attribPayload)
        )}; max-age=${ninetyDays}; path=/; SameSite=Lax`;
      }
    } catch {
      // Cookie write failed (privacy mode etc.) — never break the page.
    }

    // Debounce the beacon on the full path+search (so ?utm=… lands once).
    const fullUrl = searchStr ? `${pathname}${searchStr}` : pathname;
    const now = Date.now();
    if (lastTracked.current.url === fullUrl && now - lastTracked.current.at < DEBOUNCE_MS) {
      return;
    }
    lastTracked.current = { url: fullUrl, at: now };

    // Internal-traffic flag (migration 324): a hidden super-admin button on
    // the Visitors tab sets this in localStorage on Tredoux's own browser —
    // "this is one of my devices, exclude it from the stats by default".
    // Sticky across VPN IP changes (Oslo/Frankfurt etc.) since it lives on
    // the browser, not the network path.
    let isInternal = false;
    try {
      isInternal = typeof window !== 'undefined' && window.localStorage.getItem(INTERNAL_DEVICE_KEY) === '1';
    } catch {
      // localStorage unavailable (privacy mode etc.) — never break the page.
    }

    const payload = JSON.stringify({
      page_url: fullUrl,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      ...utm,
      is_internal: isInternal,
    });

    // sendBeacon is fire-and-forget, doesn't block navigation
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/montree/visitors/track', blob);
    } else {
      // Fallback for older browsers
      fetch('/api/montree/visitors/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently ignore tracking failures
      });
    }
  }, [pathname]);

  return null; // Invisible component
}
