# Health Check — Session 131 (May 27, 2026)

Four parallel audit agents ran in parallel against the codebase. This document is the master synthesis. Per-domain detail lives in the four sibling docs:

- `HEALTH_CHECK_S131_FRONTEND.md` — perf, bundle, service worker, dead code
- `HEALTH_CHECK_S131_API_DB.md` — cross-pollination, rate-limits, period locks, query hygiene
- `HEALTH_CHECK_S131_AI_COST.md` — tier-gating, model routing, prompt caching
- `HEALTH_CHECK_S131_I18N.md` — locale parity, t()-fallback antipattern, duplicate keys

---

## TL;DR

**🟢 The big-rock architectural rules are holding.** Service worker still narrow-intercept (v8), no `dynamic({ ssr: false })` in Server Components, Stripe webhook idempotency intact, `.ilike()` escaping consistent, cross-pollination contract honored on every recently-touched route, Astra/Mira model pinning intact, photo pipeline v2 fully wired with prompt caching at the right cache boundaries, i18n strict parity at **5,035 / 5,035 keys × 12 locales = 100%**, no `logApiUsage().catch()` regressions, no hardcoded model strings in customer-facing routes.

**🔴 Two genuine ship-blockers found.** One is a cross-pollination violation that lets unauthenticated callers impersonate any user on any school (`/api/montree/feedback`). The other is a missing period-lock guard on the super-admin payout PATCH that lets closed-period reconciled payouts be silently mutated (`super-admin/payouts/route.ts`).

**🟠 One medium-leverage money leak.** Five AI routes were missed by Session 76's tier-gating sweep — the worst (`children/[childId]/onboard`) burns ~$2–6 of Sonnet per Free-tier onboarding burst.

**Everything else is mechanical cleanup** (52-file `100vh→100dvh` sweep, 32-file `t() || 'fallback'` sweep, 31 duplicate keys to dedupe, ~50 images missing dimension attrs). One ~half-session focused cleanup pass closes the entire HIGH backlog.

---

## CRITICAL (fix before next outreach batch)

### CRIT-1 — `/api/montree/feedback` is auth-less + trusts body identity

**File:** `app/api/montree/feedback/route.ts:9-77`

The POST handler has a header comment claiming "open to all authenticated users" but never calls `verifySchoolRequest()`. It reads `school_id`, `user_type`, `user_id`, `user_name` directly from the request body and inserts a row with those values. An unauthenticated caller can spam any school's feedback inbox impersonating any teacher, parent, or principal — including the principal who'll see it as a real internal report.

**Fix posture:** add `verifySchoolRequest()` at the top, drop body-supplied identity fields, derive everything from the JWT. Same pattern as every other authenticated POST in `app/api/montree/**`.

**Effort:** 15 min. **Severity:** CRITICAL — cross-pollination + impersonation vector.

---

### CRIT-2 — Super-admin payouts PATCH bypasses period lock

**File:** `app/api/montree/super-admin/payouts/route.ts:202-260` (PATCH actions `mark_paid` / `manual_override`)

Session 109 architectural rule #62: every ledger mutation path checks `assertPeriodOpen()`. The `wire` route and the `record-incoming-wire` route both guard correctly. The PATCH on the payouts list does NOT. A super-admin can flip a payout for a closed Q1 period from `pending` to `paid` (or apply a `manual_override`) silently — accountant's reconciled month gets mutated without the 409 that other paths would return.

**Fix posture:** add `assertPeriodOpen(periodMonthOf(payout.created_at))` at the top of the action branches that mutate ledger state. Pattern is canonical in `record-incoming-wire/route.ts` line 135.

**Effort:** 20 min. **Severity:** CRITICAL — money-affecting, audit-trail-affecting.

---

## HIGH (close in the next 1–2 sessions)

### HIGH-1 — 5 AI routes missed by Session 76's tier-gating sweep

The worst money leak: **`app/api/montree/children/[childId]/onboard/route.ts:241`** calls Sonnet 4.6 directly via `model: AI_MODEL`. The voice-onboarding flow fires this per child × 20 children per classroom onboarding burst. Free-tier school = $2–6 burned with no 402 path.

Other four (smaller per-call but same pattern):
- `app/api/montree/photo-audit/tell-ai/route.ts` — Sonnet on every photo-audit "Tell me what this is" tap
- `app/api/montree/children/[childId]/weekly-admin/route.ts` — Sonnet on the per-child weekly admin doc generation
- `app/api/montree/admin/classroom-setup/describe/route.ts` — Sonnet on every "Teach the AI" tap
- `app/api/montree/onboarding/voice/custom-work/route.ts` — Sonnet on every custom-work catch from voice onboarding

