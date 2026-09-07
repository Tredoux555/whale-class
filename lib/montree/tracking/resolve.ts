// lib/montree/tracking/resolve.ts
//
// RULE 6: ONE NAME-READER. This file is THE reader. Every screen, route,
// importer and AI path that turns a *name* into a *work* comes through
// resolveWorkName() (or one of the four thin adapters at the bottom of this
// file). Forgiving on typos, spacing, punctuation, British/American spelling
// and plurals; strict on ambiguity. Rule 5: no confident key → unknown →
// review queue. A tie is NEVER resolved.
//
// PURE. No I/O, no React, no Supabase, no process.env — the same input gives
// the same answer in a route handler, in a client component and in a test.
// That is what "identical server- and client-side" means (rule 6), and it is
// why the four former resolvers (write-progress resolveWorkKey, work-matching
// matchToCurriculumV2, photo-audit findWorkByName, guru/corrections by-name)
// now delegate here instead of each carrying their own opinion.
//
// The order matters and is deliberate:
//   (a) the Dark Phonics canonical parser (tracker-works.parseWorkName) —
//       "t Dark Phonics work 3", "T-Work-3", "t w3", "t dp work 3";
//   (b) the Writing Shelf forms — "Writing Shelf tray 3", "ws tray 3",
//       "tray 3", "writing shelf 3", optionally followed by the tray's
//       material ("Writing Shelf tray 3, Word chains");
//   (c) exact match on the normalised curriculum name;
//   (d) ALIAS match on the canonical form — punctuation-stripped,
//       plural-folded, spelling-canonicalised, with parenthetical glosses and
//       dash suffixes considered on BOTH sides. This is the step the 2026-09-06
//       Whale-class burn-in added: "Command Cards" is the curriculum's
//       "Command Cards (Action Reading)", "Color Box 2" is "Color Box 2
//       (Secondary Colors)", "Movable Alphabet" is "Moveable Alphabet",
//       "Sandpaper Letter" is "Sandpaper Letters". Only ever accepted when the
//       alias form lands on exactly ONE work;
//   (e) ONE conservative fuzzy pass: Jaro-Winkler ≥ 0.93 and a clear margin
//       ≥ 0.05 over the runner-up.
// Anything else is unknown.
//
// (a) and (b) are shape parsers, so when a string HAS the shape of a Dark
// Phonics or Writing Shelf name but names a work that does not exist
// ("t work 33", "tt work 3", "Writing shelf tray 9"), we stop there and
// report no-match rather than letting the later passes guess a neighbour.
//
// AMBIGUITY AND AREA. Real curricula contain the same name twice — the Whale
// class carries "Clock Work" as both ma_clock and cu_clock, "Montessori Bells"
// three times. Without more information that is a tie and a tie is unknown
// (invariant 'duplicate-work-name' reports it so a human renames one). When
// the caller KNOWS the area — the AI said 'mathematics', the progress row
// carries area 'cultural' — pass it as opts.area and the tie is broken by it,
// and only by it: never by first-registered-wins.

import { parseWorkName } from '@/lib/montree/dark-phonics/tracker-works';
import type { CurriculumWork, WorkGroup } from './types';

/**
 * The least a row must carry to be resolvable. Deliberately loose: the four
 * adapters below feed rows from the tracking engine (CurriculumWork), the
 * static catalog (curriculum-loader's CurriculumWork, with area_key + aliases)
 * and raw DB rows from montree_classroom_curriculum_works (id + name). The
 * resolver reads only what it declares here and hands the CALLER'S OWN OBJECT
 * back, so nothing is lost in translation.
 */
export interface ResolvableWork {
  work_key?: string | null;
  /** montree_classroom_curriculum_works.id, when the row has no work_key yet. */
  id?: string | null;
  name: string;
  /** Tracking engine rows. */
  area?: string | null;
  /** Static catalog rows. */
  area_key?: string | null;
  aliases?: readonly string[] | null;
  sequence?: number;
  group?: WorkGroup;
  description?: string | null;
}

/** How the reader arrived at its answer (rule 6's audit trail). */
export type ResolveMethod = 'exact' | 'canonical-dp' | 'canonical-ws' | 'alias' | 'fuzzy';

