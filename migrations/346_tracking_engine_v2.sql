-- migrations/346_tracking_engine_v2.sql
--
-- Tracking Engine v2 — the storage half.
-- Law: docs/tracking/TRACKING_CONSTITUTION.md. Plan: docs/tracking/ENGINE_V2_PLAN.md.
-- 344 seeded the Dark Phonics works + class-week table. 345 added the review queue
-- (rule 5) and montree_progress_events.reason (rule 4). 346 finishes the shelf:
--
--   1. WRITING SHELF SEED (rule 1, ONE WORK ONE KEY) — ws:1..ws:8 as real curriculum
--      rows, the second sequence a parent is ever told about (rule 9). Same shape as
--      montree_seed_dark_phonics_works, with its own PARTIAL unique index so it can
--      never disturb the thousands of non-Writing-Shelf work rows.
--   2. montree_progress_events.evidence_id (rules 3 + 11) — a duplicate observation
--      of the same child on the same work on the same morning moves no rung
--      (lib/montree/tracking/ledger.ts dedupeSameDay) but is still evidence: the door
--      journals it with old_status = new_status and hangs the photo off this column.
--   3. montree_rebuild_child_progress(child_id) (rule 3) — the current-status table is
--      a CACHE of the journal; this rebuilds it server-side. Twin of
--      lib/montree/tracking/persistence.ts rebuildChildProgress().
--   4. The indexes those reads use.
--
-- RLS: no new tables, so no new policy surface. The tables touched keep the
-- convention from migration 275 §A — RLS ENABLED, ZERO POLICIES (deny-all for anon +
-- authenticated; the service-role key the server uses bypasses RLS). The ENABLE
-- statements below are idempotent re-assertions, not new grants. Do NOT add a
-- `FOR ALL USING (true)` policy: without `TO service_role` it defaults to PUBLIC and
-- re-opens exactly the hole migration 313 closed.
--
-- IMMUTABILITY: every index here is on bare columns. Where an expression index on a
-- timestamp is ever needed, the immutable form is ((created_at AT TIME ZONE 'UTC')::date)
-- — never created_at::date, which is STABLE and is rejected by CREATE INDEX.
--
-- IDEMPOTENT — IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT throughout.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Writing Shelf — partial unique index, seed function, backfill
-- ---------------------------------------------------------------------------
-- Mirrors 344's idx_dark_phonics_curriculum_work_key. A blanket unique constraint on
-- (classroom_id, work_key) is not safe on this table; a partial one over our own
-- prefix is, and it is what the seed's ON CONFLICT targets.
CREATE UNIQUE INDEX IF NOT EXISTS idx_writing_shelf_curriculum_work_key
  ON montree_classroom_curriculum_works (classroom_id, work_key)
  WHERE work_key LIKE 'ws:%';

