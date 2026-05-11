-- Migration 201 — Lightweight server error log (Sentry-lite).
--
-- A simple table to capture server errors that aren't covered by the more
-- specific webhook DLQ. Anywhere we currently console.error a real bug we
-- can also logServerError() to land a queryable row.
--
-- NOT a replacement for Sentry — no transactions/perf/etc. — but enough to
-- give Tredoux a 'Recent errors' view without paying for or wiring an
-- external service.
--
-- Retention: app code should keep only the last ~10K rows. A periodic clean
-- can be added later when volume warrants.

CREATE TABLE IF NOT EXISTS montree_server_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Where in the app the error happened. Free-text for now (e.g.
  -- 'billing-webhook', 'photo-pipeline', 'payouts-calculator').
  origin TEXT NOT NULL,

  -- One-line summary suitable for a list view.
  message TEXT NOT NULL,

  -- Full stack trace (truncated).
  stack TEXT,

  -- Optional context (JSONB) — request path, schoolId, etc.
  context JSONB,

  -- Severity (free string today).
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warn', 'error', 'fatal')),

  -- Triage state.
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_errors_recent
  ON montree_server_errors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_server_errors_unresolved
  ON montree_server_errors(created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_server_errors_origin
  ON montree_server_errors(origin, created_at DESC);

COMMENT ON TABLE montree_server_errors IS
  'Lightweight error log for production debugging. Not a Sentry replacement — just a queryable record of bad code paths.';
