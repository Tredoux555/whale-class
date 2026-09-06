// lib/montree/dark-phonics/tracker-works.ts
//
// Dark Phonics Tracker — single source of truth for the FIVE renumbered
// manipulative works per letter book, and for what "mastered" means.
//
// RENUMBERING (2026-09-06, per Tredoux): the printed pipeline
// (scripts/curriculum/book-works/build_book_works.py) still emits PDFs named
// <slug>-work0-characters.pdf ... <slug>-work4-sentence-builder-free.pdf —
// those FILENAMES are untouched. This module maps that 0-4 file numbering to
// the new 1-5 numbering a human sees and types everywhere else:
//
//   file "work0-characters"                    -> Work 1  Characters
//   file "work1-picture-match"                 -> Work 2  Picture match
//   file "work2-sentence-picture-match"        -> Work 3  Sentence & picture match
//   file "work3-sentence-builder-guided"+(v2)  -> Work 4  Sentence builder (guided)
//   file "work4-sentence-builder-free"         -> Work 5  Sentence builder (free)
//
// The v1/v2 prints of the guided sentence builder are ONE work (Work 4) —
// v2 is a print variant, not a sixth work.
//
// CANONICAL NAME: every work has one typeable name, `<letter> Dark Phonics
// work <n>`, e.g. "t Dark Phonics work 1". This is the string a teacher or
// the photo-audit flow types/tags; parseWorkName() below reads it back
// forgivingly (case, punctuation, "dp"/"w" abbreviations all accepted).
//
// MASTERY is always derived from which of the 5 canonical work ids
// (`dp:<letter>:<n>`) are marked done for a child — never typed or stored
// directly. See isLetterMastered().
//
// LETTER LIST / SLUGS: mirrors, as of 2026-09-06:
//   - lib/montree/dark-phonics/lessons.ts               (RAW[].books[])
//   - lib/montree/dark-phonics/book-works.ts             (lesson 1, letter s)
//   - lib/montree/dark-phonics/book-works-lessons.ts     (lessons 2-21, letters a..j)
//   - public/dark-phonics-books/works/<slug>/            (which slugs actually
//     have the published 6-PDF work pack — this is what `status` reflects,
//     NOT merely whether digital lesson data exists)
// Hardcoded rather than derived at runtime: the source files above are plain
// data modules without a single indexed "main book per letter" export, and
// several letters (v/w/y/z/qu, and f/l/j's *work pack* specifically) have no
// entry to derive from yet at all. If lessons.ts/book-works-lessons.ts grow a
// canonical per-letter index later, prefer deriving slug/bookTitle from it
// and keep this file's `status` (published-PDF-pack) check as the override.
//
// 🚨 DISCREPANCIES FOUND AGAINST THE ORIGINAL PLAN (verified against the
// filesystem 2026-09-06 — see the handoff report for detail):
//   - a: the live lessons.ts/book-works-lessons.ts slug is `ant-on-my-apple`,
//     NOT `an-apple-for-ant` (that name belongs to an older flashcards-only
//     book_def entry and is not the book this tracker/mastery counts).
//   - f/l/j: the plan listed the-fast/the-lost/the-jump as already-built main
//     books. Their digital lesson data exists, but the 5-work PRINTABLE PACK
//     is NOT published under public/dark-phonics-books/works/ yet — so they
//     are marked 'coming' here, not 'live'.
//   - x: the plan listed x (fox-in-a-box) as "coming" (no built book yet).
//     In fact fox-in-a-box's work pack IS already published at
//     public/dark-phonics-books/works/fox-in-a-box/ — marked 'live' here.
//     (docs/mission-control/brain.json also notes the x/fox-in-a-box slot is
//     still an open decision upstream — flagging, not resolving, here.)

export type WorkShortLabel =
  | 'Characters'
  | 'Picture match'
  | 'Sentence & picture match'
  | 'Sentence builder (guided)'
  | 'Sentence builder (free)';

