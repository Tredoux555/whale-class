-- 327_work_rhythm_feature.sql
-- Work Rhythm — the missing feature-definition row.
--
-- Work Rhythm (/montree/dashboard/work-rhythm) shows one vertical, colour-banded
-- bar per child: where that child's classroom time actually went across the five
-- Montessori areas, over a week or a month. It answers the school's headline ask
-- — "clearly indicate where each child is spending most of their time".
--
-- READ-ONLY. It creates NO tables and writes nothing, which is why this file has
-- no DDL: it reads teacher-approved Paper Scan extractions (migration 308) and
-- teacher-confirmed photos, and derives everything else. See
-- app/api/montree/work-rhythm/route.ts for why those two sources and only those.
--
-- WHY THIS FILE EXISTS AT ALL: the definition row was inserted by hand in
-- production when the feature shipped, so it existed in prod and NOWHERE in the
-- repo. Any fresh database — a new environment, a local restore, a rebuild —
-- came up without it, and because GET /api/montree/features maps over
-- montree_feature_definitions, 'work_rhythm' was then invisible in both
-- switchboards and isEnabled('work_rhythm') was hardcoded false forever: no
-- menu row, and the page's own gate closed. This file is that hand-run INSERT,
-- written down. Every sibling feature already has one (308 paper scan, 325 photo
-- onboarding, 326 child onboarding).
--
-- ON CONFLICT DO NOTHING, matching 308 + 325: production already has this row,
-- possibly with a hand-tuned name/description, and re-running this must not
-- overwrite it. Schools that already opted in keep their montree_school_features
-- override either way — that table is untouched here.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Feature flag
-- Column list mirrors lib/montree/features/types.ts (MontreeFeature) +
-- lib/montree/features/server.ts (reads default_enabled off feature_key).
-- Default OFF: it is only meaningful once a school is actually recording
-- through Paper Scan or confirmed photos — an empty chart is worse than no
-- chart. Schools opt in. Matches the 'work_rhythm' comment in types.ts.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('work_rhythm',
   'Work Rhythm',
   'See where each child''s classroom time actually goes across the five areas, over a week or a month — one bar per child, built from approved paper scans and confirmed photos. Read-only; it records nothing new.',
   '📊',
   'teacher_tools',
   false,
   false)
ON CONFLICT (feature_key) DO NOTHING;
