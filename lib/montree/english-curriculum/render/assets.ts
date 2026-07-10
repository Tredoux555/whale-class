/**
 * render/assets.ts — the asset manifest bridge.
 *
 * Turns dropped files (Studio) or a scanned folder (CLI) into an AssetMap keyed
 * by the spec word, and reports which manifest images are still missing — the
 * "what pictures do you still need" contract (mirrors the mvgen Shot Planner).
 *
 * Filename → word rules (locked):
 *   - strip a leading numeric order prefix:  "04-cup.png" → "cup"
 *   - strip the "-coloring" suffix:          "cup-coloring.png" → "cup" (coloring)
 *   - lower-case, collapse [-_\s]+ to a SINGLE space, extension ignored.
 *
 * 🚨 THE CANONICAL KEY (both sides): lower-case, hyphens/underscores/runs of
 * whitespace → one space, trimmed. "moon-on-mat.png" and a spec image of
 * "moon-on-mat" (or "moon on mat") ALL resolve to the key "moon on mat".
 * The write side (parseAssetFilename) and the read side (resolveImage) MUST
 * apply the identical normalisation or compound-word images never resolve.
 */

import type { WeekSpec } from '../spec/types';

export interface AssetMap {
  /** word (lower-case) -> usable image URL. */
  images: Record<string, string>;
  /** word (lower-case) -> *-coloring.png URL. */
  coloring: Record<string, string>;
  /** song key -> audio URL (rarely used; QR cards prefer spec.audioUrl). */
  audio?: Record<string, string>;
}

export interface ParsedFilename {
  /** The spec word this file maps to (lower-case, no prefix/suffix/ext). */
  word: string;
  /** True when the file is a `<word>-coloring.png` line-art asset. */
  coloring: boolean;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

/** The canonical asset key: lower-case, hyphens/underscores/whitespace → one space, trimmed. */
export function normalizeAssetKey(word: string): string {
  return String(word).toLowerCase().replace(/[-_\s]+/g, ' ').trim();
}

/** Parse a filename into { word, coloring }. Returns null for non-image files. */
export function parseAssetFilename(filename: string): ParsedFilename | null {
  const clean = filename.split(/[\\/]/).pop() ?? filename;
  const lower = clean.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  if (dot >= 0 && !IMAGE_EXTS.includes(ext)) return null;

  let stem = dot >= 0 ? lower.slice(0, dot) : lower;
  // strip a leading order prefix: "04-cup", "12_ant" -> "cup" / "ant"
  stem = stem.replace(/^\d+[-_\s]+/, '');
  // detect + strip the coloring suffix
  const coloring = /[-_\s]coloring$/.test(stem);
  stem = stem.replace(/[-_\s]coloring$/, '');
  // normalise the remaining word (canonical key form — see normalizeAssetKey)
  const word = normalizeAssetKey(stem);
  if (!word) return null;
  return { word, coloring };
}

export interface AssetFile { name: string; url: string; }

/** Build an AssetMap from a flat list of { filename, url }. */
export function buildAssetMap(files: AssetFile[]): AssetMap {
  const images: Record<string, string> = {};
  const coloring: Record<string, string> = {};
  for (const f of files) {
    const parsed = parseAssetFilename(f.name);
    if (!parsed) continue;
    if (parsed.coloring) coloring[parsed.word] = f.url;
    else images[parsed.word] = f.url;
  }
  return { images, coloring };
}

/** Resolve an image URL for a word, or null. Coloring lookups fall back to nothing. */
export function resolveImage(
  assets: AssetMap,
  word: string,
  opts?: { coloring?: boolean },
): string | null {
  // 🚨 Normalise the QUERY exactly like the write side (parseAssetFilename), or
  // compound-word keys ("moon-on-mat", "bus stop") never match the stored key.
  const key = normalizeAssetKey(word);
  if (opts?.coloring) return assets.coloring[key] ?? null;
  return assets.images[key] ?? null;
}

export interface AssetGap {
  file: string;
  usedBy: string[];
  mjPrompt: string;
  /** If this exact image was declared by an EARLIER week, its week number.
   *  Signals "copy it in from that week's folder" rather than re-generate. */
  fromEarlierWeek?: number;
}

/**
 * assetGapReport — for every image the week's manifest declares, report the
 * ones the caller has NOT supplied yet (matched by parsed word + coloring flag).
 *
 * `priorSpecs` (optional) = earlier weeks' specs. A missing image whose exact
 * key was already declared by an earlier week is tagged `fromEarlierWeek` so the
 * Studio can say "copy it in from Week N" instead of "generate it".
 */
export function assetGapReport(
  spec: WeekSpec,
  assets: AssetMap,
  priorSpecs: WeekSpec[] = [],
): { missing: AssetGap[] } {
  // Map each earlier-declared asset key → the EARLIEST week that declared it.
  const priorByKey = new Map<string, number>();
  for (const ps of priorSpecs) {
    if (!ps || ps.week >= spec.week) continue;
    for (const a of ps.assets ?? []) {
      const p = parseAssetFilename(a.file);
      if (!p) continue;
      const k = `${p.coloring ? 'c' : 'i'}|${p.word}`;
      const prev = priorByKey.get(k);
      if (prev === undefined || ps.week < prev) priorByKey.set(k, ps.week);
    }
  }

  const missing: AssetGap[] = [];
  const seen = new Set<string>();
  for (const a of spec.assets ?? []) {
    if (seen.has(a.file)) continue;
    seen.add(a.file);
    const parsed = parseAssetFilename(a.file);
    if (!parsed) continue;
    const have = parsed.coloring
      ? assets.coloring[parsed.word]
      : assets.images[parsed.word];
    if (!have) {
      const fromEarlierWeek = priorByKey.get(`${parsed.coloring ? 'c' : 'i'}|${parsed.word}`);
      missing.push({
        file: a.file,
        usedBy: a.usedBy ?? [],
        mjPrompt: a.mjPrompt ?? '',
        ...(fromEarlierWeek !== undefined ? { fromEarlierWeek } : {}),
      });
    }
  }
  return { missing };
}
