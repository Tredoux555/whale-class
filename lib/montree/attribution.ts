// lib/montree/attribution.ts
// Shared ad-geo attribution helpers (Jul 7, 2026).
//
// First-touch model: the browser drops a `montree_attrib` cookie on the first
// public page it sees (set only if absent — first touch wins). At signup, the
// register / try routes read it back and stamp the school row. Aggregated in the
// super-admin funnel view (country × source → visits / signups / trials).
//
// No PII lives here. utm_* + a derived channel class + country only.

export const ATTRIB_COOKIE = 'montree_attrib';

// UTM keys we capture (utm_term deliberately omitted from v1 — search-only, noisy).
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export interface AttribPayload {
  source: string; // derived channel class — see deriveSource()
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  country?: string | null;
  ts: string; // ISO first-touch timestamp
}

/** Trim + cap a raw utm value; returns undefined for empty/oversized junk. */
export function sanitizeUtm(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim().slice(0, 200);
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Derive a coarse channel class from utm_source + referrer.
 * Priority: explicit utm_source (normalized) > referrer-domain class > direct.
 * Welcome-code (outreach cold-email) traffic is classed 'outreach' by the caller,
 * which passes utm_source='outreach' — so it flows through the utm_source branch.
 */
export function deriveSource(
  utmSource: string | undefined | null,
  referrer: string | undefined | null
): string {
  const us = (utmSource || '').trim().toLowerCase();
  if (us) {
    if (/facebook|fb|instagram|ig|meta/.test(us)) return 'fb';
    if (/google|bing|search|duckduck/.test(us)) return 'search';
    if (/outreach|email|cold/.test(us)) return 'outreach';
    return us.slice(0, 40); // keep the raw utm_source as its own bucket
  }

  const ref = (referrer || '').toLowerCase();
  if (!ref) return 'direct';
  try {
    // Referrer may be a bare domain (VisitorTracker stores document.referrer).
    const host = ref.replace(/^https?:\/\//, '').split('/')[0];
    if (!host || host.includes('montree')) return 'direct'; // internal nav / no external ref
    if (/facebook\.|fb\.|instagram\.|fbclid/.test(host)) return 'fb';
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(host)) return 'search';
    if (/t\.co|twitter\.|x\.com/.test(host)) return 'x';
    if (/linkedin\./.test(host)) return 'linkedin';
    return 'referral';
  } catch {
    return 'direct';
  }
}

/** Parse the montree_attrib cookie JSON safely. Returns null on any problem. */
export function parseAttribCookie(raw: string | undefined | null): AttribPayload | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const obj = JSON.parse(decoded) as Partial<AttribPayload>;
    if (!obj || typeof obj !== 'object' || typeof obj.source !== 'string') return null;
    return {
      source: obj.source.slice(0, 40),
      utm_source: sanitizeUtm(obj.utm_source),
      utm_medium: sanitizeUtm(obj.utm_medium),
      utm_campaign: sanitizeUtm(obj.utm_campaign),
      utm_content: sanitizeUtm(obj.utm_content),
      country: typeof obj.country === 'string' ? obj.country.slice(0, 80) : null,
      ts: typeof obj.ts === 'string' ? obj.ts.slice(0, 40) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
