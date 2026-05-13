# Session 109 Handoff — Manual payout architecture + financial books foundation

**Commits shipped:** 9 on origin/main. Working tree clean.

> 30836e8e Session 108 (prior)
> e83e7490 → 57057257 → 3d2ef06c → 8764699f (Session 108 post-deploy fixes)
> 5910b39a Session 109: Manual payout architecture + Stripe Connect country fix
> 80cdce22 Become-an-agent nav match landing proportions
> 7628016c Financial architecture plan + B1 manual wire recording UI
> 1e4bdc8f B2 Annual agent statement (CSV + printable HTML)
> 3c193a5a B3 Period locking (migration 206 + assertPeriodOpen guard + UI)
> a20e1bc0 B4 Reconciliation report
> cc2c9a94 Phase C scaffold — Xero sync + Health card
> 0d7788b5 B5 scaffold — agent tax form (W-8BEN-E / W-9)

---

## Operational state to set up (Tredoux's TODO)

### 🚨 Migrations to run in Supabase SQL Editor

In order. Each is idempotent — safe to re-run.

1. **205** — `migrations/205_agent_payout_method.sql` — `montree_teachers.payout_method`, `manual_payout_details`, `manual_payout_details_updated_at`. Required for the 💸 button + manual_wire flow.
2. **206** — `migrations/206_period_locks.sql` — `montree_period_locks` table. Required for Close month / Reopen UI.
3. **207** — `migrations/207_agent_tax_form.sql` — W-8BEN-E / W-9 / equivalent columns on `montree_teachers`. Required for tax-form scaffold.
4. **208** — `migrations/208_xero_sync_log.sql` — `montree_xero_sync_log` table. Required for Xero sync (which itself stays inactive until env vars are set).

### 🚨 Bayan onboarding — actually pay her

Stripe Connect doesn't support ZA (verified via Stripe API error this session: "ZA is not currently supported by Stripe"). She goes on the manual_wire path:

1. **Reject** the half-completed HK Stripe Connect account in `dashboard.stripe.com/connect/accounts` so it doesn't sit around.
2. **Run** this SQL to clear stale Stripe state on her row:
   ```sql
   UPDATE montree_teachers
      SET stripe_connect_account_id = NULL, stripe_connect_status = NULL,
          stripe_connect_charges_enabled = FALSE, stripe_connect_payouts_enabled = FALSE,
          stripe_connect_details_submitted = FALSE, stripe_connect_disabled_reason = NULL,
          stripe_connect_completed_at = NULL, stripe_connect_updated_at = NOW()
    WHERE id = (SELECT id FROM montree_teachers WHERE is_agent=TRUE
                AND (email ILIKE '%bayan%' OR name ILIKE '%bayan%') LIMIT 1)
   RETURNING id, name, email;
   ```
3. **Super-admin → Agents → 💸 Payout config on Bayan's row** → "Manual wire" → paste her bank JSON.
4. She refreshes `/montree/agent/payouts` → sees her bank details on file, manual wire copy.
5. When first commission accrues, run the payout calc, then **⚡ Record manual wire** on her row in Money tab, paste Wise transfer ref, currency, FX rate. Payout flips paid, ledger gets the commission row.

### Future Phase A operational setup (when ready)

