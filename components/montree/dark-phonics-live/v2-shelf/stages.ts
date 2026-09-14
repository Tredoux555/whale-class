/**
 * The shelf, in order: book · picture match · sentence & picture · build it ·
 * tracing.
 *
 * Held as data so the strip, the player and the keyboard order can never
 * disagree, and so a new work is one entry rather than a change in three files.
 *
 * 🚨 TWO STAGES WERE TAKEN OFF THE DIGITAL SHELF ON 2026-09-14, and both
 * components are still on disk, unlinked, because the printed material and the
 * tracker still know them:
 *
 *   · 'letter'  the letter card — a lone picture of the pit with the sound
 *               under it. On a real shelf the letter card is the thing the
 *               teacher presents from her hand; on glass it was a page a child
 *               tapped past on the way to the book. LetterCard.tsx stays.
 *   · 'work3'   the GUIDED sentence builder (printed Work 4). Removed at the
 *               owner's word — "the focus is not on these words": it drills the
 *               unchanging frame words, which is not what the letter book is
 *               teaching. DIGITAL ONLY — works.ts still builds work3, the PDFs
 *               still print it, done-signal.ts still maps work3 → Work 4, and
 *               the tracker still names it. Nothing there was touched.
 *
 * Because the pips are numbered by POSITION, they renumber themselves; the
 * labels keep the canonical printed numbering, which is what a grown-up holding
 * the paper is looking for.
 */

import type { WorkId } from '@/lib/montree/dark-phonics/v2-shelf/works';

export type ShelfStage =
  | { key: 'book'; label: string }
  | { key: WorkId; label: string; work: WorkId }
  | { key: 'trace'; label: string };

// RENUMBERED 2026-09-06 per Tredoux: the printed Work 0 "Characters" strip is
// now Work 1 (shown inline inside the 'book' stage above, via CharacterStrip —
// it has no separate SHELF_STAGES entry of its own), so the four digital
// works here — still internally keyed work1..work4, unchanged, to avoid
// rippling the WorkId type through v2-shelf/works.ts — now DISPLAY as Work
// 2-5. See lib/montree/dark-phonics/tracker-works.ts for the canonical
// 1-5 numbering this mirrors.
export const SHELF_STAGES: readonly ShelfStage[] = Object.freeze([
  { key: 'book', label: 'Book' },
  { key: 'work1', label: 'Work 2 · Picture match', work: 'work1' },
  { key: 'work2', label: 'Work 3 · Sentence & picture', work: 'work2' },
  { key: 'work4', label: 'Work 5 · Build it', work: 'work4' },
  { key: 'trace', label: 'Tracing' },
] as const);

export const SHELF_STAGE_COUNT = SHELF_STAGES.length;
