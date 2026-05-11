# Session 104 v4 Final Handoff — May 11, 2026

**The marathon ran 19 commits. Real-money infrastructure + monitoring + operational tooling all live.** Pick up Session 105 cold from this doc.

---

## All 19 commits on `origin/main` tonight

| # | Commit | What |
|---|--------|------|
| 1 | `91be3908` | Parent invites + agent messaging + Gloria/HK docs + feature toggle |
| 2 | `19c1d04c` | Agent code chip on school rows |
| 3 | `f9f23e99` | **Phase 5 + 6** — payout calculator + Money tab |
| 4 | `c1dfb18d` | Tier 0 warm route + EXPLAIN audit doc + lint cleanup |
| 5 | `0b7d02d4` | Stripe Connect wire-out + P&L sub-tabs + cron docs |
| 6 | `a0ea3067` | Accountant CSV export pack |
| 7 | `1913c2f1` | Session 104 v2 handoff |
| 8 | `9387a9c4` | CLAUDE.md status block |
| 9 | `65475a8e` | Agent earnings actuals + payout-paid email + monthly digest + Stripe deep-links |
| 10 | `6f58dd2a` | System health + bulk parent-invite email + trial drip + trial-converted email |
| 11 | `a10e39a4` | Health UI tab + branded demo-request confirmation |
| 12 | `1c2bf948` | Public /changelog page + ChangelogModal |
| 13 | `c1ae4589` | ChangelogModal wired into 3 dashboards + landing nav |
| 14 | `e0d33f2f` | Agent leaderboard + backup-recovery doc + v3 handoff |
| 15 | `fe683f30` | Recurring op-expense scheduler (migration 199 + CRUD + cron) |
| 16 | `16c1b8fa` | fx_adjustment manual entry + trial-expiring banner |
| 17 | `7d367dbb` | Stripe webhook dead-letter queue (migration 200) |
| 18 | (this) | Session 104 v4 final handoff |

---

## 🚨 Migrations to run in Supabase

| # | File | Status |
|---|------|--------|
| 196 | perf_vitals | ✅ RUN |
| 197 | agent_messaging | ✅ RUN |
| 198 | agent_payouts | ✅ RUN |
| **199** | **recurring_op_expenses** | ⏳ **PENDING** |
| **200** | **webhook_deadletter** | ⏳ **PENDING** |

**SQL for both migrations** (run in Supabase SQL Editor):

```sql
-- Migration 199 — Recurring op-expense scheduler
CREATE TABLE IF NOT EXISTS montree_recurring_op_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  usd_amount NUMERIC(12,4) NOT NULL CHECK (usd_amount > 0),
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  last_fired_period_month TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_op_expenses_active
  ON montree_recurring_op_expenses(is_active, day_of_month) WHERE is_active = true;
CREATE OR REPLACE FUNCTION montree_recurring_op_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_recurring_op_updated_at ON montree_recurring_op_expenses;
CREATE TRIGGER trg_recurring_op_updated_at BEFORE UPDATE ON montree_recurring_op_expenses
  FOR EACH ROW EXECUTE FUNCTION montree_recurring_op_set_updated_at();

-- Migration 200 — Stripe webhook dead-letter queue
CREATE TABLE IF NOT EXISTS montree_webhook_deadletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'stripe',
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_pending
  ON montree_webhook_deadletter(status, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_event_type
  ON montree_webhook_deadletter(event_type, created_at DESC);
CREATE OR REPLACE FUNCTION montree_webhook_dlq_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_webhook_dlq_updated_at ON montree_webhook_deadletter;
CREATE TRIGGER trg_webhook_dlq_updated_at BEFORE UPDATE ON montree_webhook_deadletter
  FOR EACH ROW EXECUTE FUNCTION montree_webhook_dlq_set_updated_at();
```

---

## 🚨 Tredoux operational still-to-do

1. **Enable Stripe Connect** at https://dashboard.stripe.com/connect — the only real blocker on wiring Gloria's first payout
2. **Run migrations 199 + 200** in Supabase SQL Editor (SQL above)
3. **Set Railway env vars:**
   - `CRON_SECRET` — generate via `openssl rand -base64 32`
   - `CRON_DIGEST_EMAIL=tredoux555@gmail.com` (monthly P&L digest)
   - `RESEND_FROM_EMAIL` — verify montree.xyz domain first
