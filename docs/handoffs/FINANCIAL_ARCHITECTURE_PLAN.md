# Financial Architecture — Plan & Build Log

**Goal:** A clean money-tracking system where every dollar that flows in (school subscriptions), every dollar that flows out (agent commissions, API costs, op-expenses), and every fee in between is recorded, reconcilable, tax-authority-ready, and as automated as possible.

**Strategic frame:** Build the operational ledger inside Montree (real-time, integrated with the product). Outsource the statutory bookkeeping to Xero (the books an HK accountant audits and files from). Sync the two on a cron. Manual processes (Wise transfers) get a clean UI to record the result.

---

## Current state (what's already shipped, Sessions 90–109)

| System | Status | File / table |
|---|---|---|
| Unified ledger | ✅ Live | `montree_finance_transactions` — every income/direct_cost/commission/op_expense/fx_adjustment row. Multi-currency aware, idempotent via `(source, source_ref)` unique index. |
| Per-month per-agent payout calc | ✅ Live | `montree_agent_payouts` — gross, fees, AI costs, net, share %, payout USD. Locked at calc time. |
| API usage aggregator | ✅ Live | `lib/montree/payouts/api-usage-aggregator.ts` — daily `montree_api_usage` rows → monthly `direct_cost` finance_tx rows per (school, api, month). |
| Payout calculator | ✅ Live | `lib/montree/payouts/calculator.ts` — race-safe UPSERT, skips paid + override rows. |
| Wire-out via Stripe Connect | ✅ Live | `POST /api/montree/super-admin/payouts/[id]/wire` — idempotency key `montree_payout_${id}_${cents}`. |
| Manual payout architecture | ✅ Live (Session 109) | `montree_teachers.payout_method ∈ {stripe_connect, manual_wire}` + `manual_payout_details JSONB`. Super-admin 💸 button. |
| Stripe Connect country validation | ✅ Live (Session 109) | `lib/montree/referral/payout-country-support.ts` — supported-country list with `isStripeConnectSupported()` + `recommendedPayoutMethod()`. |
| Money tab P&L view | ✅ Live | Super-admin → Money. 6 sub-tabs (Payouts / Revenue / Direct costs / Commissions / Op-expenses / FX). |
| Accountant export pack | ✅ Live | `GET /api/montree/super-admin/finance/export?period_month=YYYY-MM&format=csv|json` — 5-section CSV (P&L summary + per-school revenue + per-agent commission + Stripe reconciliation + ledger backup). Plus printable HTML at `/export/print`. |
| Stripe webhook deadletter queue | ✅ Live | `montree_webhook_deadletter` table + super-admin DLQ tab. |
| Server error log | ✅ Live | `montree_server_errors` table + super-admin Errors tab. |

This is genuinely solid foundation for early-stage SaaS. ~80% of the operational truth is captured.

---

## Gap analysis — what's missing for "doing this right"

### Engineering gaps (what this plan builds)

| # | Gap | Phase | Effort |
|---|---|---|---|
| G1 | **Manual wire recording UI** — for `manual_wire` agents, no way today to mark a `pending` payout as `paid` from the UI. SQL-only. | B | 1h |
| G2 | **Annual agent statement** — no per-agent year-end summary they can hand to their tax authority / source-of-funds bank. | B | 2h |
| G3 | **Period locking** — historical months can be silently edited. Auditors hate this. | B | 2h |
| G4 | **Reconciliation report** — Stripe says X collected, ledger has Y, Wallex received Z. Differences are invisible today. | B | 3h |
| G5 | **W-8BEN-E collection** — international contractor tax forms not collected at onboarding. Standard practice. | B | 2h |
| G6 | **Xero sync** — operational ledger doesn't push to statutory books. Accountant currently works from CSV exports. | C | 1d |
| G7 | **Bank statement matching** — Wallex deposits aren't matched against expected Stripe payouts. | C | 0.5d |

### Operational gaps (user action, can't be built)

