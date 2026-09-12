-- migrations/344_dark_phonics_tracker.sql
--
-- Dark Phonics Tracker — Phase 1 (REVISED 2026-09-06 per Tredoux: "this is
-- going in the curriculum for the tracking system").
--
-- Dark Phonics works are CURRICULUM WORKS, full stop -- rows in the SAME
-- montree_classroom_curriculum_works / montree_classroom_curriculum_areas
-- tables every other Montessori work lives in (see
-- migrations/099_montree_classroom_curriculum_tables.sql for their shape and
-- app/api/montree/curriculum/route.ts for how a classroom's curriculum is
-- fetched/seeded). That means the EXISTING per-child tracking
-- (montree_child_progress: child_id, work_name, area, status) and the
-- EXISTING photo-tagging flow already tick them off -- no new child-progress
-- machinery. This migration only needs to make the 5 works-per-letter EXIST
-- as curriculum rows.
--
-- Superseded from the original draft of this migration: the standalone
-- montree_child_dark_phonics_work table is GONE. It was never applied to
-- Supabase (this repo's migrations are hand-run), so there is nothing to
-- roll back -- this file simply replaces that draft in place.
--
-- ──────────────────────────────────────────────────────────────────
-- WHAT'S HERE:
--
--   1. A partial unique index on montree_classroom_curriculum_works so our
--      seed can upsert idempotently without touching the thousands of
--      pre-existing non-Dark-Phonics work rows (whose work_key values are
--      NOT guaranteed globally unique across classrooms in a way that would
--      be safe to add a blanket constraint over).
--
--   2. montree_seed_dark_phonics_works(p_classroom_id uuid) -- idempotent:
--      ensures the classroom's Language area exists, then upserts the 5
--      works for every LIVE letter (lib/montree/dark-phonics/tracker-works.ts
--      TRACKER_LETTERS, status='live') into it. work_key is the canonical
--      dp:<letter>:<n> id, name is the canonical typeable name
--      "<letter> Dark Phonics work <n>", description is "<shortLabel> — <book
--      title>", sequence is (live-letter-order * 10 + n) so every letter has
--      a clean block of 10 sequence numbers with room to spare.
--
--      montree_classroom_curriculum_works has NO category/subcategory column
--      (checked: 099/133/138/144 — the only ALTERs on this table add
--      is_custom, teacher_notes, source, photo_url, reference_photo_url,
--      prompt_used). Per Tredoux's instruction, that constraint is simply
--      skipped -- there is nothing to set.
--
--      THE VALUES LIST BELOW IS HARDCODED (a seed has to be), but it is
--      GENERATED, not hand-typed, by:
--
--          node --experimental-strip-types \
--            scripts/curriculum/book-works/emit_tracker_seed_sql.ts
--
--      which reads TRACKER_LETTERS directly, so the seed and the app's
--      canonical work list cannot drift apart. Re-run it and paste a fresh
--      VALUES block here whenever TRACKER_LETTERS changes (a letter goes
--      live, a book title changes, etc).
--
--   3. A one-off DO block that runs the seed for every classroom that
--      already exists, so this migration is a complete rollout on its own
--      (no separate backfill script to remember to run).
--
--   4. montree_class_dark_phonics_week -- UNCHANGED from the original draft:
--      one row per class, the letter the whole class is on this week. Still
--      a new tiny table rather than an ALTER on montree_class_live_state,
--      for the reason given below (that table is per-appointment ephemeral
--      sync state; this is a persistent classroom-level fact). This table
--      keeps its own RLS posture -- RLS enabled, zero policies, matching
--      migration 225's convention (see migrations/275_enable_rls_security_
--      lockdown.sql Section A) -- since it is bespoke Dark-Phonics-Live
--      state, not a curriculum table, and the app only ever touches it via
--      the service-role key.
--
-- IDEMPOTENT -- every statement, including the classroom backfill loop
-- (PERFORM montree_seed_dark_phonics_works(...) upserts), is safe to re-run.
-- ──────────────────────────────────────────────────────────────────

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Partial unique index -- lets the seed upsert ONLY its own dp:* rows
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_dark_phonics_curriculum_work_key
  ON montree_classroom_curriculum_works (classroom_id, work_key)
  WHERE work_key LIKE 'dp:%';


-- ---------------------------------------------------------------------------
-- 2. montree_seed_dark_phonics_works(classroom_id) -- idempotent seed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION montree_seed_dark_phonics_works(p_classroom_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_area_id uuid;
BEGIN
  -- Ensure the Language area exists for this classroom. Values match
  -- DEFAULT_AREAS['language'] in app/api/montree/curriculum/route.ts exactly.
  INSERT INTO montree_classroom_curriculum_areas
    (classroom_id, area_key, name, name_chinese, icon, color, sequence, is_active)
  VALUES
    (p_classroom_id, 'language', 'Language', '语言', '📚', '#EC4899', 4, true)
  ON CONFLICT (classroom_id, area_key) DO NOTHING;

  SELECT id INTO v_area_id
    FROM montree_classroom_curriculum_areas
   WHERE classroom_id = p_classroom_id AND area_key = 'language';

  -- GENERATED from lib/montree/dark-phonics/tracker-works.ts by
  -- scripts/curriculum/book-works/emit_tracker_seed_sql.ts -- do not hand-edit
  -- this VALUES list; regenerate it instead.
  INSERT INTO montree_classroom_curriculum_works
    (classroom_id, area_id, work_key, name, description, age_range, sequence, is_active)
  SELECT p_classroom_id, v_area_id, v.work_key, v.name, v.description, '3-6', v.sequence, true
  FROM (VALUES
    ('dp:s:1', 's Dark Phonics work 1', 'Characters — Snake in My Sock', 11),
    ('dp:s:2', 's Dark Phonics work 2', 'Picture match — Snake in My Sock', 12),
    ('dp:s:3', 's Dark Phonics work 3', 'Sentence & picture match — Snake in My Sock', 13),
    ('dp:s:4', 's Dark Phonics work 4', 'Sentence builder (guided) — Snake in My Sock', 14),
    ('dp:s:5', 's Dark Phonics work 5', 'Sentence builder (free) — Snake in My Sock', 15),
    ('dp:a:1', 'a Dark Phonics work 1', 'Characters — Ant on My Apple', 21),
    ('dp:a:2', 'a Dark Phonics work 2', 'Picture match — Ant on My Apple', 22),
    ('dp:a:3', 'a Dark Phonics work 3', 'Sentence & picture match — Ant on My Apple', 23),
    ('dp:a:4', 'a Dark Phonics work 4', 'Sentence builder (guided) — Ant on My Apple', 24),
    ('dp:a:5', 'a Dark Phonics work 5', 'Sentence builder (free) — Ant on My Apple', 25),
    ('dp:t:1', 't Dark Phonics work 1', 'Characters — The ___ Sat!', 31),
    ('dp:t:2', 't Dark Phonics work 2', 'Picture match — The ___ Sat!', 32),
    ('dp:t:3', 't Dark Phonics work 3', 'Sentence & picture match — The ___ Sat!', 33),
    ('dp:t:4', 't Dark Phonics work 4', 'Sentence builder (guided) — The ___ Sat!', 34),
    ('dp:t:5', 't Dark Phonics work 5', 'Sentence builder (free) — The ___ Sat!', 35),
    ('dp:p:1', 'p Dark Phonics work 1', 'Characters — The ___ Can Pat!', 41),
    ('dp:p:2', 'p Dark Phonics work 2', 'Picture match — The ___ Can Pat!', 42),
    ('dp:p:3', 'p Dark Phonics work 3', 'Sentence & picture match — The ___ Can Pat!', 43),
    ('dp:p:4', 'p Dark Phonics work 4', 'Sentence builder (guided) — The ___ Can Pat!', 44),
    ('dp:p:5', 'p Dark Phonics work 5', 'Sentence builder (free) — The ___ Can Pat!', 45),
    ('dp:i:1', 'i Dark Phonics work 1', 'Characters — The ___ Sat in the Pit!', 51),
    ('dp:i:2', 'i Dark Phonics work 2', 'Picture match — The ___ Sat in the Pit!', 52),
    ('dp:i:3', 'i Dark Phonics work 3', 'Sentence & picture match — The ___ Sat in the Pit!', 53),
    ('dp:i:4', 'i Dark Phonics work 4', 'Sentence builder (guided) — The ___ Sat in the Pit!', 54),
    ('dp:i:5', 'i Dark Phonics work 5', 'Sentence builder (free) — The ___ Sat in the Pit!', 55),
    ('dp:n:1', 'n Dark Phonics work 1', 'Characters — The ___ Naps!', 61),
    ('dp:n:2', 'n Dark Phonics work 2', 'Picture match — The ___ Naps!', 62),
    ('dp:n:3', 'n Dark Phonics work 3', 'Sentence & picture match — The ___ Naps!', 63),
    ('dp:n:4', 'n Dark Phonics work 4', 'Sentence builder (guided) — The ___ Naps!', 64),
    ('dp:n:5', 'n Dark Phonics work 5', 'Sentence builder (free) — The ___ Naps!', 65),
    ('dp:m:1', 'm Dark Phonics work 1', 'Characters — The ___ Sat on the Mat!', 71),
    ('dp:m:2', 'm Dark Phonics work 2', 'Picture match — The ___ Sat on the Mat!', 72),
    ('dp:m:3', 'm Dark Phonics work 3', 'Sentence & picture match — The ___ Sat on the Mat!', 73),
    ('dp:m:4', 'm Dark Phonics work 4', 'Sentence builder (guided) — The ___ Sat on the Mat!', 74),
    ('dp:m:5', 'm Dark Phonics work 5', 'Sentence builder (free) — The ___ Sat on the Mat!', 75),
    ('dp:d:1', 'd Dark Phonics work 1', 'Characters — The ___ Is Sad!', 81),
    ('dp:d:2', 'd Dark Phonics work 2', 'Picture match — The ___ Is Sad!', 82),
    ('dp:d:3', 'd Dark Phonics work 3', 'Sentence & picture match — The ___ Is Sad!', 83),
    ('dp:d:4', 'd Dark Phonics work 4', 'Sentence builder (guided) — The ___ Is Sad!', 84),
    ('dp:d:5', 'd Dark Phonics work 5', 'Sentence builder (free) — The ___ Is Sad!', 85),
    ('dp:g:1', 'g Dark Phonics work 1', 'Characters — The ___ Digs!', 91),
    ('dp:g:2', 'g Dark Phonics work 2', 'Picture match — The ___ Digs!', 92),
    ('dp:g:3', 'g Dark Phonics work 3', 'Sentence & picture match — The ___ Digs!', 93),
    ('dp:g:4', 'g Dark Phonics work 4', 'Sentence builder (guided) — The ___ Digs!', 94),
    ('dp:g:5', 'g Dark Phonics work 5', 'Sentence builder (free) — The ___ Digs!', 95),
    ('dp:o:1', 'o Dark Phonics work 1', 'Characters — The ___ Has a Dog!', 101),
    ('dp:o:2', 'o Dark Phonics work 2', 'Picture match — The ___ Has a Dog!', 102),
    ('dp:o:3', 'o Dark Phonics work 3', 'Sentence & picture match — The ___ Has a Dog!', 103),
    ('dp:o:4', 'o Dark Phonics work 4', 'Sentence builder (guided) — The ___ Has a Dog!', 104),
    ('dp:o:5', 'o Dark Phonics work 5', 'Sentence builder (free) — The ___ Has a Dog!', 105),
    ('dp:c:1', 'c Dark Phonics work 1', 'Characters — The ___ Sat in a Cot!', 111),
    ('dp:c:2', 'c Dark Phonics work 2', 'Picture match — The ___ Sat in a Cot!', 112),
    ('dp:c:3', 'c Dark Phonics work 3', 'Sentence & picture match — The ___ Sat in a Cot!', 113),
    ('dp:c:4', 'c Dark Phonics work 4', 'Sentence builder (guided) — The ___ Sat in a Cot!', 114),
    ('dp:c:5', 'c Dark Phonics work 5', 'Sentence builder (free) — The ___ Sat in a Cot!', 115),
    ('dp:k:1', 'k Dark Phonics work 1', 'Characters — The ___ Has a Kit!', 121),
    ('dp:k:2', 'k Dark Phonics work 2', 'Picture match — The ___ Has a Kit!', 122),
    ('dp:k:3', 'k Dark Phonics work 3', 'Sentence & picture match — The ___ Has a Kit!', 123),
    ('dp:k:4', 'k Dark Phonics work 4', 'Sentence builder (guided) — The ___ Has a Kit!', 124),
    ('dp:k:5', 'k Dark Phonics work 5', 'Sentence builder (free) — The ___ Has a Kit!', 125),
    ('dp:ck:1', 'ck Dark Phonics work 1', 'Characters — The Cat Sat', 131),
    ('dp:ck:2', 'ck Dark Phonics work 2', 'Picture match — The Cat Sat', 132),
    ('dp:ck:3', 'ck Dark Phonics work 3', 'Sentence & picture match — The Cat Sat', 133),
    ('dp:ck:4', 'ck Dark Phonics work 4', 'Sentence builder (guided) — The Cat Sat', 134),
    ('dp:ck:5', 'ck Dark Phonics work 5', 'Sentence builder (free) — The Cat Sat', 135),
    ('dp:e:1', 'e Dark Phonics work 1', 'Characters — The ___ Has an Egg!', 141),
    ('dp:e:2', 'e Dark Phonics work 2', 'Picture match — The ___ Has an Egg!', 142),
    ('dp:e:3', 'e Dark Phonics work 3', 'Sentence & picture match — The ___ Has an Egg!', 143),
    ('dp:e:4', 'e Dark Phonics work 4', 'Sentence builder (guided) — The ___ Has an Egg!', 144),
    ('dp:e:5', 'e Dark Phonics work 5', 'Sentence builder (free) — The ___ Has an Egg!', 145),
    ('dp:u:1', 'u Dark Phonics work 1', 'Characters — The ___ Is in the Mud!', 151),
    ('dp:u:2', 'u Dark Phonics work 2', 'Picture match — The ___ Is in the Mud!', 152),
    ('dp:u:3', 'u Dark Phonics work 3', 'Sentence & picture match — The ___ Is in the Mud!', 153),
    ('dp:u:4', 'u Dark Phonics work 4', 'Sentence builder (guided) — The ___ Is in the Mud!', 154),
    ('dp:u:5', 'u Dark Phonics work 5', 'Sentence builder (free) — The ___ Is in the Mud!', 155),
    ('dp:r:1', 'r Dark Phonics work 1', 'Characters — The ___ Chased the Rat!', 161),
    ('dp:r:2', 'r Dark Phonics work 2', 'Picture match — The ___ Chased the Rat!', 162),
    ('dp:r:3', 'r Dark Phonics work 3', 'Sentence & picture match — The ___ Chased the Rat!', 163),
    ('dp:r:4', 'r Dark Phonics work 4', 'Sentence builder (guided) — The ___ Chased the Rat!', 164),
    ('dp:r:5', 'r Dark Phonics work 5', 'Sentence builder (free) — The ___ Chased the Rat!', 165),
    ('dp:h:1', 'h Dark Phonics work 1', 'Characters — The ___ Is Hot!', 171),
    ('dp:h:2', 'h Dark Phonics work 2', 'Picture match — The ___ Is Hot!', 172),
    ('dp:h:3', 'h Dark Phonics work 3', 'Sentence & picture match — The ___ Is Hot!', 173),
    ('dp:h:4', 'h Dark Phonics work 4', 'Sentence builder (guided) — The ___ Is Hot!', 174),
    ('dp:h:5', 'h Dark Phonics work 5', 'Sentence builder (free) — The ___ Is Hot!', 175),
    ('dp:b:1', 'b Dark Phonics work 1', 'Characters — The ___ Saw a Bug!', 181),
    ('dp:b:2', 'b Dark Phonics work 2', 'Picture match — The ___ Saw a Bug!', 182),
    ('dp:b:3', 'b Dark Phonics work 3', 'Sentence & picture match — The ___ Saw a Bug!', 183),
    ('dp:b:4', 'b Dark Phonics work 4', 'Sentence builder (guided) — The ___ Saw a Bug!', 184),
    ('dp:b:5', 'b Dark Phonics work 5', 'Sentence builder (free) — The ___ Saw a Bug!', 185),
    ('dp:x:1', 'x Dark Phonics work 1', 'Characters — Fox in a Box', 191),
    ('dp:x:2', 'x Dark Phonics work 2', 'Picture match — Fox in a Box', 192),
    ('dp:x:3', 'x Dark Phonics work 3', 'Sentence & picture match — Fox in a Box', 193),
    ('dp:x:4', 'x Dark Phonics work 4', 'Sentence builder (guided) — Fox in a Box', 194),
    ('dp:x:5', 'x Dark Phonics work 5', 'Sentence builder (free) — Fox in a Box', 195)
  ) AS v(work_key, name, description, sequence)
  ON CONFLICT (classroom_id, work_key) WHERE work_key LIKE 'dp:%'
  DO UPDATE SET
    name        = excluded.name,
    description = excluded.description,
    sequence    = excluded.sequence,
    is_active   = true;
END;
$fn$;

COMMENT ON FUNCTION montree_seed_dark_phonics_works(uuid) IS
  'Idempotently seeds/updates the 5 Dark Phonics works for every LIVE letter (tracker-works.ts TRACKER_LETTERS) into a classroom''s Language curriculum area. Safe to re-run (upserts on classroom_id+work_key). Regenerate the VALUES list with scripts/curriculum/book-works/emit_tracker_seed_sql.ts whenever TRACKER_LETTERS changes.';


-- ---------------------------------------------------------------------------
-- 3. One-off backfill: seed every existing classroom right now
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM montree_classrooms LOOP
    PERFORM montree_seed_dark_phonics_works(r.id);
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- 4. montree_class_dark_phonics_week -- one row per class, current letter
--    (UNCHANGED from the original draft of this migration)
-- ---------------------------------------------------------------------------
-- A NEW tiny table rather than an ALTER on montree_class_live_state (the
-- table migrations 334/341/342 extended for live-classroom sync):
-- montree_class_live_state is keyed on appointment_id and is explicitly
-- ephemeral per-appointment sync state (teacher PATCHes, parent polls every
-- ~2s, "missing row == not started"). "Which letter is this class on this
-- week" is a slower-moving, classroom-level fact that must survive between
-- appointments and exist even when no class is live -- it doesn't fit that
-- table's grain or its lifecycle. A one-row-per-class table keyed on
-- class_id (montree_classrooms.id) is the right shape instead.
CREATE TABLE IF NOT EXISTS montree_class_dark_phonics_week (
  class_id   UUID PRIMARY KEY REFERENCES montree_classrooms(id) ON DELETE CASCADE,

  -- Letter code from TRACKER_LETTERS, e.g. 't', 'ck', 'qu'. Not FK'd -- the
  -- letter list is code-owned data (TRACKER_LETTERS), not a DB table.
  letter     TEXT NOT NULL,

  set_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Who set it (teacher/staff user id). Nullable: a system/import write may
  -- have no human actor.
  set_by     UUID
);

COMMENT ON TABLE montree_class_dark_phonics_week IS
  'One row per class: the Dark Phonics letter the whole class is currently working on. A NEW tiny table rather than an ALTER on montree_class_live_state -- that table is per-appointment ephemeral live-sync state (334/341/342), and this is a slower-moving classroom-level fact that must survive between appointments. Missing row = no letter set yet.';

-- RLS posture: enabled, zero policies -- matches migration 225's convention
-- (see migrations/275_enable_rls_security_lockdown.sql Section A). This
-- table is bespoke Dark-Phonics-Live state, not a curriculum table, and the
-- app only ever touches it server-side via the service-role key (bypasses
-- RLS) -- so this default-denies anon + authenticated from day one.
ALTER TABLE montree_class_dark_phonics_week ENABLE ROW LEVEL SECURITY;

COMMIT;
