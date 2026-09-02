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
 * 🚨 THE PAGE LIST IS THE PRINTED BOOKLET'S PAGE LIST (2026-09-02).
 *
 * The digital reader used to be "cover · one page per spread · back": eight
 * leaves for a book that prints twenty-four, with the picture above the words
 * on a single face. The teacher's call: the screen must be the A5 booklet the
 * class already holds. So the order below is `paginate()`'s order, verbatim
 * from scripts/curriculum/flashcards/build_booklets.py:
 *
 *     cover · blank · half-title
 *     · [ TEXT page, ART page ] × every spread
 *     · WORDS IN THIS BOOK
 *     · 0–3 designed filler pages (MY WORDS · MY PICTURE · I CAN READ)
 *     · back cover
 *
 * TWO INVARIANTS COME WITH IT, both of them the Python's, both load-bearing:
 *
 *  1. TEXT LEFT, PICTURE RIGHT. Folded, the booklet faces (2,3), (4,5), (6,7)…
 *     so a spread's text page must land on an EVEN page for its own art to sit
 *     opposite it. That is what forces the single blank between the cover and
 *     the half-title — front matter of ODD length. Drop the blank and every
 *     picture faces the NEXT spread's word, which the Python calls "fatal for a
 *     phonics reader" and is exactly as fatal on glass.
 *  2. PADDING TO A MULTIPLE OF FOUR, never stranded after the story: one page
 *     inside the front cover, the rest between the word list and the back.
 *     Those tail pages are filled with designed work, not left blank.
 *
 * Folios are printed on the story body only, numbered by ABSOLUTE page
 * position — so the first text page of every book is page 4.
 *
 * PURE: no I/O, no clock, no randomness.
 */

