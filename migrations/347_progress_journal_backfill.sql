-- migrations/347_progress_journal_backfill.sql
--
-- Tracking Engine v2 — HARDENING FOR REAL DATA AND REAL CONCURRENCY.
-- Law: docs/tracking/TRACKING_CONSTITUTION.md.
-- 314 created the journal, 344/345/346 built the engine's storage. 347 is the
-- first migration that has to cope with what is ALREADY in the database:
--
--   1. WORK_KEY REPAIR (rule 1, ONE WORK ONE KEY) — a montree_child_progress row
--      whose work_key is NULL but whose work_name matches EXACTLY ONE curriculum
--      row in the same classroom (case-insensitively) gets that key written in
--      place. This is a REPAIR, not a status change: nothing else on the row moves
--      and nothing is journalled, because no observation happened. Ambiguous names
--      (two curriculum rows answering to one name) are left alone — rule 5 says
--      ties are unknown, and 347 does not guess.
--
--   2. JOURNAL BACKFILL (rule 3, EVERY CHANGE IS AN EVENT) — montree_child_progress
--      is supposed to be a CACHE of montree_progress_events, but every row written
--      before the engine existed has no event behind it. That makes rule 10's
--      'status-without-event' invariant fire for the entire pre-engine history and
--      makes montree_rebuild_child_progress() destructive (it would rebuild a child
--      down to whatever thin journal exists). So each cache row with no journal row
--      of its own gets ONE synthetic event: not_started → its current status, source
--      'import', actor 'backfill-347', dated from the row itself. The history is
--      declared, not invented — the reason column says exactly where it came from.
--
--   3. THE CONCURRENCY GUARD (rules 3 + 4) — lib/montree/progress/write-progress.ts
--      applies the same-day dedupe by READING today's events and then WRITING. Two
--      teachers tapping the same child's same work at the same moment both read
--      "not moved yet" and both journal the move. A partial UNIQUE index makes that
--      race impossible in the database: one insert wins, the other gets 23505 and
--      the door reports it as 'duplicate-same-day' instead of double-journalling.
--      See "Duplicate photo same morning" in the constitution.
--
--   4. montree_latest_events_before(classroom, before) — the growth fix. loadLedger()
--      used to read every event a classroom ever produced. It now reads a 26-week
--      window PLUS, per (child, work), the last status-changing event before that
--      window, so the derived CURRENT STATE stays exact while the read stops growing
--      with the age of the school. This function is that second query.
--
-- RLS: no new tables, so no new policy surface. The tables touched keep the
-- convention from migration 275 §A and 313 — RLS ENABLED, ZERO POLICIES (deny-all
-- for anon + authenticated; the service-role key the server uses bypasses RLS). The
-- ENABLE statements at the bottom are idempotent RE-ASSERTIONS, not new grants. Do
-- NOT add a `FOR ALL USING (true)` policy: without `TO service_role` it defaults to
-- PUBLIC and re-opens exactly the hole 313 closed.
--
-- IMMUTABILITY: the guard index is on three bare columns plus
-- ((created_at AT TIME ZONE 'UTC')::date) — the immutable form, the same one
-- migration 345's review-queue dedupe index uses. Never created_at::date, which is
-- STABLE and is rejected by CREATE INDEX.
--
-- IDEMPOTENT — IF NOT EXISTS / CREATE OR REPLACE / NOT EXISTS guards / ON CONFLICT
-- throughout. Safe to paste twice; the second paste reports zero rows everywhere.
--
-- ---------------------------------------------------------------------------
-- DRY RUN — run this BEFORE the migration to see what §4 would do. Read-only.
-- ---------------------------------------------------------------------------
-- SELECT
--   COUNT(*)                                                         AS rows_to_backfill,
--   COUNT(*) FILTER (WHERE p.work_key IS NOT NULL)                   AS with_key,
--   COUNT(*) FILTER (WHERE p.work_key IS NULL)                       AS without_key,
--   COUNT(*) FILTER (WHERE p.status IN ('mastered', 'completed'))    AS as_mastered,
--   COUNT(*) FILTER (WHERE p.status = 'practicing')                  AS as_practicing,
--   COUNT(*) FILTER (WHERE p.status = 'presented')                   AS as_presented,
--   MIN(COALESCE(p.mastered_at, p.presented_at, p.updated_at, p.created_at)) AS oldest,
--   MAX(COALESCE(p.mastered_at, p.presented_at, p.updated_at, p.created_at)) AS newest
-- FROM montree_child_progress p
-- WHERE COALESCE(NULLIF(btrim(p.status), ''), 'not_started') <> 'not_started'
--   AND NOT EXISTS (
--     SELECT 1 FROM montree_progress_events e
--      WHERE e.child_id = p.child_id
--        AND ( (p.work_key IS NOT NULL AND e.work_key = p.work_key)
--              OR lower(btrim(e.work_name)) = lower(btrim(p.work_name)) )
--   );
--
-- And this one shows how many cache rows §1 can repair:
-- SELECT COUNT(*) AS repairable
--   FROM montree_child_progress p
--  WHERE p.work_key IS NULL AND p.classroom_id IS NOT NULL
--    AND (SELECT COUNT(*) FROM montree_classroom_curriculum_works w
--          WHERE w.classroom_id = p.classroom_id AND w.work_key IS NOT NULL
--            AND lower(btrim(w.name)) = lower(btrim(p.work_name))) = 1;
-- ---------------------------------------------------------------------------

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Defensive, so 347 can be pasted on an environment that skipped 345/346. Both are
-- the same statements those migrations run; neither does anything a second time.
ALTER TABLE montree_progress_events ADD COLUMN IF NOT EXISTS reason      TEXT;
ALTER TABLE montree_progress_events ADD COLUMN IF NOT EXISTS evidence_id UUID;


