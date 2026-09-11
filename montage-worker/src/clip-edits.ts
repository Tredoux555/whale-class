// Per-item montage edits (migration 355) — the PURE half.
//
// The teacher trimmed a clip's in/out point and/or drew a crop box on it in
// Montage Studio; those decisions are stored on the job as
// montree_montage_jobs.media_edits and arrive here as untrusted jsonb.
//
// 🚨 NOTHING in this file does I/O or imports ffmpeg. It is the one place
// that turns "what she asked for" into "what ffmpeg is told", so it can be
// unit-tested standalone (tests/montage-worker-clip-edits.test.ts).
//
// 🚨 `crop` is in SOURCE PIXEL coordinates and applies to VIDEO only. A photo
// is cropped up front by the web app (sharp, replace_original), so by the time
// the worker downloads it, storage_path already IS the cropped image.

export interface ClipCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaEdit {
  media_id: string;
  in_sec?: number;
  out_sec?: number;
  crop?: ClipCrop;
}

export interface ClipWindow {
  startSec: number;
  durationSec: number;
}

/** Hard ceiling, mirroring the API's MAX_EDIT_SECONDS and 353's CHECK. */
export const MAX_EDIT_SECONDS = 30;
/** Smallest window / crop side we will hand ffmpeg. */
export const MIN_EDIT_SECONDS = 0.5;
export const MIN_CROP_PX = 16;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read montree_montage_jobs.media_edits into a media_id -> edit map.
 *
 * Tolerant by design: this is stored jsonb, possibly written by an older or
 * newer app version. A malformed entry is DROPPED (that item simply renders
 * with the worker's own defaults) rather than failing the render — a film
 * with one auto-trimmed clip beats no film.
 *
 * A pre-355 database yields `undefined` here and the map is empty, which is
 * byte-for-byte the pre-355 behaviour.
 */
export function parseJobMediaEdits(raw: unknown): Map<string, MediaEdit> {
  const out = new Map<string, MediaEdit>();
  // pg hands jsonb back already parsed, but a text column (or a hand-written
  // row) can still arrive as a string.
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return out;
    }
  }
  if (!Array.isArray(value)) return out;

  for (const entry of value) {
    if (!isPlainObject(entry)) continue;
    const mediaId = entry.media_id;
    if (typeof mediaId !== 'string' || !mediaId) continue;

    const edit: MediaEdit = { media_id: mediaId };

    const inSec = num(entry.in_sec);
    const outSec = num(entry.out_sec);
    if (
      inSec !== null &&
      outSec !== null &&
      inSec >= 0 &&
      outSec > inSec &&
      outSec - inSec >= MIN_EDIT_SECONDS
    ) {
      edit.in_sec = inSec;
      edit.out_sec = Math.min(outSec, inSec + MAX_EDIT_SECONDS);
    }

    if (isPlainObject(entry.crop)) {
      const x = num(entry.crop.x);
      const y = num(entry.crop.y);
      const width = num(entry.crop.width);
      const height = num(entry.crop.height);
      if (
        x !== null && y !== null && width !== null && height !== null &&
        x >= 0 && y >= 0 && width >= MIN_CROP_PX && height >= MIN_CROP_PX
      ) {
        edit.crop = {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        };
      }
    }

    if (edit.in_sec === undefined && edit.crop === undefined) continue;
    out.set(mediaId, edit);
  }
  return out;
}

/**
 * The window to cut from one clip.
 *
 * The teacher's own in/out ALWAYS wins over clipWindow()'s guess — that is the
 * whole point of the Studio. It is only bounded by reality: the source's real
 * duration (when known) and the 30-second ceiling. `remainingSec` is the
 * film's leftover clip budget; a trim longer than what is left is shortened
 * rather than dropped, so the teacher still sees the start of her shot.
 *
 * Returns null when the edit carries no trim — the caller falls back to
 * clipWindow() exactly as before.
 */
export function editClipWindow(
  edit: MediaEdit | undefined,
  sourceDurationSec: number,
  remainingSec: number
): ClipWindow | null {
  if (!edit || edit.in_sec === undefined || edit.out_sec === undefined) return null;

  const start = Math.max(0, edit.in_sec);
  let end = Math.min(edit.out_sec, start + MAX_EDIT_SECONDS);
  if (Number.isFinite(sourceDurationSec) && sourceDurationSec > 0) {
    end = Math.min(end, sourceDurationSec);
  }
  if (Number.isFinite(remainingSec) && remainingSec > 0) {
    end = Math.min(end, start + remainingSec);
  }
  const durationSec = end - start;
  if (!(durationSec >= MIN_EDIT_SECONDS)) return null;
  return { startSec: start, durationSec };
}

/**
 * Clamp a teacher-drawn crop into the clip's REAL pixel frame.
 *
 * The box was drawn against whatever dimensions the browser reported; ffmpeg
 * will refuse (and fail the whole job) if the rectangle pokes one pixel
 * outside the decoded frame. Returns null when there is nothing usable left,
 * in which case the clip is normalised uncropped — the pre-355 behaviour.
 */
export function clampCrop(
  crop: ClipCrop | undefined,
  frameWidth: number,
  frameHeight: number
): ClipCrop | null {
  if (!crop) return null;
  if (!(frameWidth > 0) || !(frameHeight > 0)) return null;

  const x = Math.max(0, Math.min(Math.round(crop.x), frameWidth - MIN_CROP_PX));
  const y = Math.max(0, Math.min(Math.round(crop.y), frameHeight - MIN_CROP_PX));
  // libx264 wants even dimensions; the scale/crop chain downstream is happier
  // with them too, so round the box DOWN to even.
  const width = Math.floor(Math.min(Math.round(crop.width), frameWidth - x) / 2) * 2;
  const height = Math.floor(Math.min(Math.round(crop.height), frameHeight - y) / 2) * 2;

  if (width < MIN_CROP_PX || height < MIN_CROP_PX) return null;
  if (width >= frameWidth && height >= frameHeight && x === 0 && y === 0) return null; // no-op
  return { x, y, width, height };
}

/**
 * The -vf chain for one normalised clip.
 *
 * 🚨 ORDER IS LOAD-BEARING: crop the SOURCE pixels first, then scale the
 * result into the 1080x1920 montage frame. Cropping after the scale would
 * cut the teacher's framing out of an already-reframed picture.
 */
export function buildClipVideoFilter(opts: {
  outWidth: number;
  outHeight: number;
  fps: number;
  crop?: ClipCrop | null;
}): string {
  const { outWidth, outHeight, fps, crop } = opts;
  const chain: string[] = [];
  if (crop) chain.push(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`);
  chain.push(
    `scale=${outWidth}:${outHeight}:force_original_aspect_ratio=increase`,
    `crop=${outWidth}:${outHeight}`,
    `fps=${fps}`,
    'setsar=1',
    'format=yuv420p'
  );
  return chain.join(',');
}
