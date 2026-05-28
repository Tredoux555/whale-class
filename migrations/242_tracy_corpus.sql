-- migrations/242_tracy_corpus.sql
-- Ultimate Tracy Phase C (May 28, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
--
-- PURPOSE
--   Tracy's self-improving brain. Every analysed meeting feeds corpus
--   entries — abstracted insights ("with expectation-driven parents at
--   this school, showing the older sibling's progression has de-escalated
--   reading concerns 2/2 times"). No names, no quotes, no specifics.
--
--   Retrieval is semantic: the query is embedded via OpenAI
--   text-embedding-3-small (1536-dim) and matched via pgvector cosine
--   similarity against the corpus.
--
-- SCHOOL-SCOPING
--   School-scoped corpus only. Cross-school anonymized learning is a
--   separate privacy build, explicitly out of scope for v1.
--
-- SUPERSEDE
--   Same pattern as Tracy's memory (migration 195). An updated insight
--   creates a new row + sets superseded_by + superseded_at on the old.
--   Active queries filter WHERE superseded_at IS NULL.

BEGIN;

-- pgvector — Supabase supports this out of the box.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS montree_tracy_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope (load-bearing — school-scoped only for v1).
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- The insight in plain English. Length-checked.
  insight_text TEXT NOT NULL CHECK (length(insight_text) BETWEEN 20 AND 2000),

  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'parent_archetype_signal',
    'cultural_pattern',
    'de_escalation_move',
    'trap_phrase',
    'voice_sample',
    'topic_pattern',
    'school_specific'
  )),

  -- Scope. JSONB so we can match flexibly. Shape examples:
  --   { "parent_id": "...", "archetype": "expectation_driven" }
  --   { "cultural_group": "mainland_china", "topic": "reading" }
  applies_to JSONB NOT NULL DEFAULT '{}',

  -- Provenance — where did this insight come from?
  source_meeting_id UUID REFERENCES montree_parent_meetings(id) ON DELETE SET NULL,
  source_thread_id UUID, -- references montree_message_threads(id) but loose-FK to keep migrations independent

  -- Sonnet self-rated confidence at extraction time.
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.70 CHECK (confidence BETWEEN 0 AND 1),

  -- Usage telemetry — drives pruning later.
  reference_count INTEGER NOT NULL DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,

  -- Supersede chain (same pattern as memory).
  superseded_by UUID REFERENCES montree_tracy_corpus(id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ,

  -- Embedding for semantic search. 1536 = text-embedding-3-small.
  embedding vector(1536),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Set when the principal explicitly approves an insight (Phase E adds UI).
  validated_at TIMESTAMPTZ
);

-- Active-corpus partial index (excludes superseded entries).
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_active
  ON montree_tracy_corpus (school_id, insight_type)
  WHERE superseded_at IS NULL;

-- Ranking index — fed by the search-result re-ranker.
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_ranking
  ON montree_tracy_corpus (school_id, last_referenced_at DESC NULLS LAST, reference_count DESC)
  WHERE superseded_at IS NULL;

-- Vector similarity index. HNSW for fast ANN search at retrieval time.
-- WHERE clause keeps the index small by excluding superseded rows.
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_embedding
  ON montree_tracy_corpus USING hnsw (embedding vector_cosine_ops)
  WHERE superseded_at IS NULL;

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_tracy_corpus; -- 0
--   SELECT extname FROM pg_extension WHERE extname = 'vector'; -- 1 row
