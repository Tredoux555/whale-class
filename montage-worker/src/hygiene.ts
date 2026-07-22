// Photo hygiene with sharp:
//   1. EXIF auto-rotate (the classic phone-photo gotcha)
//   2. Blur gate — variance of the Laplacian; drop the softest outliers only
//      while more than 12 photos survive
//   3. Perceptual near-dupe collapse — dHash, hamming <= 6 keeps the sharper
//   4. >20 -> keep the 20 best-spread chronologically (never the first/last)
//
// Chronological order (captured_at asc) is preserved throughout.

import sharp from 'sharp';
import type { DownloadedPhoto } from './media';

export const MIN_PHOTOS = 8;
export const MAX_PHOTOS = 20;
const DEDUPE_HAMMING = 6;
const BLUR_FLOOR = 12; // never drop below this many for blur reasons
const BLUR_REL_THRESHOLD = 0.35; // drop only clearly-soft outliers

export interface PhotoDecision {
  id: string;
  capturedAt: string | null;
  kept: boolean;
  reason: string;
  order?: number; // final chronological index when kept
  blur?: number;
}

export interface ProcessedPhoto {
  id: string;
  capturedAt: string | null;
  buffer: Buffer; // normalized 1080x1920 cover jpeg
}

export interface HygieneResult {
  photos: ProcessedPhoto[];
  decisions: PhotoDecision[];
}

interface Analysis {
  id: string;
  capturedAt: string | null;
  oriented: Buffer;
  blur: number;
  hash: bigint;
}

// ---- variance of the Laplacian on a small greyscale (sharpness proxy) ----
async function laplacianVariance(oriented: Buffer): Promise<number> {
  const W = 400;
  const { data, info } = await sharp(oriented)
    .greyscale()
    .resize(W, W, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// ---- 64-bit difference hash (perceptual near-dupe fingerprint) ----
async function dHash(oriented: Buffer): Promise<bigint> {
  const { data, info } = await sharp(oriented)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width; // 9
  let hash = 0n;
  let bit = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * w + x];
      const right = data[y * w + x + 1];
      if (left > right) hash |= 1n << bit;
      bit++;
    }
  }
  return hash;
}

function hamming(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x) {
    x &= x - 1n;
    count++;
  }
  return count;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function normalize(oriented: Buffer): Promise<Buffer> {
  // 1080x1920 cover keeps aspect + fills the portrait frame; Ken Burns zooms
  // further in the browser. Downscaling here bounds render memory + file size.
  return sharp(oriented)
    .resize(1080, 1920, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

export async function runHygiene(
  downloaded: DownloadedPhoto[]
): Promise<HygieneResult> {
  const decisions: PhotoDecision[] = [];

  // --- analyze: EXIF-orient, then compute blur + hash ---
  const analyses: Analysis[] = [];
  for (const d of downloaded) {
    try {
      const oriented = await sharp(d.buffer).rotate().toBuffer(); // auto-orient
      const [blur, hash] = await Promise.all([
        laplacianVariance(oriented),
        dHash(oriented),
      ]);
      analyses.push({
        id: d.id,
        capturedAt: d.capturedAt,
        oriented,
        blur,
        hash,
      });
    } catch (e) {
      decisions.push({
        id: d.id,
        capturedAt: d.capturedAt,
        kept: false,
        reason: `unreadable: ${(e as Error).message}`,
      });
    }
  }

  // --- near-dupe collapse (chronological pass, keep the sharper) ---
  const kept: Analysis[] = [];
  for (const a of analyses) {
    let collided = -1;
    for (let j = 0; j < kept.length; j++) {
      if (hamming(a.hash, kept[j].hash) <= DEDUPE_HAMMING) {
        collided = j;
        break;
      }
    }
    if (collided === -1) {
      kept.push(a);
    } else if (a.blur > kept[collided].blur) {
      const dropped = kept[collided];
      decisions.push({
        id: dropped.id,
        capturedAt: dropped.capturedAt,
        kept: false,
        reason: `near-duplicate of ${a.id} (kept sharper)`,
        blur: dropped.blur,
      });
      kept[collided] = a; // replace with the sharper shot
    } else {
      decisions.push({
        id: a.id,
        capturedAt: a.capturedAt,
        kept: false,
        reason: `near-duplicate of ${kept[collided].id} (kept sharper)`,
        blur: a.blur,
      });
    }
  }

  // --- blur gate: drop the softest outliers, never below BLUR_FLOOR ---
  while (kept.length > BLUR_FLOOR) {
    const med = median(kept.map((k) => k.blur));
    let minIdx = 0;
    for (let i = 1; i < kept.length; i++) {
      if (kept[i].blur < kept[minIdx].blur) minIdx = i;
    }
    if (kept[minIdx].blur < BLUR_REL_THRESHOLD * med) {
      const dropped = kept.splice(minIdx, 1)[0];
      decisions.push({
        id: dropped.id,
        capturedAt: dropped.capturedAt,
        kept: false,
        reason: `blurry (var ${dropped.blur.toFixed(1)} < ${(
          BLUR_REL_THRESHOLD * med
        ).toFixed(1)})`,
        blur: dropped.blur,
      });
    } else {
      break;
    }
  }

  // --- re-sort survivors chronologically (dedupe replacement may reorder) ---
  kept.sort((a, b) => {
    const ta = a.capturedAt ? Date.parse(a.capturedAt) : Number.MAX_SAFE_INTEGER;
    const tb = b.capturedAt ? Date.parse(b.capturedAt) : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });

  // --- cap at MAX_PHOTOS: keep the best-spread, never the first or last ---
  let survivors = kept;
  if (survivors.length > MAX_PHOTOS) {
    const picked = pickEvenSpread(survivors.length, MAX_PHOTOS);
    const keptSet = new Set(picked);
    const next: Analysis[] = [];
    survivors.forEach((s, i) => {
      if (keptSet.has(i)) {
        next.push(s);
      } else {
        decisions.push({
          id: s.id,
          capturedAt: s.capturedAt,
          kept: false,
          reason: `over ${MAX_PHOTOS} photos — dropped to keep an even spread`,
          blur: s.blur,
        });
      }
    });
    survivors = next;
  }

  // --- normalize survivors + emit kept decisions in final order ---
  const photos: ProcessedPhoto[] = [];
  for (let i = 0; i < survivors.length; i++) {
    const s = survivors[i];
    const buffer = await normalize(s.oriented);
    photos.push({ id: s.id, capturedAt: s.capturedAt, buffer });
    decisions.push({
      id: s.id,
      capturedAt: s.capturedAt,
      kept: true,
      reason: 'kept',
      order: i,
      blur: s.blur,
    });
  }

  return { photos, decisions };
}

// Choose `keep` indices from `total`, always including 0 and total-1, evenly
// spread. Deterministic.
export function pickEvenSpread(total: number, keep: number): number[] {
  if (keep >= total) return Array.from({ length: total }, (_, i) => i);
  if (keep <= 1) return [0];
  const out: number[] = [];
  for (let j = 0; j < keep; j++) {
    const idx = Math.round((j * (total - 1)) / (keep - 1));
    out.push(idx);
  }
  // De-dupe any collisions from rounding while preserving endpoints.
  return Array.from(new Set(out)).sort((a, b) => a - b);
}
