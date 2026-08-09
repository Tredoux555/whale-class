-- =============================================================================
-- 323_fix_child_evaluation_icon.sql — fix the Montree Milestones feature icon
-- =============================================================================
-- Both feature-switchboard surfaces (SchoolFeaturesModal.tsx in super-admin,
-- and app/montree/dashboard/school-features/page.tsx for a school with Give
-- Control) render `montree_feature_definitions.icon` as-is: `{f.icon}` /
-- `<span>{f.icon}</span>`. The contract (see migration 322's comment on the
-- Canopy insert) is that this column is always an emoji.
--
-- Migration 314 shipped `child_evaluation`'s icon as the lucide *component
-- name* 'ClipboardCheck' instead of an emoji, so every switchboard renders
-- the literal word "ClipboardCheck" in the icon slot. This was always wrong,
-- but sat unnoticed at the bottom of an alphabetically-sorted list; migration
-- 322 (Aug 9) moved 'assessment' to the TOP of both switchboards, which is
-- what made it visible.
--
-- Data-only fix, no code change needed: every renderer already treats this
-- column as opaque display text. Idempotent — safe to run twice.
-- =============================================================================

UPDATE montree_feature_definitions
SET icon = '📋'
WHERE feature_key = 'child_evaluation'
  AND icon = 'ClipboardCheck';

-- verify:
--   SELECT feature_key, icon FROM montree_feature_definitions WHERE feature_key = 'child_evaluation';
-- Expect: child_evaluation | 📋
