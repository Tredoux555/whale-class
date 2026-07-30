// lib/montree/paper-scan/work-matcher.ts
//
// Deterministic work-name matching for Paper Scan: "Pink Twr" on the page →
// the classroom's "Pink Tower" row (work_key + canonical area).
//
// Children are matched with the shared voice matcher
// (lib/montree/voice/student-matcher.ts) — that is imported, never
// reimplemented. Works have no equivalent shared helper that takes a
// pre-loaded classroom list (lib/montree/fuzzy-matcher's matchWork re-queries
// per call and returns a curriculum row id, not the classroom work_key we
// already hold), so this is a small local matcher over the exact same works
// list that was injected into the extraction prompt.
//
// Jaro-Winkler is the standard implementation ported from the smoke-tested
// harness (extract-sheet.mjs v0.1.1), including its 0.90 / 0.80 verdicts.

import type { PaperScanWorkEntry } from './types';

const MATCH_CONFIDENT = 0.9;
const MATCH_PROBABLE = 0.8;

/** Score given to a clean containment hit ("pink twr" ⊂ "pink tower" is not this; "tower" ⊂ "pink tower" is). */
const CONTAINMENT_SCORE = 0.88;
const MIN_CONTAINMENT_CHARS = 4;

/** Strip accents, punctuation and case so "Pink-Tower!" and "pink tower" compare equal. */
export function normalizeWorkName(s: string | null | undefined): string {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aFlags = new Array(a.length).fill(false);
  const bFlags = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(i + window + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bFlags[j] || a[i] !== b[j]) continue;
      aFlags[i] = true; bFlags[j] = true; matches++;
      break;
    }
  }
  if (!matches) return 0;

  // Count transpositions among the matched characters.
  let k = 0, transpositions = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
}

export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  if (j < 0.7) return j; // standard: no prefix bonus for weak matches
  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  return j + prefix * 0.1 * (1 - j);
}

export interface WorkMatchResult {
  work_key: string | null;
  work_name: string | null;
  area_key: string | null;
  confidence: number;
  verdict: 'confident' | 'probable' | 'unmatched';
}

const NO_MATCH: WorkMatchResult = {
  work_key: null,
  work_name: null,
  area_key: null,
  confidence: 0,
  verdict: 'unmatched',
};

/**
 * Best classroom-works match for one raw work name off the sheet.
 *
 * When `area` is known from the sheet, works in that area win ties — but a
 * strong cross-area match still beats a weak same-area one, because the
 * extractor is told to leave area null rather than infer it aggressively.
 */
export function matchWorkName(
  rawName: string | null | undefined,
  works: PaperScanWorkEntry[],
  area?: string | null,
): WorkMatchResult {
  const a = normalizeWorkName(rawName);
  if (!a) return NO_MATCH;

  let best: { entry: PaperScanWorkEntry; score: number } | null = null;

  for (const entry of works) {
    const b = normalizeWorkName(entry.name);
    if (!b) continue;

    let score = jaroWinkler(a, b);

    // Abbreviations and partial writings ("Tower" for "Pink Tower",
    // "Golden Beads" for "Golden Bead Material") score poorly on raw
    // Jaro-Winkler but are unambiguous to a human reader.
    const shorter = a.length <= b.length ? a : b;
    if (shorter.length >= MIN_CONTAINMENT_CHARS && (b.includes(a) || a.includes(b))) {
      score = Math.max(score, CONTAINMENT_SCORE);
    }

    // Same-area tiebreak only — never enough to promote a weak match.
    if (area && entry.area_key === area) score += 0.01;

    if (!best || score > best.score) best = { entry, score };
  }

  if (!best) return NO_MATCH;

  const confidence = Math.min(1, Math.round(best.score * 100) / 100);
  const verdict = confidence >= MATCH_CONFIDENT
    ? 'confident'
    : confidence >= MATCH_PROBABLE ? 'probable' : 'unmatched';

  if (verdict === 'unmatched') {
    return { ...NO_MATCH, confidence };
  }

  return {
    work_key: best.entry.work_key,
    work_name: best.entry.name,
    area_key: best.entry.area_key,
    confidence,
    verdict,
  };
}
