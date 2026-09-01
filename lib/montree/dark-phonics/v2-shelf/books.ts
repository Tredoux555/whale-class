/**
 * V2 Shelf — the reader's page model.
 *
 * 🚨 THE BOOK TEXT IS NOT RE-PORTED HERE, ON PURPOSE.
 *
 * The obvious move was to write a Python emitter over
 * scripts/curriculum/flashcards/books_def.py (and bookNN.py) and land a second
 * copy of every book's page text in TypeScript. That copy already exists: the
 * Book Works pipeline ported exactly this content, book by book, into
 * lib/montree/dark-phonics/book-works-lessons.ts, and its header records which
 * of the three disagreeing Python sources governs each field — including that
 * dp-the-lost.json and dp-the-jump.json carry superseded phrasing that must NOT
 * be used. A fresh emitter would have to re-derive that judgement and would
 * silently drift from it the first time either side changed.
 *
 * So this module DERIVES the reader from `getBookWorks()`. One book text, one
 * place, and a page a child reads in the V2 reader is byte-for-byte the page
 * they read in the existing lesson player.
 *
 * PURE: no I/O, no clock, no randomness.
 */

import {
  getBookWorks,
  splitBookLine,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';

/** One leaf of the flip book. */
export type ShelfPage =
  | {
      kind: 'cover';
      /** The book's title, set big on the cover. */
      title: string;
      /** The letter this book teaches, shown as a quiet eyebrow. */
      letter: string;
      art: string;
    }
  | {
      kind: 'spread';
      /** 1-based, for the printed page number. */
      number: number;
      art: string;
      /** The whole printed line — what a grown-up reads aloud. */
      sentence: string;
      /** The locked lead-in / shout split, exactly as the paper sets it. */
      lead: string;
      shout: string;
    }
  | { kind: 'back'; letter: string; title: string };

export interface ShelfBook {
  lessonNumber: number;
  title: string;
  letter: string;
  pages: ShelfPage[];
  /** Index of the first story spread — where "start reading" jumps to. */
  firstSpread: number;
}

/**
 * The reader for one Book Works lesson.
 *
 * Page order is cover → every printed page in book order → back cover. The
 * lead/shout split comes from `splitBookLine()`, the single place that rule
 * lives, so the screen sets the line the way the paper does.
 */
export function buildShelfBook(lesson: BookWorksLesson): ShelfBook {
  const pages: ShelfPage[] = [
    {
      kind: 'cover',
      title: lesson.bookTitle,
      letter: lesson.letter,
      art: lesson.coverImage,
    },
  ];

  lesson.pages.forEach((page, i) => {
    const { lead, shout } = splitBookLine(page);
    pages.push({
      kind: 'spread',
      number: i + 1,
      art: page.art,
      sentence: page.sentence,
      lead,
      shout,
    });
  });

  pages.push({ kind: 'back', letter: lesson.letter, title: lesson.bookTitle });

  return {
    lessonNumber: lesson.lessonNumber,
    title: lesson.bookTitle,
    letter: lesson.letter,
    pages,
    firstSpread: 1,
  };
}

/** Convenience: the reader for a DISPLAY lesson number, or null. */
export function getShelfBook(lessonNumber: number): ShelfBook | null {
  const lesson = getBookWorks(lessonNumber);
  return lesson ? buildShelfBook(lesson) : null;
}
