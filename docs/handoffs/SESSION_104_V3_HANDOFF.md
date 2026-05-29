# Session 104 v3 Handoff — May 11, 2026

**Extended marathon. 13 commits on `origin/main`.** Picking up from the v2 handoff: built every "what's left to build" item except the items explicitly flagged as low-priority or deferred (i18n batch, PDF export, recurring op-expense schema, mobile-first re-audit, Sentry integration, Phase 1.1 SW SWR).

---

## Tonight's commits (chronological)

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
| 10 | `6f58dd2a` | System health route + bulk parent-invite email + trial drip campaign + trial-converted email |
| 11 | `a10e39a4` | Health UI tab + branded demo-request confirmation |
| 12 | `1c2bf948` | Public /changelog page + ChangelogModal component |
| 13 | `c1ae4589` | ChangelogModal wired into 3 dashboards + landing nav |
| 14 | `[pending]` | Agent leaderboard + backup-recovery doc + this handoff |

---

## What's now end-to-end functional

### 💰 Money tab (super-admin → 💰 Money)
- Period selector (last 12 months)
- P&L header: Revenue − Direct costs − Commissions − Op-expenses = Margin
- 5 sub-tabs: Payouts / Revenue / Direct costs / Commissions / Op-expenses
- ⚙️ Calculate now → aggregator + calculator runs
- ⚡ Wire via Stripe → real money movement with idempotency key
- 💸 Mark paid (manual rail) / ✕ Cancel / ✏️ Override / ⚠ Mark failed — all with paid-row immutability
- 📥 Accountant pack (CSV) — 5-section monthly export
- Stripe transfer ID deep-links to Stripe Dashboard
- Op-expenses sub-tab: 10-category add form + per-row delete (manual rows only)

### 🩺 Health tab (super-admin → 🩺 Health)
- 6 health cards: Database / Stripe webhooks 7d / AI cost 30d / LCP p75 / Last payout calc / Schools
- Status dots (green/amber/red/slate) per card
- Recent payout periods table
- 🔄 Run check button

### 💸 Payouts → Agent dashboard
- `/montree/agent/earnings` reads actuals from `montree_agent_payouts`
- Per-period breakdown: pending / paid / cancelled / failed
- Per-school full math
- Current month falls back to estimate when calculator hasn't run yet
- Email notification fires when payout transitions to paid

### 📧 Email automation (Resend)
- `sendPayoutPaidEmail` → agent receives transfer notification with Stripe ref
- `sendMonthlyDigestEmail` → Tredoux receives P&L digest after monthly cron
- `sendTrialDripEmail` → trial schools at day 7/14/25 (idempotent via outreach_log)
- `sendTrialConvertedEmail` → principal welcome when trial → active
- Branded HTML + plain text fallback on all templates

### 🤝 Agent → Principal messaging (`/montree/agent/messages`)
- Threads + replies, scoped to founded schools
- ai_drafted=false forced server-side
- Migration 197 widens CHECK constraints for 'agent' role

### 🔑 Teacher parent invites (`/montree/dashboard/parent-codes`)
- Per-classroom code management
- Generate / Copy / Email / Reset / Print
- Bulk email endpoint: 6-worker concurrent send with cross-pollination check

### 🆕 Changelog system
- `/montree/changelog` public page (dark forest aesthetic, SEO-friendly)
- In-app `ChangelogModal` wired into teacher / principal / agent dashboards
- Audience-scoped, localStorage-tracked first-time silently baselines
- Landing nav: "What's new" link

### 🏆 Public agent leaderboard (`/api/montree/leaderboard`)
- Top 20 agents by schools-referred + active-students
- No auth, no PII beyond display names + initials + country hint
- 5-min Cloudflare cache

### 🔄 Cron infrastructure (`docs/perf/CRON_SETUP.md`)
- Monthly payout calc (1st @ 02:00 UTC) — also fires digest email when CRON_DIGEST_EMAIL is set
- Daily trial drip (09:00 UTC) at day 7/14/25 of trial
- Daily Stripe quantity sweep (03:00 UTC)
- Post-deploy warm ping

### 🆘 Operational docs
- `docs/agents/GLORIA_STRIPE_ONBOARDING.md` — send to Gloria
- `docs/agents/AGENT_DEDUCTION_EXPLAINER.md` — any agent
- `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md` — accountant package
- `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql` — 8 hot queries
- `docs/perf/CRON_SETUP.md` — Railway cron config
- `docs/operations/BACKUP_DISASTER_RECOVERY.md` — restore procedures, monitoring

---

## 🚨 Migrations status

| # | File | Status |
|---|------|--------|
| 196 | perf_vitals | ✅ RUN |
| 197 | agent_messaging | ✅ RUN |
| 198 | agent_payouts | ✅ RUN |

**No pending migrations.**

---

## 🚨 Tredoux still-to-do (operational, not code)

1. **Enable Stripe Connect** at https://dashboard.stripe.com/connect — ONLY blocker before wiring first payout
2. **Set Railway env vars:**
   - `CRON_SECRET` — generate via `openssl rand -base64 32`
   - `CRON_DIGEST_EMAIL=tredoux555@gmail.com` (for monthly digest)
   - `RESEND_FROM_EMAIL` — verify montree.xyz domain in Resend first
3. **Set up Railway crons** per `docs/perf/CRON_SETUP.md`
4. **Generate Gloria's Stripe Connect link** (super-admin Referrals → 💳)
5. **Send packages:** Gloria + HK accountant
6. **Pin Railway region** to Singapore/HK (optional, ~5 min)

---

## End-to-end smoke test for next session