import {
  BOOK_WORKS_LESSON_NUMBERS,
  getBookWorks,
  splitBookLine,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';
import { getLiveLesson } from '@/lib/montree/dark-phonics/live-lesson';

/**
 * Below this wrapper width a two-page spread will not fit and the book shows
 * one page at a time.
 *
 * 🚨 IT LIVES HERE BECAUSE TWO PLACES MUST AGREE. FlipBookCore decides how to
 * lay the book out, and the tracing workbook decides which leaves to build at
 * all (portrait drops the art pages). If those two used different numbers a
 * phone would get a book whose pages and layout disagree — so they read one
 * constant, from the page model, rather than each holding their own.
 */
export const SPREAD_MIN_WIDTH = 720;

/** The house line at the top of the cover and the back cover. */
export const MASTHEAD = 'MONTREE PHONICS';

/** The strapline printed under the masthead on the back cover. */
export const BACK_STRAPLINE = 'Teacher Potato hides at the end of every book.';

/** The footer printed at the bottom of the back cover. */
export const BACK_FOOTER = 'teacherpotato.xyz';

/** `page_words()`'s standing footnote on every picture-noun book. */
export const ORAL_NOTE =
  'the nouns live in the pictures — named aloud, never printed';

const NUMWORDS = [
  'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT',
  'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
  'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY',
];

/** One leaf of the flip book — one printed A5 page. */
export type ShelfPage =
  | {
      kind: 'cover';
      /** The book's title, as the printed cover breaks it over its lines. */
      titleLines: string[];
      /** The line set in red inside the title — `title_accent` on paper. */
      accent: string;
      title: string;
      /** The tracked band under the masthead. */
      band: string;
      /** The letter this book teaches. */
      letter: string;
      art: string;
    }
  /** The inside front cover. Blank on paper; blank here. See invariant 1. */
  | { kind: 'blank' }
  | { kind: 'half-title'; title: string }
  | {
      kind: 'text';
      /** 1-based ABSOLUTE page number, as the folio prints it. */
      number: number;
      /** The whole printed line — what a grown-up reads aloud. */
      sentence: string;
      /** The locked lead-in / shout split, exactly as the paper sets it. */
      lead: string;
      shout: string;
      /** A chant page: the whole line is the shout, and it prints red. */
      chant: boolean;
    }
  | { kind: 'art'; number: number; art: string }
  | {
      kind: 'words';
      newWords: string[];
      reviewWords: string[];
      note: string;
    }
  | { kind: 'my-words'; words: string[] }
  | { kind: 'my-picture'; instruction: string }
  | { kind: 'i-can-read'; lines: { lead: string; shout: string }[] }
  | { kind: 'back'; letter: string; title: string; booknum: string };

/** Every `kind` a ShelfPage can carry — see `isShelfPage`. */
const SHELF_PAGE_KINDS: ReadonlySet<string> = new Set([
  'cover', 'blank', 'half-title', 'text', 'art', 'words', 'my-words',
  'my-picture', 'i-can-read', 'back',
]);

/**
 * True when a flip-book leaf is a READER page rather than a tracing leaf.
 *
 * FlipBookCore paints a union of the two (the workbook is the reader with one
 * page swapped), and both sides need to ask "is this mine?" without listing ten
 * string literals each time.
 */
export function isShelfPage(leaf: { kind: string }): leaf is ShelfPage {
  return SHELF_PAGE_KINDS.has(leaf.kind);
}

/** One story spread: its text page and the art facing it. */
export interface ShelfSpread {
  /** The folio on the TEXT page — the left-hand page of the pair. */
  number: number;
  art: string;
  sentence: string;
  lead: string;
  shout: string;
  chant: boolean;
}

export interface ShelfBook {
  lessonNumber: number;
  title: string;
  titleLines: string[];
  accent: string;
  band: string;
  booknum: string;
  letter: string;
  coverArt: string;
  /** Every printed page, in reading order. */
  pages: ShelfPage[];
  /** The story spreads, in book order — what the tracing workbook rebuilds. */
  spreads: ShelfSpread[];
  /** Index of the first story TEXT page — where "start reading" jumps to. */
  firstSpread: number;
}

/* -------------------------------------------------------------------------- */
/* Cover furniture                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The printed cover breaks its title over two lines and sets the last one red
 * ("The ___" / "Sat!"). `title_lines` and `title_accent` are authored per book
 * in books_def.py; this side has only the joined title, so the break is taken
 * at the last space — which reproduces every title in the decodable run.
 */
function titleLinesOf(title: string): { lines: string[]; accent: string } {
  const cut = title.lastIndexOf(' ');
  if (cut < 0) return { lines: [title], accent: title };
  const accent = title.slice(cut + 1);
  return { lines: [title.slice(0, cut), accent], accent };
}

/**
 * The art the printed cover carries.
 *
 * 🚨 IT IS NOT `lesson.coverImage`. That field is documented as the book's
 * OPENING page rather than its printed cover, because the lesson player's video
 * step wants the real object on screen ("A sock.") and not a title plate. The
 * booklet's own `cover=` is authored per book in books_def.py and is not in this
 * side's data — but for every decodable reader in the run it is the book's hero,
 * the last cast spread (the-sat prints the cat, SAT-p6). So that is what the
 * reader's cover uses, falling back to the lesson's opening page.
 */
function coverArtFor(lesson: BookWorksLesson): string {
  return lesson.cast[lesson.cast.length - 1]?.image ?? lesson.coverImage;
}

/**
 * The tracked band under the masthead.
 *
 * On paper it is authored ("WEEK 3 · FIRST DECODE · s a t"). The two halves
 * this side can derive honestly are the week — the display lesson number — and
 * the letters taught so far, which are exactly the Book Works letters up to and
 * including this one. The authored middle segment is not in the data and is
 * not invented.
 */
function bandFor(lesson: BookWorksLesson): string {
  const letters = BOOK_WORKS_LESSON_NUMBERS.filter(
    (n) => n <= lesson.lessonNumber
  )
    .map((n) => getBookWorks(n)?.letter ?? '')
    .filter(Boolean);
  return `WEEK ${lesson.lessonNumber}  ·  ${letters.join(' ')}`;
}

/* -------------------------------------------------------------------------- */
/* The word list and the fillers                                               */
/* -------------------------------------------------------------------------- */

/** Today's new decodable words — `new` on the printed WORDS page. */
function newWordsFor(lesson: BookWorksLesson): string[] {
  return getLiveLesson(lesson.lessonNumber)?.decodable ?? [];
}

/** Everything taught before today — `review` on the printed WORDS page. */
function reviewWordsFor(lesson: BookWorksLesson): string[] {
  const seen = new Set<string>();
  for (const n of BOOK_WORKS_LESSON_NUMBERS) {
    if (n >= lesson.lessonNumber) continue;
    for (const w of getLiveLesson(n)?.decodable ?? []) seen.add(w);
  }
  return [...seen];
}

/**
 * The designed tail pages, in ladder order, capped at the number of padding
 * slots the pagination actually leaves — `FILLER_LADDER` in the Python.
 *
 * Each rung is data-driven and yields nothing when this book has nothing for
 * it: a book with no writable word list skips MY WORDS, exactly as on paper.
 */
function fillerPages(lesson: BookWorksLesson, slots: number): ShelfPage[] {
  if (slots <= 0) return [];
  const words = [...newWordsFor(lesson), ...reviewWordsFor(lesson)];
  const ladder: (ShelfPage | null)[] = [
    words.length ? { kind: 'my-words', words: words.slice(0, 12) } : null,
    {
      kind: 'my-picture',
      instruction: `Draw the ___ that ${lastWord(lesson.bookTitle)}!`,
    },
    {
      kind: 'i-can-read',
      lines: lesson.pages.map((page) => splitBookLine(page)),
    },
  ];
  return ladder.filter((p): p is ShelfPage => p !== null).slice(0, slots);
}

/** "The ___ Sat!" → "sat" — the book's own shout, in running text. */
function lastWord(title: string): string {
  const tail = title.trim().split(/\s+/u).pop() ?? '';
  return tail.replace(/[.?!…]+$/u, '').toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* The book                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The reader for one Book Works lesson, paginated like the printed booklet.
 *
 * The tail padding is computed the way `paginate()` computes it — one fixed
 * blank inside the front cover, then whatever it takes to reach a multiple of
 * four between the word list and the back cover.
 */
export function buildShelfBook(lesson: BookWorksLesson): ShelfBook {
  const { lines, accent } = titleLinesOf(lesson.bookTitle);

  // Front matter is three pages (cover · blank · half-title), so the first
  // text page is page 4 and every text page after it lands on an even folio.
  const FRONT = 3;
  const spreads: ShelfSpread[] = lesson.pages.map((page, i) => {
    const { lead, shout } = splitBookLine(page);
    return {
      number: FRONT + i * 2 + 1,
      art: page.art,
      sentence: page.sentence,
      lead,
      shout,
      chant: !!page.chant,
    };
  });

  const body: ShelfPage[] = [];
  for (const spread of spreads) {
    body.push({
      kind: 'text',
      number: spread.number,
      sentence: spread.sentence,
      lead: spread.lead,
      shout: spread.shout,
      chant: spread.chant,
    });
    body.push({ kind: 'art', number: spread.number + 1, art: spread.art });
  }

  // cover + blank + half-title + body + words + back
  const n = FRONT + body.length + 2;
  const tail = ((-n % 4) + 4) % 4;

  const fillers = fillerPages(lesson, tail);
  // The ladder can run dry: pad with true blanks, exactly as the Python falls
  // back to page_blank, so the page count stays a multiple of four and the
  // facing pairs stay put.
  while (fillers.length < tail) fillers.push({ kind: 'blank' });

  const pages: ShelfPage[] = [
    {
      kind: 'cover',
      title: lesson.bookTitle,
      titleLines: lines,
      accent,
      band: bandFor(lesson),
      letter: lesson.letter,
      art: coverArtFor(lesson),
    },
    { kind: 'blank' },
    { kind: 'half-title', title: lesson.bookTitle },
    ...body,
    {
      kind: 'words',
      newWords: newWordsFor(lesson),
      reviewWords: reviewWordsFor(lesson),
      note: ORAL_NOTE,
    },
    ...fillers,
    {
      kind: 'back',
      letter: lesson.letter,
      title: lesson.bookTitle,
      booknum: `BOOK ${NUMWORDS[lesson.lessonNumber] ?? lesson.lessonNumber}`,
    },
  ];

  return {
    lessonNumber: lesson.lessonNumber,
    title: lesson.bookTitle,
    titleLines: lines,
    accent,
    band: bandFor(lesson),
    booknum: `BOOK ${NUMWORDS[lesson.lessonNumber] ?? lesson.lessonNumber}`,
    letter: lesson.letter,
    coverArt: coverArtFor(lesson),
    pages,
    spreads,
    firstSpread: FRONT,
  };
}

/** Convenience: the reader for a DISPLAY lesson number, or null. */
export function getShelfBook(lessonNumber: number): ShelfBook | null {
  const lesson = getBookWorks(lessonNumber);
  return lesson ? buildShelfBook(lesson) : null;
}
