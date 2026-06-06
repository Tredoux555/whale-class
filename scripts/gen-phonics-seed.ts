// Generates idempotent SQL to seed the Dark Phonics works as real curriculum rows
// for every classroom in a school. Run: npx tsx scripts/gen-phonics-seed.ts <schoolId>
import { phonicsWorkRows } from '../lib/montree/phonics/phonics-works';

const schoolId = process.argv[2] || 'c6280fae-567c-45ed-ad4d-934eae79aabc'; // Tredoux House
const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const rows = phonicsWorkRows();

const values = rows
  .map((r) => {
    const desc = r.description.slice(0, 500);
    return `  (${q(r.work_key)}, ${q(r.name)}, ${q(desc)}, ${10000 + r.sequence})`;
  })
  .join(',\n');

console.log(`-- Seed Dark Phonics works (real curriculum rows) for school ${schoolId}
-- Idempotent: only inserts work_keys not already present; safe to re-run.
BEGIN;

WITH lessons(work_key, nm, descr, seq) AS (
  VALUES
${values}
),
targets AS (
  SELECT c.id AS classroom_id, a.id AS area_id
  FROM montree_classrooms c
  JOIN montree_classroom_curriculum_areas a
    ON a.classroom_id = c.id AND a.area_key = 'language'
  WHERE c.school_id = ${q(schoolId)}
)
INSERT INTO montree_classroom_curriculum_works
  (classroom_id, name, work_key, area_id, sequence, description, parent_description, is_custom, is_active, source)
SELECT t.classroom_id, l.nm, l.work_key, t.area_id, l.seq, l.descr, l.descr, false, true, 'phonics_pack'
FROM targets t
CROSS JOIN lessons l
WHERE NOT EXISTS (
  SELECT 1 FROM montree_classroom_curriculum_works w
  WHERE w.classroom_id = t.classroom_id AND w.work_key = l.work_key
);

-- Reactivate any previously-hidden phonics rows (in case the flag was toggled off before).
UPDATE montree_classroom_curriculum_works w
SET is_active = true
FROM montree_classrooms c
WHERE w.classroom_id = c.id AND c.school_id = ${q(schoolId)}
  AND w.source = 'phonics_pack' AND w.is_active = false;

-- Repair any photos tagged during the brief virtual-merge window (work_id text 'phonics_NN'
-- → the real seeded row id) so their work name resolves.
UPDATE montree_media m
SET work_id = w.id
FROM montree_classroom_curriculum_works w
JOIN montree_classrooms c ON c.id = w.classroom_id
WHERE c.school_id = ${q(schoolId)}
  AND w.source = 'phonics_pack'
  AND m.classroom_id = w.classroom_id
  AND m.work_id = w.work_key;   -- old virtual id equals the work_key ('phonics_NN')

COMMIT;

-- Verify:
-- SELECT classroom_id, count(*) FROM montree_classroom_curriculum_works
--   WHERE source='phonics_pack' AND is_active GROUP BY 1;`);
