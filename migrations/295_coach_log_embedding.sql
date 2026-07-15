-- migrations/295_coach_log_embedding.sql
-- Diary Recall (Jul 15, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into the Supabase SQL Editor.
--
-- PURPOSE
--   story_coach_log is the coach's PERMANENT verbatim diary — every past chat
--   turn, encrypted at rest (question_enc / answer_enc), never pruned. Today the
--   coach only sees the last ~12 turns / 72h (loadRecentThread). The new
--   recall_history tool lets it search the WHOLE log — a name, a dream, a plan
--   from months ago — when the user references something the current thread and
--   the consolidated memories don't hold. "NEVER say you don't remember without
--   searching first."
--
--   Retrieval is a SEMANTIC + KEYWORD hybrid. This migration adds the embedding
--   column that powers the semantic half: at write time the coach route embeds
--   the plaintext turn (OpenAI text-embedding-3-small, 1536-dim) and stores it
--   here; recall embeds the query and matches by pgvector cosine similarity
--   inside a tiered time window (7d → 30d → all-time). The keyword half decrypts
--   rows in JS and works with or without this column populated.
--
-- PRIVACY NOTE (documented tradeoff)
--   The embedding is derived from PLAINTEXT (question + answer) BEFORE the fields
--   are encrypted at rest. This adds a semantic-leak surface to a raw DB dump (an
--   embedding is not reversible to text, but it encodes meaning). It matches the
--   platform's existing at-rest posture (server-held key; the coach reads
--   plaintext by design) and is NEVER exposed by the search RPC, which returns
--   ids + metadata only (see 295b). E2e / device-encrypted spaces never reach the
--   write site, so they store no embedding.
--
-- pgvector is required (already present from migration 242 — guarded here so this
-- file is self-sufficient).

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic-search vector for each logged turn. NULL until embedded (write-time
-- embedding is fail-open; the backfill route fills historic rows). Recall's
-- keyword path works whether or not this is populated.
ALTER TABLE story_coach_log
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW cosine index over the POPULATED rows only. The log grows unbounded over
-- years, so the partial predicate keeps the index lean (mirrors the tracy corpus
-- precedent, migration 242).
CREATE INDEX IF NOT EXISTS idx_coach_log_embedding
  ON story_coach_log USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

COMMIT;

-- After running:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'story_coach_log' AND column_name = 'embedding'; -- 1 row
--   SELECT extname FROM pg_extension WHERE extname = 'vector';            -- 1 row
