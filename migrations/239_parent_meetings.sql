-- migrations/239_parent_meetings.sql
-- Ultimate Tracy Phase B (May 28, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
-- Until then the recording UI surfaces a friendly fallback and routes
-- return migration_pending=true.
--
-- PURPOSE
--   The parent meeting itself becomes a first-class entity. Each meeting
--   captures who, when, what type, how it ended, and which transcript +
--   analysis row are linked.
--
-- LIFECYCLE
--   planned → held → needs_follow_up → closed
--   planned → cancelled
--   Status is mutable; held_at + duration_minutes + outcome_notes accrete.
--
-- LINKED ARTIFACTS
--   transcript_id + analysis_id are added in 241b (after 240 + 241 create
--   the target tables). Forward refs not supported by PostgreSQL.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope (load-bearing).
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Who's holding it. Exactly one of principal_id / teacher_id should
  -- be set in practice; we don't CHECK-enforce because Phase D may add
  -- co-hosted meetings later.
  principal_id UUID REFERENCES montree_school_admins(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,

  -- Lifecycle.
  scheduled_at TIMESTAMPTZ,
  held_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  meeting_type TEXT NOT NULL DEFAULT 'parent_teacher_conference'
    CHECK (meeting_type IN (
      'parent_teacher_conference',
      'intro',
      'escalation',
      'exit',
      'behavioural',
      'progress',
      'other'
    )),

  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'held', 'cancelled', 'needs_follow_up', 'closed')),

  -- Optional linked dossier (when the principal prepared via Tracy
  -- before the meeting).
  linked_dossier_id UUID REFERENCES montree_meeting_dossiers(id) ON DELETE SET NULL,

  -- Free-text outcome — principal types this after the meeting
  -- (one-line "how did it land").
  outcome_notes TEXT NOT NULL DEFAULT '',

  -- Locale of the meeting (e.g. 'zh' if the medium was Mandarin).
  -- Independent of the principal's UI locale.
  locale TEXT NOT NULL DEFAULT 'en',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meetings_school
  ON montree_parent_meetings (school_id, held_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_parent_meetings_parent
  ON montree_parent_meetings (parent_id, held_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION montree_parent_meetings_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_parent_meetings_touch ON montree_parent_meetings;
CREATE TRIGGER trg_parent_meetings_touch
  BEFORE UPDATE ON montree_parent_meetings
  FOR EACH ROW EXECUTE FUNCTION montree_parent_meetings_touch_updated_at();

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_parent_meetings; -- should return 0
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'montree_parent_meetings' ORDER BY ordinal_position;
