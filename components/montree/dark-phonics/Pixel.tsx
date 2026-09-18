'use client';

/**
 * Pixel — the hub's whole measurement layer, mounted once by DarkPhonicsHub.
 *
 * It does three jobs, in this order of importance:
 *
 *   1. STAMPS the two first-party cookies (dp_aid, dp_utm) on first paint, so
 *      every beacon after it carries an id and a source. First touch wins: an
 *      existing dp_utm is never overwritten by a later bare visit.
 *   2. EXPORTS dpTrack(), the fire-and-forget beacon the rest of the hub calls.
 *   3. OPTIONALLY loads the Meta pixel — and only when NEXT_PUBLIC_META_PIXEL_ID
 *      is set. 🚨 NO ENV, NO THIRD-PARTY SCRIPT. There is no fallback id, no
 *      "test" id and no other vendor: with the variable unset this page loads
 *      nothing from anybody but us, which is the promise the hub makes to a
 *      teacher opening it cold.
 *
 * Nothing here ever throws into a render: a blocked cookie jar, a private
 * window or a beacon-less browser all degrade to "we learn less", never to a
 * broken lesson.
 */

import { useEffect } from 'react';

import {
  DP_AID_COOKIE,
  DP_AID_MAX_AGE,
  DP_UTM_COOKIE,
  DP_UTM_MAX_AGE,
  cookieString,
  newAid,
  parseUtmFromSearch,
  readCookie,
  serializeUtmCookie,
} from '@/lib/montree/dark-phonics/attribution';
import type { DpEvent } from '@/lib/montree/dark-phonics/events';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };

interface PixelWindow extends Window {
  fbq?: Fbq;
  _fbq?: Fbq;
}

/** Ensure dp_aid exists and return it. Returns null when cookies are blocked. */
export function ensureAid(): string | null {
  try {
    const existing = readCookie(document.cookie, DP_AID_COOKIE);
    if (existing) return existing;
    const aid = newAid();
    document.cookie = cookieString(DP_AID_COOKIE, aid, DP_AID_MAX_AGE);
    // Read it back: in a private window the write silently does nothing, and a
    // beacon carrying an id the server will never see again is worse than none.
    return readCookie(document.cookie, DP_AID_COOKIE);
  } catch {
    return null;
  }
}

/** First touch wins — an existing dp_utm is left exactly as it is. */
export function stampUtm(search: string): void {
  try {
    if (readCookie(document.cookie, DP_UTM_COOKIE)) return;
    const utm = parseUtmFromSearch(new URLSearchParams(search));
    if (!utm) return;
    document.cookie = cookieString(DP_UTM_COOKIE, serializeUtmCookie(utm), DP_UTM_MAX_AGE);
  } catch {
    /* private mode — the visit is simply unattributed */
  }
}

export interface DpTrackPayload {
  lesson?: number | null;
  stage?: string | null;
  props?: Record<string, string | number | boolean>;
}

/**
 * Fire one event. Never awaited, never throws, never blocks an interaction.
 *
 * sendBeacon first (it survives the page unloading, which is exactly when a
 * `lesson_open` on a deep link fires), fetch+keepalive as the fallback.
 */
export function dpTrack(event: DpEvent, payload: DpTrackPayload = {}): void {
  try {
    const body = JSON.stringify({
      event,
      lesson: payload.lesson ?? null,
      stage: payload.stage ?? null,
      props: payload.props ?? null,
    });
    const url = '/api/dark-phonics/event';
    const sent =
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    if (!sent) {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
    mirrorToPixel(event, payload);
  } catch {
    /* measurement is never allowed to break the thing being measured */
  }
}

/** The Meta mirror. A no-op unless the pixel actually loaded. */
function mirrorToPixel(event: DpEvent, payload: DpTrackPayload): void {
  if (!PIXEL_ID) return;
  const fbq = (window as PixelWindow).fbq;
  if (typeof fbq !== 'function') return;
  switch (event) {
    case 'lesson_open':
      fbq('track', 'ViewContent', { content_type: 'lesson', content_ids: [String(payload.lesson ?? '')] });
      break;
    case 'lead_submit':
      fbq('track', 'Lead');
      break;
    case 'checkout_start':
      fbq('track', 'InitiateCheckout');
      break;
    case 'subscribe_done':
      fbq('track', 'Subscribe');
      break;
    default:
      break;
  }
}

/**
 * Mount once, at the top of the hub. Renders nothing.
 *
 * `path` and `search` come from the caller rather than usePathname/
 * useSearchParams so the component has no Suspense requirement of its own.
 */
export default function Pixel({ search = '' }: { search?: string }) {
  useEffect(() => {
    ensureAid();
    stampUtm(search || window.location.search);

    if (!PIXEL_ID) return;
    const w = window as PixelWindow;
    if (w.fbq) {
      w.fbq('track', 'PageView');
      return;
    }
    // The standard Meta bootstrap, written out rather than eval'd from a string
    // so it is readable and so no inline <script> is needed (this page sets no
    // CSP of its own, but an inline script is still the thing a CSP would stop).
    const fbq: Fbq = function (...args: unknown[]) {
      (fbq.queue as unknown[]).push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    w.fbq = fbq;
    w._fbq = fbq;

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);

    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
  }, [search]);

  return null;
}
