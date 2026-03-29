'use client';

/**
 * VisitorTracker — Invisible component that fires a tracking beacon on every page navigation.
 * Uses navigator.sendBeacon for zero-impact fire-and-forget.
 * Falls back to fetch for browsers without sendBeacon support.
 * Debounced: only fires once per URL per 30 seconds.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const DEBOUNCE_MS = 30_000; // Match server-side rate limit

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<{ url: string; at: number }>({ url: '', at: 0 });

  useEffect(() => {
    if (!pathname) return;

    const fullUrl = pathname;
    const now = Date.now();

    // Debounce: skip if same URL within 30s
    if (lastTracked.current.url === fullUrl && now - lastTracked.current.at < DEBOUNCE_MS) {
      return;
    }

    lastTracked.current = { url: fullUrl, at: now };

    const payload = JSON.stringify({
      page_url: fullUrl,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
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
