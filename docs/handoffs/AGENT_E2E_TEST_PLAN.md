# Agent E2E Test Plan — Self-as-Agent Dry Run

Walk this end-to-end before Gloria's real onboarding. The plan deliberately uses **your own identity** (not Gloria's, not impersonation via the 🔓 button) so we test the actual production flow a new agent will follow. Anything broken here would have broken on Gloria — far better to find it now.

---

## Why this is the right test

The "Log in as agent" 🔓 button in super-admin mints a JWT for Tredoux's session with `role: 'agent'` and `sub: <gloria's teacher_id>`. That's **not** the path a real agent takes — they enter their 6-char code on `/montree/login-select` and the unified login route mints a normal agent JWT. Subtle JWT shape differences between those two paths are a plausible source of the "Refresh from Stripe" 404 you saw. Running the real path with your own identity tests what Gloria will actually hit.

Cleanup is covered by `scripts/cleanup-test-agent.sql` — pre-staged for the end of this checklist.

---

## Pre-flight (5 min, before you start)

- [ ] **Two browsers ready.** Chrome (signed in as Tredoux super-admin) + a private/incognito window (will be the test agent, no Tredoux cookies).
- [ ] **Email access for `tredoux+agentest@gmail.com`.** Gmail strips `+agentest` for delivery — it routes to your normal `tredoux555@gmail.com` inbox. Verify by sending yourself a test email if uncertain.
- [ ] **Stripe Dashboard open** in a third tab — `https://dashboard.stripe.com/connect/accounts` — so you can watch the Connect account appear when it's created and confirm webhooks.
- [ ] **Railway logs open** — useful for confirming `[connect-webhook]` lines fire when you submit the Stripe form.
- [ ] **Wise USD account ID handy** (or whatever bank you'll use). Stripe will need real bank info for live mode; you'll wire yourself $1 then reverse it.
- [ ] **Cleanup script staged** — open `scripts/cleanup-test-agent.sql` in your editor so you can copy/paste into Supabase SQL when done.

---

## Step 1 — Issue yourself an agent login

In **Chrome** (super-admin), navigate to **Super-admin → Referrals tab**.

- [ ] Click the "Issue agent login" button (top of the tab).
- [ ] Form: name `Tredoux Test`, email `tredoux+agentest@gmail.com`, default share % `50`.
- [ ] Submit → reveal-once gold banner appears with the agent code (format `TREDOUX-XXXX`). **Copy it somewhere safe** — you won't see it again.
- [ ] Confirm a new row appears in the Referrals table with that code, status pill `Active`, `is_agent=true`.

**Expected:** new shell-agent `montree_teachers` row exists with `is_agent=true`, `agent_password_hash` set, `agent_default_share_pct=50`.

**If this fails:** Migration 188 not run, or `/api/montree/super-admin/agents/login` route returning 500. Check Railway logs for the actual error.

---

## Step 2 — Direct login as test agent

In your **private window**, go to `https://montree.xyz/montree/login-select`.

- [ ] Enter the agent code from Step 1.
- [ ] Submit → expected: redirect to `/montree/agent/dashboard`.
- [ ] **Important sanity check:** open DevTools → Application → Cookies → `montree-auth`. Decode the JWT payload (paste into jwt.io). Confirm `role: 'agent'` and `sub: <your test agent teacher_id>`.

**Expected:** dashboard renders with greeting using "Tredoux Test", AgentNav across the top (Dashboard / Schools / Codes / Earnings / Payouts / Settings / Mira / Messages), Stripe banner at the top says "Set up payouts now" since you haven't onboarded yet.

**If this fails with 401/403:** `tryAgentLogin` in `/api/montree/auth/unified/route.ts` not finding the new row, or migration 188 incomplete. If the page renders but `role` is not `agent` in the JWT, the unified login order is broken (principal/teacher matched first).

**This step alone tells us something important about the 404 on Gloria.** If Gloria's "Refresh from Stripe" was failing via the impersonation path but YOURS works as a real agent, we've isolated the bug to the 🔓 impersonation flow's JWT minting. Note that observation.

---

## Step 3 — Walk all 6 nav pages

- [ ] **Dashboard** — renders greeting, summary line, schools cards (empty), earnings tiles (zero), recent codes (empty).
- [ ] **Schools** — empty state with help copy.
- [ ] **Codes** — empty + a form to self-generate.
- [ ] **Earnings** — two summary tiles (zero), per-school table empty, formula explanation visible.
- [ ] **Payouts** — Stripe Connect status pill says "Not started" (slate). No payout history. CTA: "Generate onboarding link".
- [ ] **Settings** — read-only profile shows your name + email.
- [ ] **Mira** — empty conversation, gold avatar, greeting "Hi, Tredoux Test."
- [ ] **Messages** — empty thread list.

**Expected:** every page returns 200, no console errors except the known `mira-avatar.png` 404s (cosmetic — Session 97 architectural note).

**If any page hits 500:** the relevant `/api/montree/agent/*` route has a regression. Compare to Session 92 commit `70a680cd` for the full route inventory.

---

## Step 4 — Generate a self-service referral code

On the **Codes** page:

- [ ] Pitch label: `Test School — May 13`
- [ ] Submit → reveal-once gold banner with code (format `TREDOUX-XXXX`, NEW code, different from the login code). **Copy this code too.**
- [ ] Confirm it appears in the table below with status `Pending`, share % `50` (your locked default).

**Expected:** new row in `montree_referral_codes` with `agent_id=<your test agent id>`, `status='pending'`, `revenue_share_pct=50`.

**If 429/rate-limited:** you've hit the 20/24h self-service rate cap from Session 92. Use a super-admin override path to issue manually if needed for testing.

---

## Step 5 — Redeem the code (test school signup)

Open a **second private window** (separate from the agent's window — clean cookie state).

- [ ] Go to `https://montree.xyz/montree/try?ref=<the referral code from Step 4>`
- [ ] Confirm the gold "Referral code: TREDOUX-XXXX" banner appears at the top.
- [ ] Pick role: **Principal**.
- [ ] School name: `Test Mountain Montessori`. Owner name: `Test Principal`. Owner email: `tredoux+testschool@gmail.com`.
- [ ] Submit → success screen shows your principal login code (= the referral code per Session 86 architectural rule).
- [ ] Confirm in Supabase: `SELECT id, name, founding_teacher_id, referral_code_used, revenue_share_pct, revenue_share_active FROM montree_schools WHERE name = 'Test Mountain Montessori';` — `founding_teacher_id` should equal your test agent ID, `revenue_share_active=true`, `revenue_share_pct=50`.

**Expected:** test school created, agent linked, referral code marked `redeemed`. The agent dashboard (back in private window 1) refreshing should now show 1 school card.

**If founding_teacher_id is null on the school:** the `resolveReferralCode()` validation at the top of `/api/montree/try/instant` failed silently. Check Railway logs.

---

## Step 6 — Generate Stripe Connect onboarding link

Switch back to **private window 1** (agent). Click the Mira → Dashboard refresh.

- [ ] Open Payouts page.
- [ ] Click "Generate onboarding link" → indigo banner shows the URL.
- [ ] Click the URL → opens a new tab on `connect.stripe.com/setup/e/...`

**Expected:** in Supabase, `montree_teachers.stripe_connect_account_id` is now populated for your test agent (`acct_...`). Stripe Dashboard → Connect → Accounts shows the new Express account with status "Pending".

**If you hit a 503 or 500:** `STRIPE_SECRET_KEY` not set in Railway, or `createConnectAccount` failing for some other reason. Check logs.

---

## Step 7 — Complete the Stripe Express form (LIVE mode, real info)

In the Stripe-hosted form tab:

- [ ] Country: South Africa or wherever you're operating from.
- [ ] Business type: Individual.
- [ ] DOB, address, SSN-equivalent / ID: your real info. Stripe needs this for live mode.
- [ ] External account: your real bank account (Wise USD works for this test). Stripe routing number, account number.
- [ ] Submit.

**Expected:** Stripe shows "You're all set." Page redirects to `/montree/agent/onboarding?status=complete`.

**Within ~30 seconds** — and watching Railway logs the whole time — you should see a `[connect-webhook]` log line as `account.updated` fires. The webhook persists fresh status to your `montree_teachers` row.

- [ ] Back on the agent Payouts page, **click "Refresh from Stripe"**. This is the button that 404'd for Gloria.
- [ ] **If it returns 200:** status pill flips to "Verified" (green). **The 404 was specific to the impersonation flow.** Make a note — Task #1 reopens with a different scope.
- [ ] **If it returns 404 here too:** the bug is in the direct-login flow as well. Check DevTools Network tab for the exact request URL + response body. Take a screenshot and send.
- [ ] **If it returns 502:** Stripe Connect not fully configured (webhook secret missing, or account in a weird state).

---

## Step 8 — Trigger payout calculator manually

In the **super-admin window** (Chrome):

- [ ] Open Health tab → scroll to "Cron triggers" panel.
- [ ] Click "Monthly payout calc" → dry-run first, look at result panel.
- [ ] Then click without dry-run.

**Expected:** test school + test agent appear in the Money tab → Payouts sub-tab. Even if the school has zero revenue (no Stripe subscription yet), a row should appear with `net_usd=0`, `payout_usd=0`, `status='pending'`. The calc is idempotent.

To force a non-zero payout for testing the wire path, insert a fake income row:

```sql
INSERT INTO montree_finance_transactions (
  occurred_at, type, category, description,
  school_id, original_currency, original_amount, fx_rate, usd_amount,
  source, source_ref
) VALUES (
  NOW() - INTERVAL '7 days',
  'income', 'subscription_revenue', 'Test school subscription — fabricated for E2E',
  '<TEST_SCHOOL_ID>', 'USD', 7, 1.0, 7,
  'manual_entry', 'e2e-test-' || gen_random_uuid()
);
```

- [ ] Re-run the payout calculator → test agent's row should now show `gross_revenue_usd=7`, `net_usd≈6.50`, `payout_usd≈3.25` (50% of net after estimated Stripe fee).

---

## Step 9 — Wire $1 to yourself (the moment of truth)

This is the only step that touches **real money**. You're using Stripe Connect Express in live mode against your own bank.

- [ ] In Money tab → Payouts, find your test agent's row.
- [ ] Manually edit the payout to $1 (super-admin manual_override) so we don't wire the full computed amount.
- [ ] Click **⚡ Wire**. Confirm.

**Expected:**
1. Stripe `transfers.create` fires with idempotency key `montree_payout_<id>_100`.
2. Row status flips to `paid`, `stripe_transfer_id` populated, `paid_at` stamped.
3. Stripe webhook (Account events `transfer.created` / `transfer.paid`) lands.
4. Email arrives at `tredoux+agentest@gmail.com` (which routes to your main inbox) — "$1.00 wired to your Wise account, ref: tr_..."
5. A `montree_finance_transactions` row of type `commission`, `category=referral_payout`, `usd_amount=-1.00` is written for audit trail.
6. **Within 1–2 business days**, $1 lands in your bank. (Stripe Express US balance → USD wire to Wise can take a day.)

Once the $1 arrives:

- [ ] Reverse the transfer in Stripe Dashboard → Connect → Transfers → ⋯ → Reverse. This sends the $1 back to the platform balance, no net cost to the business.

---

## Step 10 — Validate cleanup script in preview mode

Before COMMITting anything:

- [ ] Open `scripts/cleanup-test-agent.sql` in Supabase SQL Editor.
- [ ] Run the **Step 0 lookup SELECT** (uncomment it temporarily) — find your test agent's teacher_id.
- [ ] Edit the DO block: paste the UUID into `v_agent_id`, keep `v_dry_run := true`.
- [ ] Run.

**Expected:** Output tab shows counts at each step:
```
TEST AGENT CLEANUP
Agent name : Tredoux Test
Agent email: tredoux+agentest@gmail.com
Test schools linked: 1 {<test_school_uuid>}
[delete] montree_agent_payouts          rows: 1
[delete] montree_finance_transactions   rows: 2 or more
[scope ] message threads involving agent: 0  (assuming you didn't test messaging)
[delete] montree_agent_audit            rows: 3 or so
[delete] montree_referral_codes         rows: 2  (login code + the test code)
[delete] montree_children               rows: 0
[delete] montree_teachers (test schools) rows: 0
[delete] montree_classrooms             rows: 0
[delete] montree_school_admins          rows: 1
[delete] montree_schools                rows: 1
[delete] montree_teachers (agent)       id  : <agent_id>
DRY RUN — rolling back.
```

The exception `DRY_RUN_ROLLBACK` is the intentional rollback trigger — not a real error.

- [ ] **If counts look right** → flip `v_dry_run := false` and re-run.
- [ ] **If something looks wrong** (e.g. way more children than expected, or test schools you didn't create) — STOP. Investigate before committing.

---

## Step 11 — Stripe-side cleanup

Before the SQL cleanup deletes the database row pointing at the Stripe account:

- [ ] Stripe Dashboard → Connect → Accounts → find your test Express account.
- [ ] If you wired $1 and reversed it, the balance should be zero. Confirm.
- [ ] ⋯ menu → **Reject account** → confirm.

This deactivates the Express account so it can't accept further transfers, even if the DB pointer somehow lingers.

---

## Step 12 — Execute SQL cleanup (COMMIT)

- [ ] Back in Supabase, flip `v_dry_run := false`.
- [ ] Run.

**Expected:** the `DRY_RUN_ROLLBACK` exception does NOT fire this time. Final message: `COMMITTED. Test agent + test school state has been removed.`

---

## Step 13 — Post-cleanup verification

Run the verification SELECTs at the bottom of `cleanup-test-agent.sql`:

- [ ] `SELECT count(*) FROM montree_teachers WHERE id = '<test_agent_id>';` → **0**
- [ ] `SELECT count(*) FROM montree_referral_codes WHERE agent_id = '<test_agent_id>';` → **0**
- [ ] `SELECT count(*) FROM montree_agent_payouts WHERE agent_id = '<test_agent_id>';` → **0**
- [ ] `SELECT count(*) FROM montree_finance_transactions WHERE agent_id = '<test_agent_id>';` → **0**
- [ ] `SELECT count(*) FROM montree_agent_audit WHERE agent_id = '<test_agent_id>';` → **0**
- [ ] `SELECT count(*) FROM montree_agent_mira_log WHERE agent_id = '<test_agent_id>';` → **0** (cascade should have cleared)
- [ ] `SELECT count(*) FROM montree_schools WHERE name = 'Test Mountain Montessori';` → **0**

Also confirm in super-admin:

- [ ] Schools tab → "Test Mountain Montessori" gone.
- [ ] Referrals tab → "Tredoux Test" gone, both referral codes gone.
- [ ] Money tab → no test payout row.
- [ ] Visitors tab → unaffected.

- [ ] Now safe to issue Gloria's live onboarding link.

---

## What this test proves before Gloria's real onboarding

| Surface | Verified |
|---|---|
| Agent code issuance from super-admin | ✅ Step 1 |
| Direct agent login via unified login | ✅ Step 2 |
| All 6 + 2 agent nav pages render | ✅ Step 3 |
| Self-service code generation | ✅ Step 4 |
| Code redemption + school linkage + revenue share lock | ✅ Step 5 |
| Stripe Connect account creation + onboarding link | ✅ Step 6 |
| Stripe Connect form submission + webhook → DB sync | ✅ Step 7 |
| "Refresh from Stripe" via direct login (the 404 mystery) | ✅ Step 7 |
| Payout calculator + idempotent UPSERT | ✅ Step 8 |
| Stripe `transfers.create` with idempotency key | ✅ Step 9 |
| Webhook on transfer + commission row + email | ✅ Step 9 |
| Cleanup script with dry-run preview | ✅ Steps 10–13 |

If every step passes, Gloria can be onboarded with high confidence the same hour. If any step fails, you've caught a real bug before it touches a real partner relationship.

---

## Carry-outs back into CLAUDE.md

After test completion, the following pieces of information should land in next session's brain update:

1. **The 404 root cause** — direct login flow vs impersonation flow result.
2. **Webhook lag observed** — actual time between Stripe form submit and DB status flip. Should be < 60s; document if not.
3. **Anything that surprised you** in the Stripe Express form (Stripe regularly tweaks the form fields).
4. **Bank settlement time** — actual hours between Wire and money in your bank.

These calibrate expectations for what to tell Gloria she'll experience.
