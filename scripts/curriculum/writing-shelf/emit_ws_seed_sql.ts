// scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts
//
// Generates migrations/352_writing_shelf_curriculum.sql FROM
// lib/montree/dark-phonics/writing-shelf-curriculum.ts, so the eight trays'
// curriculum content and the migration that seeds it can never drift apart.
// Twin of scripts/curriculum/book-works/emit_tracker_seed_sql.ts, which does
// the same job for the Dark Phonics works in migration 344.
//
// Run with:
//   node --experimental-strip-types scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts > migrations/352_writing_shelf_curriculum.sql
//
// The migration is a CREATE OR REPLACE of montree_seed_writing_shelf_works(uuid)
// (first written in migration 346, with only name/description/age_range/sequence)
// plus a backfill loop over montree_classrooms. Idempotent, ON CONFLICT on the
// PARTIAL index 346 created — (classroom_id, work_key) WHERE work_key LIKE 'ws:%'
// — so it can never disturb a non-Writing-Shelf row. No RLS statement is emitted:
// no new table, no new policy surface.
//
// tests/tracking/writing-shelf-curriculum.test.ts asserts the checked-in
// migration is byte-identical to this script's output, so a hand edit to the SQL
// fails the build instead of quietly winning.

import { WRITING_SHELF_WORKS } from '../../../lib/montree/dark-phonics/writing-shelf-curriculum.ts';

/** '…' with every quote doubled — the only escaping SQL string literals need. */
function sqlString(s: string): string {
  return `'${String(s).replace(/'/g, "''")}'`;
}

/** A JSONB literal: JSON text, quoted as SQL, cast at the SELECT. */
function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

const HEADER = `-- migrations/352_writing_shelf_curriculum.sql
--
-- GENERATED FILE — do not edit by hand.
-- Source:    lib/montree/dark-phonics/writing-shelf-curriculum.ts
-- Generator: scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts
-- Regenerate: node --experimental-strip-types scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts > migrations/352_writing_shelf_curriculum.sql
--
-- THE WRITING SHELF, AS REAL CURRICULUM (rule 1: one work, one key).
--
-- 346 seeded ws:1..ws:8 with a name, a material and a sequence and nothing else.
-- This fills in every other column montree_classroom_curriculum_works has carried
-- since 099 — direct/indirect aims, materials, control_of_error, prerequisites,
-- quick_guide, presentation_steps/notes, parent_description, why_it_matters,
-- video_search_terms, name_chinese/name_zh — extracted from the owner's own shelf
-- page public/dark-phonics-shelves.html and the locked specs in docs/handoffs/.
--
-- It also renames the eight works to the display form
--   'Writing Shelf tray 1'  ->  'Writing Shelf tray 1 · Sound boxes'
-- lib/montree/tracking/resolve.ts accepts BOTH, plus the typed forms
-- ('writing shelf 3', 'ws tray 3', 'tray 3 word chains'), so nothing that could
-- resolve before this migration stops resolving after it.
--
-- \`description\` deliberately stays the MATERIAL alone ('Sound boxes'), never a
-- sentence: summary.ts builds "worked on Writing Shelf tray 1, Sound boxes" out of
-- the tray number plus this column, and a paragraph here would reach a parent.
--
-- RLS: no new table, no new policy surface, untouched — the tables here keep
-- migration 275 §A's convention (RLS ENABLED, ZERO POLICIES; the server's
-- service-role key bypasses it). Do NOT add a \`FOR ALL USING (true)\` policy.
--
-- IDEMPOTENT: CREATE OR REPLACE + ON CONFLICT DO UPDATE + a re-runnable backfill.
-- One VALUES row per line, on purpose: the file is generated, and a row is the
-- unit that changes.

BEGIN;

-- 346 created this partial unique index; re-asserted here so this migration can
-- be pasted into a database that has not had 346 run against it yet.
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
  -- app/api/montree/curriculum/route.ts and to migrations 344/346.
  INSERT INTO montree_classroom_curriculum_areas
    (classroom_id, area_key, name, name_chinese, icon, color, sequence, is_active)
  VALUES
    (p_classroom_id, 'language', 'Language', '语言', '📚', '#EC4899', 4, true)
  ON CONFLICT (classroom_id, area_key) DO NOTHING;

  SELECT id INTO v_area_id
    FROM montree_classroom_curriculum_areas
   WHERE classroom_id = p_classroom_id AND area_key = 'language';

  INSERT INTO montree_classroom_curriculum_works (
    classroom_id, area_id, work_key, name, name_chinese, name_zh, description,
    age_range, sequence, is_active,
    direct_aims, indirect_aims, materials, control_of_error, prerequisites,
    quick_guide, presentation_steps, presentation_notes,
    parent_description, why_it_matters, video_search_terms
  )
  SELECT
    p_classroom_id, v_area_id, v.work_key, v.name, v.name_chinese, v.name_chinese, v.description,
    v.age_range, v.sequence, true,
    v.direct_aims::jsonb, v.indirect_aims::jsonb, v.materials::jsonb,
    v.control_of_error, v.prerequisites::jsonb,
    v.quick_guide, v.presentation_steps::jsonb, v.presentation_notes,
    v.parent_description, v.why_it_matters, jsonb_build_array(v.video_search_terms)
  FROM (VALUES
`;

