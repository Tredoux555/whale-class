// lib/montree/montage/media-edits.ts
//
// Montage Studio per-item edits (migration 355). ONE place that knows the
// shape, so the API route, the duplicate lookup and the tests all agree.
//
//   [{ media_id, in_sec?, out_sec?, crop?: { x, y, width, height } }]
//
// 🚨 `crop` is VIDEO ONLY and is in SOURCE PIXEL coordinates — the worker
//    feeds it to ffmpeg `crop=w:h:x:y` BEFORE the scale to 1080x1920. A photo
//    is cropped up front through /api/montree/media/crop (which repoints
//    storage_path), so a photo never carries a crop here.
//
// Pure functions only — no Supabase, no Next, no I/O. Unit-tested in
// tests/montage-media-edits.test.ts.

export interface MediaEditCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaEdit {
  media_id: string;
  in_sec?: number;
  out_sec?: number;
  crop?: MediaEditCrop;
}

/** Mirrors the worker's per-clip ceiling and migration 353's CHECK (1..30). */
export const MAX_EDIT_SECONDS = 30;
/** A sub-second clip is a mis-drag, not a shot. */
export const MIN_EDIT_SECONDS = 1;
/** Smallest crop we will hand ffmpeg (pixels, each side). */
export const MIN_CROP_PX = 16;
/** Same ceiling as media_ids — one edit per picked item, at most. */
export const MAX_MEDIA_EDITS = 500;

export type ParseResult =
  | { ok: true; edits: MediaEdit[] }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finiteNumber(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function nonNegativeInt(v: unknown): number | null {
  const n = finiteNumber(v);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function parseCrop(raw: unknown): MediaEditCrop | string {
  if (!isPlainObject(raw)) return 'crop must be an object';
  const x = nonNegativeInt(raw.x);
  const y = nonNegativeInt(raw.y);
  const width = nonNegativeInt(raw.width);
  const height = nonNegativeInt(raw.height);
  if (x === null || y === null || width === null || height === null) {
    return 'crop.x, crop.y, crop.width and crop.height must be non-negative integers';
  }
  if (width < MIN_CROP_PX || height < MIN_CROP_PX) {
    return `crop must be at least ${MIN_CROP_PX}px on each side`;
  }
  return { x, y, width, height };
}

/**
 * Validate a client `media_edits` payload against the job's VERIFIED media_ids.
 *
 * Rules (all rejections are 400s, never silent drops — a teacher who trimmed a
 * clip must never get an untrimmed film back without being told):
 *   - array, at most MAX_MEDIA_EDITS entries
 *   - media_id must be one of `allowedIds` (the server-re-verified selection)
 *   - one entry per media_id
 *   - in_sec / out_sec are both-or-neither, 0 <= in < out <= 30, out-in >= 1
 *   - crop fields are non-negative integers, >= MIN_CROP_PX on each side
 *
 * `undefined` / `null` / `[]` all mean "no edits" and return an empty array.
 */
export function parseMediaEdits(raw: unknown, allowedIds: string[]): ParseResult {
  if (raw === undefined || raw === null) return { ok: true, edits: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'media_edits must be an array' };
  if (raw.length > MAX_MEDIA_EDITS) {
    return { ok: false, error: `media_edits may not exceed ${MAX_MEDIA_EDITS} entries` };
  }

  const allowed = new Set(allowedIds);
  const seen = new Set<string>();
  const edits: MediaEdit[] = [];

  for (const entry of raw) {
    if (!isPlainObject(entry)) {
      return { ok: false, error: 'each media_edits entry must be an object' };
    }
    const mediaId = entry.media_id;
    if (typeof mediaId !== 'string' || !allowed.has(mediaId)) {
      return { ok: false, error: 'media_edits.media_id must be one of media_ids' };
    }
    if (seen.has(mediaId)) {
      return { ok: false, error: 'media_edits may hold only one entry per media_id' };
    }
    seen.add(mediaId);

    const edit: MediaEdit = { media_id: mediaId };

    const hasIn = entry.in_sec !== undefined && entry.in_sec !== null;
    const hasOut = entry.out_sec !== undefined && entry.out_sec !== null;
    if (hasIn !== hasOut) {
      return { ok: false, error: 'media_edits needs both in_sec and out_sec, or neither' };
    }
    if (hasIn && hasOut) {
      const inSec = finiteNumber(entry.in_sec);
      const outSec = finiteNumber(entry.out_sec);
      if (inSec === null || outSec === null) {
        return { ok: false, error: 'in_sec and out_sec must be numbers' };
      }
      if (inSec < 0) return { ok: false, error: 'in_sec must be >= 0' };
      if (outSec <= inSec) return { ok: false, error: 'out_sec must be greater than in_sec' };
      if (outSec > MAX_EDIT_SECONDS) {
        return { ok: false, error: `out_sec must be <= ${MAX_EDIT_SECONDS}` };
      }
      if (outSec - inSec < MIN_EDIT_SECONDS) {
        return { ok: false, error: `a clip must be at least ${MIN_EDIT_SECONDS} second long` };
      }
      // Round to milliseconds — ffmpeg is fed a 3-decimal string anyway.
      edit.in_sec = Math.round(inSec * 1000) / 1000;
      edit.out_sec = Math.round(outSec * 1000) / 1000;
    }

    if (entry.crop !== undefined && entry.crop !== null) {
      const crop = parseCrop(entry.crop);
      if (typeof crop === 'string') return { ok: false, error: crop };
      edit.crop = crop;
    }

    // An entry that edits nothing is noise — drop it rather than store it.
    if (edit.in_sec === undefined && edit.crop === undefined) continue;
    edits.push(edit);
  }

  return { ok: true, edits };
}

/**
 * The per-clip cap the job must carry so the worker's own ceiling never cuts
 * the teacher's chosen window short. The longest trim wins; no trims at all
 * leaves the caller's default untouched.
 */
export function maxClipSecondsForEdits(edits: MediaEdit[], fallback: number): number {
  let longest = 0;
  for (const e of edits) {
    if (e.in_sec === undefined || e.out_sec === undefined) continue;
    longest = Math.max(longest, e.out_sec - e.in_sec);
  }
  if (longest <= 0) return fallback;
  return Math.min(MAX_EDIT_SECONDS, Math.max(fallback, Math.ceil(longest)));
}

/** Stable, order-independent signature of one edit set. */
export function editsSignature(edits: unknown): string {
  if (!Array.isArray(edits)) return '';
  const parts: string[] = [];
  for (const e of edits) {
    if (!isPlainObject(e) || typeof e.media_id !== 'string') continue;
    const crop = isPlainObject(e.crop)
      ? `${e.crop.x},${e.crop.y},${e.crop.width},${e.crop.height}`
      : '';
    parts.push(`${e.media_id}|${e.in_sec ?? ''}|${e.out_sec ?? ''}|${crop}`);
  }
  parts.sort();
  return parts.join(';');
}

/**
 * Two montage jobs with the same photo SET but different trims are different
 * films — the duplicate lookup compares this alongside media_ids.
 * A pre-355 row has no column at all (undefined) and reads as "no edits",
 * which is exactly right: it renders the untrimmed film.
 */
export function sameEdits(rowEdits: unknown, wanted: MediaEdit[]): boolean {
  return editsSignature(rowEdits) === editsSignature(wanted);
}
