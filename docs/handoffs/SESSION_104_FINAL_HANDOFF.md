# Session 104 Final Handoff — May 11, 2026

**Tagline:** Auto-run marathon. Phase 5 (payout calculator) + Phase 6 (Money tab) shipped — real money infrastructure complete. Plus parent invite system, agent → principal messaging, super-admin agent code visibility, Tier 0 perf items, lint backlog cleanup. Three audit-fix cycles ending clean. Six commits on origin/main.

---

## What's live on `origin/main`

| Commit | What |
|--------|------|
| `91be3908` | Session 104a: parent invites + agent messaging + Gloria/HK docs + feature toggle spacing |
| `19c1d04c` | Super-admin Schools: agent referral code chip on school row (with revenue share %) |
| `f9f23e99` | Phase 5 + Phase 6: payout calculator + Money tab UI |
| `[pending]` | Tier 0.14 warm route + EXPLAIN audit doc + DashboardHeader lint cleanup |

---

## 🚨 Migrations — Supabase SQL Editor

| # | File | Status |
|---|------|--------|
| 196 | `migrations/196_perf_vitals.sql` (Session 103) | ✅ **RUN** — user confirmed 8 rows in `montree_perf_vitals` |
| 197 | `migrations/197_agent_messaging.sql` | ✅ **RUN** — confirmed smooth |
| 198 | `migrations/198_agent_payouts.sql` | ⏳ **PENDING** — required for Money tab |

**SQL for 198 is in the inline chat history.** Re-paste below if needed:

```sql
-- Migration 198 — Phase 5 Payout calculator
CREATE TABLE IF NOT EXISTS montree_agent_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE RESTRICT,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE RESTRICT,
  period_month TEXT NOT NULL CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  gross_revenue_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  stripe_fee_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  anthropic_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  openai_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  other_direct_cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  net_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  revenue_share_pct NUMERIC(5,2) NOT NULL CHECK (revenue_share_pct >= 0 AND revenue_share_pct <= 100),
  payout_usd NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (payout_usd >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed')),
  stripe_transfer_id TEXT,
  paid_at TIMESTAMPTZ,
  paid_by_method TEXT CHECK (paid_by_method IN ('stripe_connect', 'manual_wire', 'other') OR paid_by_method IS NULL),
  fx_rate_used NUMERIC(12,6),
  payout_currency TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_tx_count INTEGER NOT NULL DEFAULT 0,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_payouts_unique ON montree_agent_payouts(agent_id, school_id, period_month);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_agent ON montree_agent_payouts(agent_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_school ON montree_agent_payouts(school_id, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_pending ON montree_agent_payouts(status, period_month DESC) WHERE status = 'pending';
CREATE OR REPLACE FUNCTION montree_agent_payouts_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_agent_payouts_updated_at ON montree_agent_payouts;
CREATE TRIGGER trg_agent_payouts_updated_at BEFORE UPDATE ON montree_agent_payouts
  FOR EACH ROW EXECUTE FUNCTION montree_agent_payouts_set_updated_at();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_finance_tx_agent_payout') THEN
    ALTER TABLE montree_finance_transactions ADD CONSTRAINT fk_finance_tx_agent_payout
      FOREIGN KEY (agent_payout_id) REFERENCES montree_agent_payouts(id) ON DELETE SET NULL;
  END IF;
END $$;
```

---

## 🚨 Other Tredoux actions (still pending)

