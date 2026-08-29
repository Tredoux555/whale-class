-- ---------------------------------------------------------------------------
-- 343 ROLLBACK — remove 'book-works' from the activity_type CHECK
-- ---------------------------------------------------------------------------
-- Restores migration 342's constraint exactly. Run this ONLY after confirming
-- no live-state row still carries activity_type = 'book-works' — the ALTER
-- below is rejected while one does. The SELECT tells you; the UPDATE parks any
-- stragglers back on the lesson slides (harmless: it only ends that class's
-- book activity, no lesson data lives in this column).
--
--   SELECT appointment_id FROM montree_class_live_state WHERE activity_type = 'book-works';
--   UPDATE montree_class_live_state SET activity_type = 'none' WHERE activity_type = 'book-works';

BEGIN;

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

COMMIT;
