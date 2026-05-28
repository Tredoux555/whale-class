-- migrations/242b_tracy_corpus_search_fn.sql
-- Ultimate Tracy Phase C — RPC for cosine similarity search.
--
-- Wraps the pgvector `<=>` operator into a function the Supabase client
-- can call with .rpc('tracy_corpus_search', { ... }). Keeps the cosine-
-- distance threshold + ranking + reference-count bump inside Postgres
-- (one round-trip instead of three).

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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.insight_text,
    c.insight_type,
    c.applies_to,
    c.confidence,
    c.source_meeting_id,
    c.reference_count,
    c.last_referenced_at,
    c.created_at,
    (1 - (c.embedding <=> p_query_embedding))::numeric AS similarity
  FROM montree_tracy_corpus c
  WHERE c.school_id = p_school_id
    AND c.superseded_at IS NULL
    AND c.embedding IS NOT NULL
    AND (
      p_archetype IS NULL
      OR (c.applies_to ->> 'archetype') = p_archetype
    )
    AND (1 - (c.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_limit;
END $$;

GRANT EXECUTE ON FUNCTION tracy_corpus_search(UUID, vector(1536), TEXT, NUMERIC, INTEGER)
  TO anon, authenticated, service_role;

-- Bump reference_count + last_referenced_at on a batch of corpus ids.
-- Called in fire-and-forget after retrieval.
CREATE OR REPLACE FUNCTION tracy_corpus_bump_references(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE montree_tracy_corpus
  SET reference_count = reference_count + 1,
      last_referenced_at = NOW()
  WHERE id = ANY(p_ids)
    AND superseded_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END $$;

GRANT EXECUTE ON FUNCTION tracy_corpus_bump_references(UUID[])
  TO anon, authenticated, service_role;

COMMIT;

-- After running:
--   SELECT proname FROM pg_proc WHERE proname IN ('tracy_corpus_search', 'tracy_corpus_bump_references');
--   -- Should return 2 rows.
