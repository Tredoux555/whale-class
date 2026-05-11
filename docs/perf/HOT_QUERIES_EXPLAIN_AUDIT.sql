-- docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql
-- Tier 0.13 — EXPLAIN audit of the 8 hottest queries.
--
-- Run each query inside Supabase SQL Editor with EXPLAIN (ANALYZE, BUFFERS)
-- prepended. Look for:
--   - Seq Scan on tables larger than ~10K rows
--   - "rows=" estimates way off from "actual rows="
--   - Sort steps over more than ~5MB of working memory
--
-- Replace the bracketed placeholders with real IDs from your DB before running.

-- ── 1. Dashboard "today" — children for a classroom ─────────────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, photo_url, classroom_id
FROM montree_children
WHERE classroom_id = '[CLASSROOM_UUID]'
  AND school_id = '[SCHOOL_UUID]'
  AND is_active = true
ORDER BY name;
-- Expected: Index Scan via classroom_id index. Bad: Seq Scan.

-- ── 2. Photo audit — pending media for a classroom ──────────────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, child_id, work_name, identification_status, captured_at
FROM montree_media
WHERE classroom_id = '[CLASSROOM_UUID]'
  AND captured_at >= NOW() - INTERVAL '7 days'
  AND teacher_confirmed = false
ORDER BY captured_at DESC
LIMIT 100;
-- Expected: Index Scan on (classroom_id, captured_at) composite OR a partial
-- index on teacher_confirmed=false. Bad: Seq Scan + filter.

-- ── 3. Weekly Wrap — child progress for replan ──────────────────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, work_name, area, status, updated_at
FROM montree_child_progress
WHERE child_id = '[CHILD_UUID]'
ORDER BY updated_at DESC;
-- Expected: Index Scan on child_id.

-- ── 4. Guru — recent interactions for a child ──────────────────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, question, response, asked_at
FROM montree_guru_interactions
WHERE child_id = '[CHILD_UUID]'
ORDER BY asked_at DESC
LIMIT 20;

-- ── 5. Super-admin schools list — child counts ──────────────────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT school_id, COUNT(*)
FROM montree_children
WHERE school_id IS NOT NULL
GROUP BY school_id;

-- ── 6. API usage rollup (Phase 5 aggregator) ───────────────────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT school_id, model_used, SUM(cost_usd), COUNT(*)
FROM montree_api_usage
WHERE created_at >= '2026-05-01T00:00:00Z'
  AND created_at <  '2026-06-01T00:00:00Z'
  AND school_id IS NOT NULL
GROUP BY school_id, model_used;
-- This runs once per month per Money tab "Calculate now" click.
-- Expected: Index Scan on (created_at) index. Bad: Seq Scan.

-- ── 7. Phase 5 calculator — finance_transactions per (school, month) ───────
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, type, category, school_id, usd_amount
FROM montree_finance_transactions
WHERE school_id = '[SCHOOL_UUID]'
  AND occurred_at >= '2026-05-01T00:00:00Z'
  AND occurred_at <  '2026-06-01T00:00:00Z';
-- Expected: Index Scan via idx_finance_tx_school (created by migration 189).

-- ── 8. Threaded messaging — list threads for a participant ─────────────────
EXPLAIN (ANALYZE, BUFFERS)
SELECT mt.id, mt.subject, mt.last_message_at, mt.thread_type
FROM montree_message_threads mt
JOIN montree_message_thread_participants p ON p.thread_id = mt.id
WHERE p.participant_id = '[USER_UUID]'
  AND p.participant_role = 'teacher'
  AND p.left_at IS NULL
  AND mt.archived_at IS NULL
ORDER BY mt.last_message_at DESC
LIMIT 50;
-- Expected: Index Scan on (participant_id, participant_role).

-- ── Bonus 9. Web Vitals percentile query for a route ───────────────────────
-- Useful baseline when you start setting LCP/INP thresholds.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY value) AS p95
FROM montree_perf_vitals
WHERE metric = 'LCP'
  AND route = '/montree/dashboard'
  AND reported_at >= NOW() - INTERVAL '7 days';
