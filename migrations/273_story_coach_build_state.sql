-- =============================================================================
-- 273  STORY COACH BUILD STATE — recoverable session/build handoff
-- Run in the Supabase SQL Editor (idempotent; graceful until run — the feature
-- degrades to "no saved state" if the table is absent).
-- =============================================================================
--
-- The Coach is a build partner. At the end of a build session it must save a
-- STRUCTURED, recoverable handoff — the ordered build list, exactly where we
-- stopped, what's confirmed working, the single next action, and any blockers —
-- so the NEXT session resumes without re-explaining context.
--
-- This is distinct from the Coach's other stores, on purpose:
--   • story_coach_memory  = SEMANTIC facts (1000-char cap, injected every turn).
--   • story_diary_entries = append-only psychological record.
--   • story_coach_log     = raw turn archive (ages out after consolidation).
-- A build handoff is operational + overwritten + read at SESSION START — none of
-- those fit. So it gets its own store, modelled on story_coach_memory:
-- space-scoped, encrypted at rest (AES-256-GCM via diary-crypto), and
-- supersede-on-save (one ACTIVE state per project; older states are kept, marked
-- superseded, never deleted — so a prior handoff can always be recovered).
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_coach_build_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space           text NOT NULL DEFAULT 'tredoux',
  project         text NOT NULL,                 -- plaintext label + supersede key (matched case-insensitively)
  doc_enc         text NOT NULL,                 -- rendered handoff document, AES-256-GCM 'gcm:iv:tag:ct'
  state_enc       text,                          -- raw structured JSON of the capture, AES-256-GCM (for machine reads)
  cipher_version  int  NOT NULL DEFAULT 1,
  superseded_by   uuid,
  superseded_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The session-start read: most recent ACTIVE state for a space, newest-first.
CREATE INDEX IF NOT EXISTS idx_story_coach_build_state_active
  ON story_coach_build_state (space, created_at DESC)
  WHERE superseded_at IS NULL;

-- The supersede lookup: the active row(s) for a space (we match project in JS,
-- case-insensitively, off this small active set).
CREATE INDEX IF NOT EXISTS idx_story_coach_build_state_project
  ON story_coach_build_state (space, project)
  WHERE superseded_at IS NULL;

-- Reuse the personal-platform touch trigger (created in migration 257).
DROP TRIGGER IF EXISTS trg_story_coach_build_state_touch ON story_coach_build_state;
CREATE TRIGGER trg_story_coach_build_state_touch
  BEFORE UPDATE ON story_coach_build_state
  FOR EACH ROW EXECUTE FUNCTION story_personal_touch_updated_at();

-- Same posture as the rest of the personal platform: RLS on, no policies →
-- only the service role (server) can touch it.
ALTER TABLE story_coach_build_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_build_state FORCE ROW LEVEL SECURITY;