-- ---------------------------------------------------------------------------
-- 1. work_key repair — rule 1, and a prerequisite for §4
-- ---------------------------------------------------------------------------
-- Runs FIRST so the backfill in §4 copies the repaired key rather than journalling
-- another keyless row. Exact lower(name) match, scoped to the row's own classroom,
-- and only when the name resolves to exactly ONE work: a name that two curriculum
-- rows answer to is rule 5's tie, and a tie is unknown.
--
-- Nothing else on the row is touched — not status, not presented_at, not
-- mastered_at. `updated_at` deliberately does NOT move either: the observation is
-- as old as it ever was, and §4 dates the backfilled event off these stamps.
DO $$
DECLARE
  v_repaired integer := 0;
BEGIN
  UPDATE montree_child_progress p
     SET work_key = w.work_key
    FROM montree_classroom_curriculum_works w
   WHERE p.work_key IS NULL
     AND p.classroom_id IS NOT NULL
     AND w.classroom_id = p.classroom_id
     AND w.work_key IS NOT NULL
     AND lower(btrim(w.name)) = lower(btrim(p.work_name))
     AND NOT EXISTS (
       SELECT 1
         FROM montree_classroom_curriculum_works w2
        WHERE w2.classroom_id = p.classroom_id
          AND w2.work_key IS NOT NULL
          AND w2.work_key <> w.work_key
          AND lower(btrim(w2.name)) = lower(btrim(p.work_name))
     );
  GET DIAGNOSTICS v_repaired = ROW_COUNT;
  RAISE NOTICE '[347] work_key repaired on % montree_child_progress row(s) by exact classroom name match', v_repaired;
END $$;


-- ---------------------------------------------------------------------------
-- 2. Pre-existing same-day duplicates — demoted to evidence, never deleted
-- ---------------------------------------------------------------------------
-- The guard index in §3 cannot be created while the journal already contains two
-- status-changing rows for the same (child, work, status, UTC day). Legacy data has
-- them: an import that ran twice, a photo confirmed from two screens.
--
-- They are NOT deleted (rule 11: nothing is lost). They are demoted to EVIDENCE
-- rows — old_status := new_status — which is what the engine already believes about
-- them: lib/montree/tracking/ledger.ts applyEvent() rejects the second same-day move
-- as 'duplicate-same-day' with attachAsEvidence, and montree_rebuild_child_progress()
-- already excludes evidence rows from deciding a status. So this changes no derived
-- answer anywhere; it only makes the stored rows agree with the replay. The EARLIEST
-- row of each group — the one that actually moved the ladder — is left untouched.
DO $$
DECLARE
  v_demoted integer := 0;
