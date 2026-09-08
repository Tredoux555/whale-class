-- migrations/349_progress_keys_backfill.sql   (v2 — 2026-09-08)
--
-- Tracking Engine v2 — THE KEY REPAIR, from the 2026-09-06 Whale-class burn-in.
-- Law: docs/tracking/TRACKING_CONSTITUTION.md. Report: docs/tracking/burnin-whale-2026-09-06-report.md.
--
-- WHY v2 EXISTS — v1 failed in production with
--
--   ERROR 23505: duplicate key value violates unique constraint
--     "idx_montree_child_progress_child_work_key"
--   DETAIL: Key (child_id, work_key)=(…, la_sentence_building) already exists
--
-- on the very first UPDATE, and the whole transaction rolled back, so NOTHING of
-- v1 was ever applied. The cause is not the resolver: it is that v1 only ever
-- ASSIGNED a key. Migration 348 has since put a partial UNIQUE index on
-- montree_child_progress (child_id, work_key) WHERE work_key IS NOT NULL — rule 1,
-- one work, one key, one row per child. A child who has BOTH a legacy keyless row
-- ("Sentence Building") and a modern keyed row (la_sentence_building) therefore
-- cannot have the legacy row keyed: the child would then hold two rows for one
-- work. The legacy row has to be MERGED into the keyed one, not stamped with a key.
--
-- The journal has the same shape of hazard from 347's guard index
--   idx_montree_progress_events_one_move_per_day
--     (child_id, work_key, new_status, (created_at AT TIME ZONE 'UTC')::date)
--     WHERE work_key IS NOT NULL AND old_status IS DISTINCT FROM new_status
-- and v1 got the ORDER wrong: it wrote every key first and demoted the same-day
-- duplicates afterwards, which is one statement too late — the UPDATE that writes
-- the key is itself the statement that violates the index. v2 assigns the key and
-- demotes the loser IN THE SAME UPDATE, so the index is never violated at any
-- point, not even mid-statement.
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
-- NOTHING IS LOST (rule 11). The one place a row disappears is §2's merge, and it
-- is JOURNALLED first — source 'correction', actor 'migration-349', with the reason
-- naming the legacy spelling — which is the only shape rule 4 accepts for a rung
-- being retired, and is exactly what 348 §2 does for keyed duplicates. The only
-- other status this migration writes is §3's demotion of a repaired duplicate to an
-- evidence row (old_status = new_status), which is what the ledger already replays
-- it as.
--
-- IDEMPOTENT. Every statement is guarded on the state it changes; a second paste
-- reports zeros everywhere.
--
-- RLS: no new tables. montree_progress_events and montree_child_progress keep the
-- convention from 275 §A / 313 — RLS ENABLED, ZERO POLICIES (deny-all for anon and
-- authenticated; the server's service-role key bypasses RLS). Do NOT add a
-- `FOR ALL USING (true)` policy here.
--
-- ===========================================================================
-- DRY RUN — read-only. Run this FIRST; it changes nothing and prints exactly
-- what the migration below would repair. Requires §0's helper functions, so run
-- §0 (the CREATE OR REPLACE FUNCTIONs) first, or read the counts after.
-- ===========================================================================
--
-- -- 1. How many keyless rows are there, and how many names?
-- SELECT 'events' AS table, COUNT(*) AS keyless_rows, COUNT(DISTINCT lower(btrim(work_name))) AS distinct_names
--   FROM montree_progress_events WHERE work_key IS NULL
-- UNION ALL
-- SELECT 'cache', COUNT(*), COUNT(DISTINCT lower(btrim(work_name)))
--   FROM montree_child_progress WHERE work_key IS NULL;
--
-- -- 2. What would be repaired, and would it be an ASSIGN or a MERGE?
-- SELECT k.work_name,
--        montree_349_resolve_key(k.classroom_id, k.work_name) AS resolved_key,
--        CASE
--          WHEN montree_349_resolve_key(k.classroom_id, k.work_name) IS NULL THEN 'left alone (tie or no match)'
--          WHEN EXISTS (SELECT 1 FROM montree_child_progress q
--                        WHERE q.child_id = k.child_id
--                          AND q.work_key = montree_349_resolve_key(k.classroom_id, k.work_name))
--            THEN 'MERGE into the existing keyed row'
--          ELSE 'assign' END AS verdict
--   FROM montree_v_keyless_progress k ORDER BY 3, 1;
--
-- -- 3. Which cache rows disagree with the journal (§6's targets)?
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
-- 0. The name functions — the SQL mirror of lib/montree/tracking/resolve.ts
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

-- The names that were AMBIGUOUS when the burn-in ran (§5 renames the duplicate
-- curriculum rows so a teacher can type each one from now on). A legacy row
-- carrying one of these names must NEVER be repaired by the passes below, not
-- even on a second paste after the rename has made the name look unique: nobody
-- knows whether a 2026 observation of "Clock Work" happened on the Mathematics
-- shelf or the Cultural one, and rule 5 says a tie is unknown.
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

-- THE ONE RESOLVER — the SQL mirror of resolveWorkKey() in
-- lib/montree/tracking/resolve.ts, and the only place this migration decides what
-- a legacy name means. Three tiers, tried in order: exact lower(btrim) name,
-- canonical name, base (alias) name. The FIRST tier that matches anything at all
-- is the decisive one — if that tier answers with exactly one distinct work_key,
-- that is the key; if it answers with two or more, the name is a TIE and the
-- answer is NULL (rule 5: a tie is unknown, and a later, looser tier is not
-- allowed to break it). A burn-in-ambiguous name, a NULL classroom and a name no
-- tier matches all return NULL as well.
CREATE OR REPLACE FUNCTION montree_349_resolve_key(p_classroom uuid, p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_keys text[];
BEGIN
  IF p_classroom IS NULL OR COALESCE(btrim(p_name), '') = '' THEN
    RETURN NULL;
  END IF;
  IF montree_burnin_ambiguous_name(p_name) THEN
    RETURN NULL;
  END IF;

  -- tier 1 — exact
  SELECT array_agg(DISTINCT w.work_key) INTO v_keys
    FROM montree_classroom_curriculum_works w
   WHERE w.classroom_id = p_classroom AND w.work_key IS NOT NULL
     AND lower(btrim(w.name)) = lower(btrim(p_name));
  IF v_keys IS NOT NULL AND array_length(v_keys, 1) > 0 THEN
    RETURN CASE WHEN array_length(v_keys, 1) = 1 THEN v_keys[1] ELSE NULL END;
  END IF;

  -- tier 2 — canonical
  SELECT array_agg(DISTINCT w.work_key) INTO v_keys
    FROM montree_classroom_curriculum_works w
   WHERE w.classroom_id = p_classroom AND w.work_key IS NOT NULL
     AND montree_canonical_work_name(w.name) = montree_canonical_work_name(p_name);
  IF v_keys IS NOT NULL AND array_length(v_keys, 1) > 0 THEN
    RETURN CASE WHEN array_length(v_keys, 1) = 1 THEN v_keys[1] ELSE NULL END;
  END IF;

  -- tier 3 — base / alias
  SELECT array_agg(DISTINCT w.work_key) INTO v_keys
    FROM montree_classroom_curriculum_works w
   WHERE w.classroom_id = p_classroom AND w.work_key IS NOT NULL
     AND montree_base_work_name(w.name) = montree_base_work_name(p_name);
  IF v_keys IS NOT NULL AND array_length(v_keys, 1) > 0 THEN
    RETURN CASE WHEN array_length(v_keys, 1) = 1 THEN v_keys[1] ELSE NULL END;
  END IF;

  RETURN NULL;
END;
$fn$;

-- The rung ladder, as one number. not_started 0 < presented 1 < practicing 2 <
-- mastered / completed 3. 'completed' is the pre-engine spelling of 'mastered'.
CREATE OR REPLACE FUNCTION montree_349_status_rank(p_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE lower(COALESCE(btrim(p_status), ''))
           WHEN 'mastered'  THEN 3
           WHEN 'completed' THEN 3
           WHEN 'practicing' THEN 2
           WHEN 'presented'  THEN 1
           ELSE 0
         END;
$fn$;

CREATE OR REPLACE FUNCTION montree_349_norm_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE WHEN lower(COALESCE(btrim(p_status), '')) = 'completed' THEN 'mastered'
              ELSE COALESCE(NULLIF(btrim(lower(p_status)), ''), 'not_started') END;
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
-- 2. montree_child_progress — the CACHE: MERGE first, assign second
-- ---------------------------------------------------------------------------
-- For every keyless row whose name resolves to exactly one key rk, the child ends
-- up with EXACTLY ONE row for rk (rule 1, and 348's index enforces it):
--
--   * TARGET — the row that survives. The child's existing keyed row for rk when
--     there is one; otherwise the strongest of the keyless rows resolving to rk
--     (highest rung, then earliest updated_at, then lowest id), which is simply
--     given the key. This second case matters more than it looks: two legacy rows
--     ("Cylinder Blocks" and "Cylinder Block") can resolve to the same key with no
--     keyed row in sight, and keying both would violate the index just as surely.
--
--   * MERGE — every other keyless row of the group folds into the target and is
--     then deleted: the target takes the HIGHER rung of the two, the EARLIEST
--     non-null presented_at and mastered_at (those dates are facts about the child,
--     not about which row won), and updated_at = NOW().
--
--   * JOURNAL — rule 3: the retirement of a rung is an EVENT before it is a DELETE.
--     One 'correction' row per merged row, naming the legacy spelling, so a replay
--     can still see that the child once held that row and why it went away.
--
-- Nothing else moves. No observation happened; a key was written down.
DO $$
DECLARE
  v_assigned integer := 0;
  v_merged integer := 0;
  v_journalled integer := 0;
BEGIN
  -- Every repairable keyless cache row, with the key its name resolves to.
  CREATE TEMP TABLE tmp_349_cache ON COMMIT DROP AS
  SELECT p.id, p.child_id, k.classroom_id, p.work_name, p.status, p.area,
         p.school_id, p.presented_at, p.mastered_at, p.updated_at,
         montree_349_resolve_key(k.classroom_id, p.work_name) AS rk
    FROM montree_v_keyless_progress k
    JOIN montree_child_progress p ON p.id = k.id
   WHERE k.classroom_id IS NOT NULL;

  DELETE FROM tmp_349_cache WHERE rk IS NULL;

  -- Which row of each (child, rk) group survives, and whether it already has the
  -- key (an existing keyed row) or has to be given it.
  CREATE TEMP TABLE tmp_349_cache_plan ON COMMIT DROP AS
  WITH existing AS (
    SELECT DISTINCT q.id AS keeper_id, q.child_id, q.work_key AS rk
      FROM montree_child_progress q
      JOIN tmp_349_cache t ON t.child_id = q.child_id AND t.rk = q.work_key
     WHERE q.work_key IS NOT NULL
  ), promoted AS (
    SELECT DISTINCT ON (t.child_id, t.rk) t.id AS keeper_id, t.child_id, t.rk
      FROM tmp_349_cache t
     WHERE NOT EXISTS (SELECT 1 FROM existing e WHERE e.child_id = t.child_id AND e.rk = t.rk)
     ORDER BY t.child_id, t.rk,
              montree_349_status_rank(t.status) DESC, t.updated_at ASC NULLS LAST, t.id ASC
  )
  SELECT keeper_id, child_id, rk, true AS already_keyed FROM existing
  UNION ALL
  SELECT keeper_id, child_id, rk, false FROM promoted;

  -- (b) ASSIGN — a keyless row that is the only one of its group and has no keyed
  -- twin simply gets the key.
  UPDATE montree_child_progress p
     SET work_key = pl.rk
    FROM tmp_349_cache_plan pl
   WHERE p.id = pl.keeper_id AND pl.already_keyed = false AND p.work_key IS NULL;
  GET DIAGNOSTICS v_assigned = ROW_COUNT;

  -- (a) MERGE — the target takes the higher rung and the earliest stamps of every
  -- row folding into it.
  UPDATE montree_child_progress q
     SET status = CASE WHEN montree_349_status_rank(g.best_status) > montree_349_status_rank(q.status)
                       THEN g.best_status ELSE q.status END,
         presented_at = LEAST(COALESCE(q.presented_at, g.presented_at), COALESCE(g.presented_at, q.presented_at)),
         mastered_at  = LEAST(COALESCE(q.mastered_at,  g.mastered_at),  COALESCE(g.mastered_at,  q.mastered_at)),
         updated_at   = NOW()
    FROM (
      SELECT pl.keeper_id,
             MIN(t.presented_at) AS presented_at,
             MIN(t.mastered_at)  AS mastered_at,
             (ARRAY_AGG(t.status ORDER BY montree_349_status_rank(t.status) DESC, t.id))[1] AS best_status
        FROM tmp_349_cache t
        JOIN tmp_349_cache_plan pl ON pl.child_id = t.child_id AND pl.rk = t.rk
       WHERE t.id <> pl.keeper_id
       GROUP BY pl.keeper_id
    ) g
   WHERE q.id = g.keeper_id;

  -- Rule 3, and rule 11: journalled BEFORE it is deleted.
  INSERT INTO montree_progress_events
    (child_id, school_id, classroom_id, work_key, work_name, area,
     old_status, new_status, source, actor, reason, created_at)
  SELECT t.child_id, t.school_id, t.classroom_id, t.rk, t.work_name, t.area,
         montree_349_norm_status(t.status),
         'not_started',
         'correction',
         'migration-349',
         '349: legacy row "' || COALESCE(t.work_name, '') || '" merged into keyed row '
           || t.rk || ' (rule 1: one work, one key)',
         NOW()
    FROM tmp_349_cache t
    JOIN tmp_349_cache_plan pl ON pl.child_id = t.child_id AND pl.rk = t.rk
   WHERE t.id <> pl.keeper_id
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_journalled = ROW_COUNT;

  DELETE FROM montree_child_progress p
   USING tmp_349_cache t
    JOIN tmp_349_cache_plan pl ON pl.child_id = t.child_id AND pl.rk = t.rk
   WHERE p.id = t.id AND t.id <> pl.keeper_id;
  GET DIAGNOSTICS v_merged = ROW_COUNT;

  RAISE NOTICE '[349] montree_child_progress: % row(s) keyed in place, % legacy row(s) merged into an existing keyed row (% journalled)',
    v_assigned, v_merged, v_journalled;
END $$;

-- Rule 1's index, in case 348 has not been pasted on this database. It is created
-- AFTER §2's merge, which is what makes it creatable at all.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_child_progress_child_work_key
  ON montree_child_progress (child_id, work_key)
  WHERE work_key IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 3. montree_progress_events — the JOURNAL (the table 347 never touched)
-- ---------------------------------------------------------------------------
-- ONE statement writes the key AND settles the one-move-per-day guard, because a
-- key written in an earlier statement is already a violation. 347 §3's index is a
-- UNIQUE index on (child_id, work_key, new_status, UTC day) for STATUS-CHANGING
-- rows with a key; keyless rows sit outside it, so the instant a key is written a
-- keyless event can collide with
--
--   * an ALREADY-KEYED event of the same child, key, new_status and UTC day, or
--   * ANOTHER keyless event resolving to the same key on the same UTC day.
--
-- The EARLIEST row (created_at, then id) of each such group stays the ladder move;
-- every other one is written as an EVIDENCE row (old_status = new_status) in the
-- same UPDATE — which is what lib/montree/tracking/ledger.ts applyEvent() already
-- replays them as ('duplicate-same-day', attachAsEvidence). Nothing is deleted
-- (rule 11) and no derived answer changes; the stored rows simply stop
-- contradicting the replay.
DO $$
DECLARE
  v_keyed integer := 0;
  v_demoted integer := 0;
  v_legacy_demoted integer := 0;
BEGIN
  CREATE TEMP TABLE tmp_349_events ON COMMIT DROP AS
  SELECT e.id, e.child_id, e.created_at, e.old_status, e.new_status,
         montree_349_resolve_key(k.classroom_id, e.work_name) AS rk
    FROM montree_v_keyless_events k
    JOIN montree_progress_events e ON e.id = k.id
   WHERE k.classroom_id IS NOT NULL;

  DELETE FROM tmp_349_events WHERE rk IS NULL;

  -- The rows that must NOT keep their status change once the key is written.
  CREATE TEMP TABLE tmp_349_demote ON COMMIT DROP AS
  WITH moves AS (
    SELECT t.*,
           ROW_NUMBER() OVER (
             PARTITION BY t.child_id, t.rk, t.new_status, ((t.created_at AT TIME ZONE 'UTC')::date)
             ORDER BY t.created_at, t.id
           ) AS rn
      FROM tmp_349_events t
     WHERE t.old_status IS DISTINCT FROM t.new_status
       AND t.new_status IS NOT NULL
  )
  SELECT m.id
    FROM moves m
   WHERE m.rn > 1                                     -- loses to another keyless event
      OR EXISTS (                                     -- loses to an already-keyed event
        SELECT 1 FROM montree_progress_events x
         WHERE x.child_id = m.child_id
           AND x.work_key = m.rk
           AND x.new_status = m.new_status
           AND x.old_status IS DISTINCT FROM x.new_status
           AND ((x.created_at AT TIME ZONE 'UTC')::date) = ((m.created_at AT TIME ZONE 'UTC')::date)
           AND x.id <> m.id
      );

  -- The single statement. Every row it touches ends the statement either keyed and
  -- unique under the guard, or keyed and demoted out of the guard's scope.
  UPDATE montree_progress_events e
     SET work_key = t.rk,
         old_status = CASE WHEN d.id IS NOT NULL THEN e.new_status ELSE e.old_status END,
         reason = CASE WHEN d.id IS NOT NULL
                       THEN COALESCE(e.reason || ' · ', '')
                            || '349: demoted to an evidence row — a second same-day move of the same rung, '
                            || 'which the ledger already replays as duplicate-same-day'
                       ELSE e.reason END
    FROM tmp_349_events t
    LEFT JOIN tmp_349_demote d ON d.id = t.id
   WHERE e.id = t.id AND e.work_key IS NULL;
  GET DIAGNOSTICS v_keyed = ROW_COUNT;

  SELECT COUNT(*) INTO v_demoted FROM tmp_349_demote;

  RAISE NOTICE '[349] montree_progress_events: % keyless event(s) keyed, % of them demoted to evidence rows in the same statement',
    v_keyed, v_demoted;

  -- Pre-existing same-day duplicates among rows that were ALREADY keyed before this
  -- migration ran. On a database where 347 was pasted the guard index makes this a
  -- guaranteed no-op; on one where it was not, it is what makes the index below
  -- creatable. It cannot touch anything §3 just wrote — those are unique by
  -- construction.
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
  GET DIAGNOSTICS v_legacy_demoted = ROW_COUNT;
  RAISE NOTICE '[349] % pre-existing keyed journal row(s) demoted to evidence rows', v_legacy_demoted;
END $$;

-- The guard index itself, in case 347 has not been pasted on this database.
-- IF NOT EXISTS: where 347 already created it, this does nothing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_progress_events_one_move_per_day
  ON montree_progress_events (
    child_id,
    work_key,
    new_status,
    ((created_at AT TIME ZONE 'UTC')::date)
  )
  WHERE work_key IS NOT NULL AND old_status IS DISTINCT FROM new_status;


-- ---------------------------------------------------------------------------
-- 5. The three duplicate work NAMES the burn-in found (invariant duplicate-work-name)
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
-- montree_burnin_ambiguous_name() keeps these three names out of every pass above,
-- for ever, so the rename never retroactively "unblocks" a guess.
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
-- 6. cache-journal-drift — the journal is the truth (rule 3)
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
-- 7. What is LEFT — the review queue's work, not this migration's
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

INSERT INTO montree_migrations (filename) VALUES ('349_progress_keys_backfill.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICATION — run AFTER. Every count should be 0 except the two index rows
-- and the registration.
-- ---------------------------------------------------------------------------
-- SELECT
--   (SELECT COUNT(*) FROM (
--      SELECT 1 FROM montree_child_progress WHERE work_key IS NOT NULL
--       GROUP BY child_id, work_key HAVING COUNT(*) > 1) d)            AS duplicate_key_rows,
--   (SELECT COUNT(*) FROM (
--      SELECT 1 FROM montree_progress_events
--       WHERE work_key IS NOT NULL AND old_status IS DISTINCT FROM new_status
--       GROUP BY child_id, work_key, new_status, ((created_at AT TIME ZONE 'UTC')::date)
--      HAVING COUNT(*) > 1) d)                                        AS same_day_duplicates,
--   (SELECT COUNT(*) FROM pg_indexes
--     WHERE indexname = 'idx_montree_child_progress_child_work_key')   AS rule1_index,
--   (SELECT COUNT(*) FROM pg_indexes
--     WHERE indexname = 'idx_montree_progress_events_one_move_per_day') AS guard_index,
--   (SELECT COUNT(*) FROM montree_progress_events WHERE actor = 'migration-349') AS merge_events,
--   (SELECT COUNT(*) FROM montree_migrations
--     WHERE filename = '349_progress_keys_backfill.sql')               AS registered;
