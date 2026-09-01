/**
 * V2 Shelf — the pure layer.
 *
 * The shelf's content is DERIVED from curriculum data (book-works-lessons.ts,
 * lessons.ts) rather than authored, so the failure mode that matters is a data
 * change quietly producing a work a child cannot finish: a card with no home, a
 * slot no card fits, a sentence that yields no words, a letter with no stroke
 * model. Those are invariants, not opinions, so they are asserted here for
 * EVERY lesson on the shelf rather than spot-checked on one.
 */

import { describe, expect, it } from 'vitest';

import {
  BOOK_WORKS_LESSON_NUMBERS,
  getBookWorks,
} from '@/lib/montree/dark-phonics/book-works';
import { getLiveLesson } from '@/lib/montree/dark-phonics/live-lesson';
import { buildShelfBook } from '@/lib/montree/dark-phonics/v2-shelf/books';
import {
  buildWordTrace,
  traceWordFor,
} from '@/lib/montree/dark-phonics/v2-shelf/strokes';
import { buildWorks } from '@/lib/montree/dark-phonics/v2-shelf/works';

const LESSONS = BOOK_WORKS_LESSON_NUMBERS.map((n) => {
  const lesson = getBookWorks(n);
  if (!lesson) throw new Error(`lesson ${n} is listed but missing`);
  return lesson;
});

describe('the shelf covers every Book Works lesson', () => {
  it('has lessons to show', () => {
    expect(LESSONS.length).toBeGreaterThan(0);
  });
});

describe.each(LESSONS.map((l) => [l.lessonNumber, l] as const))(
  'lesson %i',
  (_n, lesson) => {
    const works = buildWorks(lesson);

    it('builds a reader with a cover, every page, and a back', () => {
      const book = buildShelfBook(lesson);
      expect(book.pages[0].kind).toBe('cover');
      expect(book.pages[book.pages.length - 1].kind).toBe('back');
      expect(book.pages.filter((p) => p.kind === 'spread')).toHaveLength(
        lesson.pages.length
      );
      for (const page of book.pages) {
        if (page.kind !== 'spread') continue;
        // The lead/shout split must never drop or invent a word.
        expect(`${page.lead} ${page.shout}`.trim()).toBe(page.sentence.trim());
        expect(page.shout.length).toBeGreaterThan(0);
      }
    });

    it('builds all four works', () => {
      expect(works.map((w) => w.id)).toEqual(['work1', 'work2', 'work3', 'work4']);
    });

    it.each(works.map((w) => [w.id, w] as const))(
      '%s is completable',
      (_id, work) => {
        // Every card has exactly one home, and no two cards share it.
        const slotIds = new Set(work.slots.map((s) => s.id));
        expect(slotIds.size).toBe(work.slots.length);
        const homes = work.pieces.map((p) => p.slotId);
        expect(new Set(homes).size).toBe(homes.length);
        for (const home of homes) expect(slotIds.has(home)).toBe(true);

        // Every slot is either printed on the sheet or filled by a card —
        // a slot that is neither can never be completed.
        const filled = new Set(homes);
        for (const slot of work.slots) {
          expect(filled.has(slot.id) || !!slot.fixedText).toBe(true);
        }

        // The grid is rectangular and every column has a width.
        expect(work.colWeights).toHaveLength(work.cols);
        for (const w of work.colWeights) expect(w).toBeGreaterThan(0);
        for (const slot of work.slots) {
          expect(slot.col).toBeLessThan(work.cols);
          expect(slot.rowIndex).toBeLessThan(work.rows);
        }

        // Cards carry something to draw.
        for (const piece of work.pieces) {
          if (piece.kind === 'picture') expect(piece.image).toBeTruthy();
          else expect(piece.text?.trim()).toBeTruthy();
          expect(piece.audio.key.trim()).toBeTruthy();
        }
      }
    );

    it('scatters the pile the same way every time', () => {
      const again = buildWorks(lesson);
      for (let i = 0; i < works.length; i++) {
        expect(again[i].pieces.map((p) => p.id)).toEqual(
          works[i].pieces.map((p) => p.id)
        );
      }
    });

    it('has a word the child can actually trace', () => {
      const raw = getLiveLesson(lesson.lessonNumber);
      const word = traceWordFor(lesson.letter, raw?.decodable);
      const model = buildWordTrace(word);
      expect(model.strokes.length).toBeGreaterThan(0);
      expect(model.letters.length).toBeGreaterThan(0);
      expect(model.width).toBeGreaterThan(0);
    });
  }
);

describe('word tracing', () => {
  it('lays letters out left to right without overlapping', () => {
    const model = buildWordTrace('sat');
    const xs = model.strokes.map((s) => s.dx);
    expect(new Set(xs).size).toBe(3);
    expect(xs[0]).toBeLessThan(xs[xs.length - 1]);
  });

  it('drops characters with no stroke model rather than throwing', () => {
    expect(buildWordTrace('a…!').letters).toEqual(['a']);
    expect(buildWordTrace('…').strokes).toHaveLength(0);
  });
});