1. **Open Xero account** — Growing plan, ~HK$300-500/mo. Tenant currency: USD.
2. **Connect Stripe via Xero's built-in Stripe app** — pulls all subscription revenue + fees automatically.
3. **Connect Wallex bank feed** (CSV upload monthly if no direct feed).
4. **Hire HK accountant** — Xero-certified. Budget HK$2k-5k/mo for monthly close + annual filing. Send them `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`.
5. **Generate Xero OAuth credentials** → set Railway env vars: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID`, `XERO_REFRESH_TOKEN`. Health card flips from "Not configured" to live state.
6. **Wire Railway cron** for `node scripts/sync-to-xero.mjs` daily at 02:00 UTC (per `docs/perf/CRON_SETUP.md`).
7. **Confirm Xero chart-of-accounts codes** with accountant, update `lib/montree/xero/mapper.ts` account codes (currently placeholder values like 200, 310, 320).
8. **Flip sync script from scaffold to real** — one line edit in `scripts/sync-to-xero.mjs`: replace the "log intended payload + skipped" branch with actual `xeroFetch()` POST calls.

---

## What's live and working right now

### Agent system (Session 108 + 109)

| Feature | Where |
|---|---|
| Become-an-agent landing | `/montree/become-an-agent` — full recruitment page with application form, 31-country Connect picker hidden behind "How it works" / 💸 manual wire fallback |
| Application submission | `POST /api/montree/become-an-agent/apply` — honeypot, INSERT + 23505 handling preserves CRM history |
| Super-admin Agent Applications alert | banner above Agents tab — Accept routes to ReferralsTab with prefill params |
| Agent code login | unified `/montree/login-select` accepts 6-char code → `/montree/agent/dashboard` |
| Agent ↔ Tredoux threaded messaging | `/montree/agent/messages-tredoux` ↔ super-admin Agent Inbox tab |
| Payout method per agent | `montree_teachers.payout_method` ∈ {stripe_connect, manual_wire} (migration 205) |
| Stripe Connect Express | country picker on agent /payouts page (31 supported countries), validated against `STRIPE_CONNECT_SUPPORTED_COUNTRIES` |
| Manual wire UI for agents in unsupported countries | Agent /payouts shows bank details on file (read-only) |
| Super-admin 💸 Payout config modal | radio (stripe_connect / manual_wire) + JSON textarea for bank details |
| Super-admin ⚡ Record manual wire | violet button in Money tab — captures wire ref, FX rate, local amount, notes |
| Annual agent statement | super-admin 📄 button per agent → CSV + printable HTML |

### Financial books (Session 109 Phase B + C)

| Feature | Where |
|---|---|
| Period locking (closed-month immutability) | migration 206 + `lib/montree/finance/period-lock.ts` + 🔒 button in MoneyTab |
| `assertPeriodOpen()` guard wired into | `/api/montree/super-admin/payouts/[id]/wire` AND `/record-wire` |
| Reconciliation report | `/api/montree/super-admin/finance/reconciliation` + 🧮 panel in MoneyTab. Stripe-side vs billing_history vs bank-side diff |
| W-8BEN-E / equivalent tax form metadata | migration 207 + GET/PATCH route. UI button deferred |
| Xero sync engine (scaffold) | migration 208 + `lib/montree/xero/{client,mapper}.ts` + `scripts/sync-to-xero.mjs` |
| Health tab Xero card | 📒 Xero sync card — shows configured / migration_pending / queue depth / 7d counts |

---

## Architectural rules locked this session (#62–78)

62. **Period-locked months are immutable.** `assertPeriodOpen()` gates every mutation to finance_transactions + agent_payouts. Reopening requires explicit super-admin action with notes captured.
63. **Every paid agent payout writes a commission row to `montree_finance_transactions`** regardless of payout method. Stripe Connect wires AND manual wires use `(source, source_ref)` for idempotency — Stripe uses `source='stripe_webhook', source_ref='payout:<id>'`, manual uses `source='manual_entry', source_ref='manual_wire:<wire_ref>'`.
64. **Annual agent statements are sourced from `montree_agent_payouts` where status='paid'**, not from finance_transactions. The payout table is the canonical "what we paid this agent" record.
65. **Reconciliation is a multi-source diff**, not a single source of truth. Stripe webhooks + ledger + bank statements must agree within $1 — anything more is a finding to investigate.
66. **W-8BEN-E (or jurisdiction equivalent) collected at agent onboarding** — not blocking initial code issuance but checked before first payout (future enforcement).
67. **Manual wire records use the wire ref as `source_ref`** for idempotency. Re-recording the same wire ref returns the existing record, no duplicate ledger entry.
68. **`createConnectAccount(country)` is REQUIRED.** Without it Stripe defaults to platform country (HK) and locks every agent to wrong jurisdiction. ReferralsTab 💳 + agent /payouts both prompt for country before creating an account.
69. **`STRIPE_CONNECT_SUPPORTED_COUNTRIES` is the canonical list.** Agents in unsupported countries (China, Palestine, Lebanon, ZA, Argentina, Ukraine, etc.) MUST go on `payout_method='manual_wire'`. The list is in `lib/montree/referral/payout-country-support.ts`.
70. **Verified Stripe Connect agents cannot be silently switched to manual_wire.** Payout-config PATCH refuses with 409 — operator must reject the Stripe account first, otherwise the system state diverges.
71. **Agent /payouts page branches on `payout_method`.** stripe_connect → existing Stripe Connect onboarding UI. manual_wire → "Bank details on file" read-only view. Payout history common to both.
72. **MoneyTab wire button branches on `agent_payout_method`.** stripe_connect → amber ⚡ Wire (Stripe `transfers.create`). manual_wire → violet ⚡ Record manual wire (inline form).
73. **Montree operational ledger is the real-time truth.** Xero (when activated) is the statutory truth — read-only mirror via daily sync. The accountant's adjusting entries stay in Xero only; operational books in Montree stay simple.
74. **Xero sync is idempotent via partial unique index** on `(finance_tx_id, xero_object_type) WHERE status='success'`. Re-running the script never duplicates Xero objects. Failed attempts don't occupy a slot so retries are unblocked.
75. **Xero refresh tokens rotate on use.** When `refreshAccessToken()` returns a new refresh_token, it's logged loudly so the operator can update Railway env. Phase D will auto-persist.
76. **Xero account codes in `mapper.ts` are placeholders** (200/310/320/400/491/090/404). The accountant maps these to the actual Xero chart of accounts before flipping the sync script from scaffold to live.
77. **Agent annual statement footer states explicit independent-contractor + non-withholding posture.** Doubles as bank source-of-funds documentation for receiving banks in restricted countries.
78. **Bayan / ZA test case proves the system.** China + Palestine + ZA + Argentina + Ukraine all route through manual_wire. Future agents in these countries don't need code changes — just the 💸 button.

---

## What's NOT shipped (deferred)

| Item | Why deferred | Effort when ready |
|---|---|---|
| ReferralsTab 📋 Tax-form button + modal | UI on top of the API that's already shipped. 30-min add. | 30m |
| Wallex CSV upload flow + `montree_bank_statements` table | Bank reconciliation needs a bucket + parser. Half-day. | 0.5d |
| Real Xero API calls in sync script | Need accountant to confirm chart-of-accounts codes first. One-line flip after that. | 30m + accountant time |
| Mira tool extensions (`start_thread_with_tredoux` etc.) | Phase 4.7 from prior plan. Half-day. | 0.5d |
| Tracy super-admin scope tools | Phase 4.8 from prior plan. Separate route. Half-day. | 0.5d |
| Auto-W-8BEN-E mandate before first payout | Logic exists architecturally (rule #66) — gate not yet wired. Half-day. | 0.5d |
| Period close auto-suggested when reconciliation has 0 findings | Nice-to-have polish. | 1-2h |
| Mandatory tax form before $600 cumulative payment | US 1099 threshold convention. Triggered alert + payout block. | 0.5d |
| Phase D Xero token persistence + auto-rotate | Currently refresh_token logged for manual Railway update. | 0.5d |

---

## Smoke test for Session 110

1. **Run migrations 205 + 206 + 207 + 208** in Supabase. Each idempotent. Verify with `\d+ montree_teachers` (should show all new columns) and `\dt montree_*` (should show period_locks + xero_sync_log).
2. **Clear Bayan's Stripe state** with the SQL above.
3. **Set her payout_method to manual_wire** via 💸 — paste bank JSON.
4. **Have her refresh /payouts** — should see "Bank details on file" view, no Stripe onboarding form.
5. **Run payout calculator** (Health tab → Cron triggers) for a recent month.
6. **⚡ Record manual wire** on her pending row — fill ref + FX + currency → Confirm. Row flips to paid.
7. **Open her 📄 annual statement** — should show the wire entry in the payments table.
8. **🔒 Close the period** — try to record another wire, should 409 with "Period closed."
9. **🔒 Reopen the period** with notes — can record again.
10. **🧮 Reconciliation panel** should auto-load for the current period. Should show "No statement uploaded" finding for the bank-side card.
11. **Health tab → 📒 Xero sync card** should show "Not configured" since env vars aren't set.

---

## Next session priorities (ordered)

1. **Walk the 11-step smoke test** above.
2. **Onboard Bayan via manual_wire** end-to-end with a real $1 test wire to verify the flow.
3. **Open Xero account + connect Stripe** (Phase A).
4. **Hire HK accountant** (Phase A).
5. **Ship the deferred items** — ReferralsTab 📋 tax-form button, Wallex CSV upload, real Xero API calls (after accountant confirms account codes).
6. **Mira + Tracy tool extensions** (Phases 4.7 + 4.8 from Session 108 plan).
7. **Translation sweep** — the 72 non-translated pages from Session 108 audit. Public funnel first.
8. **i18n batch** for all new agent-system + finance strings (~80 keys × 12 locales).