| # | Gap | Phase | Owner |
|---|---|---|---|
| O1 | Xero account opened, plan paid, HK tenant created | A | Tredoux |
| O2 | Stripe → Xero integration connected | A | Tredoux (one click in Xero) |
| O3 | Wallex statements connected to Xero (CSV upload until direct feed) | A | Tredoux |
| O4 | HK accountant onboarded — works from Xero | A | Tredoux + accountant |
| O5 | HK audit relationship (annual) | A | Accountant identifies auditor |
| O6 | Trade declaration / company secretary (already in place via Richful) | ✅ Done | — |

### Compliance gaps

| # | Gap | Solution | Phase |
|---|---|---|---|
| C1 | No formal independent-contractor agreement with agents | One-page MSA template, signed via DocuSign-equivalent at code issuance | C+ |
| C2 | No record of agent tax residency declaration | W-8BEN-E (or jurisdiction equivalent) collected at onboarding | B |
| C3 | No record of source-of-funds for outbound wires (needed by receiving banks in restricted countries) | Annual statement (G2) doubles as this — explicitly mentions Montree Limited HK as paying entity, agent's services as source | B |
| C4 | HK profits tax — no formal computation yet | Xero generates this once 12 months of clean data exist | A + C |

---

## Phase A — Operational setup (USER ACTION)

This is the work that has to happen outside the codebase. Engineering can build sympathetically but the underlying setup must be done by Tredoux + accountant.

