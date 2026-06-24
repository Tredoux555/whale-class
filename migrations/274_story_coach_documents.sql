-- =============================================================================
-- 274  STORY COACH DOCUMENTS — coach-accessible document store
-- Run in the Supabase SQL Editor (idempotent; graceful until run — the feature
-- degrades to "no documents" if the table is absent, same posture as 273).
-- =============================================================================
--
-- A durable place for the Coach to SAVE and READ design artifacts across
-- sessions — design docs, briefs, specs, exports (e.g. the Lyf Coach brand
-- tokens, a UI spec). Distinct from the Coach's other stores:
--   • story_coach_memory       = SEMANTIC facts (1000-char cap, every turn).
--   • story_coach_build_state  = operational session handoff (supersede-on-save).
--   • story_diary_entries      = append-only psychological record.
-- Documents are full, titled, taggable artifacts that persist and accumulate —
-- none of those fit, so they get their own store.
--
-- SCOPING (decided Jun 24): space-scoped, NOT auth.users. The Coach system does
-- not use Supabase Auth — accounts live in story_admin_users and the server
-- talks to this table with the SERVICE ROLE only. So we mirror every other
-- coach store: a `space` column (sourced only from the verified token) gives
-- real per-account isolation (one Lyf Coach subscriber can never read another's),
-- and "service role reads all" falls out for free because the server bypasses RLS.
--
-- CONTENT is PLAINTEXT (unlike diary/memory/build-state, which encrypt at rest):
-- these are design artifacts, read_document queries title + tags, and the local
-- /coach-docs .md mirror is plaintext on disk anyway — so encrypting the column
-- would be incoherent. If sensitive personal content is ever stored here, switch
-- `content` to an encrypted column (keep title/tags plaintext for querying).
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_coach_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space       text NOT NULL DEFAULT 'tredoux',          -- owner scope (sourced from the verified token)
  title       text NOT NULL,
  content     text NOT NULL,                            -- full document text / HTML (plaintext, see note above)
  doc_type    text,                                     -- 'design' | 'brief' | 'spec' | 'export' | ...
  tags        text[] NOT NULL DEFAULT '{}',             -- e.g. {lyfcoach,brand,tokens}
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- The common read: a space's documents, newest-first.
CREATE INDEX IF NOT EXISTS idx_story_coach_documents_space
  ON story_coach_documents (space, created_at DESC);

-- Tag filtering for read_document (tag overlap via &&).
CREATE INDEX IF NOT EXISTS idx_story_coach_documents_tags
  ON story_coach_documents USING gin (tags);

-- Title search is ILIKE on a small per-space set — no special index needed.

-- Reuse the personal-platform touch trigger (created in migration 257).
DROP TRIGGER IF EXISTS trg_story_coach_documents_touch ON story_coach_documents;
CREATE TRIGGER trg_story_coach_documents_touch
  BEFORE UPDATE ON story_coach_documents
  FOR EACH ROW EXECUTE FUNCTION story_personal_touch_updated_at();

-- Same posture as the rest of the personal platform: RLS on, no policies →
-- only the service role (server) can touch it.
ALTER TABLE story_coach_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_documents FORCE ROW LEVEL SECURITY;
