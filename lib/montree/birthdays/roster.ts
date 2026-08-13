'use client';

// Birthdays tool — "Load my class".
//
// The paste box is the tool's universal path: it works for a teacher who has
// never signed in, and for a list that lives in a WhatsApp message. This module
// is the OTHER path — a signed-in teacher pulling their real roster, with the
// birthdays and the photographs already on file, so the class photo board
// needs no typing at all.
//
// Three jobs, all client-side:
//   • read the roster off /api/montree/children (cookie auth, same origin),
//   • map it into the tool's own BirthdayEntry / BirthdayUnknown shapes,
//   • fetch each child's photo and hand back a square JPEG data URL the PDF
//     builder can drop straight into a circular clip.
//
// Nothing here throws for a missing photo or a missing birthday. A roster is
// real data: some of it is always incomplete, and a printable that refuses to
// render because one child has no photograph is worse than useless.

import { getProxyUrl, getThumbnailUrl } from '../media/proxy-url';
import { daysInMonth, type BirthdayEntry, type BirthdayUnknown } from './parse';

/**
 * The house "birthday not known" sentinel. `montree_children.date_of_birth` is
 * NOT NULL, so a child entered without a birthday carries 1900-01-01 — a
 * syntactically real date that must NEVER be read as one (it would print a
 * 126th birthday on a wall chart). Duplicated rather than imported from
 * lib/cms — the same reason lib/cms/engine/doc-generator.ts duplicates it.
 */
export const UNKNOWN_DOB = '1900-01-01';

/** Exactly the fields /api/montree/children returns that this tool reads. */
export interface RosterChild {
  id: string;
  name: string;
  photo_url?: string | null;
  date_of_birth?: string | null;
}

/** Thrown when the roster call comes back unauthenticated. */
export class RosterAuthError extends Error {
  constructor(message = 'not signed in') {
    super(message);
    this.name = 'RosterAuthError';
  }
}

/**
 * Read the signed-in teacher's class.
 *
 * The endpoint scopes to the caller's own school from the session cookie —
 * there is no classroom id to pass and none is passed, so this can never reach
 * another school's roster. `cache: 'no-store'` because a teacher who just added
 * a child expects to see them (the endpoint's own 5s browser cache is fine for
 * the dashboard, wrong for a one-shot "load my class" tap).
 */
export async function loadClassRoster(signal?: AbortSignal): Promise<RosterChild[]> {
  const res = await fetch('/api/montree/children', {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });

  if (res.status === 401 || res.status === 403) throw new RosterAuthError();
  // JSON-before-OK: an error response may be an HTML page, never parse first.
  if (!res.ok) throw new Error(`children API responded ${res.status}`);

  const json = await res.json();
  const list: unknown = (json as { children?: unknown })?.children;
  if (!Array.isArray(list)) return [];

  return (list as RosterChild[]).filter(
    (c) => c && typeof c.name === 'string' && c.name.trim().length > 0,
  );
}

export interface RosterBirthdays {
  entries: BirthdayEntry[];
  unknown: BirthdayUnknown[];
}

/**
 * Split a roster into "has a birthday" and "doesn't".
 *
 * A child whose date is missing, sentinel, or not a readable calendar date is
 * KEPT — in `unknown`, flagged — never dropped and never given a guessed
 * birthday. The photo path rides along on both shapes so the board can show a
 * face for a child whose birthday nobody has filled in yet.
 */
export function rosterToBirthdays(children: RosterChild[]): RosterBirthdays {
  const entries: BirthdayEntry[] = [];
  const unknown: BirthdayUnknown[] = [];

  children.forEach((child, i) => {
    const name = child.name.trim();
    const photoUrl = child.photo_url?.trim() || undefined;
    const iso = (child.date_of_birth ?? '').trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

    if (!m || iso === UNKNOWN_DOB) {
      unknown.push({ name, photoUrl });
      return;
    }

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      unknown.push({ name, photoUrl });
      return;
    }

    entries.push({ line: i + 1, name, year, month, day, iso, photoUrl });
  });

  return { entries, unknown };
}

// ------------------------------------------------------------------- photos

/** Side of the square photo handed to the PDF, in pixels. */
const PHOTO_PX = 300;
/** JPEG quality — small enough that 24 photos stay well under a megabyte. */
const PHOTO_QUALITY = 0.82;

/**
 * Cover-crop a fetched image to a square JPEG data URL.
 *
 * Squaring it HERE rather than in the PDF is deliberate: jsPDF cannot crop, so
 * the board paints the photo edge-to-edge inside a circular clipping path, and
 * that is an exact centre crop only if the source is already square. Doing it
 * on a canvas also normalises whatever the media proxy served (WebP, PNG,
 * progressive JPEG) into the one format jsPDF is guaranteed to embed.
 */
async function toSquareJpeg(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_PX;
    canvas.height = PHOTO_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');

    // White under the photo: a transparent PNG source would otherwise embed as
    // black once JPEG drops the alpha channel.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PHOTO_PX, PHOTO_PX);

    const s = Math.max(PHOTO_PX / bitmap.width, PHOTO_PX / bitmap.height);
    const w = bitmap.width * s;
    const h = bitmap.height * s;
    ctx.drawImage(bitmap, (PHOTO_PX - w) / 2, (PHOTO_PX - h) / 2, w, h);

    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
  } finally {
    bitmap.close();
  }
}

/**
 * Fetch one child's photo, thumbnail first.
 *
 * The raw proxy URL is a real second attempt, not belt-and-braces: legacy
 * `montree_children.photo_url` rows hold a FULL Supabase public URL, and
 * `getThumbnailUrl()` does not normalise those back to a storage path
 * (`getProxyUrl()` does) — so for those rows the transform URL 502s and only
 * the fallback resolves.
 */
async function fetchOnePhoto(path: string): Promise<string | null> {
  const candidates = [getThumbnailUrl(path, 480, 78), getProxyUrl(path)];
  for (const url of candidates) {
    if (!url) continue;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size === 0) continue;
      return await toSquareJpeg(blob);
    } catch {
      // Try the next candidate; a child without a photo just gets an initial.
    }
  }
  return null;
}

/**
 * Fetch every photo with a small concurrency cap, tolerating failures.
 *
 * Bounded on purpose: a class of 24 fired at once buries a phone's connection
 * and the proxy's edge cache behind a burst, for no gain — five in flight
 * saturates the link and keeps the progress counter moving smoothly.
 */
export async function fetchRosterPhotos(
  paths: (string | undefined)[],
  concurrency = 5,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  let next = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(concurrency, unique.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= unique.length) return;
      const path = unique[i];
      const dataUrl = await fetchOnePhoto(path);
      if (dataUrl) out.set(path, dataUrl);
      done++;
      onProgress?.(done, unique.length);
    }
  });

  await Promise.all(workers);
  return out;
}
