# Agent Referral & Financial Tracking — Build Plan

**Authored:** May 6, 2026
**Status:** Design locked. Phase 1 implementation begins next session.
**Companion docs:** `docs/finance/accountant-onepager.md` (for HK accountant review)

---

## What this is

A unified system that does two things:

1. **Agent referral programme** — codes that link external agents (teachers, training centres, multipliers, consultants) to schools they bring in, with configurable per-agent revenue share and automated monthly payouts.
2. **Financial tracking module** — a Money tab in super admin that aggregates revenue, direct costs (API + Stripe fees), referral commissions, and operating expenses into a P&L, with monthly export packs for the HK accountant.

This supersedes the original "Teacher Revenue Share" landing page logic from Session 72 (which assumed the teacher signs up as a teacher first and then gets credit when their school converts). The agent-code model is more flexible: any agent — not necessarily a teacher at the school — can refer schools and earn from them.

---

## Decisions locked (from May 6 brainstorm)

| Decision | Value |
|----------|-------|
| Code format | `AGENT-XXXX` style — e.g. `SARAH-K9X7`. 4 random chars after the agent's first name. Excludes I/O/0/1. |
| Codes per agent | Unlimited — one code per pitch. Generated on demand. |
| Code lifecycle | Pending until a school redeems it. Tredoux can delete pending codes if a pitch dies. Once redeemed, the code is locked and the school↔agent link is permanent. |
| Code dual purpose | At redemption, the code is consumed by the school's signup flow AND becomes the principal's login code for that specific school. |
| Multiple schools per agent | Yes. An agent generates a fresh code for each pitch. All earnings roll up under the agent. |
| Adjustable percentage | Per-agent default + per-school override. Tredoux adjusts both manually in super admin. No automated re-calculation; whatever's set is what applies. |
| Profit math | Net profit per school per month = Stripe revenue − (Anthropic + OpenAI + Stripe fee). Agent payout = Net × agent's % for that school. Negative net → agent gets zero (no clawback). |
| Base currency | USD. |
| Payout rail | Stripe Connect Express → Wallex (Tredoux's HK account). |
| Other rails | Architectural support for manual Wallex wire as backup; finalise once banker confirms. |
| Headcount source | `montree_children` count per school (already used for billing). No manual gross entry needed. |

---

## What's already in the codebase

From Session 72 (April 28, 2026):
- `montree_schools.founding_teacher_id` — UUID, references `montree_teachers.id`
- `montree_schools.revenue_share_pct` — default 20
- `montree_schools.revenue_share_active` — boolean
- `montree_teacher_earnings` table — monthly earnings rows per teacher
- `app/api/montree/teacher/earnings/route.ts` — GET earnings for authenticated teacher
- `app/montree/dashboard/earnings/page.tsx` — teacher-side earnings dashboard
- `app/montree/for-teachers/page.tsx` — public landing page (assumes teacher-first flow)
- Teacher signup at `app/api/montree/try/instant/route.ts:332` writes `founding_teacher_id` after teacher creation

We extend rather than replace. `founding_teacher_id` becomes "the agent linked to this school." The teacher dashboard remains for agents who happen to also be teachers; the new super admin UI is the canonical management surface.

---

## Data model additions

### New table: `montree_referral_codes`

```sql
CREATE TABLE montree_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,                    -- e.g. 'SARAH-K9X7'
  agent_id UUID REFERENCES montree_teachers(id),       -- the agent (existing teacher row, or new for non-teacher agents)
  agent_display_name TEXT NOT NULL,                    -- 'Sarah K.' shown to school at redemption
  agent_email TEXT NOT NULL,
  agent_pitch_label TEXT,                              -- optional free-text 'Greenfield Montessori, Auckland — pitch May 2026'
  revenue_share_pct NUMERIC(5,2) NOT NULL,             -- e.g. 50.00
  status TEXT NOT NULL DEFAULT 'pending',              -- 'pending' | 'redeemed' | 'revoked' | 'expired'
  redeemed_by_school_id UUID REFERENCES montree_schools(id),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                              -- nullable; admin can set if needed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,                                     -- super admin who issued it
  notes TEXT
);

CREATE INDEX idx_referral_codes_agent ON montree_referral_codes(agent_id);
CREATE INDEX idx_referral_codes_status ON montree_referral_codes(status);
CREATE INDEX idx_referral_codes_school ON montree_referral_codes(redeemed_by_school_id) WHERE redeemed_by_school_id IS NOT NULL;
```

### New table: `montree_agents` (optional — see Open Question 1)

If we keep treating agents as `montree_teachers` rows, we don't need this table. If we want non-teacher agents (multipliers, consultants who never see Montree as a teacher), we add a thin `montree_agents` table and let `agent_id` reference either. **Recommendation:** for Phase 1, keep using `montree_teachers` (creates a row even for non-teaching agents — they just never log in as a teacher). Revisit if it gets messy.

### New table: `montree_agent_payouts`

Replaces / extends `montree_teacher_earnings`. Wider schema for proper accounting.

```sql
CREATE TABLE montree_agent_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES montree_teachers(id),
  school_id UUID NOT NULL REFERENCES montree_schools(id),
  period_month DATE NOT NULL,                          -- first of month, e.g. '2026-05-01'
  -- The math, immutable once locked:
  gross_revenue_usd NUMERIC(10,2) NOT NULL,            -- what the school paid Stripe
  stripe_fee_usd NUMERIC(10,2) NOT NULL,
  api_cost_anthropic_usd NUMERIC(10,4) NOT NULL,
  api_cost_openai_usd NUMERIC(10,4) NOT NULL,
  net_profit_usd NUMERIC(10,2) NOT NULL,               -- gross - stripe_fee - api_costs
  share_pct NUMERIC(5,2) NOT NULL,                     -- snapshot of % at calc time
  agent_payout_usd NUMERIC(10,2) NOT NULL,             -- net × pct
  -- Status:
  status TEXT NOT NULL DEFAULT 'pending',              -- 'pending' | 'paid' | 'cancelled'
  stripe_transfer_id TEXT,                             -- once Stripe Connect transfer is made
  paid_at TIMESTAMPTZ,
  paid_by_method TEXT,                                 -- 'stripe_connect' | 'wallex_wire' | 'manual'
  fx_rate_used NUMERIC(12,6),                          -- if paying in non-USD
  payout_currency TEXT DEFAULT 'USD',
  -- Audit:
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE(agent_id, school_id, period_month)
);

CREATE INDEX idx_agent_payouts_agent ON montree_agent_payouts(agent_id);
CREATE INDEX idx_agent_payouts_school ON montree_agent_payouts(school_id);
CREATE INDEX idx_agent_payouts_month ON montree_agent_payouts(period_month);
CREATE INDEX idx_agent_payouts_status ON montree_agent_payouts(status);
```

### New table: `montree_finance_transactions`

The unified ledger for the financial dashboard. Every income and expense lands here.

```sql
CREATE TABLE montree_finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,                                  -- 'income' | 'direct_cost' | 'commission' | 'op_expense' | 'fx_adjustment'
  category TEXT NOT NULL,                              -- 'subscription_revenue' | 'api_anthropic' | 'api_openai' | 'stripe_fee' | 'referral_payout' | 'hosting' | 'domain' | 'email_service' | 'other'
  description TEXT NOT NULL,
  -- References:
  school_id UUID REFERENCES montree_schools(id),
  agent_id UUID REFERENCES montree_teachers(id),
  agent_payout_id UUID REFERENCES montree_agent_payouts(id),
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  -- Amounts (multi-currency):
  original_currency TEXT NOT NULL DEFAULT 'USD',
  original_amount NUMERIC(12,4) NOT NULL,
  fx_rate NUMERIC(12,6) NOT NULL DEFAULT 1.0,
  usd_amount NUMERIC(12,4) NOT NULL,
  -- Source:
  source TEXT NOT NULL,                                -- 'stripe_webhook' | 'api_usage_aggregate' | 'manual_entry'
  source_ref TEXT,                                     -- ID in source system
  -- Audit:
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,                                     -- if manual
  notes TEXT
);

CREATE INDEX idx_finance_tx_occurred ON montree_finance_transactions(occurred_at);
CREATE INDEX idx_finance_tx_type ON montree_finance_transactions(type);
CREATE INDEX idx_finance_tx_school ON montree_finance_transactions(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_finance_tx_agent ON montree_finance_transactions(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_finance_tx_month ON montree_finance_transactions(date_trunc('month', occurred_at));
```

### Schema additions to existing tables

```sql
-- Agents need a Stripe Connect account for payouts.
ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT,        -- 'pending' | 'verified' | 'restricted' | 'disabled'
  ADD COLUMN IF NOT EXISTS stripe_connect_completed_at TIMESTAMPTZ;

-- Make founding_teacher_id semantics explicit. (No data migration needed; it already means what we want.)
COMMENT ON COLUMN montree_schools.founding_teacher_id IS 'The agent linked to this school via referral code. Receives revenue share per montree_referral_codes table. NULL = direct signup (no agent).';

-- Track the redemption code on the school for traceability.
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS referral_code_id UUID REFERENCES montree_referral_codes(id),
  ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(20);     -- denormalised for quick lookup
```

---

## Build phases

### Phase 1 — Foundation (DB + code generation backend)

Goal: Tredoux can issue codes from super admin and see them. No redemption flow yet, no payouts, no dashboard.

1. Migration `186_referral_codes.sql` — creates `montree_referral_codes`, adds `referral_code_id` and `referral_code_used` to `montree_schools`, adds Stripe Connect columns to `montree_teachers`.
2. Migration `187_agent_payouts.sql` — creates `montree_agent_payouts`. (Old `montree_teacher_earnings` left in place for now; we'll backfill or sunset later.)
3. Migration `188_finance_transactions.sql` — creates `montree_finance_transactions`.
4. API: `POST /api/montree/super-admin/referral-codes` — creates a code. Body: `agent_id`, `agent_display_name`, `agent_email`, `revenue_share_pct`, optional `agent_pitch_label`, `expires_at`, `notes`. If `agent_id` is null, creates a `montree_teachers` row first with no login (`is_active=false`, no school). Generates `<FIRSTNAME>-XXXX` code, returns plain code once.
5. API: `GET /api/montree/super-admin/referral-codes` — list with filters (status, agent, school).
6. API: `DELETE /api/montree/super-admin/referral-codes?id=X` — only allowed if `status='pending'`. Sets to `revoked`.
7. Super admin UI: new "Referrals" tab. Form to issue a code. Table of codes with status, agent, school (if redeemed), date, copy button, delete button.

### Phase 2 — Redemption flow

Goal: school signing up with an agent code is correctly linked.

1. Update `app/montree/try/page.tsx` (and any sister signup page) to detect `?ref=CODE` URL param OR show a "Have a referral code?" field.
2. Update `app/api/montree/try/instant/route.ts` (or the canonical signup route): validate the code, on success: stamp `school.founding_teacher_id`, `school.revenue_share_pct`, `school.revenue_share_active=true`, `school.referral_code_id`, `school.referral_code_used`. Mark the code as `redeemed`.
3. **Dual purpose at redemption:** the same code becomes the principal's login code. We hash the code into `montree_school_admins.password_hash` for the principal account created at signup. This is the only place the code's plaintext lives in the DB outside the referral_codes table itself (and the referral_codes table can stay plaintext since it's super-admin-only).
4. Update `montree_finance_transactions` insertion in the Stripe webhook flow (Phase 4) so income tied to a school with `referral_code_id` automatically generates a `commission` line item per month.

### Phase 3 — Stripe Connect onboarding for agents

Goal: agents can receive automated payouts.

1. New page `/montree/agent/onboard?token=<one-time>` — agent receives a unique link from Tredoux, lands on a page that walks them through Stripe Connect Express onboarding.
2. API: `POST /api/montree/agent/connect-onboard` — creates the Stripe Connect Express account, returns the onboarding URL.
3. API: `POST /api/stripe/connect-webhook` — receives Stripe's account update events, writes `stripe_connect_status` and `stripe_connect_completed_at` on the agent.
4. Super admin: agent list shows Connect status per agent, with a "resend onboarding link" button.

### Phase 4 — Stripe school subscription billing (precondition for automated revenue)

Goal: schools actually get billed via Stripe. Per CLAUDE.md, this is currently a manual `personal_classroom` → `school` transition; no automated billing exists. Without this, Phase 5 has nothing to track.

This is a substantial workstream of its own. Tracked here as a precondition. **If it slips**, Phase 5 falls back to manually entering monthly gross revenue per school in super admin.

1. Stripe Products + Prices for the `school` plan (per-student metered or fixed-quantity per month).
2. Checkout session flow: `personal_classroom` → upgrade button → Stripe Checkout → webhook updates `montree_schools.subscription_status='active'`, `plan_type='school'`.
3. `POST /api/stripe/webhook` — handles `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`. On `invoice.paid`, writes an `income` row to `montree_finance_transactions` with the school's `school_id` and category `subscription_revenue`. Stripe fees written as separate `direct_cost` rows.

### Phase 5 — Payout calculation engine

Goal: at end of each month (or on demand), calculate what every agent is owed.

1. Job: `calculate-monthly-payouts(period_month)` — for each school with an active `referral_code_id`:
   - Sum `subscription_revenue` for that school from `finance_transactions` for the period.
   - Sum `stripe_fee` for that school for the period.
   - Aggregate `montree_api_usage` rows for that school for the period (Anthropic + OpenAI separately).
   - `net = gross - stripe_fee - api_costs`. If `net <= 0`, write payout row with `agent_payout_usd = 0`. Otherwise `agent_payout = net × school.revenue_share_pct`.
   - UPSERT into `montree_agent_payouts` with `status='pending'`. Idempotent on `(agent_id, school_id, period_month)`.
2. API: `POST /api/montree/super-admin/payouts/calculate` — runs the job for the requested period. Returns summary.
3. API: `POST /api/montree/super-admin/payouts/[id]/pay` — triggers the Stripe Connect transfer (or marks manually paid for Wallex wire). Writes `commission` line to `montree_finance_transactions`.
4. API: `POST /api/montree/super-admin/payouts/run-stripe-batch` — for all `status='pending'` payouts where the agent has a verified Connect account, batch-creates Stripe Transfers. Updates each row with `stripe_transfer_id`, `status='paid'`, `paid_at`.
5. Cron later: monthly auto-run on day 5 of each month for the previous month. Manual trigger first; cron only after we've watched it work for 2-3 cycles.

### Phase 6 — Money tab in super admin

Goal: Tredoux opens super admin, clicks Money, sees the whole financial picture.

1. New tab `/montree/super-admin/money` (or accessible via tab switch on existing super admin page).
2. **Section: Income** — Stripe deposits this month / YTD, breakdown by school. Sortable, filterable by date range.
3. **Section: Direct costs** — API usage chart (Anthropic vs OpenAI), per-school breakdown table, Stripe fees total.
4. **Section: Commissions** — agent payouts owed (pending) and paid this month / YTD, by agent.
5. **Section: Operating expenses** — manual entry form (date, category, description, amount, currency, FX rate, receipt URL upload). Table of all op-ex with edit/delete.
6. **Section: P&L** — clean monthly view: revenue − direct costs − commissions − op-ex = net profit. Side-by-side with previous month and YTD totals.
7. **Section: Exports** — three buttons: Download CSV (`transactions_<month>.csv`), Download PDF summary, Download Accountant Pack (ZIP with everything per the one-pager spec).

### Phase 7 — Public-facing agent dashboard refresh

Goal: agents who happen to also be teachers see a clean view of their schools and earnings. Replace the existing `/montree/dashboard/earnings` to show: schools linked, monthly statement per school, total paid, total pending, Stripe Connect status.

The current `for-teachers` landing page either gets repurposed (for the public agent recruitment story, with a "Request a code from us" CTA) or retired (since we're now hand-issuing codes rather than self-serve). **Decision deferred** — depends on how broadly Tredoux wants to recruit. For Phase 1-6, we leave it as-is and decide in Phase 7.

---

## Stripe Connect specifics

We'll use **Stripe Connect Express** (not Standard, not Custom):
- Express = Stripe-hosted onboarding form, Stripe handles tax forms, minimal liability for us. Best for marketplace-style payouts to many independent agents.
- The agent's Stripe Connect account is a separate Stripe entity from our platform account. We make Stripe Transfers from our platform balance to their account.
- Stripe Connect requires the platform (us) to be in a Stripe-supported country. Hong Kong is supported as of 2026. Tredoux's Stripe account region must match where Wallex receives the deposits.

Key Stripe API calls we'll need:
- `accounts.create({ type: 'express', country: 'HK', email: agent_email })` — when agent is invited
- `accountLinks.create({ account, type: 'account_onboarding' })` — generates the URL we send to the agent
- `transfers.create({ amount, currency: 'usd', destination: agent_account_id })` — at payout time
- Webhook events: `account.updated`, `transfer.paid`, `transfer.failed`

Tax form handling (1099-NEC for US, equivalents elsewhere) is automatic in Express mode.

---

## Risks & open questions

1. **Non-teacher agents — should they get `montree_teachers` rows?** Recommendation: yes for Phase 1 (cleaner), with `is_active=false` and no `classroom_id`. They never log in as a teacher. We can extract a `montree_agents` table later if it gets messy. Confirm before Phase 1.
2. **Stripe HK availability for Connect Express** — confirm Tredoux's banker check. If HK isn't supported for Express specifically, we fall back to Stripe Standard or manual Wallex wires.
3. **What happens if an agent leaves and a new one takes credit?** Decision: only one agent per school, set at redemption, immutable (manually editable in super admin if Tredoux needs to override). Documented.
4. **Stripe school subscription billing isn't shipped.** Phase 4 is a precondition for automated payouts. Until it ships, the dashboard shows manually-entered monthly gross.
5. **Refunds** — when a school refunds, we write a negative `subscription_revenue` line. The next monthly calc sees it; if a payout already happened to the agent for that month, the next month's payout is reduced (carry-forward), or zero if the offset is bigger than the next month's earnings. Never claw back a paid-out commission.
6. **Existing `montree_teacher_earnings` rows** — none exist yet (per CLAUDE.md, the system has been live but no earnings have flowed through). Safe to leave the table in place and not write to it going forward; new rows go to `montree_agent_payouts`.
7. **The existing `/montree/for-teachers` landing page** assumes the old self-serve flow. Either repurpose for "request an agent code from us" or retire. Phase 7 decision.

---

## Estimated effort (rough)

| Phase | Estimate | Confidence |
|-------|----------|------------|
| 1. Foundation | 1 day | High |
| 2. Redemption | 1 day | High |
| 3. Stripe Connect onboarding | 1.5 days | Medium (depends on Stripe HK config) |
| 4. Stripe school billing | 3-4 days | Medium (precondition) |
| 5. Payout calculation engine | 1.5 days | High |
| 6. Money tab | 2-3 days | High |
| 7. Agent dashboard refresh | 0.5 days | High |
| **Total** | **~10-12 days** | — |

Phases 1-2 are independently shippable and unblock issuing the first agent code. Phases 3-7 can ship in any order after Phase 2 once the precondition (Phase 4 for full automation, or manual entry as fallback) is met.

---

## What ships in the next session

Phase 1 — DB migrations + code generation backend + super admin UI for issuing and listing codes. After that lands, Tredoux can issue Sarah's first code and we know the foundation is solid before building redemption.
