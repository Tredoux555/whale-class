-- migrations/295b_coach_log_search_fn.sql
-- Diary Recall (Jul 15, 2026) — semantic-search RPC over story_coach_log.
--
-- 🚨 DO NOT RUN automatically. Paste into the Supabase SQL Editor AFTER 295.
--
-- Wraps the pgvector `<=>` cosine operator so the coach's recall_history tool can
-- find the nearest past turns for a query embedding WITHIN A TIME WINDOW, in one
-- round-trip. The window is the tiering mechanism (last 7d → 30d → all-time) that
-- keeps recall from ever reading the whole diary at once.
--
-- 🔒 PRIVACY (load-bearing): this function NEVER returns or decrypts content. It
--    returns row ids + metadata (conversation_id, created_at, similarity) ONLY.
--    The application fetches the matched rows by id and decrypts them in JS with
--    the server diary key — ciphertext/plaintext never flows through SQL.
--    Space-scoped: a caller can only ever match rows in the space it passes
--    (sourced from the verified JWT, never the client).

BEGIN;

CREATE OR REPLACE FUNCTION story_coach_log_search(
  p_space TEXT,
  p_query_embedding vector(1536),
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_min_similarity NUMERIC DEFAULT 0.35,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  conversation_id TEXT,
  created_at TIMESTAMPTZ,
  similarity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.conversation_id,
    l.created_at,
    (1 - (l.embedding <=> p_query_embedding))::numeric AS similarity
  FROM story_coach_log l
  WHERE l.space = p_space
    AND l.embedding IS NOT NULL
    AND l.created_at BETWEEN p_from AND p_to
    AND (1 - (l.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY l.embedding <=> p_query_embedding
  LIMIT p_limit;
END $$;

-- 🔒 service_role ONLY. Migration 276 (Jul 1, 2026 security hardening) revoked
-- RPC execute from anon/authenticated project-wide and set default privileges
-- to stop auto-granting it ("every .rpc() call in the app is server-side via
-- the service-role client, which keeps execute"). This function returns
-- cross-space-callable metadata (conversation_id/created_at/similarity) keyed
-- only on a client-suppliable p_space with no session check, so granting
-- anon/authenticated here would let anyone with the public anon key enumerate
-- another space's private-diary metadata directly against Supabase, bypassing
-- the app entirely. Never widen this grant.
GRANT EXECUTE ON FUNCTION story_coach_log_search(TEXT, vector(1536), TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, INTEGER)
  TO service_role;

COMMIT;

-- After running:
--   SELECT proname FROM pg_proc WHERE proname = 'story_coach_log_search'; -- 1 row