export interface TrackerWork {
  /** 1-5, the new canonical work number. */
  n: 1 | 2 | 3 | 4 | 5;
  /** Stable id used for storage/matching: `dp:<letter>:<n>`. */
  id: string;
  /** The one canonical typeable name: `<letter> Dark Phonics work <n>`. */
  name: string;
  /** Short pill-style label, e.g. for a UI chip. */
  shortLabel: WorkShortLabel;
}

export interface TrackerLetter {
  letter: string;
  slug: string;
  bookTitle: string;
  /** 'live' = the 5-work PDF pack is published; 'coming' = not yet. */
  status: 'live' | 'coming';
  works: TrackerWork[];
}

const SHORT_LABELS: readonly WorkShortLabel[] = [
  'Characters',
  'Picture match',
  'Sentence & picture match',
  'Sentence builder (guided)',
  'Sentence builder (free)',
] as const;

/** `dp:<letter>:<n>` — the stable id a "done" row is keyed on. */
export function workId(letter: string, n: number): string {
  return `dp:${letter}:${n}`;
}

/** The one canonical typeable name for a work. */
export function workName(letter: string, n: number): string {
  return `${letter} Dark Phonics work ${n}`;
}

function worksFor(letter: string): TrackerWork[] {
  return SHORT_LABELS.map((shortLabel, i) => {
    const n = (i + 1) as TrackerWork['n'];
    return { n, id: workId(letter, n), name: workName(letter, n), shortLabel };
  });
}

/**
 * The letters, in book/teaching order. One MAIN book per letter (the book
 * that counts toward mastery) — second books (the-tall, easy readers) are
 * enrichment and are deliberately not represented here.
 */
export const TRACKER_LETTERS: readonly TrackerLetter[] = [
  { letter: 's', slug: 'snake-in-my-sock', bookTitle: 'Snake in My Sock', status: 'live', works: worksFor('s') },
  { letter: 'a', slug: 'ant-on-my-apple', bookTitle: 'Ant on My Apple', status: 'live', works: worksFor('a') },
  { letter: 't', slug: 'the-sat', bookTitle: 'The ___ Sat!', status: 'live', works: worksFor('t') },
  { letter: 'p', slug: 'the-spat', bookTitle: 'The ___ Spat!', status: 'live', works: worksFor('p') },
  { letter: 'i', slug: 'the-pit', bookTitle: 'The ___ Sat in the Pit!', status: 'live', works: worksFor('i') },
  { letter: 'n', slug: 'the-nap', bookTitle: 'The ___ Naps!', status: 'live', works: worksFor('n') },
  { letter: 'm', slug: 'the-mat', bookTitle: 'The ___ Sat on the Mat!', status: 'live', works: worksFor('m') },
  { letter: 'd', slug: 'the-sad', bookTitle: 'The ___ Is Sad!', status: 'live', works: worksFor('d') },
  { letter: 'g', slug: 'the-dig', bookTitle: 'The ___ Digs!', status: 'live', works: worksFor('g') },
  { letter: 'o', slug: 'the-dog', bookTitle: 'The ___ Has a Dog!', status: 'live', works: worksFor('o') },
  { letter: 'c', slug: 'the-cot', bookTitle: 'The ___ Sat in a Cot!', status: 'live', works: worksFor('c') },
  { letter: 'k', slug: 'the-kit', bookTitle: 'The ___ Has a Kit!', status: 'live', works: worksFor('k') },
  { letter: 'ck', slug: 'the-cat-sat', bookTitle: 'The Cat Sat', status: 'live', works: worksFor('ck') },
  { letter: 'e', slug: 'the-egg', bookTitle: 'The ___ Has an Egg!', status: 'live', works: worksFor('e') },
  { letter: 'u', slug: 'the-mud', bookTitle: 'The ___ Is in the Mud!', status: 'live', works: worksFor('u') },
  { letter: 'r', slug: 'the-rat', bookTitle: 'The ___ Chased the Rat!', status: 'live', works: worksFor('r') },
  { letter: 'h', slug: 'the-hot', bookTitle: 'The ___ Is Hot!', status: 'live', works: worksFor('h') },
  { letter: 'b', slug: 'the-bug', bookTitle: 'The ___ Saw a Bug!', status: 'live', works: worksFor('b') },
  // f/l/j — digital lesson data exists (book-works-lessons.ts lessons 19-21)
  // but the printable work pack is not yet published. See discrepancy note
  // above the export.
  { letter: 'f', slug: 'the-fast', bookTitle: 'Fast!', status: 'coming', works: worksFor('f') },
  { letter: 'l', slug: 'the-lost', bookTitle: 'Lost!', status: 'coming', works: worksFor('l') },
  { letter: 'j', slug: 'the-jump', bookTitle: 'Jump!', status: 'coming', works: worksFor('j') },
  // Not built yet at all (no lessons.ts books[] entry, no book-works-lessons.ts
  // digital lesson). Slugs per Tredoux's plan; bookTitle is a placeholder
  // until the book is written (the-vest's art is mid-pipeline per
  // docs/mission-control/brain.json; the-swim/the-yam/the-zip/the-quilt have
  // not started).
  { letter: 'v', slug: 'the-vest', bookTitle: 'The ___ (not yet built)', status: 'coming', works: worksFor('v') },
  { letter: 'w', slug: 'the-swim', bookTitle: 'The ___ (not yet built)', status: 'coming', works: worksFor('w') },
  { letter: 'y', slug: 'the-yam', bookTitle: 'The ___ (not yet built)', status: 'coming', works: worksFor('y') },
  { letter: 'z', slug: 'the-zip', bookTitle: 'The ___ (not yet built)', status: 'coming', works: worksFor('z') },
  { letter: 'qu', slug: 'the-quilt', bookTitle: 'The ___ (not yet built)', status: 'coming', works: worksFor('qu') },
  // x — EXCEPTION to the plan: fox-in-a-box's work pack is already published.
  // See discrepancy note above the export.
  { letter: 'x', slug: 'fox-in-a-box', bookTitle: 'Fox in a Box', status: 'live', works: worksFor('x') },
];