/** Legacy field kept so pre-burn-in callers/tests keep compiling. */
export type ResolveVia = 'dp' | 'ws' | 'exact' | 'alias' | 'fuzzy';

export interface ResolveOptions {
  /**
   * The area the caller believes the work belongs to ('mathematics',
   * 'language', …; 'math' and 'unknown' are understood). Used ONLY to break a
   * tie — never to boost, never to filter a unique answer away.
   */
  area?: string | null;
  /**
   * LITERAL mode: stages (c) only, and comparing on case and whitespace alone —
   * no punctuation stripping, no alias pass, no fuzzy pass. One call site uses
   * it: the door's static-catalog fallback. A work that is in the global catalog
   * but NOT in this classroom is not a work this child can be marked on (rule 1),
   * so "Blue Series blends" against a classroom that does not carry the Blue
   * Series must reach the review queue rather than land on la_blue_series
   * ("Blue Series (Blends)") — see the constitution's teacher-typing scenario.
   */
  literal?: boolean;
  /** Jaro-Winkler floor for the fuzzy pass. Default FUZZY_MIN. Above 1 disables it. */
  minScore?: number;
  /** Required margin over the runner-up in the fuzzy pass. Default FUZZY_MARGIN. */
  margin?: number;
}

export interface ResolvedResult<T extends ResolvableWork = CurriculumWork> {
  kind: 'resolved';
  unknown?: false;
  /** The caller's own row. */
  work: T;
  /** work_key (or the row id when a raw curriculum row carries no key yet). */
  key: string;
  /** The curriculum's canonical name for the work — what a human should see. */
  name: string;
  confidence: number;
  method: ResolveMethod;
  /** @deprecated use `method`. Kept for callers written before the burn-in. */
  via: ResolveVia;
  /** Other rows that scored close, when there were any. Never a decision. */
  candidates?: T[];
}

export interface UnknownResult<T extends ResolvableWork = CurriculumWork> {
  kind: 'unknown';
  unknown: true;
  reason: 'no-match' | 'ambiguous';
  /** The rows that tied, so a human (or Pass 2b) can choose. */
  candidates: T[];
  confidence: number;
}

export type ResolveResult<T extends ResolvableWork = CurriculumWork> =
  | ResolvedResult<T>
  | UnknownResult<T>;

export const FUZZY_MIN = 0.93;
export const FUZZY_MARGIN = 0.05;

/**
 * Case- and whitespace-insensitive, and NOTHING else. The door's historical
 * "exact means exact" comparison, kept for ResolveOptions.literal.
 */
export function literalName(input: string): string {
  return String(input ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** lowercase, punctuation → space, collapse spaces. */
export function normaliseName(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------------ */
/* Canonical form — the alias pass's alphabet                               */
/* ------------------------------------------------------------------------ */

/**
 * British/American and house-style spellings that mean the same shelf.
 * Deliberately tiny and hand-checked: every entry here is a pair the Whale
 * class actually produced or a spelling a teacher demonstrably types. This is
 * NOT a synonym list — "Long Rods" is not canonicalised to "Red Rods"; that
 * relationship lives in the curriculum row's own parenthetical, which the
 * alias pass reads directly.
 */
const SPELLING: Readonly<Record<string, string>> = {
  moveable: 'movable',
  colour: 'color',
  coloured: 'colored',
  colours: 'colors',
  grey: 'gray',
  practise: 'practice',
  centre: 'center',
  metre: 'meter',
  litre: 'liter',
  organise: 'organize',
  recognise: 'recognize',
  jewellery: 'jewelry',
};

/**
 * Fold a plural to its singular. Conservative on purpose — it only has to make
 * "cards"/"card", "blocks"/"block", "boxes"/"box" agree, and it is applied to
 * BOTH sides so a systematic mistake cancels out rather than mis-resolving.
 */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is|as|os)$/.test(word)) return word;
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|s|x|z)es$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * normaliseName + spelling canonicalisation + plural folding. The form the
 * alias pass compares on. Exported because the migration's SQL mirrors it and
 * the burn-in report is generated from it.
 */
