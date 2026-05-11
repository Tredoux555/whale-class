# Railway cron setup — Montree

Three crons unlock the autonomous infrastructure.

---

## Prereqs

Set in Railway env vars (once):

```
CRON_SECRET=<generate a long random string>
```

The same string goes into the `x-cron-secret` header on every cron call below.
Use 32+ random chars. Generate with `openssl rand -base64 32`.

---

## 1. Monthly payout calculator (the big one)

**What:** On the 1st of every month at 02:00 UTC, fires the payout calculator for the PRIOR month. Aggregates AI usage → writes finance_tx direct_cost rows → computes payouts → writes/updates `montree_agent_payouts` rows. Super-admin then opens the Money tab and either wires or manually marks each row paid.

**Schedule:** `0 2 1 * *` (cron: 02:00 UTC, 1st of every month)

**Command in Railway:**

```bash
curl -sS -X POST 'https://montree.xyz/api/montree/super-admin/payouts/calculate' \
  -H "x-cron-secret: $CRON_SECRET" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg pm "$(date -u -d 'last month' +%Y-%m)" '{period_month: $pm}')"
```

If your Railway image doesn't have `jq`, use this simpler form (computes prior month in shell):

```bash
PERIOD=$(date -u -d 'last month' +%Y-%m)
curl -sS -X POST 'https://montree.xyz/api/montree/super-admin/payouts/calculate' \
  -H "x-cron-secret: $CRON_SECRET" \
  -H 'content-type: application/json' \
  -d "{\"period_month\":\"$PERIOD\"}"
```

**Why "prior month":** the 1st-of-month cron fires AFTER the period it's calculating has closed. Calculating June on June 1st would miss the entire month.

---

## 2. Post-deploy warm ping (Tier 0.14)

**What:** After every Railway deploy, fire `/api/warm` once to load the DB pool + import the Anthropic/OpenAI/Stripe SDK modules into V8 cache. Eliminates the 5-10s cold-start penalty on the first real user request.

**Schedule:** Railway has a "post-deploy hook" option in the service settings — use that, not a recurring cron. Single fire after each successful deploy.

**Command:**

```bash
curl -sS 'https://montree.xyz/api/warm' \
  -H "x-cron-secret: $CRON_SECRET"
```

Expected response: `{"ok": true, "total_ms": <50-300>, "steps": [...]}`. If `ok=false`, check Railway logs for which step failed.

---

## 3. Recurring op-expense scheduler

**What:** Scans `montree_recurring_op_expenses` templates daily. For any active template where today's day-of-month ≥ template.day_of_month AND it hasn't fired yet this period, inserts a `finance_transactions` row with `type='op_expense'`. Idempotent via `last_fired_period_month`.

**Schedule:** Daily at 04:00 UTC. `0 4 * * *`

**Command:**

```bash
curl -sS -X POST 'https://montree.xyz/api/montree/super-admin/finance/recurring/run' \
  -H "x-cron-secret: $CRON_SECRET"
```

**Why daily (not monthly):** if a template has `day_of_month=5` and we run on the 5th, we fire same day. If Railway is down on the 5th and we miss it, the next daily run catches it on the 6th. Same period_month, still fires once.

**Manual dry-run** to test without writing:

```bash
curl -sS -X POST 'https://montree.xyz/api/montree/super-admin/finance/recurring/run?dry_run=1' \
  -H "x-cron-secret: $CRON_SECRET"
```

---

## 4. Stripe quantity sweep (Phase 4 carry-over)

**What:** Re-syncs Stripe subscription quantities with the actual active-children count for every paid school. Catches drift if the in-app sync misses (rare — the in-app fire-and-forget pattern usually wins). Already shipped as `/api/montree/billing/sync-quantity` per Session 93.

**Schedule:** Once a day at 03:00 UTC. `0 3 * * *`

**Command:**

```bash
curl -sS -X POST 'https://montree.xyz/api/montree/billing/sync-quantity' \
  -H "x-cron-secret: $CRON_SECRET" \
  -H 'content-type: application/json' \
  -d '{"sweep": true}'
```

---

## Verification after setup

After adding each cron in Railway and saving:

1. Hit the URL manually with the right `x-cron-secret` header. Should return 200.
2. Wrong / missing header should return 401.
3. Check Railway → Service → Logs → filter by `/api/montree/super-admin/payouts/calculate` to confirm the cron fires on schedule.

---

## Manual one-off triggers (without waiting for the cron)

From your laptop terminal:

```bash
# Calculate current month (e.g. for testing)
curl -X POST 'https://montree.xyz/api/montree/super-admin/payouts/calculate' \
  -H "x-super-admin-token: $YOUR_SA_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"period_month":"2026-05"}'

# OR — if you don't have the SA token handy, use the cron secret:
curl -X POST 'https://montree.xyz/api/montree/super-admin/payouts/calculate' \
  -H "x-cron-secret: $CRON_SECRET" \
  -H 'content-type: application/json' \
  -d '{"period_month":"2026-05"}'
```

The Money tab's "⚙️ Calculate now" button uses the SA token path; the cron uses the secret path. Both fire the same handler.
