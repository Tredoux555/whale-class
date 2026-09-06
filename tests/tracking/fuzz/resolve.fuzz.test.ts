// tests/tracking/fuzz/resolve.fuzz.test.ts
//
// Rule 5 (unknown names never write) and rule 6 (one name-reader: forgiving on
// typos, strict on ambiguity) under adversarial input.

import { describe, expect, it } from 'vitest';
import {
  parseWorkName,
  workId,
  workName,
  TRACKER_LETTERS,
} from '@/lib/montree/dark-phonics/tracker-works';
import { normaliseName, resolveWorkName } from '@/lib/montree/tracking/resolve';
import { forEachSeed, genWorks, LIVE, ALL_LETTERS, Rng, TRAY_NAMES } from './gen';

const CASES = 2000;
const VALID = new Set(ALL_LETTERS);

/** A curriculum carrying every letter's five works plus eight trays. */
const WORKS = genWorks(new Rng(1), { letters: [...ALL_LETTERS], trays: 8, legacy: true });

const ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \t\n-_.,;:!?/\\()[]{}\'"@#$%^&*+=<>|~`' +
  '\u00e9\u00f1\u4e2d\u6587\ud83d\ude00\u200b\uffff\u0301\u05d0\u0627';

function randomString(rng: Rng, maxLen: number): string {
  const len = rng.int(maxLen);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[rng.int(ALPHABET.length)];
  return out;
}