**Fix posture per route:** resolve tier at top → 402 with `requires_upgrade: true, upgrade_url: '/montree/admin/billing', feature: '<key>'` for Free → pass `aiTier.model` into `messages.create()`. Pattern is canonical in `lib/montree/reports/resolve-model.ts` and the post-S105 UpgradeCard surfaces.

**Effort:** ~30 min per route × 5 = ~2.5 hours total. **Severity:** HIGH (CRIT for onboarding burst).

---

### HIGH-2 — 3 public routes missing rate-limit

- `app/api/montree/become-an-agent/apply/route.ts` (POST) — public agent application form, currently unbounded
- `app/api/montree/leads/route.ts` (POST) — public lead capture from landing-page demo modal
- `app/api/montree/feedback/route.ts` (POST) — see CRIT-1 (also missing rate-limit on top of being auth-less)

Demo-request route already rate-limits at 5/15min/IP (canonical pattern from S113 V2 rule #125). Apply the same `checkRateLimit()` helper to the three above.

**Effort:** ~10 min per route. **Severity:** HIGH — inbox flood, Resend quota burn, DB junk.

---

### HIGH-3 — Two `.single()` violations on lookup paths that can return 0 rows

- `app/api/montree/guru/followup/route.ts:38-50` — child lookup that legitimately returns 0 rows for never-followed-up children
- `app/api/montree/guru/work-guide/route.ts:83, 91` — work guide lookups on freshly-created custom works (no guide yet)

Both throw a 500 instead of returning a clean response when the row doesn't exist. **Fix:** `.single()` → `.maybeSingle()` + null guard.

**Effort:** 5 min total. **Severity:** HIGH — silent 500s in production for legitimate paths.

---

### HIGH-4 — Recurring finance templates missing period guard

`app/api/montree/super-admin/finance/recurring/route.ts` — CRUD on recurring templates does not check `assertPeriodOpen()`. The cron that runs the templates DOES check, so the cron-side is safe, but template edits during closed periods can still introduce stale data into the reconciliation surface. Less severe than CRIT-2 (the cron is the canonical mutation point) but worth closing.

**Effort:** 15 min. **Severity:** HIGH (downgrade-able to MED).

---

### HIGH-5 — `100vh` regressions in 52 files

Session 114 ruled `100dvh` is canonical for any full-height mobile surface. 52 files still use `100vh`. The worst offenders are customer-facing dashboard surfaces: curriculum, notes, photo-audit, raz, focus, conversations.

Mechanical sed-friendly fix:
```bash
find app components -name '*.tsx' | xargs sed -i '' "s/'100vh'/'100dvh'/g; s/100vh/100dvh/g"
```
…but be careful: legitimate print-CSS A4 surfaces (term reports) need `100vh`. Manual review per file is the safer route.

**Effort:** ~1 hour focused. **Severity:** HIGH — iOS Safari dynamic-toolbar clipping on every affected page.

---

### HIGH-6 — 32 files use the `t() || 'fallback'` antipattern (rule #244)

Session 129 documented this footgun: `t()` returns the key string itself when missing (truthy in this i18n system), so the `||` fallback never fires. Non-English principals see raw keys like `dashboard.welcome` instead of translated copy.

**Worst surface:** `DashboardHeader.tsx` (12 hits — every page header for every dashboard role).

Also affected: `dashboard/page.tsx`, both parent + teacher messaging detail pages, photo-audit page, capture page.

**Fix posture:** for each hit, decide:
- If key is missing → add it to `en.ts`, Haiku-batch the other 11 locales, then drop the `|| 'fallback'`.
- If key exists → just drop the `|| 'fallback'` (the fallback was always dead code).

**Effort:** ~2 hours focused (Haiku batch handles the heavy lifting). **Severity:** HIGH — broken UX for non-English users.

---

### HIGH-7 — 31 duplicate keys in `en.ts` + 25 each in 10 other locale files

`es.ts` is clean (likely regenerated more recently). One triplicate: `guru.thinking`. TypeScript silently lets the last definition win, so behavior is non-deterministic across builds.

**Fix:** dedupe en.ts manually (each duplicate needs a human call on which value is correct), then re-run the 10 affected locales through `npm run i18n:fill-ui` to inherit en.ts state. **Effort:** ~1 hour.

**Severity:** HIGH — silent-loss bug, very hard to debug without grep.

---

## MED (defer; close opportunistically)

| ID | What | Effort |
|----|------|--------|
| MED-1 | Service worker stale (v8, 13 days, ~70 commits since bump). Recommend v9. | 2 min |
| MED-2 | ~50 images missing `width`+`height` across hot surfaces. Worst: `raz/page.tsx` (10 imgs, no lazy, no dims). Photo-audit + gallery 3 each. | ~1.5 hours |
| MED-3 | Astra memory hard ceiling is 100; soft default is 30. Tighten hard to 50 — Opus prompt cost balloons proportional to memory size. | 5 min |
| MED-4 | 2 hardcoded English strings in `dashboard/parent-chats/page.tsx:215-216` — last leak from S121 sweep. | 10 min |
| MED-5 | One-off Whale-Class scripts still inline `claude-haiku-4-5-20251001` instead of the constant. Not customer-facing but breaks "single source of truth" rule. | 15 min |

---

## LOW (cosmetic / scheduled)

- `framer-motion` loaded by 8 games files — worth lazy-loading via `dynamic()` if any of those games surface in non-game routes
- `/public/montree-splash-video-zh.mp4` is 40MB, at the rule #248 ceiling. Don't add more locale variants without re-examining repo size.
- 5 recent commits are splash-video work, low regression risk.

---

## Burn-down recommendation for next session

**~3 hours of focused cleanup closes the entire CRITICAL + HIGH backlog:**

1. **🚨 CRIT-1 + CRIT-2 first (35 min combined)** — both data integrity. Ship as one commit, audit, push.
2. **HIGH-1 — Tier-gate the 5 missed AI routes (2.5 hours)** — biggest money win. Use the canonical UpgradeCard pattern. Ship as one commit per route or one batch commit; whichever's easier to revert.
3. **HIGH-2 — Rate-limit the 3 public POSTs (30 min)** — same `checkRateLimit()` helper everywhere.
4. **HIGH-3 — `.single()` → `.maybeSingle()` (5 min)** — trivial.
5. **HIGH-6 — `t() || 'fallback'` sweep (2 hours)** — single biggest non-English UX fix. Use the existing Haiku batch script.
6. **HIGH-7 — Dedupe locale files (1 hour)** — silent-loss class of bugs.

**Deferred for a dedicated session:**
- HIGH-5 `100vh → 100dvh` (52 files, needs per-file review to skip print-CSS surfaces).
- All MEDs.

---

## Architectural rules verified intact

- Service worker narrow-intercept (S76 rule)
- No `dynamic({ ssr: false })` in Server Components (S114 rule #142)
- `verifySchoolRequest` + body-supplied-identity ban (cross-pollination contract)
- `.ilike()` escape pattern (S107 rule #39)
- Stripe webhook idempotency + 200-on-error (S100 rule)
- `maxDuration` on AI routes (S81/S107 rule)
- Astra on `OPUS_MODEL` (S84 rule)
- Mira on `OPUS_MODEL` orchestrator + `HAIKU_MODEL` drafts (S97 rule)
- Photo pipeline v2 flag still gates Fixes A/B/C/D (S118 rule #197)
- Prompt caching `Array<TextBlockParam>` shape (S113 V2 rule #135)
- `apply_global_translations()` fires on every curriculum seed (S78 rule)
- i18n strict completeness pre-commit hook (S77 rule)
- `fill-missing-i18n-keys.mjs` zh-exclusion intact (S129 rule #245)
- `montree_school_admins.login_code` populated on every code-issue path (S98 rule)
- `is_focus` is NOT written to `montree_child_progress` (S81 rule)
- `logApiUsage()` never has `.catch()` (S95 rule)
- AES-256-GCM encryption layer wraps the 3 messaging tables (S121 rule)

---

## Where to find each finding's evidence

| Per-domain doc | Headlines |
|---------------|-----------|
| `HEALTH_CHECK_S131_FRONTEND.md` | SW state, dynamic imports, 100vh count, image dims, dead code state, recent commit risk, bundle bloat |
| `HEALTH_CHECK_S131_API_DB.md` | CRIT-1, CRIT-2, HIGH-2, HIGH-3, HIGH-4, cross-pollination spot-checks |
| `HEALTH_CHECK_S131_AI_COST.md` | HIGH-1 (the 5 missed routes), Astra/Mira posture, photo pipeline v2 wiring, prompt caching, Astra memory cap |
| `HEALTH_CHECK_S131_I18N.md` | HIGH-6, HIGH-7, strict parity %, S121 surface spot-checks, curriculum seed coverage |
