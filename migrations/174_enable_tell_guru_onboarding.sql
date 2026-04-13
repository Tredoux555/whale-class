-- Migration 174: Enable tell_guru_onboarding for Whale Class
-- The feature was defined in migration 171 but NOT enabled for any school.
-- This enables it for Whale Class (Tredoux House) so teachers can onboard children via voice.

INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'tell_guru_onboarding', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