### A1. Open Xero account
- Xero HK pricing: ~HK$300–500/month for the "Growing" plan, which is what's needed for multi-currency + bank reconciliation
- Use Montree Limited's details (CR 80261361)
- Tenant currency: USD (because that's what most revenue + payouts are denominated in). HKD as secondary.
- Time: 30 min

### A2. Connect Stripe via Xero's built-in integration
- Xero has a native Stripe Connect app
- Connects with read-only Stripe API key
- Backdates all transactions to first charge
- Auto-syncs new charges, refunds, fees nightly
- Time: 15 min

### A3. Set up Wallex bank feed
- Xero supports direct bank feeds for some HK banks
- If Wallex isn't on the list, use the manual CSV upload (monthly is enough)
- Reconcile each Wallex deposit against expected Stripe payout amounts
- Time: 15 min initial + 5 min/month ongoing

### A4. Hire HK accountant
- Budget: HK$2,000–5,000/month for monthly closes + annual filing
- Find: ask Statrys or Aspire for referrals (HK fintech banks have accountant networks)
- Or use accountants who specialise in HK SaaS — search Xero's "Find an Advisor" directory filtered to HK
- They should be Xero-certified
- Time: 1–2 weeks to find + onboard

### A5. Xero credentials → Railway env vars
- After A2 completes, generate API tokens for Phase C sync
- Vars to set: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID`, `XERO_REFRESH_TOKEN`
- Time: 30 min (generate OAuth tokens via Xero developer portal)

---

## Phase B — Montree internal engineering (THIS BUILD)

### B1. Manual wire recording UI (G1)

**Database:** No migration. `montree_agent_payouts` already supports `paid_by_method='manual_wire'` per migration 198.

**Backend:** `POST /api/montree/super-admin/payouts/[id]/record-wire`
- Validates payout is `pending` status + agent is `manual_wire` method
- Body: `{ wire_ref, paid_at, fx_rate_used?, payout_currency?, notes? }`
- Writes to `montree_agent_payouts`: `status='paid'`, `stripe_transfer_id=null`, `paid_at`, `paid_by_method='manual_wire'`, `fx_rate_used`, `payout_currency`, `notes`
- Mirrors the Stripe wire route: writes a `commission` row to `montree_finance_transactions` for audit
- Idempotent via `wire_ref` as `source_ref`
- Audit-logged via `logAgentAudit`

**Frontend:** MoneyTab payouts list — alongside the existing ⚡ "Wire" button (Stripe Connect agents), a new ⚡ "Record manual wire" button shows on `manual_wire` agents. Click opens a modal with the form. Same row flips to `paid` on success.

### B2. Annual agent statement (G2)

**Database:** No migration.

**Backend:** `GET /api/montree/super-admin/agents/[id]/annual-statement?year=YYYY&format=csv|html`
- Auth: super-admin only
- Sums `montree_agent_payouts` rows where `agent_id=id AND paid_at >= year-01-01 AND paid_at < year+1-01-01 AND status='paid'`
- Per-row output: paid date, school name, period, gross, net, share %, payout USD, payout local currency + amount, FX rate, wire ref, method
- Summary: total paid, total payouts, period coverage
- Header: Montree Limited HK corporate details (CR 80261361, registered address)
- Footer: agent's name + payout_method
- Plain HTML for printable PDF (browser Print → Save as PDF) + CSV variant

**Frontend:** Super-admin Referrals tab — new 📄 button per agent row that opens the statement in a new window. Year selector defaults to current year.

### B3. Period locking (G3)

**Database:** Migration 206 — new `montree_period_locks` table.
```sql
CREATE TABLE montree_period_locks (
  period_month TEXT PRIMARY KEY CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by TEXT NOT NULL DEFAULT 'super_admin',
  notes TEXT
);
```

**Backend:**
- New helper `lib/montree/finance/period-lock.ts` exporting `isPeriodClosed(supabase, period_month)` and `assertPeriodOpen(supabase, period_month)` (throws on closed).
- `POST /api/montree/super-admin/finance/close-period` — closes a period (super-admin only).
- `POST /api/montree/super-admin/finance/reopen-period` — reopens (with audit + notes).
- Wire `assertPeriodOpen()` into mutation routes: `montree_finance_transactions` POST/DELETE, `montree_agent_payouts` calc + wire + record-wire routes.

**Frontend:** MoneyTab header — new "Close month" button next to period selector. Confirm dialog. Visual indicator (🔒) on closed months. Closed-month write attempts surface friendly error: "Period 2026-04 is closed. Reopen it first if you really need to edit."

### B4. Reconciliation report (G4)

**Database:** No new tables. Reads from `montree_finance_transactions` + Stripe webhooks already captured.

**Backend:** `GET /api/montree/super-admin/finance/reconciliation?period_month=YYYY-MM`
- Stripe-side: sum of `montree_finance_transactions` rows with `source='stripe_webhook'` for the period, grouped by category (subscription_revenue, stripe_fee, refund)
- Internal-side: sum from `montree_billing_history` for cross-check
- Wallex-side: if user has uploaded a Wallex statement CSV for the period, sum incoming wires. If not, prompt "Upload Wallex CSV for full reconciliation."
- Diff per dimension: Stripe collected $X, ledger has $Y, Wallex received $Z. Flag any |diff| > $1.

**Frontend:** MoneyTab — new "🧮 Reconciliation" sub-tab. Period picker + side-by-side numbers + diff column. CSV upload for Wallex statement. Stored at `montree_storage` bucket `bank-statements` (super-admin-only).

### B5. W-8BEN-E collection (G5)

**Database:** Migration 207 — add columns to `montree_teachers`.
```sql
ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS tax_form_url TEXT,
  ADD COLUMN IF NOT EXISTS tax_form_type TEXT,  -- 'w8ben_e' | 'w8ben' | 'jurisdiction_other'
  ADD COLUMN IF NOT EXISTS tax_form_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tax_residency_country TEXT,
  ADD COLUMN IF NOT EXISTS is_us_person BOOLEAN;
```

**Backend:**
- Agent side: `POST /api/montree/agent/tax-form` — accepts a signed PDF upload, stores in Supabase Storage `tax-forms` bucket scoped per agent
- Super-admin: GET endpoint returns presigned URL for download
- Application form (`/become-an-agent`) — adds a "Tax residency" question + "I am NOT a US person for tax purposes" checkbox. Captured in `application_details.tax_residency` for handoff to agent's row at code issuance.

**Frontend:** Agent dashboard new `/agent/tax` page — upload W-8BEN-E PDF, see status. Super-admin Agents row gets a 📄 chip showing tax-form status (✓ on file / ⚠ missing).

### B6. CLAUDE.md architectural rules — locked in this build

| # | Rule |
|---|---|
| 62 | **Period-locked months are immutable**. `assertPeriodOpen()` gates every mutation to finance_transactions + agent_payouts. Reopening a month requires explicit super-admin action with notes captured to audit. |
| 63 | **Every paid agent payout writes a commission row to `montree_finance_transactions`**, regardless of payout method. Stripe Connect wires AND manual wires use the same `(source='payout', source_ref=payout.id)` pattern — idempotent across retries. |
| 64 | **Annual agent statements are sourced from `montree_agent_payouts` where status='paid'**. Not from finance_transactions. The payout table is the canonical "what we paid this agent" record. |
| 65 | **Reconciliation is a multi-source diff**, not a single source of truth. Stripe webhooks + ledger + bank statements must agree within $1 — anything more is a finding to investigate. |
| 66 | **W-8BEN-E (or jurisdiction equivalent) collected at agent onboarding**. No mandatory blocking — agent can sign later — but their first payout is held if form is missing. |
| 67 | **Manual wire records use the wire ref as `source_ref`** for idempotency. Re-recording the same wire ref UPDATEs the existing payout, doesn't create a duplicate. |

---

## Phase C — Xero integration (THIS BUILD — scaffold)

### C1. Xero OAuth + token storage

**Env vars** (set in Railway after A1 completes):
- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`
- `XERO_TENANT_ID` — the HK org's Xero tenant
- `XERO_REFRESH_TOKEN` — long-lived token, used to mint fresh access tokens

**Library:** `lib/montree/xero/client.ts` — wraps the official `xero-node` SDK. Handles token refresh, idempotency, retry on 429.

### C2. Sync log table

Migration 208:
```sql
CREATE TABLE montree_xero_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_tx_id UUID REFERENCES montree_finance_transactions(id) ON DELETE SET NULL,
  xero_object_type TEXT,  -- 'Invoice' | 'BankTransaction' | 'Journal'
  xero_object_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,  -- 'success' | 'failed' | 'skipped'
  error TEXT,
  attempt INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX idx_xero_sync_log_unique
  ON montree_xero_sync_log(finance_tx_id, xero_object_type)
  WHERE status = 'success';
```

The unique index makes the sync idempotent — re-running won't duplicate-create Xero objects.

### C3. Sync script

`scripts/sync-to-xero.mjs`:
1. Read `montree_finance_transactions` rows since `max(synced_at)` in log
2. Per row, decide Xero shape:
   - `type='income'` → Xero Invoice (paid, line item for the school subscription)
   - `type='direct_cost'`, category `stripe_fee` → Bank transaction debit
   - `type='direct_cost'`, category `api_anthropic` / `api_openai` → Bill from vendor
   - `type='commission'` → Bill from agent (or bank transaction if already paid)
   - `type='op_expense'` → Bill from vendor
   - `type='fx_adjustment'` → Manual journal entry
3. POST to Xero API
4. Log result in `montree_xero_sync_log`
5. Idempotent — if a row already has a successful sync log for this Xero object type, skip.

Triggered:
- Daily Railway cron at 02:00 UTC
- Super-admin "Sync now" button on Health tab

### C4. Health tab card

New "Xero sync" card on the Health tab:
- Last successful sync time
- Rows synced in last 7d
- Failed rows count (link to retry)
- Manual "Sync now" trigger

---

## Architectural rules locked across Phase B + C

**Single source of operational truth:** `montree_finance_transactions`. Real-time, integrated with product. Every webhook, every calculator run, every manual entry writes here first.

**Single source of statutory truth:** Xero (once Phase A completes). Read-only mirror of finance_transactions, with proper double-entry accounting, multi-currency revaluation, audit trail.

**Sync direction:** Montree → Xero, one-way. Xero never writes back to Montree. The accountant's adjusting entries stay in Xero only and are visible in the annual statutory accounts; the operational books in Montree stay simple.

**Reconciliation cadence:**
- Real-time: Stripe webhooks → finance_transactions (already shipped)
- Daily: finance_transactions → Xero (Phase C)
- Daily: Wallex deposits → bank reconciliation queue (manual reconcile)
- Monthly: month-end close — accountant signs off Xero, super-admin closes the period in Montree (B3)
- Annual: HK profits tax filing — accountant works from Xero, exports the statutory accounts

---

## Sequencing — what ships in this session

| Order | Task | Effort | Why this order |
|---|---|---|---|
| 1 | Handoff doc (THIS DOC) | ~30m | Anchor the architecture before writing code |
| 2 | B1 Manual wire UI | ~1h | **Unblocks Bayan's first commission** |
| 3 | B2 Annual statement | ~2h | Tax compliance + bank source-of-funds documentation |
| 4 | B3 Period locking | ~2h | Auditor-friendly immutability for closed months |
| 5 | B4 Reconciliation report | ~2h | Catches silent FX/fee drift |
| 6 | B5 W-8BEN scaffold | ~2h | International contractor compliance |
| 7 | C1+C2+C3 Xero sync (scaffold, inactive without creds) | ~3h | Ready to activate the moment Xero account exists |
| 8 | C4 Health card | ~30m | Visibility into the sync state |

Each lands as a separate commit so Railway deploys incrementally and rollback is granular.

---

## Open questions for Tredoux (decide as you go)

1. **Xero pricing tier:** Growing ($) or Established ($$$)? Growing is fine until ~50 schools on the platform.
2. **Multi-currency primary:** USD or HKD as base? Recommend **USD** since most revenue + most agent payouts are USD-denominated.
3. **Statement frequency:** annual is standard, but some agents may want quarterly. Recommend **annual** for v1, add quarterly if requested.
4. **W-8BEN-E mandate timing:** required before first payout, or required before code issuance? Recommend **before first payout** — don't block initial code generation.
5. **Period close cadence:** monthly (recommended) or quarterly? Monthly forces you to actually look at the books every 30 days.
6. **Accountant scope:** monthly close + annual filing only, or also AR/AP management, payroll, tax planning? Start narrow (close + filing), expand if value justifies.

---

## What this plan does NOT cover

- **Bank account opening for non-Stripe inbound rails.** If you want to accept wire transfers from non-card payers, that's a separate Wallex/Statrys/Aspire account setup conversation.
- **VAT/GST registration in agent countries.** If an agent provides "marketing services" to Montree HK from a VAT country (UK / EU / AU), they may need to issue VAT-inclusive invoices. Their concern, not yours, but worth flagging in the agent handbook.
- **Stripe Atlas for agents who want to receive payments via a US LLC.** Heavy lift; only justifies if agent is high-volume ($10k+/yr). Mention in handbook, don't build infra.
- **Cryptocurrency payouts (USDC for restricted-country agents).** Real demand exists but legal grey area. Defer.
- **Year-end agent emails with statement attached.** Phase D — once 12 months of clean data exist.

---

## Build progress (updated as work lands)

(Filled in as commits happen. See git log for canonical truth.)

- [x] Handoff written
- [ ] B1 Manual wire UI + API
- [ ] B2 Annual agent statement
- [ ] B3 Period locking + migration 206
- [ ] B4 Reconciliation report
- [ ] B5 W-8BEN scaffold + migration 207
- [ ] C1+C2+C3 Xero sync scaffold + migration 208
- [ ] C4 Health tab Xero card

Each phase audited 3× (build → audit → fix → audit clean → commit → push).