1. **Money tab loads** — period defaults to current month, P&L header populates
2. **Click ⚙️ Calculate now** — succeeds, returns aggregator + calc result
3. **Switch to 📈 Revenue sub-tab** — shows Stripe webhook income rows
4. **Switch to 📉 Direct costs sub-tab** — shows Stripe fees + AI cost rows (aggregator must have written them)
5. **Switch to 🧾 Op-expenses sub-tab** — click + Add expense, fill form, save, row appears, P&L margin drops
6. **Switch to 🤝 Commissions sub-tab** — empty until first wire
7. **Click 📥 Accountant pack (CSV)** — file downloads with 5 sections
8. **Switch to 💸 Payouts sub-tab** — Gloria's row visible (50% share), Stripe Connect status pill shows "Not set up"
9. **🩺 Health tab** — 6 cards all green except possibly Stripe webhook (0 events if no test purchase yet)
10. **Agent dashboard** — log in as agent, `/montree/agent/earnings` shows pending payout from step 2
11. **`/montree/changelog`** — opens with 5 entries from tonight's work
12. **`/montree/dashboard`** (teacher) — ChangelogModal fires for new entries

---

## Architectural rules (cumulative — anything from v2 + new tonight)

[From v2 — preserved]:
1. Stripe transfers.create idempotencyKey is load-bearing
2. P&L = income − direct_cost − commission − op_expense + fx_adjustment
3. Agent share = pct × (gross − direct_cost). Op-expenses NOT in agent calc
4. Op-expense rows are the ONLY mutable ledger entries
5. Paid rows are immutable (server-side enforced)
6. API usage aggregator runs BEFORE calculator
7. Wire route writes commission row to finance_transactions
8. CSV export is single multi-section file
9. Race-safe upserts (23505 fallback)
10. CRON_SECRET env var authenticates cron calls
11. Agent chip on school row sorted FIRST (rank 0, amber)
12. Negative net → $0 payout. Never clawback
13. revenue_share_pct locked at calc time

**New tonight:**

14. **Trial-converted email triggers ONLY on `trialing → active` transition** (not on `past_due → active`, that's retry recovery)
15. **Monthly digest email is cron-only** (gated on x-cron-secret header AND `CRON_DIGEST_EMAIL` env var). Manual super-admin clicks DON'T send the email to prevent spam.
16. **All email helpers are fire-and-forget** — wire route succeeds even if Resend is down
17. **Trial drip idempotency via `montree_outreach_log`** — `action='trial_drip_dayN'`, `metadata.school_id` is the dedup key
18. **ChangelogModal silently baselines first-time visitors** to the latest entry — no spam with full history
19. **Public leaderboard surfaces aggregate-only data** — no PII beyond display names + initials + country hint
20. **Storage buckets have no own-snapshot backup** beyond Supabase's ~30-day soft delete (documented limitation)

---

## What's still deferred to future sessions

| Priority | Item | Effort |
|----------|------|--------|
| Medium | i18n batch for new English-only surfaces (parent-codes, agent messaging, Money tab, MoneyLedgerView, Health tab, ChangelogModal) | ~1 focused hour, 50+ keys × 12 locales via Haiku |
| Medium | Recurring op-expense scheduler (cron writes monthly rows from a `recurring=true` template) | ~1 hour |
| Medium | Mobile-first re-audit of all new pages | ~half-day real-device testing |
| Low | PDF accountant pack (currently CSV+JSON only) | ~half-day |
| Low | fx_adjustment manual entry UI | ~1 hour |
| Low | Sentry / error tracking integration | ~half-day |
| Low | Phase 1.1 SW SWR perf work | ~1 week, gated on Web Vitals baseline data |
| Low | Photo bank improvements | ~half-day |
| Low | Parent portal dark forest theme audit | ~1-2 hours |
| Stretch | Mira proactive cards (recent students surfaced on agent dashboard) | ~1 day |
| Stretch | Astra proactive cards (principal dashboard) | ~1 day |
| Stretch | Playwright smoke test suite | ~1 week |
| Stretch | HeyGen explainer videos | marketing — non-code |
| Stretch | Webhook dead-letter queue | ~half-day |

---

## Where every important thing is

| Question | Location |
|----------|----------|
| Monthly P&L | `/montree/super-admin` → 💰 Money tab |
| System health | `/montree/super-admin` → 🩺 Health tab |
| Wire a payout | Money → Payouts sub-tab → ⚡ Wire via Stripe |
| Add an op-expense | Money → 🧾 Op-expenses sub-tab → + Add expense |
| Generate accountant pack | Money tab header → 📥 Accountant pack (CSV) |
| Agent's view of their payouts | `/montree/agent/earnings` |
| Agent messages principal | `/montree/agent/messages` |
| Teacher invites parents | 3-dot menu → Parent codes |
| Principal sees all parent codes | `/montree/admin/parent-codes` |
| Trial drip cron | `POST /api/montree/super-admin/trial-drip` with `x-cron-secret` |
| Monthly calc cron | `POST /api/montree/super-admin/payouts/calculate` with `x-cron-secret` |
| Public changelog | `/montree/changelog` |
| Public leaderboard data | `GET /api/montree/leaderboard` (no UI page yet — endpoint ready) |
| Backup procedures | `docs/operations/BACKUP_DISASTER_RECOVERY.md` |
| Cron setup | `docs/perf/CRON_SETUP.md` |
| Hot query EXPLAIN | `docs/perf/HOT_QUERIES_EXPLAIN_AUDIT.sql` |

---

**Pick up Session 105 with:** enable Stripe Connect → set CRON env vars → smoke-test Money tab → wire Gloria's first payout → send the HK accountant package. After that, work through the deferred backlog in priority order.
