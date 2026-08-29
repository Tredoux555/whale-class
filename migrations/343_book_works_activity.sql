-- ---------------------------------------------------------------------------
-- 343. Book Works — Lesson 1 joins the live activity layer
-- ---------------------------------------------------------------------------
-- Migration 342 widened montree_class_live_state.activity_type to the full
-- 8-tray Writing Shelf. This adds ONE more value, 'book-works': the first
-- online Dark Phonics lesson, taught before a child can decode anything, built
-- out of the "Snake in My Sock" letter book instead of out of words.
--
-- activity_state (jsonb) needs no change — the book activity's cursor fields
-- (step, round, qIndex, marks, matched, drop) ride in the same object and are
-- validated by the live-state route.
--
-- Purely additive: every existing value is preserved. Idempotent, one
-- transaction, safe to re-run.

BEGIN;

ALTER TABLE montree_class_live_state
  DROP CONSTRAINT IF EXISTS montree_class_live_state_activity_type_check;

ALTER TABLE montree_class_live_state
  ADD CONSTRAINT montree_class_live_state_activity_type_check
  CHECK (activity_type IN (
    'none',
    'sound-boxes', 'word-builder', 'word-chains', 'dictation',
    'sentence-builder', 'story-books', 'authors-chair', 'grammar-symbols',
    'book-works'
  ));

COMMENT ON COLUMN montree_class_live_state.activity_type IS
  'Activity currently on the live stage; ''none'' = normal lesson slides. Writing Shelf trays 1-8: sound-boxes | word-builder | word-chains | dictation | sentence-builder | story-books | authors-chair | grammar-symbols. Plus ''book-works'' — the Lesson 1 letter-book activity (migration 343), which is NOT a shelf tray.';

COMMIT;
