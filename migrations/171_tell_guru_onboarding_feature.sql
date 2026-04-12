-- Migration 171: Add tell_guru_onboarding feature flag
-- Voice-first child onboarding (Tell Guru card). Disabled by default — enable when ready to test.

INSERT INTO montree_feature_definitions (
  feature_key, name, description, icon, category, is_premium, default_enabled
) VALUES (
  'tell_guru_onboarding',
  'Tell Guru Onboarding',
  'Shows voice onboarding card on child pages when no mental profile exists. Teacher describes the child via voice, Guru extracts structured profile.',
  '🌱',
  'ai_tools',
  false,
  false
) ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category;
