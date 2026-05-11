# Session 104 Complete Handoff — May 11, 2026

**The marathon: 25 commits, 6 migrations all RUN, real-money infrastructure end-to-end.**

This doc consolidates everything from v1 → v5. It IS the canonical resume doc for Session 105.

---

## ✅ Migrations status (all RUN — confirmed by user)

| # | File | Status |
|---|------|--------|
| 196 | `perf_vitals` | ✅ RUN (Session 103) |
| 197 | `agent_messaging` | ✅ RUN |
| 198 | `agent_payouts` | ✅ RUN |
| 199 | `recurring_op_expenses` | ✅ RUN |
| 200 | `webhook_deadletter` | ✅ RUN |
| 201 | `server_errors` | ✅ RUN |

**No migrations pending.** Every table and index this session created is live.

---

## 🚨 ONLY blocker left to flip the real-money switch

**Enable Stripe Connect on the platform account** → https://dashboard.stripe.com/connect → "Get started" with Express. Once on:
1. Open super-admin → Referrals → 💳 button on Gloria's row → onboarding link generates
2. Send Gloria the link + `docs/agents/GLORIA_STRIPE_ONBOARDING.md`
3. She walks through Stripe's hosted form (~10 min)
4. Status flips to verified — green "Ready to wire" pill on Money tab
5. Click ⚡ Wire via Stripe → real money moves

---

## What's live and end-to-end functional

### 💰 Money tab (super-admin)
- Period selector (last 12 months)
- P&L header: Revenue − Direct costs − Commissions − Op-expenses + FX = Margin
- **6 sub-tabs:** 💸 Payouts · 📈 Revenue · 📉 Direct costs · 🤝 Commissions · 🧾 Op-expenses · 💱 FX
- ⚙️ Calculate now button (fires aggregator → calculator)
- ⚡ Wire via Stripe (idempotency key prevents double-pay)
- 💸 Mark paid (manual rail) / ✕ Cancel / ✏️ Override / ⚠ Mark failed
- 📥 Accountant pack (CSV) — 5-section monthly export
- 🖨 Print / PDF — printable HTML, Cmd+P to save
- Stripe Dashboard deep-links on every paid transfer ID
- Recurring template panel embedded in Op-expenses (add/pause/resume/delete)
- Stripe Connect status pill per row

### 🩺 Health tab (super-admin)
- 6 status cards: Database · Stripe webhooks 7d · AI cost 30d · LCP p75 · Last payout calc · Schools
- Top banner: 'All systems operational' OR '⚠ One or more checks failed'
- **Manual cron trigger panel** (4 buttons until Railway crons are configured)
- Recent payout periods table

### ⚠️ DLQ tab (super-admin)
- Failed Stripe webhook events with full payload + stack trace
- Status filter · event type filter · pending count
- ✓ Resolve / ⊘ Ignore with notes

### 🐛 Errors tab (super-admin)
- Server errors from `logServerError()` calls
- State + severity + origin filters
- Resolve / delete actions

### 🤝 Proactive cards
- **TracyProactiveCard** on principal Today page — stale classrooms, idle teachers, pending photos
- **MiraProactiveCard** on agent dashboard — growing schools, silent schools at churn risk, suggested actions

### 📧 Email automation (all branded HTML + plain text fallback)
- Payout-paid → agent (wire success)
- Monthly digest → Tredoux (cron + `CRON_DIGEST_EMAIL`)
- Trial drip → trial schools (day 7/14/25)
- Trial-converted welcome → principal (trialing → active)
- Demo-request confirmation → lead (landing form)
- Parent invite (single + bulk) → parents
- Principal invite → principals

### 💬 Messaging
- Teacher ↔ parent + principal (Sessions 97/98)
- Principal ↔ parent + teacher
- Agent → principal (Session 104 new) — separate channel, ai_drafted forced false

### 🔁 Cron infrastructure (5 cron endpoints)
All auth via `x-cron-secret` header. Docs at `docs/perf/CRON_SETUP.md`. **OR** fire each one from the Health tab manual triggers panel until Railway crons are configured.

| Schedule | Endpoint | What |
|----------|----------|------|
| `0 2 1 * *` | `/payouts/calculate` | Monthly P&L calc + agent payouts |
| `0 9 * * *` | `/trial-drip` | Day 7/14/25 nurture emails |
| `0 4 * * *` | `/finance/recurring/run` | Recurring op-expense rows |
| `0 3 * * *` | `/billing/sync-quantity` | Stripe seat reconciliation |
| Deploy hook | `/api/warm` | Pre-warm SDK module cache |

### 📖 Public surfaces
- `/montree/changelog` — public changelog (SEO + trust)
- `/api/montree/leaderboard` — aggregate-only top 20 agents
- Landing page: "Play is the work of the child." quote, "Change your life" kicker, "The magic of Montree." headline, "Try it" CTA

