-- migrations/356_tracker_the_pat.sql
--
-- Letter P's tracker book is the-pat, not the-spat (2026-09-12).
--
-- The digital shelf's letter-P book was swapped from `the-spat`
-- ("The ___ Spat!") to `the-pat` ("The ___ Can Pat!") in lessons.ts and
-- book-works-lessons.ts, but lib/montree/dark-phonics/tracker-works.ts kept
-- the old slug/title. That title is what migration 344's seed
-- (montree_seed_dark_phonics_works) wrote into
-- montree_classroom_curriculum_works.description for the five dp:p:* works,
-- so the tracker dashboard shows letter P as "The ___ Spat!" while the child
-- actually does "The ___ Can Pat!".
--
-- TRACKER_LETTERS is now fixed, and migration 344's hardcoded VALUES list has
-- been regenerated in place (per its own instruction: re-run
-- scripts/curriculum/book-works/emit_tracker_seed_sql.ts and paste a fresh
-- VALUES block whenever TRACKER_LETTERS changes), so any FUTURE classroom
-- seeded by montree_seed_dark_phonics_works() gets the right description.
--
-- This migration fixes the rows ALREADY seeded in every existing classroom.
--
-- EXACTLY 5 work_keys are stale — dp:p:1 .. dp:p:5. Nothing else in the 344
-- seed referenced the-spat (name, work_key and sequence are unchanged; only
-- the "<shortLabel> — <book title>" description carried the title). No other
-- table stores the book title: montree_class_dark_phonics_week stores only a
-- letter code, and montree_child_progress stores work_name
-- ("p Dark Phonics work N"), which is unchanged.
--
-- Run this by hand. IDEMPOTENT — safe to re-run (the WHERE clauses match the
-- stale text only).

BEGIN;

UPDATE montree_classroom_curriculum_works
   SET description = 'Characters — The ___ Can Pat!'
 WHERE work_key = 'dp:p:1'
   AND description = 'Characters — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Picture match — The ___ Can Pat!'
 WHERE work_key = 'dp:p:2'
   AND description = 'Picture match — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Sentence & picture match — The ___ Can Pat!'
 WHERE work_key = 'dp:p:3'
   AND description = 'Sentence & picture match — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Sentence builder (guided) — The ___ Can Pat!'
 WHERE work_key = 'dp:p:4'
   AND description = 'Sentence builder (guided) — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Sentence builder (free) — The ___ Can Pat!'
 WHERE work_key = 'dp:p:5'
   AND description = 'Sentence builder (free) — The ___ Spat!';

COMMIT;

-- Verify (expect 0 rows):
--   SELECT classroom_id, work_key, description
--     FROM montree_classroom_curriculum_works
--    WHERE work_key LIKE 'dp:p:%' AND description LIKE '%Spat%';
