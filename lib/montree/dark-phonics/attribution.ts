// lib/montree/dark-phonics/attribution.ts
//
// First-touch attribution for the Dark Phonics hub, in the smallest shape that
// answers "where did this teacher come from?".
//
// Two cookies, both readable by the browser (the hub's own beacons stamp them
// onto every event), both first-touch-wins:
//
//   dp_utm  JSON {source,medium,campaign,content,ref,ts} — 90 days. Written the
//           first time a /dark-phonics* or /dp URL carries utm_* or ?ref.
//   dp_aid  an anonymous id, uuid v4 shaped — 1 year. Not a person: a browser.
//
// 🚨 PURE MODULE. Nothing here touches next/headers, next/server, the database
// or process.env, so every line is unit-testable and it imports cleanly into a
// client component. The cookie WRITING lives in components/.../Pixel.tsx and
// the reading in the event route; both use the helpers below.
//
// The ideas are lifted from lib/montree/outreach/stamp-attribution.ts (first
// touch wins, never throw, tolerate a malformed cookie) — deliberately NOT the
// same cookie: `montree_attrib` belongs to the school funnel, and stamping a
// school row from a phonics visit would be a lie.

export const DP_UTM_COOKIE = 'dp_utm';
export const DP_AID_COOKIE = 'dp_aid';

/** 90 days, in seconds — the attribution window the school funnel also uses. */
export const DP_UTM_MAX_AGE = 60 * 60 * 24 * 90;
/** 1 year, in seconds. */
export const DP_AID_MAX_AGE = 60 * 60 * 24 * 365;

export interface DpUtm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  ref: string | null;
  /** ISO timestamp of the FIRST touch. */
  ts: string;
}

/** One field may never be longer than this — a cookie is not a log line. */
const MAX_FIELD = 120;

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, MAX_FIELD);
  if (!s) return null;
  // Control characters and semicolons would break the cookie itself.
  // FIXED (audit, 2026-09-18): this regex previously embedded RAW control
  // bytes (an actual 0x00 and 0x1F byte in the source file, not the escape
  // sequences) inside the character class. It worked, but a literal NUL in a
  // .ts file is exactly the kind of thing an editor, a copy-paste or a file
  // transfer silently mangles -- grep already reported this file as binary
  // because of it. Same character class, spelled so it survives a text
  // pipeline: control characters and the one char (`;`) that would break
  // the cookie.
  const stripped = s.replace(/[\x00-\x1f;]/g, '');
  return stripped || null;
}

/**
 * Read the utm_* / ref parameters off a URL's query.
 *
 * Returns null when NOTHING identifying is present — a bare visit must not
 * overwrite a real first touch with a row of nulls.
 */
export function parseUtmFromSearch(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  now: Date = new Date(),
): DpUtm | null {
  const get = (k: string): string | null => {
    if (params instanceof URLSearchParams) return clean(params.get(k));
    const v = (params as Record<string, string | string[] | undefined>)[k];
    return clean(Array.isArray(v) ? v[0] : v);
  };

  const utm: DpUtm = {
    source: get('utm_source'),
    medium: get('utm_medium'),
    campaign: get('utm_campaign'),
    content: get('utm_content'),
    ref: get('ref'),
    ts: now.toISOString(),
  };

  const any = utm.source || utm.medium || utm.campaign || utm.content || utm.ref;
  return any ? utm : null;
}

/** The cookie VALUE for a parsed touch (already URI-encoded, ready to set). */
export function serializeUtmCookie(utm: DpUtm): string {
  return encodeURIComponent(JSON.stringify(utm));
}

/** The inverse. Never throws: a hand-edited cookie is simply "no attribution". */
export function parseUtmCookie(raw: unknown): DpUtm | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const decoded = raw.trim().startsWith('{') ? raw : decodeURIComponent(raw);
    const o = JSON.parse(decoded) as Record<string, unknown>;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const ts = clean(o.ts);
    return {
      source: clean(o.source),
      medium: clean(o.medium),
      campaign: clean(o.campaign),
      content: clean(o.content),
      ref: clean(o.ref),
      ts: ts ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

/** uuid v4 shape. Accepts nothing else — an aid is a cookie anyone can edit. */
const AID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isAid(v: unknown): v is string {
  return typeof v === 'string' && AID_RE.test(v);
}

/**
 * A fresh anonymous id. Uses crypto.randomUUID where it exists (it does in
 * every browser and runtime this repo ships to) and falls back to a hand-rolled
 * v4 so the helper is safe to call from a test in a bare node.
 */
export function newAid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The `document.cookie` string for one of our two cookies. Lax, not Strict:
 *  the whole point is that the visitor ARRIVED from somewhere else. */
export function cookieString(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/** Read one cookie out of a raw `document.cookie` / `Cookie:` header string. */
export function readCookie(all: string | null | undefined, name: string): string | null {
  if (!all) return null;
  for (const part of all.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
