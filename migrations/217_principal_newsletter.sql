-- migrations/217_principal_newsletter.sql
--
-- Phase 3 of the School Ecosystem Plan — newsletter / announcement email
-- delivery. The broadcast infrastructure itself (Session 97) is already
-- in place: thread_type='broadcast', resolveBroadcastScope, fan-out
-- participant inserts. This migration JUST registers the feature flag.
--
-- When the flag is ON for a school, the /api/montree/messages/broadcast
-- route fires a Resend email to every parent recipient ALONGSIDE
-- creating the in-app thread. When OFF, broadcasts stay in-app only.
-- Either way, the in-app surface and read-receipts behave identically —
-- this flag only governs the email push channel.
--
-- Idempotent.

BEGIN;

INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'principal_newsletter',
  'Newsletter email delivery',
  'When ON, principal broadcasts to parents send an email alongside the in-app notification. Read receipts work either way.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;

-- Verification:
--   SELECT feature_key, default_enabled FROM montree_feature_definitions
--   WHERE feature_key = 'principal_newsletter';
--
-- To enable for a school:
--   INSERT INTO montree_school_features (school_id, feature_key, enabled)
--   VALUES ('<school_uuid>', 'principal_newsletter', true)
--   ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