const LETTER_BY_CODE = new Map(TRACKER_LETTERS.map((l) => [l.letter, l]));
const VALID_LETTERS = new Set(TRACKER_LETTERS.map((l) => l.letter));

/**
 * Forgiving parse of a typed/tagged work name back into { letter, n }.
 * Case-insensitive; ignores punctuation, hyphens and extra spacing; accepts
 * the canonical "<letter> Dark Phonics work <n>" as well as "dp work",
 * "work" or bare "w" abbreviations ("t dp work 1", "t work 1", "t w1",
 * "T-Work-1"). Returns null for anything that doesn't resolve to one of
 * TRACKER_LETTERS and a work number 1-5.
 */
export function parseWorkName(input: string): { letter: string; n: number } | null {
  if (typeof input !== 'string') return null;

  let norm = input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!norm) return null;

  // Drop filler words. Order matters: "dark phonics" before bare "dp" so
  // "t dark phonics work 1" doesn't need a separate "dp" pass to also match.
  norm = norm.replace(/\bdark\s*phonics\b/g, ' ');
  norm = norm.replace(/\bdp\b/g, ' ');
  norm = norm.replace(/\s+/g, ' ').trim();

  const m = /^([a-z]{1,2})\s*w(?:ork)?\s*([0-9]+)$/.exec(norm);
  if (!m) return null;

  const letter = m[1];
  const n = Number(m[2]);
  if (!VALID_LETTERS.has(letter)) return null;
  if (!(n >= 1 && n <= 5)) return null;

  return { letter, n };
}

/** Convenience wrapper over parseWorkName() for callers that only need the letter. */
export function letterFromWorkName(input: string): string | null {
  return parseWorkName(input)?.letter ?? null;
}

