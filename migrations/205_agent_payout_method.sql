-- Migration 205 — Manual payout architecture for agents in countries Stripe
-- Connect Express doesn't support (China, Palestine, Lebanon, etc.) or for
-- agents who prefer a manual wire over Stripe's automated rail.
--
-- Two-mode system on montree_teachers:
--   payout_method = 'stripe_connect' (default) → existing Connect Express flow
--   payout_method = 'manual_wire'              → super-admin wires manually via
--                                                Wise / SWIFT / Wallex, records
--                                                the result in montree_agent_payouts
--                                                with paid_by_method='manual_wire'
--
-- manual_payout_details is a JSONB blob with the agent's banking info. Stored
-- as plain JSONB rather than encrypted at-rest because:
--   - Access is super-admin-only via service role (RLS would deny anon/auth)
--   - Agents PATCH their own row via JWT auth (only their row, by user_id match)
--   - Stripe doesn't encrypt the same data either
-- If future audit requires column-level encryption, wrap with pgcrypto or
-- app-layer AES-GCM using MESSAGE_ENCRYPTION_KEY env var.
--
-- Shape of manual_payout_details (free-form, UI-validated):
-- {
--   "method": "wise" | "swift" | "paypal" | "other",
--   "currency": "ZAR" | "USD" | "EUR" | ...,
--   "country": "ZA",
--   "account_holder_name": "Full name as per ID",
--   "bank_name": "First National Bank",
--   "account_number": "1234567890",
--   "swift_code": "FIRNZAJJ",
--   "branch_code": "250655",
--   "branch_name": "Sandton",
--   "iban": "DE89...",            // EU agents
--   "routing_number": "111000025", // US agents
--   "notes": "free text"
-- }
--
-- Idempotent — IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.

BEGIN;

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS payout_method TEXT NOT NULL DEFAULT 'stripe_connect',
  ADD COLUMN IF NOT EXISTS manual_payout_details JSONB,
  ADD COLUMN IF NOT EXISTS manual_payout_details_updated_at TIMESTAMPTZ;

ALTER TABLE montree_teachers
  DROP CONSTRAINT IF EXISTS montree_teachers_payout_method_check;
ALTER TABLE montree_teachers
  ADD CONSTRAINT montree_teachers_payout_method_check
  CHECK (payout_method IN ('stripe_connect', 'manual_wire'));

-- Partial index for super-admin's "manual-wire agents" filter.
CREATE INDEX IF NOT EXISTS idx_teachers_manual_wire_active
  ON montree_teachers(id)
  WHERE is_agent = TRUE
    AND payout_method = 'manual_wire'
    AND agent_suspended_at IS NULL;

COMMENT ON COLUMN montree_teachers.payout_method IS
  'Which rail pays this agent. stripe_connect = automated Stripe transfer (default, for supported countries). manual_wire = super-admin wires manually via Wise/SWIFT (for China, Palestine, ZA-optional, etc.). Set at agent-code issuance; rarely changed.';

COMMENT ON COLUMN montree_teachers.manual_payout_details IS
  'JSONB with bank details for manual_wire agents. NULL for stripe_connect agents (Stripe holds those). See migration 205 SQL comments for canonical shape.';

COMMIT;

-- ── Verification queries ───────────────────────────────────────────────────
-- SELECT payout_method, count(*) FROM montree_teachers WHERE is_agent = TRUE GROUP BY payout_method;
-- SELECT id, name, email, payout_method, manual_payout_details IS NOT NULL AS has_details
--   FROM montree_teachers WHERE is_agent = TRUE ORDER BY created_at DESC;
