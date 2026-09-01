/**
 * The shelf, in order: letter card · book · four works · tracing.
 *
 * Held as data so the strip, the player and the keyboard order can never
 * disagree, and so a new work is one entry rather than a change in three files.
 */

import type { WorkId } from '@/lib/montree/dark-phonics/v2-shelf/works';

export type ShelfStage =
  | { key: 'letter'; label: string }
  | { key: 'book'; label: string }
  | { key: WorkId; label: string; work: WorkId }
  | { key: 'trace'; label: string };

export const SHELF_STAGES: readonly ShelfStage[] = Object.freeze([
  { key: 'letter', label: 'Letter card' },
  { key: 'book', label: 'Book' },
  { key: 'work1', label: 'Work 1 · Picture match', work: 'work1' },
  { key: 'work2', label: 'Work 2 · Sentence & picture', work: 'work2' },
  { key: 'work3', label: 'Work 3 · Build it (guided)', work: 'work3' },
  { key: 'work4', label: 'Work 4 · Build it', work: 'work4' },
  { key: 'trace', label: 'Tracing' },
] as const);

export const SHELF_STAGE_COUNT = SHELF_STAGES.length;
