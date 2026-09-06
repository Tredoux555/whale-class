-- migrations/349_progress_keys_backfill.sql
--
-- Tracking Engine v2 — THE KEY REPAIR, from the 2026-09-06 Whale-class burn-in.
-- Law: docs/tracking/TRACKING_CONSTITUTION.md. Report: docs/tracking/burnin-whale-2026-09-06-report.md.
--
-- WHAT THE LIVE CLASSROOM ACTUALLY LOOKS LIKE (2026-09-06, one class, 19 children):
--   1,145 journal events with work_key IS NULL, spread over 388 distinct work names,
--   against a classroom curriculum of 651 works. Run through the ONE reader
--   (lib/montree/tracking/resolve.ts) 376 of those 388 names resolve to exactly one
--   work — 1,124 of the 1,145 events. The remaining 12 names (21 events) are either
--   a TIE (three works share the name "Montessori Bells"; "Clock Work" and "Calendar
--   Work" exist twice each) or a work this classroom simply does not carry.
--
-- 347 §1 already repairs montree_child_progress by EXACT lower(name). This migration
-- goes two steps further and covers the table 347 never touched:
--
--   * montree_progress_events as well as montree_child_progress. The journal is the
--     source of truth (rule 3); a keyless event is invisible to every replay, so the
--     cache repair alone leaves a rebuild able to erase real history.
--   * a CANONICAL name match on top of the exact one: lower / trim / punctuation
--     stripped / '&' spelled out / plural-insensitive, and then the same again with
--     parenthetical glosses and dash suffixes removed — so "Command Cards" finds
--     "Command Cards (Action Reading)" and "Color Box 2" finds "Color Box 2
--     (Secondary Colors)". montree_canonical_work_name() below is the SQL mirror of
--     canonicalName() in lib/montree/tracking/resolve.ts; keep them in step.
--
-- ONLY WHEN THE MATCH IS UNIQUE WITHIN THE CHILD'S CLASSROOM. Rule 5: a tie is
-- unknown, and this migration does not guess. Everything it cannot settle is left
-- exactly as it is and counted at the end, for the review queue and for a human.
--
-- NOTHING IS LOST (rule 11). No row is deleted. The only status this migration
-- touches is in §7, and there only to DEMOTE a repaired duplicate to an evidence
-- row (old_status = new_status), which is what the ledger already replays it as.
--
-- IDEMPOTENT. Every statement is guarded on the state it changes; a second paste
-- reports zeros everywhere. Verified on a scratch Postgres 16 seeded from
-- docs/tracking/burnin-whale-2026-09-06.json: run 1 repairs 376 cache rows and
-- 1,124 events and disambiguates 4 curriculum names; runs 2 and 3 repair nothing.
-- §8's renames deliberately do NOT unblock a later repair — montree_burnin_
-- ambiguous_name() keeps the three names that were ties at burn-in time out of
-- every pass, for ever. Nobody knows which shelf a 2026 "Clock Work" observation
-- happened on, and rule 5 says a tie is unknown.
--
-- RLS: no new tables. montree_progress_events and montree_child_progress keep the
-- convention from 275 §A / 313 — RLS ENABLED, ZERO POLICIES (deny-all for anon and
-- authenticated; the server's service-role key bypasses RLS). Do NOT add a
-- `FOR ALL USING (true)` policy here.
--
-- ===========================================================================
-- DRY RUN — read-only. Run this FIRST; it changes nothing and prints exactly
-- what the migration below would repair. Requires §0's helper functions, so run
-- §0 (the two CREATE OR REPLACE FUNCTIONs) first, or read the counts after.
-- ===========================================================================
--
-- -- 1. How many keyless rows are there, and how many names?
-- SELECT 'events' AS table, COUNT(*) AS keyless_rows, COUNT(DISTINCT lower(btrim(work_name))) AS distinct_names
--   FROM montree_progress_events WHERE work_key IS NULL
-- UNION ALL
-- SELECT 'cache', COUNT(*), COUNT(DISTINCT lower(btrim(work_name)))
--   FROM montree_child_progress WHERE work_key IS NULL;
--
-- -- 2. What would be repaired, name by name, and by which pass?
-- WITH keyless AS (
--   SELECT e.id, e.work_name,
--          COALESCE(e.classroom_id, c.classroom_id) AS classroom_id
--     FROM montree_progress_events e
--     LEFT JOIN montree_children c ON c.id = e.child_id
--    WHERE e.work_key IS NULL
-- ), matched AS (
--   SELECT k.work_name,
--          (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
--            WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
--              AND lower(btrim(w.name)) = lower(btrim(k.work_name)))                        AS exact_hits,
--          (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
--            WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
--              AND montree_canonical_work_name(w.name) = montree_canonical_work_name(k.work_name)) AS canonical_hits,
--          (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
--            WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
--              AND montree_base_work_name(w.name) = montree_base_work_name(k.work_name))     AS base_hits
--     FROM keyless k
-- )
-- SELECT work_name, COUNT(*) AS rows,
--        CASE WHEN MIN(exact_hits) = 1 THEN 'exact'
--             WHEN MIN(canonical_hits) = 1 THEN 'canonical'
--             WHEN MIN(base_hits) = 1 THEN 'alias (parenthetical/dash)'
--             WHEN MIN(canonical_hits) > 1 OR MIN(base_hits) > 1 THEN 'AMBIGUOUS — left alone (rule 5)'
--             ELSE 'NO MATCH — left alone (review queue)' END AS verdict
--   FROM matched GROUP BY work_name ORDER BY COUNT(*) DESC, work_name;
--
-- -- 3. Which cache rows disagree with the journal (§9's targets)?
-- SELECT p.child_id, p.work_key, p.status AS cached
--   FROM montree_child_progress p
--  WHERE p.work_key IS NOT NULL
--    AND EXISTS (SELECT 1 FROM montree_progress_events e
--                 WHERE e.child_id = p.child_id AND e.work_key = p.work_key
--                   AND e.old_status IS DISTINCT FROM e.new_status)
--    AND p.status IS DISTINCT FROM (
--          SELECT e.new_status FROM montree_progress_events e
--           WHERE e.child_id = p.child_id AND e.work_key = p.work_key
--             AND e.old_status IS DISTINCT FROM e.new_status
--           ORDER BY e.created_at DESC, e.id DESC LIMIT 1);
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. The two name functions — the SQL mirror of lib/montree/tracking/resolve.ts
-- ---------------------------------------------------------------------------
-- montree_canonical_work_name()  = canonicalName(): lowercase, '&' spelled out,
--   punctuation to spaces, collapsed, and every word folded to its singular by
--   the SAME conservative rules (ies→y, (ch|sh|s|x|z)es→ -es, trailing s, with
--   ss/us/is/as/os and words of three letters or fewer left alone), plus the
--   handful of British/house spellings the reader carries.
--
-- montree_base_work_name()       = the alias pass's second form: the same thing
--   with parenthetical glosses and a trailing " - …" / " : …" removed, so
--   "Command Cards (Action Reading)" and "Command Cards" agree.
--
-- IMMUTABLE, so both can be used in an index later if this ever needs one.
CREATE OR REPLACE FUNCTION montree_canonical_work_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT COALESCE(string_agg(folded, ' ' ORDER BY ord), '')
  FROM (
    SELECT ord,
           CASE
             WHEN length(word) <= 3                THEN word
             WHEN word ~ '(ss|us|is|as|os)$'        THEN word
             WHEN word ~ 'ies$'                     THEN left(word, length(word) - 3) || 'y'
             WHEN word ~ '(ch|sh|s|x|z)es$'         THEN left(word, length(word) - 2)
             WHEN word ~ 's$'                       THEN left(word, length(word) - 1)
             ELSE word
           END AS folded
      FROM regexp_split_to_table(
             btrim(regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(
                     regexp_replace(
                       regexp_replace(lower(replace(COALESCE(p_name, ''), '&', ' and ')),
                                      '\mmoveable\M', 'movable', 'g'),
                       '\mcolours?\M', 'colors', 'g'),
                     '\mcolour\M', 'color', 'g'),
                   '\mgrey\M', 'gray', 'g'),
                 '\mpractise\M', 'practice', 'g'),
               '[^a-z0-9]+', ' ', 'g')),
             ' '
           ) WITH ORDINALITY AS t(word, ord)
     WHERE word <> ''
  ) s;
