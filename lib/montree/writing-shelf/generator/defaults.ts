// lib/montree/writing-shelf/generator/defaults.ts
//
// THE SHELF AS IT IS TODAY, as configs. "Reset to shelf defaults" on the tool
// page restores exactly these, so the generator always has the shipped sheets
// as its starting point and the owner only ever edits away from them.
//
// Sources, all read rather than guessed:
//   01 — docs/handoffs/HANDOFF_SHELF_PRINT_FIX_2026-09-05.md §1 and §8.5, and
//        scripts/curriculum/writing-shelf/build_sound_frame_mat.py.
//   02 — the six chains extracted from the text layer of
//        public/dark-phonics-shelf/v2/02-chain-cards.pdf (pages 2 and 4).
//   03 — the twelve words in the pairing table of the same handoff, §3.
//
// The shipped PDFs and their Python builders are NOT touched by any of this.

import type { FlipCard, FlipCardsConfig } from './flip-cards';
import type { MatConfig } from './sound-frame-mat';

/** Sheet 02 — six chain cards, five lines each, one letter changing per line. */
export const CHAIN_CARD_WORDS: Array<{ word: string; chain: string[] }> = [
  { word: 'tap', chain: ['tap', 'cap', 'can', 'pan', 'pen'] },
  { word: 'mop', chain: ['mop', 'hop', 'hot', 'hut', 'hug'] },
  { word: 'peg', chain: ['peg', 'beg', 'bed', 'bad', 'bag'] },
  { word: 'bin', chain: ['bin', 'big', 'bug', 'dug', 'mug'] },
  { word: 'nut', chain: ['nut', 'cut', 'cup', 'cap', 'cat'] },
  { word: 'rat', chain: ['rat', 'bat', 'bag', 'big', 'dig'] },
];

/** Sheet 03 — twelve dictation photo cards, in the shipped sheet order. */
export const DICTATION_CARD_WORDS: string[] = [
  'cat', 'pig', 'rug', 'hat',
  'mug', 'bed', 'dog', 'cot',
  'pen', 'bag', 'log', 'jam',
];

/**
 * Sheet 11 — backup object cards. Kept here because the object-card generator
 * is the next thing to be added and this is the list it needs (the order of
 * the #miniatures table, duplicates adjacent, 26 pieces of 16 objects).
 */
export const OBJECT_CARD_WORDS: Array<{ word: string; count: number }> = [
  { word: 'cat', count: 3 }, { word: 'pig', count: 3 }, { word: 'hat', count: 3 },
  { word: 'dog', count: 2 }, { word: 'sun', count: 2 }, { word: 'mug', count: 2 },
  { word: 'bed', count: 2 }, { word: 'pot', count: 1 }, { word: 'pan', count: 1 },
  { word: 'tin', count: 1 }, { word: 'mop', count: 1 }, { word: 'peg', count: 1 },
  { word: 'nut', count: 1 }, { word: 'bin', count: 1 }, { word: 'cot', count: 1 },
  { word: 'kit', count: 1 },
];

export function defaultChainCards(): FlipCard[] {
  return CHAIN_CARD_WORDS.map(({ word, chain }) => ({ word, backLines: [...chain] }));
}

export function defaultDictationCards(): FlipCard[] {
  return DICTATION_CARD_WORDS.map((word) => ({ word, backLines: [word] }));
}

export function defaultChainCardsConfig(): FlipCardsConfig {
  return {
    cards: defaultChainCards(),
    paper: 'A4',
    highlightChanges: true,
    title: 'Chain cards',
  };
}

export function defaultDictationCardsConfig(): FlipCardsConfig {
  return {
    cards: defaultDictationCards(),
    paper: 'A4',
    highlightChanges: false,
    title: 'Dictation photo cards',
  };
}

/**
 * Sheet 01 on A4 — the mat exactly as it ships: 282 x 100 trim, front 3 x 70
 * with 6 mm gutters, back 4 x 66 with 4 mm gutters, no letters in the frames.
 */
export function defaultMatConfigA4(): MatConfig {
  return {
    paper: 'A4',
    trimWidth: 282,
    trimHeight: 100,
    front: {
      count: 3,
      frame: 70,
      gutter: 6,
      note: 'Front · Tray 1. One counter into a frame for each sound the child hears, then each counter is swapped for a letter.',
    },
    back: {
      count: 4,
      frame: 66,
      gutter: 4,
      spareIndex: 3,
      note: 'Back · Tray 3. The amber frame is the spare — the one used when a word gains or loses a sound.',
    },
    title: 'Sound-frame mat',
  };
}

/** The uniform border used by the A3 mat: outer margin AND every gap. */
export const A3_MAT_BORDER_MM = 15;
export const A3_MAT_TRIM_W_MM = 400;
export const A3_MAT_TRIM_H_MM = 111;

/**
 * Sheet 01 on A3 — same work, one border everywhere. Trim 400 x 111 centred
 * on a 420 x 297 sheet (10 mm of paper outside the cut line on the long axis,
 * 93 mm on the short), border 15 mm, frames computed to fill the trim exactly:
 * front 3 x 113.33 x 81.00, back 4 x 81.25 x 81.00.
 */
export function defaultMatConfigA3(): MatConfig {
  return {
    paper: 'A3',
    trimWidth: A3_MAT_TRIM_W_MM,
    trimHeight: A3_MAT_TRIM_H_MM,
    uniformBorder: A3_MAT_BORDER_MM,
    front: {
      count: 3,
      note: 'Front · Tray 1. One counter into a frame for each sound the child hears, then each counter is swapped for a letter.',
    },
    back: {
      count: 4,
      spareIndex: 3,
      note: 'Back · Tray 3. The amber frame is the spare — the one used when a word gains or loses a sound.',
    },
    title: 'Sound-frame mat (A3)',
  };
}

export function defaultMatConfig(paper: 'A4' | 'A3'): MatConfig {
  return paper === 'A3' ? defaultMatConfigA3() : defaultMatConfigA4();
}