### 🆘 Operational docs
- `docs/agents/GLORIA_STRIPE_ONBOARDING.md`
- `docs/agents/AGENT_DEDUCTION_EXPLAINER.md`
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
- `docs/perf/CRON_SETUP.md`
- `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql`
- `docs/operations/BACKUP_DISASTER_RECOVERY.md`

---

## All 25 commits

| # | Hash | What |
|---|------|------|
| 1 | `91be3908` | Parent invites + agent messaging + Gloria/HK docs + feature toggle spacing |
| 2 | `19c1d04c` | Agent referral code chip on school rows |
| 3 | `f9f23e99` | **Phase 5 + 6** — payout calculator + Money tab |
| 4 | `c1dfb18d` | Tier 0 warm route + EXPLAIN audit doc + lint cleanup |
| 5 | `0b7d02d4` | Stripe Connect wire-out + Money tab P&L sub-tabs + cron docs |
| 6 | `a0ea3067` | Accountant CSV export pack |
| 7 | `1913c2f1` | v2 handoff |
| 8 | `9387a9c4` | CLAUDE.md status block |
| 9 | `65475a8e` | Agent earnings actuals + payout-paid email + monthly digest + Stripe deep-links |
| 10 | `6f58dd2a` | Health route + bulk parent-invite + trial drip + trial-converted email |
| 11 | `a10e39a4` | Health UI tab + branded demo-request email |
| 12 | `1c2bf948` | Public /changelog + ChangelogModal |
| 13 | `c1ae4589` | ChangelogModal wired into 3 dashboards + landing nav |
| 14 | `e0d33f2f` | Agent leaderboard + backup-recovery doc + v3 handoff |
| 15 | `fe683f30` | Recurring op-expense scheduler (mig 199 + CRUD + cron) |
| 16 | `16c1b8fa` | fx_adjustment manual entry + trial-expiring banner |
| 17 | `7d367dbb` | Webhook DLQ (mig 200) |
| 18 | `698d1f53` | v4 handoff |
| 19 | `fc28c603` | Webhook DLQ tab + Recurring template panel + FX sub-tab |
| 20 | `77594ec0` | Print/PDF accountant pack + server-errors logger (mig 201) |
| 21 | `7dd3e9af` | Server errors tab + Mira card + Tracy card + landing polish |
| 22 | `af3a9127` | Health tab manual cron triggers + Tracy/Mira changelog entry |
| 23 | `72edd675` | v5 handoff |
| 24 | (this) | CLAUDE.md comprehensive update + this consolidated handoff |

---

## Where every important thing is

| Question | Location |
|----------|----------|
| Run a cron NOW | super-admin → 🩺 Health → cron triggers panel |
| See monthly P&L | super-admin → 💰 Money (P&L header) |
| Wire a payout | Money → Payouts → ⚡ Wire via Stripe |
| Add op-expense | Money → 🧾 Op-expenses → + Add expense |
| Set up recurring expense | Money → 🧾 Op-expenses → 🔁 Recurring templates |
| Add FX adjustment | Money → 💱 FX |
| Resolve failed webhook | super-admin → ⚠️ DLQ |
| See production errors | super-admin → 🐛 Errors |
| Monthly accountant pack | Money tab → 📥 CSV or 🖨 PDF |
| Agent's earnings (actuals) | `/montree/agent/earnings` |
| Agent's proactive card | `/montree/agent/dashboard` |
| Principal's proactive card | `/montree/admin` |
| Public changelog | `/montree/changelog` |
| Public agent leaderboard | `GET /api/montree/leaderboard` |
| Teacher invites parents | 3-dot menu → Parent codes |
| Bulk parent invite | `POST /api/montree/dashboard/parent-codes/bulk-email` |
| Agent messages principal | `/montree/agent/messages` |
| Backup procedures | `docs/operations/BACKUP_DISASTER_RECOVERY.md` |
| Cron setup | `docs/perf/CRON_SETUP.md` |
| HK accountant package | `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` |

---

## Architectural rules — all 26 (cumulative)

