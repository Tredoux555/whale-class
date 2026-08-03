-- cohort-sanity.sql — does the seeded demo produce numbers a principal could act on?
-- Mirrors what /api/montree/evaluation/reports/school computes, in plain SQL, so the
-- seed can be checked without a running Next.js server.

\echo '== 1. participation per window (n >= 12 is the reporting floor) =='
SELECT window_code,
       count(*) FILTER (WHERE status='completed')                    AS completed,
       count(DISTINCT child_id) FILTER (WHERE status='completed')    AS children,
       count(*) FILTER (WHERE status='abandoned')                    AS ended_early,
       count(*) FILTER (WHERE delivery_mode='paper')                 AS on_paper
FROM montree_evaluation_sessions GROUP BY 1 ORDER BY 1 DESC;

\echo '== 2. school MAP% — mean over children whose OWN figure was reportable =='
SELECT window_code,
       count(*) FILTER (WHERE NOT map_suppressed)          AS reportable_children,
       count(*) FILTER (WHERE map_suppressed)              AS own_figure_suppressed,
       round(avg(map_percent) FILTER (WHERE NOT map_suppressed), 1) AS map_mean_pct,
       round(avg(map_denominator) FILTER (WHERE NOT map_suppressed), 1) AS milestones_each,
       count(*) FILTER (WHERE NOT efl_map_suppressed)      AS efl_reportable_children
FROM montree_evaluation_sessions WHERE status='completed' GROUP BY 1 ORDER BY 1 DESC;

\echo '== 3. band spread by domain, current window =='
SELECT r.domain_id, r.track,
       count(*) FILTER (WHERE band_final='secure')     AS secure,
       count(*) FILTER (WHERE band_final='developing') AS developing,
       count(*) FILTER (WHERE band_final='emerging')   AS emerging,
       count(*) FILTER (WHERE band_final='unassessed') AS not_checked,
       count(DISTINCT r.child_id)                      AS children
FROM montree_evaluation_milestone_results r
JOIN montree_evaluation_sessions s ON s.id = r.session_id AND s.status='completed'
WHERE r.window_code='winter' GROUP BY 1,2 ORDER BY 1;

\echo '== 4. classroom comparison — the n>=12 gate APPLIED, as the API applies it =='
SELECT c.name,
       count(DISTINCT s.child_id) AS children,
       count(*) FILTER (WHERE NOT s.map_suppressed) AS reportable,
       CASE WHEN count(*) FILTER (WHERE NOT s.map_suppressed) >= 12
            THEN round(avg(s.map_percent) FILTER (WHERE NOT s.map_suppressed), 1)::text
            ELSE 'suppressed (fewer than 12 reportable children)' END AS map_mean_pct
FROM montree_evaluation_sessions s JOIN montree_classrooms c ON c.id = s.classroom_id
WHERE s.status='completed' AND s.window_code='winter' GROUP BY 1 ORDER BY 1;

\echo '== 5. within-child growth, autumn -> winter =='
WITH paired AS (
  SELECT a.child_id, a.milestone_id, a.band_final AS before_band, w.band_final AS after_band
  FROM montree_evaluation_milestone_results a
  JOIN montree_evaluation_milestone_results w
    ON w.child_id = a.child_id AND w.milestone_id = a.milestone_id AND w.window_code='winter'
  JOIN montree_evaluation_sessions ws ON ws.id = w.session_id AND ws.status='completed'
  JOIN montree_evaluation_sessions asx ON asx.id = a.session_id AND asx.status='completed'
  WHERE a.window_code='autumn'
    AND a.band_final <> 'unassessed' AND w.band_final <> 'unassessed'
), ranked AS (
  SELECT child_id,
         CASE before_band WHEN 'emerging' THEN 0 WHEN 'developing' THEN 1 ELSE 2 END AS b,
         CASE after_band  WHEN 'emerging' THEN 0 WHEN 'developing' THEN 1 ELSE 2 END AS a,
         after_band
  FROM paired
)
SELECT count(DISTINCT child_id)                                   AS children_in_both,
       count(*)                                                   AS comparable_milestones,
       count(*) FILTER (WHERE a > b)                              AS moved_up,
       count(*) FILTER (WHERE a = b AND after_band <> 'emerging') AS steady,
       count(*) FILTER (WHERE a < b OR (a = b AND after_band = 'emerging')) AS watching,
       round(100.0 * count(*) FILTER (WHERE a > b) / nullif(count(*),0), 1) AS moved_up_pct
FROM ranked;

\echo '== 6. transparency — nothing quietly dropped =='
SELECT count(*) FILTER (WHERE band_final='unassessed')      AS milestones_not_checked,
       count(*) FILTER (WHERE band_source='teacher_override') AS teacher_decided_bands,
       count(*) FILTER (WHERE band_source='teacher_override' AND coalesce(btrim(override_reason),'')='') AS overrides_without_a_reason
FROM montree_evaluation_milestone_results;

\echo '== 7. feature flag is on for the demo school =='
SELECT s.slug, f.feature_key, f.enabled FROM montree_school_features f
JOIN montree_schools s ON s.id = f.school_id WHERE f.feature_key='child_evaluation';
