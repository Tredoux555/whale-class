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
  it('is eighteen cards — six in each tier group', () => {
    expect(SENTENCE_BUILDER_CARDS).toHaveLength(18);
    expect(getSentenceBuilderCards(1).map((c) => c.colour)).toEqual(Array(6).fill('pink'));
    // FIVE blue frames in the blue GROUP of six, because "a fox in a box" is
    // carried — see the carried-card test below. The frame states the
    // difficulty of the words, the group states where the card sits.
    expect(getSentenceBuilderCards(2).map((c) => c.colour)).toEqual([
      'pink',
      ...Array(5).fill('blue'),
    ]);
    // SIX: tier 3's sixth blend card (mp — "the cat can jump") landed with its
    // drawing on 2026-09-12, so the tier is complete and sheet 14 is five
    // duplex sheets, the last carrying two cards and two blank slots.
    expect(getSentenceBuilderCards(3).map((c) => c.colour)).toEqual(Array(6).fill('green'));
    expect(getSentenceBuilderCards(3).map((c) => c.slug)).toContain('cat-jump');
  });

  it('keeps the tiers in tray order, easiest first', () => {
    expect(SENTENCE_BUILDER_CARDS.map((c) => c.tier)).toEqual([
      ...Array(6).fill(1),
      ...Array(6).fill(2),
      ...Array(6).fill(3),
    ]);
  });

  it('carries one known card into the blue group and lets it keep its pink frame', () => {
    // 2026-09-13. "a fox in a box" is pink WORK — fox and box are three-letter
    // words, and sheet 13 prints that same pair pink. It sits at the head of
    // the blue group because the teacher wanted one already-known card at the
    // start of the harder tray, for familiarity. Painting it blue would claim
    // a difficulty the words do not have and would put the same two words in
    // two colours across the two Tray 5 decks. DO NOT "fix" this to blue.
    const carried = SENTENCE_BUILDER_CARDS.filter((c) => c.carried);
    expect(carried.map((c) => c.slug)).toEqual(['fox-box']);
    const fox = carried[0];
    expect(fox.tier).toBe(2);
    expect(fox.frameTier).toBe(1);
    expect(fox.colour).toBe('pink');
    // It stays where it is: first card of the blue group, seventh overall.
    expect(getSentenceBuilderCards(2)[0].slug).toBe('fox-box');
    expect(SENTENCE_BUILDER_CARDS[6].slug).toBe('fox-box');
    // Every other card's frame agrees with its group.
    for (const c of SENTENCE_BUILDER_CARDS.filter((x) => !x.carried)) {
      expect(c.frameTier).toBe(c.tier);
    }
  });

  it('writes every phrase in lower case, the way a child says it', () => {
    // Teacher review of the printed proofs, 2026-09-12: these are literal
    // spoken phrases, not formal sentences. The capital and the full stop are
    // the child's to add with a punctuation tile, so neither is printed.
    const capitalised = SENTENCE_BUILDER_CARDS.filter(
      (c) => c.sentence[0] !== c.sentence[0].toLowerCase()
    );
    expect(capitalised.map((c) => c.sentence)).toEqual([]);
    expect(SENTENCE_BUILDER_CARDS.filter((c) => c.sentence.endsWith('.'))).toEqual([]);
    expect(SENTENCE_BUILDER_CARDS.map((c) => c.sentence)).toContain('the cat sat');
    expect(SENTENCE_BUILDER_CARDS.map((c) => c.sentence)).toContain('the cat can jump');
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
    // Measured against WORD_CLASSES — the tin as the APP models it, closed over
    // the 61-word decodable ledger. digs/hot/sun are on the PRINTED tin (sheet
    // 12) but not in the ledger, so they still read as gaps here; tier 3's
    // blend words are outside the tin by design. Those cards are
    // reading-and-copying work. If this list SHRINKS, the ledger has caught up.
    expect(SENTENCE_BUILDER_GAPS).toEqual([
      'blob',
      'can',
      'crab',
      'dad',
      'digs',
      'hot',
      'jump',
      'penguin',
      'sand',
      'star',
      'sun',
    ]);
    expect(SENTENCE_BUILDER_CARDS.filter((c) => !c.tinReady)).toHaveLength(11);
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
