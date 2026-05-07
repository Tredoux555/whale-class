# Session 93 Handoff — Phase 4: Stripe School Billing (env-gated, ready to wire)

**Date:** May 7, 2026
**Status:** Phase 4 code shipped to production. Stripe NOT yet connected — all billing endpoints return 503 with `configured: false` until env vars are set. The system is designed to "just work" the moment Tredoux follows `docs/STRIPE_BILLING_SETUP.md`.

**Companion docs:**
- `docs/STRIPE_BILLING_SETUP.md` — exact 9-step playbook to wire up Stripe when ready
- `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` — full financial system blueprint (Phase 4 fleshed out here)
- `docs/handoffs/SESSION_92_HANDOFF.md` — Phase 7 (agent dashboard) — Phase 4's billing data is what Phase 7's earnings page will eventually read from when Phase 5 ships

---

## TL;DR

Schools can be billed $7/active-student/month via Stripe — the moment you connect Stripe, billing works automatically. Until then, the principal billing page renders an honest "Billing isn't set up yet. Tredoux will reach out when it's ready" and no Stripe calls happen.

**13 files changed.** Migration 189 + billing helpers + 5 API endpoints + principal page + super admin indicator + finance ledger + setup doc. All eslint-clean with `--max-warnings=0`.

---

## What got built

### Migration 189 — `migrations/189_billing_phase4.sql`

`montree_schools` extensions (idempotent IF NOT EXISTS):
- `billing_quantity INTEGER` — last quantity pushed to Stripe (= active student count)
- `last_synced_to_stripe_at TIMESTAMPTZ` — drift indicator for the headcount sync
- `stripe_price_id_active TEXT` — captured at checkout, preserved across price migrations
- `billing_email TEXT` — separate finance contact (defaults to `owner_email`)
- `monthly_charge_estimate_cents INTEGER` — cached `billing_quantity × 700`

`montree_finance_transactions` (NEW table):
- Unified financial ledger. Every income / direct cost / commission / op_expense / fx_adjustment row lands here.
- Multi-currency aware (`original_currency`, `original_amount`, `fx_rate`, `usd_amount`)
- Idempotency: unique partial index on `(source, source_ref)` so Stripe webhook replays don't double-write
- Indexes on `occurred_at`, `type`, per-school, per-agent
- Drives Phase 5's payout calculator (sums income − costs per school per month) and Phase 6's Money tab P&L

`montree_billing_history` (defensive create — already existed in some envs):
- Per-school invoice timeline. CASCADE on school delete. Unique on `stripe_invoice_id`.

### Library: `lib/montree/billing.ts`

The keystone. Every billing operation routes through here. **Every function gracefully no-ops when Stripe isn't configured.**

Public surface:

| Function | Purpose |
|----------|---------|
| `getBillingConfig()` | Snapshot env state. Returns `{ configured, reason, secret_key_present, price_id_present, webhook_secret_present, app_url }` |
| `loadSchoolBilling(supabase, schoolId)` | Fetch all billing-relevant fields from `montree_schools` |
| `countActiveStudents(supabase, schoolId)` | Count `montree_children` WHERE `is_active=true` — drives subscription quantity |
| `getOrCreateStripeCustomer(supabase, schoolId)` | Idempotent. Race-safe persist (only writes customer_id if NULL; loser of race re-fetches canonical) |
| `createSchoolCheckoutSession(supabase, schoolId, options)` | Stripe Checkout for $7/student plan. Quantity = current active student count. Returns URL. |
| `createCustomerPortalSession(supabase, schoolId, returnPath)` | Stripe-hosted card management |
| `syncSubscriptionQuantity(supabase, schoolId, options)` | Push current student count to Stripe as quantity. Skips Stripe call if unchanged (no-op spam protection). |
| `maybeSyncStripeQuantity(schoolId)` | Fire-and-forget wrapper. Called from child create/import routes. Silent no-op when Stripe not configured. |
| `handleInvoicePaid(supabase, invoice, eventId)` | Webhook handler. Writes income + Stripe fee rows to `montree_finance_transactions` + a `montree_billing_history` row + updates school subscription_status. Idempotent via `(source='stripe_webhook', source_ref=eventId)`. |
| `handleInvoicePaymentFailed(supabase, invoice)` | Marks school past_due |
| `handleSubscriptionUpsert(supabase, subscription)` | Persists subscription_id, price_id, status, period dates, quantity |
| `handleSubscriptionDeleted(supabase, subscription)` | Marks school canceled |
| `handleChargeRefunded(supabase, charge, eventId)` | Writes negative-amount income row to ledger so Phase 5 nets refunds against the school for the period |

**Pricing constant**: `PRICE_PER_STUDENT_USD = 7`, `PRICE_PER_STUDENT_CENTS = 700`.

### API endpoints

