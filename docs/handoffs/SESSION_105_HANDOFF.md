# Session 105 Handoff — May 12, 2026

**Theme:** i18n full sweep + Money/Health/Demo operational layer + Photo audit polish.

**16 commits on `origin/main`.** Headline outcome: every Session 104 surface
is now fully translatable into 12 locales, AND a comprehensive operational
layer around money + leads is in place. The trial→paid conversion funnel
is end-to-end translated. Demo-request leads no longer go cold. The photo
audit page now surfaces top-3 candidate chips and stops choking on
200-photo grids.

Pick up Session 106 with the smoke test below. **Stripe Connect approval
+ Gloria onboarding are still the only blockers to wiring the first real
agent payout** (carry-over from Session 104).

---

## All 16 commits (oldest → newest)

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
| 14 | `453cd9b6` | Session 105 handoff doc (v1) |
| 15 | `7cc53298` | **Photo audit: top-3 candidate chips** (one-tap fix on Haiku misses) **+ React.memo on AuditPhotoCard** (fixes "system choked" on 200+ photo grids) |
| 16 | (this) | Final handoff + CLAUDE.md update |

---

## What's now live

### 💰 Money tab (super-admin)
- ⚡ Wire via Stripe + 💸 Mark paid + ✕ Cancel + ✏️ Override + ⚠ Mark failed (all existing)
- **🔄 Reset to pending on failed rows** (new — recovery path, refuses non-failed rows server-side)
- Stripe Connect status pill **clickable** → opens `dashboard.stripe.com/connect/accounts/{id}`
- All buttons + tooltips + prompts translated into 12 locales

### 🏫 Schools tab (super-admin)
- 💳 Stripe Customer pill **clickable** → opens `dashboard.stripe.com/customers/{id}` in new tab
- Per-status color (active=emerald, trial=amber, past_due=red, canceled=slate)

### 🩺 Health tab (super-admin)
**8 cards now:** DB · Stripe webhooks · AI usage · LCP · Last payout calc · Schools · **🐛 Server errors** · **📬 Demo requests**
- Stripe card surfaces DLQ pending count in subtitle (warn status if > 0)
- Server errors card: fatal count escalates card to fail status
- Demo requests card: pending count + drips fired last 7d + oldest unanswered (warn if > 14d)

### 📬 DemoRequestAlert (super-admin home)
Per-lead row now shows:
- Age in days (amber pill if > 14d for visual urgency)
- Drips fired (e.g., "📧 drips: d3, d7") in blue pill
- Three actions:
  - **📧 Reply with trial link** (amber primary) — opens mailto with pre-filled warm reply containing `https://montree.xyz/montree/try`; also auto-marks contacted
  - **✓ Contacted** (emerald) — just stops the drip
  - **Not interested** (slate) — also stops the drip; for dead leads

### 💌 Demo-request drip campaign
- Day 3 / 7 / 14 follow-up emails to `status='demo_requested'` leads
- Auto-stops the moment status flips (no separate unsubscribe state machine)
- Idempotent via `montree_outreach_log` (action='demo_request_drip_dayN', contact_id dedup key)
- Cron: `0 10 * * *` (10:00 UTC daily, one hour after trial-drip)
- Manual trigger button on Health tab

### 💳 Billing page (`/montree/admin/billing`)
- **Fully translated end-to-end** (status pills, tiles, buttons, error messages, invoice history, drift warning, configured/not-configured branches)
- Locale-aware date + currency formatting via `getIntlLocale()`

### ✨ Tracy upgrade card
- 402 responses include `requires_upgrade: true` + `upgrade_url` + `feature`
- Frontend renders friendly amber/gold card with "Set up billing" CTA → `/montree/admin/billing`
- Plain transient errors still render red (separate branch)

### 📸 Photo audit page
- **Top-3 candidate chips** on both `haiku_matched` and `haiku_drafted` cards.
  `matchToCurriculumV2` was already computing 3 candidates internally —
  now exposed via `TwoPassResult.identification.topCandidates` + persisted
  to `sonnet_draft.top_candidates` + rendered as inline pill chips. One-tap
  fix when Haiku's #1 was wrong but #2 or #3 is right. No typing.
- **AuditPhotoCard wrapped in `React.memo`** with custom comparator.
  Comparator checks: `photo`, `selected`, `processing`, `workStatus`,
  `rerunResult`, `unifiedTagger`. Callbacks deliberately excluded — they
  always read latest state via parent closures + functional setState.
  Net: typing a note on one card no longer cascades re-renders through
  the other 200 visible cards.

---

## Architectural rules added this session

27. **Drips that gate on a status field auto-stop** the moment status flips. No separate unsubscribe state machine. Pattern: `WHERE status='demo_requested'` in the cron query. (Applies to demo-request-drip; trial-drip already followed this.)

28. **`\n\n` in TypeScript single-quoted strings produces newlines at runtime.** Do NOT use `\\n\\n` (which produces literal `\n\n` text). Pre-commit i18n strict check passes either way, so this is a real runtime bug guard.

