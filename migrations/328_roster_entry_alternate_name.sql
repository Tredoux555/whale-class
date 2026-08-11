-- 328_roster_entry_alternate_name.sql
-- Photo Onboarding — remember the OTHER script a child's name was written in.
--
-- WHY THIS EXISTS: a bilingual school writes one child three different ways
-- across three years. This year's list said "Amy 王小美"; the roster had held
-- her as "Amy" since she enrolled. Jaro-Winkler on the whole string fell under
-- the auto-match floor, so the import proposed Amy as a BRAND NEW student and
-- put the real Amy in the departed/archive bucket. One tap of Apply and the
-- class has two Amys, one of them hidden.
--
-- The fix runs in three layers (extractor → reconcile → review screen); this
-- migration is the one storage change it needs. The extractor now splits a
-- dual-script entry into `name` ("Amy") + `alternate_name` ("王小美"), and both
-- are matched against the roster independently. The column carries the second
-- name from extraction through the review screen to the commit route, where a
-- teacher-confirmed match saves it as a classroom alias so NEXT year's list
-- matches on its own.
--
-- Additive and idempotent. Nothing backfills: entries written before this
-- migration keep a NULL alternate_name and behave exactly as they did.
--
-- NOTE ON match_type: the review screen introduces a fourth value, 'possible'
-- (we found a candidate but will not act on it until the teacher confirms).
-- Migration 325 declares match_type as a bare `text` with NO CHECK constraint,
-- so it needs no change here — this note exists so the next person does not go
-- looking for one.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. The second-script name, as written on the list
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE montree_roster_import_entries
  ADD COLUMN IF NOT EXISTS alternate_name text;

COMMENT ON COLUMN montree_roster_import_entries.alternate_name IS
  'The same child''s name in the other script when one list entry carried both '
  '("Amy 王小美" → name_raw "Amy", alternate_name "王小美"). NULL when the list '
  'used a single script. Never invented by the extractor.';
