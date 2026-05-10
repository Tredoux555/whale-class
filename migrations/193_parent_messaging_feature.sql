-- Migration 193: Add parent_messaging feature flag
--
-- Session 98 — gates the new parent-side threaded messaging surface
-- (/montree/parent/messages and the threaded API routes under
-- /api/montree/parent/messages/*). Default OFF for every school. The new
-- threaded architecture mirrors the principal/teacher Communication system
-- shipped in Session 97 (migration 190), so when the flag flips on, parent
-- messages flow into the same montree_message_threads tables the principal
-- already sees in /montree/admin/communication.
--
-- IMPORTANT: keep this OFF for every school until you're ready to migrate
-- parents off any legacy channels. Two channels open simultaneously is the
-- support-ticket scenario this flag is designed to prevent.
--
-- Idempotent — safe to re-run.

INSERT INTO montree_feature_definitions (
  feature_key, name, description, icon, category, is_premium, default_enabled
) VALUES (
  'parent_messaging',
  'Parent Messaging',
  'Enables the new threaded parent messaging surface at /montree/parent/messages. Parents can start threads with their child''s teacher or the principal, and replies route into the same Communication system the principal/teacher use. When OFF: the URL redirects to the parent dashboard and the feature does not appear to exist.',
  '💬',
  'parent_portal',
  false,
  false
) ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category;