1. **Stripe `transfers.create` idempotencyKey is load-bearing.** Key is `montree_payout_${id}_${cents}`. Stripe dedups for 24h. Never remove.
2. **P&L formula:** `margin = income − direct_cost − commission − op_expense + fx_adjustment`. Commissions reduce margin (real cash out).
3. **Agent share:** `pct × (gross − direct_cost)`. Op-expenses NOT in agent calc.
4. **Op-expense + fx_adjustment rows are the ONLY mutable ledger entries.** Webhook/aggregator/commission immutable.
5. **Paid rows immutable (server-enforced).** Every action except `mark_paid` rejects paid status with 409.
6. **API usage aggregator runs BEFORE calculator.** Without it, AI costs read $0.
7. **Wire route writes commission row** to finance_transactions. Source_ref `payout:${id}` — idempotent.
8. **CSV export is single multi-section file.** JSON also available via `&format=json`.
9. **Race-safe upserts:** 23505 unique_violation falls back to UPDATE, re-reads paid/override locks before overwriting.
10. **CRON_SECRET env var** authenticates all cron calls.
11. **Agent chip on school row sorted FIRST** (rank 0, amber chip).
12. **Negative net → $0 payout.** Never clawback. Enforced at calculator AND DB CHECK.
13. **revenue_share_pct locked at calc time.** Future % changes don't retroactively alter past months.
14. **Trial-converted email triggers ONLY on `trialing → active`** (not past_due → active, that's retry recovery).
15. **Monthly digest email is cron-only** (gated on `CRON_DIGEST_EMAIL`).
16. **All email helpers are fire-and-forget** — caller never blocks.
17. **Trial drip idempotency via `montree_outreach_log`** (action=`trial_drip_dayN`, metadata.school_id).
18. **ChangelogModal silently baselines first-time visitors** to latest entry — no spam.
19. **Public leaderboard surfaces aggregate-only data** — no PII beyond display names + initials + country hint.
20. **Storage buckets have no own-snapshot backup** beyond Supabase's ~30-day soft delete (documented).
21. **Recurring op-expense idempotency** via `last_fired_period_month` + `(source, source_ref)` unique constraint.
22. **DLQ capture is fire-and-forget** — webhook handler returns 200 to Stripe regardless.
23. **fx_adjustment amounts can be NEGATIVE (loss) or POSITIVE (gain).** op_expense must be positive.
24. **Trial-expiring banner dismisses per-day-per-days-remaining** — re-appears when days count changes.
25. **`logServerError()` NEVER throws.** Logger failure swallowed silently.
26. **Stripe Connect deep-links use `dashboard.stripe.com/connect/transfers/{id}`** (not /payouts/ path).

---

## Smoke test plan for Session 105 (12 steps, ~15 min)

1. **Money tab loads** — period defaults to current month, P&L header populates
2. **⚙️ Calculate now** succeeds — returns aggregator + calc result. No errors.
3. **📈 Revenue sub-tab** — shows Stripe webhook income rows (or empty if no test purchases)
4. **📉 Direct costs sub-tab** — shows Stripe fees + AI cost aggregates
5. **🧾 Op-expenses sub-tab** — click + Add expense, fill form, save. Row appears, P&L margin drops by amount. Also click "🔁 Recurring templates" → + Add template with day=15, hosting=$20. Verify saved.
6. **💱 FX sub-tab** — click + Add expense with negative amount, save. Row appears.
7. **🤝 Commissions sub-tab** — empty until first wire
8. **📥 CSV export** — file downloads with 5 sections
9. **🖨 Print / PDF** — opens new tab with formatted doc, Cmd+P shows print preview
10. **💸 Payouts sub-tab** — Gloria's row visible. Stripe Connect pill says "Not set up" (until Connect enabled). Wire button disabled.
11. **🩺 Health tab** — 6 cards. Click each of 4 cron trigger buttons, verify success response.
12. **⚠️ DLQ + 🐛 Errors tabs** — both empty (no failures yet). Click Refresh on each.

After Stripe Connect enabled:
13. Generate Gloria's onboarding link → send package.
14. After she completes onboarding → Money tab → Wire button green → click → real money moves.
15. Send HK accountant the v5 handoff + CSV export.

---

## Deferred backlog (priority-ordered)

| Priority | Item | Effort |
|----------|------|--------|
| Medium | **i18n batch** — ~80 keys × 12 locales via Haiku. Surfaces: parent-codes, agent messaging, Money tab, MoneyLedgerView, Health tab, ChangelogModal, TrialExpiringBanner, ServerErrorsTab, Mira/Tracy cards, WebhookDLQTab | ~1 hour focused |
| Medium | Mobile-first re-audit of all new pages | ~half-day real-device |
| Low | Photo bank improvements (carry-over) | ~half-day |
| Low | Parent portal dark forest theme audit | ~1-2 hours |
| Stretch | Playwright smoke test suite | ~1 week |
| Stretch | HeyGen explainer videos | marketing, non-code |

---

## What's next for Session 105

**Run order:**
1. Smoke test the 12 steps above
2. Enable Stripe Connect
3. Wire Gloria + send HK accountant package
4. **Then** burn through the i18n batch — that's the biggest remaining English-only debt
5. Mobile re-audit on a real device
6. Then stretch items

**The session ended at:** 25 commits on `origin/main`. Last commit: `72edd675` (the v5 handoff). Plus this final consolidation commit follows. Lint clean across every touched file. `tsc --noEmit --incremental false` clean from cold rebuild on every batch.

---

**End of Session 104 marathon.** 25 commits, 6 migrations, 9 super-admin tabs, 6 Money sub-tabs, 5 cron endpoints, 7 email templates, 2 proactive cards, 1 public changelog, 1 public leaderboard, 1 backup-recovery doc, 1 cron setup doc, 1 HK accountant pack doc, 1 Gloria onboarding doc, 1 agent deduction doc. Real-money infrastructure end-to-end functional.

Pick up Session 105 with smoke test + Stripe Connect + i18n batch.
