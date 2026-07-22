// Track selection + beat-grid loading. NO audio analysis at render time — the
// grids are precomputed (montage-kit/music/<slug>.beats.json) and shipped in
// the worker image at assets/music/.

import fs from 'node:fs';
import path from 'node:path';
import { MUSIC_DIR } from './config';
import type { Track } from '../remotion/src/timing';

// Usable defaults: the 5 STEADY/ACCEPTABLE slots. Excludes tender-strings
// (flagged borderline-rubato — cuts may drift) and the two unfilled slots.
export const USABLE_SLUGS = [
  'flagship-felt-piano',
  'bright-week',
  'morning-light',
  'term-end',
  'wildcard-warmth',
] as const;

export interface BeatsFile {
  slug: string;
  source_file: string;
  bpm: number;
  beats: number[];
  downbeats: number[];
  duration: number;
  stability?: { iqr_bpm: number; pct_deviant: number };
}

export function mp3Path(slug: string): string {
  return path.join(MUSIC_DIR, `${slug}.mp3`);
}

export function beatsPath(slug: string): string {
  return path.join(MUSIC_DIR, `${slug}.beats.json`);
}

// Startup gate — hard-fail boot if any expected asset is missing (spec).
export function validateMusicAssets(): void {
  const missing: string[] = [];
  for (const slug of USABLE_SLUGS) {
    if (!fs.existsSync(mp3Path(slug))) missing.push(`${slug}.mp3`);
    if (!fs.existsSync(beatsPath(slug))) missing.push(`${slug}.beats.json`);
  }
  if (missing.length) {
    throw new Error(
      `Music assets missing from ${MUSIC_DIR}: ${missing.join(', ')}. ` +
        `Run scripts/prepare-assets.sh before building the image.`
    );
  }
}

export function loadBeats(slug: string): BeatsFile {
  const raw = fs.readFileSync(beatsPath(slug), 'utf8');
  const parsed = JSON.parse(raw) as BeatsFile;
  if (!Array.isArray(parsed.downbeats) || parsed.downbeats.length < 4) {
    throw new Error(`Beats file for ${slug} has no usable downbeats`);
  }
  return parsed;
}

// ISO 8601 week number (1-53). Deterministic; consecutive weeks differ.
export function isoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Rotate track by ISO week of the report's week_start so consecutive weeks
// don't repeat. Falls back to today's week if week_start is absent.
export function selectSlug(weekStart: string | null): string {
  const date = weekStart ? new Date(weekStart) : new Date();
  const wk = Number.isNaN(date.getTime()) ? isoWeek(new Date()) : isoWeek(date);
  const idx = ((wk % USABLE_SLUGS.length) + USABLE_SLUGS.length) %
    USABLE_SLUGS.length;
  return USABLE_SLUGS[idx];
}

export function trackForReport(weekStart: string | null): {
  slug: string;
  track: Track;
  mp3: string;
} {
  const slug = selectSlug(weekStart);
  const beats = loadBeats(slug);
  return {
    slug,
    mp3: mp3Path(slug),
    track: {
      slug,
      bpm: beats.bpm,
      downbeats: beats.downbeats,
      durationSec: beats.duration,
    },
  };
}
