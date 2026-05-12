# Session 105 Handoff — May 12, 2026

**Theme:** i18n full sweep + Money/Health/Demo operational layer.

13 commits on `origin/main`. Headline outcome: every Session 104 surface is
now fully translatable into 12 locales, AND a comprehensive operational
layer around money + leads is in place. The trial→paid conversion funnel
is end-to-end translated. Demo-request leads no longer go cold.

Pick up Session 106 with the smoke test below. The Stripe Connect approval
+ Gloria onboarding are still the only blockers to wiring the first real
agent payout (carry-over from Session 104).

---

## All 13 commits (oldest → newest)

| # | Hash | Headline |
|---|------|----------|
| 1 | `bde404d8` | **i18n full sweep** — 327 new keys across 13 Session 104 surfaces × 12 locales (Money, Health, DLQ, Errors, Tracy/Mira cards, Changelog, TrialBanner, Recurring, parent-codes, agent messaging) |
| 2 | `5338a406` | Fix newline escape bug in `confirmWire` + `emailBody` (`\\n\\n` → literal `\n\n` text at runtime; normalized to `\n\n` across 12 locales) |
| 3 | `d99dfd31` | Money tab: 🔄 Reset to pending button on failed payouts (recovery path; preserves failure notes) |
| 4 | `48aa7b52` | **Demo-request drip campaign** — day 3 / 7 / 14 auto-emails to status=`demo_requested` leads, stops the moment status flips |
| 5 | `418ec51d` | Health tab: 📬 Demo requests card (pending count + drip activity + oldest unanswered) |
| 6 | `03fba586` | Money tab: Stripe Connect status pill clickable to `dashboard.stripe.com/connect/accounts/{id}` |
| 7 | `00ada714` | **Billing page i18n** — 36 keys × 11 locales. Closes the trial→paid funnel gap for non-English-speaking principals |
| 8 | `a3cd874f` | Health tab: webhook DLQ pending count surfaced on Stripe webhook card (warn status if > 0) |
| 9 | `317d585f` | Health tab: 🐛 Server Errors card (unresolved count, fatal flag, last 7d total) |
| 10 | `dc0a449e` | Schools tab: Stripe Customer pill deep-links to `dashboard.stripe.com/customers/{id}` |
| 11 | `2f4d5f04` | DemoRequestAlert: shows drip activity per row + adds Not interested action |
| 12 | `0192bad6` | Tracy 402 → friendly upgrade card with "Set up billing" CTA (vs red error toast). Carry-over from Session 98 priority #14. |
| 13 | `c0c12a2c` | DemoRequestAlert: 📧 Reply with trial link button (mailto with pre-filled warm reply + auto-marks contacted) |

---

## What's now live

### 💰 Money tab (super-admin)
- ⚡ Wire via Stripe (existing) + 💸 Mark paid + ✕ Cancel + ✏️ Override + ⚠ Mark failed
- **🔄 Reset to pending on failed rows** (new — recovery path)
- Stripe Connect status pill **clickable** → opens account in Stripe Dashboard
- All buttons + tooltips + prompts translated into 12 locales

### 🏫 Schools tab (super-admin)
- 💳 Stripe Customer pill **clickable** → opens customer in Stripe Dashboard

### 🩺 Health tab (super-admin)
8 cards now: DB · Stripe webhooks · AI usage · LCP · Last payout calc · Schools · **🐛 Server errors** · **📬 Demo requests**
- Stripe card surfaces DLQ pending count (warn if > 0)
- Server errors card: fatal count escalates to fail status
- Demo requests card: pending count + drips fired + oldest unanswered (warn if > 14d)

### 📬 DemoRequestAlert (super-admin home)
Per-lead row now shows:
- Age in days (amber if > 14d)
- Drips fired (e.g. "📧 drips: d3, d7")
- Three actions: **📧 Reply with trial link** (mailto + auto-contacted) / ✓ Contacted / Not interested

