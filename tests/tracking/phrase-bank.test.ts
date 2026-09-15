// tests/tracking/phrase-bank.test.ts
//
// The quiet-week note (2026-09-15): a weekly summary never says "No
// observations were recorded". These pin the bank's promises.

import { describe, expect, it } from 'vitest';
import {
  ageBandFor,
  fallbackPicks,
  fallbackSummary,
  PHRASE_BANK,
  type AgeBand,
  type FallbackChild,
} from '@/lib/montree/tracking/phrase-bank';

const BANDS: AgeBand[] = ['toddler', 'young', 'middle', 'older', 'unknown'];
const DOB: Record<AgeBand, string | null> = {
  toddler: '2024-03-10',
  young: '2022-11-02',
  middle: '2021-12-20',
  older: '2020-10-05',
  unknown: null,
};

function mondays(from: string, n: number): string[] {
  const t0 = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  return Array.from({ length: n }, (_, i) => new Date(t0 + i * 7 * 86_400_000).toISOString().slice(0, 10));
}

/** A singular subject followed by a bare verb ("He are", "Joey enjoy …"). */
const BASE_VERBS = 'are|enjoy|join|show|take|greet|manage|listen|wait|work|keep|ask|set|plan|handle|follow';
const BASE_AFTER_SINGULAR = (sub: string) => new RegExp(`\\b${sub} (${BASE_VERBS})\\b`);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const kids: FallbackChild[] = [];
for (const band of BANDS) {
  for (const pronoun of ['he', 'she', 'they'] as const) {
    for (let i = 0; i < 4; i++) {
      kids.push({ id: `${band}-${pronoun}-${i}`, name: 'Bartholomew Fitzwilliam', pronoun, dateOfBirth: DOB[band] });
    }
  }
}

describe('phrase bank — shape', () => {
  it('every band has >= 8 phrases, each with English AND Chinese (same index, same meaning)', () => {
    for (const band of BANDS) {
      const pool = PHRASE_BANK[band];
      expect(pool.length, band).toBeGreaterThanOrEqual(8);
      const en = pool.map((p) => p.en);
      const zh = pool.map((p) => p.zh);
      expect(en.length).toBe(zh.length);
      for (const p of pool) {
        expect(p.en.startsWith('{Sub} '), p.en).toBe(true);
        expect(p.zh.startsWith('{Sub}'), p.zh).toBe(true);
        expect(p.zh, p.zh).toMatch(/[一-鿿]/);
        expect(p.zh.trim().endsWith('。'), p.zh).toBe(true);
      }
      // Enough spread to always find two different domains.
      expect(new Set(pool.map((p) => p.domain)).size, band).toBeGreaterThanOrEqual(4);
      expect(new Set(en).size, `${band} duplicates`).toBe(en.length);
    }
  });

  it('never promises, never claims mastery, never a negative', () => {
    const banned = [/next week/i, /has not/i, /can now/i, /mastered/i, /starting to/i, /completed/i, /\bnot\b/i, /No observations/i];
    const bannedZh = [/下周/, /掌握/, /没有/, /未/];
    for (const band of BANDS) {
      for (const p of PHRASE_BANK[band]) {
        for (const re of banned) expect(re.test(p.en), `${re} in "${p.en}"`).toBe(false);
        for (const re of bannedZh) expect(re.test(p.zh), `${re} in "${p.zh}"`).toBe(false);
      }
    }
  });
});

describe('ageBandFor', () => {
  it('bands by whole months at weekStart', () => {
    expect(ageBandFor('2023-09-08', '2026-09-07')).toBe('toddler'); // 35 months
    expect(ageBandFor('2023-09-07', '2026-09-07')).toBe('young'); // 36
    expect(ageBandFor('2022-09-08', '2026-09-07')).toBe('young'); // 47
    expect(ageBandFor('2022-09-07', '2026-09-07')).toBe('middle'); // 48
    expect(ageBandFor('2021-09-07', '2026-09-07')).toBe('older'); // 60
    expect(ageBandFor(null, '2026-09-07')).toBe('unknown');
    expect(ageBandFor('', '2026-09-07')).toBe('unknown');
    expect(ageBandFor('not a date', '2026-09-07')).toBe('unknown');
    expect(ageBandFor('2027-01-01', '2026-09-07')).toBe('unknown'); // future DOB
  });
});

