-- migrations/348_tracking_engine_fixes.sql
--
-- Tracking Engine v2 — WAVE 4, the fixes the independent audit confirmed.
-- Law: docs/tracking/TRACKING_CONSTITUTION.md.
-- Audit: docs/audits/2026-09-06-code-audit/08-verify-tracking.md (§3, §3b, §6b).
--
-- Three things, all idempotent:
--
--   1. montree_rebuild_child_progress() is made REPLAY-EQUIVALENT (§3). The version
--      in 346 takes "the newest row that changed something" per work. Its own
--      equivalence argument was that backward moves are never journalled as changes
--      — which was false: the door accepted downgrades and journalled them (that is
--      the §2 defect, fixed in lib/montree/progress/write-progress.ts this wave). So
--      the SQL rebuilt a child DOWN where lib/montree/tracking/ledger.ts replay()
--      refuses the row and keeps them UP. Whichever ran last decided the record.
--      The function now applies the ledger's own two rules before choosing a winner:
--        * a row with source 'correction' and NO reason is skipped entirely
--          (applyEvent → 'correction-without-reason');
--        * a BACKWARD row is skipped unless it is source 'correction' WITH a reason
--          (applyEvent → 'backward-without-correction').
--      tests/tracking/rebuild-parity.test.ts holds a TypeScript mirror of exactly
--      this selection rule and asserts it agrees with rebuiltRowsFor().
--
--   2. The PG 21000 hazard in the same function (§3b). It partitioned by work_key
--      while the INSERT's conflict target is (child_id, work_name); two keys sharing
--      one name therefore produced two rows aimed at one conflict target, which
--      Postgres refuses with 21000 ("ON CONFLICT DO UPDATE command cannot affect row
--      a second time") and the whole child aborts. The partition is now
--      COALESCE(work_key, work_name) and a second DISTINCT ON (work_name) stage
--      guarantees the INSERT sees each work_name exactly once.
--
--   3. A partial UNIQUE index on montree_child_progress (child_id, work_key) (§6b).
--      Rule 1 says one work, one key — but nothing enforced it, so the review-queue
--      resolver (writing the teacher's RAW string as work_name while stamping the
--      resolved key) produced a SECOND row for a work the child already had. Two
--      rows, one key, two independently mutable statuses. §3 below de-duplicates
--      what is already there — keeping the HIGHEST rung and journalling the merge,
--      never deleting silently — so the index can be created.
--
-- TIMEZONE NOTE (audit §5) — READ THIS BEFORE "FIXING" THE GUARD INDEX.
-- Migration 347's idx_montree_progress_events_one_move_per_day keys on
-- ((created_at AT TIME ZONE 'UTC')::date), and it stays that way. An index
-- expression must be IMMUTABLE, so it cannot consult the row's school to find out
-- which local day the timestamp fell on. It is therefore a COARSE CONCURRENCY GUARD
-- only: its job is to stop two simultaneous writers journalling the same rung twice,
-- and for that a slightly wrong day boundary costs nothing. THE AUTHORITATIVE
-- same-day rule is the code's: lib/montree/tracking/ledger.ts dedupeSameDay(),
-- which reads the day in the SCHOOL's IANA timezone (Ledger.timezone, resolved from
-- montree_schools.timezone via lib/montree/school-time.ts). Where the two disagree
-- — a Beijing 07:30 and 08:30 observation of one work, which are one school day and
-- two UTC days — the code refuses the second move and the index simply does not
-- object. The code is stricter; that is the intended direction.
--
-- IDEMPOTENT — CREATE OR REPLACE / IF NOT EXISTS / NOT EXISTS guards throughout.
-- Safe to paste twice; the second paste reports zero rows everywhere.
--
-- ---------------------------------------------------------------------------
-- DRY RUN — read-only, run BEFORE the migration.
-- ---------------------------------------------------------------------------
-- -- §3 will merge these: one child + one work_key spread over several rows.
-- SELECT child_id, work_key, COUNT(*) AS rows, array_agg(work_name) AS names,
--        array_agg(status) AS statuses
--   FROM montree_child_progress
--  WHERE work_key IS NOT NULL
--  GROUP BY child_id, work_key
-- HAVING COUNT(*) > 1
--  ORDER BY COUNT(*) DESC;
--
-- -- §2 would have aborted on these children (two keys under one name).
-- SELECT child_id, work_name, COUNT(DISTINCT work_key) AS keys
--   FROM montree_progress_events
--  WHERE work_key IS NOT NULL AND old_status IS DISTINCT FROM new_status
--  GROUP BY child_id, work_name
-- HAVING COUNT(DISTINCT work_key) > 1;
-- ---------------------------------------------------------------------------