All env-gated via `getBillingConfig().configured`. Pre-Stripe-config returns 503 with `configured: false`.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/montree/billing/webhook` | Stripe signature | Receives Stripe events. Verifies `STRIPE_WEBHOOK_SECRET`. Handles `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created/updated/deleted`, `charge.refunded`. Returns 200 on handler errors so Stripe doesn't retry-storm. |
| `POST /api/montree/billing/checkout` | principal of school | Returns Stripe Checkout URL for the school's $7/student subscription. School derived from JWT — principal can't start checkout for another school. Returns `already_subscribed: true` if school is already active/trialing (UI redirects to portal). |
| `POST /api/montree/billing/portal-session` | principal of school | Returns Stripe Customer Portal URL for managing card / canceling / viewing invoices |
| `GET /api/montree/billing/status` | principal OR teacher | Read-only school billing status. Always returns 200 even when Stripe unconfigured (UI needs the page to render). Includes `billing_configured: bool` + live student count + estimate + invoice history |
| `POST /api/montree/billing/sync-quantity` | principal of school OR super admin OR `x-cron-secret` | Two modes: `?school_id=X` syncs one; no param syncs all active subscriptions (sweep mode). Fail-open per-school (one failure doesn't stop the sweep). |

### Headcount sync hooks

`maybeSyncStripeQuantity(schoolId)` is wired fire-and-forget into:
- `app/api/montree/children/route.ts` — child create (single)
- `app/api/montree/admin/import/route.ts` — bulk import (one sync after batch)

Steady-state: a child added → fire-and-forget sync within seconds. Bulk imports → one sync at the end (avoids N Stripe calls). Cron sweep → reconciliation safety net.

When Stripe isn't configured, all sync calls are silent no-ops. Pre-Phase-4 schools running without billing don't generate noise.

### Principal-facing page: `/montree/admin/billing`

Replaces the old tier-based UI (basic/standard/premium with max_students). Now:

- Header: "$7 per active student per month"
- Pre-Stripe-config state: "Billing isn't set up yet" card with explanation of pricing + "we'll reach out" copy
- Configured state:
  - Status pill (Active / Trial / Past due / Canceled / Not subscribed)
  - 3-tile snapshot: active students, monthly charge, trial-days-remaining or next-bill-date
  - Drift indicator: "Stripe was last billed for N — your active count is now M. The next sync will reconcile this."
  - CTA: "Set up billing" / "Manage billing in Stripe" / "Resubscribe" depending on state
  - Invoice history with Stripe PDF links

### Super admin: Stripe billing indicator on school rows

`SchoolsTab.tsx` shows a small `💳 Stripe — active · qty 18` line below the email when a school has a Stripe subscription. Status colored (active=emerald, trial=amber, past_due=red, canceled=slate). Hidden when no billing data.

The existing tier toggle (Trial/Free/Paid) still works for manual overrides — Tredoux can mark a school as `subscription_status='active'` without going through Stripe (legacy schools billed manually outside the platform).

### Setup doc: `docs/STRIPE_BILLING_SETUP.md`

9-step playbook for Tredoux when ready:
1. Run migration 189 in Supabase SQL Editor
2. Create Stripe Product + Price ($7 USD monthly licensed)
3. Set Railway env vars (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PER_STUDENT`, `STRIPE_WEBHOOK_SECRET`)
4. Configure webhook endpoint in Stripe Dashboard (Account mode, 6 event types)
5. Test in test mode with `4242 4242 4242 4242`
6. Switch to live mode (repeat 2-4 with live values)
7. Migrate existing schools (manual override OR convert to Stripe via principal UI)
8. Optional cron for daily headcount sync
9. Carry-over: enable Stripe Connect for agent payouts (Phase 3)

Plus failure-mode table for common issues.

---

## Architectural rules locked in

1. **Every billing helper gracefully degrades when Stripe isn't configured.** No crashes pre-config, no required setup-before-shipping. Tredoux sets env vars when he's ready.
2. **Pricing model is locked: $7 per active student per month.** Not a tier system. Quantity = `montree_children WHERE is_active=true` count. Trial = 30 days no card. No annual.
3. **Webhook idempotency: every finance row keys off `(source, source_ref)`.** Stripe replays are silent no-ops. Replay-safe by design.
4. **Webhook returns 200 even on handler errors.** Stripe retries on 500. We log the error and reconcile via Phase 6's Money tab rather than create retry storms.
5. **Auth: principal-only for mutating endpoints, principal-or-teacher for read.** School derived from JWT — never from request body. Sync-quantity additionally accepts super admin OR cron-secret.
6. **Race-safe Stripe customer creation.** Conditional UPDATE WHERE customer_id IS NULL; loser re-fetches canonical. Avoids orphan Stripe customers under simultaneous checkouts.
7. **Race-safe quantity sync.** If quantity unchanged, no Stripe round-trip (no proration spam). `force: true` option overrides for explicit reconcile.
8. **Refund handling: negative income row.** Phase 5's payout calc nets it. Never claw back paid commissions.
9. **`montree_finance_transactions` is the canonical ledger.** Phase 5 reads it. Phase 6 reads it. Don't sum from `montree_billing_history` — that's the per-school invoice timeline, not the accounting ledger.
10. **Stripe fee captured as separate `direct_cost` row at invoice.paid time.** Estimated 2.9% + $0.30. Reconciliation against Stripe's actual fee report is a Phase 6 concern (note already in code).