BEGIN
  WITH ranked AS (
    SELECT e.id,
           ROW_NUMBER() OVER (
             PARTITION BY e.child_id, e.work_key, e.new_status,
                          ((e.created_at AT TIME ZONE 'UTC')::date)
             ORDER BY e.created_at, e.id
           ) AS rn
      FROM montree_progress_events e
     WHERE e.work_key IS NOT NULL
       AND e.old_status IS DISTINCT FROM e.new_status
  )
  UPDATE montree_progress_events e
     SET old_status = e.new_status,
         reason = COALESCE(e.reason || ' · ', '')
                  || '347: demoted to an evidence row — a second same-day move of the same rung, which the ledger already replayed as duplicate-same-day'
    FROM ranked r
   WHERE r.id = e.id
     AND r.rn > 1;
  GET DIAGNOSTICS v_demoted = ROW_COUNT;
  RAISE NOTICE '[347] % duplicate same-day journal row(s) demoted to evidence rows', v_demoted;
END $$;


-- ---------------------------------------------------------------------------
-- 3. THE CONCURRENCY GUARD — one rung, one child, one work, one day
-- ---------------------------------------------------------------------------
-- Rules 3 + 4 at the storage layer. lib/montree/progress/write-progress.ts reads
-- today's events and THEN writes; between the read and the write another request can
-- journal the same move. This index closes that window: the second insert raises
-- 23505 (unique_violation) and the door turns it into outcome 'skipped_noop' with
-- reason 'duplicate-same-day' — the same answer the in-memory dedupe would have
-- given, so a race and a slow double-tap are indistinguishable to the caller.
--
-- PARTIAL, deliberately, on both counts:
--   old_status IS DISTINCT FROM new_status  — EVIDENCE rows (old = new) are the
--     mechanism by which a duplicate observation is KEPT (migration 346). They must
--     stay unlimited: five photos of one work in one morning are five pieces of
--     evidence and zero ladder moves.
--   work_key IS NOT NULL — rule 1 keys the system; keyless legacy rows are not
--     comparable and must not collide with each other.
--
-- Corrections: a downgrade that lands on the same (child, work, status, day) as an
-- earlier move IS caught by this index. That is correct — the record already says
-- what the correction wants it to say, so re-writing it changes nothing — and the
-- door surfaces it as 'duplicate-same-day' rather than as an error.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_progress_events_one_move_per_day
  ON montree_progress_events (
    child_id,
    work_key,
    new_status,
    ((created_at AT TIME ZONE 'UTC')::date)
  )
  WHERE old_status IS DISTINCT FROM new_status AND work_key IS NOT NULL;

COMMENT ON INDEX idx_montree_progress_events_one_move_per_day IS
  'RULES 3+4 (Tracking Constitution): at most ONE status-changing journal row per (child, work_key, new_status, UTC day). The database half of lib/montree/tracking/ledger.ts dedupeSameDay(), so two simultaneous taps cannot both advance the same rung. A loser gets 23505 and write-progress.ts reports duplicate-same-day. Evidence rows (old_status = new_status) are excluded and stay unlimited.';


-- ---------------------------------------------------------------------------
-- 4. THE JOURNAL BACKFILL — rule 3, for the pre-engine history
-- ---------------------------------------------------------------------------
-- ONE row per cache row that the journal cannot account for. Matched on work_key
-- when the cache row has one, and on the case-insensitive work_name either way, so
-- a row whose key was only repaired in §1 is not double-counted against events that
-- were journalled under its name.
--
-- 'not_started' cache rows are skipped: not_started → not_started is not a change,
-- it would be a fabricated event, and rule 10's invariant derives 'not_started' for
-- an absent key anyway. Migration 111's legacy 'completed' maps to 'mastered', the
-- same mapping lib/montree/tracking/persistence.ts normaliseStatus() applies.
--
-- created_at is the row's OWN best date, so the ribbon and the weekly reads put the
-- history where it happened rather than all on migration day.
--
-- Two protections against emitting the same event twice: DISTINCT ON collapses two
-- IDENTICAL source rows, and ON CONFLICT DO NOTHING defers to §3's guard index for
-- two SPELLINGS of one keyed work (and for a re-paste of this whole migration).
INSERT INTO montree_progress_events
  (child_id, school_id, classroom_id, work_key, work_name, area,
   old_status, new_status, source, actor, reason, created_at)
