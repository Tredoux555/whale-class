// tests/tracking/resolve.test.ts
//
// Rule 6: ONE NAME-READER — forgiving on typos, spacing and case, strict on
// ambiguity. Rule 5: UNKNOWN NAMES NEVER WRITE, and a tie is unknown.

import { describe, expect, it } from 'vitest';
import { jaroWinkler, normaliseName, resolveWorkName } from '@/lib/montree/tracking/resolve';
import { buildWorks } from './fixture';

const works = buildWorks();

function key(input: string): string | null {
  const r = resolveWorkName(input, works);
  return r.kind === 'resolved' ? r.work.work_key : null;
}

describe('Dark Phonics forms (the shapes a teacher actually types)', () => {
  const canonical: [string, string][] = [
    ['t Dark Phonics work 3', 'dp:t:3'],
    ['T Dark-Phonics Work 3', 'dp:t:3'],
    ['T-Work-3', 'dp:t:3'],
    ['t w3', 'dp:t:3'],
    ['t work 3', 'dp:t:3'],
    ['t dp work 3', 'dp:t:3'],
    ['dp t work 3', 'dp:t:3'],
    ['  T   WORK   3  ', 'dp:t:3'],
    ['s Dark Phonics work 1', 'dp:s:1'],
    ['ck dp work 2', 'dp:ck:2'],
    ['x w5', 'dp:x:5'],
    ['a work 5', 'dp:a:5'],
  ];
  for (const [input, expected] of canonical) {
    it(`resolves ${JSON.stringify(input)} → ${expected}`, () => {
      expect(key(input)).toBe(expected);
    });
  }

  it('reports full confidence for a canonical parse', () => {
    const r = resolveWorkName('t w3', works);
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.confidence).toBe(1);
      expect(r.via).toBe('dp');
    }
  });
});

describe('Writing Shelf forms', () => {
  const forms: [string, string][] = [
    ['Writing Shelf tray 3', 'ws:3'],
    ['writing shelf tray 3', 'ws:3'],
    ['ws tray 3', 'ws:3'],
    ['tray 3', 'ws:3'],
    ['tray3', 'ws:3'],
    ['ws3', 'ws:3'],
    ['writing shelf 3', 'ws:3'],
    ['Writing Shelf tray 3, Word chains', 'ws:3'],
    ['writing shelf tray 8', 'ws:8'],
    // Migration 352 put the material into the display name
    // ('Writing Shelf tray 3 · Word chains'), so the new name and the bare
    // material are both handles a teacher can legitimately type.
    ['Writing Shelf tray 3 · Word chains', 'ws:3'],
    ['tray 3 word chains', 'ws:3'],
    ['Word chains', 'ws:3'],
    ["Author's chair", 'ws:7'],
  ];
  for (const [input, expected] of forms) {
    it(`resolves ${JSON.stringify(input)} → ${expected}`, () => {
      expect(key(input)).toBe(expected);
    });
  }
});

describe('near-misses that must NOT resolve', () => {
  const misses: [string, 'no-match' | 'ambiguous'][] = [
    ['t work 33', 'no-match'],
    ['tt work 3', 'no-match'],
    ['a work 6', 'no-match'],
    ['a work 0', 'no-match'],
    ['the sat', 'no-match'],
    ['Writing shelf tray 9', 'no-match'],
    ['tray 0', 'no-match'],
    ['tray eight', 'no-match'],
    ['snake in my sock', 'no-match'],
    ['', 'no-match'],
    ['   ', 'no-match'],
    ['Magic e sheets', 'no-match'],
    ['lesson 54', 'no-match'],
  ];
  for (const [input, reason] of misses) {
    it(`refuses ${JSON.stringify(input)} (${reason})`, () => {
      const r = resolveWorkName(input, works);
      expect(r.kind).toBe('unknown');
      if (r.kind === 'unknown') expect(r.reason).toBe(reason);
    });
  }

  it('a letter whose pack is not in this classroom is unknown, not the nearest neighbour', () => {
    // 'qu' and 'w' are real TRACKER_LETTERS but 'coming' — no works in the curriculum.
    expect(resolveWorkName('qu work 1', works)).toMatchObject({ kind: 'unknown', reason: 'no-match' });
    expect(resolveWorkName('w work 1', works)).toMatchObject({ kind: 'unknown', reason: 'no-match' });
  });

  it('never resolves on a tie — a Dark-Phonics-shaped typo is ambiguous', () => {
    const r = resolveWorkName('s Dark Phonics wrok 1', works);
    expect(r.kind).toBe('unknown');
    if (r.kind === 'unknown') {
      expect(r.reason).toBe('ambiguous');
      expect(r.candidates.length).toBeGreaterThan(1);
    }
  });

  it('never resolves when two curriculum works share a name', () => {
    const twins = [
      ...works,
      { work_key: 'lang:blends-2', name: 'Blue Series blends', area: 'Language', sequence: 9003 },
    ];
    const r = resolveWorkName('Blue Series blends', twins);
    expect(r.kind).toBe('unknown');
    if (r.kind === 'unknown') {
      expect(r.reason).toBe('ambiguous');
      expect(r.candidates.map((c) => c.work_key).sort()).toEqual(['lang:blends-2', 'lang:blue-series-blends']);
    }
  });
});

describe('exact and fuzzy passes on ordinary curriculum names', () => {
  it('matches an exact name through punctuation and case', () => {
    expect(key('Blue Series blends!!')).toBe('lang:blue-series-blends');
    expect(key('Beginning Sounds - Vocabulary')).toBe('lang:beginning-sounds-vocab');
    expect(key('beginning sounds vocabulary')).toBe('lang:beginning-sounds-vocab');
  });

  it('accepts a small typo with a clear winner', () => {
    const r = resolveWorkName('blue series blnds', works);
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.work.work_key).toBe('lang:blue-series-blends');
      expect(r.via).toBe('fuzzy');
      expect(r.confidence).toBeGreaterThanOrEqual(0.93);
      expect(r.confidence).toBeLessThan(1);
    }
  });

  it('accepts a singular/plural slip on a legacy name', () => {
    expect(key('blue series blend')).toBe('lang:blue-series-blends');
  });

  it('resolves against an empty curriculum as unknown, never a throw', () => {
    expect(resolveWorkName('t work 3', [])).toMatchObject({ kind: 'unknown', reason: 'no-match' });
  });
});

describe('helpers', () => {
  it('normaliseName strips punctuation, case and spacing', () => {
    expect(normaliseName("  T-Work_3!! ")).toBe('t work 3');
  });

  it('jaroWinkler is 1 for identical strings and 0 for disjoint ones', () => {
    expect(jaroWinkler('metal insets', 'metal insets')).toBe(1);
    expect(jaroWinkler('abc', 'xyz')).toBe(0);
  });
});
