-- Migration 282: global visual-memory embeddings — Jul 4, 2026
--
-- Adds a pgvector embedding column to montree_global_visual_memory + a cosine
-- similarity RPC, so photo-ID candidate RECALL can be driven by what the photo
-- LOOKS LIKE (embedding of the Pass-1 visual description) across ALL areas —
-- not by lexical fuzzy-matching the name Haiku guessed. Closes the failure
-- CLASS behind the Sunshine Montessori cold-start incident (a Number Rods photo
-- drafted as "Brown Stair" because Number Rods was never even a candidate).
-- See docs/handoffs/SESSION_PHOTO_ID_VISUAL_RETRIEVAL_PLAN.md (Step 1).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into the Supabase SQL Editor.
--    (Schema changes go through the SQL Editor, never the pooler.)
--
-- After running, the embeddings must be BACKFILLED via the one-shot super-admin
-- route:  POST /api/montree/super-admin/embed-global-vm  (super-admin token or
-- x-cron-secret). The route embeds each active row's visual_description +
-- key_materials via OpenAI text-embedding-3-small (already on Railway for
-- Whisper) and writes the `embedding` column. Re-run after ANY seed change.
--
-- Runtime is READ-ONLY on this column (montree_global_vm_search RPC). Retrieval
-- fails OPEN: if the column/RPC is absent or empty, the pipeline behaves exactly
-- as before (no embeddings = no similarity block, unchanged Pass 2 / Pass 2b).
--
-- Idempotent. Safe to re-run. pgvector is already enabled (migration 242).

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- 1536 = OpenAI text-embedding-3-small (same model + dim as montree_tracy_corpus).
ALTER TABLE montree_global_visual_memory
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- No ANN index: only ~270 active rows, so a sequential cosine scan is instant.
-- (An hnsw/ivfflat index would add build cost on every re-seed for zero win at
--  this row count. Add one only if the table grows past a few thousand rows.)

-- Cosine similarity search over the active global visual memory, across ALL
-- areas. Mirrors tracy_corpus_search (migration 242b). Returns the top-N works
-- whose curated visual fingerprint most resembles the query embedding (the
-- embedded Pass-1 photo description).
CREATE OR REPLACE FUNCTION montree_global_vm_search(
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  work_key TEXT,
  work_name TEXT,
  area TEXT,
  similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.work_key,
    g.work_name,
    g.area,
    (1 - (g.embedding <=> p_query_embedding))::numeric AS similarity
  FROM montree_global_visual_memory g
  WHERE g.is_active
    AND g.embedding IS NOT NULL
  ORDER BY g.embedding <=> p_query_embedding
  LIMIT GREATEST(1, LEAST(50, p_limit));
END $$;

GRANT EXECUTE ON FUNCTION montree_global_vm_search(vector(1536), INTEGER)
  TO anon, authenticated, service_role;

COMMIT;

-- After running:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'montree_global_visual_memory' AND column_name = 'embedding';  -- 1 row
--   SELECT proname FROM pg_proc WHERE proname = 'montree_global_vm_search';             -- 1 row
--   -- then backfill: POST /api/montree/super-admin/embed-global-vm
--   SELECT count(*) FROM montree_global_visual_memory WHERE embedding IS NOT NULL;      -- 270 after backfill