29. **402 responses for AI features include `requires_upgrade: true` + `upgrade_url` + `feature`.** Clients render an upgrade card instead of a red error. Pattern lives in `app/api/montree/admin/principal-agent/route.ts`. Other AI 402 routes should adopt the same shape (Weekly Wrap, Photo Identification, etc.) as follow-up work.

30. **Stripe Dashboard deep-links:**
   - Customer: `https://dashboard.stripe.com/customers/{id}` (Schools tab pill)
   - Connect account: `https://dashboard.stripe.com/connect/accounts/{id}` (Money tab pill)
   - Connect transfer: `https://dashboard.stripe.com/connect/transfers/{id}` (Money tab paid history — existing)

31. **`reset_failed` is the canonical recovery action for stuck payouts.** Server refuses if not status=failed. Notes preserved.

32. **`matchToCurriculumV2` returns top-3 candidates — use them.** The function has always returned an ordered list; only `bestMatch` was previously consumed. Pass 2 + Pass 2b in `lib/montree/photo-identification/two-pass.ts` now persist the full top-3 to `sonnet_draft.top_candidates`. UI surfaces them as chips. If you change the matcher, preserve the candidate-array contract.

33. **`React.memo` on expensive list items must skip callback props in the comparator.** Callbacks always have new identity per parent render, so including them in the comparator defeats memo. Callbacks read latest state through closures + functional `setState((prev) => ...)`, so stale-reference correctness is fine. Comparator only checks DATA props that determine the rendered output.

---

## Smoke test plan (Session 106, ~20 min)

After Railway settles `7cc53298`, run these on production:

1. **Money tab loads** — `/montree/super-admin` → 💰 Money. Period defaults to current month, P&L header renders.
2. **Switch locale to Chinese** — confirm sub-tab pills (💸 付款 / 📈 收入 / 📉 直接成本 / 🤝 佣金 / 🧾 运营支出 / 💱 外汇) render in Chinese.
3. **Stripe Connect deep-link** — payout row with Connect status pill. Click → opens `dashboard.stripe.com/connect/accounts/{id}` in new tab.
4. **Stripe Customer deep-link** — Schools tab → school with 💳 Stripe pill. Click → opens `dashboard.stripe.com/customers/{id}`.
5. **Reset failed payout** — failed row. Click 🔄 Reset to pending. Confirm. Status flips. Wire button active again.
6. **Health tab** — 8 cards visible. 🔄 Run check. Stripe shows webhook count + DLQ in subtitle. Demo shows pending + drips + oldest. Server errors shows unresolved.
7. **Demo request drip manual trigger** — Health tab cron triggers panel → "Demo-request drip". Ok response (empty outcomes if no leads at day 3/7/14).
8. **DemoRequestAlert** — super-admin home. Pending leads show age + drips + 3 buttons.
9. **Reply with trial link** — click 📧 button. Mail client opens with pre-filled warm reply + trial URL. Lead disappears from alert (marked contacted).
10. **Tracy upgrade card** — switch a school to Free tier. Log in as that principal. Hit Tracy. Should see amber/gold upgrade card with "Set up billing" → `/montree/admin/billing`, NOT a red error toast.
11. **Billing page in Chinese** — `/montree/admin/billing` in zh locale. Status pills + tiles + buttons all Chinese.
12. **Trial conversion success message** — sign up fresh trial, hit Stripe Checkout with `4242 4242 4242 4242`, verify return-page shows localized "thank you" message.
13. **🆕 Photo audit top-3 chips** — open `/montree/dashboard/photo-audit`. Find a haiku_matched (yellow) or haiku_drafted (teal) photo. Look below the work name for "or pick: [chip] [chip]" — top-2 sibling candidates. Click a chip → photo should auto-attach to that work and move out of the queue.
14. **🆕 Photo audit responsiveness** — load 200+ photos. Type into one photo's note textarea. Verify other cards don't flicker/re-render. Scrolling stays smooth.

---

## Tredoux's operational to-do (unchanged from Session 104)

1. **Enable Stripe Connect** at https://dashboard.stripe.com/connect — the ONLY blocker to wire Gloria's first real payout
2. **Generate Gloria's Stripe Connect link** (super-admin Referrals → 💳 button) once Connect is on → send `docs/agents/GLORIA_STRIPE_ONBOARDING.md` + the link
3. **Send the HK accountant** `docs/finance/HK_FINANCIAL_ADVISOR_SUMMARY.md`
4. **Set Railway env vars** — `CRON_SECRET` (`openssl rand -base64 32`), `CRON_DIGEST_EMAIL=tredoux555@gmail.com`
5. **Configure 5 Railway crons** per `docs/perf/CRON_SETUP.md` — payout calc / trial drip / **demo-request drip** / recurring op-expense / Stripe sync. OR keep firing from Health tab manual triggers.
6. **Verify `montree.xyz` in Resend** so demo + drip emails actually reach recipients

---

## Deferred backlog (priority-ordered, Session 106+)

