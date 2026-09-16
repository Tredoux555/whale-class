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
 * 🚨 ONE PAGE, ONE WORD (2026-09-16, per Tredoux — this replaces hero mode).
 *
 * A trace page traces THE WORD THAT PAGE TEACHES and nothing else: the page's
 * own reveal (the `shout` half of the reader's lead/shout split), reduced to
 * lower-case letters. Never a phrase, never a sentence, never more than one
 * word.
 *
 * WHY THE OLD RULE HAD TO GO. `hero_word()` in build_a5_tracing.py asks whether
 * ONE reveal word repeats across the whole book; if it does every page traces
 * it, and if it does not the workbook falls back to tracing THE WHOLE SENTENCE.
 * That fallback fired on seven of the twenty-one books, because one page in
 * each says something slightly different — the-nap reads "naps." six times and
 * then "nap!" once — and the child was handed "theantnaps" as a single
 * run-together guide row under the caption "The ant…". A four-year-old learning
 * the letter n does not trace a sentence. Per page, the target is unambiguous:
 * "naps" on the ant page, "nap" on the potato page.
 *
 * THE RULE, whole:
 *   1. take the page's shout (splitBookLine: everything after the last space,
 *      or the whole line on a chant page, whose lead is empty by design);
 *   2. keep only its LAST whitespace token — a chant is "Nap! Nap! Nap!" and
 *      the word it teaches is "nap", said three times;
 *   3. lower-case it and drop everything that is not a letter;
 *   4. a page whose shout TRAILS OFF ("And the…?!") has no reveal word after
 *      it — that is the `text=None` shape in the Python — and is SKIPPED, as is
 *      any page left with nothing traceable. A skipped page is not built: the
 *      book flips on completion, so a page a child cannot finish must not exist.
 *
 * 🚨 THE POTATO IS NEVER THE TARGET (2026-09-16, standing rule from the owner).
 * Teacher Potato is the end-page joke, not a character and not a thing a child
 * is learning to write, so "potato"/"potatoes" is never traced. A page whose
 * target comes out as the potato traces the book's OWN repeated word instead,
 * when that word is actually on the page — "Bug saw a… potato!" traces `bug` —
 * and is otherwise SKIPPED, because inventing a word that is not on the page in
 * front of the child is worse than one page fewer ("Crew helps the… potato!"
 * has no `kit` on it, so lesson 12 ends a page early).
 *
 * The book's own word is its most common non-potato target, in book order — the
 * same thing heroWord() finds when a book has one, and still defined for the
 * seven books where heroWord() is null because a single page says it otherwise.
 *
 * `heroWord()` is KEPT and still reported on the book, because "does this book
 * repeat one word?" is a true and useful fact about it (the printed workbook
 * still branches on it) — it simply no longer decides what any page traces.
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

/** Teacher Potato, in every form the books spell him. */
const POTATO = /^potato(es)?$/u;

/** True when a word is the potato — never a learning target. See the header. */
export function isPotatoWord(word: string): boolean {
  return POTATO.test(word);
}

/**
 * The one word a page teaches, from that page's shout — steps 2-4 of the rule
 * in this file's header. `null` means the page has no reveal word and is not
 * given a trace page at all.
 *
 * Returns both the traceable form (what the finger writes) and the book's own
 * literal form (what is read aloud and shown).
 */
export function targetWord(shout: string): { word: string; printed: string } | null {
  const raw = shout.trim();
  if (!raw) return null;
  // Trails off: the line IS the sentence and the reveal never lands.
  if (raw.includes('…') || raw.includes('...')) return null;
  const printed = raw.split(/\s+/u).pop() ?? '';
  // Letters only, and ONE word: an apostrophe inside a word ("doesn't") is
  // presentation, not a word break, so it closes up rather than splitting.
  const word = traceableForm(printed).replace(/\s+/gu, '');
  if (!word) return null;
  return { word, printed };
}

/**
 * The literal form of `word` as it is printed somewhere in `sentence`, or null
 * when the sentence does not carry it. Used only to rescue a potato page — the
 * child traces a word that is on the page in front of them, or no word at all.
 */
export function wordOnPage(sentence: string, word: string): string | null {
  for (const token of sentence.trim().split(/\s+/u)) {
    if (traceableForm(token).replace(/\s+/gu, '') === word) return token;
  }
  return null;
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

  // One page, one word: this page's own reveal — see the header.
  const targets = book.spreads.map((page) => ({ page, target: targetWord(page.shout) }));

  // The book's own repeated word: the most common target that is not the
  // potato, ties broken by book order.
  const counts = new Map<string, number>();
  for (const { target } of targets) {
    if (!target || isPotatoWord(target.word)) continue;
    counts.set(target.word, (counts.get(target.word) ?? 0) + 1);
  }
  let own: string | null = null;
  for (const [word, n] of counts) {
    if (own === null || n > (counts.get(own) ?? 0)) own = word;
  }

  const pages: TracingPage[] = [];
  for (const { page, target } of targets) {
    // A page with no reveal word on it would be a page a child cannot
    // finish, and the book flips on completion — so it never gets made.
    if (!target) continue;
    let { word, printed } = target;
    if (isPotatoWord(word)) {
      const instead = own ? wordOnPage(page.sentence, own) : null;
      // Nothing of the book's own word on this page: one page fewer.
      if (!instead) continue;
      word = own as string;
      printed = instead;
    }
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
