-- ---------------------------------------------------------------------------
-- 342. Writing Shelf — full shelf (trays 5–8 join the live activity layer)
-- ---------------------------------------------------------------------------
-- Migration 341 added activity_type/activity_state with a CHECK covering
-- shelf 1 (trays 1–4). This widens the CHECK to the complete 8-tray shelf:
-- sentence-builder, story-books, authors-chair, grammar-symbols.
-- activity_state (jsonb) needs no change — the new trays' cursor fields
-- (laid, punct, order, marks, text) ride in the same object, validated by
-- the live-state route.
--
-- Idempotent: safe to re-run.

ALTER TABLE montree_class_live_state
  DROP CONSTRAINT IF EXISTS montree_class_live_state_activity_type_check;

ALTER TABLE montree_class_live_state
  ADD CONSTRAINT montree_class_live_state_activity_type_check
  CHECK (activity_type IN (
    'none',
    'sound-boxes', 'word-builder', 'word-chains', 'dictation',
    'sentence-builder', 'story-books', 'authors-chair', 'grammar-symbols'
  ));

COMMENT ON COLUMN montree_class_live_state.activity_type IS
  'Writing Shelf tray currently on the live stage; ''none'' = normal lesson slides. Trays 1-8: sound-boxes | word-builder | word-chains | dictation | sentence-builder | story-books | authors-chair | grammar-symbols.';