SELECT DISTINCT ON (b.child_id, b.work_key, b.work_name, b.new_status, ((b.created_at AT TIME ZONE 'UTC')::date))
       b.child_id, b.school_id, b.classroom_id, b.work_key, b.work_name, b.area,
       b.old_status, b.new_status, b.source, b.actor, b.reason, b.created_at
FROM (
  SELECT p.child_id,
         p.school_id,
         p.classroom_id,
         p.work_key,
         p.work_name,
         p.area,
         'not_started'::text AS old_status,
         CASE WHEN btrim(lower(p.status)) = 'completed' THEN 'mastered'
              ELSE btrim(lower(p.status)) END AS new_status,
         'import'::text      AS source,
         'backfill-347'::text AS actor,
         'journal backfill from cache (pre-engine history)'::text AS reason,
         COALESCE(p.mastered_at, p.presented_at, p.updated_at, p.created_at, NOW()) AS created_at
    FROM montree_child_progress p
   WHERE COALESCE(NULLIF(btrim(lower(p.status)), ''), 'not_started') <> 'not_started'
     AND btrim(lower(p.status)) IN ('presented', 'practicing', 'mastered', 'completed')
     AND p.work_name IS NOT NULL
     AND btrim(p.work_name) <> ''
     AND NOT EXISTS (
       SELECT 1
         FROM montree_progress_events e
        WHERE e.child_id = p.child_id
          AND ( (p.work_key IS NOT NULL AND e.work_key = p.work_key)
                OR lower(btrim(e.work_name)) = lower(btrim(p.work_name)) )
     )
) AS b
-- work_name is part of the DISTINCT ON, not just work_key: NULLs compare EQUAL to
-- DISTINCT ON, so keying on work_key alone would silently collapse two DIFFERENT
-- keyless works into one row. Two spellings of one KEYED work still collapse — via
-- ON CONFLICT against the guard index in §3 above, which is the same rule at the same
-- granularity.
ORDER BY b.child_id, b.work_key, b.work_name, b.new_status,
         ((b.created_at AT TIME ZONE 'UTC')::date), b.created_at
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 5. montree_latest_events_before(classroom, before) — the windowed read's carry-in
-- ---------------------------------------------------------------------------
-- lib/montree/tracking/persistence.ts loadLedger() now reads a bounded window
-- (default: the Monday of the current week minus 26 weeks). A window alone would be
-- WRONG — a work mastered two years ago and never touched since would silently drop
-- back to 'not_started' — so the loader also asks for the last status-changing event
-- before the window for every (child, work) pair. That is this function: one
-- DISTINCT ON per pair instead of one round trip per pair.
--
-- Only status-CHANGING rows are returned: evidence rows never decide a status
-- (the same exclusion montree_rebuild_child_progress() makes), and carrying them
-- would inflate the observation counts the guidance engine reads.
--
-- Classroom matching is deliberately generous. Journal rows written before
-- migration 311's stamps, or by a path that could not resolve the classroom, carry
-- classroom_id NULL; those rows are still that classroom's history, so a row also
-- matches when its CHILD is on the classroom's roster today.
--
-- STABLE + SECURITY INVOKER (the default): the server calls this with the
-- service-role key, exactly like every other read on these tables. It is not
-- granted to anon/authenticated, so it adds no RLS surface.
CREATE OR REPLACE FUNCTION montree_latest_events_before(
  p_classroom_id uuid,
  p_before       timestamptz
)
RETURNS TABLE (
  child_id     uuid,
  classroom_id uuid,
  work_key     text,
  work_name    text,
  area         text,
  old_status   text,
  new_status   text,
  source       text,
  actor        text,
  created_at   timestamptz,
  reason       text,
  evidence_id  uuid
)
LANGUAGE sql
STABLE
AS $fn$
  SELECT DISTINCT ON (e.child_id, e.work_key)
         e.child_id, e.classroom_id, e.work_key, e.work_name, e.area,
         e.old_status, e.new_status, e.source, e.actor, e.created_at,
         e.reason, e.evidence_id
    FROM montree_progress_events e
   WHERE e.created_at < p_before
     AND e.work_key IS NOT NULL
     AND e.old_status IS DISTINCT FROM e.new_status
     AND (
       e.classroom_id = p_classroom_id
       OR e.child_id IN (
         SELECT c.id FROM montree_children c WHERE c.classroom_id = p_classroom_id
       )
     )
   ORDER BY e.child_id, e.work_key, e.created_at DESC, e.id DESC;
