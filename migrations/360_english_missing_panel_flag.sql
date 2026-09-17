-- 360_english_missing_panel_flag.sql
-- "English this week" — the feature-definition row for the compact reminder
-- card that sits above the tab strip on /montree/dashboard/classroom-overview.
--
-- The card lists the active children who have NO teacher-confirmed Language-area
-- photo since the school-local Monday (see
-- app/api/montree/dashboard/english-missing/route.ts). It reads only; it creates
-- no tables, which is why this file has no DDL.
--
-- DEFAULT ON. It is a reminder on a page the teacher already opens, not a new
-- surface, and it is switched off in one tap from the card's own header switch.
-- That switch writes montree_school_features via POST /api/montree/school-features;
-- 'english_missing_panel' is the ONE key that route lets a classroom session
-- toggle without 'feature_self_serve' (CLASSROOM_TOGGLEABLE_KEYS).
--
-- ON CONFLICT DO NOTHING, matching 308 / 325 / 327: production may already have
-- a hand-tuned row, and re-running this must not overwrite it. Schools that have
-- already switched the card off keep their montree_school_features override —
-- that table is untouched here.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Feature flag
-- Column list mirrors lib/montree/features/types.ts (MontreeFeature) +
-- lib/montree/features/server.ts (reads default_enabled off feature_key).
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('english_missing_panel',
   'English This Week',
   'A small card on Classroom Overview showing which children still have no confirmed Language-area photo this week (Monday to Sunday, in the school''s own timezone). Tap a name to open that child''s gallery. Read-only; switch it off from the card itself.',
   '📚',
   'teacher_tools',
   false,
   true)
ON CONFLICT (feature_key) DO NOTHING;
