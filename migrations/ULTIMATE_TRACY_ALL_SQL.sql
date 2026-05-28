-- migrations/ULTIMATE_TRACY_ALL_SQL.sql
-- =====================================================================
--  ULTIMATE TRACY — ALL MIGRATIONS, ONE FILE
-- =====================================================================
--
-- Paste this WHOLE file into Supabase SQL Editor and Run.
-- Each numbered section is wrapped in its own BEGIN/COMMIT — if one
-- fails, prior sections stay committed and you can re-run the rest.
--
-- ORDER MATTERS. The migrations have forward references:
--   239 references montree_meeting_dossiers (created in 237)
--   240 + 241 reference montree_parent_meetings (created in 239)
--   241 retro-adds FKs ON montree_parent_meetings → transcripts + analyses
--   242b references montree_tracy_corpus (created in 242)
--
-- WHAT EACH SECTION DOES (in plain English):
--   237 — Dossier cache (24h TTL) for prepare_parent_meeting + Mira pitch
--   238 — Parent profiles table (archetypes + cultural register + triggers)
--   239 — Parent meetings (lifecycle + type enum)
--   240 — Encrypted-at-rest meeting transcripts (audio NEVER persists)
--   241 — Sonnet analyses (summary + structured extractions + proposals)
--   241b — Retro-add FKs on parent_meetings → transcripts + analyses
--   242 — Self-improving school corpus (pgvector HNSW)
--   242b — Cosine search RPCs (SECURITY DEFINER, school-scoped)
--   243 — Recording consent flag + deletion audit table
--
-- ALL IDEMPOTENT — safe to re-run.
--
-- After everything is committed, scroll to the bottom for verification
-- SELECT statements.

-- =====================================================================
-- 237 — montree_meeting_dossiers (Session 134 carry-over)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_meeting_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('principal', 'agent')),
  school_id UUID,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('parent_meeting', 'principal_pitch')),
  audience_ref TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  meeting_purpose TEXT NOT NULL,
  parent_context TEXT,
  output_format TEXT NOT NULL DEFAULT 'markdown' CHECK (output_format IN ('markdown', 'html', 'json')),
  payload_text TEXT NOT NULL,
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