export function canonicalName(input: string): string {
  // '&' is punctuation to normaliseName, so "Cards & Counters" would lose the
  // conjunction the curriculum row spells out ("Cards and Counters"). Spell it
  // before normalising, on both sides.
  return normaliseName(String(input ?? '').replace(/&/g, ' and '))
    .split(' ')
    .filter(Boolean)
    .map((w) => singular(SPELLING[w] ?? w))
    .join(' ');
}

/** "Red Rods (Long Rods)" → "Red Rods". */
function withoutParentheticals(raw: string): string {
  return String(raw ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ');
}

/** "Red Rods (Long Rods)" → "Long Rods" (all parenthetical contents joined). */
function parentheticalsOnly(raw: string): string {
  const found = String(raw ?? '').match(/\(([^)]*)\)|\[([^\]]*)\]/g);
  if (!found) return '';
  return found.map((s) => s.slice(1, -1)).join(' ');
}

/**
 * "Peeling - Easy Items" → "Peeling"; "Phonics 05: s /s/ — snake" → "Phonics 05".
 * '·' joined the separator set with migration 352, which gave the Writing Shelf
 * trays their display names ('Writing Shelf tray 3 · Word chains'): without it
 * the alias pass could not see the bare 'Writing Shelf tray 3' inside the new
 * name, and a curriculum row imported under the old name would tie with the new.
 */
function beforeSeparator(raw: string): string {
  const s = String(raw ?? '');
  const m = /\s+[-–—·:,]\s+/.exec(s);
  return m ? s.slice(0, m.index) : s;
}

/** "Writing Shelf tray 3 · Word chains" → "Word chains". '' when there is no tail. */
function afterSeparator(raw: string): string {
  const s = String(raw ?? '');
  const m = /\s+[-–—·:,]\s+/.exec(s);
  return m ? s.slice(m.index + m[0].length).trim() : '';
}

/** Every canonical spelling one string may legitimately be filed under. */
function aliasForms(raw: string): string[] {
  const out = new Set<string>();
  const push = (s: string) => {
    const c = canonicalName(s);
    if (c) out.add(c);
  };
  push(raw);
  push(withoutParentheticals(raw));
  push(parentheticalsOnly(raw));
  push(beforeSeparator(raw));
  push(beforeSeparator(withoutParentheticals(raw)));
  return [...out];
}

/* ------------------------------------------------------------------------ */
/* Row helpers                                                              */
/* ------------------------------------------------------------------------ */

export function keyOf(work: ResolvableWork): string {
  return String(work.work_key ?? work.id ?? work.name ?? '');
}

export function areaOf(work: ResolvableWork): string | null {
  return normaliseArea(work.area ?? work.area_key ?? null);
}

/** 'math' is the legacy spelling of 'mathematics'; 'unknown'/'' mean "no hint". */
export function normaliseArea(area: string | null | undefined): string | null {
  const a = String(area ?? '').trim().toLowerCase();
  if (!a || a === 'unknown') return null;
  if (a === 'math' || a === 'maths') return 'mathematics';
  if (a === 'practical life') return 'practical_life';
  return a;
}

function byKey<T extends ResolvableWork>(works: readonly T[], key: string): T | undefined {
  return works.find((w) => keyOf(w) === key);
}

function unknown<T extends ResolvableWork>(
  reason: 'no-match' | 'ambiguous',
  candidates: T[] = [],
  confidence = 0,
): UnknownResult<T> {
  return { kind: 'unknown', unknown: true, reason, candidates, confidence };
}

function resolved<T extends ResolvableWork>(
  work: T,
  confidence: number,
  method: ResolveMethod,
  candidates?: T[],
): ResolvedResult<T> {
  const via: ResolveVia =
    method === 'canonical-dp' ? 'dp' : method === 'canonical-ws' ? 'ws' : method;
  return {
    kind: 'resolved',
    unknown: false,
    work,
    key: keyOf(work),
    name: work.name,
    confidence,
    method,
    via,
    ...(candidates && candidates.length ? { candidates } : {}),
  };
}

/**
 * The ONLY tie-breaker in this file. Given several rows that answer to a name,
 * an area hint may pick exactly one of them — and if it does not (no hint, no
 * match, still several) the answer stays a tie. First-registered-wins would
 * file a cultural observation under sensorial forever; it is never used.
 */
