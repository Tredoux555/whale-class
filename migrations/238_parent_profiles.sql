-- migrations/238_parent_profiles.sql
-- Ultimate Tracy Phase A (May 28, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
-- Until then the parent-profile route returns migration_pending=true and the
-- voice-onboarding UI surfaces a friendly fallback.
--
-- PURPOSE
--   Parents become first-class entities with structured psychological
--   profiles. Tracy can answer "tell me about Mrs Chen" with substance
--   instead of just metadata. The dossier-builder personalises the parent
--   half (Section 5) from this row, not just from inferred guru_parent_states.
--
-- SCOPE
--   One row per (parent, school) pair. A parent at School A vs School B
--   has independent profiles even if they're the same human. The
--   archetypes / cultural_register / triggers / moves are school-specific
--   relational knowledge — they shouldn't bleed across schools the same
--   human happens to have children at.
--
-- LIFECYCLE
--   - `onboarded_voice` — principal recorded a 60-90s voice intake, Sonnet
--     structured it into fields. Default for the v1 onboarding flow.
--   - `onboarded_typed` — typed-in via the "type instead" link.
--   - `inferred_from_threads` — auto-derived from parent_teacher thread
--     history (future iteration; not built in Phase A).
--   - `extracted_from_meeting` — Phase B's meeting-analysis pipeline
--     proposes profile updates; once approved by the principal the source
--     stamps to this.
--   - `principal_typed` — direct manual edit, no AI intake.
--
-- EVALUATION DIVERGENCE (decision locked Phase A)
--   Both principal AND teacher can onboard a parent. When both have
--   onboarded the same parent, the principal's evaluation wins on the
--   visible profile (evaluated_by_role='principal'), but the teacher's
--   evaluation is preserved as a second perspective the principal can see
--   (we leave the teacher version as a superseded row by writing a new
--   principal row — the UI surfaces both via evaluated_by_role).

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope (load-bearing — every query filters by school_id).
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Archetypes from Tracy's knowledge file 04 (the five recurring parent
  -- patterns). Stored as text[] because real parents often span 2 archetypes
  -- (an expectation-driven parent can also be anxiety-projecting).
  -- CHECK constraint is intentionally loose — the canonical set is
  -- enforced at the application layer in voice-intake.ts.
  archetypes TEXT[] NOT NULL DEFAULT '{}',

  -- Cultural register — structured JSONB keyed by Erin Meyer's Culture Map
  -- dimensions (knowledge file 05). Loose JSONB so we can add dimensions
  -- later without a migration. Example shape:
  --   {
  --     "communicating":  "high_context",
  --     "evaluating":     "indirect",
  --     "persuading":     "principles_first",
  --     "leading":        "hierarchical",
  --     "deciding":       "consensual",
  --     "trusting":       "relationship_based",
  --     "disagreeing":    "avoids_confrontation",
  --     "scheduling":     "linear"
  --   }
  cultural_register JSONB NOT NULL DEFAULT '{}',

  -- Language the parent emotionally processes in (often differs from their
  -- English fluency — a fluent-English Mandarin parent may still want the
  -- hard conversations in Mandarin). ISO 639-1 lowercase. Empty string =
  -- unknown / not yet asked.
  preferred_language TEXT NOT NULL DEFAULT '',

  -- Triggers — specific things to AVOID with this parent. Free-text strings
  -- like "comparison to older sibling", "framing as 'behaviour problem'".
  known_triggers TEXT[] NOT NULL DEFAULT '{}',

  -- Moves that have consistently landed. Free-text like "showing concrete
  -- photo evidence", "anchoring to Maria Montessori's three-period lesson".
  effective_moves TEXT[] NOT NULL DEFAULT '{}',

  -- Relationship temperature — Tracy reads this from threads + meetings.
  -- Hard-CHECKed because the dossier prompt branches on these four values.
  relationship_temperature TEXT NOT NULL DEFAULT 'neutral'
    CHECK (relationship_temperature IN ('warm', 'neutral', 'strained', 'repairing')),

  -- Family context — free-text long-memory field. Names of siblings, parent's
  -- profession, family circumstances the principal needs to remember.
  family_context TEXT NOT NULL DEFAULT '',

  -- What the parent has said matters most for their child. e.g.
  --   ["academic readiness for K", "independence", "social confidence"]
  priorities_for_child TEXT[] NOT NULL DEFAULT '{}',

  -- Free-text long-memory anything-goes field. Where principal notes go that
  -- don't fit any structured slot.
  history_notes TEXT NOT NULL DEFAULT '',

  -- Lightweight stats — updated by Phase B (meetings) and by a future
  -- thread-watcher (last_thread_message_at).
  meeting_count INTEGER NOT NULL DEFAULT 0,
  last_meeting_date TIMESTAMPTZ,
  last_thread_message_at TIMESTAMPTZ,

  -- Lifecycle.
  source TEXT NOT NULL DEFAULT 'principal_typed'
    CHECK (source IN ('onboarded_voice', 'onboarded_typed', 'inferred_from_threads', 'extracted_from_meeting', 'principal_typed')),
  evaluated_by_role TEXT NOT NULL DEFAULT 'principal'
    CHECK (evaluated_by_role IN ('principal', 'teacher')),
  evaluated_by_id UUID,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One profile per (parent, school) pair. UPSERT-on-conflict re-runs the
  -- intake; we don't preserve old rows in v1. (Phase B's
  -- profile_update_proposals review provides the audit trail.)
  UNIQUE (parent_id, school_id)
);

-- School-scope index: every list-parents-for-school query hits this.
CREATE INDEX IF NOT EXISTS idx_parent_profiles_school
  ON montree_parent_profiles (school_id);

-- Per-parent lookup index.
CREATE INDEX IF NOT EXISTS idx_parent_profiles_parent
  ON montree_parent_profiles (parent_id);

-- Auto-bump updated_at trigger.
CREATE OR REPLACE FUNCTION montree_parent_profiles_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_parent_profiles_touch ON montree_parent_profiles;
CREATE TRIGGER trg_parent_profiles_touch
  BEFORE UPDATE ON montree_parent_profiles
  FOR EACH ROW EXECUTE FUNCTION montree_parent_profiles_touch_updated_at();

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_parent_profiles; -- should return 0
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'montree_parent_profiles' ORDER BY ordinal_position;
--   -- Should list 18 columns ending with created_at/updated_at.