BEGIN;


-- ---------------------------------------------------------------------------
-- 1. montree_rebuild_child_progress(child_id) — replay-equivalent, 21000-proof
-- ---------------------------------------------------------------------------
-- Selection rule, in the same order lib/montree/tracking/ledger.ts applies it:
--
--   status_rank: not_started 0, presented 1, practicing 2, mastered/completed 3
--   is_correction: lower(source) IN ('correction','teacher_correction')
--                  — the same alias set persistence.ts normaliseSource() maps to
--                    the engine's 'correction'
--   has_reason:    reason IS NOT NULL AND btrim(reason) <> ''
--
--   SKIP a row when   is_correction AND NOT has_reason        (correction-without-reason)
--   SKIP a row when   rank(new) < rank(old)
--                     AND NOT (is_correction AND has_reason)  (backward-without-correction)
--   otherwise the newest surviving row per work decides.
--
-- Evidence rows (old_status = new_status) are excluded as before: they are the
-- mechanism by which a duplicate observation is KEPT and they never decide a status.
--
-- presented_at / mastered_at remain the FIRST time each rung was reached, so a
-- rebuild reproduces the original dates rather than stamping now. A work since
-- corrected downwards keeps its historical mastered_at: the date a child once
-- mastered a work is a fact about the past.
CREATE OR REPLACE FUNCTION montree_rebuild_child_progress(p_child_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_count integer := 0;
BEGIN
  WITH ranked AS (
    SELECT e.work_key, e.work_name, e.area, e.classroom_id, e.school_id, e.new_status,
           e.created_at,
           CASE
             WHEN lower(coalesce(e.source, '')) IN ('correction', 'teacher_correction')
                  AND coalesce(btrim(e.reason), '') <> '' THEN true
             ELSE false
           END AS reasoned_correction,
           CASE lower(coalesce(e.new_status, ''))
             WHEN 'presented' THEN 1 WHEN 'practicing' THEN 2
             WHEN 'mastered' THEN 3 WHEN 'completed' THEN 3 ELSE 0 END AS new_rank,
           CASE lower(coalesce(e.old_status, ''))
             WHEN 'presented' THEN 1 WHEN 'practicing' THEN 2
             WHEN 'mastered' THEN 3 WHEN 'completed' THEN 3 ELSE 0 END AS old_rank,
           CASE
             WHEN lower(coalesce(e.source, '')) IN ('correction', 'teacher_correction')
             THEN true ELSE false
           END AS is_correction
      FROM montree_progress_events e
     WHERE e.child_id = p_child_id
       AND e.work_key IS NOT NULL
       AND e.work_name IS NOT NULL
       AND e.old_status IS DISTINCT FROM e.new_status
  ),
  accepted AS (
    -- The ledger's two refusals, applied before anything is chosen.
    SELECT r.*,
           ROW_NUMBER() OVER (
             -- COALESCE(work_key, work_name): the partition key must agree with the
             -- ON CONFLICT target below or two winners can aim at one row (PG 21000).
             PARTITION BY COALESCE(r.work_key, r.work_name)
             ORDER BY r.created_at DESC
           ) AS rn
      FROM ranked r
     WHERE NOT (r.is_correction AND NOT r.reasoned_correction)
       AND NOT (r.new_rank < r.old_rank AND NOT r.reasoned_correction)
  ),
  latest AS (
    -- One row per work_name for the INSERT: two distinct keys sharing a name would
    -- otherwise touch the same (child_id, work_name) row twice in one statement.
    SELECT DISTINCT ON (work_name)
           work_key, work_name, area, classroom_id, school_id, new_status
      FROM accepted
     WHERE rn = 1
     ORDER BY work_name, created_at DESC
  ),
  stamps AS (
    SELECT e.work_key,
           MIN(e.created_at) FILTER (WHERE e.new_status = 'presented') AS presented_at,
           MIN(e.created_at) FILTER (WHERE e.new_status IN ('mastered', 'completed')) AS mastered_at
      FROM montree_progress_events e
     WHERE e.child_id = p_child_id AND e.work_key IS NOT NULL
     GROUP BY e.work_key
  ),
  written AS (
    INSERT INTO montree_child_progress
      (child_id, work_name, work_key, area, status, classroom_id, school_id,
       presented_at, mastered_at, updated_at)
    SELECT p_child_id, l.work_name, l.work_key, l.area,
           CASE WHEN l.new_status = 'completed' THEN 'mastered' ELSE l.new_status END,
           l.classroom_id, l.school_id, s.presented_at, s.mastered_at, NOW()
      FROM latest l
      LEFT JOIN stamps s ON s.work_key = l.work_key
    ON CONFLICT (child_id, work_name) DO UPDATE SET
      work_key     = EXCLUDED.work_key,
      area         = COALESCE(EXCLUDED.area, montree_child_progress.area),
      status       = EXCLUDED.status,
      classroom_id = COALESCE(EXCLUDED.classroom_id, montree_child_progress.classroom_id),
      school_id    = COALESCE(EXCLUDED.school_id, montree_child_progress.school_id),
      presented_at = COALESCE(EXCLUDED.presented_at, montree_child_progress.presented_at),
      mastered_at  = COALESCE(EXCLUDED.mastered_at, montree_child_progress.mastered_at),
      updated_at   = NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM written;

  RETURN v_count;
END;
$fn$;

COMMENT ON FUNCTION montree_rebuild_child_progress(uuid) IS
  'RULE 3 (Tracking Constitution): rebuilds one child''s montree_child_progress rows from montree_progress_events alone. Server-side twin of lib/montree/tracking/persistence.ts rebuiltRowsFor(), and REPLAY-EQUIVALENT to it since migration 348: evidence rows are excluded, a correction without a reason is skipped, and a backward move counts only when it is a correction WITH a reason. Partitions on COALESCE(work_key, work_name) and collapses to one row per work_name so the ON CONFLICT (child_id, work_name) target can never be hit twice.';


-- ---------------------------------------------------------------------------
-- 2. De-duplicate montree_child_progress by (child_id, work_key)
-- ---------------------------------------------------------------------------
-- Prerequisite for §3. Rule 11: nothing is lost. The SURVIVOR is the row with the
-- HIGHEST rung (ties broken by the most recently updated), it inherits the earliest
-- presented_at / mastered_at of the group, and every row that goes away is
-- journalled first — source 'correction' with a reason, which is the only shape
-- rule 4 accepts for a row whose rung is being retired.
DO $$
DECLARE
  v_merged integer := 0;
  v_journalled integer := 0;
BEGIN
  CREATE TEMP TABLE tmp_348_dupes ON COMMIT DROP AS
  WITH ranked AS (
    SELECT p.id, p.child_id, p.work_key, p.work_name, p.status, p.area,
           p.classroom_id, p.school_id, p.presented_at, p.mastered_at,
           ROW_NUMBER() OVER (
             PARTITION BY p.child_id, p.work_key
             ORDER BY CASE lower(coalesce(p.status, ''))
                        WHEN 'mastered' THEN 3 WHEN 'completed' THEN 3
                        WHEN 'practicing' THEN 2 WHEN 'presented' THEN 1 ELSE 0 END DESC,
                      p.updated_at DESC NULLS LAST, p.id DESC
           ) AS rn,
           FIRST_VALUE(p.id) OVER (
             PARTITION BY p.child_id, p.work_key
             ORDER BY CASE lower(coalesce(p.status, ''))
                        WHEN 'mastered' THEN 3 WHEN 'completed' THEN 3
                        WHEN 'practicing' THEN 2 WHEN 'presented' THEN 1 ELSE 0 END DESC,
                      p.updated_at DESC NULLS LAST, p.id DESC
           ) AS keeper_id,
           COUNT(*) OVER (PARTITION BY p.child_id, p.work_key) AS group_size
      FROM montree_child_progress p
     WHERE p.work_key IS NOT NULL
  )
  SELECT * FROM ranked WHERE group_size > 1;

  -- The survivor keeps the earliest first-time stamps in its group: those dates are
  -- facts about the child, not about which row happened to win.
  UPDATE montree_child_progress k
     SET presented_at = LEAST(COALESCE(k.presented_at, g.presented_at), COALESCE(g.presented_at, k.presented_at)),
         mastered_at  = LEAST(COALESCE(k.mastered_at,  g.mastered_at),  COALESCE(g.mastered_at,  k.mastered_at))
    FROM (
      SELECT keeper_id, MIN(presented_at) AS presented_at, MIN(mastered_at) AS mastered_at
        FROM tmp_348_dupes GROUP BY keeper_id
    ) g
   WHERE k.id = g.keeper_id;

  -- Rule 3: the retirement of a rung is an EVENT before it is a DELETE.
  INSERT INTO montree_progress_events
    (child_id, school_id, classroom_id, work_key, work_name, area,
     old_status, new_status, source, actor, reason, created_at)
  SELECT d.child_id, d.school_id, d.classroom_id, d.work_key, d.work_name, d.area,
         CASE WHEN lower(coalesce(d.status, '')) = 'completed' THEN 'mastered'
              ELSE COALESCE(NULLIF(btrim(lower(d.status)), ''), 'not_started') END,
         'not_started',
         'correction',
         'migration-348',
         '348: duplicate cache row for work_key ' || d.work_key ||
           ' merged into the row that holds the highest rung (rule 1: one work, one key)',
         NOW()
    FROM tmp_348_dupes d
   WHERE d.rn > 1
     AND COALESCE(NULLIF(btrim(lower(d.status)), ''), 'not_started') <> 'not_started'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_journalled = ROW_COUNT;

  DELETE FROM montree_child_progress p
   USING tmp_348_dupes d
   WHERE p.id = d.id AND d.rn > 1;
  GET DIAGNOSTICS v_merged = ROW_COUNT;

  RAISE NOTICE '[348] % duplicate (child_id, work_key) row(s) merged away, % journalled', v_merged, v_journalled;
END $$;


-- ---------------------------------------------------------------------------
-- 3. RULE 1 AT THE STORAGE LAYER — one work, one key, one row
-- ---------------------------------------------------------------------------
-- (child_id, work_name) has been unique since migration 111; (child_id, work_key)
-- never was, which is how the review-queue resolver could write a second row under
-- the raw typed name for a work the child already had. PARTIAL because rule 1 is
-- about KEYED works: legacy keyless rows are not comparable to each other and must
-- not collide (rule 10 reports them separately — see the health route's 'no-key').
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_child_progress_child_work_key
  ON montree_child_progress (child_id, work_key)
  WHERE work_key IS NOT NULL;

COMMENT ON INDEX idx_montree_child_progress_child_work_key IS
  'RULE 1 (Tracking Constitution): one work, one key, one row per child. Stops a second montree_child_progress row being created for a work the child already holds under a different spelling of the name — the defect audit 08-verify-tracking §6b found in the review-queue resolver. Partial: keyless legacy rows are excluded and are reported by rule 10 instead.';


INSERT INTO montree_migrations (filename) VALUES ('348_tracking_engine_fixes.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION — run AFTER. Every count should be 0 except the two index rows.
-- ---------------------------------------------------------------------------
-- SELECT
--   (SELECT COUNT(*) FROM (
--      SELECT 1 FROM montree_child_progress WHERE work_key IS NOT NULL
--       GROUP BY child_id, work_key HAVING COUNT(*) > 1) d)      AS duplicate_key_rows,
--   (SELECT COUNT(*) FROM pg_indexes
--     WHERE indexname = 'idx_montree_child_progress_child_work_key') AS rule1_index,
--   (SELECT COUNT(*) FROM pg_indexes
--     WHERE indexname = 'idx_montree_progress_events_one_move_per_day') AS guard_index,
--   (SELECT COUNT(*) FROM montree_progress_events
--     WHERE actor = 'migration-348')                             AS merge_events,
--   (SELECT COUNT(*) FROM montree_migrations
--     WHERE filename = '348_tracking_engine_fixes.sql')          AS registered;
