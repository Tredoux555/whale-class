-- migrations/214_meeting_notes.sql
--
-- Teacher-side parent-meeting notes. Mirror of the principal vault concept
-- (Session 87 + migration 185) but with a simpler trust model:
--   - Plain text in the DB (no client-side encryption). Visible to the
--     teacher that recorded it, scoped via teacher_id + school_id filters
--     on every query.
--   - Optional parent_visible flag — when true, the summary can be shared
--     into the existing parent thread (montree_message_threads system from
--     Session 97). Off by default.
--   - Audio NEVER persisted — same pipeline as the principal vault. Whisper
--     receives the bytes, returns a transcript, audio Blob is discarded.
--     Only the transcript + summary land here.
--
-- AUDIT trail of the design decision: we considered using the same
-- per-record AES-GCM encryption as the principal vault, but teachers
-- don't have a single confidant relationship with these notes — they may
-- want to share excerpts with the parent or with the principal verbally,
-- and the password-on-every-unlock UX adds friction. Plain text in the
-- DB matches the trust model already in place for teacher notes
-- (montree_teacher_notes) and weekly observation entries.
--
-- Run idempotency: every clause uses IF NOT EXISTS / OR REPLACE. Safe to
-- re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authorship + scoping. teacher_id + school_id are the cross-pollination
  -- guard; every API query filters on both. classroom_id is nullable
  -- because a teacher might attend a meeting with a child from another
  -- classroom in the same school.
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,

  -- Optional child link. Stored two ways:
  --   child_id — FK, set when the meeting is about a specific child.
  --   child_name — free-text fallback for meetings not tied to a child row
  --                (e.g. visiting prospective family, group consult).
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  child_name TEXT,

  meeting_date DATE,

  -- Sonnet's 3-paragraph summary, in the teacher's locale.
  summary TEXT NOT NULL,

  -- Whisper transcript. Optional — a teacher may choose to save the summary
  -- only (delete the transcript before save). Capped 30k chars by route.
  transcript TEXT,

  -- Teacher-added free notes. Things the teacher wants to remember that
  -- weren't in the audio (the parent's body language, follow-up commitments
  -- jotted down after, action items).
  notes TEXT,

  duration_seconds INTEGER,
  locale TEXT DEFAULT 'en',

  -- Share posture.
  --   parent_visible = false (default): private to teacher + principal.
  --   parent_visible = true: an explicit toggle the teacher flipped. When
  --     true, the route may have posted the summary into the existing
  --     parent thread (shared_to_thread_id then points at the thread).
  --   shared_to_thread_id: NOT NULL only after a successful share. Used to
  --     prevent double-sharing if the user toggles twice.
  parent_visible BOOLEAN NOT NULL DEFAULT FALSE,
  shared_to_thread_id UUID REFERENCES montree_message_threads(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: list a teacher's recent meetings.
CREATE INDEX IF NOT EXISTS idx_meeting_notes_teacher
  ON montree_meeting_notes(teacher_id, created_at DESC);

-- Per-child history (when a teacher wants to see every meeting about Amy).
CREATE INDEX IF NOT EXISTS idx_meeting_notes_child
  ON montree_meeting_notes(child_id, created_at DESC)
  WHERE child_id IS NOT NULL;

-- Per-school (future principal-side aggregation view).
CREATE INDEX IF NOT EXISTS idx_meeting_notes_school
  ON montree_meeting_notes(school_id, created_at DESC);

-- updated_at auto-bump trigger.
CREATE OR REPLACE FUNCTION update_meeting_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meeting_notes_updated_at ON montree_meeting_notes;
CREATE TRIGGER trg_meeting_notes_updated_at
  BEFORE UPDATE ON montree_meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_meeting_notes_updated_at();

COMMIT;
