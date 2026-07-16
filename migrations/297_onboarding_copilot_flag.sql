-- migrations/297_onboarding_copilot_flag.sql
--
-- Onboarding Copilot ("The Guide") — feature flag ONLY.
--
-- A floating guide dock that walks a new principal (Astra voice) or teacher
-- (Guru voice) through first setup, deriving completion from real DB state so
-- established schools complete instantly and the dock retires itself.
--
-- 🚨 default_enabled = TRUE — rollout is everyone (contract §0.2). The engine
-- self-derives state, so there is no noise for schools already past setup.
--
-- To turn OFF for a specific school:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key = 'onboarding_copilot';
--
-- Idempotent — safe to re-run.

BEGIN;

INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  (
    'onboarding_copilot',
    'Onboarding Guide',
    'A friendly guide dock that walks new principals and teachers through their first setup — one deterministic step at a time, ticking itself off from real classroom data, with an AI companion (Astra / Guru) on hand for any question. Default ON; retires itself once setup is complete.',
    '🧭',
    'management',
    false,
    true
  )
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    is_premium = EXCLUDED.is_premium,
    default_enabled = EXCLUDED.default_enabled;

COMMIT;
