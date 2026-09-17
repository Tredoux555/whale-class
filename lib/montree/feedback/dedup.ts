// lib/montree/feedback/dedup.ts
//
// "Is it one of these?" — the live duplicate check under the compose sheet's
// title field.
//
// Entirely pure and deterministic: the caller hands in the candidate rows it
// already fetched (an ILIKE/trigram query in repo.ts) and a `now`, and gets
// back a ranking. No Date.now(), no DB, no locale service. That means the
// ranking can be tested exactly, and the same function can run on the server
// for /search and in a test without a database.
//
// Why a hand-rolled similarity and not just Postgres trigram: CJK. pg_trgm
// splits on whitespace-ish boundaries and a Chinese title is one long token,
// so a trigram score there is close to useless. Scoring here on character
// bigrams treats "照片上传两次" and "照片会上传两次" as the near-duplicates a
// parent would see them as, and behaves identically for English.

import type { PostStatus, PostType } from './types';

/** The minimum shape rankCandidates needs. Repo rows satisfy it structurally. */
export interface DedupCandidate {
  id: string;
  title: string;
  body?: string | null;
  type: PostType;
  status: PostStatus;
  voteCount: number;
  commentCount: number;
  createdAt: string;
}

export interface RankedCandidate<T extends DedupCandidate = DedupCandidate> {
  candidate: T;
  /** 0..1 — blended title similarity, recency and weight of the existing post. */
  score: number;
  /** 0..1 — title similarity alone, which is what the copy is really claiming. */
  titleScore: number;
}

/**
 * Fold a title into something comparable: NFKC (so full-width punctuation and
 * half-width agree), lower case, punctuation to spaces, whitespace collapsed.
 * Letters, digits and CJK survive; everything else becomes a separator.
 */
export function normaliseTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFKC')
    .toLowerCase()
    // Keep latin letters/digits, CJK unified ideographs, kana, hangul.
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** English stop words that would otherwise make every title look alike. */
const STOP = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'of', 'to', 'for', 'and', 'or',
  'my', 'me', 'i', 'we', 'you', 'this', 'that', 'with', 'at', 'be', 'are',
  'was', 'when', 'how', 'do', 'does', 'did', 'can', 'not',
]);

/**
 * Tokens for the word-overlap half of the score. Latin runs become words
 * (stop words dropped); CJK runs become character bigrams, plus the single
 * characters when the run is one character long.
 */
export function tokenise(raw: string): string[] {
  const norm = normaliseTitle(raw);
  if (!norm) return [];
  const out: string[] = [];
  for (const chunk of norm.split(' ')) {
    if (!chunk) continue;
    if (/[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/.test(chunk)) {
      if (chunk.length === 1) {
        out.push(chunk);
      } else {
        for (let i = 0; i < chunk.length - 1; i += 1) out.push(chunk.slice(i, i + 2));
      }
      continue;
    }
    if (STOP.has(chunk)) continue;
    if (chunk.length >= 2) out.push(chunk);
  }
  return out;
}

/** Character bigrams of the normalised string, spaces removed. */
export function bigrams(raw: string): Set<string> {
  const s = normaliseTitle(raw).replace(/ /g, '');
  const set = new Set<string>();
  if (s.length === 1) set.add(s);
  for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2));
  return set;
}

/** Sørensen–Dice on two sets. 1 = identical, 0 = disjoint. */
export function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const g of small) if (large.has(g)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

/**
 * How alike two titles are, 0..1. The blend is deliberate: character bigrams
 * catch typos and CJK, token overlap catches word order and synonyms of
 * length ("photo upload" vs "uploading photos"), and an exact normalised match
 * short-circuits to 1 so "Photos upload twice" typed twice is unmissable.
 */
export function titleSimilarity(a: string, b: string): number {
  const na = normaliseTitle(a);
  const nb = normaliseTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const char = diceCoefficient(bigrams(na), bigrams(nb));
  const ta = new Set(tokenise(a));
  const tb = new Set(tokenise(b));
  const word = diceCoefficient(ta, tb);
  // One title fully contained in the other ("Photos upload twice" inside
  // "Photos upload twice on iPhone") is the single most common real duplicate.
  const containment = na.includes(nb) || nb.includes(na) ? 0.25 : 0;
  return Math.min(1, 0.55 * char + 0.45 * word + containment);
}

export interface RankOptions {
  /** ISO timestamp used for the recency term. Required — keeps this pure. */
  now: string | number | Date;
  /** Drop anything below this title similarity. Default 0.34. */
  minScore?: number;
  /** Default 5, per the brief. */
  limit?: number;
}

/**
 * Rank candidates against what the author is typing.
 *
 * The score is title similarity first and foremost (0.78 of it). The two small
 * nudges exist so that when two posts are equally close, the one that is ALIVE
 * — recently active, already carrying votes and comments — is the one we ask
 * the author to join. Sending someone to a dead duplicate helps nobody.
 */
export function rankCandidates<T extends DedupCandidate>(
  query: string,
  candidates: readonly T[],
  options: RankOptions,
): RankedCandidate<T>[] {
  const minScore = options.minScore ?? 0.34;
  const limit = options.limit ?? 5;
  const nowMs = new Date(options.now).getTime();
  if (normaliseTitle(query).length < 3) return [];

  const ranked: RankedCandidate<T>[] = [];
  for (const c of candidates) {
    const titleScore = titleSimilarity(query, c.title);
    if (titleScore < minScore) continue;

    const ageDays = Math.max(0, (nowMs - new Date(c.createdAt).getTime()) / 86_400_000);
    // 1.0 today, ~0.5 at three months, never negative.
    const recency = 1 / (1 + ageDays / 90);
    // Saturating, so a 400-vote post cannot outrank a genuinely better title.
    const weight = Math.min(1, (c.voteCount + c.commentCount) / 20);

    const score = 0.78 * titleScore + 0.12 * recency + 0.1 * weight;
    ranked.push({ candidate: c, score, titleScore });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Deterministic tie-break, so tests and two identical requests agree.
    return a.candidate.id < b.candidate.id ? -1 : 1;
  });
  return ranked.slice(0, limit);
}

/**
 * Search terms to hand Postgres. The DB does the cheap wide pass (ILIKE /
 * trigram over title+body), rankCandidates does the precise narrow one.
 */
export function searchTerms(query: string): string[] {
  const toks = tokenise(query);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of toks) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}
