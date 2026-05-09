-- migrations/191_gloria_agent_log.sql
-- Session 97 follow-up — Gloria, the agent's frontline AI on Opus.
--
-- Mirrors montree_principal_agent_log (migration 184). Captures every Gloria
-- exchange so Tredoux can see what agents are actually asking — that's the
-- signal he uses to decide what new tools Gloria needs and where the agent
-- workflow has gaps.
--
-- 🚨 ARCHITECTURAL RULE: agent_id self-scoping is the cross-pollination
-- contract for everything agent-related. An agent must never see another
-- agent's conversations. The super-admin view is the only place that reads
-- across agent_ids.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_agent_gloria_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  tools_called JSONB,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gloria_log_agent_recent
  ON montree_agent_gloria_log(agent_id, asked_at DESC);
CREATE INDEX IF NOT EXISTS idx_gloria_log_conversation
  ON montree_agent_gloria_log(conversation_id, asked_at);
CREATE INDEX IF NOT EXISTS idx_gloria_log_recent
  ON montree_agent_gloria_log(asked_at DESC);

COMMIT;

-- Verify (run separately):
-- SELECT count(*) FROM montree_agent_gloria_log;
