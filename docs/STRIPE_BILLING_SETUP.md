# Stripe Billing Setup — Phase 4 Activation Checklist

**Status when this doc was written:** Phase 4 code is shipped to production. All
endpoints, webhook handler, principal billing page, super admin indicator, and
finance ledger are LIVE — but they're env-gated. Until the steps below are
complete, schools see "Billing isn't set up yet" and no money moves.

The system is designed so you can ship Stripe whenever you're ready, without
touching code. Run through these steps in order.

---

## Pricing model (locked)

- **$7 per active student per month** — flat rate, no tiers, no annual
- Billed monthly, recurring
- 30-day free trial — no card upfront
- Subscription quantity = active children count, synced automatically

---

## Step 1 — Run migration 189 in Supabase SQL Editor

```sql
-- Open Supabase SQL Editor, paste, run.
\i migrations/189_billing_phase4.sql
```

Or copy-paste the contents of `migrations/189_billing_phase4.sql`. It's
idempotent, so re-running is safe.

**Verify by running:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'montree_schools'
  AND column_name IN ('billing_quantity', 'last_synced_to_stripe_at', 'stripe_price_id_active', 'billing_email', 'monthly_charge_estimate_cents');
-- Expect 5 rows.

SELECT count(*) FROM information_schema.tables
WHERE table_name = 'montree_finance_transactions';
-- Expect 1.
```

---

## Step 2 — Create the Stripe Product + Price

In Stripe Dashboard (live mode when ready, test mode first to verify):

1. **Products → Add product**
   - Name: `Montree subscription`
   - Description: `Per-student monthly subscription for Montessori classroom management`

2. **Add price** (under the product):
   - Pricing model: **Standard pricing**
   - Price: **$7.00 USD**
   - Billing period: **Monthly**
   - Usage type: **Licensed** (Stripe lingo for fixed quantity per period — what we want)
   - Click **Save**

3. **Copy the Price ID** — it looks like `price_1Q...`. You need this for Step 3.

⚠ **Don't pick "Per unit metered"** — that bills based on usage events, which
is more complex than we need. Licensed = "quantity × price" each month, exactly
what our headcount sync produces.

---

## Step 3 — Set Railway environment variables

In Railway → Variables for the production service:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` from Stripe Dashboard → Developers → API keys |
| `STRIPE_PRICE_PER_STUDENT` | The Price ID from Step 2 (e.g. `price_1Q...`) |
| `STRIPE_WEBHOOK_SECRET` | _Set in Step 4_ |
| `NEXT_PUBLIC_APP_URL` | `https://montree.xyz` (probably already set) |

After saving, Railway redeploys. The billing endpoints flip from 503 to
functional.

⚠ The `STRIPE_SECRET_KEY` may already be present — Phase 3 (agent Stripe
Connect) needs the same key. Confirm you're using a **secret key**, not a
publishable key. Secret keys start with `sk_`. Phase 4 doesn't need a separate
key.

---

## Step 4 — Configure the webhook endpoint

In Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

- **Endpoint URL**: `https://montree.xyz/api/montree/billing/webhook`
- **Mode**: **Account** (NOT "Connect" — Connect is the agent payout
  webhook from Phase 3, configured separately at
  `/api/stripe/connect-webhook`).
- **Listen to events**:
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `charge.refunded`

Click **Add endpoint**, then on the webhook detail page click **Reveal
signing secret**. Copy that value (`whsec_...`) and set it as
`STRIPE_WEBHOOK_SECRET` in Railway. Wait for Railway to redeploy.

---

## Step 5 — Test in test mode first

Switch Stripe Dashboard to **Test mode** before going live. Repeat Steps 2-4
with test-mode values:

- `STRIPE_SECRET_KEY` = test key (starts `sk_test_...`)
- `STRIPE_PRICE_PER_STUDENT` = test-mode Price ID
- `STRIPE_WEBHOOK_SECRET` = test-mode webhook signing secret

Test flow:

1. Log into a test school as principal
2. Open `/montree/admin/billing` — should show "Active students: N · Monthly
   charge: $X" with a green "Set up billing" button
3. Click "Set up billing" — redirects to Stripe Checkout
4. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC
5. Complete checkout — Stripe redirects back to `/montree/admin/billing?status=success`
6. Within a few seconds, the page shows status pill = **Active** and a row in
   "Invoice history" for the first month
7. In Supabase, verify:
   ```sql
   SELECT id, name, subscription_status, stripe_customer_id, stripe_subscription_id, billing_quantity FROM montree_schools WHERE id = '<test_school_id>';
   -- subscription_status should be 'active' (or 'trialing' if you set up a trial)
   -- stripe_customer_id and stripe_subscription_id should both be populated

   SELECT type, category, usd_amount, occurred_at FROM montree_finance_transactions WHERE school_id = '<test_school_id>' ORDER BY occurred_at DESC LIMIT 5;
   -- Expect: an 'income' / 'subscription_revenue' row + a 'direct_cost' / 'stripe_fee' row
   ```

8. Add or remove a child in the test classroom — within seconds the
   `billing_quantity` on `montree_schools` should update (verify in Supabase
   or by reloading the billing page).

If anything looks wrong, check Railway logs for `[billing webhook]` and
`[billing]` lines — every step is logged.

---

## Step 6 — Switch to live mode

Once test mode works end-to-end:

1. In Stripe Dashboard, switch to **Live mode**
2. Repeat Step 2 (create Product + Price in live mode)
3. Repeat Step 4 (create webhook in live mode, copy new signing secret)
4. Update Railway env vars with live values:
   - `STRIPE_SECRET_KEY` → live `sk_live_...`
   - `STRIPE_PRICE_PER_STUDENT` → live Price ID
   - `STRIPE_WEBHOOK_SECRET` → live webhook signing secret
5. Wait for Railway redeploy
6. Verify with a real principal account if possible (you can refund
   immediately in Stripe Dashboard if it's just a smoke test)

---

## Step 7 — Migrate existing schools

Schools that signed up before Phase 4 don't have Stripe customer/subscription
records. Two options:

### Option A: Manual override (legacy schools you bill outside Stripe)

Use super admin → Schools → click the tier pill → set `subscription_status`
to `active`. The school never goes through Stripe but is marked as "paying" —
you invoice them manually outside the platform.

### Option B: Convert them to Stripe (recommended for new pilots)

Email the principal: "Set up billing in your Montree admin to keep the school
running past your trial." They click **Set up billing** in `/montree/admin/billing`,
go through Stripe Checkout, and from then on the system handles them
automatically.

For agent-referred schools, the agent's revenue share starts accruing as
soon as Stripe receives the first paid invoice — Phase 5's payout calc reads
from `montree_finance_transactions`.

---

## Step 8 — Optional: schedule the headcount sync sweep

Steady-state, the per-child fire-and-forget sync (`maybeSyncStripeQuantity`)
keeps Stripe in sync. If you want belt-and-braces reconciliation, schedule
a daily sweep:

In Railway → Cron jobs (or external cron service):

```
# Daily at 03:00 UTC, sync every active subscription's quantity
curl -X POST 'https://montree.xyz/api/montree/billing/sync-quantity' \
  -H "x-cron-secret: $CRON_SECRET"
```

Set `CRON_SECRET` env var in Railway to a random 32-char string. The sweep
endpoint accepts either super admin auth OR the cron secret.

---

## Step 9 — Carry-over: enable Stripe Connect for agent payouts

This is Phase 3 / Session 90 — separate from Phase 4 but the same Stripe
account. Steps documented in `docs/handoffs/SESSION_90_HANDOFF.md`. Required
before Phase 5's payout calculator can transfer money to agents.

---

## Architecture summary

When configured, here's what happens:

```
School signup at montree.xyz/montree/try
  └─ Creates montree_schools row, subscription_status='trialing', trial_ends_at=now+30d

Principal opens /montree/admin/billing
  └─ GET /api/montree/billing/status — shows trial countdown + estimate

Principal clicks "Set up billing"
  └─ POST /api/montree/billing/checkout
      └─ getOrCreateStripeCustomer(school) — creates Stripe Customer
      └─ stripe.checkout.sessions.create(price=$7, quantity=N students)
      └─ Returns Stripe Checkout URL
  └─ Browser redirects to Stripe-hosted page
  └─ Principal pays
  └─ Stripe redirects back to /montree/admin/billing?status=success

Stripe sends webhook event customer.subscription.created
  └─ /api/montree/billing/webhook verifies signature
  └─ handleSubscriptionUpsert() persists subscription_id, status, period

Stripe sends webhook event invoice.paid (first month)
  └─ handleInvoicePaid() writes:
      - montree_finance_transactions row (type=income, category=subscription_revenue)
      - montree_finance_transactions row (type=direct_cost, category=stripe_fee)
      - montree_billing_history row (per-school invoice timeline)

Teacher adds a new child to the classroom
  └─ POST /api/montree/children inserts row
  └─ maybeSyncStripeQuantity(schoolId) fires-and-forgets
  └─ syncSubscriptionQuantity() pushes new quantity to Stripe
  └─ Stripe prorates the difference for the current period

End of monthly period
  └─ Stripe generates invoice with current quantity
  └─ Invoice paid via card on file
  └─ Webhook fires, finance ledger gets a fresh income+fee pair
```

Phase 5 then aggregates this ledger to calculate agent payouts.

---

## What's NOT in Phase 4

- **Phase 5** — Agent payout calculator. Builds on Phase 4's
  `montree_finance_transactions` ledger.
- **Phase 6** — Super admin Money tab (P&L view).
- **Per-school manual price override** — every school is on the same $7. If
  you need a discount for a particular school, use Stripe's coupon system
  (`allow_promotion_codes: true` is already set on Checkout sessions).
- **Annual billing option** — monthly only for v1.
- **Multiple students priced differently** — flat rate per active child.
  Aged-out / inactive children don't count (we filter by `is_active=true`).

---

## Failure modes + recovery

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Webhook returns 503 | Env vars missing | Step 3 + Step 4 |
| Webhook returns 400 "Invalid signature" | Wrong webhook secret | Re-copy from Stripe Dashboard, update Railway env, redeploy |
| Checkout returns 503 with `configured: false` | Same as above | Same |
| Subscription quantity doesn't auto-update | Sync sweep not running OR child create route hooked but failing silently | Hit `/api/montree/billing/sync-quantity?school_id=X` manually as super admin to force-reconcile |
| `montree_finance_transactions` not populated after invoice.paid | Webhook signature mismatch (events arrive but get rejected) OR the school's `stripe_customer_id` doesn't match | Check Railway logs for `[billing webhook]` lines; verify the customer_id in Stripe Dashboard matches what's on the school |
| Refund doesn't subtract from agent payout | Phase 5 not yet shipped | Expected — Phase 5 reads negative income rows |
