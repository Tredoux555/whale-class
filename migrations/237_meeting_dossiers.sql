-- migrations/237_meeting_dossiers.sql
-- Session 133 — Mira & Tracy upgrade, Phase B.
--
-- 🚨 DO NOT RUN automatically. Tredoux will paste this into Supabase SQL
-- Editor in the morning. Until then the dossier route gracefully reports
-- migration_pending=true and falls back to live Sonnet generation per
-- request (which still works, just doesn't cache).
--
-- PURPOSE
--   Cache for both prepare_parent_meeting (Tracy) and prepare_principal_pitch
--   (Mira). Users open these dossiers the night before a meeting, may reopen
--   in the morning, and may share. Re-spending Sonnet tokens on every open
--   is wasteful (~$0.05 per regen).
--
-- TTL
--   24 hours. After that the dossier is considered stale (the underlying
--   data may have changed) and the route regenerates. The expires_at row
--   is the explicit cutoff; a daily cron could DELETE WHERE expires_at <
--   NOW() to keep the table small, but the table is also small enough not
--   to need it for v1.
--
-- CACHE KEY
--   hash(audience_ref + purpose_hash + parent_context + format) — built
--   client-side, stored as `cache_key TEXT NOT NULL`. The audience_type
--   distinguishes 'parent_meeting' (Tracy) from 'principal_pitch' (Mira)
--   so the two surfaces can share the same table without colliding.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_meeting_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who generated this dossier. owner_role = 'principal' for Tracy,
  -- 'agent' for Mira.
  owner_id UUID NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('principal', 'agent')),

  -- Cross-pollination scope. school_id is set for Tracy dossiers (the
  -- principal's school). For Mira dossiers it's NULL (the agent doesn't
  -- own a school).
  school_id UUID,

  -- What kind of dossier this is. Adding a new type later only requires
  -- updating this CHECK constraint.
  audience_type TEXT NOT NULL CHECK (audience_type IN ('parent_meeting', 'principal_pitch')),

  -- For 'parent_meeting': the child_id. For 'principal_pitch': a stable
  -- string identifier of the principal-target (e.g. "Cambridge Montessori
  -- Hong Kong | Mr Chen"). We store as TEXT to keep the table
  -- audience-agnostic.
  audience_ref TEXT NOT NULL,

  -- The full cache key used to decide whether to return a cached row or
  -- regenerate. SHA-256 hex digest, 64 chars.
  cache_key TEXT NOT NULL,

  -- Original input — useful for debugging + for regen.
  meeting_purpose TEXT NOT NULL,
  parent_context TEXT, -- 'principal_pitch' uses this for `known_pain_points`

  -- The output. We store all three formats inline so the renderer can pick.
  output_format TEXT NOT NULL DEFAULT 'markdown' CHECK (output_format IN ('markdown', 'html', 'json')),
  payload_text TEXT NOT NULL,

  -- Cost telemetry so we can watch dossier spend over time.
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,

  -- Lifecycle.
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Cache lookup index: the hot path is "do we have a fresh row for this
-- cache_key?" — partial index keeps it tight.
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_cache_lookup
  ON montree_meeting_dossiers (cache_key, expires_at)
  WHERE expires_at > NOW();

-- Owner timeline index — used by the "my dossiers" list view in the UI
-- (Phase E may surface this).
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_owner_recent
  ON montree_meeting_dossiers (owner_id, generated_at DESC);

-- Audience timeline index — used to "show me every dossier I have
-- prepared for THIS parent/child/principal".
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_audience_recent
  ON montree_meeting_dossiers (audience_type, audience_ref, generated_at DESC);

-- Optional cleanup — Phase E may add a cron to fire this. Doing it
-- inline as a function so the cron is just a one-liner.
CREATE OR REPLACE FUNCTION montree_purge_expired_dossiers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM montree_meeting_dossiers
  WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION montree_purge_expired_dossiers() TO anon, authenticated, service_role;

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_meeting_dossiers; -- should return 0
--   SELECT proname FROM pg_proc WHERE proname = 'montree_purge_expired_dossiers'; -- 1 row
