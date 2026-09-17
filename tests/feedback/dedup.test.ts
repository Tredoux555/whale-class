// tests/feedback/dedup.test.ts
//
// "Is it one of these?" only helps if it is RIGHT. A ranking that misses the
// obvious duplicate teaches people to ignore the box; one that cries duplicate
// at everything teaches them to ignore it faster.

import { describe, it, expect } from 'vitest';
import {
  bigrams,
  diceCoefficient,
  normaliseTitle,
  rankCandidates,
  searchTerms,
  titleSimilarity,
  tokenise,
  type DedupCandidate,
} from '@/lib/montree/feedback/dedup';

const NOW = '2026-09-17T12:00:00.000Z';

function candidate(p: Partial<DedupCandidate> & { id: string; title: string }): DedupCandidate {
  return {
    body: '',
    type: 'problem',
    status: 'open',
    voteCount: 0,
    commentCount: 0,
    createdAt: '2026-09-15T12:00:00.000Z',
    ...p,
  };
}

describe('normalisation', () => {
  it('folds case, punctuation and whitespace', () => {
    expect(normaliseTitle('  Photos  UPLOAD   twice!! ')).toBe('photos upload twice');
    expect(normaliseTitle("Can't add a second teacher?")).toBe('can t add a second teacher');
  });

  it('folds full-width punctuation so CJK titles compare', () => {
    // NFKC is why '，' and ',' do not make two titles look different.
    expect(normaliseTitle('照片上传两次，很奇怪')).toBe('照片上传两次 很奇怪');
  });

  it('survives an empty or junk title without throwing', () => {
    expect(normaliseTitle('')).toBe('');
    expect(normaliseTitle('!!! ???')).toBe('');
  });
});

describe('tokenise', () => {
  it('drops English stop words', () => {
    expect(tokenise('the photo is in the album')).toEqual(['photo', 'album']);
  });

  it('turns a CJK run into character bigrams', () => {
    expect(tokenise('照片上传')).toEqual(['照片', '片上', '上传']);
  });
});

describe('titleSimilarity', () => {
  it('is 1 for the same title typed twice', () => {
    expect(titleSimilarity('Photos upload twice', 'photos  UPLOAD twice')).toBe(1);
  });

  it('is high when one title contains the other', () => {
    // The single most common real duplicate.
    expect(titleSimilarity('Photos upload twice', 'Photos upload twice on iPhone')).toBeGreaterThan(0.7);
  });

  it('is high for a CJK near-duplicate a person would call the same', () => {
    expect(titleSimilarity('照片上传两次', '照片会上传两次')).toBeGreaterThan(0.6);
  });

  it('is low for two unrelated titles', () => {
    expect(titleSimilarity('Photos upload twice', 'Print the weekly work plans')).toBeLessThan(0.25);
  });

  it('is 0 when either side is empty', () => {
    expect(titleSimilarity('', 'anything')).toBe(0);
    expect(titleSimilarity('anything', '')).toBe(0);
  });
});

describe('diceCoefficient', () => {
  it('is 0 for disjoint sets and 1 for identical ones', () => {
    expect(diceCoefficient(new Set(['ab']), new Set(['cd']))).toBe(0);
    expect(diceCoefficient(bigrams('hello'), bigrams('hello'))).toBe(1);
  });

  it('is 0 rather than NaN for two empty sets', () => {
    expect(diceCoefficient(new Set(), new Set())).toBe(0);
  });
});

describe('rankCandidates', () => {
  const pool = [
    candidate({ id: 'a', title: 'Photos upload twice on iPhone', voteCount: 24, commentCount: 4 }),
    candidate({ id: 'b', title: 'Two copies of the same photo in the daily album', voteCount: 9 }),
    candidate({ id: 'c', title: 'Batch-print the weekly work plans for a whole class', voteCount: 8 }),
    candidate({ id: 'd', title: 'Attendance export misses half-days', voteCount: 12 }),
  ];

  it('finds the obvious duplicate first', () => {
    const ranked = rankCandidates('Photos upload twice', pool, { now: NOW });
    expect(ranked[0].candidate.id).toBe('a');
  });

  it('leaves out everything unrelated', () => {
    const ranked = rankCandidates('Photos upload twice', pool, { now: NOW });
    expect(ranked.map((r) => r.candidate.id)).not.toContain('c');
  });

  it('says nothing at all until there are three characters to go on', () => {
    expect(rankCandidates('ph', pool, { now: NOW })).toEqual([]);
    expect(rankCandidates('', pool, { now: NOW })).toEqual([]);
  });

  it('returns at most five, per the brief', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      candidate({ id: `x${i}`, title: 'Photos upload twice on iPhone' }),
    );
    expect(rankCandidates('Photos upload twice', many, { now: NOW })).toHaveLength(5);
  });

  it('prefers the live duplicate when two titles are equally close', () => {
    // Sending someone to a dead post helps nobody.
    const dead = candidate({
      id: 'dead',
      title: 'Photos upload twice',
      createdAt: '2024-01-01T00:00:00.000Z',
      voteCount: 0,
      commentCount: 0,
    });
    const alive = candidate({
      id: 'alive',
      title: 'Photos upload twice',
      createdAt: '2026-09-16T00:00:00.000Z',
      voteCount: 20,
      commentCount: 6,
    });
    const ranked = rankCandidates('Photos upload twice', [dead, alive], { now: NOW });
    expect(ranked[0].candidate.id).toBe('alive');
  });

  it('cannot let a popular post outrank a genuinely better title', () => {
    const popularButWrong = candidate({ id: 'pop', title: 'Attendance export misses half-days', voteCount: 4000 });
    const exact = candidate({ id: 'exact', title: 'Photos upload twice', voteCount: 0 });
    const ranked = rankCandidates('Photos upload twice', [popularButWrong, exact], { now: NOW });
    expect(ranked[0].candidate.id).toBe('exact');
  });

  it('is deterministic — the same inputs always give the same order', () => {
    const tied = [
      candidate({ id: 'zzz', title: 'Photos upload twice' }),
      candidate({ id: 'aaa', title: 'Photos upload twice' }),
    ];
    const once = rankCandidates('Photos upload twice', tied, { now: NOW });
    const twice = rankCandidates('Photos upload twice', [...tied].reverse(), { now: NOW });
    expect(once.map((r) => r.candidate.id)).toEqual(twice.map((r) => r.candidate.id));
  });

  it('is pure — it never reads the clock itself', () => {
    const a = rankCandidates('Photos upload twice', pool, { now: '2026-01-01T00:00:00.000Z' });
    const b = rankCandidates('Photos upload twice', pool, { now: '2026-01-01T00:00:00.000Z' });
    expect(a.map((r) => r.score)).toEqual(b.map((r) => r.score));
  });
});

describe('searchTerms', () => {
  it('hands Postgres a short, de-duplicated list', () => {
    const terms = searchTerms('photo photo upload upload album in the');
    expect(terms).toEqual([...new Set(terms)]);
    expect(terms.length).toBeLessThanOrEqual(6);
    expect(terms).not.toContain('the');
  });
});