$fn$;

COMMENT ON FUNCTION montree_latest_events_before(uuid, timestamptz) IS
  'Carry-in for the windowed ledger read: the LAST status-changing montree_progress_events row before p_before, per (child_id, work_key), for one classroom. Lets lib/montree/tracking/persistence.ts loadLedger() bound its window without ever losing a child''s current state. Evidence rows (old_status = new_status) are excluded because they never decide a status.';


-- ---------------------------------------------------------------------------
-- 6. RLS posture — re-asserted, not changed (see the header)
-- ---------------------------------------------------------------------------
ALTER TABLE montree_progress_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_child_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_progress_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access progress events" ON montree_progress_events;

INSERT INTO montree_migrations (filename) VALUES ('347_progress_journal_backfill.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION — run this AFTER the migration. Every count should be 0 except
-- backfilled_rows and the guard index row.
-- ---------------------------------------------------------------------------
-- SELECT
--   (SELECT COUNT(*) FROM montree_progress_events
--     WHERE actor = 'backfill-347')                            AS backfilled_rows,
--   (SELECT COUNT(*) FROM montree_child_progress p
--     WHERE COALESCE(NULLIF(btrim(lower(p.status)), ''), 'not_started') <> 'not_started'
--       AND NOT EXISTS (SELECT 1 FROM montree_progress_events e
--                        WHERE e.child_id = p.child_id
--                          AND ((p.work_key IS NOT NULL AND e.work_key = p.work_key)
--                               OR lower(btrim(e.work_name)) = lower(btrim(p.work_name)))))
--                                                              AS status_without_event,
--   (SELECT COUNT(*) FROM montree_child_progress
--     WHERE work_key IS NULL)                                  AS cache_rows_still_keyless,
--   (SELECT COUNT(*) FROM (
--      SELECT 1 FROM montree_progress_events
--       WHERE work_key IS NOT NULL AND old_status IS DISTINCT FROM new_status
--       GROUP BY child_id, work_key, new_status, ((created_at AT TIME ZONE 'UTC')::date)
--      HAVING COUNT(*) > 1) d)                                 AS same_day_duplicates,
--   (SELECT COUNT(*) FROM pg_indexes
--     WHERE indexname = 'idx_montree_progress_events_one_move_per_day')
--                                                              AS guard_index,
--   (SELECT COUNT(*) FROM pg_proc
--     WHERE proname = 'montree_latest_events_before')           AS carry_in_fn,
--   (SELECT COUNT(*) FROM montree_migrations
--     WHERE filename = '347_progress_journal_backfill.sql')     AS registered;
--
-- Cache/journal drift — rule 10's new 'cache-journal-drift' check, in SQL. Should be
-- empty; every row it returns is one `POST /api/montree/tracking/rebuild` away.
-- SELECT p.child_id, p.work_key, p.status AS cached, j.new_status AS journal
--   FROM montree_child_progress p
--   JOIN LATERAL (
--     SELECT e.new_status FROM montree_progress_events e
--      WHERE e.child_id = p.child_id AND e.work_key = p.work_key
--        AND e.old_status IS DISTINCT FROM e.new_status
--      ORDER BY e.created_at DESC, e.id DESC LIMIT 1
--   ) j ON TRUE
--  WHERE p.work_key IS NOT NULL
--    AND CASE WHEN p.status = 'completed' THEN 'mastered' ELSE p.status END
--        IS DISTINCT FROM CASE WHEN j.new_status = 'completed' THEN 'mastered' ELSE j.new_status END;
