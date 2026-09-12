/**
 * Tray 5 · illustrated sentence builder cards (sheet 14).
 *
 * The load-bearing assertion is the asset one. Every card's `imageUrl` must
 * exist under the COMMITTED public/dark-phonics-live/ tree — art referenced
 * out of the gitignored phonics-images/ works on a laptop, never reaches the
 * Docker image, and 404s in the middle of a real class (book-works.ts, "THE
 * DIRECTORY IS LOAD-BEARING"). This test is what stops that regressing.
 */

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  SENTENCE_BANK,
  SENTENCE_BUILDER_CARDS,
  SENTENCE_BUILDER_GAPS,
  WORD_CLASSES,
  getSentenceBuilderCards,
  getWordTin,
} from '@/lib/montree/dark-phonics/writing-shelf-language';

describe('Tray 5 illustrated sentence builder', () => {
  it('is twelve cards, six a tier, pink then blue', () => {
    expect(SENTENCE_BUILDER_CARDS).toHaveLength(12);
    expect(getSentenceBuilderCards(1).map((c) => c.colour)).toEqual(Array(6).fill('pink'));
    expect(getSentenceBuilderCards(2).map((c) => c.colour)).toEqual(Array(6).fill('blue'));
  });

  it('serves every picture out of the committed public tree', () => {
    const missing = SENTENCE_BUILDER_CARDS.filter((c) => !fs.existsSync(`public${c.imageUrl}`));
    expect(missing.map((c) => c.slug)).toEqual([]);
  });

  it('points the print builder at art that is actually there', () => {
    const missing = SENTENCE_BUILDER_CARDS.filter((c) => !fs.existsSync(c.printArt));
    expect(missing.map((c) => c.slug)).toEqual([]);
  });

  it('knows which sentences the word tin cannot yet build', () => {
    // Three words are outside the tin: the cards are reading-and-copying work
    // until it grows. If this list SHRINKS the tin has caught up — update it.
    expect(SENTENCE_BUILDER_GAPS).toEqual(['digs', 'hot', 'sun']);
    expect(SENTENCE_BUILDER_CARDS.filter((c) => !c.tinReady)).toHaveLength(5);
  });

  it('leaves the existing word-tin work untouched', () => {
    expect(SENTENCE_BANK).toHaveLength(18);
    expect(Object.keys(WORD_CLASSES).length).toBeGreaterThan(60);
    const tin = getWordTin(20);
    expect(tin.naming.length + tin.doing.length + tin.little.length + tin.describing.length).toBe(
      tin.all.length
    );
  });
});