| Priority | Item | Effort |
|----------|------|--------|
| Medium | **Apply Tracy 402 upgrade-card pattern to other AI routes** — Weekly Wrap, Photo Identification, Snap Identify, etc. Each route returns 402 with `requires_upgrade: true` and clients render the matching card. ~1-2 hours per surface. |
| Medium | **Agent dashboard polish** — Schools / Codes / Payouts / Settings pages. Mobile-first re-audit. ~half-day. |
| Medium | **Virtual scroll on photo-audit grid** — `React.memo` helps but 500 photos in DOM is still heavy. Add `react-window` or `react-virtuoso` for true windowing. ~2-3 hours. |
| Medium | **Photo bank improvements** — half-day (carry-over) |
| Medium | **Parent portal dark forest theme audit** — half-day (carry-over) |
| Low | Bulk action on DemoRequestAlert: "Reply to all stale leads" when N+ rows are > 14d |
| Low | Per-school billing override — set custom price for legacy schools |
| Low | Top-3 chips on the `sonnet_drafted` card too (currently only on Haiku cards). Sonnet's `closest_existing_match` could be repurposed. |
| Stretch | Playwright smoke test suite for the 14-step smoke test above |
| Stretch | HeyGen explainer videos |

---

## Files changed across all 16 commits

**Source files (15):**
- Money tab: `components/montree/super-admin/MoneyTab.tsx`, `MoneyLedgerView.tsx`
- Health tab: `components/montree/super-admin/HealthTab.tsx`, `WebhookDLQTab.tsx`, `ServerErrorsTab.tsx`, `RecurringOpExpensePanel.tsx`
- Demo + Schools: `components/montree/super-admin/SchoolsTab.tsx`, `app/montree/super-admin/page.tsx`
- Tracy + admin: `components/montree/admin/TracyProactiveCard.tsx`, `TrialExpiringBanner.tsx`, `app/montree/admin/page.tsx`, `app/montree/admin/billing/page.tsx`
- Agent: `components/montree/agent/MiraProactiveCard.tsx`, `app/montree/agent/messages/page.tsx`, `app/montree/agent/messages/[threadId]/page.tsx`
- Misc: `components/montree/ChangelogModal.tsx`, `app/montree/dashboard/parent-codes/page.tsx`, `app/montree/dashboard/photo-audit/page.tsx`

**Server routes (5):**
- `app/api/montree/admin/snapshot/route.ts` (Tracy proactive — returns suggestion_keys)
- `app/api/montree/agent/snapshot/route.ts` (Mira proactive — returns action keys + params)
- `app/api/montree/admin/principal-agent/route.ts` (Tracy 402 → requires_upgrade)
- `app/api/montree/super-admin/payouts/route.ts` (reset_failed action)
- `app/api/montree/super-admin/health/route.ts` (server_errors + demo_requests + DLQ count steps)
- `app/api/montree/super-admin/demo-requests/route.ts` (drip activity enrichment)
- `app/api/montree/super-admin/demo-request-drip/route.ts` **NEW** (drip cron endpoint)
- `app/api/montree/photo-identification/process/route.ts` (top_candidates persistence)

**Libs (2):**
- `lib/montree/email.ts` (sendDemoRequestDripEmail)
- `lib/montree/photo-identification/two-pass.ts` (topCandidates in TwoPassResult)

**i18n locales (12):** ~370 new keys × 12 locales.

**Docs (3):** `CRON_SETUP.md` (demo-request drip section), `SESSION_105_HANDOFF.md`, this final update.

---

## Final i18n state

| Locale | Keys | Status |
|--------|------|--------|
| en (reference) | 4398 | ✓ |
| zh / es / de / fr / pt / nl / it / ja / ko / uk / ru | 4405 each | ✓ All 100% parity |

Pre-commit i18n strict check passes for every commit this session.

Translation key namespaces touched this session:
`money.*`, `moneyLedger.*`, `health.*`, `dlq.*`, `serverErrors.*`,
`recurring.*`, `opExpense.category.*`, `changelog.*`, `trialBanner.*`,
`tracy.*` (+ `tracy.upgrade.*`), `mira.*`, `parentCodes.*`,
`agentMessages.*`, `agentThread.*`, `billing.*`, `audit.autoTaggedHint`,
`audit.orPick`, `common.dismiss`, `common.refresh`

---

## User feedback addressed inline this session

**"Beneficial if Haiku matched the three most likely works for a quick tap on Wrap Up"** — `7cc53298` ships top-3 candidate chips on both `haiku_matched` (yellow) and `haiku_drafted` (teal) cards. Renders the top 2 SIBLINGS (skipping the chosen one) as inline pills. One-tap fix when Haiku's #1 was wrong but #2 or #3 is right.

**"Today I was sorting through these works and the system choked"** — same commit wraps `AuditPhotoCard` in `React.memo` with a custom shallow comparator. Unrelated state changes (typing a note on another card, scroll, filter) no longer cascade re-renders into every card. If 500+ photos still chokes after this, the next step is true virtual scroll (deferred to next session).

---

**End of Session 105.** Pick up Session 106 with the 14-step smoke test + the deferred backlog. Real-money infrastructure is one Stripe Connect approval away from wiring Gloria.