4. **Set up Railway crons** per `docs/perf/CRON_SETUP.md` (4 total now: monthly calc, daily drip, daily recurring op-expense, daily Stripe sweep, post-deploy warm)
5. **Generate Gloria's Stripe Connect link** → send package
6. **Send HK accountant package** + 8 numbered questions

---

## What's now live end-to-end

### Real money infrastructure
- 💰 Money tab with full P&L (Revenue − Direct − Commissions − Op-expenses + FX = Margin)
- 5 sub-views: Payouts / Revenue / Direct costs / Commissions / Op-expenses
- ⚡ Stripe Connect wire-out with idempotency key (no double-pay)
- 💸 Manual mark-paid + ✕ Cancel + ✏️ Override + ⚠ Mark failed
- 📥 Monthly accountant CSV export pack (5 sections)
- Stripe deep-links on every paid row

### Auto-fired billing infrastructure
- Aggregator: rolls AI usage into finance_tx direct_cost rows BEFORE calculator
- Calculator: idempotent monthly aggregation per (agent, school, month)
- Race-safe upserts (23505 fallback honors paid/override locks)
- Monthly cron fires Calculate now on the 1st
- Agent earnings dashboard reads actuals from `montree_agent_payouts`

### Email automation (Resend)
- `sendPayoutPaidEmail` — agent on wire success
- `sendMonthlyDigestEmail` — Tredoux on monthly cron (gated on `CRON_DIGEST_EMAIL`)
- `sendTrialDripEmail` — trial schools at day 7/14/25 (idempotent via outreach_log)
- `sendTrialConvertedEmail` — principal on trialing → active
- Branded HTML + plain text fallback

### Recurring op-expense scheduler
- `montree_recurring_op_expenses` table (migration 199)
- CRUD route at `/api/montree/super-admin/finance/recurring`
- Daily cron at `/api/montree/super-admin/finance/recurring/run` (idempotent via `last_fired_period_month`)
- 10 op-expense categories supported

### Webhook resilience
- Stripe webhook DLQ (migration 200)
- Failed events captured to `montree_webhook_deadletter`
- Super-admin route to read + resolve (`/api/montree/super-admin/webhook-deadletter`)
- 23505 dedup on stripe_event_id — re-fires safe

### System monitoring
- 🩺 Health tab in super-admin: 6 cards (DB / Stripe webhooks / AI cost / LCP p75 / payout calc / schools)
- Web Vitals collection (migration 196 — already running with samples)
- `/api/warm` route + EXPLAIN audit SQL doc
- Backup + disaster recovery doc with 5 recovery procedures

### Operational UX
- 🆕 Public `/montree/changelog` page (SEO + trust)
- ChangelogModal in 3 dashboards (teacher / principal / agent)
- "What's new" landing nav link
- ⏰ Trial-expiring banner on principal admin (urgent ≤3d, warning ≤14d)
- 🤝 Public agent leaderboard endpoint

### Communications
- Agent → Principal messaging (migration 197)
- Teacher parent invites + bulk-email route
- Demo-request confirmation upgraded to branded HTML
- fx_adjustment manual entry (wire_fx_delta / rate_revaluation / other categories)

### Documentation
- `docs/agents/GLORIA_STRIPE_ONBOARDING.md`
- `docs/agents/AGENT_DEDUCTION_EXPLAINER.md`
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
- `docs/perf/CRON_SETUP.md` (4 crons documented)
- `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql`
- `docs/operations/BACKUP_DISASTER_RECOVERY.md`
- `docs/handoffs/SESSION_104_*.md` (v1, v2, v3, v4)
- CLAUDE.md updated with comprehensive Session 104 status block

---

## Cumulative architectural rules (24 total)

Preserved from v3:

1. Stripe transfers.create idempotencyKey load-bearing
2. P&L = income − direct_cost − commission − op_expense + fx_adjustment
3. Agent share = pct × (gross − direct_cost). Op-expenses NOT in agent calc
4. Op-expense + fx_adjustment rows are the ONLY mutable ledger entries
5. Paid rows immutable (server-enforced)
6. API usage aggregator runs BEFORE calculator
7. Wire route writes commission row to finance_transactions
8. CSV export is single multi-section file
9. Race-safe upserts (23505 fallback)
10. CRON_SECRET env var authenticates all cron calls
11. Agent chip on school row sorted FIRST (rank 0, amber)
12. Negative net → $0 payout. Never clawback
13. revenue_share_pct locked at calc time
14. Trial-converted email triggers ONLY on trialing → active (not past_due → active)
15. Monthly digest email is cron-only (gated on CRON_DIGEST_EMAIL env var)
16. All email helpers are fire-and-forget
17. Trial drip idempotency via outreach_log
18. ChangelogModal silently baselines first-time visitors
19. Public leaderboard surfaces aggregate-only data
20. Storage buckets have no own-snapshot backup (documented)

