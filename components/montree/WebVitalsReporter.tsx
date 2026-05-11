// components/montree/WebVitalsReporter.tsx
//
// Session 103 Tier 0.12 — collect Core Web Vitals and POST to
// /api/montree/perf/vitals via sendBeacon (best-effort, fires even on tab
// close).
//
// Hooks into web-vitals's onLCP / onINP / onCLS / onFCP / onTTFB. Each
// callback fires when the metric stabilises; we tag the metric with the
// current route + role + schoolId for downstream slicing.
//
// Architectural rules:
// - This component MUST be a no-op on SSR. Only fires on the client.
// - The role + schoolId we tag are read from localStorage / cookies in a
//   best-effort way. They're for analytics slicing, NOT authorization.
//   The server treats them as untrusted strings.
// - Fire-and-forget. We never await, never block, never retry.

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface VitalMetric {
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  navigationType?: string;
}

function readRoleFromCookie(): string | null {
  // The montree-auth JWT cookie is httpOnly so we can't read it. But the
  // app stores a role hint in localStorage in several places for client
  // routing logic — read whichever flavor exists.
  try {
    if (typeof window === 'undefined') return null;
    const principal = window.localStorage.getItem('montree_principal');
    if (principal) return 'principal';
    const session = window.localStorage.getItem('montree_session');
    if (session) {
      try {
        const parsed = JSON.parse(session) as { teacher?: { role?: string } };
        const r = parsed?.teacher?.role;
        if (r === 'homeschool_parent') return 'homeschool_parent';
        if (r) return 'teacher';
      } catch {
        /* ignore */
      }
    }
    const parent = window.localStorage.getItem('montree_parent_session');
    if (parent) return 'parent';
    return null;
  } catch {
    return null;
  }
}

function readSchoolIdFromCookie(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const school = window.localStorage.getItem('montree_school');
    if (school) {
      try {
        const parsed = JSON.parse(school) as { id?: string };
        if (parsed?.id) return parsed.id;
      } catch {
        /* ignore */
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readConnection(): {
  effectiveConnectionType?: string;
  downlink?: number;
} {
  try {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; downlink?: number };
    };
    const conn = nav.connection;
    if (!conn) return {};
    return {
      effectiveConnectionType: conn.effectiveType,
      downlink: conn.downlink,
    };
  } catch {
    return {};
  }
}

function reportMetric(metric: VitalMetric, route: string) {
  try {
    const payload = {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      role: readRoleFromCookie() || undefined,
      schoolId: readSchoolIdFromCookie() || undefined,
      route,
      userAgent: navigator.userAgent,
      navigationType: metric.navigationType,
      ...readConnection(),
    };
    const body = JSON.stringify(payload);
    const url = '/api/montree/perf/vitals';
    // sendBeacon fires on page unload too. Fall back to fetch if unavailable.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* ignore — fire-and-forget */
    });
  } catch {
    /* never throw — this is telemetry only */
  }
}

export default function WebVitalsReporter() {
  const pathname = usePathname();
  // Hold the current route in a ref so the web-vitals listeners (bound once
  // on mount) read the latest pathname at report time, not a stale closure.
  // web-vitals has no unsubscribe API, so re-binding on every pathname change
  // would multiplicate listeners (CLS/INP fire multiple times per page).
  const pathnameRef = useRef(pathname || '/');
  useEffect(() => {
    pathnameRef.current = pathname || '/';
  }, [pathname]);

  useEffect(() => {
    // Dynamic import so the web-vitals bundle doesn't ship on SSR.
    let cancelled = false;
    (async () => {
      try {
        const wv = await import('web-vitals');
        if (cancelled) return;
        const report = (m: VitalMetric) =>
          reportMetric(m, pathnameRef.current);
        wv.onLCP?.(report);
        wv.onINP?.(report);
        wv.onCLS?.(report);
        wv.onFCP?.(report);
        wv.onTTFB?.(report);
      } catch {
        /* web-vitals not installed yet or import failed — silently skip */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only: bind web-vitals listeners ONCE. Each report reads
    // pathnameRef.current at the moment the metric stabilises.
  }, []);

  return null;
}