function settleByArea<T extends ResolvableWork>(hits: T[], area: string | null): T | null {
  if (hits.length === 1) return hits[0];
  if (!area) return null;
  const same = hits.filter((w) => areaOf(w) === area);
  return same.length === 1 ? same[0] : null;
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
// "writing shelf tray 3" · "writing shelf 3" · "ws tray 3" · "tray 3" · "tray3" ·
// "ws3" — and, because the tray's MATERIAL lives in its own `description` column
// (migration 346) and now also trails its display name (migration 352:
// 'Writing Shelf tray 3 · Word chains'), an optional material phrase after the
// number: "tray 3 word chains", "Writing Shelf tray 3, Word chains". The tray
// number is the capture; anything after it is descriptive noise.
const WS_SHAPE = /^(?:(?:writing\s*shelf|ws)\s*(?:tray)?|tray)\s*([0-9]+)(?:\s+[a-z].*)?$/;

/**
 * The material a Writing Shelf row is filed under — its `description` column
 * ('Word chains'), or the tail of its display name when the row predates the
 * description column. Only ws: rows are read this way: a bare material is a
 * legitimate thing to type ("Word chains", "Author's chair") and the trays are a
 * closed set of eight, so it cannot collide with the wider curriculum.
 */
function wsMaterialForms(work: ResolvableWork): string[] {
  const out = new Set<string>();
  const push = (s: string) => {
    const c = canonicalName(s);
    if (c) out.add(c);
  };
  push(String(work.description ?? ''));
  push(afterSeparator(work.name));
  return [...out];
}

/* ------------------------------------------------------------------------ */
/* THE READER                                                               */
/* ------------------------------------------------------------------------ */

export function resolveWorkName<T extends ResolvableWork>(
  input: string,
  works: readonly T[],
  opts: ResolveOptions = {},
): ResolveResult<T> {
  const raw = typeof input === 'string' ? input : '';
  const norm = normaliseName(raw);
  if (!norm) return unknown<T>('no-match');
  const area = normaliseArea(opts.area);

  // (a) Dark Phonics.
  const parsed = parseWorkName(raw);
  if (parsed) {
    const work = byKey(works, `dp:${parsed.letter}:${parsed.n}`);
    // Shape is unambiguous; if the classroom does not carry the work, say so.
    return work ? resolved(work, 1, 'canonical-dp') : unknown<T>('no-match');
  }
  if (DP_SHAPE.test(stripDpFiller(norm))) {
    // Looks exactly like a Dark Phonics work name but names no real work.
    return unknown<T>('no-match');
  }

  // (b) Writing Shelf — by tray number first, then by the tray's material.
  const ws = WS_SHAPE.exec(norm);
  if (ws) {
    const n = Number(ws[1]);
    const work = Number.isFinite(n) ? byKey(works, `ws:${n}`) : undefined;
    return work ? resolved(work, 1, 'canonical-ws') : unknown<T>('no-match');
  }
  if (!opts.literal) {
    const material = canonicalName(raw);
    const trays = works.filter(
      (w) => String(w.work_key ?? '').startsWith('ws:') && wsMaterialForms(w).includes(material)
    );
    // A closed set of eight: exactly one hit is the answer, two is a data bug
    // the 'duplicate-work-name' invariant reports, and a tie is never resolved.
    if (trays.length === 1) return resolved(trays[0], 1, 'canonical-ws');
    if (trays.length > 1) return unknown('ambiguous', trays, 1);
  }

  // (c) Exact normalised name (including declared aliases, which are exact by
  //     construction — someone typed them into the catalog on purpose).
  const compare = opts.literal ? literalName : normaliseName;
  const needleExact = compare(raw);
  const exact = works.filter(
    (w) =>
      compare(w.name) === needleExact ||
      (w.aliases ?? []).some((a) => compare(a) === needleExact),
  );
  if (exact.length >= 1) {
    const settled = settleByArea(exact, area);
    if (settled) return resolved(settled, 1, 'exact', exact.length > 1 ? exact : undefined);
    return unknown('ambiguous', exact, 1);
  }

  // (d) Alias / canonical form: plurals, punctuation, spelling, parenthetical
  //     glosses and dash suffixes — on both sides. Unique or nothing.
  if (opts.literal) return unknown<T>('no-match');

  const inputForms = new Set(aliasForms(raw));
  if (inputForms.size) {
    const aliasHits = works.filter((w) => {
      const forms = aliasForms(w.name);
      for (const a of w.aliases ?? []) forms.push(...aliasForms(a));
      return forms.some((f) => inputForms.has(f));
    });
    if (aliasHits.length >= 1) {
      const settled = settleByArea(aliasHits, area);
      if (settled) {
        return resolved(settled, 0.95, 'alias', aliasHits.length > 1 ? aliasHits : undefined);
      }
      return unknown('ambiguous', aliasHits, 0.95);
    }
  }

  // (e) One conservative fuzzy pass, on the canonical form so a plural or a
  //     stray comma is not spent from the typo budget.
  const minScore = opts.minScore ?? FUZZY_MIN;
  const margin = opts.margin ?? FUZZY_MARGIN;
  const needle = canonicalName(raw);
  const scored = works
    .map((w) => ({
      work: w,
      score: Math.max(
        ...aliasForms(w.name).map((f) => jaroWinkler(needle, f)),
        ...(w.aliases ?? []).map((a) => jaroWinkler(needle, canonicalName(a))),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return unknown<T>('no-match');

  const best = scored[0];
  const runnerUp = scored[1]?.score ?? 0;
  if (best.score < minScore) return unknown<T>('no-match', [], best.score);
  if (best.score - runnerUp < margin) {
    const tied = scored.filter((s) => s.score >= minScore).map((s) => s.work);
    const settled = settleByArea(tied, area);
    if (settled) return resolved(settled, best.score, 'fuzzy', tied);
    return unknown('ambiguous', tied, best.score);
  }
  return resolved(best.work, best.score, 'fuzzy');
}

/* ------------------------------------------------------------------------ */
/* The four adapters — every other resolver in the app is one of these.      */
/* They exist so a caller keeps its own shape while the DECISION stays here.  */
/* ------------------------------------------------------------------------ */

/**
 * write-progress.ts's door: name (+ the row's area) → work_key, or null.
 * Null means "queue it" (rule 5), never "write it keyless".
 */
export function resolveWorkKeyFromCurriculum(
  workName: string,
  works: readonly ResolvableWork[],
  area?: string | null,
  opts: Omit<ResolveOptions, 'area'> = {},
): string | null {
  const r = resolveWorkName(workName, works, { ...opts, area });
  return r.kind === 'resolved' ? r.key : null;
}

/**
 * photo-audit's findWorkByName: a curriculum grouped by area, plus the area
 * the caller would prefer. The preference is a TIE-BREAKER, not a filter — the
 * old implementation walked the preferred area first and took the first
 * substring hit, which is exactly the guessing rule 5 forbids.
 */
export function resolveWorkInAreas<T extends ResolvableWork>(
  rawName: string,
  curriculumByArea: Record<string, T[] | undefined>,
  preferredArea?: string | null,
): { work: T; areaKey: string } | null {
  const flat: Array<T & { __area: string }> = [];
  for (const [areaKey, works] of Object.entries(curriculumByArea)) {
    for (const w of works ?? []) flat.push({ ...w, __area: w.area ?? w.area_key ?? areaKey });
  }
  if (!flat.length) return null;
  const r = resolveWorkName(rawName, flat, { area: preferredArea });
  if (r.kind !== 'resolved') return null;
  return { work: r.work, areaKey: r.work.__area };
}

/**
 * guru/corrections: a teacher-supplied corrected name against the rows of
 * montree_classroom_curriculum_works. Returns the row (so the caller can read
 * .id for montree_media.work_id) or null. Replaces an `ilike` + `limit(1)`,
 * which silently picked one of two rows sharing a name.
 */
export function resolveCurriculumRow<T extends ResolvableWork>(
  name: string,
  rows: readonly T[],
  area?: string | null,
): T | null {
  const r = resolveWorkName(name, rows, { area });
  return r.kind === 'resolved' ? r.work : null;
}

/* ------------------------------------------------------------------------ */
/* Jaro-Winkler                                                             */
/* ------------------------------------------------------------------------ */

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
