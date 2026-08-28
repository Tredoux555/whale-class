-- ---------------------------------------------------------------------------
-- 341. Writing Shelf live activities — digitised trays 1–4 in Dark Phonics Live
-- ---------------------------------------------------------------------------
-- The live classroom's sync row (montree_class_live_state, migration 334 §5d)
-- gains an ACTIVITY layer: the teacher can put one of the Writing Shelf trays
-- on the stage instead of the lesson slides. Same transport as everything
-- else — teacher PATCHes, parent polls every ~2s. No new tables.
--
--   activity_type   which tray is on the stage; 'none' = normal lesson slides.
--                   Values mirror the physical shelf: tray 1 sound-boxes,
--                   tray 2 word-builder (movable alphabet), tray 3 word-chains,
--                   tray 4 dictation.
--   activity_state  the tray's cursor, one flat jsonb object validated by the
--                   route: { wordIndex, step, revealed, sayNonce } — all
--                   numbers/bools. Content itself (word lists) is derived
--                   client-side from the lesson RAW data on both surfaces;
--                   only the cursor travels, exactly like the slide cursor.
--
-- Idempotent: safe to re-run.

ALTER TABLE montree_class_live_state
  ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'none';

ALTER TABLE montree_class_live_state
  ADD COLUMN IF NOT EXISTS activity_state jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'montree_class_live_state_activity_type_check'
  ) THEN
    ALTER TABLE montree_class_live_state
      ADD CONSTRAINT montree_class_live_state_activity_type_check
      CHECK (activity_type IN ('none', 'sound-boxes', 'word-builder', 'word-chains', 'dictation'));
  END IF;
END $$;

COMMENT ON COLUMN montree_class_live_state.activity_type IS
  'Writing Shelf tray currently on the live stage; ''none'' = normal lesson slides. sound-boxes | word-builder | word-chains | dictation (trays 1–4).';
COMMENT ON COLUMN montree_class_live_state.activity_state IS
  'Cursor for the active tray: { wordIndex, step, revealed, sayNonce }. Word lists are derived from the lesson data on both clients; only this cursor syncs.';