const FOOTER = `  ) AS v(
    work_key, name, name_chinese, description, age_range, sequence,
    direct_aims, indirect_aims, materials, control_of_error, prerequisites,
    quick_guide, presentation_steps, presentation_notes,
    parent_description, why_it_matters, video_search_terms
  )
  ON CONFLICT (classroom_id, work_key) WHERE work_key LIKE 'ws:%'
  DO UPDATE SET
    name               = excluded.name,
    name_chinese       = excluded.name_chinese,
    name_zh            = excluded.name_zh,
    description        = excluded.description,
    age_range          = excluded.age_range,
    sequence           = excluded.sequence,
    is_active          = true,
    direct_aims        = excluded.direct_aims,
    indirect_aims      = excluded.indirect_aims,
    materials          = excluded.materials,
    control_of_error   = excluded.control_of_error,
    prerequisites      = excluded.prerequisites,
    quick_guide        = excluded.quick_guide,
    presentation_steps = excluded.presentation_steps,
    presentation_notes = excluded.presentation_notes,
    parent_description = excluded.parent_description,
    why_it_matters     = excluded.why_it_matters,
    video_search_terms = excluded.video_search_terms,
    updated_at         = NOW();
END;
$fn$;

COMMENT ON FUNCTION montree_seed_writing_shelf_works(uuid) IS
  'Idempotently seeds/updates the eight Writing Shelf trays (ws:1..ws:8) into a classroom''s Language curriculum area, with the full curriculum column set. Generated from lib/montree/dark-phonics/writing-shelf-curriculum.ts by scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts — edit the TypeScript, never this function.';

-- One-off backfill: this migration is a complete rollout, no separate script.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM montree_classrooms LOOP
    PERFORM montree_seed_writing_shelf_works(r.id);
  END LOOP;
END $$;

INSERT INTO montree_migrations (filename) VALUES ('352_writing_shelf_curriculum.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
`;

/** One VALUES row per line — the file is generated, and a row is what changes. */
function valuesRow(work: (typeof WRITING_SHELF_WORKS)[number]): string {
  const cols: string[] = [
    sqlString(work.work_key),
    sqlString(work.name),
    sqlString(work.name_chinese),
    sqlString(work.description),
    sqlString(work.age_range),
    String(work.sequence),
    sqlJson(work.direct_aims),
    sqlJson(work.indirect_aims),
    sqlJson(work.materials),
    sqlString(work.control_of_error),
    sqlJson(work.prerequisites),
    sqlString(work.quick_guide),
    sqlJson(work.presentation_steps),
    sqlString(work.presentation_notes),
    sqlString(work.parent_description),
    sqlString(work.why_it_matters),
    sqlString(work.video_search_terms),
  ];
  return `    (${cols.join(', ')})`;
}

/** The whole migration, as one string. Pure — the test calls this directly. */
export function emitWritingShelfMigration(): string {
  const rows = WRITING_SHELF_WORKS.map(valuesRow).join(',\n');
  return `${HEADER}${rows}\n${FOOTER}`;
}

console.log(emitWritingShelfMigration());
