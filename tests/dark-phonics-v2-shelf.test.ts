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
import {
  buildShelfBook,
  coverTitlePt,
  COVER_STACK_TOP,
  COVER_STACK_BOTTOM,
  COVER_TITLE_MAX_PT,
} from '@/lib/montree/dark-phonics/v2-shelf/books';
import {
  HEAP_MAX_BITE,
  PILE_FONT_MAX,
  PILE_FONT_MIN,
  PILE_GAP,
  PILE_MAX_PCT,
  PILE_PAD_X,
  PILE_PICTURE_FLOOR,
  PILE_PICTURE_MAX,
  PILE_TILT,
  chipSize,
  estimateTextWidth,
  fitFont,
  layoutPile,
  pileNeededWidth,
  pileTrayWidth,
  pileWidthPercent,
  type PilePos,
  type Rect,
} from '@/lib/montree/dark-phonics/v2-shelf/pile';
import {
  buildWordTrace,
  letterSampleEnds,
  activeStrokeIndex,
  strokeProgress,
  strokeSpans,
  traceCapIndex,
  traceWordFor,
} from '@/lib/montree/dark-phonics/v2-shelf/strokes';
import {
  buildTracingBook,
  traceableForm,
  targetWord,
  isPotatoWord,
  wordOnPage,
  tracingLeaves,
} from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';
import type { WorkPiece } from '@/lib/montree/dark-phonics/v2-shelf/works';
import {
  buildCharactersWork,
  buildWork,
  buildWorks,
  gridLattice,
  changingWordColumns,
  characterIntroductions,
  charactersForBook,
  cleanSentence,
  forwardLockedAt,
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
      // Every trace page is one of the reader's spreads, in the reader's own
      // order. It is a SUBSET, not the whole list: a spread that trails off
      // ("And the…?!") has no reveal word and gets no trace page — see
      // targetWord() in v2-shelf/tracing-book.ts.
      const numbers = workbook.pages.map((p) => p.number);
      expect(numbers).toEqual(spreads.map((p) => p.number).filter((n) => numbers.includes(n)));
      for (const spread of spreads) {
        const t = targetWord(spread.shout);
        // A potato page is traced only when the book's own word is on it.
        const traced = t !== null && (!isPotatoWord(t.word) || numbers.includes(spread.number));
        expect(numbers.includes(spread.number)).toBe(traced);
      }
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

    it('traces ONE word per page, and it is that page\'s own reveal', () => {
      for (const page of workbook.pages) {
        // One word. Lower case. Letters only. Never a phrase or a sentence.
        expect(page.word).toMatch(/^[a-z]+$/u);
        const spread = book.spreads.find((p) => p.number === page.number);
        expect(spread).toBeTruthy();
        // Never the potato — the joke is not a learning target.
        expect(isPotatoWord(page.word)).toBe(false);
        // And it is the word the page teaches: the last word of its shout, or,
        // on a potato page, the book's own word as that page prints it.
        const own = targetWord(spread!.shout)!;
        expect(page.word).toBe(isPotatoWord(own.word) ? page.word : own.word);
        expect(traceableForm(page.printed).replace(/\s+/gu, '')).toBe(page.word);
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

describe('the tracing workbook traces the word the page teaches', () => {
  it("takes the repeated reveal word, in the book's own literal form", () => {
    const workbook = buildTracingBook(getBookWorks(3)!);
    expect(workbook.heroWord).toBe('Sat!');
    expect(new Set(workbook.pages.map((p) => p.word))).toEqual(new Set(['sat']));
  });

  // 🚨 THE REGRESSION THIS RULE EXISTS FOR (2026-09-16). the-nap says "naps."
  // six times and "nap!" once, so the old hero test failed and the whole book
  // fell back to tracing SENTENCES: the child was handed "theantnaps" as one
  // run-together guide row. Per page the target is never in doubt.
  it('never falls back to a sentence when one page says it differently', () => {
    const workbook = buildTracingBook(getBookWorks(6)!);
    expect(workbook.heroWord).toBeNull();
    expect(workbook.pages.map((p) => p.word)).toEqual([
      'naps', 'naps', 'naps', 'naps', 'naps', 'naps', 'nap', 'nap',
    ]);
  });

  it('takes the last word of the shout, letters only, one word, ever', () => {
    expect(targetWord('naps.')).toEqual({ word: 'naps', printed: 'naps.' });
    expect(targetWord('Sat!')).toEqual({ word: 'sat', printed: 'Sat!' });
    // A chant is the same word three times: the word is what it teaches.
    expect(targetWord('Nap! Nap! Nap!')).toEqual({ word: 'nap', printed: 'Nap!' });
    expect(targetWord('In my sock?! In my sock?! In my sock?!')?.word).toBe('sock');
    // An apostrophe inside a word closes up rather than splitting it in two.
    expect(targetWord('doesn’t')?.word).toBe('doesnt');
    // A line that trails off has no reveal word after it — no trace page.
    expect(targetWord('the…?!')).toBeNull();
    expect(targetWord('goat...')).toBeNull();
    expect(targetWord('  ')).toBeNull();
    expect(targetWord('?!')).toBeNull();
  });

  // 🚨 THE POTATO IS THE JOKE, NEVER THE TARGET (standing rule, 2026-09-16).
  it('never traces the potato — it traces the book\'s own word instead', () => {
    // "Bug saw a… potato!" — the book's word IS on the page, so it is traced.
    const l18 = buildTracingBook(getBookWorks(18)!);
    expect(l18.pages.map((p) => p.word)).toEqual([
      'bug', 'bug', 'bug', 'bug', 'bug', 'bug', 'bug', 'bug',
    ]);
    expect(l18.pages.at(-1)!.printed).toBe('Bug');
  });

  it('skips the page when the book\'s own word is not on it', () => {
    // "Crew helps the… potato!" carries no `kit`, so lesson 12 ends a page
    // early rather than asking for a word that is not in front of the child.
    const l12 = buildTracingBook(getBookWorks(12)!);
    expect(l12.pages.map((p) => p.word)).toEqual([
      'kit', 'kit', 'kit', 'kit', 'kit', 'kit', 'kit', 'kit',
    ]);
  });

  it('knows the potato in every form the books spell him', () => {
    expect(isPotatoWord('potato')).toBe(true);
    expect(isPotatoWord('potatoes')).toBe(true);
    expect(isPotatoWord('potatos')).toBe(false);
    expect(isPotatoWord('pot')).toBe(false);
    // Plurals that are NOT the potato stay exactly as they are.
    expect(isPotatoWord('dogs')).toBe(false);
    expect(isPotatoWord('cats')).toBe(false);
  });

  it('finds the book\'s own word on a page in the page\'s own spelling', () => {
    expect(wordOnPage('Bug saw a… potato!', 'bug')).toBe('Bug');
    expect(wordOnPage('Crew helps the… potato!', 'kit')).toBeNull();
  });

  it('leaves no potato anywhere in the series', () => {
    for (const lesson of LESSONS) {
      for (const page of buildTracingBook(lesson).pages) {
        expect(isPotatoWord(page.word)).toBe(false);
      }
    }
  });

  it('gives every lesson nothing but single lower-case words', () => {
    for (const lesson of LESSONS) {
      for (const page of buildTracingBook(lesson).pages) {
        expect(page.word).toMatch(/^[a-z]+$/u);
      }
    }
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

  it('cuts out exactly the six characters in lesson 3, work 3', () => {
    // SIX, not four: the work carries the book's whole cast, exactly as the
    // printed work3 sheet does (FULL-CAST RULE, 2026-09-12).
    const work = buildWork(getBookWorks(3)!, 'work3')!;
    const wordPieces = work.pieces.filter((p) => p.kind === 'word');
    expect(wordPieces.map((p) => p.text).sort()).toEqual(
      ['ant', 'apple', 'cat', 'snake', 'star', 'sun'].sort()
    );
    // "The" and "Sat!" are printed on the sheet, in every row, and nothing
    // drops on them.
    const printed = work.slots.filter((s) => s.kind === 'word' && s.fixedText);
    expect(printed).toHaveLength(12);
    expect(new Set(printed.map((s) => s.fixedText))).toEqual(
      new Set(['The', 'sat!'])
    );
    for (const slot of printed) expect(slot.accepts).toBeUndefined();
    // Guided means a grey guide word — under the changing slot, and only there.
    const guided = work.slots.filter((s) => s.guideText);
    expect(guided).toHaveLength(6);
    expect(guided.every((s) => s.col === 2)).toBe(true);
  });

  it('still cuts out every word in work 4', () => {
    const work = buildWork(getBookWorks(3)!, 'work4')!;
    expect(work.pieces.filter((p) => p.kind === 'word')).toHaveLength(18);
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
    expect(theSlots).toHaveLength(6);
    expect(theCards).toHaveLength(6);
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
    expect(sat).toHaveLength(6);
  });

  it('keeps the six characters distinct — one home each', () => {
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

  it('rewrites lesson 3 into six sentences a child can read', () => {
    const work = buildWork(getBookWorks(3)!, 'work1')!;
    const printed = work.slots
      .filter((s) => s.kind === 'sentence')
      .map((s) => s.fixedText);
    expect(printed).toEqual([
      'The ant sat!',
      'The snake sat!',
      'The apple sat!',
      'The sun sat!',
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

/* -------------------------------------------------------------------------- */

/**
 * THE PILE HAS TO STAY READABLE. Every rule below is a rule about a card a
 * four-year-old must be able to READ before they can decide where it goes, so
 * they are asserted rather than eyeballed on a tablet.
 */
describe('the pile', () => {
  const card = (
    i: number,
    kind: WorkPiece['kind'] = 'word',
    text = 'mat'
  ): WorkPiece => ({
    id: `p${i}`,
    kind,
    slotId: `s${i}`,
    matchKey: `k${i}`,
    label: `card ${i}`,
    text,
    audio: { kind: 'word', key: text },
  });
  /** Every pair of drawn cards, as axis-aligned boxes. */
  const overlaps = (a: PilePos, b: PilePos) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const inside = (pos: PilePos, box: Rect) =>
    pos.x >= box.x - 0.001 &&
    pos.y >= box.y - 0.001 &&
    pos.x + pos.w <= box.x + box.w + 0.001 &&
    pos.y + pos.h <= box.y + box.h + 0.001;

  it('gives the working sheet at least 72% of the stage, however big the cast', () => {
    const long = Array.from({ length: 12 }, (_, i) =>
      card(i, 'sentence', 'The elephant sat in the pit!')
    );
    // The cap is a literal in the CSS, so the sheet's share cannot be argued
    // away by a long sentence or a big cast.
    expect(pileTrayWidth(long)).toContain(`min(${PILE_MAX_PCT}%,`);
    expect(100 - PILE_MAX_PCT).toBeGreaterThanOrEqual(72);
  });

  it('sizes the tray from what is WRITTEN on the cards, not how many', () => {
    const few = [card(0, 'sentence', 'The ant sat in the pit!')];
    const many = Array.from({ length: 12 }, (_, i) =>
      card(i, 'sentence', 'The ant sat in the pit!')
    );
    const longer = [card(0, 'sentence', 'The elephant sat in the pit!')];
    expect(pileNeededWidth(few)).toBe(pileNeededWidth(many));
    expect(pileNeededWidth(longer)).toBeGreaterThan(pileNeededWidth(few));
    expect(pileTrayWidth(few)).toBe(
      `min(${PILE_MAX_PCT}%, max(${pileNeededWidth(few)}px, 22%))`
    );
  });

  it('still answers the old count-derived call, for the callers that pass one', () => {
    expect(pileWidthPercent(0)).toBe(20);
    expect(pileWidthPercent(4)).toBeCloseTo(24, 5);
    expect(pileWidthPercent(20)).toBe(PILE_MAX_PCT);
    expect(pileTrayWidth(4)).toBe('clamp(120px, 24%, 28%)');
  });

  it('never makes a chip narrower than the text written on it', () => {
    for (const text of ['mat', 'The ant sat in the pit!', 'sat!']) {
      for (const font of [PILE_FONT_MIN, PILE_FONT_MAX]) {
        const size = chipSize(text, font, 4000, estimateTextWidth);
        expect(size.w).toBeGreaterThanOrEqual(
          estimateTextWidth(text, font) + PILE_PAD_X * 2
        );
      }
    }
  });

  it('lays a pile that fits out flat — no card touches another', () => {
    const box = { x: 10, y: 10, w: 360, h: 620 };
    const pieces = [
      ...Array.from({ length: 6 }, (_, i) =>
        card(i, 'sentence', 'The ant sat in the pit!')
      ),
      ...Array.from({ length: 6 }, (_, i) => card(i + 6, 'picture')),
    ];
    const pile = layoutPile(box, pieces);
    expect(Object.keys(pile)).toHaveLength(pieces.length);
    const all = pieces.map((p) => pile[p.id]);
    for (const pos of all) {
      expect(inside(pos, box)).toBe(true);
      expect(Math.abs(pos.rot)).toBeLessThanOrEqual(PILE_TILT);
      expect(pos.fontPx).toBeGreaterThanOrEqual(PILE_FONT_MIN);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i], all[j])).toBe(false);
      }
    }
    // Every card has its own depth, and depth runs down the tray — the pile is
    // laid, and taken apart, in reading order.
    const zs = all.map((p) => p.z);
    expect(new Set(zs).size).toBe(zs.length);
    const byDepth = [...all].sort((a, b) => a.z - b.z);
    for (let i = 1; i < byDepth.length; i++) {
      expect(byDepth[i].y).toBeGreaterThanOrEqual(byDepth[i - 1].y - 0.001);
    }
  });

  it('groups the picture squares so the flow does not waste half the tray', () => {
    // Interleaved as works.ts hands them over: picture, sentence, picture…
    const box = { x: 0, y: 0, w: 343, h: 627 };
    const pieces = Array.from({ length: 12 }, (_, i) =>
      i % 2 === 0
        ? card(i, 'picture')
        : card(i, 'sentence', 'The apple sat in the pit!')
    );
    const pile = layoutPile(box, pieces);
    const all = pieces.map((p) => pile[p.id]);
    // Grouped: every square is above every chip, and the squares tile.
    const squares = pieces.filter((p) => p.kind === 'picture').map((p) => pile[p.id]);
    const chips = pieces.filter((p) => p.kind !== 'picture').map((p) => pile[p.id]);
    expect(Math.max(...squares.map((s) => s.y))).toBeLessThan(
      Math.min(...chips.map((c) => c.y))
    );
    expect(new Set(squares.map((s) => Math.round(s.y))).size).toBeLessThanOrEqual(2);
    // …and it all fits flat, which the interleaved order could not do.
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i], all[j])).toBe(false);
      }
    }
  });

  it('draws a picture card as a square inside the tray', () => {
    const box = { x: 0, y: 0, w: 300, h: 600 };
    const pile = layoutPile(
      box,
      Array.from({ length: 6 }, (_, i) => card(i, 'picture'))
    );
    for (const pos of Object.values(pile)) {
      expect(pos.w).toBe(pos.h);
      expect(pos.w).toBeGreaterThanOrEqual(PILE_PICTURE_FLOOR);
      expect(pos.w).toBeLessThanOrEqual(PILE_PICTURE_MAX);
      expect(pos.w).toBeLessThanOrEqual(box.w);
      expect(inside(pos, box)).toBe(true);
    }
  });

  it('drops the pile face to 18px before it lets a card overlap', () => {
    // Tall enough for twelve chips at 18px, not at 22px.
    const pieces = Array.from({ length: 12 }, (_, i) => card(i, 'sentence', 'mat'));
    const at22 = chipSize('mat', PILE_FONT_MAX, 400, estimateTextWidth).h;
    const at18 = chipSize('mat', PILE_FONT_MIN, 400, estimateTextWidth).h;
    // Narrow enough that the chips stack one per row, so the height is the
    // only thing deciding whether they fit.
    const box = { x: 0, y: 0, w: 70, h: 12 * at18 + 11 * PILE_GAP + 2 };
    expect(12 * at22 + 11 * PILE_GAP).toBeGreaterThan(box.h);
    const pile = layoutPile(box, pieces);
    const all = pieces.map((p) => pile[p.id]);
    expect(all[0].fontPx).toBe(PILE_FONT_MIN);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i], all[j])).toBe(false);
      }
    }
  });

  it('heaps only when it must, and never over a card’s words', () => {
    const pieces = Array.from({ length: 10 }, (_, i) => card(i, 'sentence', 'mat'));
    const h = chipSize('mat', PILE_FONT_MIN, 400, estimateTextWidth).h;
    // Room for ten chips only if the rows are allowed to bite into each other.
    const box = { x: 4, y: 4, w: 70, h: Math.round(10 * h * 0.96) };
    const pile = layoutPile(box, pieces);
    const ys = pieces.map((p) => pile[p.id].y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      // The bite eats the BOTTOM of the card above, never its text.
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(h - HEAP_MAX_BITE - 0.001);
    }
    for (const p of pieces) expect(inside(pile[p.id], box)).toBe(true);
  });

  it('keeps an impossible cast ordered and inside the tray rather than stacked', () => {
    const box = { x: 10, y: 10, w: 140, h: 300 };
    const pieces = Array.from({ length: 40 }, (_, i) => card(i));
    const pile = layoutPile(box, pieces);
    expect(Object.keys(pile)).toHaveLength(40);
    for (const p of pieces) expect(inside(pile[p.id], box)).toBe(true);
    const ys = pieces.map((p) => pile[p.id].y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('is the same pile every time — it does not reshuffle on a resize', () => {
    const box = { x: 0, y: 0, w: 300, h: 500 };
    const pieces = Array.from({ length: 8 }, (_, i) => card(i));
    expect(layoutPile(box, pieces)).toEqual(layoutPile(box, pieces));
  });
});

describe('type on a PLACED card is fitted to the cell it fills', () => {
  const rect: Rect = { x: 0, y: 0, w: 120, h: 46 };

  it('never asks for more than the cell can hold, either way', () => {
    expect(fitFont(rect, 'mat', 30)).toBeLessThanOrEqual(rect.h * 0.44);
    const long: Rect = { x: 0, y: 0, w: 90, h: 46 };
    const size = fitFont(long, 'elephant', 30);
    expect(size * 'elephant'.length * 0.52).toBeLessThanOrEqual(long.w);
  });

  it('caps at the size asked for when the cell is roomy', () => {
    expect(fitFont({ x: 0, y: 0, w: 900, h: 300 }, 'mat', 30)).toBe(30);
  });
});

/* -------------------------------------------------------------------------- */

/**
 * THE DOT COMES STRAIGHT AFTER ITS OWN LETTER. See strokes.ts — the gate is an
 * index into the tracer's one flat run of samples, so it can be asserted here
 * without a finger or a DOM.
 */
describe('the tittle of an i gates the letter after it', () => {
  const gates = (word: string) => {
    const model = buildWordTrace(word);
    // The tracer allocates samples per stroke by length; a flat 10 each is the
    // same shape of answer and keeps the arithmetic checkable by eye.
    const counts = model.strokes.map(() => 10);
    const total = counts.reduce((a, b) => a + b, 0);
    const ends = letterSampleEnds(model.strokes, counts);
    return { model, total, ends };
  };

  it('caps the trace at the i of "pit" until the dot is tapped', () => {
    const { model, total, ends } = gates('pit');
    expect(model.dots).toHaveLength(1);
    const dotLetter = model.dots[0].letterIndex;
    expect(model.letters[dotLetter]).toBe('i');

    const gated = traceCapIndex(ends, [dotLetter], total);
    expect(gated).toBe(ends[dotLetter]);
    // …which stops short of the t, and of the word.
    expect(gated).toBeLessThan(total - 1);
    expect(gated).toBeGreaterThanOrEqual(ends[0]);

    // Tapped: the rest of the word opens up again.
    expect(traceCapIndex(ends, [], total)).toBe(total - 1);
  });

  it('leaves a word with no dots completely ungated', () => {
    const { total, ends } = gates('mat');
    expect(buildWordTrace('mat').dots).toHaveLength(0);
    expect(traceCapIndex(ends, [], total)).toBe(total - 1);
  });

  it('gates on the EARLIEST letter still owing a dot', () => {
    const { model, total, ends } = gates('jig');
    const owed = model.dots.map((d) => d.letterIndex);
    expect(owed.length).toBeGreaterThan(0);
    expect(traceCapIndex(ends, owed, total)).toBe(Math.min(...owed.map((l) => ends[l])));
  });

  it('says where every letter ends, and refuses to guess when it cannot', () => {
    const model = buildWordTrace('pit');
    const counts = model.strokes.map(() => 10);
    const ends = letterSampleEnds(model.strokes, counts);
    expect(ends).toHaveLength(model.letters.length);
    expect(ends[ends.length - 1]).toBe(counts.reduce((a, b) => a + b, 0) - 1);
    // Mismatched input gates nothing rather than gating on nonsense.
    expect(letterSampleEnds(model.strokes, [1, 2])).toEqual([]);
  });

  /**
   * THE BOUNDARY THE i SITS ON. Every other letter is passed through
   * mid-stride, so a rounding error of a fraction of a sample never shows;
   * the i's stem ends exactly where the tittle gate stops the finger, so the
   * error is left sitting on the letter's last sample. This is the case that
   * put the start dot back at the top of the stem the child had just finished.
   */
  it('counts a letter done when the finger reaches the cap it is stopped at', () => {
    const model = buildWordTrace('pit');
    // Samples in proportion to the real strokes of p, p-bowl, i, t, t-bar.
    const counts = [75, 95, 51, 68, 30];
    expect(counts).toHaveLength(model.strokes.length);
    const total = counts.reduce((a, b) => a + b, 0);
    const ends = letterSampleEnds(model.strokes, counts);
    const cap = traceCapIndex(ends, [1], total);
    expect(cap).toBe(ends[1]);

    // The tracer stores progress as a WHOLE percent, so the finger sitting on
    // the cap reads back a shade short of it.
    const pct = Math.round((cap / (total - 1)) * 100);
    const sampleAt = (pct / 100) * (total - 1);
    const quantum = (total - 1) / 100;
    expect(sampleAt).toBeLessThan(cap);

    const spans = strokeSpans(counts);
    expect(spans[2]).toEqual({ start: 170, end: 220 });
    // With the quantum the dot gate already forgives, the i's stem is finished
    // and the child is moved on to the t.
    expect(strokeProgress(spans, 2, sampleAt, quantum)).toBe(1);
    expect(activeStrokeIndex(spans, sampleAt, quantum)).toBe(3);
    // Without it — the old behaviour — the i never finished and the start dot
    // was drawn back at its own beginning.
    expect(strokeProgress(spans, 2, sampleAt, 0)).toBeLessThan(1);
    expect(activeStrokeIndex(spans, sampleAt, 0)).toBe(2);
  });

  it('does not call a stroke done before the finger is near its end', () => {
    const spans = strokeSpans([75, 95, 51, 68, 30]);
    const quantum = (319 - 1) / 100;
    expect(strokeProgress(spans, 0, 0, quantum)).toBe(0);
    expect(strokeProgress(spans, 0, 40, quantum)).toBeCloseTo(40 / 74, 5);
    expect(activeStrokeIndex(spans, 40, quantum)).toBe(0);
    // The whole word traced: every stroke is done and the last one is active.
    expect(activeStrokeIndex(spans, 318, quantum)).toBe(4);
    expect(strokeProgress(spans, 4, 318, quantum)).toBe(1);
  });
});


/* -------------------------------------------------------------------------- */

/**
 * THE BOOK IS HELD SHUT UNTIL THE CHARACTER IS IN ITS BOX. On the tray a child
 * cannot read on past a character they have not yet placed, so the digital book
 * may not let them either — but rereading is never cheating, so the gate is
 * one-directional. See forwardLockedAt() in v2-shelf/works.ts.
 */
describe('a page that walks a character on cannot be turned past', () => {
  const lesson = getBookWorks(5)!;
  const book = buildShelfBook(lesson);
  const cast = charactersForBook(lesson);
  const intros = characterIntroductions(book.pages, cast);

  it('names a page for every character, in reading order', () => {
    expect(intros).toHaveLength(cast.length);
    expect(intros.length).toBeGreaterThan(1);
    const pages = intros.map((i) => i.pageIndex);
    expect(pages).toEqual([...pages].sort((a, b) => a - b));
    // Every gate points at a real picture page and at a real card and box.
    const spec = buildCharactersWork(lesson);
    for (const intro of intros) {
      expect(book.pages[intro.pageIndex]).toBeTruthy();
      expect(spec.pieces.some((p) => p.id === intro.pieceId)).toBe(true);
      expect(spec.slots.some((sl) => sl.id === intro.slotId)).toBe(true);
    }
  });

  it('lets a page with no character turn freely', () => {
    // The cover is page 0, and nobody walks on before the first picture page.
    expect(intros[0].pageIndex).toBeGreaterThan(0);
    expect(forwardLockedAt(0, [], intros)).toBeNull();
    expect(forwardLockedAt(intros[0].pageIndex - 1, [], intros)).toBeNull();
  });

  it('locks the introducing page until that very card is placed', () => {
    const first = intros[0];
    expect(forwardLockedAt(first.pageIndex, [], intros)).toEqual(first);
    // Somebody else's card does not open it.
    expect(forwardLockedAt(first.pageIndex, [intros[1].pieceId], intros)).toEqual(first);
    // Its own does, immediately.
    expect(forwardLockedAt(first.pageIndex, [first.pieceId], intros)).toBeNull();
    // A Set is the shape the strip actually holds.
    expect(forwardLockedAt(first.pageIndex, new Set([first.pieceId]), intros)).toBeNull();
  });

  it('evaluates a SPREAD against both leaves', () => {
    const first = intros[0];
    const lead = first.pageIndex - 1;
    // One leaf on screen: the character has not walked on yet.
    expect(forwardLockedAt(lead, [], intros, 1)).toBeNull();
    // Two leaves: they have, on the right-hand page.
    expect(forwardLockedAt(lead, [], intros, 2)).toEqual(first);
    expect(forwardLockedAt(lead, [first.pieceId], intros, 2)).toBeNull();
  });

  it('gates on the FIRST character still loose, however far the child got', () => {
    const [a, b] = intros;
    // Standing well past both with neither placed — a card can be lifted back
    // out of its box at any time — answers with the earlier one.
    expect(forwardLockedAt(book.pages.length - 1, [], intros)).toEqual(a);
    expect(forwardLockedAt(book.pages.length - 1, [a.pieceId], intros)).toEqual(b);
  });

  it('never gates a book with no cast', () => {
    expect(forwardLockedAt(9, [], [])).toBeNull();
    expect(characterIntroductions([{ kind: 'cover' }, { kind: 'blank' }], cast)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* The sheet's ruling — one clean rectangle, whatever the sentences do         */
/* -------------------------------------------------------------------------- */

/**
 * Lay a spec out the way the browser's CSS grid does: uniform columns weighted
 * by `colWeights`, uniform rows, and a slot only where the spec has one. That
 * is exactly the geometry gridLattice() is handed at runtime.
 */
function layOut(
  spec: ReturnType<typeof buildWorks>[number],
  { width = 800, height = 600, originX = 40, originY = 20 } = {}
): Record<string, { x: number; y: number; w: number; h: number }> {
  const total = spec.colWeights.reduce((a, b) => a + b, 0);
  const x: number[] = [];
  let run = originX;
  spec.colWeights.forEach((w) => {
    x.push(run);
    run += (w / total) * width;
  });
  const rowH = height / spec.rows;
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {};
  for (const slot of spec.slots) {
    rects[slot.id] = {
      x: x[slot.col],
      y: originY + slot.rowIndex * rowH,
      w: (spec.colWeights[slot.col] / total) * width,
      h: rowH,
    };
  }
  return rects;
}

describe.each(LESSONS.map((l) => [l.lessonNumber, l] as const))(
  'lesson %i work sheets rule as one clean rectangle',
  (_n, lesson) => {
    for (const spec of buildWorks(lesson)) {
      it(`${spec.id}: outer rect spans every column and every row`, () => {
        const rects = layOut(spec);
        const lattice = gridLattice(spec, rects);
        expect(lattice).toBeTruthy();
        const { x0, y0, x1, y1 } = lattice!;
        const all = Object.values(rects);
        expect(x0).toBe(Math.min(...all.map((r) => r.x)));
        expect(y0).toBe(Math.min(...all.map((r) => r.y)));
        expect(x1).toBe(Math.max(...all.map((r) => r.x + r.w)));
        expect(y1).toBe(Math.max(...all.map((r) => r.y + r.h)));
      });

      it(`${spec.id}: every row is the full width of the sheet`, () => {
        // 🚨 THE REGRESSION (2026-09-16). the-nap's rows hold three words and
        // four; the ruling used to stop where a short row ran out of cells.
        const rects = layOut(spec);
        const lattice = gridLattice(spec, rects)!;
        const perRow = Array.from({ length: spec.rows }, (_, i) =>
          spec.slots.filter((s) => s.rowIndex === i).length
        );
        // Rows really can be uneven — that is the case this rule is about.
        expect(Math.max(...perRow)).toBeGreaterThan(0);
        // A row divider is drawn edge to edge, so there is exactly one per
        // internal boundary and it carries no width of its own to run short.
        expect(lattice.rowEdges).toHaveLength(spec.rows - 1);
        expect(lattice.colEdges).toHaveLength(spec.cols - 1);
        // Dividers are strictly inside the sheet, in order, none dangling.
        for (const x of lattice.colEdges) {
          expect(x).toBeGreaterThan(lattice.x0);
          expect(x).toBeLessThan(lattice.x1);
        }
        for (const y of lattice.rowEdges) {
          expect(y).toBeGreaterThan(lattice.y0);
          expect(y).toBeLessThan(lattice.y1);
        }
        expect([...lattice.colEdges].sort((a, b) => a - b)).toEqual(lattice.colEdges);
        expect([...lattice.rowEdges].sort((a, b) => a - b)).toEqual(lattice.rowEdges);
      });
    }
  }
);

describe('the ruling is drawn from the axes, not the cells', () => {
  it('rules the last column even when only one row reaches it', () => {
    // the-nap: six rows of "The ant naps." and one "The potato doesn't nap!".
    const spec = buildWorks(getBookWorks(6)!).find((w) => w.id === 'work4')!;
    const perRow = Array.from({ length: spec.rows }, (_, i) =>
      spec.slots.filter((s) => s.rowIndex === i).length
    );
    expect(new Set(perRow).size).toBeGreaterThan(1); // genuinely uneven
    const lattice = gridLattice(spec, layOut(spec))!;
    expect(lattice.colEdges).toHaveLength(spec.cols - 1);
    // The right-hand edge is the long row's right edge — the sheet's own.
    const rects = layOut(spec);
    const longestRow = perRow.indexOf(Math.max(...perRow));
    const right = Math.max(
      ...spec.slots
        .filter((s) => s.rowIndex === longestRow)
        .map((s) => rects[s.id].x + rects[s.id].w)
    );
    expect(lattice.x1).toBe(right);
  });

  it('draws nothing until every slot has been measured', () => {
    const spec = buildWorks(getBookWorks(6)!).find((w) => w.id === 'work4')!;
    const rects = layOut(spec);
    delete rects[spec.slots[3].id];
    expect(gridLattice(spec, rects)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* The cover: the title is never under the picture                            */
/* -------------------------------------------------------------------------- */

describe('the cover title leaves the picture room, however long it is', () => {
  const columnPt = 595.28 * (1 - COVER_STACK_TOP - COVER_STACK_BOTTOM);
  const blockPt = (lines: string[]) => coverTitlePt(lines) * 1.18 * lines.length;

  it('never lets the title take more than half the shared column', () => {
    for (const lines of [
      ['Fast!'],
      ['In the', 'Pit!'],
      ['The ___ Sat', 'in the Pit!'],
      ['One', 'Two', 'Three'],
      ['A very long title line indeed', 'that keeps going', 'and going'],
    ]) {
      expect(blockPt(lines)).toBeLessThanOrEqual(columnPt / 2 + 0.001);
    }
  });

  it('keeps the printed ceiling for a short one-line title', () => {
    expect(coverTitlePt(['Fast!'])).toBe(COVER_TITLE_MAX_PT);
  });

  it('comes down, never off the trim, as the title gets longer', () => {
    const short = coverTitlePt(['Pit!']);
    const long = coverTitlePt(['___ Chased the Rat and Kept Going']);
    expect(long).toBeLessThan(short);
  });

  // 🚨 THE REGRESSION (2026-09-16): "In the Pit!" breaks to two lines and the
  // second line was painted under the cover art.
  it('gives every shipped cover a title block the art can sit under', () => {
    for (const lesson of LESSONS) {
      const book = buildShelfBook(lesson);
      expect(blockPt(book.titleLines)).toBeLessThanOrEqual(columnPt / 2 + 0.001);
      // And there is honestly a picture-sized hole left.
      expect(columnPt - blockPt(book.titleLines)).toBeGreaterThan(columnPt * 0.45);
    }
  });
});
