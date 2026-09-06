-- migrations/351_session_revocation.sql
--
-- Adds the ability to END a login session. Today there is none.
--
-- ── The problem ──────────────────────────────────────────────────────────────
-- Montree sessions are stateless signed JWTs with a 3650-day (≈10 year) lifetime
-- — a deliberate product decision (lib/montree/server-auth.ts): a teacher on
-- their own classroom device must never be silently logged out mid-class. The
-- cost of that decision is that a token, once minted, is valid for ten years and
-- NOTHING can stop it. There is no server-side session record to delete. If a
-- teacher's phone is stolen, or a laptop is sold, or a login code is shared with
-- someone who leaves the school, the only remedy available today is rotating
-- MONTREE_JWT_SECRET — which logs out every teacher, principal and parent in
-- every school at once.
--
-- "Log out" in the product only clears the cookie on that one device. The token
-- itself keeps working anywhere it was copied.
--
-- ── What this adds ───────────────────────────────────────────────────────────
-- One nullable timestamp per identity: `sessions_revoked_at`.
--
-- Every Montree JWT carries an `iat` (issued-at) claim. verifySchoolRequest()
-- now rejects any token whose `iat` is EARLIER than the account's
-- sessions_revoked_at. Setting the column to NOW() therefore invalidates every
-- token that account has ever been issued, everywhere, at once — while any
-- session created afterwards keeps working normally. That is "sign out
-- everywhere", and it is the mechanism behind
-- POST /api/montree/auth/sign-out-everywhere.
--
-- A NULL (the default, and the state of every existing row) means "nothing
-- revoked" and is the 99.99% case, so the check costs nothing in practice: the
-- lookup is cached in-process for 60 seconds exactly like the abuse-lock check
-- it sits next to, and it FAILS OPEN, so a database problem can never lock the
-- world out. Same design contract as migration 286 / lib/montree/school-lock.ts.
--
-- ── The three identity tables ────────────────────────────────────────────────
-- A token's `sub` points at one of three tables, depending on its role:
--   montree_teachers            — role 'teacher', 'agent', 'homeschool_parent'
--   montree_school_admins       — role 'principal'
--   montree_organization_admins — role 'org_admin'
-- All three get the column.
--
-- Idempotent, additive, and reversible (see the ROLLBACK note at the bottom).
-- Adding a nullable column takes no table rewrite and no long lock in Postgres.


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 1 — DRY RUN. Confirms the three tables exist and do not already have it.
-- ═════════════════════════════════════════════════════════════════════════════

SELECT
  t.table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.table_name
      AND c.column_name = 'sessions_revoked_at'
  ) AS already_has_column
FROM (VALUES
  ('montree_teachers'),
  ('montree_school_admins'),
  ('montree_organization_admins')
) AS t(table_name)
ORDER BY t.table_name;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 2 — THE MIGRATION.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

ALTER TABLE montree_school_admins
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

ALTER TABLE montree_organization_admins
  ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

COMMENT ON COLUMN montree_teachers.sessions_revoked_at IS
  'Sign-out-everywhere marker. Any session JWT issued (iat) BEFORE this instant '
  'is rejected by verifySchoolRequest. NULL = nothing revoked. Set to NOW() to '
  'invalidate every existing session for this account on every device.';

COMMENT ON COLUMN montree_school_admins.sessions_revoked_at IS
  'Sign-out-everywhere marker — see montree_teachers.sessions_revoked_at.';

COMMENT ON COLUMN montree_organization_admins.sessions_revoked_at IS
  'Sign-out-everywhere marker — see montree_teachers.sessions_revoked_at.';

COMMIT;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFY. Expect three rows, data_type = 'timestamp with time zone'.
-- ═════════════════════════════════════════════════════════════════════════════

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'sessions_revoked_at'
ORDER BY table_name;


-- ═════════════════════════════════════════════════════════════════════════════
-- USEFUL AFTERWARDS — how to actually sign someone out everywhere by hand
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Normally this happens through the app (a teacher pressing "sign out of all
-- devices"). To do it manually for one account, e.g. a lost phone:
--
--   UPDATE montree_teachers
--      SET sessions_revoked_at = NOW()
--    WHERE id = '<teacher uuid>';
--
-- To sign out every teacher in one school (e.g. a shared code leaked):
--
--   UPDATE montree_teachers
--      SET sessions_revoked_at = NOW()
--    WHERE school_id = '<school uuid>';
--
-- Effect is immediate on the container that served the write and within 60
-- seconds everywhere else (the in-process cache TTL). To UNDO a revocation
-- before anyone has logged back in, set the column back to NULL.
--
-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Dropping the columns fully reverts this migration; the application code
-- treats a missing column as "nothing revoked" (it fails open), so code and
-- database can be rolled back in either order.
--
--   ALTER TABLE montree_teachers            DROP COLUMN IF EXISTS sessions_revoked_at;
--   ALTER TABLE montree_school_admins       DROP COLUMN IF EXISTS sessions_revoked_at;
--   ALTER TABLE montree_organization_admins DROP COLUMN IF EXISTS sessions_revoked_at;
