# Session 104 v5 Final Handoff — May 11, 2026

**24 commits on `origin/main` tonight.** Pick up Session 105 cold from this doc.

---

## Last batch shipped after v4 handoff

| # | Commit | What |
|---|--------|------|
| 20 | `fc28c603` | Webhook DLQ tab + Recurring template panel + FX sub-tab |
| 21 | `77594ec0` | Print/PDF accountant pack + server-errors logger |
| 22 | `7dd3e9af` | Server errors tab + Mira card + Astra card + landing polish |
| 23 | `af3a9127` | Health tab manual cron triggers + Astra/Mira changelog entry |

---

## 🚨 Migrations status

| # | File | Status |
|---|------|--------|
| 196 | perf_vitals | ✅ RUN |
| 197 | agent_messaging | ✅ RUN |
| 198 | agent_payouts | ✅ RUN |
| 199 | recurring_op_expenses | ✅ RUN |
| 200 | webhook_deadletter | ✅ RUN |
| 201 | server_errors | ⏳ PENDING |

**Only 201 left:**
```sql
CREATE TABLE IF NOT EXISTS montree_server_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warn', 'error', 'fatal')),
  resolved_at TIMESTAMPTZ, resolved_by TEXT, resolved_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_server_errors_recent
  ON montree_server_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_errors_unresolved
  ON montree_server_errors(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_server_errors_origin
  ON montree_server_errors(origin, created_at DESC);
```

---

## 🚨 Tredoux operational still-to-do

1. **Run migration 201** in Supabase (above)
2. **Enable Stripe Connect** at https://dashboard.stripe.com/connect
3. **Set Railway env vars** — `CRON_SECRET`, `CRON_DIGEST_EMAIL`
4. **Set up 5 Railway crons** per `docs/perf/CRON_SETUP.md` — OR fire them manually via Health tab buttons in the meantime
5. **Send Gloria + HK accountant packages**

---

## Super-admin tabs (9 total now)

🏫 Schools · 👋 Leads · 💬 Feedback · 📍 Visitors · 🤝 Agents · 💰 Money · 🩺 Health · ⚠️ DLQ · 🐛 Errors

### 🩺 Health tab includes
- 6 status cards
- Recent payout periods table
- **Manual cron triggers** (4 buttons: monthly calc / recurring op-expense / trial drip / warm)

### 💰 Money tab includes
- P&L header
- 6 sub-tabs: 💸 Payouts / 📈 Revenue / 📉 Direct costs / 🤝 Commissions / 🧾 Op-expenses / 💱 FX
- 📥 Accountant pack CSV button
- 🖨 Print / PDF button (browser save-as-PDF)
- ⚙️ Calculate now button
- Recurring template panel embedded in Op-expenses
- Stripe Connect status pills on each payout row
- ⚡ Wire via Stripe button with idempotency key

### ⚠️ DLQ tab
- Lists failed Stripe webhook events
- Resolve / Ignore actions with notes
- Status filter + payload expand

### 🐛 Errors tab
- Server errors from `logServerError()` calls
- Filter by state / severity / origin
- Resolve / delete actions

---

## Proactive cards (new tonight)

**`<TracyProactiveCard />`** on principal Today page:
- Stale classrooms (no photos this week)
- Idle teachers (>7d no login)
- Pending photos awaiting confirmation
- Dismissible per session

**`<MiraProactiveCard />`** on agent dashboard:
- Schools growing (≥2 students added in 7d) → celebrate
- Schools silent (no activity >14d) → outreach before churn
- Top 5 surfaced with suggested actions

---

## Email automation live

| Helper | Fires when |
|--------|-----------|
| `sendPayoutPaidEmail` | Wire route succeeds |
| `sendMonthlyDigestEmail` | Monthly cron + `CRON_DIGEST_EMAIL` env var |
| `sendTrialDripEmail` (day 7/14/25) | Daily drip cron |
| `sendTrialConvertedEmail` | Stripe webhook: trialing → active |
| `sendParentInviteEmail` (bulk + single) | Teacher action |
| `sendPrincipalInviteEmail` | Teacher action |
| Demo request confirmation | Landing page form submit |

All branded HTML + plain text fallback. Fire-and-forget — wire/webhook/etc. succeed even if Resend is down.

---

## What's left in the backlog

| Priority | Item | Effort |
|----------|------|--------|
| Medium | i18n batch (~80 keys × 12 locales via Haiku) | ~1 hour focused |
| Medium | Mobile-first re-audit (real-device testing) | ~half-day |
| Low | Photo bank improvements | ~half-day |
| Low | Parent portal dark forest theme audit | ~1-2 hours |
| Stretch | Playwright smoke tests | ~1 week |
| Stretch | HeyGen explainer videos | marketing, non-code |

---

## Where every important thing is

| Question | Location |
|----------|----------|
| Run a cron NOW | super-admin → 🩺 Health → cron triggers panel |
| Wire a payout | Money → Payouts → ⚡ Wire via Stripe |
| Add op-expense (recurring or one-off) | Money → 🧾 Op-expenses |
| Add FX adjustment | Money → 💱 FX |
| Resolve failed webhook | super-admin → ⚠️ DLQ |
| See production errors | super-admin → 🐛 Errors |
| Monthly accountant pack | Money tab → 📥 CSV or 🖨 PDF |
| Agent's view of earnings | `/montree/agent/earnings` |
| Agent's proactive cards | `/montree/agent/dashboard` |
| Principal's proactive cards | `/montree/admin` |
| Public changelog | `/montree/changelog` |
| Teacher invites parents | 3-dot menu → Parent codes |
| Bulk parent invite | `POST /api/montree/dashboard/parent-codes/bulk-email` |
| Backup procedures | `docs/operations/BACKUP_DISASTER_RECOVERY.md` |
| Cron setup | `docs/perf/CRON_SETUP.md` |

---

## Final lint + tsc status

All 24 commits pushed. Every changed file lint-clean on each commit. `tsc --noEmit --incremental false` clean from cold rebuild.

**Pick up Session 105 with:**
1. Run migration 201
2. Enable Stripe Connect on platform account
3. Click around the new tabs — Health, DLQ, Errors, Money sub-tabs
4. Fire the manual cron triggers from Health tab to test
5. Wire Gloria's first payout once Stripe Connect is on
6. Send the HK accountant package