### 💌 Demo-request drip campaign
- Day 3, 7, 14 follow-up emails to `status='demo_requested'` leads
- Auto-stops the moment Tredoux flips status to anything else
- Idempotent via `montree_outreach_log` (action='demo_request_drip_dayN', contact_id dedup key)
- Cron: `0 10 * * *` (10:00 UTC daily, one hour after trial-drip)
- Manual trigger button on Health tab

### 💳 Billing page (`/montree/admin/billing`)
- Fully translated end-to-end (status pills, tiles, buttons, error messages, invoice history, drift warning, configured/not-configured branches)
- Locale-aware date + currency formatting via `getIntlLocale()`

### ✨ Tracy upgrade card
- 402 responses now include `requires_upgrade: true`
- Frontend renders a friendly amber/gold card with "Set up billing" CTA → `/montree/admin/billing`
- Plain transient errors still render red (separate branch)

---

## Architectural rules added this session

27. **Drips that gate on a status field auto-stop** the moment the status flips. No separate unsubscribe state machine. Pattern: `WHERE status='demo_requested'` in the cron query. (Applies to demo-request-drip; trial-drip already followed this.)

28. **`\n\n` in TypeScript single-quoted strings produces newlines at runtime.** Do NOT use `\\n\\n` (which produces literal `\n\n` text). Pre-commit i18n strict check passes either way, so this is a real runtime bug guard.

29. **402 responses for AI features include `requires_upgrade: true` + `upgrade_url` + `feature`.** Clients render an upgrade card instead of a red error. Pattern lives in `app/api/montree/admin/principal-agent/route.ts`. Other AI 402 routes should adopt the same shape (Weekly Wrap, Photo Identification, etc.) as follow-up work.

30. **Stripe Dashboard deep-links:**
   - Customer: `https://dashboard.stripe.com/customers/{id}` (Schools tab pill)
   - Connect account: `https://dashboard.stripe.com/connect/accounts/{id}` (Money tab pill)
   - Connect transfer: `https://dashboard.stripe.com/connect/transfers/{id}` (Money tab paid history — existing)

31. **`reset_failed` is the canonical recovery action for stuck payouts.** Server refuses if not status=failed. Notes preserved. Clients should add similar `reset_*` actions for any other immutability-state-machine table that benefits from it.

---

## Smoke test plan (Session 106, ~15 min)

After Railway settles `c0c12a2c`, run these on production:

1. **Money tab loads** — open `/montree/super-admin` → 💰 Money. Period defaults to current month, P&L header renders.
2. **Switch locale to Chinese** — confirm all sub-tab pills (💸 付款 / 📈 收入 / 📉 直接成本 / 🤝 佣金 / 🧾 运营支出 / 💱 外汇) render in Chinese.
3. **Stripe Connect deep-link** — find a payout row with Connect status pill. Click. Should open `dashboard.stripe.com/connect/accounts/{id}` in new tab.
4. **Stripe Customer deep-link** — Schools tab → find a school with 💳 Stripe pill. Click. Should open `dashboard.stripe.com/customers/{id}`.
5. **Reset failed payout** — pick a failed payout (or use a test row). Click 🔄 Reset to pending. Confirm. Status flips to pending. Wire button becomes active again.
6. **Health tab** — open 🩺 Health. 8 cards visible. Click 🔄 Run check. Stripe card shows webhook count, DLQ pending in subtitle. Demo requests card shows pending count + drip activity. Server errors card shows unresolved.
7. **Demo request drip** — fire the manual trigger from Health tab cron triggers panel ("Demo-request drip"). Should return ok response (empty outcomes if no leads at day 3/7/14 boundary).
8. **DemoRequestAlert** — visit super-admin home. If any leads pending, verify the row shows age + drips + 3 buttons (📧 Reply, ✓ Contacted, Not interested).
9. **Reply with trial link** — click 📧 button on a pending lead. Mail client opens with pre-filled warm reply containing the trial signup URL. Lead disappears from alert (marked contacted).
10. **Tracy upgrade card** — switch a school to Free tier in super-admin. Log in as that principal. Hit Tracy. Should see amber/gold upgrade card with "Set up billing" → `/montree/admin/billing`, NOT a red error toast.
11. **Billing page in Chinese** — `/montree/admin/billing` in zh locale. Status pill = 当前计划 / 月度费用 / 设置账单 / 通过 Stripe 按月计费 etc.
12. **Trial conversion success message** — sign up a fresh trial school, hit Stripe Checkout with `4242 4242 4242 4242`, verify return-page shows the localized "thank you" message in the active locale.

