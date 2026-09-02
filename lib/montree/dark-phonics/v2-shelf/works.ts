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
 *   work3  Sentence Builder — guided     ONLY THE WORD THAT CHANGES between the
 *          (…-work3-…)                   rows is a card; the words every row
 *                                        shares stay printed on the sheet. Each
 *                                        cut slot carries a faint GREY guide
 *                                        word, which a correct card covers
 *                                        exactly. Picture column empty.
 *   work4  Sentence Builder — free       every word is a card, and no guides —
 *          (…-work4-…)                   but two cards reading the same word
 *                                        are interchangeable (see `matchKey`).
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

import {
  splitBookLine,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';

export type WorkId = 'work1' | 'work2' | 'work3' | 'work4';

/**
 * Every work this module can build, including the preliminary Characters work
 * that accompanies the Book stage. It is not one of the four printed works and
 * has no number on the shelf strip, so it is deliberately outside `WorkId`.
 */
export type AnyWorkId = WorkId | 'characters';

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
   * of a matching pair, work 3's static words.
   */
  fixedText?: string;
  /** The grey guide word behind a work-3 slot. Covered exactly when correct. */
  guideText?: string;
  /**
   * The match key this slot accepts, or undefined when nothing drops here
   * (a printed cell). A piece is accepted when its own `matchKey` is equal —
   * BY VALUE, NOT BY IDENTITY. See `matchKey` on WorkPiece.
   */
  accepts?: string;
}