describe('resolve fuzz', () => {
  it('parseWorkName and resolveWorkName never throw on any string (2000 cases)', () => {
    forEachSeed(CASES, 31_000_000, (rng) => {
      const inputs = [
        randomString(rng, 40),
        randomString(rng, 400),
        '',
        '   ',
        '!!!???...,,,',
        rng.pick(['t work 3', 'ws tray 3', 'tray', 'dark phonics', 'dp']),
      ];
      for (const s of inputs) {
        expect(() => parseWorkName(s)).not.toThrow();
        const r = resolveWorkName(s, WORKS);
        expect(['resolved', 'unknown']).toContain(r.kind);
        if (r.kind === 'resolved') {
          expect(WORKS).toContain(r.work);
          expect(r.confidence).toBeGreaterThan(0);
        }
      }
      // Non-string inputs must not throw either (untyped callers exist).
      for (const junk of [null, undefined, 42, {}, []] as unknown[]) {
        expect(() => parseWorkName(junk as string)).not.toThrow();
        expect(() => resolveWorkName(junk as string, WORKS)).not.toThrow();
      }
    });
  });

  it('a 10 000-character string resolves to unknown, quickly and without throwing', () => {
    const rng = new Rng(999);
    for (const filler of ['x', 'a b ', 'q', ' ']) {
      const big = filler.repeat(Math.ceil(10000 / filler.length));
      const started = Date.now();
      const r = resolveWorkName(big, WORKS);
      expect(Date.now() - started).toBeLessThan(2000);
      expect(r.kind).toBe('unknown');
    }
    const noisy = randomString(rng, 10000) + 't Dark Phonics work 3' + randomString(rng, 10000);
    expect(resolveWorkName(noisy, WORKS).kind).toBe('unknown');
  });

  it('every canonical name round-trips to its key (all letters x works x trays)', () => {
    for (const def of TRACKER_LETTERS) {
      for (let n = 1; n <= 5; n++) {
        const name = workName(def.letter, n);
        const parsed = parseWorkName(name);
        expect(parsed, `parseWorkName failed on canonical "${name}"`).toEqual({
          letter: def.letter,
          n,
        });
        expect(workId(parsed!.letter, parsed!.n)).toBe(`dp:${def.letter}:${n}`);
        const r = resolveWorkName(name, WORKS);
        expect(r.kind, `resolveWorkName failed on canonical "${name}"`).toBe('resolved');
        if (r.kind === 'resolved') {
          expect(r.work.work_key).toBe(`dp:${def.letter}:${n}`);
          expect(r.via).toBe('dp');
          expect(r.confidence).toBe(1);
        }
      }
    }
    for (let t = 1; t <= 8; t++) {
      for (const form of [
        `Writing Shelf tray ${t}`,
        `writing shelf tray ${t}`,
        `WS tray ${t}`,
        `ws${t}`,
        `tray ${t}`,
        `Writing Shelf tray ${t}, ${TRAY_NAMES[t - 1]}`,
      ]) {
        const r = resolveWorkName(form, WORKS);
        expect(r.kind, `"${form}" did not resolve`).toBe('resolved');
        if (r.kind === 'resolved') expect(r.work.work_key).toBe(`ws:${t}`);
      }
    }
  });

  it('forgiving spellings of a canonical dp name all land on the same key (2000 cases)', () => {
    forEachSeed(CASES, 32_000_000, (rng) => {
      const letter = rng.pick(ALL_LETTERS);
      const n = rng.between(1, 5);
      const variants = [
        `${letter} Dark Phonics work ${n}`,
        `${letter} dark phonics work ${n}`,
        `${letter}-Work-${n}`,
        `${letter} w${n}`,
        `${letter} dp work ${n}`,
        `  ${letter.toUpperCase()}   WORK   ${n}  `,
        `${letter}_work_${n}`,
      ];
      for (const v of variants) {
        const r = resolveWorkName(v, WORKS);
        expect(r.kind, `"${v}" did not resolve`).toBe('resolved');
        if (r.kind === 'resolved') expect(r.work.work_key).toBe(`dp:${letter}:${n}`);
      }
    });
  });

  it('near-misses never resolve - rule 5 (2000 cases)', () => {
    forEachSeed(CASES, 33_000_000, (rng) => {
      // (i) a letter that is not a tracker letter
      const bogusLetter = rng.pick([
        'q',
        'zz',
        'ab',
        'xy',
        'tt',
        'ss',
        String.fromCharCode(97 + rng.int(26)) + String.fromCharCode(97 + rng.int(26)),
      ]);
      if (!VALID.has(bogusLetter)) {
        for (const form of [
          `${bogusLetter} Dark Phonics work ${rng.between(1, 5)}`,
          `${bogusLetter} work ${rng.between(1, 5)}`,
          `${bogusLetter}-Work-${rng.between(1, 5)}`,
          `${bogusLetter} w${rng.between(1, 5)}`,
        ]) {
          const r = resolveWorkName(form, WORKS);
          expect(r.kind, `"${form}" resolved but '${bogusLetter}' is not a tracker letter`).toBe(
            'unknown'
          );
        }
      }

      // (ii) a work number outside 1..5
      const badN = rng.pick([0, 6, 7, 33, 55, 100, 12345]);
      for (const form of [
        `${rng.pick(LIVE)} Dark Phonics work ${badN}`,
        `${rng.pick(LIVE)} work ${badN}`,
        `${rng.pick(LIVE)} w${badN}`,
      ]) {
        expect(resolveWorkName(form, WORKS).kind, `"${form}" resolved`).toBe('unknown');
      }

      // (iii) a tray outside 1..8
      const badTray = rng.pick([0, 9, 10, 11, 88, 1000]);
      for (const form of [
        `Writing Shelf tray ${badTray}`,
        `ws tray ${badTray}`,
        `tray ${badTray}`,
        `ws${badTray}`,
      ]) {
        expect(resolveWorkName(form, WORKS).kind, `"${form}" resolved`).toBe('unknown');
      }
    });
  });

  it('resolveWorkName is deterministic and order-independent (2000 cases)', () => {
    forEachSeed(CASES, 34_000_000, (rng) => {
      const input = rng.bool(0.5)
        ? randomString(rng, 30)
        : `${rng.pick(LIVE)} ${rng.pick(['work', 'w', 'dp work'])} ${rng.between(1, 6)}`;
      const a = resolveWorkName(input, WORKS);
      const b = resolveWorkName(input, rng.shuffle(WORKS));
      expect(a.kind).toBe(b.kind);
      if (a.kind === 'resolved' && b.kind === 'resolved') {
        expect(a.work.work_key).toBe(b.work.work_key);
      }
    });
  });

  it('normaliseName is idempotent and total (2000 cases)', () => {
    forEachSeed(CASES, 35_000_000, (rng) => {
      const s = randomString(rng, 60);
      const once = normaliseName(s);
      expect(normaliseName(once)).toBe(once);
      expect(/^[a-z0-9 ]*$/.test(once)).toBe(true);
      expect(once.trim()).toBe(once);
    });
  });
});
