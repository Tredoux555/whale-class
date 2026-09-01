/**
 * V2 Shelf — the four manipulative works, as data.
 *
 * These mirror the four printed works the Book Works pipeline generates
 * (scripts/curriculum/book-works/build_book_works.py). Read that file's
 * "LAYOUT STANDARD (2026-08-27, approved)" block before changing anything here;
 * the rules it locks are the rules this module reproduces on glass:
 *
 *   · one row per book sentence, shared column boundaries, no gaps;
 *   · PICTURE COLUMN FIRST (approved 2026-08-31 — do not put it back on the
 *     right);
 *   · every movable thing is exactly the size of the slot it drops into;
 *   · a control of error exists for every work.
 *
 * WHAT EACH WORK IS, matched to its PDF:
 *
 *   work1  Picture Match                 sentences PRINTED on the sheet, the
 *          (…-work1-picture-match.pdf)   picture column empty. The child cuts
 *                                        the picture cards and lays each beside
 *                                        its sentence.
 *   work2  Sentence & Picture Match      the sheet is BLANK. The child cuts both
 *          (…-work2-…)                   the sentence cards and the picture
 *                                        cards, and rebuilds every pair.
 *   work3  Sentence Builder — guided     each word slot carries a faint GREY
 *          (…-work3-…)                   guide word; a correct word card covers
 *                                        it exactly. Picture column empty.
 *   work4  Sentence Builder — free       the same grid with no guides at all.
 *
 * TWO DELIBERATE DEVIATIONS FROM THE PAPER, both for a tablet:
 *
 *  1. ROW SET. The printed works take every spread of the book (up to seven
 *     rows, including the opener and the long recap). On glass, seven rows of
 *     a twelve-word recap sentence is unreadable at a child's arm's length, so
 *     every work here takes the book's FOUR CAST SPREADS — the four rotating
 *     characters, `lesson.cast`, which is itself derived from the same pages.
 *     One row set across all four works is also the point: the same four
 *     sentences deepen from "find the picture" to "build it from words".
 *  2. NO CUT SHEET. Cutting is what the paper needs to make its pieces movable;
 *     on a tablet the pieces are movable already, so the cut sheet has no
 *     screen equivalent and the "N straight cuts" instruction line is dropped.
 *
 * PURE: no I/O, no clock, no Math.random. The pile's jumble is a deterministic
 * permutation seeded from the lesson and work number, so the same child opening
 * the same work twice meets the same shelf — and the server and the browser
 * agree.
 */

import type { BookWorksLesson } from '@/lib/montree/dark-phonics/book-works';

export type WorkId = 'work1' | 'work2' | 'work3' | 'work4';

export const WORK_IDS: readonly WorkId[] = Object.freeze([
  'work1',
  'work2',
  'work3',
  'work4',
]);

/** A slot's column role. Column 0 is always the picture column. */
export type CellKind = 'picture' | 'sentence' | 'word';

/** One landing place on the working sheet. */
export interface WorkSlot {
  id: string;
  rowIndex: number;
  /** 0 = the picture column; 1.. = the text column(s). */
  col: number;
  kind: CellKind;
  /**
   * Printed on the sheet and NEVER movable — work 1's sentences, the fixed half
   * of a matching pair.
   */
  fixedText?: string;
  /** The grey guide word behind a work-3 slot. Covered exactly when correct. */
  guideText?: string;
}

/** One cut-out card. Every piece has exactly one home slot. */
export interface WorkPiece {
  id: string;
  kind: CellKind;
  /** Where it belongs. */
  slotId: string;
  /** Spoken/announced name. */
  label: string;
  /** Word or sentence cards. */
  text?: string;
  /** Picture cards. */
  image?: string;
  /**
   * The clip this piece asks for when it lands home — see v2-shelf/audio.ts.
   * Held here so the interaction layer never has to know what kind of thing it
   * just placed.
   */
  audio: { kind: 'word' | 'sentence'; key: string };
}

