-- Migration 175: Flip tell_guru_onboarding default to enabled
--
-- Background: Migration 171 added the feature with default_enabled=false. Migration 174
-- enabled it specifically for Whale Class. With Session 79's smart voice onboarding
-- orchestrator now live, every new school should get this feature on by default —
-- otherwise the post-bulk-import flow never fires for new sign-ups.
--
-- Resolution priority in app: classroom_override > school_override > default_enabled.
-- Whale Class's explicit school-level override (migration 174) takes precedence
-- regardless of this default change. Any school can opt out via school OR classroom
-- override at any time.

UPDATE montree_feature_definitions
SET default_enabled = true
WHERE feature_key = 'tell_guru_onboarding';