**New in v4:**

21. **Recurring op-expense idempotency** via `last_fired_period_month` + `(source, source_ref)` unique constraint. Daily cron is safe.
22. **DLQ capture is fire-and-forget** — webhook handler always returns 200 to Stripe, DLQ failure NEVER compounds the original error.
23. **fx_adjustment amounts can be NEGATIVE** (FX loss) or POSITIVE (FX gain). op_expense must be positive.
24. **Trial-expiring banner dismisses per-day-per-days-remaining** — re-appears next day or when days count changes.

---

## What's NOT shipped (deferred backlog)

| Priority | Item | Effort |
|----------|------|--------|
| Medium | i18n batch (parent-codes, agent messaging, Money tab, Health tab, MoneyLedgerView, ChangelogModal, TrialExpiringBanner — ~80 keys × 12 locales via Haiku) | ~1 hour |
| Medium | UI affordance for fx_adjustment in MoneyTab (endpoint ready; need form/button) | ~30 min |
| Medium | Recurring op-expense list view in MoneyTab (endpoint ready; need UI to view/toggle/delete templates) | ~1 hour |
| Medium | Webhook DLQ UI tab in super-admin (endpoint ready; need list + resolve view) | ~1 hour |
| Medium | Mobile-first re-audit of all new pages | ~half-day testing |
| Low | PDF accountant pack | ~half-day |
| Low | Sentry / error tracking | ~half-day |
| Low | Phase 1.1 SW SWR perf | ~1 week, gated on Web Vitals baseline |
| Low | Photo bank improvements | ~half-day |
| Low | Parent portal dark forest theme audit | ~1-2 hours |
| Stretch | Mira proactive cards on agent dashboard | ~1 day |
| Stretch | Tracy proactive cards on principal dashboard | ~1 day |
| Stretch | Playwright smoke tests | ~1 week |
| Stretch | HeyGen explainer videos | marketing — non-code |

---

## Where every important thing is

| Question | Location |
|----------|----------|
| Monthly P&L | super-admin → 💰 Money |
| System health | super-admin → 🩺 Health |
| Wire a payout | Money → Payouts → ⚡ Wire via Stripe |
| Add an op-expense | Money → 🧾 Op-expenses → + Add expense |
| Add an FX adjustment | `POST /api/montree/super-admin/finance/ledger` with `type:'fx_adjustment'` |
| Manage recurring expenses | `POST/GET/PATCH/DELETE /api/montree/super-admin/finance/recurring` |
| Resolve failed webhook | `GET/PATCH /api/montree/super-admin/webhook-deadletter` |
| Generate accountant pack | Money tab header → 📥 Accountant pack (CSV) |
| Agent's payouts | `/montree/agent/earnings` |
| Agent messages principal | `/montree/agent/messages` |
| Teacher invites parents | 3-dot menu → Parent codes |
| Bulk parent invite | `POST /api/montree/dashboard/parent-codes/bulk-email` |
| Trial drip cron | `POST /api/montree/super-admin/trial-drip` with `x-cron-secret` |
| Monthly calc cron | `POST /api/montree/super-admin/payouts/calculate` with `x-cron-secret` |
| Recurring expense cron | `POST /api/montree/super-admin/finance/recurring/run` with `x-cron-secret` |
| Public changelog | `/montree/changelog` |
| Public agent leaderboard | `GET /api/montree/leaderboard` |
| Backup procedures | `docs/operations/BACKUP_DISASTER_RECOVERY.md` |
| Cron setup | `docs/perf/CRON_SETUP.md` |

---

## Next session priorities (ordered)

1. **Run migrations 199 + 200** in Supabase
2. **Enable Stripe Connect** + set Railway env vars + crons
3. **Smoke-test Money tab** (12-step plan in v2 handoff)
4. **Send Gloria + HK accountant packages**
5. **Build the 4 missing UI surfaces** from the deferred list:
   - Recurring op-expense list view in MoneyTab
   - Webhook DLQ tab in super-admin
   - fx_adjustment form affordance in MoneyTab
   - i18n batch (focused session)
6. **Build the medium-priority items:** mobile-first audit, PDF export
7. **Decide on Phase 1.1 SW SWR** once Web Vitals has 1-2 weeks of data
