// lib/montree/tracking/resolve.ts
//
// Rule 6: ONE NAME-READER. Forgiving on typos, spacing and case; strict on
// ambiguity. Rule 5: no confident key → unknown → review queue. A tie is
// never resolved.
//
// The order matters and is deliberate:
//   (a) the Dark Phonics canonical parser (tracker-works.parseWorkName) —
//       "t Dark Phonics work 3", "T-Work-3", "t w3", "t dp work 3";
//   (b) the Writing Shelf forms — "Writing Shelf tray 3", "ws tray 3",
//       "tray 3", "writing shelf 3", optionally followed by the tray's
//       material ("Writing Shelf tray 3, Word chains");
//   (c) exact match on the normalised curriculum name;
//   (d) ONE conservative fuzzy pass: Jaro-Winkler ≥ 0.93 and a clear margin
//       ≥ 0.05 over the runner-up.
// Anything else is unknown.
//
// (a) and (b) are shape parsers, so when a string HAS the shape of a Dark
// Phonics or Writing Shelf name but names a work that does not exist
// ("t work 33", "tt work 3", "Writing shelf tray 9"), we stop there and
// report no-match rather than letting the fuzzy pass guess a neighbour.

import { parseWorkName } from '@/lib/montree/dark-phonics/tracker-works';
import type { CurriculumWork } from './types';

export type ResolveResult =
  | { kind: 'resolved'; work: CurriculumWork; confidence: number; via: 'dp' | 'ws' | 'exact' | 'fuzzy' }
  | { kind: 'unknown'; reason: 'no-match' | 'ambiguous'; candidates: CurriculumWork[]; confidence: number };

/** lowercase, punctuation → space, collapse spaces. */
export function normaliseName(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Strip the Dark Phonics filler words the same way parseWorkName does. */
function stripDpFiller(norm: string): string {
  return norm
    .replace(/\bdark\s*phonics\b/g, ' ')
    .replace(/\bdp\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DP_SHAPE = /^[a-z]{1,3}\s*w(?:ork)?\s*[0-9]+$/;
// "writing shelf tray 3" · "ws tray 3" · "tray3" · "ws3" — and, because the
// tray's MATERIAL now lives in its own `description` column (migration 346),
// an optional trailing material phrase: "Writing Shelf tray 3, Word chains".
// The tray number is the capture; anything after it is descriptive noise.
const WS_SHAPE = /^(?:(?:writing\s*shelf|ws)\s*(?:tray)?|tray)\s*([0-9]+)(?:\s+[a-z].*)?$/;

function byKey(works: readonly CurriculumWork[], key: string): CurriculumWork | undefined {
  return works.find((w) => w.work_key === key);
}

function unknown(
  reason: 'no-match' | 'ambiguous',
  candidates: CurriculumWork[] = [],
  confidence = 0
): ResolveResult {
  return { kind: 'unknown', reason, candidates, confidence };
}

export function resolveWorkName(input: string, works: readonly CurriculumWork[]): ResolveResult {
  const raw = typeof input === 'string' ? input : '';
  const norm = normaliseName(raw);
  if (!norm) return unknown('no-match');

  // (a) Dark Phonics.
  const parsed = parseWorkName(raw);
  if (parsed) {
    const work = byKey(works, `dp:${parsed.letter}:${parsed.n}`);
    // Shape is unambiguous; if the classroom does not carry the work, say so.
    return work ? { kind: 'resolved', work, confidence: 1, via: 'dp' } : unknown('no-match');
  }
  if (DP_SHAPE.test(stripDpFiller(norm))) {
    // Looks exactly like a Dark Phonics work name but names no real work.
    return unknown('no-match');
  }

  // (b) Writing Shelf.
  const ws = WS_SHAPE.exec(norm);
  if (ws) {
    const n = Number(ws[1]);
    const work = Number.isFinite(n) ? byKey(works, `ws:${n}`) : undefined;
    return work ? { kind: 'resolved', work, confidence: 1, via: 'ws' } : unknown('no-match');
  }

  // (c) Exact normalised name.
  const exact = works.filter((w) => normaliseName(w.name) === norm);
  if (exact.length === 1) return { kind: 'resolved', work: exact[0], confidence: 1, via: 'exact' };
  if (exact.length > 1) return unknown('ambiguous', exact, 1);

  // (d) One conservative fuzzy pass.
  const scored = works
    .map((w) => ({ work: w, score: jaroWinkler(norm, normaliseName(w.name)) }))
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return unknown('no-match');

  const best = scored[0];
  const runnerUp = scored[1]?.score ?? 0;
  if (best.score < FUZZY_MIN) return unknown('no-match', [], best.score);
  if (best.score - runnerUp < FUZZY_MARGIN) {
    const tied = scored.filter((s) => s.score >= FUZZY_MIN).map((s) => s.work);
    return unknown('ambiguous', tied, best.score);
  }
  return { kind: 'resolved', work: best.work, confidence: best.score, via: 'fuzzy' };
}

export const FUZZY_MIN = 0.93;
export const FUZZY_MARGIN = 0.05;

/** Jaro similarity. */
export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aFlags = new Array<boolean>(a.length).fill(false);
  const bFlags = new Array<boolean>(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bFlags[j] || a[i] !== b[j]) continue;
      aFlags[i] = true;
      bFlags[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
}

/** Jaro-Winkler with the standard 0.1 prefix scale, prefix capped at 4. */
export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  if (j <= 0.7) return j;
  let prefix = 0;
  const max = Math.min(4, a.length, b.length);
  while (prefix < max && a[prefix] === b[prefix]) prefix++;
  return j + prefix * 0.1 * (1 - j);
}