/** One cut-out card. Every piece has exactly one home slot. */
export interface WorkPiece {
  id: string;
  kind: CellKind;
  /** Where it CAME FROM: the canonical home the control card draws it in. */
  slotId: string;
  /**
   * What this card IS, normalised — the word/sentence with case and presentation
   * punctuation dropped, or the picture's art path.
   *
   * 🚨 THE CHILD MATCHES MEANING, NOT IDENTITY. Two cards reading "The" are the
   * same card to a five-year-old, and telling one it may not lay its "The" in a
   * "The" slot teaches nothing about reading — only about card ids. So a slot
   * accepts any piece whose key equals its own, and a card's home for the
   * control card and completion is whichever equal slot it landed in. Pictures
   * and sentences get keys too, so the rule is one rule; they simply never
   * collide, because no two rows share art or a sentence.
   */
  matchKey: string;
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
  id: AnyWorkId;
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

/* -------------------------------------------------------------------------- */
/* One clean sentence per row                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A spread's printed line, rebuilt as ONE GRAMMATICAL SENTENCE.
 *
 * 🚨 THE WORKS ARE NOT THE BOOK. On the page, "The ant…" / "Sat!" is a
 * storybook reveal: the ellipsis holds the page turn and the shout lands on the
 * next breath. Laid out as a row of word cards it stops being a reveal and
 * becomes a sentence a child is being asked to READ AND BUILD — and
 * "The ant… Sat!" is not a sentence, it is two fragments and a capital letter
 * in the middle of a clause. The teacher's rule (2026-09-02): we are teaching
 * correct grammar, so no work anywhere shows an ellipsis and no reveal word
 * keeps its mid-sentence capital.
 *
 * THE RULE, and it is the whole rule — mirror it exactly on the Python side
 * (scripts/curriculum/book-works/build_book_works.py) if the printed works are
 * ever rebuilt from it:
 *
 *   1. take the lead-in (`nar`) and drop any trailing ellipsis, "…" or "...",
 *      with the whitespace around it;
 *   2. join it to the reveal word with a single space;
 *   3. lower-case the reveal's first letter — UNLESS the reveal starts the
 *      sentence (the lead-in is empty), or it is the pronoun "I", or it is a
 *      proper noun;
 *   4. end with exactly ONE terminal mark, in priority order: "!" when the
 *      reveal's trailing punctuation run carried one, else "?" when it
 *      carried one, otherwise ".".
 *
 * "The ant…" + "Sat!" → "The ant sat!".  "" + "Sat!" → "Sat!".
 * "Oh no," + "goat…" → "Oh no, goat."
 *
 * PROPER NOUNS. These books never put one in the reveal slot — the reveal is
 * always the taught word (a verb, an adjective, a common noun) — so rather than
 * guess with a dictionary, the only names kept capital are the ones a
 * lower-case pass would visibly damage: "I", and any word carrying a capital
 * of its own past the first letter ("McTavish", "iPad"). If a book ever does
 * shout a name, add it here rather than teaching the rule to guess.
 *
 * QUOTE-CLOSING REVEALS. A reveal that closes inside a quotation mark
 * ("...it!”") already carries its terminal mark INSIDE the quote — mirrors
 * Python's `_QUOTED_END_RE` branch — so no second mark is appended on top.
 */
/** "!" beats "?" beats "." — the reveal's own trailing punctuation decides. */
function terminalMark(text: string): '!' | '?' | '.' {
  const run = /[.!?]+$/u.exec(text)?.[0] ?? '';
  if (run.includes('!')) return '!';
  if (run.includes('?')) return '?';
  return '.';
}

/** True when `text` ends on a terminal mark closed inside a quotation. */
function endsQuoted(text: string): boolean {
  return /[.!?][”"'’]\s*$/u.test(text);
}

export function cleanSentence(lead: string, reveal: string): string {
  const nar = lead.replace(/\s*(?:…|\.\.\.)\s*$/u, '').trim();
  const raw = reveal.trim();
  if (endsQuoted(raw)) {
    // The mark is already inside the quote — keep the reveal exactly as it
    // stands, only deciding case the same way the plain branch below does.
    const keepCase = !nar || raw[0] === 'I' || /[A-Z]/u.test(raw.slice(1));
    const shown = keepCase ? raw : raw[0].toLowerCase() + raw.slice(1);
    return nar ? `${nar} ${shown}` : shown;
  }
  const mark = terminalMark(raw);
  // Strip every terminal mark the reveal was carrying: the sentence gets
  // exactly one, decided above.
  const word = raw.replace(/[.?!…]+$/u, '').replace(/\.\.\.$/u, '').trim();
  if (!word) return nar ? `${nar}${mark}` : '';
  const keepCase = !nar || word === 'I' || /[A-Z]/u.test(word.slice(1));
  const shown = keepCase ? word : word[0].toLowerCase() + word.slice(1);
  const body = nar ? `${nar} ${shown}` : shown;
  return `${body}${mark}`;
}

/** The clean sentence for one cast card / book line. */
function cleanCardSentence(sentence: string, art: string): string {
  const { lead, shout } = splitBookLine({ art, sentence });
  return cleanSentence(lead, shout);
}

/** The book's four cast spreads, in book order. See deviation 1 above. */
function workRows(lesson: BookWorksLesson): WorkRow[] {
  return lesson.cast.map((card) => ({
    key: card.id,
    text: cleanCardSentence(card.sentence, card.image),
    art: card.image,
    label: card.label,
  }));
}

/** A sentence's word cards, exactly as the paper cuts them: split on spaces. */
function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Sameness                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A word (or sentence) reduced to what a child would call "the same word":
 * lower case, without the presentation punctuation the book leans on — the
 * ellipsis that holds a page turn, the shout's exclamation mark, the full stop.
 *
 * "The" / "the", "Sat!" / "sat" and "ant…" / "ant" are one word each. A token
 * that is nothing BUT punctuation keeps its raw form, so two of them never
 * become interchangeable by both reducing to "".
 */
export function wordKey(text: string): string {
  const key = text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']+/g, '');
  return key || text.toLowerCase();
}

/** A picture's key: its art, which no two rows of a book share. */
function pictureKey(art: string): string {
  return `art:${art}`;
}

/**
 * Which word columns CHANGE from row to row.
 *
 * The four rows of a book work are the same sentence with one thing swapped —
 * "The ant… Sat!", "The snake… Sat!". Work 3 is about that swap, so only the
 * changing column is cut out; "The" and "Sat!" stay printed on the sheet, the
 * way a Montessori material holds everything constant but the one variable.
 *
 * Derived, never listed: a column is static when every row has a word there and
 * all of them share a `wordKey`. Any other column changes — including one where
 * some rows simply run out of words. More than one column may change (lesson 13
 * changes several), and that is fine: they all move.
 *
 * EDGE CASE: rows that are identical all the way across would make every column
 * static and leave the child nothing to do, so in that case everything moves —
 * a degenerate work is still a completable one.
 */
export function changingWordColumns(sentences: string[]): boolean[] {
  const toks = sentences.map(words);
  const n = toks.reduce((m, t) => Math.max(m, t.length), 0);
  const changing: boolean[] = [];
  for (let j = 0; j < n; j++) {
    const keys = toks.map((t) => (j < t.length ? wordKey(t[j]) : null));
    changing.push(!keys.every((k) => k !== null && k === keys[0]));
  }
  return changing.some(Boolean) ? changing : changing.map(() => true);
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
    slots.push({
      id: picSlot,
      rowIndex: i,
      col: 0,
      kind: 'picture',
      accepts: pictureKey(row.art),
    });
    pieces.push({
      id: `${id}-p-${row.key}`,
      kind: 'picture',
      slotId: picSlot,
      matchKey: pictureKey(row.art),
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
      accepts: sentenceMoves ? wordKey(row.text) : undefined,
    });
    if (sentenceMoves) {
      pieces.push({
        id: `${id}-s-${row.key}`,
        kind: 'sentence',
        slotId: textSlot,
        matchKey: wordKey(row.text),
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
  // Work 3 cuts out ONLY the words that change; work 4 cuts out all of them.
  const changing = guided
    ? changingWordColumns(rows.map((r) => r.text))
    : null;
  const slots: WorkSlot[] = [];
  const pieces: WorkPiece[] = [];

  rows.forEach((row, i) => {
    const picSlot = `${id}-r${i}-pic`;
    slots.push({
      id: picSlot,
      rowIndex: i,
      col: 0,
      kind: 'picture',
      accepts: pictureKey(row.art),
    });
    pieces.push({
      id: `${id}-p-${row.key}`,
      kind: 'picture',
      slotId: picSlot,
      matchKey: pictureKey(row.art),
      label: row.label,
      image: row.art,
      audio: { kind: 'sentence', key: row.text },
    });

    words(row.text).forEach((word, j) => {
      const slotId = `${id}-r${i}-w${j}`;
      const moves = !changing || changing[j];
      slots.push({
        id: slotId,
        rowIndex: i,
        col: j + 1,
        kind: 'word',
        // Static words are PRINTED, exactly as the row spells them — the sheet
        // already says "The … Sat!" and only the swap is a card.
        fixedText: moves ? undefined : word,
        guideText: moves && guided ? word : undefined,
        accepts: moves ? wordKey(word) : undefined,
      });
      if (!moves) return;
      pieces.push({
        id: `${id}-w-${row.key}-${j}`,
        kind: 'word',
        slotId,
        matchKey: wordKey(word),
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
      ? 'Put each changing word back in its sentence.'
      : 'Build every sentence — any matching word fits.',
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

/* -------------------------------------------------------------------------- */
/* The preliminary work: Characters                                            */
/* -------------------------------------------------------------------------- */

/** One character of the book — a figure the child drops into its own box. */
export interface BookCharacter {
  /** The cast card's id. */
  id: string;
  /** Spoken name — "ant". */
  name: string;
  /** The spread this character first appears on; also the piece's face. */
  art: string;
  /** That spread's clean sentence, for the control card and the read-aloud. */
  sentence: string;
}

/**
 * The book's characters, IN ORDER OF FIRST APPEARANCE.
 *
 * The physical material is a strip of blank bordered boxes standing to the left
 * of the book, one box per character, top to bottom; the child reads a page
 * with the teacher and drops that character into the next box down. So the
 * order is the book's own reading order — and a character who appears twice
 * gets ONE box, because there is one of them.
 *
 * 🚨 IT WALKS THE WHOLE BOOK, NOT THE WORKS' FOUR ROWS. The printed strip is
 * derived from EVERY spread of the book, de-duplicated by art path — the-sat
 * has six characters (ant · snake · apple · sun · star · cat), of which the
 * works only take four (deviation 1 at the top of this file: four rows is what
 * a tablet can set legibly). The strip is not a work sheet and has no such
 * limit, so it must match the paper: six figures, six boxes.
 *
 * WHICH SPREADS CARRY A CHARACTER is the reveal-spread rule the tracing
 * workbook already ports from `hero_word()`: a spread names a character when it
 * has a lead-in and its reveal does not trail off. That excludes the chant page
 * ("Sat! Sat! Sat!" — no lead-in, and its art is a cast member already counted)
 * and the potato gag ("And the…?!" — the line IS the sentence, and the figure
 * on it is the joke, not a character to place).
 *
 * THE NAME comes from the lead-in's last word ("The ant…" → "ant"), which is
 * exactly what the paper prints on the control side; the cast list supplies it
 * instead wherever it has that art, so a name the curriculum authored always
 * wins over one derived.
 */
export function charactersForBook(lesson: BookWorksLesson): BookCharacter[] {
  const byArt = new Map(lesson.cast.map((c) => [c.image, c]));
  const out: BookCharacter[] = [];
  const seen = new Set<string>();
  for (const page of lesson.pages) {
    if (!page.art || seen.has(page.art)) continue;
    const { lead, shout } = splitBookLine(page);
    // No lead-in: the chant, or an opening scene-setter. Not a character page.
    if (!lead.trim()) continue;
    // Trails off: the line is the whole sentence — the potato gag.
    if (shout.includes('…') || shout.includes('...')) continue;
    const card = byArt.get(page.art);
    const name = card?.label ?? leadNoun(lead);
    if (!name) continue;
    seen.add(page.art);
    out.push({
      id: card?.id ?? name,
      name,
      art: page.art,
      sentence: cleanSentence(lead, shout),
    });
  }
  return out;
}

/** "The ant…" → "ant": the noun the lead-in ends on, bare. */
function leadNoun(lead: string): string {
  const tail = lead
    .replace(/\s*(?:…|\.\.\.)\s*$/u, '')
    .trim()
    .split(/\s+/u)
    .pop();
  return (tail ?? '').replace(/[^A-Za-z'-]/gu, '').toLowerCase();
}

/**
 * The Characters work, as a one-column WorkSpec.
 *
 * 🚨 IT IS A WORK, NOT A SECOND KIND OF THING. One column of picture slots and
 * one picture piece per slot is exactly the shape MatchWork already drives, so
 * the strip gets the same measured geometry, the same settle, the same
 * flow-back and the same control card for free — and a fix to the drag is a fix
 * here too. Only the frame around it differs: this one stands beside the open
 * book instead of owning the stage.
 */
export function buildCharactersWork(lesson: BookWorksLesson): WorkSpec {
  const cast = charactersForBook(lesson);
  const slots: WorkSlot[] = [];
  const pieces: WorkPiece[] = [];

  cast.forEach((character, i) => {
    const slotId = `characters-r${i}-pic`;
    slots.push({
      id: slotId,
      rowIndex: i,
      col: 0,
      kind: 'picture',
      accepts: pictureKey(character.art),
    });
    pieces.push({
      id: `characters-p-${character.id}`,
      kind: 'picture',
      slotId,
      matchKey: pictureKey(character.art),
      label: character.name,
      image: character.art,
      // The reward for placing a character is HEARING THEM NAMED — the same
      // same-to-same reward the physical tray gives, one per page.
      audio: { kind: 'word', key: character.name },
    });
  });

  return {
    id: 'characters',
    n: 0,
    title: 'Characters',
    instruction: 'Read a page, then put that character in the next box.',
    rows: Math.max(1, cast.length),
    cols: 1,
    colWeights: [1],
    slots,
    pieces: seededShuffle(pieces, lesson.lessonNumber * 31 + 5),
  };
}
