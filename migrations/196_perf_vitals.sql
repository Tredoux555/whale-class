-- migrations/196_perf_vitals.sql
-- Session 103 Tier 0.12 — Web Vitals telemetry.
--
-- Without measurement, every Tier 1+ perf change ships blind. This table
-- collects Core Web Vitals (LCP, INP, CLS, TTFB, FCP) per-route per-session
-- so we can establish a baseline + measure deltas as perf work lands.
--
-- Volume estimate: ~5 metrics × N route changes per session × M users. At 7
-- schools and ~5 sessions/day each with 10 route changes, that's ~1.7k rows/
-- day. Linear scan friendly; partitioning not needed yet.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS montree_perf_vitals (
  id BIGSERIAL PRIMARY KEY,

  -- Metric identity. Names match web-vitals package: LCP, INP, CLS, FCP, TTFB.
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  rating TEXT,                          -- 'good' | 'needs-improvement' | 'poor'
  delta DOUBLE PRECISION,               -- monotonically increasing for INP/CLS

  -- Context. role + schoolId let us slice by tenant + role over time.
  role TEXT,                            -- 'principal' | 'teacher' | 'parent' | 'agent' | null
  school_id UUID,
  route TEXT,                           -- pathname when the metric reported
  user_agent TEXT,
  navigation_type TEXT,                 -- 'navigate' | 'reload' | 'back-forward' | etc.

  -- Network conditions when available — flaky-VPN debug fuel.
  effective_connection_type TEXT,       -- '4g' | '3g' | '2g' | 'slow-2g'
  downlink DOUBLE PRECISION,

  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes: per-route + per-metric is the canonical analytics query.
CREATE INDEX IF NOT EXISTS idx_perf_vitals_metric_route
  ON montree_perf_vitals (metric, route, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_vitals_school
  ON montree_perf_vitals (school_id, reported_at DESC)
  WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perf_vitals_recent
  ON montree_perf_vitals (reported_at DESC);

-- No FK on school_id — measurements are append-only telemetry. We don't
-- want a school delete to wipe historical baseline data.
