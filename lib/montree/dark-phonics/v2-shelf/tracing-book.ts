/**
 * V2 Shelf — the TRACING WORKBOOK, as a page model.
 *
 * The printed tracing workbook is not a different book: it is the reader with
 * one page swapped. scripts/curriculum/dark-phonics-storybooks/build_a5_tracing.py
 * says so in as many words — "you can literally duplicate the build and just
 * supplement the content for the tracing work" — and enforces it by building its
 * body through the READER's own `bb.story_pages()`/`bb.paginate()`, so the
 * workbook has the reader's page count, page order and facing pairs and only the
 * left-hand text page is painted differently.
 *
 * So this module derives the workbook from `buildShelfBook()` rather than from
 * the lesson: one page model, one page order, and a workbook page can never
 * drift from the reader page it faces.
 *
 * 🚨 HERO-WORD MODE IS THE DEFAULT, AND THE RULE IS PORTED, NOT INVENTED.
 * `hero_word()` in build_a5_tracing.py: a book that repeats ONE reveal word on
 * every genuine reveal spread traces that word on every trace page; a book whose
 * reveal word genuinely changes from spread to spread (oh-no-goat: grapes /
 * gloves / gift / guitar) falls back to tracing the whole sentence. Comparison
 * is normalised — trailing `.?!…` and case are presentation, not identity, so
 * "Jump." / "jump." and "sock." / "sock?" are one hero word — and the literal
 * form kept is the book's own most common one.
 *
 * A GENUINE REVEAL SPREAD, in the Python, is one carrying BOTH a lead-in (`nar`)
 * and a single-string reveal word, in the normal style. The three exclusions
 * that rule makes, restated in terms this side of the port actually has:
 *
 *   · a chant page ('drop' style, `page.chant`) is not a reveal — it has no
 *     lead-in at all and is all shout;
 *   · an intro page with no lead-in ("An apple.") is not a reveal;
 *   · a line that TRAILS OFF ("And the…?!", "Oh no, goat…") is the `text=None`
 *     shape: the sentence is the whole line and there is no reveal word after
 *     it. Detected here by the ellipsis in the shout, which is the only mark
 *     that shape leaves once the reader has split the printed line.
 *
 * PURE: no I/O, no clock, no randomness.
 */

import type { BookWorksLesson } from '@/lib/montree/dark-phonics/book-works';
import {
  buildShelfBook,
  getShelfBook,
  type ShelfBook,
} from '@/lib/montree/dark-phonics/v2-shelf/books';

/** Trailing punctuation is presentation, not identity — see `_STRIP` in the Python. */
const TRAIL = /[.?!…]+$/u;
/** Anything that is not a letter or a space cannot be traced, so it is dropped. */
const UNTRACEABLE = /[^a-z ]+/gu;

/** One trace page of the workbook — the left-hand page of a workbook spread. */
export interface TracingPage {
  /** 1-based printed page number, the same one the reader's spread carries. */
  number: number;
  /** The spread's lead-in, set small above the guide row. */
  lead: string;
  /** What the child traces: lower case, letters only, ready for `buildWordTrace`. */
  word: string;
  /** The book's own literal form of that word ("Sat!"), for display and audio. */
  printed: string;
  /** The art on the facing page — the reader's own page art. */
  art: string;
  /** The whole printed line, kept so the page can be read aloud. */
  sentence: string;
}

export interface TracingBook {
  lessonNumber: number;
  title: string;
  letter: string;
  coverArt: string;
  /**
   * The one repeated reveal word, when the book has one — `null` means this
   * book fell back to whole-sentence tracing, exactly as the printed workbook
   * does.
   */
  heroWord: string | null;
  pages: TracingPage[];
}

/** Normalised for identity: case and trailing punctuation dropped. */
function norm(word: string): string {
  return word.trim().toLowerCase().replace(TRAIL, '');
}

/** Reduced to what the stroke model can actually draw. */
export function traceableForm(text: string): string {
  return text.toLowerCase().replace(UNTRACEABLE, ' ').replace(/\s+/gu, ' ').trim();
}

/**
 * The one reveal word this book repeats, in the book's own literal form, or
 * `null` when it genuinely changes from spread to spread.
 *
 * Ported from `hero_word()` — see this file's header for the mapping between the
 * Python's spread shapes and the reader's lead/shout split.
 */
