// v1.1 — white-label lockup for the end card (design tab 09).
//
// "The app advertises the school, not itself." The last ~3.5s of EVERY film
// (child and class alike) is the school's frame: school logo largest, school
// name, class emblem + class name, week label, and a 9px "made with Potato
// Snaps" signature.
//
// Everything here degrades. A pre-migration database has no branding columns,
// a new class has uploaded nothing, an uploaded file may 404 or be corrupt —
// in every one of those cases the card still renders, with an initials mark in
// place of the logo. A branding failure must never fail a film.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { JOB_BRANDING_DIR } from './config';
import type { WorkerConfig } from './config';
import type { ClassRow } from './db';
import { downloadObject } from './media';
import type { Branding } from '../remotion/src/timing';

/** Defensive ceiling; the upload API caps at 2MB (addendum §2). */
const MAX_BRANDING_BYTES = 8 * 1024 * 1024;

/** Source sizes — comfortably above the rendered 194px / 65px at 1080 wide. */
const LOGO_PX = 512;
const EMBLEM_PX = 256;

const MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * "WEEK OF SEP 7–11" for a Mon–Fri span, "WEEK OF SEP 28–OCT 2" when the week
 * straddles a month boundary.
 *
 * weekStart is the job's DATE column — a raw 'YYYY-MM-DD' string (the pg type
 * parsers in db.ts guarantee it is never a Date). Parsed as UTC so the label
 * can't slide a day on a server in another timezone.
 */
export function formatWeekLabel(weekStart: string | null): string {
  if (!weekStart) return 'THIS WEEK';
  const start = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return 'THIS WEEK';
  // Monday + 4 = Friday: the school week the film covers.
  const end = new Date(start.getTime() + 4 * 86400000);

  const m0 = MONTH_SHORT[start.getUTCMonth()];
  const m1 = MONTH_SHORT[end.getUTCMonth()];
  const d0 = start.getUTCDate();
  const d1 = end.getUTCDate();

  return m0 === m1
    ? `WEEK OF ${m0} ${d0}–${d1}`
    : `WEEK OF ${m0} ${d0}–${m1} ${d1}`;
}

/**
 * Initials for the no-logo fallback mark: first letter of the first two words,
 * or the first two characters of a single word. Codepoint-aware so a CJK name
 * yields one clean glyph rather than half a surrogate pair.
 */
export function initialsFor(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = (w: string) => [...w][0] ?? '';
  if (words.length >= 2) {
    return (first(words[0]) + first(words[1])).toUpperCase();
  }
  const chars = [...words[0]];
  return (chars.length >= 2 ? chars[0] + chars[1] : chars[0]).toUpperCase();
}

/** Wipe + recreate the per-job branding dir (mirrors resetJobPhotos). */
export function resetJobBranding(): void {
  try {
    fs.rmSync(JOB_BRANDING_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  fs.mkdirSync(JOB_BRANDING_DIR, { recursive: true });
}

/**
 * Download one branding image and normalize it to a square PNG on disk.
 * Returns the public-relative path for staticFile(), or null on any failure.
 *
 * `fit` differs by role, on purpose:
 *  - logo   → 'contain' on a transparent canvas. School logos are frequently
 *             wide wordmarks; cover-cropping one would decapitate it. Contained
 *             on transparency it sits correctly inside the rounded-square slot.
 *  - emblem → 'cover'. The emblem is a circular avatar in the same family as
 *             the children's faces, so a centre crop is the right treatment.
 */
async function prepareImage(
  cfg: WorkerConfig,
  storagePath: string | null | undefined,
  outName: string,
  size: number,
  fit: 'contain' | 'cover'
): Promise<string | null> {
  const p = (storagePath ?? '').trim();
  if (!p) return null;
  try {
    const raw = await downloadObject(cfg, p);
    if (!raw) return null;
    if (raw.byteLength > MAX_BRANDING_BYTES) {
      console.warn(`[branding] ${p} is ${raw.byteLength}B — skipping`);
      return null;
    }
    const png = await sharp(raw)
      .rotate() // honour EXIF on a phone-shot emblem
      .resize(size, size, {
        fit,
        position: 'centre',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    fs.mkdirSync(JOB_BRANDING_DIR, { recursive: true });
    fs.writeFileSync(path.join(JOB_BRANDING_DIR, outName), png);
    return `branding/job/${outName}`;
  } catch (err) {
    console.warn(`[branding] ${p} unusable: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Build the end-card lockup for a job, writing any images into
 * JOB_BRANDING_DIR. The caller re-syncs that directory into the cached
 * Remotion bundle before rendering (render.ts) — same discipline as the
 * photos, and for the same reason: the bundle snapshots public/ once per
 * process, so job #2's logo would otherwise be job #1's.
 */
export async function prepareBranding(
  cfg: WorkerConfig,
  opts: { classRow: ClassRow | null; weekStart: string | null }
): Promise<Branding> {
  const { classRow, weekStart } = opts;

  const className = (classRow?.name ?? '').trim() || 'Our Class';
  // undefined on a pre-migration database → null → initials fallback.
  const schoolName = (classRow?.school_name ?? '').trim() || null;

  const logoFile = await prepareImage(
    cfg,
    classRow?.school_logo_path,
    'school-logo.png',
    LOGO_PX,
    'contain'
  );
  const emblemFile = await prepareImage(
    cfg,
    classRow?.emblem_path,
    'emblem.png',
    EMBLEM_PX,
    'cover'
  );

  return {
    schoolName,
    className,
    weekLabel: formatWeekLabel(weekStart),
    logoFile,
    emblemFile,
    // The mark stands in for the school; fall back to the class when HQ has
    // not set a school name yet.
    initials: initialsFor(schoolName ?? className),
  };
}
