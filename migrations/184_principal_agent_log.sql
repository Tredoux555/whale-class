-- migrations/184_principal_agent_log.sql
--
-- Logs every question a principal asks the home-page agent ("ask anything
-- about your school"). Each row captures one Q→A exchange so the super-admin
-- can see, across all schools, what principals are actually asking. That's
-- the signal we need to know which features to build next.
--
-- Run order: after 183_outreach_demo_request_statuses.sql.
-- Run in: Supabase SQL Editor (or via your migration tool).

CREATE TABLE IF NOT EXISTS montree_principal_agent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHO asked (and which school they belong to)
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  principal_id UUID NOT NULL,

  -- Which conversation this exchange is part of (groups multi-turn). The
  -- client generates a UUID per fresh chat session and reuses it for follow-up
  -- questions. Lets us reconstruct the full thread later.
  conversation_id UUID NOT NULL,

  -- WHAT was asked + what we replied
  question TEXT NOT NULL,
  answer   TEXT,

  -- HOW the agent worked it out — array of objects:
  --   [{ name: "find_children_by_name", input: {...}, success: true, duration_ms: 124, result_summary: "..." }, ...]
  -- result_summary is a short truncated form (no full briefing text) — keeps
  -- the log readable.
  tools_called JSONB DEFAULT '[]'::jsonb,

  -- WHAT IT COST (for both internal cost tracking + super-admin visibility)
  model          TEXT,                 -- e.g. 'claude-sonnet-4-6'
  input_tokens   INT,
  output_tokens  INT,
  cost_usd       NUMERIC(10, 6),       -- 6 decimals = sub-cent precision
  duration_ms    INT,                  -- end-to-end including all tool rounds

  -- If the agent errored mid-flight, capture why
  error TEXT,

  asked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recent-questions-per-school: principal returning to their dashboard, super-admin
-- filtering by school in the questions log view.
CREATE INDEX IF NOT EXISTS idx_principal_agent_log_school_time
  ON montree_principal_agent_log (school_id, asked_at DESC);

-- Per-principal history (e.g. who asks the most questions)
CREATE INDEX IF NOT EXISTS idx_principal_agent_log_principal_time
  ON montree_principal_agent_log (principal_id, asked_at DESC);

-- Reconstructing a single conversation
CREATE INDEX IF NOT EXISTS idx_principal_agent_log_conversation
  ON montree_principal_agent_log (conversation_id, asked_at);

-- Super-admin "everything everywhere recent" view
CREATE INDEX IF NOT EXISTS idx_principal_agent_log_recent
  ON montree_principal_agent_log (asked_at DESC);

COMMENT ON TABLE montree_principal_agent_log IS
  'Every question a principal asks the home-page Ask Anything agent. Drives super-admin product insight.';

COMMENT ON COLUMN montree_principal_agent_log.tools_called IS
  'Array of {name, input, success, duration_ms, result_summary} per tool invocation in agent loop.';

COMMENT ON COLUMN montree_principal_agent_log.cost_usd IS
  'Sum of input_tokens × input_price + output_tokens × output_price for the parent Sonnet call. Tool subcalls are not double-counted (they are separate API calls written to montree_api_usage if instrumented).';