1. **Enable Stripe Connect** on the platform account → https://dashboard.stripe.com/connect. Required before Gloria's `💳 Generate onboarding link` works.
2. **Send Gloria** the onboarding link (after Connect is on) + `docs/agents/GLORIA_STRIPE_ONBOARDING.md`.
3. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`. Wait for replies to the 8 numbered questions; the answers shape Phase 6's category map.
4. **Optional**: pin Railway region to Singapore/HK (dashboard config, ~5 min).
5. **Optional**: set up cron to ping `/api/warm` after each Railway deploy (eliminates cold-start penalty on first real user request).
6. **Optional**: run `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql` in Supabase SQL Editor to baseline 8 hot queries' execution plans.

---

## End-to-end test plan once migration 198 lands

### Money tab walkthrough

1. Log into super-admin, click 💰 **Money** tab (new — between 🤝 Agents and other tabs).
2. Period selector defaults to current month. Empty state if no calc has run.
3. Click **⚙️ Calculate now** — fires `/api/montree/super-admin/payouts/calculate`. The route first aggregates `montree_api_usage` into finance_transactions (Anthropic + OpenAI per school per month), then runs the calculator.
4. Period totals header populates: Total / Pending / Paid / Cancelled / Failed.
5. Per-school card shows full math: Gross / Stripe fee / Anthropic / OpenAI / Other cost / Net. Right-side: payout in green.
6. Buttons on pending rows: **💸 Mark paid**, **✕ Cancel**, **✏️ Override**, **⚠ Mark failed**.

### Mark paid flow

1. Click 💸 Mark paid on Gloria's row.
2. Inline panel: pick method (Stripe Connect / Manual wire / Other), paste `stripe_transfer_id` (optional), click ✓ Confirm paid.
3. Row chrome flips to emerald, status badge says PAID, payout date + transfer ID render below the math.
4. Re-clicking Calculate now should NOT touch this row (server enforces immutability + calculator skips).

### Override flow

1. Click ✏️ Override on a pending row.
2. Enter new payout USD (e.g., $50).
3. Optional override note.
4. Click ✓ Save override → row gets purple `OVERRIDE` chip + `↩️ Clear override` button.
5. Re-running Calculate now skips this row (`skipped_override`).
6. Click Clear override → row goes back to recalc-eligible.

### Race-safety verification

- Two browser tabs both click Calculate now within a second.
- Both should succeed without `result.errors`. One does the INSERT, the other 23505-falls-back to UPDATE.
- Period totals end up consistent.

---

## Architectural rules locked in this session

1. **Phase 5 calculator is idempotent.** UPSERT keyed on `(agent_id, school_id, period_month)`. Replays don't double-pay. Race-safe via 23505 fallback path that re-checks paid/override locks before overwriting.

2. **API usage aggregator must run BEFORE the calculator.** Without it, `anthropic_cost_usd` and `openai_cost_usd` would be $0 (raw rows live in `montree_api_usage`, not in the ledger). The `/calculate` route fires the aggregator first as Step 1, calculator as Step 2.

3. **Paid rows are immutable history.** Server-side: every PATCH action except `mark_paid` rejects with 409 on paid rows. Calculator-side: `skipped_paid` action, no write.

4. **Manual overrides lock against future recalcs.** `is_manual_override=true` rows are `skipped_override` until cleared. Race-safe path also honors this on UNIQUE conflict fallback.

5. **Negative net → $0 payout. Never clawback.** `Math.max(0, net * pct / 100)` in calculator. CHECK constraint `payout_usd >= 0` enforces at the DB layer too.

6. **revenue_share_pct is locked at calc time.** Stored on each payout row. Future % changes in `montree_referral_codes` don't retroactively alter past months.

7. **Agent code on school row sorted FIRST** in `login_codes_labelled` (rank 0). Amber chip chrome distinguishes it from principal (rank 1) and teachers (ranks 2-4).

8. **Money tab is super-admin-only.** Authed via JWT token + `x-super-admin-token` header. Cron job authed via `x-cron-secret` env var.

9. **`/api/warm` is auth-gated in production** (CRON_SECRET required). Dev allows unauthenticated for local testing.

10. **Calculator's USD-only assumption is correct today** — Anthropic + OpenAI bill in USD; Stripe lands USD; commission payouts can be FX'd at wire time. If a future API bills in a non-USD currency, the aggregator's hardcoded `original_currency: 'USD'` needs to change.

---

## Files shipped this session

### New (created)

- `migrations/197_agent_messaging.sql`
- `migrations/198_agent_payouts.sql`
- `lib/montree/payouts/calculator.ts`
- `lib/montree/payouts/api-usage-aggregator.ts`
- `lib/montree/agent-messaging/types.ts`
- `lib/montree/agent-messaging/access.ts`
- `app/api/montree/super-admin/payouts/calculate/route.ts`
- `app/api/montree/super-admin/payouts/route.ts`
- `app/api/montree/admin/parent-codes/route.ts`
- `app/api/montree/admin/parent-codes/generate-all/route.ts`
- `app/api/montree/dashboard/parent-codes/route.ts`
- `app/api/montree/agent/messages/threads/route.ts`
- `app/api/montree/agent/messages/threads/[threadId]/route.ts`
- `app/api/montree/agent/messages/threads/[threadId]/messages/route.ts`
- `app/api/montree/agent/messages/recipients/route.ts`
- `app/api/warm/route.ts`
- `app/montree/dashboard/parent-codes/page.tsx`
- `app/montree/agent/messages/page.tsx`
- `app/montree/agent/messages/[threadId]/page.tsx`
- `components/montree/super-admin/MoneyTab.tsx`
- `docs/agents/GLORIA_STRIPE_ONBOARDING.md`
- `docs/agents/AGENT_DEDUCTION_EXPLAINER.md`
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
- `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql`
- `docs/handoffs/SESSION_104_HANDOFF.md`
- `docs/handoffs/SESSION_104_FINAL_HANDOFF.md` (this file)

### Modified

- `lib/montree/messaging/types.ts` — added 'agent' to ParticipantRole, 'agent_principal' to ThreadType
- `lib/montree/messaging/thread-resolver.ts` — createdBy.role widened to ParticipantRole
- `app/api/montree/super-admin/schools/route.ts` — pulls agent referral codes, includes in `login_codes_labelled`
- `app/montree/super-admin/page.tsx` — Money tab wired
- `components/montree/super-admin/SchoolsTab.tsx` — agent chip rendering
- `components/montree/super-admin/SchoolFeaturesModal.tsx` — spacing pass
- `components/montree/super-admin/types.ts` — School.login_codes_labelled extended with `role: 'agent'` + `pct?`
- `components/montree/DashboardHeader.tsx` — Parent codes menu entry + KeyRound icon + pre-existing lint cleanup (Bell unused, useCallback deps, img comment)
- `components/montree/agent/AgentNav.tsx` — Messages link

---

## What's NOT shipped (deferred carry-over backlog)

1. **i18n keys for parent-codes + agent messaging UI.** Both currently English-only. Adding 30+ keys × 12 locales is its own focused session (~$5 Haiku batch). Mark as Session 105 work.

2. **The actual Stripe Connect wire-out automation.** Phase 5 produces `pending` payout rows; the human-in-the-loop super-admin marks them `paid` after firing the Stripe transfer manually. Future work: a `POST /api/montree/super-admin/payouts/[id]/wire` endpoint that calls `stripe.transfers.create(...)` to the agent's Stripe Connect account and auto-flips status to paid + populates transfer ID.

3. **Operating expenses + FX adjustments UI.** Phase 6 Money tab only shows the Payouts view. A full P&L view would also show:
   - `op_expense` rows (hosting, tooling, marketing)
   - `commission` rows (what was actually paid out)
   - Period summary: Revenue − Direct costs − Commissions − Op expenses = Margin
   This is essentially "Phase 7" and the HK accountant's answers will shape it.

4. **Exports.** No CSV/PDF/JSON export buttons yet. The HK accountant doc lists what should be in each. Build after their reply.

5. **Cron-based monthly auto-calc.** Currently the super-admin clicks "Calculate now". Once the calc is trusted, set up a Railway cron to fire `/api/montree/super-admin/payouts/calculate` on the 1st of each month with `x-cron-secret`.

6. **Print stylesheet refinement on parent-codes.** Currently minimal — works but could be prettier.

7. **DashboardHeader pre-existing warnings:** All three closed this session ✅.

---

## Audit-fix cycle summary

| Round | Type | Findings | Status |
|-------|------|----------|--------|
| Session 104a Round 1 | Self-audit | ThreadType/ParticipantRole missing 'agent' — unsafe `as` casts | Fixed |
| Session 104a Round 2 | Lint + tsc | Clean | — |
| Session 104a Round 3 | Semantic re-review | Clean | — |
| Phase 5+6 Round 1 | Semantic | AI costs would always be $0 without aggregator | Fixed (built api-usage-aggregator.ts) |
| Phase 5+6 Round 2 | Independent fresh-eye | 2 CRITICAL race conditions + 2 HIGH immutability gaps + UI bug | Fixed (4 fixes) |
| Phase 5+6 Round 3 | Verify fixes | Clean | — |

---

## What unlocked tonight

- **Real money flows are now codified.** Phase 5 + 6 means: subscription comes in → AI cost auto-aggregated → net computed → agent share calculated → super-admin clicks "Mark paid" → status flips with audit trail. Gloria's 50% can actually be paid as soon as: (a) migration 198 runs, (b) Stripe Connect is enabled, (c) Gloria onboards.
- **Super-admin can see at a glance** who founded each school (chip on row) without leaving the Schools tab.
- **Parents can be invited end-to-end** — teacher creates code → emails or copies → parent redeems at montree.xyz/montree/parent. Principal sees school-wide via existing page (now backed by working API).
- **Agents can message principals** without leaving the agent dashboard — channel separate from teacher/parent threads so the principal can distinguish.

---

**Pick up Session 105 with migration 198 + Stripe Connect enablement. Everything else is documented above with exact next steps.**
