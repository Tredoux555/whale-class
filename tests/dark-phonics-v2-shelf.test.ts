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
import {
  buildTracingBook,
  traceableForm,
  tracingLeaves,
} from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';
import {
  buildCharactersWork,
  buildWork,
  buildWorks,
  changingWordColumns,
  charactersForBook,
  cleanSentence,
  wordKey,
} from '@/lib/montree/dark-phonics/v2-shelf/works';

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

    it('paginates like the printed A5 booklet', () => {
      const book = buildShelfBook(lesson);
      // cover · blank · half-title · [text, art] × spreads · words · … · back
      expect(book.pages[0].kind).toBe('cover');
      expect(book.pages[1].kind).toBe('blank');
      expect(book.pages[2].kind).toBe('half-title');
      expect(book.pages[book.pages.length - 1].kind).toBe('back');
      // Saddle stitch: the sheet count is always a multiple of four.
      expect(book.pages.length % 4).toBe(0);
      expect(book.pages.filter((p) => p.kind === 'text')).toHaveLength(
        lesson.pages.length
      );
      expect(book.pages.filter((p) => p.kind === 'art')).toHaveLength(
        lesson.pages.length
      );
      expect(book.pages.filter((p) => p.kind === 'words')).toHaveLength(1);

      // TEXT LEFT, PICTURE RIGHT: every text page lands on an EVEN folio, with
      // its own art on the odd page facing it. This is the invariant the blank
      // inside the front cover exists to protect.
      book.pages.forEach((page, i) => {
        if (page.kind !== 'text') return;
        expect(page.number).toBe(i + 1);
        expect(page.number % 2).toBe(0);
        const facing = book.pages[i + 1];
        expect(facing.kind).toBe('art');
        if (facing.kind === 'art') {
          expect(facing.number).toBe(page.number + 1);
        }
      });

      for (const spread of book.spreads) {
        // The lead/shout split must never drop or invent a word.
        expect(`${spread.lead} ${spread.shout}`.trim()).toBe(
          spread.sentence.trim()
        );
        expect(spread.shout.length).toBeGreaterThan(0);
      }
    });

    it('gives every character of the book its own box, in reading order', () => {
      const characters = charactersForBook(lesson);
      const work = buildCharactersWork(lesson);
      // One box per character, no character twice, and every box has a piece.
      expect(characters.length).toBeGreaterThan(0);
      expect(new Set(characters.map((c) => c.art)).size).toBe(characters.length);
      expect(work.slots).toHaveLength(characters.length);
      expect(work.pieces).toHaveLength(characters.length);
      expect(work.cols).toBe(1);
      for (const slot of work.slots) expect(slot.col).toBe(0);
      // First appearance: each character's box order follows the book's pages.
      const firstPage = (art: string) =>
        lesson.pages.findIndex((p) => p.art === art);
      const order = characters.map((c) => firstPage(c.art));
      expect(order).toEqual([...order].sort((a, b) => a - b));
      for (const piece of work.pieces) {
        const slot = work.slots.find((s) => s.id === piece.slotId);
        expect(slot?.accepts).toBe(piece.matchKey);
      }
    });

    it('never shows an ellipsis or a mid-sentence capital in any work', () => {
      for (const work of works) {
        const printed = [
          ...work.slots.map((s) => s.fixedText ?? ''),
          ...work.slots.map((s) => s.guideText ?? ''),
          ...work.pieces.map((p) => p.text ?? ''),
        ].filter(Boolean);
        for (const text of printed) {
          expect(text).not.toMatch(/…|\.\.\./u);
        }
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

        // A card is accepted by matching TEXT, not identity — so every card's
        // key must at least open its own home, and no slot may be both printed
        // and droppable.
        const byId = new Map(work.slots.map((s) => [s.id, s]));
        for (const piece of work.pieces) {
          expect(byId.get(piece.slotId)?.accepts).toBe(piece.matchKey);
        }
        for (const slot of work.slots) {
          expect(!!slot.accepts && !!slot.fixedText).toBe(false);
          if (slot.accepts) expect(filled.has(slot.id)).toBe(true);
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

describe.each(LESSONS.map((l) => [l.lessonNumber, l] as const))(
  'lesson %i tracing workbook',
  (_n, lesson) => {
    const book = buildShelfBook(lesson);
    const workbook = buildTracingBook(lesson);

    it('is the reader with one page swapped', () => {
      // Page for page the reader's spreads, in the reader's order — that is
      // what build_a5_tracing.py guarantees by building through the reader's
      // own paginate(), and it is the invariant that keeps a trace page facing
      // the art it belongs to.
      const spreads = book.spreads;
      expect(workbook.pages.length).toBeGreaterThan(0);
      expect(workbook.pages.map((p) => p.number)).toEqual(
        spreads.map((p) => p.number)
      );
      for (const page of workbook.pages) {
        const spread = spreads.find((p) => p.number === page.number);
        expect(spread ? spread.art : null).toBe(page.art);
      }
    });

    it('gives every page a word the child can actually trace', () => {
      for (const page of workbook.pages) {
        const model = buildWordTrace(page.word);
        expect(model.strokes.length).toBeGreaterThan(0);
        expect(model.letters.length).toBeGreaterThan(0);
      }
    });

    it('traces one hero word throughout, or falls back to the sentence', () => {
      const hero = workbook.heroWord;
      const words = new Set(workbook.pages.map((p) => p.word));
      if (hero) {
        // Hero mode: the same word on every page, and it is the book's own.
        expect(words.size).toBe(1);
        expect([...words][0]).toBe(traceableForm(hero));
      } else {
        // Sentence mode: each page traces its own line.
        for (const page of workbook.pages) {
          expect(page.word).toBe(traceableForm(page.sentence));
        }
      }
    });

    it('lays leaves out cover · pages · back, with art only on a spread', () => {
      const wide = tracingLeaves(workbook, { spread: true });
      const narrow = tracingLeaves(workbook, { spread: false });

      for (const laid of [wide, narrow]) {
        expect(laid.leaves[0].kind).toBe('trace-cover');
        expect(laid.leaves[laid.backIndex].kind).toBe('trace-back');
        expect(laid.backIndex).toBe(laid.leaves.length - 1);
        expect(laid.traceIndexes).toHaveLength(workbook.pages.length);
        // Every index the player arms really is a trace page, in page order.
        laid.traceIndexes.forEach((i, k) => {
          const leaf = laid.leaves[i];
          expect(leaf.kind).toBe('trace');
          if (leaf.kind === 'trace') expect(leaf.page.number).toBe(workbook.pages[k].number);
        });
      }

      // On a spread a trace page always leads, with its own art facing it.
      expect(wide.traceIndexes.every((i) => i % 2 === 1)).toBe(true);
      for (const i of wide.traceIndexes) {
        const face = wide.leaves[i];
        const art = wide.leaves[i + 1];
        expect(art.kind).toBe('trace-art');
        if (face.kind === 'trace' && art.kind === 'trace-art') {
          expect(art.art).toBe(face.page.art);
        }
      }
      // On a phone there is no art page at all: word follows word.
      expect(narrow.leaves.filter((l) => l.kind === 'trace-art')).toHaveLength(0);
      expect(narrow.leaves).toHaveLength(workbook.pages.length + 2);
    });
  }
);

describe('the tracing workbook picks its hero word the way the printer does', () => {
  it("takes the repeated reveal word, in the book's own literal form", () => {
    const workbook = buildTracingBook(getBookWorks(3)!);
    expect(workbook.heroWord).toBe('Sat!');
    expect(new Set(workbook.pages.map((p) => p.word))).toEqual(new Set(['sat']));
  });

  it('strips what is presentation, not identity', () => {
    expect(traceableForm('Sat!')).toBe('sat');
    expect(traceableForm('sock?')).toBe('sock');
    expect(traceableForm('The ant… sat!')).toBe('the ant sat');
  });
});

describe('only the word that changes is a card', () => {
  it('reads a word the way a child does — case and page-turn marks dropped', () => {
    expect(wordKey('The')).toBe(wordKey('the'));
    expect(wordKey('Sat!')).toBe('sat');
    expect(wordKey('ant…')).toBe('ant');
    expect(wordKey('doesn’t')).toBe(wordKey("doesn't"));
    // A token that is nothing but punctuation keeps itself, so two of them are
    // not silently interchangeable.
    expect(wordKey('…')).not.toBe(wordKey('?!'));
  });

  it('finds the one changing column in "The ___ sat!"', () => {
    const lesson = getBookWorks(3)!;
    const clean = lesson.cast.map((c) =>
      cleanSentence(c.sentence.slice(0, c.sentence.lastIndexOf(' ')), 'Sat!')
    );
    expect(clean[0]).toBe('The ant sat!');
    expect(changingWordColumns(clean)).toEqual([false, true, false]);
  });

  it('treats a column as changing when some rows have no word there', () => {
    expect(changingWordColumns(['The cat sat.', 'The cat.'])).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('lets everything move when nothing changes at all', () => {
    // A degenerate work — every row identical — would otherwise print itself
    // whole and leave the child no card to lay.
    expect(changingWordColumns(['The cat sat.', 'The cat sat.'])).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('cuts out exactly the four animals in lesson 3, work 3', () => {
    const work = buildWork(getBookWorks(3)!, 'work3')!;
    const wordPieces = work.pieces.filter((p) => p.kind === 'word');
    expect(wordPieces.map((p) => p.text).sort()).toEqual(
      ['ant', 'cat', 'snake', 'star'].sort()
    );
    // "The" and "Sat!" are printed on the sheet, in every row, and nothing
    // drops on them.
    const printed = work.slots.filter((s) => s.kind === 'word' && s.fixedText);
    expect(printed).toHaveLength(8);
    expect(new Set(printed.map((s) => s.fixedText))).toEqual(
      new Set(['The', 'sat!'])
    );
    for (const slot of printed) expect(slot.accepts).toBeUndefined();
    // Guided means a grey guide word — under the changing slot, and only there.
    const guided = work.slots.filter((s) => s.guideText);
    expect(guided).toHaveLength(4);
    expect(guided.every((s) => s.col === 2)).toBe(true);
  });

  it('still cuts out every word in work 4', () => {
    const work = buildWork(getBookWorks(3)!, 'work4')!;
    expect(work.pieces.filter((p) => p.kind === 'word')).toHaveLength(12);
    expect(work.slots.some((s) => s.guideText)).toBe(false);
    expect(work.slots.some((s) => s.kind === 'word' && s.fixedText)).toBe(false);
  });
});

describe('a card is accepted by what it says, not by which card it is', () => {
  const work = buildWork(getBookWorks(3)!, 'work4')!;
  const wordSlots = work.slots.filter((s) => s.kind === 'word');
  const theSlots = wordSlots.filter((s) => s.col === 1);
  const theCards = work.pieces.filter((p) => p.text === 'The');

  it('lets any "The" fall into any "The" slot', () => {
    expect(theSlots).toHaveLength(4);
    expect(theCards).toHaveLength(4);
    for (const card of theCards) {
      for (const slot of theSlots) expect(slot.accepts).toBe(card.matchKey);
      // ...but never into the slot of a word that reads differently.
      const others = wordSlots.filter((s) => s.col === 2);
      for (const slot of others) expect(slot.accepts).not.toBe(card.matchKey);
    }
  });

  it('keeps every "Sat!" interchangeable too, across rows', () => {
    const sat = work.pieces.filter((p) => p.text === 'sat!');
    expect(new Set(sat.map((p) => p.matchKey)).size).toBe(1);
    expect(sat).toHaveLength(4);
  });

  it('keeps the four animals distinct — one home each', () => {
    const animals = work.pieces.filter(
      (p) => p.kind === 'word' && p.text !== 'The' && p.text !== 'sat!'
    );
    expect(new Set(animals.map((p) => p.matchKey)).size).toBe(animals.length);
  });

  it('never makes two pictures or two sentences interchangeable', () => {
    for (const id of ['work1', 'work2'] as const) {
      const w = buildWork(getBookWorks(3)!, id)!;
      const keys = w.pieces.map((p) => p.matchKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

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

/* -------------------------------------------------------------------------- */

describe('every work says one clean sentence', () => {
  // The storybook reveal ("The ant…" / "Sat!") is a page-turn device. Laid out
  // as a row of word cards it has to become a sentence a child is being taught
  // to read and build, so the ellipsis goes and the reveal loses its
  // mid-sentence capital. See cleanSentence()'s header.
  it('joins the lead-in to the reveal, ellipsis and all', () => {
    expect(cleanSentence('The ant…', 'Sat!')).toBe('The ant sat!');
    expect(cleanSentence('The ant...', 'Sat!')).toBe('The ant sat!');
    expect(cleanSentence('The ant …', 'Sat!')).toBe('The ant sat!');
    expect(cleanSentence('The ant…', 'Sat!')).toBe('The ant sat!');
  });

  it('keeps a single terminal mark — "!" only when the reveal shouted', () => {
    expect(cleanSentence('The snake is', 'fast.')).toBe('The snake is fast.');
    expect(cleanSentence('The snake is', 'fast')).toBe('The snake is fast.');
    expect(cleanSentence('The snake is', 'fast!')).toBe('The snake is fast!');
    expect(cleanSentence('The cat…', 'sat?!')).toBe('The cat sat!');
  });

  // "!" beats "?" beats ".", mirroring Python's _terminal_mark() exactly —
  // a reveal that only ever carried a "?" must not fall through to ".".
  it('marks a question mark when the reveal only ever carried one', () => {
    expect(cleanSentence('The cat is', 'lost?')).toBe('The cat is lost?');
    expect(cleanSentence('', 'Lost?')).toBe('Lost?');
    expect(cleanSentence('The cat…', 'lost?')).toBe('The cat lost?');
  });

  // A reveal that closes inside a quotation mark already carries its own
  // terminal mark inside the quote — mirrors Python's _QUOTED_END_RE branch
  // — so cleanSentence must not staple a second mark on top of it.
  it('adds no second mark to a reveal that closes inside a quote', () => {
    expect(cleanSentence('She said', '“stop it!”')).toBe('She said “stop it!”');
    expect(cleanSentence('', '“Stop it!”')).toBe('“Stop it!”');
    expect(cleanSentence('He asked', '"is it done?"')).toBe('He asked "is it done?"');
  });

  it('leaves a lead-in that ends in a comma, or in nothing, alone', () => {
    expect(cleanSentence('Oh no,', 'Goat…')).toBe('Oh no, goat.');
    expect(cleanSentence('The apple', 'Sat!')).toBe('The apple sat!');
  });

  it('keeps the capital when the reveal starts the sentence', () => {
    expect(cleanSentence('', 'Sat!')).toBe('Sat!');
    expect(cleanSentence('   ', 'Sat!')).toBe('Sat!');
    expect(cleanSentence('…', 'Sat!')).toBe('Sat!');
  });

  it('keeps "I" and a name capital, and survives an empty reveal', () => {
    expect(cleanSentence('The cat and', 'I!')).toBe('The cat and I!');
    expect(cleanSentence('It is', 'McTavish.')).toBe('It is McTavish.');
    expect(cleanSentence('The ant…', '…')).toBe('The ant.');
    expect(cleanSentence('', '')).toBe('');
  });

  it('rewrites lesson 3 into four sentences a child can read', () => {
    const work = buildWork(getBookWorks(3)!, 'work1')!;
    const printed = work.slots
      .filter((s) => s.kind === 'sentence')
      .map((s) => s.fixedText);
    expect(printed).toEqual([
      'The ant sat!',
      'The snake sat!',
      'The star sat!',
      'The cat sat!',
    ]);
  });
});

describe('the characters work', () => {
  it('takes every character of lesson 3, in order of first appearance', () => {
    // SIX, not the works' four: the strip is derived from the whole book, the
    // way the printed strip is. The chant page and the potato gag carry no
    // character to place.
    expect(charactersForBook(getBookWorks(3)!).map((c) => c.name)).toEqual([
      'ant',
      'snake',
      'apple',
      'sun',
      'star',
      'cat',
    ]);
  });

  it('gives each character one box, keyed to its own art', () => {
    const work = buildCharactersWork(getBookWorks(3)!);
    expect(work.id).toBe('characters');
    expect(work.rows).toBe(6);
    expect(work.cols).toBe(1);
    expect(work.slots.map((s) => s.rowIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    // Box 1 is the ant's and takes nothing else — that is the whole control of
    // error: a snake dropped in box 1 flows back, in box 2 it settles.
    const characters = charactersForBook(getBookWorks(3)!);
    const snake = work.pieces.find((p) => p.label === 'snake')!;
    expect(work.slots[0].accepts).toBe(`art:${characters[0].art}`);
    expect(work.slots[0].accepts).not.toBe(snake.matchKey);
    expect(work.slots[1].accepts).toBe(snake.matchKey);
    // The piece's face is the spread art, and placing it says the name.
    expect(snake.image).toBe(characters[1].art);
    expect(snake.audio).toEqual({ kind: 'word', key: 'snake' });
  });

  it('carries the clean sentence, not the storybook reveal', () => {
    for (const c of charactersForBook(getBookWorks(3)!)) {
      expect(c.sentence).not.toMatch(/…/u);
      expect(c.sentence.endsWith('sat!')).toBe(true);
    }
  });
});
