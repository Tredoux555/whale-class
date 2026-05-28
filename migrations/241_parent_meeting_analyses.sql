-- migrations/241_parent_meeting_analyses.sql
-- Ultimate Tracy Phase B (May 28, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
--
-- PURPOSE
--   Structured Sonnet analysis of every transcribed meeting:
--   chief-of-staff summary + parent revelations + commitments + emotional
--   arc + triggers observed + moves that landed + unresolved threads +
--   recommended follow-up + profile-update proposals (reviewed by
--   principal before they hit montree_parent_profiles).
--
--   corpus_extractions is Phase C's pickup point — the abstraction job
--   reads from here.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meeting_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meeting_id UUID NOT NULL REFERENCES montree_parent_meetings(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- The chief-of-staff summary (3 short paragraphs, markdown).
  summary_markdown TEXT NOT NULL,

  -- Structured extractions.
  parent_revealed TEXT[] NOT NULL DEFAULT '{}',
  commitments_made TEXT[] NOT NULL DEFAULT '{}',
  emotional_arc TEXT NOT NULL DEFAULT '',
  triggers_observed TEXT[] NOT NULL DEFAULT '{}',
  moves_that_landed TEXT[] NOT NULL DEFAULT '{}',
  unresolved_threads TEXT[] NOT NULL DEFAULT '{}',
  recommended_follow_up TEXT NOT NULL DEFAULT '',

  -- Profile-update proposals. Principal reviews + approves on the UI
  -- BEFORE these touch the live profile (Phase A locked decision #5).
  -- Shape: { field_name: { current, proposed, reason } }
  profile_update_proposals JSONB NOT NULL DEFAULT '{}',
  proposals_reviewed_at TIMESTAMPTZ,
  proposals_review_outcome TEXT
    CHECK (proposals_review_outcome IN ('approved_all', 'approved_some', 'dismissed_all', 'edited')),

  -- Phase C corpus extraction picks up rows where corpus_extracted_at IS NULL.
  corpus_extractions TEXT[] NOT NULL DEFAULT '{}',
  corpus_extracted_at TIMESTAMPTZ,

  -- Cost telemetry.
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_analyses_meeting
  ON montree_parent_meeting_analyses (meeting_id);

-- Phase C scans this regularly to find unprocessed analyses.
CREATE INDEX IF NOT EXISTS idx_parent_meeting_analyses_unprocessed
  ON montree_parent_meeting_analyses (school_id, corpus_extracted_at)
  WHERE corpus_extracted_at IS NULL;

-- 241b — retro-add FKs on montree_parent_meetings now that 240 + 241
-- targets exist. Idempotent.
ALTER TABLE montree_parent_meetings
  ADD COLUMN IF NOT EXISTS transcript_id UUID
    REFERENCES montree_parent_meeting_transcripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis_id UUID
    REFERENCES montree_parent_meeting_analyses(id) ON DELETE SET NULL;

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_parent_meeting_analyses; -- 0
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'montree_parent_meetings' AND column_name IN ('transcript_id','analysis_id');
--   -- Should return 2 rows.
