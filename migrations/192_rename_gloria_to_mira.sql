-- migrations/192_rename_gloria_to_mira.sql
-- Renames the agent-side AI assistant from Gloria to Mira.
--
-- Migration 191 originally created montree_agent_gloria_log to capture every
-- agent ↔ AI exchange. The assistant has been renamed to Mira; this migration
-- renames the table and its three indexes to match. Idempotent — safe to
-- re-run; uses IF EXISTS guards on every clause.
--
-- Application code (lib/montree/mira, app/api/montree/agent/mira) writes to
-- montree_agent_mira_log. Until this migration runs in Supabase, those writes
-- will silently fail (the route catches log-insert errors).

BEGIN;

ALTER TABLE IF EXISTS montree_agent_gloria_log
  RENAME TO montree_agent_mira_log;

ALTER INDEX IF EXISTS idx_gloria_log_agent_recent
  RENAME TO idx_mira_log_agent_recent;
ALTER INDEX IF EXISTS idx_gloria_log_conversation
  RENAME TO idx_mira_log_conversation;
ALTER INDEX IF EXISTS idx_gloria_log_recent
  RENAME TO idx_mira_log_recent;

COMMIT;

-- Verify (run separately):
-- SELECT count(*) FROM montree_agent_mira_log;
-- SELECT indexname FROM pg_indexes WHERE tablename = 'montree_agent_mira_log';
