-- Migration 142: API Usage Metering
-- Tracks actual token usage and cost per AI API call
-- Enables per-school budget enforcement and super-admin monitoring

-- 1. Usage log table
CREATE TABLE IF NOT EXISTS montree_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID,
  teacher_id UUID,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_api_usage_school_month
  ON montree_api_usage (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_classroom
  ON montree_api_usage (classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint
  ON montree_api_usage (endpoint, created_at DESC);

-- 2. Budget columns on schools
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS monthly_ai_budget_usd NUMERIC(10,2) DEFAULT 50.00;
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS ai_budget_action TEXT DEFAULT 'warn';
  -- 'warn' = show banner only
  -- 'soft_limit' = warn + nudge to manual
  -- 'hard_limit' = block AI calls when budget exceeded

-- 3. Fast budget check RPC
-- Uses subquery to guarantee one row even with zero usage
CREATE OR REPLACE FUNCTION get_school_ai_usage(p_school_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'spent', COALESCE(usage.total_cost, 0)::NUMERIC(10,2),
    'budget', s.monthly_ai_budget_usd,
    'percentage', CASE
      WHEN s.monthly_ai_budget_usd > 0
      THEN ROUND(COALESCE(usage.total_cost, 0) / s.monthly_ai_budget_usd * 100, 1)
      ELSE 0 END,
    'action', s.ai_budget_action,
    'request_count', COALESCE(usage.req_count, 0)
  )
  FROM montree_schools s
  LEFT JOIN LATERAL (
    SELECT SUM(cost_usd) as total_cost, COUNT(*) as req_count
    FROM montree_api_usage
    WHERE school_id = p_school_id
      AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
  ) usage ON true
  WHERE s.id = p_school_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Per-classroom breakdown RPC
CREATE OR REPLACE FUNCTION get_classroom_ai_usage(p_school_id UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(row_data), '[]'::json)
  FROM (
    SELECT json_build_object(
      'classroom_id', u.classroom_id,
      'classroom_name', c.name,
      'spent', ROUND(SUM(u.cost_usd)::NUMERIC, 4),
      'request_count', COUNT(u.id),
      'by_endpoint', (
        SELECT json_agg(json_build_object(
          'endpoint', sub.endpoint,
          'count', sub.cnt,
          'cost', sub.total_cost
        ))
        FROM (
          SELECT endpoint, COUNT(*) as cnt, ROUND(SUM(cost_usd)::NUMERIC, 4) as total_cost
          FROM montree_api_usage
          WHERE school_id = p_school_id
            AND classroom_id = u.classroom_id
            AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
          GROUP BY endpoint
          ORDER BY total_cost DESC
        ) sub
      )
    ) as row_data
    FROM montree_api_usage u
    LEFT JOIN montree_classrooms c ON c.id = u.classroom_id
    WHERE u.school_id = p_school_id
      AND u.created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
    GROUP BY u.classroom_id, c.name
    ORDER BY SUM(u.cost_usd) DESC
  ) sub;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Auto-purge old logs (>90 days) — call periodically
CREATE OR REPLACE FUNCTION purge_old_api_usage()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM montree_api_usage
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