describe('fallbackSummary — selection', () => {
  const weeks = mondays('2026-08-31', 20);

  it('is deterministic', () => {
    for (const k of kids) {
      for (const w of weeks.slice(0, 3)) {
        expect(fallbackSummary(k, w, 'en')).toBe(fallbackSummary({ ...k }, w, 'en'));
        expect(fallbackSummary(k, w, 'zh')).toBe(fallbackSummary({ ...k }, w, 'zh'));
      }
    }
  });

  it('picks two DIFFERENT domains, and never repeats last week\'s phrases', () => {
    for (const k of kids) {
      let prev: string[] = [];
      for (const w of weeks) {
        const [a, b] = fallbackPicks(k, w);
        expect(a.domain, `${k.id} ${w}`).not.toBe(b.domain);
        expect(prev, `${k.id} ${w} repeats`).not.toContain(a.en);
        expect(prev, `${k.id} ${w} repeats`).not.toContain(b.en);
        prev = [a.en, b.en];
      }
    }
  });

  it('draws from the child\'s own age band', () => {
    for (const k of kids) {
      const band = ageBandFor(k.dateOfBirth, '2026-09-07');
      const [a, b] = fallbackPicks(k, '2026-09-07');
      expect(PHRASE_BANK[band]).toContain(a);
      expect(PHRASE_BANK[band]).toContain(b);
    }
  });

  it('varies across children in the same week', () => {
    const texts = new Set(kids.map((k) => fallbackSummary(k, '2026-09-07', 'en')));
    expect(texts.size).toBeGreaterThan(kids.length / 2);
  });

  it('stays within 40 words, is sentence-shaped, with no leftover placeholder', () => {
    for (const k of kids) {
      for (const w of weeks) {
        const en = fallbackSummary(k, w, 'en');
        const zh = fallbackSummary(k, w, 'zh');
        expect(words(en), en).toBeLessThanOrEqual(40);
        expect(en).toMatch(/^Bartholomew Fitzwilliam [a-z]/);
        expect(en).toMatch(/[a-z]\.$/);
        expect(en).not.toMatch(/[{}]|\s{2}|undefined|null/);
        expect(zh.startsWith('Bartholomew Fitzwilliam')).toBe(true);
        expect(zh).not.toMatch(/[{}]|undefined|null/);
        expect(zh.endsWith('。')).toBe(true);
      }
    }
  });

  it('empty name → empty string (never a nameless note)', () => {
    expect(fallbackSummary({ id: 'x', name: '  ' }, '2026-09-07')).toBe('');
  });
});

describe('fallbackSummary — pronouns', () => {
  const weeks = mondays('2026-08-31', 30);
  const secondOf = (en: string, name: string) => en.slice(en.indexOf('. ') + 2).replace(name, '');

  it('uses the child\'s own pronoun in sentence two, in both languages', () => {
    const cases = [
      { pronoun: 'he' as const, sub: /^He [a-z]/, bad: BASE_AFTER_SINGULAR('He'), wrong: /\b(She|she|her|They|they|their|them)\b/, zh: '他' },
      { pronoun: 'she' as const, sub: /^She [a-z]/, bad: BASE_AFTER_SINGULAR('She'), wrong: /\b(He|he|his|him|They|they|their|them)\b/, zh: '她' },
      { pronoun: 'they' as const, sub: /^They [a-z]/, bad: /They (is|[a-z]+s) /, wrong: /\b(He|he|his|him|She|she|her)\b/, zh: null },
    ];
    for (const c of cases) {
      for (const w of weeks) {
        const k: FallbackChild = { id: `p-${c.pronoun}`, name: 'Joey', pronoun: c.pronoun, dateOfBirth: '2022-01-15' };
        const en = fallbackSummary(k, w, 'en');
        const two = secondOf(en, 'Joey');
        expect(two, en).toMatch(c.sub);
        expect(en, en).not.toMatch(c.wrong);
        expect(en, en).not.toMatch(c.bad);
        expect(en, en).not.toMatch(BASE_AFTER_SINGULAR('Joey'));
        const zh = fallbackSummary(k, w, 'zh');
        if (c.zh) expect(zh, zh).toContain(`。${c.zh}`);
        else expect(zh, zh).toContain('。Joey'); // 他们 is plural — the name is used
        expect(zh).not.toContain('他们');
      }
    }
  });

  it('an unstated pronoun (pronounSet === false) repeats the name instead of "They"', () => {
    for (const w of weeks) {
      const k: FallbackChild = { id: 'unset', name: 'Joey', pronoun: 'they', pronounSet: false };
      const en = fallbackSummary(k, w, 'en');
      expect(en.split('Joey').length - 1, en).toBe(2);
      expect(en).not.toMatch(/\bThey\b|Joey are\b/);
      expect(en).not.toMatch(BASE_AFTER_SINGULAR('Joey'));
      expect(fallbackSummary(k, w, 'zh').split('Joey').length - 1).toBe(2);
    }
  });
});