/**
 * The montree_child_progress status that counts as "this work is done" for
 * curriculum-driven mastery (see masteryFromProgress()). One line to flip if
 * the product decision changes from requiring full mastery to requiring only
 * a presentation, e.g. 'presented'.
 */
export const REQUIRED_STATUS: 'not_started' | 'presented' | 'practicing' | 'mastered' = 'mastered';

const STATUS_RANK: Record<string, number> = {
  not_started: 0,
  presented: 1,
  practicing: 2,
  mastered: 3,
};

/**
 * Derives per-letter mastery from raw montree_child_progress rows
 * ({ work_name, status }), the SAME table/shape every other curriculum work
 * is tracked in. `work_name` is read through parseWorkName() first, so rows
 * typed sloppily ("t work 1", "T-Work-1", "t w1", ...) still count instead of
 * being silently dropped — only rows that don't resolve to a known
 * TRACKER_LETTERS work at all are ignored.
 *
 * A letter is:
 *   'mastered'     — all 5 of its works have reached REQUIRED_STATUS.
 *   'in-progress'  — at least one matching row exists but not all 5 have.
 *   'not-started'  — no matching row exists for any of its 5 works.
 *
 * Every letter in TRACKER_LETTERS is present in the result (defaulting to
 * 'not-started'), 'live' and 'coming' alike — a 'coming' letter simply has no
 * rows to find yet.
 */
export function masteryFromProgress(
  rows: { work_name: string; status: string }[]
): Record<string, 'mastered' | 'in-progress' | 'not-started'> {
  const requiredRank = STATUS_RANK[REQUIRED_STATUS] ?? STATUS_RANK.mastered;

  const touchedByLetter = new Map<string, Set<number>>();
  const doneByLetter = new Map<string, Set<number>>();

  for (const row of rows) {
    const parsed = parseWorkName(row.work_name);
    if (!parsed) continue; // doesn't resolve to any known work — ignored, not thrown
    const { letter, n } = parsed;

    if (!touchedByLetter.has(letter)) touchedByLetter.set(letter, new Set());
    touchedByLetter.get(letter)!.add(n);

    const rank = STATUS_RANK[row.status] ?? -1; // unrecognised status counts as not-done
    if (rank >= requiredRank) {
      if (!doneByLetter.has(letter)) doneByLetter.set(letter, new Set());
      doneByLetter.get(letter)!.add(n);
    }
  }

  const result: Record<string, 'mastered' | 'in-progress' | 'not-started'> = {};
  for (const def of TRACKER_LETTERS) {
    const doneCount = doneByLetter.get(def.letter)?.size ?? 0;
    const touchedCount = touchedByLetter.get(def.letter)?.size ?? 0;
    if (doneCount >= 5) result[def.letter] = 'mastered';
    else if (touchedCount > 0) result[def.letter] = 'in-progress';
    else result[def.letter] = 'not-started';
  }
  return result;
}

/** True when all 5 of a letter's works are in `doneIds`. Unknown letters are never mastered. */
export function isLetterMastered(doneIds: Set<string>, letter: string): boolean {
  const def = LETTER_BY_CODE.get(letter);
  if (!def) return false;
  return def.works.every((w) => doneIds.has(w.id));
}

/**
 * The next letter a child should work on: the first letter in book order
 * that is not yet mastered. Live letters are offered before 'coming' ones
 * (there's nothing to hand out for a letter with no published pack yet).
 * Returns null once every letter (including 'coming' ones) is mastered.
 */
export function nextLetter(doneIds: Set<string>): string | null {
  const live = TRACKER_LETTERS.filter((l) => l.status === 'live');
  const firstUnmastered = (letters: readonly TrackerLetter[]) =>
    letters.find((l) => !isLetterMastered(doneIds, l.letter))?.letter ?? null;

  return firstUnmastered(live) ?? firstUnmastered(TRACKER_LETTERS);
}
