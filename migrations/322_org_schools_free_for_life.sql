-- 322_org_schools_free_for_life.sql
-- Organisation schools are FREE FOR LIFE — backfill for the schools that already exist.
--
-- Fully idempotent. Safe to paste twice. Additive only: it adds NO columns and creates NO
-- tables. It rewrites billing state on schools that carry an organization_id (migration 315),
-- and grants those schools the permanent Premium AI flags. Nothing else on the platform is
-- touched — a school with organization_id IS NULL is not read, let alone written.
--
-- Why this exists:
--
--   Every organisation on Montree today is a non-profit validation partner the founder
--   onboarded by hand. They never pay. Until now a school that arrived through an
--   organisation's invite link was written exactly like a self-serve signup — 'trialing' with
--   a trial_ends_at a few days out — which means each one was quietly counting down to a 402
--   in the middle of a school term, and to an "your trial is ending" banner in front of a
--   principal who was invited personally. The application code that creates these schools now
--   writes the free-for-life shape at insert time (see lib/montree/org/free-for-life.ts). This
--   migration is the one-time catch-up for the schools created BEFORE that change.
--
-- The grant has two halves, and BOTH are needed:
--
--   1. The school row. subscription_status 'active' (not 'trialing' — TrialExpiringBanner and
--      the trial sweeps only look at 'trialing', so 'active' + trial_ends_at NULL is what makes
--      an organisation school invisible to every countdown in the product), trial_ends_at NULL,
--      billing_override_usd 0 (migration 202 — $0 per student per month), and a readable note
--      so the next person who opens the schools view knows WHY it is free.
--
--   2. The AI tier flags. lib/montree/reports/resolve-model.ts::deriveTier reads
--      ai_tier_sonnet BEFORE it ever looks at subscription state, so the flag — not the
--      subscription — is what actually keeps the AI on. Setting only half the grant produces a
--      school that looks paid-for and behaves free, or the reverse. ai_tier_haiku is set
--      alongside it because sonnet is a strict superset: any independent "requires haiku" gate
--      elsewhere must still pass. This is exactly what lib/montree/billing/apply-ai-tier.ts
--      writes at runtime, expressed in SQL.
--
--   The budget columns move with the flags for the same reason applyAiTier moves them:
--   $9999 / 'warn' is the Premium posture (never hard-limit a partner mid-lesson).
--
-- Manual overrides: this deliberately does NOT preserve a hand-set billing_override_usd on an
-- organisation school. There are none today, and "the organisation tier is free" is the rule
-- the platform now enforces in code at every door; a stale per-school price would silently
-- contradict it. If a paying organisation school ever exists, set its override AFTER running
-- this, and remove it from the WHERE clause below before running it again.
--
-- Tenancy / RLS: unchanged. montree_schools and montree_school_features already have RLS on
-- with permissive service-role policies (migration 134 for the features table); the API layer
-- is the real boundary. Nothing here alters that posture.

BEGIN;

-- ────────────────────────────────────── 1. The school rows: no trial, no price ──
-- The WHERE is doubly guarded: organisation schools only, and only rows not already in the
-- target shape. The second half is what makes a re-run a no-op rather than a rewrite of
-- (identical) values, and keeps the row count in the output honest about what changed.
UPDATE montree_schools
SET
  subscription_status   = 'active',
  trial_ends_at         = NULL,
  billing_override_usd  = 0,
  billing_override_note = 'Organization school — free for life'
WHERE organization_id IS NOT NULL
  AND (
    subscription_status IS DISTINCT FROM 'active'
    OR trial_ends_at IS NOT NULL
    OR billing_override_usd IS DISTINCT FROM 0
    OR billing_override_note IS DISTINCT FROM 'Organization school — free for life'
  );

-- ──────────────────────────────── 2. Permanent Premium: the two AI tier flags ──
-- One INSERT ... SELECT per flag over every organisation school. The conflict target is the
-- table's own UNIQUE (school_id, feature_key) from migration 134, so a school that already
-- carries the flag is updated in place rather than duplicated — and a school that was
-- explicitly switched OFF is switched back ON, which is the intent: the grant is the rule.
--
-- The DO UPDATE carries the same change-guard the school UPDATEs above carry, and for the same
-- two reasons: a re-run is then a true no-op instead of rewriting enabled_by/enabled_at on every
-- org school (which would erase the record of WHO actually granted a flag and WHEN, replacing an
-- honest audit trail with the timestamp of the last time somebody pasted this file), and the
-- reported row count stays honest about what really changed.
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
SELECT s.id, 'ai_tier_sonnet', TRUE, 'migration_322_org_free_for_life'
FROM montree_schools s
WHERE s.organization_id IS NOT NULL
ON CONFLICT (school_id, feature_key)
DO UPDATE SET enabled = TRUE, enabled_by = EXCLUDED.enabled_by, enabled_at = now()
WHERE montree_school_features.enabled IS DISTINCT FROM TRUE;

-- Sonnet is a strict superset of Haiku in resolve-model's ladder, but any standalone
-- "requires ai_tier_haiku" check elsewhere must still pass — applyAiTier() sets both for the
-- same reason. Keep them in lockstep.
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
SELECT s.id, 'ai_tier_haiku', TRUE, 'migration_322_org_free_for_life'
FROM montree_schools s
WHERE s.organization_id IS NOT NULL
ON CONFLICT (school_id, feature_key)
DO UPDATE SET enabled = TRUE, enabled_by = EXCLUDED.enabled_by, enabled_at = now()
WHERE montree_school_features.enabled IS DISTINCT FROM TRUE;

-- ─────────────────────────────────────────── 3. Budget posture matches the tier ──
-- $9999 / 'warn' is what applyAiTier writes for the sonnet tier: effectively uncapped, with a
-- warning rather than a hard stop, so a partner school can never be cut off mid-lesson by a
-- budget rule that was written for paying self-serve accounts.
UPDATE montree_schools
SET monthly_ai_budget_usd = 9999,
    ai_budget_action      = 'warn'
WHERE organization_id IS NOT NULL
  AND (
    monthly_ai_budget_usd IS DISTINCT FROM 9999
    OR ai_budget_action IS DISTINCT FROM 'warn'
  );

COMMENT ON COLUMN montree_schools.organization_id IS
  'The organisation (migration 315) this school belongs to, or NULL for a self-serve school. Load-bearing for BILLING as well as reporting: a non-NULL organization_id means the school is a non-profit validation partner and is free for life — subscription_status ''active'', no trial_ends_at, billing_override_usd 0, and permanent Premium AI flags. Written that way at every creation door (lib/montree/org/free-for-life.ts) and backfilled by migration 322. ON DELETE SET NULL, so deleting an organisation orphans its schools rather than destroying them — an orphaned school keeps whatever billing state it had.';

COMMIT;