export interface WorkSpec {
  id: WorkId;
  /** 1–4, the number printed on the paper work. */
  n: number;
  title: string;
  /** The line the grown-up reads before starting. */
  instruction: string;
  rows: number;
  /** Total columns, picture column included. */
  cols: number;
  /** Flex weight per column, index 0 = the picture column. */
  colWeights: number[];
  slots: WorkSlot[];
  /** In their jumbled pile order — see the header. */
  pieces: WorkPiece[];
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

interface WorkRow {
  key: string;
  text: string;
  art: string;
  label: string;
}

/** The book's four cast spreads, in book order. See deviation 1 above. */
function workRows(lesson: BookWorksLesson): WorkRow[] {
  return lesson.cast.map((card) => ({
    key: card.id,
    text: card.sentence,
    art: card.image,
    label: card.label,
  }));
}

/** A sentence's word cards, exactly as the paper cuts them: split on spaces. */
function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* The jumble                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A deterministic shuffle. A 32-bit LCG (Numerical Recipes constants) seeded
 * from the lesson and work number drives a Fisher–Yates pass — so the pile is
 * scrambled, reproducible, and identical on the server and in the browser.
 * `Math.random()` would break all three.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = (seed * 2654435761) >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Column sizing                                                               */
/* -------------------------------------------------------------------------- */

/** The picture column's share of the grid, matching PIC_W's share on paper. */
const PICTURE_WEIGHT = 2.6;
/** No word column may collapse — the paper's MIN_CELL, in weight units. */
const MIN_WORD_WEIGHT = 0.9;

/**
 * Word columns are sized to the WIDEST word in that position, exactly as
 * `sb_metrics()` sizes them on paper — so every row's cells line up and a word
 * card is the size of the slot it drops into.
 */
function wordColumnWeights(rows: WorkRow[]): number[] {
  const toks = rows.map((r) => words(r.text));
  const n = Math.max(...toks.map((t) => t.length));
  const weights: number[] = [];
  for (let j = 0; j < n; j++) {
    const widest = Math.max(
      ...toks.map((t) => (j < t.length ? t[j].length : 0)),
      1
    );
    weights.push(Math.max(MIN_WORD_WEIGHT, widest * 0.42));
  }
  return weights;
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                    */
/* -------------------------------------------------------------------------- */

const PAIR_TITLES: Record<'work1' | 'work2', string> = {
  work1: 'Picture Match',
  work2: 'Sentence & Picture Match',
};

function buildPairWork(
  lesson: BookWorksLesson,
  id: 'work1' | 'work2'
): WorkSpec {
  const rows = workRows(lesson);
  const sentenceMoves = id === 'work2';
  const slots: WorkSlot[] = [];
  const pieces: WorkPiece[] = [];

  rows.forEach((row, i) => {
    const picSlot = `${id}-r${i}-pic`;
    slots.push({ id: picSlot, rowIndex: i, col: 0, kind: 'picture' });
    pieces.push({
      id: `${id}-p-${row.key}`,
      kind: 'picture',
      slotId: picSlot,
      label: row.label,
      image: row.art,
      audio: { kind: 'sentence', key: row.text },
    });

    const textSlot = `${id}-r${i}-text`;
    slots.push({
      id: textSlot,
      rowIndex: i,
      col: 1,
      kind: 'sentence',
      // Work 1 PRINTS its sentences; work 2's sheet is blank.
      fixedText: sentenceMoves ? undefined : row.text,
    });
    if (sentenceMoves) {
      pieces.push({
        id: `${id}-s-${row.key}`,
        kind: 'sentence',
        slotId: textSlot,
        label: row.text,
        text: row.text,
        audio: { kind: 'sentence', key: row.text },
      });
    }
  });

  return {
    id,
    n: id === 'work1' ? 1 : 2,
    title: PAIR_TITLES[id],
    instruction: sentenceMoves
      ? 'Put every sentence back beside its own picture.'
      : 'Put each picture beside the sentence that tells about it.',
    rows: rows.length,
    cols: 2,
    colWeights: [PICTURE_WEIGHT, 4.4],
    slots,
    pieces: seededShuffle(pieces, lesson.lessonNumber * 31 + (id === 'work1' ? 1 : 2)),
  };
}

function buildBuilderWork(
  lesson: BookWorksLesson,
  id: 'work3' | 'work4'
): WorkSpec {
  const rows = workRows(lesson);
  const guided = id === 'work3';
  const wordWeights = wordColumnWeights(rows);
  const slots: WorkSlot[] = [];
  const pieces: WorkPiece[] = [];

  rows.forEach((row, i) => {
    const picSlot = `${id}-r${i}-pic`;
    slots.push({ id: picSlot, rowIndex: i, col: 0, kind: 'picture' });
    pieces.push({
      id: `${id}-p-${row.key}`,
      kind: 'picture',
      slotId: picSlot,
      label: row.label,
      image: row.art,
      audio: { kind: 'sentence', key: row.text },
    });

    words(row.text).forEach((word, j) => {
      const slotId = `${id}-r${i}-w${j}`;
      slots.push({
        id: slotId,
        rowIndex: i,
        col: j + 1,
        kind: 'word',
        guideText: guided ? word : undefined,
      });
      pieces.push({
        id: `${id}-w-${row.key}-${j}`,
        kind: 'word',
        slotId,
        label: word,
        text: word,
        audio: { kind: 'word', key: word },
      });
    });
  });

  return {
    id,
    n: guided ? 3 : 4,
    title: guided ? 'Sentence Builder — guided' : 'Sentence Builder — free',
    instruction: guided
      ? 'Lay each word card on its own grey guide word.'
      : 'Build every sentence again, word by word.',
    rows: rows.length,
    cols: wordWeights.length + 1,
    colWeights: [PICTURE_WEIGHT, ...wordWeights],
    slots,
    pieces: seededShuffle(pieces, lesson.lessonNumber * 31 + (guided ? 3 : 4)),
  };
}

/** The four works for one lesson, in shelf order. */
export function buildWorks(lesson: BookWorksLesson): WorkSpec[] {
  return [
    buildPairWork(lesson, 'work1'),
    buildPairWork(lesson, 'work2'),
    buildBuilderWork(lesson, 'work3'),
    buildBuilderWork(lesson, 'work4'),
  ];
}

/** One work by id, or null when the id is not one of the four. */
export function buildWork(
  lesson: BookWorksLesson,
  id: WorkId
): WorkSpec | null {
  return buildWorks(lesson).find((w) => w.id === id) ?? null;
}
