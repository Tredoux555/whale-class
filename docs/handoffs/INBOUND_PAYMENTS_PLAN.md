# Inbound Payments Architecture — Plan & Build Spec

**Status:** Theorize-first. No code yet. This doc is the anchor for the next fresh session — read it cold, execute the build phase-by-phase, audit between phases until clean.

**Companion docs:**
- `docs/handoffs/FINANCIAL_ARCHITECTURE_PLAN.md` — Session 109's OUTBOUND side (paying agents). The architecture in this doc is the symmetric mirror.
- `docs/handoffs/SESSION_109_HANDOFF.md` — manual_wire pattern for agent payouts. This doc applies the same pattern inverted.
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` — accountant one-pager.

---

## Executive summary

We've built the OUT rails (paying agents): Stripe Connect for supported countries + manual_wire for restricted ones. We have ONE rail for IN: Stripe Checkout subscription, credit card only.

**Gap:** Chinese mainland schools (and others without foreign credit cards) cannot pay via Stripe Checkout. The single rail is functionally broken for ~half our addressable market.

**Build:** Add two new inbound rails mirroring the outbound architecture.

| Rail | For | Mechanism | Status |
|------|------|-----------|--------|
| `stripe_subscription` | US/UK/EU/AU/NZ/supported Asia | Auto-renewing Stripe Checkout | ✅ Shipped Phase 4 (Session 93) |
| `alipay_invoice` | Mainland China + HK + Macau + Taiwan | Monthly Stripe invoice with Alipay/WeChat QR | ❌ Build this |
| `manual_invoice` | Russia / Argentina / Iran / wherever | PDF invoice → SWIFT wire → super-admin records | ❌ Build this |

After this build: every school can pay us, regardless of geography. Operational truth (Montree ledger) and statutory truth (Xero, when activated) both stay clean. Symmetric to agent payouts.

---

## Current state (what already works)

**Phase 4 — Stripe school subscription billing** (Session 93, commit `f7560471`):
- `montree_schools` carries: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id_active`, `billing_quantity`, `monthly_charge_estimate_cents`, `subscription_status`, `current_period_end`, `last_synced_to_stripe_at`, `billing_email`
- `montree_billing_history` — per-invoice timeline
- `montree_finance_transactions` — canonical multi-currency ledger (rule #65 from Session 109)
- `lib/montree/billing.ts` — `getBillingConfig()`, `getOrCreateStripeCustomer()`, `createSchoolCheckoutSession()`, `createCustomerPortalSession()`, `syncSubscriptionQuantity()`, webhook handlers for `invoice.paid` / `invoice.payment_failed` / `customer.subscription.updated` / `customer.subscription.deleted` / `charge.refunded`
- Tier auto-flip on Stripe events (Session 98 rule #9): Stripe webhook is canonical source of truth for AI tier in production
- Customer Portal active
- Trial→active and active→canceled transitions trigger AI tier flips
- 5 API endpoints live: `/api/montree/billing/webhook`, `/checkout`, `/portal-session`, `/status`, `/sync-quantity`
- Principal-facing billing page at `/montree/admin/billing` — renders trial / active / past_due / canceled states with appropriate CTAs
- Super-admin SchoolsTab shows `💳 Stripe — active · qty 18` indicator per school

**What it doesn't handle:** any school in a country where Stripe Checkout's card-only flow doesn't work for the school's available payment instruments.

---

## The three-rail architecture

Same shape as `montree_teachers.payout_method` from Session 109, applied inversely to `montree_schools`.

### Rail 1 — `stripe_subscription` (existing, no change)

Western credit card, auto-renewing, dunning, Customer Portal. Already shipped.

Countries: US, CA, MX, GB, IE, FR, DE, ES, IT, NL, BE, AT, PT, SE, NO, DK, FI, CH, LU, PL, CZ, GR, HU, RO, BG, HR, EE, LV, LT, SK, SI, CY, MT, AU, NZ, JP, SG, HK (when card-paying), TH, MY, IN, KR, AE, BH, BR.

Roughly the same list as `STRIPE_CONNECT_SUPPORTED_COUNTRIES` (HK schools can choose either rail — many HK schools prefer Alipay/WeChat anyway).

### Rail 2 — `alipay_invoice` (NEW)

Stripe supports Alipay and WeChat Pay as payment methods for international merchants receiving from Chinese customers. We don't need a separate Chinese merchant account.

**The mechanism:**
1. Daily/weekly cron generates a Stripe Invoice in `mode: 'payment'` (one-time, NOT subscription — Alipay/WeChat don't support recurring on Stripe).
2. Invoice configured with `payment_method_types: ['alipay', 'wechat_pay']`.
3. Hosted invoice URL emailed to school. School opens in WeChat or Alipay → scans QR → pays in CNY → Stripe receives in USD.
4. Webhook fires (`invoice.payment_succeeded`) → write finance_tx income row → bump subscription_status='active' → bump current_period_end forward 30 days.
5. Cron generates the next invoice 7 days before current_period_end. If unpaid after current_period_end, status flips to `past_due`; if unpaid after `past_due + 14 days`, status flips to `canceled` (or our chosen grace period).

**Why no subscription mode:** Stripe's Alipay subscription support requires the customer to save a SEPA mandate or card on file, which defeats the purpose. The cleanest path is repeating invoices treated by the cron as "soft subscription."

**What schools see:** monthly email "Your Montree invoice for May 2026 — RMB 1,400 (~USD 196). Tap to pay." Treasurer scans, done. Matches normal Chinese B2B billing cadence.

### Rail 3 — `manual_invoice` (NEW)

Mirror of `manual_wire` from Session 109 but reversed. For schools in countries where neither Stripe Checkout nor Alipay/WeChat applies.

**The mechanism:**
1. Super-admin generates monthly PDF invoice from `/montree/super-admin/schools/[id]` → "Issue invoice" button.
2. Invoice includes Montree Limited HK bank details (Wallex account) + SWIFT code + invoice reference number.
3. School wires via SWIFT or domestic-to-international transfer to Wallex.
4. Super-admin clicks ⚡ Record incoming wire on the school's row in Money tab → captures wire ref, paid_at, currency received, FX rate, amount in USD.
5. Writes finance_tx with `type='income', source='manual_entry', source_ref='inbound_wire:<ref>'` for idempotency (rule #67 mirror).
6. Bumps school `subscription_status='active'` + `current_period_end` forward.
7. Period locking (rule #62) prevents back-editing once books are closed.

**Countries:** Russia, Argentina, Iran, Syria, Iraq, Egypt (limited), Lebanon, Palestine, mainland Ukraine schools with sanctions exposure, plus any niche/edge case.

---

## Schema changes — Migration 209

```sql
-- migrations/209_school_payment_method.sql
--
-- Phase A of INBOUND_PAYMENTS_PLAN.md — three-rail school billing.
-- Mirrors migration 205 from Session 109 but for the inbound side.
--
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'stripe_subscription',
  ADD COLUMN IF NOT EXISTS manual_invoice_details JSONB,
  ADD COLUMN IF NOT EXISTS manual_invoice_details_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cadence TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE montree_schools
  DROP CONSTRAINT IF EXISTS montree_schools_payment_method_check;
ALTER TABLE montree_schools
  ADD CONSTRAINT montree_schools_payment_method_check
  CHECK (payment_method IN ('stripe_subscription', 'alipay_invoice', 'manual_invoice'));

ALTER TABLE montree_schools
  DROP CONSTRAINT IF EXISTS montree_schools_billing_cadence_check;
ALTER TABLE montree_schools
  ADD CONSTRAINT montree_schools_billing_cadence_check
  CHECK (billing_cadence IN ('monthly', 'annual'));

-- Partial index for cron picking up alipay_invoice schools needing fresh invoices.
CREATE INDEX IF NOT EXISTS idx_schools_alipay_active
  ON montree_schools(id, current_period_end)
  WHERE payment_method = 'alipay_invoice'
    AND subscription_status IN ('active', 'past_due');

-- Partial index for super-admin's "manual invoice schools" filter.
CREATE INDEX IF NOT EXISTS idx_schools_manual_invoice_active
  ON montree_schools(id)
  WHERE payment_method = 'manual_invoice'
    AND subscription_status IN ('active', 'past_due', 'trialing');

COMMENT ON COLUMN montree_schools.payment_method IS
  'Which rail bills this school. stripe_subscription = automated Stripe Checkout + Customer Portal. alipay_invoice = monthly Stripe invoice with Alipay/WeChat QR. manual_invoice = super-admin issues PDF invoice, school SWIFT wires, super-admin records receipt.';

COMMENT ON COLUMN montree_schools.manual_invoice_details IS
  'JSONB with school billing contact + invoice preferences for manual_invoice rail. NULL for stripe_subscription / alipay_invoice schools. Shape: { billing_contact_name, billing_email_override, currency_preference, payment_terms_days, invoice_notes }.';

COMMENT ON COLUMN montree_schools.billing_cadence IS
  'monthly (default) or annual. Annual = one upfront prepayment per year. Common for Chinese schools whose treasurer prefers single transaction per year.';

COMMIT;
```

### Optional Migration 210 — inbound wire records (defer if simpler ledger row suffices)

If we want a dedicated table for inbound wires (instead of just finance_tx rows), mirror `montree_period_locks` style. But the current plan uses finance_transactions exclusively — `source='manual_entry', source_ref='inbound_wire:<ref>'`. No second table needed. Keep this section as a "if we need it later" note.

---

## Architectural rules to lock in (cumulative — #80 onwards)

These mirror Session 109's rules #62-79 for the outbound side.

**80. Every school pays via exactly ONE payment_method** at a time. Flipping requires explicit super-admin action with audit. Schools cannot self-flip (unlike agents) — too easy to game by switching mid-month to avoid charges.

**81. `payment_method='stripe_subscription'` is the canonical default.** New schools default here unless super-admin (or signup flow with locale-based hint) sets otherwise at creation.

**82. Alipay/WeChat invoices are NOT subscriptions** — they're recurring one-time invoices generated by cron. Stripe's recurring rails require card or SEPA; Alipay/WeChat are payment_method=alipay/wechat_pay in `mode: 'payment'`.

**83. Every paid invoice writes ONE finance_tx income row** regardless of rail. Stripe webhook: `source='stripe_webhook', source_ref='invoice:<id>'`. Manual wire: `source='manual_entry', source_ref='inbound_wire:<ref>'`. Both idempotent (rule #67 mirror).

**84. Period locking applies symmetrically.** `assertPeriodOpen()` guards manual wire receipt-recording, the same as it guards outbound wire payment-recording. Closed periods refuse 409.

**85. AI tier auto-flip works identically across all three rails.** `handleSubscriptionUpsert()` / its alipay_invoice equivalent / manual receipt recording all call `setSchoolAiTier()` on success. Stripe-canonical-truth rule #9 from Session 98 generalizes: "any rail's payment success is canonical source of truth for AI tier."

**86. Annual prepayment writes 12 monthly periods at once.** Single $1,260 annual transaction (20 students × $7 × 12 × 0.9 discount) generates 12 monthly finance_tx rows with `period_month` set to each month being paid for. Recognises revenue ratably even though cash came in once. The school's `current_period_end` advances 12 months.

**87. `manual_invoice_details` is optional.** Even manual_invoice schools can fall back to using `billing_email` for invoice delivery. Details JSONB only stores deviations from default (e.g. specific billing contact different from school owner, preferred currency, longer payment terms).

**88. Stripe Alipay/WeChat invoice payment IS Stripe.** All Stripe-side architectural rules apply: idempotency on event_id, 200-on-error to prevent retry storms, customer ID match before action.

**89. Cross-pollination contract:** every billing-mutating endpoint operates only on the school_id derived from the authenticated principal's JWT (or from super-admin with explicit school_id param). Never trust school_id from a webhook body without verifying it matches a known Stripe customer.

---

## Build phases

Each phase ships independently, audits between rounds until clean, then proceeds.

### Phase A — Schema + super-admin payment-method flip UI (~1 hour)

**Goal:** Lay foundation. Super-admin can flip any school to any rail.

Files:
- NEW `migrations/209_school_payment_method.sql` — run in Supabase SQL Editor
- NEW `app/api/montree/super-admin/schools/[id]/payment-config/route.ts` — GET + PATCH (mirror super-admin agents/[id]/payout-config from Session 109). Validates ALLOWED_METHODS, 4KB JSONB cap. Audit logs.
- MODIFIED `components/montree/super-admin/SchoolsTab.tsx` — 💳 button per row opens modal. Shows current rail. Radio (stripe_subscription / alipay_invoice / manual_invoice). When manual_invoice selected: JSON textarea for billing details (optional).
- MODIFIED `app/api/montree/super-admin/schools/route.ts` — GET returns `payment_method` + `billing_cadence` on each row. PATCH supports updating these.
- Architectural rule #70 mirror: refuses to silently flip away from stripe_subscription if school has an ACTIVE Stripe subscription (status='active' AND stripe_subscription_id IS NOT NULL). Super-admin must cancel Stripe first (or use a force=true override flag with audit log capture).

**Smoke test after Phase A:** flip Whale Class to alipay_invoice via super-admin → verify the row's pill in SchoolsTab updates → flip back to stripe_subscription. No real money flows yet.

### Phase B — Alipay/WeChat invoice generation cron + payment flow (~half-day)

**Goal:** Chinese schools can receive monthly invoices and pay.

Files:
- NEW `app/api/montree/cron/generate-alipay-invoices/route.ts` — daily cron. Auth via `x-cron-secret`. Reads `montree_schools` WHERE payment_method='alipay_invoice' AND subscription_status IN ('active','past_due','trialing') AND (next_invoice_due_at IS NULL OR next_invoice_due_at <= NOW() + INTERVAL '7 days'). For each: calls `createAlipayInvoice(supabase, schoolId)`.
- NEW exported function `createAlipayInvoice()` in `lib/montree/billing.ts`:
  - Computes line items: 1 line × `billing_quantity` students × $7 = `monthly_charge_estimate_cents`
  - Annual cadence: 12 × line items × 0.9 discount factor
  - Creates Stripe Invoice with `customer: stripe_customer_id`, `payment_method_types: ['alipay', 'wechat_pay']`, `collection_method: 'send_invoice'`, `days_until_due: 14` (or per `manual_invoice_details.payment_terms_days`)
  - Finalizes immediately → `hosted_invoice_url` is the QR-bearing URL
  - Sends via Resend to school's `billing_email` with bilingual EN+ZH subject line + body
  - Updates `montree_schools.next_invoice_due_at = (invoice.due_date)`
- MODIFIED `app/api/montree/billing/webhook/route.ts` — extend the existing `invoice.payment_succeeded` handler:
  - When invoice was Alipay/WeChat-paid, the existing tier-flip + finance_tx write paths already work (it's all "an invoice was paid")
  - Bump `current_period_end` forward 30 days for monthly cadence, 365 for annual
  - Write finance_tx with `source='stripe_webhook', source_ref='invoice:<id>'` — already idempotent
- MODIFIED `app/montree/admin/billing/page.tsx` — render alipay_invoice variant: shows pending invoice URL with "Open invoice" CTA, payment history with Alipay icons next to paid invoices
- NEW i18n strings — both EN and ZH (urgent for Chinese schools): subject lines, body copy, button labels

**Smoke test after Phase B:**
1. Set Whale Class to alipay_invoice + billing_cadence=monthly + billing_quantity=20
2. Manually trigger cron via Health tab → "Run generate-alipay-invoices now" → expect invoice generated, email to `billing_email`
3. Open invoice URL in browser → expect Alipay + WeChat Pay QR options visible
4. Use Stripe test Alipay/WeChat in test mode → pay → webhook fires → status → `active`, current_period_end advances 30d, finance_tx row written, AI tier flips Pro
5. Re-trigger cron → expect NO new invoice (next_invoice_due_at is 30d out)

### Phase C — Manual invoice + ⚡ Record incoming wire UI (~half-day)

**Goal:** Schools in restricted countries can be billed.

Files:
- NEW `app/api/montree/super-admin/schools/[id]/issue-manual-invoice/route.ts` — POST. Generates PDF invoice with Montree HK bank details + reference number. Stores PDF in Supabase Storage bucket `inbound-invoices`. Returns signed URL. Optionally emails to school's billing_email.
- NEW `app/api/montree/super-admin/schools/[id]/record-incoming-wire/route.ts` — POST. Captures wire_ref, paid_at, currency_received, fx_rate_used, usd_amount_received, notes. Idempotent on (wire_ref). Writes finance_tx row. Bumps subscription_status + current_period_end. Calls `assertPeriodOpen()` guard. Fires AI tier auto-flip via `setSchoolAiTier('premium')` if school was free/canceled. Audit log entry.
- NEW MoneyTab integration — for schools where `payment_method='manual_invoice'`, the Money tab Schools row shows ⚡ Record incoming wire button. Click → inline form (wire_ref, paid_at, currency, FX rate, USD amount, notes). Submit → status flips, ledger row writes, AI tier flips.
- NEW Supabase Storage bucket `inbound-invoices` — super-admin-only access. Bucket policy: `INSERT/SELECT only for service_role`.
- MODIFIED `app/montree/admin/billing/page.tsx` — render manual_invoice variant: shows latest invoice with "Download PDF" button, payment history with wire references, "Bank details for your treasurer" info card with Wallex HK details + SWIFT.

**Smoke test after Phase C:**
1. Set a test school to manual_invoice
2. Super-admin → school detail → "Issue invoice" → expect PDF generated, downloadable, includes correct bank details + reference number
3. Money tab → find school's row → ⚡ Record incoming wire → fill wire_ref=TEST123, paid_at=today, USD amount = expected charge → Submit
4. Expect: status → active, current_period_end → +30d, finance_tx row written (verify in Supabase), AI tier flips Pro
5. Re-submit same wire_ref → expect idempotent no-op (existing row found, returns success)
6. Period-lock previous month → try recording a wire dated last month → expect 409

### Phase D — Annual cadence support (~1 hour)

**Goal:** Schools can pay annually upfront with discount.

Files:
- MODIFIED `lib/montree/billing.ts`:
  - `createAlipayInvoice()` checks `billing_cadence` — if annual, line items multiply × 12 × 0.9 discount factor
  - Webhook handler bumps `current_period_end` forward 365 days for annual
  - finance_tx generation: writes 12 income rows for monthly recognition OR writes 1 row with `recognised_period_start` + `recognised_period_end` spanning the year (TBD — depends on accountant input)
- MODIFIED `record-incoming-wire/route.ts` — same logic for annual: 12 × monthly OR single annual row
- MODIFIED `app/montree/admin/billing/page.tsx` — show "Annual prepayment — saved $X with 10% discount" pill on active annual schools
- MODIFIED super-admin payment-config modal — radio for monthly/annual

**Smoke test after Phase D:**
1. Flip Whale Class to annual + alipay_invoice
2. Trigger cron → expect invoice for ~$1,260 (20 students × $7 × 12 × 0.9)
3. Pay in test mode → expect current_period_end advances 365 days, 12 monthly finance_tx rows written

### Phase E — i18n batch + acceptance walkthrough (~1 hour)

**Goal:** All new strings live in 12 locales. End-to-end smoke test.

- New i18n keys (~50): billing.alipayInstructions, billing.scanToPay, billing.wireDetailsLabel, billing.annualSavings, billing.invoicePending, billing.paymentReceived, etc.
- All translated via Haiku batch (~$0.50)
- Pre-commit i18n parity check passes
- Walk acceptance checklist end-to-end across all three rails

**Acceptance walkthrough (15 steps):**
1. Western school via Stripe Checkout → trial → active → past_due (force) → reactivate → canceled — all already work, regression test
2. Chinese school via Alipay invoice → first invoice → paid via WeChat → status flips → tier flips
3. Chinese school via WeChat Pay specifically (not Alipay) → same result
4. Chinese school annual cadence → first invoice → $1,260 paid → 12 monthly rows in ledger
5. Russian school via manual_invoice → super-admin issues PDF → records incoming SWIFT wire → status flips
6. Manual_invoice school period-lock test → try recording wire in closed month → 409
7. Stripe subscription cancel → tier flips to free → re-subscribe → tier flips to premium
8. Alipay invoice payment_failed → status moves to past_due → 14 days grace → canceled
9. Manual invoice never-paid → super-admin manually marks unpaid → status flips
10. Refund test for each rail — refunded amount = negative finance_tx row, tier preserved per existing rules
11. Reconciliation report for the period — expect zero discrepancy across all rails
12. Annual statement for a manual_invoice school — generates correctly (rule #64 mirror — paid rows only)
13. Mira → "How is my billing?" → Mira reads payment_method + current_period_end + last invoice → returns correct status
14. Tracy (principal-side) → "When's our next bill?" → returns rail-aware answer
15. Health tab — webhook delivery card, Stripe usage card, AI cost card — all still healthy

---

## Strategic decisions Tredoux needs to make BEFORE Phase B

These are the inputs to the build. Some have defaults but worth thinking through.

### 1. Annual vs monthly — offer both? Default which?

Default recommendation: offer both, monthly is default. Annual is opt-in with 10% discount. The discount is small enough that we don't lose much margin but big enough to be a real conversation point ("save 10% on annual").

Whale Class's own answer: probably annual (you self-fund anyway — annual reduces invoice admin to 1/year).

**Decision needed:** What discount %? 10%? 15%? Stripe doesn't care, Wallex doesn't care, accountant doesn't care. It's a pure marketing lever.

### 2. Contracting entity — Montree Limited HK invoicing into China — is the FX paperwork tolerable?

When Montree Limited (HK) bills a mainland Chinese school in USD, the school's accountant needs to log a 跨境付款 (cross-border payment) which triggers their FX administrative process. For private kindergartens this is usually fine — they have small FX quotas they can spend without heavy paperwork. For public institutions or larger schools it can be friction.

**Decision needed:** Do we accept that some mainland schools will balk at the FX paperwork? Or do we eventually need a Mainland-China-billing entity (Montree 教育 WFOE / Montree Pte Mainland Branch / partner with a Chinese reseller)? Probably "accept friction for now, revisit at 50+ Chinese schools."

### 3. Trial behavior for non-Stripe rails

Currently: new schools get a 30-day free trial via `subscription_status='trialing'` set at signup (no Stripe involved). Then on day 30, billing kicks in.

For alipay_invoice: the cron should NOT generate an invoice during trial. Generate first invoice on day 30 (or 23 if 7-day-ahead window).

For manual_invoice: super-admin issues first invoice manually when ready.

**Decision needed:** Confirm 30-day trial applies to all three rails uniformly? Or shorter for non-Stripe (since manual chase is involved)?

### 4. WeChat Pay vs Alipay — both? Just one?

Stripe lets us enable both as payment methods on the same invoice. The school picks at the QR. **Recommendation:** enable both. Cost is the same, optionality is real value to school treasurers.

**Decision needed:** Confirm both enabled? Any tier-1 Chinese cities lean one way or the other in your experience?

### 5. What does Whale Class do? When do you flip it from "self-funded" to "real customer"?

Whale Class is currently subscription_status='trialing' indefinitely (or some manual state). When you flip it to a real paying customer, what rail?

Recommendation: **alipay_invoice + annual cadence**. You're a Beijing customer, treasurer-of-one (yourself), annual prepayment is simplest. The flip is symbolic — you start paying yourself for using your own product, which provides accounting cleanliness (Montree Limited HK bills Whale Class entity in Beijing).

If Whale Class isn't a separate entity from Montree Limited, this might be moot. Worth discussing with accountant first (it's the kind of thing they'll have an opinion on).

### 6. Grace period for past_due → canceled

Current Phase 4 flow for Stripe subscriptions: Stripe handles dunning automatically (retries the card over several days, then cancels per the Stripe Dashboard config).

For alipay_invoice: we control this. **Recommendation:** 14 days past_due → canceled. Email reminders at day 1 / day 7 / day 13.

For manual_invoice: no automated dunning — super-admin tracks manually. Schools' treasurers operate on longer cycles, urgency is via Tredoux's direct relationship.

**Decision needed:** 14 days reasonable? Different per rail?

### 7. Resend domain verification — STILL pending

Carry-over from Session 83 and earlier. Without verified `montree.xyz` in Resend, alipay_invoice emails will only deliver to the Resend account owner (not real schools). **Hard blocker for Phase B.**

Action: verify `montree.xyz` in Resend → add DNS records → update `RESEND_FROM_EMAIL` in Railway env vars.

---

## Operational setup (Tredoux user-actions before Phase B build)

In order:

1. **Enable Alipay + WeChat Pay payment methods on Stripe Account.** Stripe Dashboard → Settings → Payment methods → enable both. Fill in business info if prompted. Approval usually instant; can take a few business days for some.
2. **Verify `montree.xyz` in Resend** (carry-over from Session 83). Required for invoice email delivery.
3. **Confirm with HK banker (Wallex)** that the existing HKD account can receive Alipay/WeChat Pay payouts from Stripe. Should be — Stripe pays in USD which converts to HKD on the way in. One email confirmation.
4. **Create Supabase Storage bucket `inbound-invoices`** (Phase C precondition). Storage → New bucket → Private → super-admin / service-role only.
5. **Decide on the strategic questions above** (#1-6). Document choices in the migration file or this plan.

---

## Open questions (resolve during build)

1. Do we generate the manual_invoice PDF in-app or use a third-party (Invoice Ninja, Wave, etc.)? **Recommendation:** in-app using existing PDF gen pattern (we already generate annual agent statements as printable HTML — `app/api/montree/super-admin/agents/[id]/annual-statement/route.ts`). Saves another vendor dependency.
2. How does the accountant want annual prepayments recognized — single $1,260 income row recognized at receipt OR 12 monthly rows recognized over the year? **Defer until HK accountant is engaged.** Phase D builds the toggle and we pick when answer arrives.
3. Should `alipay_invoice` schools also be able to upgrade to `stripe_subscription` later (e.g. school opens a card in their name)? Yes — payment_method is mutable via super-admin. The flip cleans up the old rail's state (close any pending alipay invoice, void it in Stripe) before activating Stripe subscription.
4. Refund handling on alipay_invoice — Stripe supports Alipay/WeChat refunds back to the source. Webhook handler already covers `charge.refunded` for the general case; verify it works for alipay/wechat_pay specifically during smoke test.
5. **Mainland-billed-via-Stripe + cross-border tax reporting.** Stripe issues 1099-K equivalents in some jurisdictions. China doesn't apply directly, but Montree Limited HK files HK taxes regardless. Accountant problem, not engineering.
6. **WeChat Pay for businesses (公账) vs personal (个账).** Some schools' treasurers pay corporate bills via personal WeChat Pay. Both work with Stripe's WeChat Pay support. Just a UX note.

---

## Deferred items (not in this build, future enhancements)

- **Subscription pause** — temporary hold without canceling. Useful for summer breaks at some schools. Build later if requested.
- **Pro-rated mid-month upgrades** — adding 5 students mid-month → pro-rate the next invoice. Stripe handles this automatically for `stripe_subscription`; alipay_invoice + manual_invoice would need custom logic. Defer until real customer asks.
- **Multi-classroom-level billing** — currently school-level. A school with both a Pro classroom and a Free classroom would be one decision. Multi-tier per-school is a much bigger build, probably never needed.
- **Coupon/discount codes** — Stripe supports them natively for stripe_subscription (`allow_promotion_codes`). For alipay_invoice we'd build a discount field on the invoice line items. Defer until marketing needs it.
- **Tax invoicing** — some Chinese schools need 发票 (fapiao) for tax purposes. Beyond Montree Limited HK's scope unless we open a Mainland entity. For now, the Stripe receipt + bank statement is the school's documentation.

---

## Files to create / modify (build summary)

| Path | Status | Phase |
|------|--------|-------|
| `migrations/209_school_payment_method.sql` | NEW | A |
| `app/api/montree/super-admin/schools/[id]/payment-config/route.ts` | NEW | A |
| `app/api/montree/super-admin/schools/[id]/issue-manual-invoice/route.ts` | NEW | C |
| `app/api/montree/super-admin/schools/[id]/record-incoming-wire/route.ts` | NEW | C |
| `app/api/montree/cron/generate-alipay-invoices/route.ts` | NEW | B |
| `lib/montree/billing.ts` | EXTEND with `createAlipayInvoice()`, annual logic | B, D |
| `lib/montree/billing/manual-invoice.ts` | NEW — PDF generation + email helper | C |
| `app/api/montree/billing/webhook/route.ts` | EXTEND for alipay/wechat invoice paths | B |
| `app/api/montree/super-admin/schools/route.ts` | EXTEND GET + PATCH for new columns | A |
| `app/montree/admin/billing/page.tsx` | EXTEND rail-aware UI | B, C |
| `components/montree/super-admin/SchoolsTab.tsx` | EXTEND 💳 button → payment-config modal | A |
| `components/montree/super-admin/MoneyTab.tsx` | EXTEND ⚡ Record incoming wire for manual_invoice schools | C |
| `lib/montree/i18n/{en,zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` | EXTEND ~50 new keys | E |
| `docs/STRIPE_BILLING_SETUP.md` | EXTEND with Alipay/WeChat enablement steps | A |

Approximate total: **~1 day of focused build work** + the operational setup.

---

## Architectural rule numbering — locked

Rules #80-89 from this plan are reserved for the inbound payments build. Cumulative architectural rules log lives in `CLAUDE.md` under each session entry. When this build ships, add the rules to the next session's CLAUDE.md entry.

---

## Acceptance criteria (the "done" definition)

Phase A: super-admin can flip any school to any rail, audit log captures it, UI shows rail.
Phase B: Whale Class (test-flipped to alipay_invoice) receives a real Stripe-test-mode invoice, paid via Stripe's test Alipay flow, status flips active, tier flips Pro, finance_tx row written.
Phase C: A second test school (flipped to manual_invoice) gets a PDF invoice with correct bank details, super-admin records a fake wire receipt, status + tier + ledger row all update correctly. Period-lock test passes.
Phase D: Whale Class flipped to annual + alipay_invoice generates an invoice for $1,260 (or whatever 20 × $7 × 12 × 0.9 evaluates to), payment recognized as 12 monthly periods OR 1 annual row per accountant decision.
Phase E: i18n parity check passes, 15-step acceptance walkthrough completes clean across all rails.

**Build is done when:** any school in any country can pay Montree, regardless of available payment instruments. Symmetric to: any agent in any country can be paid by Montree.

---

## Smoke test cheat sheet (memorize before next session)

After the full build is shipped:

```
Test 1 — Western Stripe subscription end-to-end (regression).
Test 2 — Chinese school monthly alipay_invoice → Alipay QR pay.
Test 3 — Chinese school monthly alipay_invoice → WeChat Pay QR pay.
Test 4 — Chinese school annual alipay_invoice → single payment, 12 ledger rows.
Test 5 — Russian school manual_invoice → PDF issued → wire recorded.
Test 6 — Manual invoice + period lock → 409 on wire in closed month.
Test 7 — Refund test on each rail.
Test 8 — Tier auto-flip on each rail.
Test 9 — Reconciliation report — zero discrepancy.
Test 10 — Mira / Tracy billing-question answers.
```

---

## Next session opening instructions

When you start the fresh session, the first message should be:

> "Continue with the inbound payments build per `docs/handoffs/INBOUND_PAYMENTS_PLAN.md`. Run Phase A first, audit, then B, C, D, E sequentially. Don't stop — build, audit, build, audit until done. Migrations to run in Supabase: 209 only (after Phase A). I've made the strategic decisions on annual=10% / both Alipay+WeChat enabled / 14-day grace / 30-day trial uniform / whale-class flips to annual alipay_invoice when ready / Resend domain verification done."

Anything you haven't decided yet from the strategic questions section, decide before that session starts. The plan above assumes the recommended defaults; deviating mid-build is more friction than upfront alignment.

Good night.