export function heroWord(book: ShelfBook): string | null {
  const words: string[] = [];
  for (const page of book.spreads) {
    // No lead-in: the intro page, or a chant. Not a reveal.
    if (!page.lead.trim()) continue;
    // Trails off: the line IS the sentence, there is no reveal word after it.
    if (page.shout.includes('…') || page.shout.includes('...')) continue;
    if (!norm(page.shout)) continue;
    words.push(page.shout.trim());
  }
  if (!words.length) return null;
  if (new Set(words.map(norm)).size !== 1) return null;

  // The book's own most common literal form wins, so the traced word matches
  // what the reader actually prints.
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  let best = words[0];
  for (const [w, n] of counts) {
    if (n > (counts.get(best) ?? 0)) best = w;
  }
  return best;
}

/**
 * The tracing workbook for one lesson.
 *
 * One trace page per story spread, in spread order, each carrying that spread's
 * lead-in and its facing art — the printed workbook's structure exactly.
 */
export function buildTracingBook(lesson: BookWorksLesson): TracingBook {
  return tracingBookFrom(buildShelfBook(lesson));
}

/** The workbook for an already-built reader. */
export function tracingBookFrom(book: ShelfBook): TracingBook {
  const hero = heroWord(book);
  const heroTraceable = hero ? traceableForm(hero) : '';

  const pages: TracingPage[] = [];
  for (const page of book.spreads) {
    // Hero mode when the book has a hero word; otherwise the whole sentence,
    // exactly like the printed workbook's --sentences fallback.
    const printed = hero ?? page.sentence;
    const word = hero ? heroTraceable : traceableForm(page.sentence);
    // A page with nothing traceable on it would be a page a child cannot
    // finish, and the book flips on completion — so it never gets made.
    if (!word) continue;
    pages.push({
      number: page.number,
      lead: page.lead,
      word,
      printed,
      art: page.art,
      sentence: page.sentence,
    });
  }

  return {
    lessonNumber: book.lessonNumber,
    title: book.title,
    letter: book.letter,
    coverArt: book.coverArt,
    heroWord: hero,
    pages,
  };
}

/** Convenience: the workbook for a DISPLAY lesson number, or null. */
export function getTracingBook(lessonNumber: number): TracingBook | null {
  const book = getShelfBook(lessonNumber);
  return book ? tracingBookFrom(book) : null;
}

/* -------------------------------------------------------------------------- */
/* The workbook, as leaves of a flip book                                      */
/* -------------------------------------------------------------------------- */

/** One leaf of the tracing workbook. */
export type TracingLeaf =
  | { kind: 'trace-cover'; title: string; letter: string; art: string; badge: string }
  | { kind: 'trace'; page: TracingPage }
  | { kind: 'trace-art'; art: string }
  | { kind: 'trace-back'; title: string; letter: string };

export interface TracingLeaves {
  leaves: TracingLeaf[];
  /** Index, in `leaves`, of each trace page — in page order. */
  traceIndexes: number[];
  /** Index of the back cover: the leaf the last completed page flips to. */
  backIndex: number;
}

/**
 * The workbook laid out as flip-book leaves.
 *
 * On a spread (`spread: true`) every trace page is followed by the reader's own
 * art for that page, so the pair the child sees is the printed workbook's own
 * facing pair — trace on the left, picture on the right. On a phone the art
 * pages are NOT built at all: a single-page book that still carried them would
 * make a child flip past a picture between every word, and the trace pages are
 * the workbook.
 *
 * 🚨 A TRACE PAGE IS ALWAYS THE LEADING LEAF OF ITS SPREAD, which is what lets
 * the caller arm exactly the page StPageFlip reports as current.
 */
export function tracingLeaves(
  book: TracingBook,
  { spread }: { spread: boolean }
): TracingLeaves {
  const leaves: TracingLeaf[] = [
    {
      kind: 'trace-cover',
      title: book.title,
      letter: book.letter,
      art: book.coverArt,
      badge: 'Trace the story',
    },
  ];
  const traceIndexes: number[] = [];

  for (const page of book.pages) {
    traceIndexes.push(leaves.length);
    leaves.push({ kind: 'trace', page });
    if (spread) leaves.push({ kind: 'trace-art', art: page.art });
  }

  const backIndex = leaves.length;
  leaves.push({ kind: 'trace-back', title: book.title, letter: book.letter });

  return { leaves, traceIndexes, backIndex };
}