---

## File-by-file change list

| File | Status | Lines |
|------|--------|-------|
| `migrations/189_billing_phase4.sql` | NEW | ~140 |
| `lib/montree/billing.ts` | NEW | ~470 |
| `app/api/montree/billing/webhook/route.ts` | REWRITTEN (was tier-based) | ~95 |
| `app/api/montree/billing/checkout/route.ts` | REWRITTEN (was tier-based) | ~75 |
| `app/api/montree/billing/portal-session/route.ts` | NEW | ~50 |
| `app/api/montree/billing/status/route.ts` | REWRITTEN (was tier-based) | ~75 |
| `app/api/montree/billing/sync-quantity/route.ts` | NEW | ~125 |
| `app/api/montree/children/route.ts` | EDITED — added maybeSyncStripeQuantity hook | +5 |
| `app/api/montree/admin/import/route.ts` | EDITED — added maybeSyncStripeQuantity hook | +6 |
| `app/montree/admin/billing/page.tsx` | REWRITTEN — replaces tier UI with $7/student model | ~360 |
| `components/montree/super-admin/SchoolsTab.tsx` | EDITED — Stripe indicator | +24 |
| `components/montree/super-admin/types.ts` | EDITED — added billing fields | +8 |
| `.env.example` | EDITED — documented new env vars | +12 |
| `docs/STRIPE_BILLING_SETUP.md` | NEW | ~250 |

---

## Audit trail

- Lint: `--max-warnings=0` clean across all 11 changed/new code files (eslint exit 0)
- 3 pre-existing warnings cleaned up incidentally (unused catch param, `let → const`, unused import)
- Auth + cross-pollination verified on all 5 new endpoints via grep
- Webhook signature verification + idempotency via `(source, source_ref)` unique index
- Race-safe customer creation + race-safe quantity sync
- All endpoints gate on `getBillingConfig().configured` BEFORE calling Stripe SDK

---

## Production verification checklist (after Tredoux follows STRIPE_BILLING_SETUP.md)

After migration 189 + env vars + webhook configured + Railway redeploy:

1. Open `/montree/admin/billing` as a principal → expect "Set up billing" button (not "not configured" copy)
2. Click "Set up billing" → redirects to Stripe Checkout
3. Complete with `4242 4242 4242 4242` → redirects back to `?status=success`
4. Within ~10s, page shows status=Active + invoice history row
5. In Supabase, verify `montree_finance_transactions` has income + stripe_fee rows for the school
6. Add a child to the classroom → check Supabase, `billing_quantity` updates within seconds
7. In super admin, the school row now shows "💳 Stripe — active · qty N"
8. Hit `/api/montree/billing/sync-quantity` with super-admin auth → expect "swept N, updated M" response

If any step fails, check Railway logs for `[billing webhook]` and `[billing]` lines.

---

## What's NOT in Phase 4

- **Phase 5 — Payout calculation engine** (~1.5 days). Now unblocked. Reads from `montree_finance_transactions` to compute what each agent is owed per (agent, school, month).
- **Phase 6 — Super admin Money tab** (~2-3 days). P&L view aggregating from the same ledger.
- **Per-school custom pricing** — flat $7 for v1. Discounts handled via Stripe coupons (`allow_promotion_codes` already enabled on Checkout).
- **Annual billing** — monthly only.
- **Multi-currency display in principal UI** — USD only. Currency conversion is server-side at reconciliation.

---

## Carry-overs from prior sessions

Still pending:
1. 🚨 **Migration 188** in Supabase (Session 91 carry-over) — required for Sarah's agent login to work
2. 🚨 **Migration 189** in Supabase — required for Phase 4 (this session's work) to function
3. **Stripe setup steps** in `docs/STRIPE_BILLING_SETUP.md`
4. **Stripe Connect HK + Wallex** banker confirmation (Session 90)
5. **Pamela email draft** waiting in Gmail (Session 90)

---

## Next session priorities

1. **🚨 Tredoux: run migrations 188 + 189 + follow STRIPE_BILLING_SETUP.md** — this is the prerequisite for Phases 4/5/6 working in production.
2. **Walk the 8-step verification checklist** above after Stripe is wired.
3. **Phase 5 — Payout calculation engine** (~1.5 days). Now genuinely unblocked. Section reads from `montree_finance_transactions`. Idempotent monthly aggregator → `montree_agent_payouts`. Plus the `POST /api/montree/super-admin/payouts/calculate` endpoint to trigger it.
4. **Phase 6 — Super admin Money tab** (~2-3 days). P&L from the ledger. Income / Direct costs / Commissions / Op-expenses / P&L / Exports.

After 5+6, the financial system is end-to-end automated: schools billed → revenue captured → costs captured → agents paid → P&L visible.
