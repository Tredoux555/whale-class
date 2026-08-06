-- 317_montree_org_director_logins.sql
-- Organisation DIRECTOR login codes — the uniform porthole.
--
-- Fully idempotent. Safe to paste twice. Additive only: it adds ONE nullable column to
-- montree_organization_admins (migration 315). Nothing here drops or rewrites anything, and
-- every existing director keeps signing in with their email + password exactly as before.
--
-- Why this exists:
--
--   Every other human in Montree arrives through the same door — a teacher types a 6-character
--   code, so does a principal, so does a parent. The organisation director was the one role
--   that could ONLY sign in with an email and a password, because they chose those when they
--   redeemed their invite link. That asymmetry showed: a director standing next to their
--   principals had to be told "not you, you use the other page". Now they get a code too, and
--   /montree/org/login accepts either.
--
--   The code is a SECOND credential, never a replacement. Email + password keeps working
--   unchanged; nothing about the existing login path is touched.
--
-- Shape of the column, and why:
--
--   • TEXT, nullable. Every director row created before this migration has NULL, and that is a
--     legitimate permanent state — a code is issued on registration from here on, and can be
--     (re)issued at any time from the super-admin console. Nothing anywhere requires it.
--   • UNIQUE. The code IS the identifier on the code path — /api/montree/org/login looks a
--     director up by it — so two directors sharing one would be an account-takeover bug, not a
--     cosmetic collision. Postgres UNIQUE ignores NULLs, so any number of code-less directors
--     coexist happily.
--   • Stored in PLAINTEXT, like montree_teachers.login_code and montree_school_admins.login_code
--     before it. Deliberate and consistent with the house posture: these are short shared codes
--     an operator must be able to read back to the person who lost theirs (that is what the
--     super-admin god view is FOR). The password_hash column beside it stays bcrypt and is the
--     real secret; a code is a convenience credential for a low-stakes leadership dashboard.
--
-- Tenancy / RLS: house style — RLS is already ON for this table (315) with a permissive
-- service-role policy for Supabase Advisor hygiene. The API layer is the real boundary: the
-- code path resolves the director row itself and mints a JWT scoped to that row's
-- organization_id, and every org route filters on the organizationId in the JWT. Do NOT treat
-- the policy as a security boundary. Nothing in this migration changes that posture.

BEGIN;

-- ────────────────────────────────── montree_organization_admins.login_code ──
ALTER TABLE montree_organization_admins ADD COLUMN IF NOT EXISTS login_code TEXT;

-- The UNIQUE constraint is added as a partial unique INDEX rather than a table constraint:
-- CREATE UNIQUE INDEX has IF NOT EXISTS (ADD CONSTRAINT does not), and the WHERE clause makes
-- the intent explicit — code-less directors are normal and unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_org_admins_login_code_unique
  ON montree_organization_admins (login_code)
  WHERE login_code IS NOT NULL;

COMMENT ON COLUMN montree_organization_admins.login_code IS
  'Optional 6-character login code (house alphabet, no 0/O/1/I) issued by lib/montree/secure-code.ts, the same generator teachers and principals use. Plaintext by design — an operator must be able to read it back to a director who lost theirs. A SECOND credential alongside email + password, never a replacement: /api/montree/org/login accepts either. NULL for every director who registered before migration 317 and for anyone whose code has been withdrawn.';

COMMIT;