---

## Tredoux's operational to-do (carry-over from Session 104, unchanged)

1. **Enable Stripe Connect** at https://dashboard.stripe.com/connect — the ONLY blocker to wire Gloria's first real payout
2. **Generate Gloria's Stripe Connect link** (super-admin Referrals → 💳 button) once Connect is on → send `docs/agents/GLORIA_STRIPE_ONBOARDING.md` + the link
3. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
4. **Set Railway env vars** — `CRON_SECRET` (`openssl rand -base64 32`), `CRON_DIGEST_EMAIL=tredoux555@gmail.com`
5. **Configure 5 Railway crons** per `docs/perf/CRON_SETUP.md` — payout calc / trial drip / **demo-request drip** / recurring op-expense / Stripe sync. OR keep firing from Health tab manual triggers.
6. **Verify `montree.xyz` in Resend** so demo + drip emails actually reach recipients

---

## Deferred backlog (priority-ordered)

| Priority | Item | Effort |
|----------|------|--------|
| Medium | **Apply Tracy 402 upgrade-card pattern to other AI routes** — Weekly Wrap, Photo Identification, Snap Identify, etc. Each route returns 402 with `requires_upgrade: true` and clients render the matching card. ~1-2 hours per surface. |
| Medium | **Agent dashboard polish** — Schools / Codes / Payouts / Settings pages. Mobile-first re-audit. ~half-day. |
| Medium | **Photo bank improvements** — half-day (carry-over) |
| Medium | **Parent portal dark forest theme audit** — half-day (carry-over) |
| Low | Bulk action on DemoRequestAlert: "Reply to all stale leads" when N+ rows are > 14d |
| Low | Per-school billing override — set custom price for legacy schools |
| Stretch | Playwright smoke test suite for the 12-step smoke test above |
| Stretch | HeyGen explainer videos |

---

## Files changed (summary)

- **15 component files** (Money tab, Health tab, DemoRequestAlert, Schools tab, billing page, Tracy admin page, etc.)
- **3 server route files** (payouts PATCH, principal-agent 402, super-admin demo-requests, demo-request-drip cron route NEW)
- **1 email helper** (`lib/montree/email.ts` — `sendDemoRequestDripEmail` added)
- **12 i18n locale files** (~370 new keys × 12 locales)
- **1 docs file** (CRON_SETUP.md — added demo-request drip section)
- **This handoff doc**

Net: ~30 unique files, ~6,000 lines added (mostly translation strings).

---

## Final i18n state

| Locale | Keys | Status |
|--------|------|--------|
| en (reference) | 4401 | ✓ |
| zh / es / de / fr / pt / nl / it / ja / ko / uk / ru | 4408 each | ✓ All 100% parity |

Pre-commit i18n strict check passes. Translation key namespaces touched this session:
`money.*`, `moneyLedger.*`, `health.*`, `dlq.*`, `serverErrors.*`, `recurring.*`, `opExpense.category.*`, `changelog.*`, `trialBanner.*`, `tracy.*`, `mira.*`, `parentCodes.*`, `agentMessages.*`, `agentThread.*`, `billing.*`, `common.dismiss`, `common.refresh`

---

**End of Session 105.** Pick up Session 106 with the 12-step smoke test + the deferred backlog. Real-money infrastructure is one Stripe Connect approval away from wiring Gloria.