CREATE OR REPLACE FUNCTION montree_seed_writing_shelf_works(p_classroom_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_area_id uuid;
BEGIN
  -- Language area, values identical to DEFAULT_AREAS['language'] in
  -- app/api/montree/curriculum/route.ts and to migration 344 (either may run first).
  INSERT INTO montree_classroom_curriculum_areas
    (classroom_id, area_key, name, name_chinese, icon, color, sequence, is_active)
  VALUES
    (p_classroom_id, 'language', 'Language', '语言', '📚', '#EC4899', 4, true)
  ON CONFLICT (classroom_id, area_key) DO NOTHING;

  SELECT id INTO v_area_id
    FROM montree_classroom_curriculum_areas
   WHERE classroom_id = p_classroom_id AND area_key = 'language';

  -- `name` is the CANONICAL TYPEABLE name lib/montree/tracking/resolve.ts parses
  -- ("Writing Shelf tray 3", "ws tray 3", "tray 3", "writing shelf 3" all land here),
  -- `description` is the tray's material. sequence 901-908 sits above every Dark
  -- Phonics block (11-195), so rule 7's "furthest work this week" puts a tray after a
  -- phonics work — which is where the Writing Shelf sits in the classroom's day.
  INSERT INTO montree_classroom_curriculum_works
    (classroom_id, area_id, work_key, name, description, age_range, sequence, is_active)
  SELECT p_classroom_id, v_area_id, v.work_key, v.name, v.description, '4-6', v.sequence, true
  FROM (VALUES
    ('ws:1', 'Writing Shelf tray 1', 'Sound boxes',      901),
    ('ws:2', 'Writing Shelf tray 2', 'Movable alphabet', 902),
    ('ws:3', 'Writing Shelf tray 3', 'Word chains',      903),
    ('ws:4', 'Writing Shelf tray 4', 'Dictation',        904),
    ('ws:5', 'Writing Shelf tray 5', 'Sentence builder', 905),
    ('ws:6', 'Writing Shelf tray 6', 'Story books',      906),
    ('ws:7', 'Writing Shelf tray 7', 'Author''s chair',  907),
    ('ws:8', 'Writing Shelf tray 8', 'Grammar symbols',  908)
  ) AS v(work_key, name, description, sequence)
  ON CONFLICT (classroom_id, work_key) WHERE work_key LIKE 'ws:%'
  DO UPDATE SET
    name        = excluded.name,
    description = excluded.description,
    age_range   = excluded.age_range,
    sequence    = excluded.sequence,
    is_active   = true;
END;
$fn$;

COMMENT ON FUNCTION montree_seed_writing_shelf_works(uuid) IS
  'Idempotently seeds/updates the eight Writing Shelf trays (ws:1..ws:8) into a classroom''s Language curriculum area. Names are the canonical typeable form lib/montree/tracking/resolve.ts parses; descriptions are the tray materials.';

-- One-off backfill: this migration is a complete rollout, no separate script.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM montree_classrooms LOOP
    PERFORM montree_seed_writing_shelf_works(r.id);
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- 2. montree_progress_events.evidence_id + read indexes
-- ---------------------------------------------------------------------------
-- Nullable and additive. write-progress.ts appendEvents() strips the field and
-- retries if this migration has not been pasted yet. NOT foreign-keyed, for the same
-- reason nothing else on this table is: a deleted photo must not delete the
-- observation it evidenced, and a journal write must never fail the progress write.
ALTER TABLE montree_progress_events ADD COLUMN IF NOT EXISTS evidence_id UUID;

COMMENT ON COLUMN montree_progress_events.evidence_id IS
  'The photo / recording / session this row was derived from. On an EVIDENCE row (old_status = new_status, written when a same-day duplicate observation moved no rung) this is the point of the row: the second photo of the morning is kept and attached here instead of advancing the ladder twice.';

-- Created by 314 under this exact name; repeated so an environment that missed 314
-- gets it and so the dependency is visible in one place.
CREATE INDEX IF NOT EXISTS idx_montree_progress_events_child
  ON montree_progress_events (child_id, created_at DESC);

-- Rule 10's invariant sweep and the tracker's per-work reads scan by key.
CREATE INDEX IF NOT EXISTS idx_montree_progress_events_work_key
  ON montree_progress_events (work_key, created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. montree_rebuild_child_progress(child_id) — rule 3's rebuild, server-side
-- ---------------------------------------------------------------------------
-- EQUIVALENCE WITH THE ENGINE: ledger.ts replays the journal through applyEvent(),
-- which rejects backward moves, same-day duplicates and no-ops. Those rows are never
-- journalled as CHANGES — the door writes an EVIDENCE row (old_status = new_status)
-- instead — so "the newest row that actually changed something wins" reaches the same
-- answer. Excluding evidence rows below is what keeps the two implementations agreed.
--
-- presented_at / mastered_at are the FIRST time each rung was reached, so a rebuild
-- reproduces the original dates rather than stamping now. A work since corrected
-- downwards keeps its historical mastered_at: the date a child once mastered a work
-- is a fact about the past. Returns the number of rows written.
CREATE OR REPLACE FUNCTION montree_rebuild_child_progress(p_child_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_count integer := 0;
BEGIN
  WITH changes AS (
    SELECT e.work_key, e.work_name, e.area, e.classroom_id, e.school_id, e.new_status,
           ROW_NUMBER() OVER (PARTITION BY e.work_key ORDER BY e.created_at DESC, e.id DESC) AS rn
      FROM montree_progress_events e
     WHERE e.child_id = p_child_id
       AND e.work_key IS NOT NULL
       AND e.work_name IS NOT NULL
       AND e.old_status IS DISTINCT FROM e.new_status
  ),
  latest AS (
    SELECT work_key, work_name, area, classroom_id, school_id, new_status
      FROM changes WHERE rn = 1
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
  'RULE 3 (Tracking Constitution): rebuilds one child''s montree_child_progress rows from montree_progress_events alone. Server-side twin of lib/montree/tracking/persistence.ts rebuildChildProgress(). Evidence rows (old_status = new_status) are excluded so they cannot decide a status. Returns rows written.';


-- ---------------------------------------------------------------------------
-- 4. RLS posture — re-asserted, not changed
-- ---------------------------------------------------------------------------
ALTER TABLE montree_progress_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_progress_review_queue ENABLE ROW LEVEL SECURITY;

INSERT INTO montree_migrations (filename) VALUES ('346_tracking_engine_v2.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