$fn$;

CREATE OR REPLACE FUNCTION montree_base_work_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT montree_canonical_work_name(
    regexp_replace(
      regexp_replace(
        regexp_replace(COALESCE(p_name, ''), '\([^)]*\)', ' ', 'g'),  -- drop "(Action Reading)"
        '\[[^\]]*\]', ' ', 'g'),                                     -- drop "[…]"
      '\s+[-–—:,]\s+.*$', '', '')                                    -- drop " - Easy Items"
  );
$fn$;

-- The names that were AMBIGUOUS when the burn-in ran (§8 renames the duplicate
-- curriculum rows so a teacher can type each one from now on). A legacy row
-- carrying one of these names must NEVER be repaired by the passes below, not
-- even on a second paste after the rename has made the name look unique: nobody
-- knows whether a 2026 observation of "Clock Work" happened on the Mathematics
-- shelf or the Cultural one, and rule 5 says a tie is unknown. They go to the
-- review queue, where a human answers it.
CREATE OR REPLACE FUNCTION montree_burnin_ambiguous_name(p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT montree_base_work_name(p_name) IN (
    montree_base_work_name('Clock Work'),
    montree_base_work_name('Calendar Work'),
    montree_base_work_name('Montessori Bells')
  );
$fn$;

-- The classroom each keyless row belongs to: the row's own classroom_id when it
-- has one, otherwise the child's. A row with neither is not repairable — there is
-- no curriculum to match it against — and is left alone.
CREATE OR REPLACE VIEW montree_v_keyless_events AS
  SELECT e.id, e.child_id, e.work_name,
         COALESCE(e.classroom_id, c.classroom_id) AS classroom_id
    FROM montree_progress_events e
    LEFT JOIN montree_children c ON c.id = e.child_id
   WHERE e.work_key IS NULL
     AND NOT montree_burnin_ambiguous_name(e.work_name);

CREATE OR REPLACE VIEW montree_v_keyless_progress AS
  SELECT p.id, p.child_id, p.work_name,
         COALESCE(p.classroom_id, c.classroom_id) AS classroom_id
    FROM montree_child_progress p
    LEFT JOIN montree_children c ON c.id = p.child_id
   WHERE p.work_key IS NULL
     AND NOT montree_burnin_ambiguous_name(p.work_name);


-- ---------------------------------------------------------------------------
-- 1-3. montree_child_progress — the CACHE
-- ---------------------------------------------------------------------------
-- Three passes, strictly in order, each only where the previous left the row
-- keyless, and each only when the classroom answers with exactly ONE work_key.
-- Nothing else on the row moves: not status, not presented_at, not mastered_at,
-- not updated_at. No observation happened; a key was written down.
DO $$
DECLARE
  v_exact integer := 0;
  v_canonical integer := 0;
  v_base integer := 0;
BEGIN
  -- §1 EXACT lower(btrim(name)) — the same pass as 347 §1, repeated because 349
  -- must be safe to run on a database where 347 was never pasted.
  UPDATE montree_child_progress p
     SET work_key = m.work_key
    FROM (
      SELECT k.id,
             (SELECT MIN(w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND lower(btrim(w.name)) = lower(btrim(k.work_name))) AS work_key,
             (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND lower(btrim(w.name)) = lower(btrim(k.work_name))) AS hits
        FROM montree_v_keyless_progress k
       WHERE k.classroom_id IS NOT NULL
    ) m
   WHERE p.id = m.id AND m.hits = 1 AND p.work_key IS NULL;
  GET DIAGNOSTICS v_exact = ROW_COUNT;

  -- §2 CANONICAL: case, punctuation, '&', plurals, house spellings.
  UPDATE montree_child_progress p
     SET work_key = m.work_key
    FROM (
      SELECT k.id,
             (SELECT MIN(w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_canonical_work_name(w.name) = montree_canonical_work_name(k.work_name)) AS work_key,
             (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_canonical_work_name(w.name) = montree_canonical_work_name(k.work_name)) AS hits
        FROM montree_v_keyless_progress k
       WHERE k.classroom_id IS NOT NULL
    ) m
   WHERE p.id = m.id AND m.hits = 1 AND p.work_key IS NULL;
  GET DIAGNOSTICS v_canonical = ROW_COUNT;

  -- §3 ALIAS: the same, with parenthetical glosses and dash suffixes removed.
  UPDATE montree_child_progress p
     SET work_key = m.work_key
    FROM (
      SELECT k.id,
             (SELECT MIN(w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_base_work_name(w.name) = montree_base_work_name(k.work_name)) AS work_key,
             (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_base_work_name(w.name) = montree_base_work_name(k.work_name)) AS hits
        FROM montree_v_keyless_progress k
       WHERE k.classroom_id IS NOT NULL
    ) m
   WHERE p.id = m.id AND m.hits = 1 AND p.work_key IS NULL;
  GET DIAGNOSTICS v_base = ROW_COUNT;

  RAISE NOTICE '[349] montree_child_progress work_key repaired: % exact, % canonical, % alias (total %)',
    v_exact, v_canonical, v_base, v_exact + v_canonical + v_base;
END $$;


-- ---------------------------------------------------------------------------
-- 4-6. montree_progress_events — the JOURNAL (the table 347 never touched)
-- ---------------------------------------------------------------------------
-- IMPORTANT — the one-move-per-day guard. 347 §3 created a UNIQUE index on
-- (child_id, work_key, new_status, UTC day) for STATUS-CHANGING rows with a
-- work_key. Keyless rows are outside it, so two keyless events that resolve to
-- the same key on the same day would collide the moment the key is written.
--
-- The repair therefore keeps the EARLIEST row of each such group as the ladder
-- move and demotes the rest to EVIDENCE rows (old_status = new_status) in the
-- same statement — which is what lib/montree/tracking/ledger.ts applyEvent()
-- already replays them as ('duplicate-same-day', attachAsEvidence). Nothing is
-- deleted (rule 11) and no derived answer changes; the stored rows simply stop
-- contradicting the replay. A row that would collide with an ALREADY-KEYED event
-- is demoted for the same reason.
DO $$
DECLARE
  v_exact integer := 0;
  v_canonical integer := 0;
  v_base integer := 0;
  v_demoted integer := 0;
BEGIN
  -- §4 EXACT.
  UPDATE montree_progress_events e
     SET work_key = m.work_key
    FROM (
      SELECT k.id,
             (SELECT MIN(w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND lower(btrim(w.name)) = lower(btrim(k.work_name))) AS work_key,
             (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND lower(btrim(w.name)) = lower(btrim(k.work_name))) AS hits
        FROM montree_v_keyless_events k
       WHERE k.classroom_id IS NOT NULL
    ) m
   WHERE e.id = m.id AND m.hits = 1 AND e.work_key IS NULL;
  GET DIAGNOSTICS v_exact = ROW_COUNT;

  -- §5 CANONICAL.
  UPDATE montree_progress_events e
     SET work_key = m.work_key
    FROM (
      SELECT k.id,
             (SELECT MIN(w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_canonical_work_name(w.name) = montree_canonical_work_name(k.work_name)) AS work_key,
             (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_canonical_work_name(w.name) = montree_canonical_work_name(k.work_name)) AS hits
        FROM montree_v_keyless_events k
       WHERE k.classroom_id IS NOT NULL
    ) m
   WHERE e.id = m.id AND m.hits = 1 AND e.work_key IS NULL;
  GET DIAGNOSTICS v_canonical = ROW_COUNT;

  -- §6 ALIAS.
  UPDATE montree_progress_events e
     SET work_key = m.work_key
    FROM (
      SELECT k.id,
             (SELECT MIN(w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_base_work_name(w.name) = montree_base_work_name(k.work_name)) AS work_key,
             (SELECT COUNT(DISTINCT w.work_key) FROM montree_classroom_curriculum_works w
               WHERE w.classroom_id = k.classroom_id AND w.work_key IS NOT NULL
                 AND montree_base_work_name(w.name) = montree_base_work_name(k.work_name)) AS hits
        FROM montree_v_keyless_events k
       WHERE k.classroom_id IS NOT NULL
    ) m
   WHERE e.id = m.id AND m.hits = 1 AND e.work_key IS NULL;
  GET DIAGNOSTICS v_base = ROW_COUNT;

  RAISE NOTICE '[349] montree_progress_events work_key repaired: % exact, % canonical, % alias (total %)',
    v_exact, v_canonical, v_base, v_exact + v_canonical + v_base;

  -- §7 The demotion that makes §4-§6 safe under 347 §3's guard.
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
                  || '349: demoted to an evidence row — a second same-day move of the same rung, '
                  || 'which the ledger already replays as duplicate-same-day'
    FROM ranked r
   WHERE r.id = e.id
     AND r.rn > 1;
  GET DIAGNOSTICS v_demoted = ROW_COUNT;
  RAISE NOTICE '[349] % journal row(s) demoted to evidence rows after the key repair', v_demoted;
END $$;

-- The guard index itself, in case 347 has not been pasted on this database. It is
-- created AFTER the demotion above, which is what makes it creatable at all.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_progress_events_one_move_per_day
  ON montree_progress_events (
    child_id,
    work_key,
    new_status,
    ((created_at AT TIME ZONE 'UTC')::date)
  )
  WHERE work_key IS NOT NULL AND old_status IS DISTINCT FROM new_status;


-- ---------------------------------------------------------------------------
-- 8. The three duplicate work NAMES the burn-in found (invariant duplicate-work-name)
-- ---------------------------------------------------------------------------
-- "3 works share the name montessori bells: se_bells, cu_bells, custom_cultural_1776219405178."
-- "2 works share the name clock work: ma_clock, cu_clock."
-- "2 works share the name calendar work: ma_calendar, cu_calendar."
--
-- ROOT CAUSE: the classroom curriculum seed copies one work into two areas under
-- the same name (the bells are both a Sensorial sound-grading material and a
-- Cultural music one; clock and calendar are both Mathematics time work and
-- Cultural calendar work), and a teacher then hand-created a third Bells row.
--
-- CONSEQUENCE: rule 6 can never resolve the bare name — the reader returns a TIE,
-- so every "Montessori Bells" a teacher types goes to the review queue instead of
-- to a child. Renaming the non-primary copies is the only fix; nothing is deleted
-- and no progress row is touched (both keys keep their rows and their history).
--
-- The renamed forms are still ambiguous when a teacher types the BARE name — the
-- reader strips parentheticals in its alias pass and correctly refuses the tie —
-- but each row is now individually typeable, and rule 10 stops reporting it.
DO $$
DECLARE
  v_renamed integer := 0;
  v_n integer := 0;
BEGIN
  UPDATE montree_classroom_curriculum_works SET name = 'Montessori Bells (Music)'
   WHERE work_key = 'cu_bells' AND lower(btrim(name)) = 'montessori bells';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_renamed := v_renamed + v_n;

  UPDATE montree_classroom_curriculum_works SET name = 'Montessori Bells (Classroom Copy)'
   WHERE work_key LIKE 'custom_cultural_%' AND lower(btrim(name)) = 'montessori bells';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_renamed := v_renamed + v_n;

  UPDATE montree_classroom_curriculum_works SET name = 'Clock Work (Time of Day)'
   WHERE work_key = 'cu_clock' AND lower(btrim(name)) = 'clock work';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_renamed := v_renamed + v_n;

  UPDATE montree_classroom_curriculum_works SET name = 'Calendar Work (Months and Seasons)'
   WHERE work_key = 'cu_calendar' AND lower(btrim(name)) = 'calendar work';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_renamed := v_renamed + v_n;

  RAISE NOTICE '[349] % duplicate curriculum work name(s) disambiguated', v_renamed;
END $$;


-- ---------------------------------------------------------------------------
-- 9. cache-journal-drift — the journal is the truth (rule 3)
-- ---------------------------------------------------------------------------
-- The burn-in found two: pl_carrying_mat cached 'presented' for two children while
-- the journal replays 'practicing'. The journal is AHEAD of the cache, which is a
-- lost or overwritten cache write, not a lost observation.
--
-- The authoritative repair is the engine's own replay — POST /api/montree/tracking/
-- rebuild, or montree_rebuild_child_progress(child_id) from migration 346 — because
-- only that applies rule 4 (forward-only, corrections excepted). This block calls
-- it, and ONLY for children who have no 'status-without-event' rows: a rebuild of a
-- child whose cache holds pre-engine statuses the journal cannot prove would ERASE
-- them (347's warning). Run 347 §4's journal backfill first and those children
-- become eligible on the next run of this migration.
DO $$
DECLARE
  v_child uuid;
  v_rebuilt integer := 0;
  v_skipped integer := 0;
BEGIN
  IF to_regprocedure('montree_rebuild_child_progress(uuid)') IS NULL THEN
    RAISE NOTICE '[349] montree_rebuild_child_progress() not present (migration 346 not pasted) — drift left for the API rebuild';
  ELSE
    FOR v_child IN
      SELECT DISTINCT p.child_id
        FROM montree_child_progress p
       WHERE p.work_key IS NOT NULL
         AND EXISTS (SELECT 1 FROM montree_progress_events e
                      WHERE e.child_id = p.child_id AND e.work_key = p.work_key
                        AND e.old_status IS DISTINCT FROM e.new_status)
         AND p.status IS DISTINCT FROM (
               SELECT e.new_status FROM montree_progress_events e
                WHERE e.child_id = p.child_id AND e.work_key = p.work_key
                  AND e.old_status IS DISTINCT FROM e.new_status
                ORDER BY e.created_at DESC, e.id DESC LIMIT 1)
    LOOP
      -- Never rebuild a child who still holds a status the journal cannot account
      -- for: the rebuild would delete it.
      IF EXISTS (
        SELECT 1 FROM montree_child_progress p2
         WHERE p2.child_id = v_child
           AND COALESCE(NULLIF(btrim(p2.status), ''), 'not_started') <> 'not_started'
           AND NOT EXISTS (SELECT 1 FROM montree_progress_events e2
                            WHERE e2.child_id = p2.child_id
                              AND (e2.work_key = p2.work_key
                                   OR lower(btrim(e2.work_name)) = lower(btrim(p2.work_name))))
      ) THEN
        v_skipped := v_skipped + 1;
      ELSE
        PERFORM montree_rebuild_child_progress(v_child);
        v_rebuilt := v_rebuilt + 1;
      END IF;
    END LOOP;
    RAISE NOTICE '[349] cache-journal drift: % child(ren) rebuilt, % skipped (journal backfill 347 §4 owed first)',
      v_rebuilt, v_skipped;
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 10. What is LEFT — the review queue's work, not this migration's
-- ---------------------------------------------------------------------------
-- Rule 5: everything below is a name that resolves to two works or to none. It is
-- reported, never guessed. The expected shape after this migration on the Whale
-- class is 21 event rows over 12 names.
DO $$
DECLARE
  v_events integer;
  v_names integer;
  v_cache integer;
  r RECORD;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT lower(btrim(work_name)))
    INTO v_events, v_names
    FROM montree_progress_events WHERE work_key IS NULL;
  SELECT COUNT(*) INTO v_cache FROM montree_child_progress WHERE work_key IS NULL;

  RAISE NOTICE '[349] REMAINING: % journal event(s) over % distinct name(s); % cache row(s) still keyless',
    v_events, v_names, v_cache;

  FOR r IN
    SELECT lower(btrim(work_name)) AS name, COUNT(*) AS rows
      FROM montree_progress_events
     WHERE work_key IS NULL
     GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 25
  LOOP
    RAISE NOTICE '[349]   unresolved: "%" — % row(s)', r.name, r.rows;
  END LOOP;
END $$;

-- The convention from 275 §A / 313, re-asserted. Idempotent; adds no policy.
ALTER TABLE montree_progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_child_progress  ENABLE ROW LEVEL SECURITY;

COMMIT;