DROP INDEX IF EXISTS idx_meeting_dossiers_cache_lookup;
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_cache_lookup
  ON montree_meeting_dossiers (cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_owner_recent
  ON montree_meeting_dossiers (owner_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_audience_recent
  ON montree_meeting_dossiers (audience_type, audience_ref, generated_at DESC);

CREATE OR REPLACE FUNCTION montree_purge_expired_dossiers()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM montree_meeting_dossiers WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END $$;
GRANT EXECUTE ON FUNCTION montree_purge_expired_dossiers() TO anon, authenticated, service_role;

COMMIT;

-- =====================================================================
-- 238 — montree_parent_profiles (Ultimate Tracy Phase A)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  archetypes TEXT[] NOT NULL DEFAULT '{}',
  cultural_register JSONB NOT NULL DEFAULT '{}',
  preferred_language TEXT NOT NULL DEFAULT '',
  known_triggers TEXT[] NOT NULL DEFAULT '{}',
  effective_moves TEXT[] NOT NULL DEFAULT '{}',
  relationship_temperature TEXT NOT NULL DEFAULT 'neutral'
    CHECK (relationship_temperature IN ('warm', 'neutral', 'strained', 'repairing')),
  family_context TEXT NOT NULL DEFAULT '',
  priorities_for_child TEXT[] NOT NULL DEFAULT '{}',
  history_notes TEXT NOT NULL DEFAULT '',
  meeting_count INTEGER NOT NULL DEFAULT 0,
  last_meeting_date TIMESTAMPTZ,
  last_thread_message_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'principal_typed'
    CHECK (source IN ('onboarded_voice', 'onboarded_typed', 'inferred_from_threads', 'extracted_from_meeting', 'principal_typed')),
  evaluated_by_role TEXT NOT NULL DEFAULT 'principal'
    CHECK (evaluated_by_role IN ('principal', 'teacher')),
  evaluated_by_id UUID,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_school ON montree_parent_profiles (school_id);
CREATE INDEX IF NOT EXISTS idx_parent_profiles_parent ON montree_parent_profiles (parent_id);

CREATE OR REPLACE FUNCTION montree_parent_profiles_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_parent_profiles_touch ON montree_parent_profiles;
CREATE TRIGGER trg_parent_profiles_touch BEFORE UPDATE ON montree_parent_profiles
  FOR EACH ROW EXECUTE FUNCTION montree_parent_profiles_touch_updated_at();

COMMIT;

-- =====================================================================
-- 239 — montree_parent_meetings (Phase B)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  principal_id UUID REFERENCES montree_school_admins(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  held_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  meeting_type TEXT NOT NULL DEFAULT 'parent_teacher_conference'
    CHECK (meeting_type IN ('parent_teacher_conference','intro','escalation','exit','behavioural','progress','other')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','held','cancelled','needs_follow_up','closed')),
  linked_dossier_id UUID REFERENCES montree_meeting_dossiers(id) ON DELETE SET NULL,
  outcome_notes TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meetings_school
  ON montree_parent_meetings (school_id, held_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_parent_meetings_parent
  ON montree_parent_meetings (parent_id, held_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION montree_parent_meetings_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_parent_meetings_touch ON montree_parent_meetings;
CREATE TRIGGER trg_parent_meetings_touch BEFORE UPDATE ON montree_parent_meetings
  FOR EACH ROW EXECUTE FUNCTION montree_parent_meetings_touch_updated_at();

COMMIT;

-- =====================================================================
-- 240 — montree_parent_meeting_transcripts (Phase B)
-- Encrypted-at-rest via messaging-crypto.ts (AES-256-GCM, gcm:<iv>:<tag>:<ct>)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES montree_parent_meetings(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  transcript_text_encrypted TEXT NOT NULL,
  encryption_version INTEGER NOT NULL DEFAULT 1,
  locale_detected TEXT,
  whisper_model_used TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 1,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,
  audio_destroyed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_transcripts_meeting
  ON montree_parent_meeting_transcripts (meeting_id);
CREATE INDEX IF NOT EXISTS idx_parent_meeting_transcripts_school
  ON montree_parent_meeting_transcripts (school_id);

COMMIT;

-- =====================================================================
-- 241 — montree_parent_meeting_analyses (Phase B) + retro-FKs on 239 (241b)
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meeting_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES montree_parent_meetings(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  summary_markdown TEXT NOT NULL,
  parent_revealed TEXT[] NOT NULL DEFAULT '{}',
  commitments_made TEXT[] NOT NULL DEFAULT '{}',
  emotional_arc TEXT NOT NULL DEFAULT '',
  triggers_observed TEXT[] NOT NULL DEFAULT '{}',
  moves_that_landed TEXT[] NOT NULL DEFAULT '{}',
  unresolved_threads TEXT[] NOT NULL DEFAULT '{}',
  recommended_follow_up TEXT NOT NULL DEFAULT '',
  profile_update_proposals JSONB NOT NULL DEFAULT '{}',
  proposals_reviewed_at TIMESTAMPTZ,
  proposals_review_outcome TEXT
    CHECK (proposals_review_outcome IN ('approved_all','approved_some','dismissed_all','edited')),
  corpus_extractions TEXT[] NOT NULL DEFAULT '{}',
  corpus_extracted_at TIMESTAMPTZ,
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_analyses_meeting
  ON montree_parent_meeting_analyses (meeting_id);
CREATE INDEX IF NOT EXISTS idx_parent_meeting_analyses_unprocessed
  ON montree_parent_meeting_analyses (school_id, corpus_extracted_at)
  WHERE corpus_extracted_at IS NULL;

-- 241b — retro-add FKs on montree_parent_meetings now that 240 + 241 targets exist.
ALTER TABLE montree_parent_meetings
  ADD COLUMN IF NOT EXISTS transcript_id UUID
    REFERENCES montree_parent_meeting_transcripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis_id UUID
    REFERENCES montree_parent_meeting_analyses(id) ON DELETE SET NULL;

COMMIT;

-- =====================================================================
-- 242 — montree_tracy_corpus (Phase C, pgvector + HNSW)
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS montree_tracy_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL CHECK (length(insight_text) BETWEEN 20 AND 2000),
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'parent_archetype_signal','cultural_pattern','de_escalation_move',
    'trap_phrase','voice_sample','topic_pattern','school_specific'
  )),
  applies_to JSONB NOT NULL DEFAULT '{}',
  source_meeting_id UUID REFERENCES montree_parent_meetings(id) ON DELETE SET NULL,
  source_thread_id UUID,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.70 CHECK (confidence BETWEEN 0 AND 1),
  reference_count INTEGER NOT NULL DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES montree_tracy_corpus(id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tracy_corpus_active
  ON montree_tracy_corpus (school_id, insight_type)
  WHERE superseded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_ranking
  ON montree_tracy_corpus (school_id, last_referenced_at DESC NULLS LAST, reference_count DESC)
  WHERE superseded_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_embedding
  ON montree_tracy_corpus USING hnsw (embedding vector_cosine_ops)
  WHERE superseded_at IS NULL;

COMMIT;

-- =====================================================================
-- 242b — tracy_corpus_search RPC + tracy_corpus_bump_references RPC
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION tracy_corpus_search(
  p_school_id UUID,
  p_query_embedding vector(1536),
  p_archetype TEXT DEFAULT NULL,
  p_min_similarity NUMERIC DEFAULT 0.6,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  insight_text TEXT,
  insight_type TEXT,
  applies_to JSONB,
  confidence NUMERIC,
  source_meeting_id UUID,
  reference_count INTEGER,
  last_referenced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  similarity NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.insight_text, c.insight_type, c.applies_to, c.confidence,
    c.source_meeting_id, c.reference_count, c.last_referenced_at, c.created_at,
    (1 - (c.embedding <=> p_query_embedding))::numeric AS similarity
  FROM montree_tracy_corpus c
  WHERE c.school_id = p_school_id
    AND c.superseded_at IS NULL
    AND c.embedding IS NOT NULL
    AND (p_archetype IS NULL OR (c.applies_to ->> 'archetype') = p_archetype)
    AND (1 - (c.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_limit;
END $$;
GRANT EXECUTE ON FUNCTION tracy_corpus_search(UUID, vector(1536), TEXT, NUMERIC, INTEGER)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION tracy_corpus_bump_references(p_ids UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE montree_tracy_corpus
  SET reference_count = reference_count + 1, last_referenced_at = NOW()
  WHERE id = ANY(p_ids) AND superseded_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END $$;
GRANT EXECUTE ON FUNCTION tracy_corpus_bump_references(UUID[])
  TO anon, authenticated, service_role;

COMMIT;

-- =====================================================================
-- 243 — Parent consent flags + deletion audit (Phase E)
-- =====================================================================

BEGIN;

ALTER TABLE montree_parents
  ADD COLUMN IF NOT EXISTS recording_consent_on_file BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recording_consent_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_consent_set_by UUID;

CREATE TABLE IF NOT EXISTS montree_parent_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  parent_name TEXT,
  parent_email TEXT,
  school_id UUID NOT NULL,
  deleted_by UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  meetings_count_at_deletion INTEGER NOT NULL DEFAULT 0,
  profile_existed_at_deletion BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_deletion_audit_school
  ON montree_parent_deletion_audit (school_id, deleted_at DESC);

COMMIT;

-- =====================================================================
-- VERIFICATION — run these AFTER all sections above commit.
-- Each should return ≥1 row. Fail = something didn't take.
-- =====================================================================

-- 237
SELECT 'm237' AS chk, count(*) AS n FROM montree_meeting_dossiers;
SELECT 'fn_purge' AS chk, count(*) AS n FROM pg_proc WHERE proname = 'montree_purge_expired_dossiers';

-- 238
SELECT 'm238' AS chk, count(*) AS n FROM information_schema.columns
  WHERE table_name = 'montree_parent_profiles';
-- Expect: ~18 columns

-- 239
SELECT 'm239' AS chk, count(*) AS n FROM information_schema.columns
  WHERE table_name = 'montree_parent_meetings'
    AND column_name IN ('parent_id','school_id','meeting_type','status','transcript_id','analysis_id');
-- Expect: 6

-- 240
SELECT 'm240' AS chk, count(*) AS n FROM information_schema.columns
  WHERE table_name = 'montree_parent_meeting_transcripts'
    AND column_name IN ('transcript_text_encrypted','encryption_version','audio_destroyed_at');
-- Expect: 3

-- 241
SELECT 'm241' AS chk, count(*) AS n FROM information_schema.columns
  WHERE table_name = 'montree_parent_meeting_analyses'
    AND column_name IN ('summary_markdown','profile_update_proposals','corpus_extractions','proposals_review_outcome');
-- Expect: 4

-- 242
SELECT 'm242_table' AS chk, count(*) AS n FROM information_schema.tables
  WHERE table_name = 'montree_tracy_corpus';
-- Expect: 1
SELECT 'm242_pgvector' AS chk, count(*) AS n FROM pg_extension WHERE extname = 'vector';
-- Expect: 1

-- 242b
SELECT 'm242b' AS chk, count(*) AS n FROM pg_proc
  WHERE proname IN ('tracy_corpus_search','tracy_corpus_bump_references');
-- Expect: 2

-- 243
SELECT 'm243_cols' AS chk, count(*) AS n FROM information_schema.columns
  WHERE table_name = 'montree_parents'
    AND column_name IN ('recording_consent_on_file','recording_consent_set_at','recording_consent_set_by');
-- Expect: 3
SELECT 'm243_audit' AS chk, count(*) AS n FROM information_schema.tables
  WHERE table_name = 'montree_parent_deletion_audit';
-- Expect: 1

-- If every chk above returns the expected number, ULTIMATE TRACY is ready.
