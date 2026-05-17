-- migrations/215_meeting_notes_principal_author.sql
--
-- Extends montree_meeting_notes (migration 214, Session 114) to support
-- principal authors. Until now meeting notes were teacher-only — Session 115
-- adds the principal-side mirror so principals can record their own parent
-- meetings (school-tour follow-ups, complaint resolution, enrolment chats)
-- and optionally share the summary into the existing parent thread system.
--
-- DESIGN CHOICE: extend the existing table rather than fork to a parallel
-- montree_principal_meeting_notes. Reasons:
--   - One source of truth for parent-meeting summaries across the school.
--   - The parent_visible → thread integration logic is identical; one
--     code path beats two.
--   - Cross-row queries (e.g. "every meeting about child X this term")
--     work on one table.
--
-- The CHECK constraint enforces "exactly one of (teacher_id, principal_id)
-- is set" so we never end up with ambiguous authorship.
--
-- Run idempotency: every clause uses IF NOT EXISTS / DROP-and-recreate
-- patterns. Safe to re-run.

BEGIN;

-- ── Step 1: Drop the NOT NULL on teacher_id ───────────────────────────
-- Existing teacher-authored rows are unaffected. Future principal-authored
-- rows will have teacher_id = NULL.
ALTER TABLE montree_meeting_notes
  ALTER COLUMN teacher_id DROP NOT NULL;

-- ── Step 2: Add principal_id ──────────────────────────────────────────
-- FK to montree_school_admins (same pattern as the principal vault from
-- migration 185). ON DELETE CASCADE because if the principal record is
-- removed, their meeting notes go with them.
ALTER TABLE montree_meeting_notes
  ADD COLUMN IF NOT EXISTS principal_id UUID
    REFERENCES montree_school_admins(id) ON DELETE CASCADE;

-- ── Step 3: Exactly-one-author CHECK ──────────────────────────────────
-- The constraint guarantees every row has exactly one author. We drop and
-- recreate so re-runs of this migration don't pile up duplicate constraints.
ALTER TABLE montree_meeting_notes
  DROP CONSTRAINT IF EXISTS meeting_notes_author_check;

ALTER TABLE montree_meeting_notes
  ADD CONSTRAINT meeting_notes_author_check
  CHECK (
    (teacher_id IS NOT NULL AND principal_id IS NULL)
    OR
    (teacher_id IS NULL AND principal_id IS NOT NULL)
  );

-- ── Step 4: Hot-path index for principal queries ──────────────────────
-- Mirrors idx_meeting_notes_teacher. Partial so principal-NULL rows
-- (teacher-authored) don't bloat the index.
CREATE INDEX IF NOT EXISTS idx_meeting_notes_principal
  ON montree_meeting_notes(principal_id, created_at DESC)
  WHERE principal_id IS NOT NULL;

COMMIT;

-- ── Verification queries (run manually after deploy) ─────────────────
-- 1. Confirm the column exists:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'montree_meeting_notes' AND column_name = 'principal_id';
--
-- 2. Confirm teacher_id is nullable:
--    SELECT is_nullable FROM information_schema.columns
--    WHERE table_name = 'montree_meeting_notes' AND column_name = 'teacher_id';
--    -- Expected: YES
--
-- 3. Confirm the CHECK constraint exists:
--    SELECT conname FROM pg_constraint
--    WHERE conrelid = 'montree_meeting_notes'::regclass
--      AND conname = 'meeting_notes_author_check';
--
-- 4. Confirm the index exists:
--    SELECT indexname FROM pg_indexes
--    WHERE tablename = 'montree_meeting_notes'
--      AND indexname = 'idx_meeting_notes_principal';
