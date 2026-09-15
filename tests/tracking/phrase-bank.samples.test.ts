// tests/tracking/phrase-bank.samples.test.ts
//
// Prints the quiet-week note for one fictional child per age band, he and she,
// for two consecutive weeks — the block the owner reads. Run with:
//   npx vitest run tests/tracking/phrase-bank.samples.test.ts
// Set PHRASE_SAMPLES=1 to print.

import { describe, expect, it } from 'vitest';
import { ageBandFor, fallbackSummary, type FallbackChild } from '@/lib/montree/tracking/phrase-bank';

const KIDS: FallbackChild[] = [
  { id: 'kid-toddler-he', name: 'Joey', pronoun: 'he', dateOfBirth: '2024-02-14' },
  { id: 'kid-toddler-she', name: 'Mia', pronoun: 'she', dateOfBirth: '2024-05-03' },
  { id: 'kid-young-he', name: 'Leo', pronoun: 'he', dateOfBirth: '2023-01-20' },
  { id: 'kid-young-she', name: 'Lily', pronoun: 'she', dateOfBirth: '2022-11-09' },
  { id: 'kid-middle-he', name: 'Max', pronoun: 'he', dateOfBirth: '2022-03-30' },
  { id: 'kid-middle-she', name: 'Coco', pronoun: 'she', dateOfBirth: '2021-12-01' },
  { id: 'kid-older-he', name: 'Ethan', pronoun: 'he', dateOfBirth: '2021-02-11' },
  { id: 'kid-older-she', name: 'Stella', pronoun: 'she', dateOfBirth: '2020-10-18' },
  { id: 'kid-unknown-he', name: 'Kevin', pronoun: 'he' },
  { id: 'kid-unknown-she', name: 'Amy', pronoun: 'she' },
];
const WEEKS = ['2026-09-07', '2026-09-14'];

describe('quiet-week samples', () => {
  it('renders every band, he and she, two weeks', () => {
    const out: string[] = [];
    for (const k of KIDS) {
      out.push(`[${ageBandFor(k.dateOfBirth, WEEKS[0])} · ${k.pronoun}] ${k.name}`);
      for (const w of WEEKS) {
        const en = fallbackSummary(k, w, 'en');
        const zh = fallbackSummary(k, w, 'zh');
        expect(en.length).toBeGreaterThan(0);
        expect(zh.length).toBeGreaterThan(0);
        out.push(`  ${w} EN: ${en}`);
        out.push(`  ${w} ZH: ${zh}`);
      }
    }
    if (process.env.PHRASE_SAMPLES) console.log(`\n${out.join('\n')}\n`);
  });
});
