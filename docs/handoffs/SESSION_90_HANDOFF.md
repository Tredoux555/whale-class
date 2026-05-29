# Session 90 Handoff — Agent Referral Programme, Phases 1 + 2 + 3

**Date:** May 6, 2026
**Status:** All three phases shipped to main. Setup steps required before anything is testable in production (see "What you need to do" below).

**Commits pushed (9, in order):**
1. `e0ee3c7d` — Phase 1: codes + redemption foundation
2. `31b0a496` — Phase 1 docs (handoff + CLAUDE.md update)
3. `d73a1d94` — Phase 2: redeemed code IS the principal's login
4. `6bd5b955` — Phase 2 docs update
5. `03e2942c` — Phase 3: Stripe Connect Express onboarding for agents
6. `74d217d2` — Comprehensive handoff doc + CLAUDE.md aligned
7. `c17ab294` — Fix: 500 on issuing referral codes (multi-row email lookup + missing school_id)
8. `39b36e9f` — Fix: null.replace crash on Visitors tab when page_url/referrer is null
9. `5bb02a39` — Super-admin tidy: rainbow tile ribbon → three-button slate row

**Companion docs (in repo):**
- `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` — full 7-phase blueprint, all locked decisions
- `docs/AGENT_DASHBOARD_PLAN.md` — Phase 7 strategy: agent login, self-service codes, transparent earnings, schools-they-referred view (THIS IS THE NEXT BUILD)
- `docs/finance/accountant-onepager.md` — for HK accountant Pamela (already drafted as Gmail draft `r2430204512620199011`)

---

## TL;DR — what you can do right now

After running two Supabase migrations + one Stripe setup pass, you can:

1. Issue Sarah a unique code (`SARAH-K9X7`) from super admin → 🎟️ Referrals.
2. Send her the code (or a link `montree.xyz/montree/try?ref=SARAH-K9X7`).
3. The school types it at the Montree login → if pending, redirected to signup with code carried in. They fill in school + principal details.
4. School is created, Sarah is permanently linked as the founding agent at her negotiated %.
5. The same code becomes the principal's login forever — they type `SARAH-K9X7` to enter their dashboard.
6. Issue Sarah a Stripe Connect onboarding link from the same Referrals tab → she completes Stripe's hosted form → her status flips to **Verified** in your table once Stripe pings the webhook.

The pieces NOT yet built: automated school subscription billing (Phase 4), monthly payout calculator (Phase 5), Money tab dashboard (Phase 6), agent-side dashboard (Phase 7). Until those land, monthly payouts to Sarah are still a manual Wallex wire — but Phase 3 means she's set up to receive automated transfers the moment Phase 4 + 5 ship.

---

## 🚨 What you need to do before any of this works in production

### Before issuing Sarah's first code (~5 minutes)

1. **Run migration 186** in Supabase SQL Editor.
   File: `migrations/186_referral_codes.sql`. Idempotent. Verify with `SELECT COUNT(*) FROM montree_referral_codes;` (should return 0, not error).

2. **Run migration 187** in Supabase SQL Editor.
   File: `migrations/187_agent_stripe_connect.sql`. Idempotent. Verify with `SELECT stripe_connect_account_id FROM montree_teachers LIMIT 1;` (column should exist).

3. **Hard refresh** `/montree/super-admin` (Cmd+Shift+R) so the new bundle loads.

After (1) + (2) + (3), the 🎟️ Referrals tab works. You can issue Sarah's code immediately. Phase 1 + 2 are functional. Stripe onboarding (Phase 3) requires step 4-7 below.

### Before Stripe Connect onboarding works (~15-30 minutes)

4. **Confirm `STRIPE_SECRET_KEY` is set in Railway.**
   Likely already there (the existing school-billing webhook uses the same key). Test with: open a Connect-related endpoint — if you get "STRIPE_SECRET_KEY not configured" you need to set it.

5. **Enable Stripe Connect on your platform account.**
   Stripe Dashboard → Settings → Connect → "Get started." This is a one-time check — Stripe asks a few questions about your business model, you answer, Connect is on.

6. **Create the Connect webhook endpoint.**
   Stripe Dashboard → Developers → Webhooks → "Add endpoint":
   - URL: `https://montree.xyz/api/stripe/connect-webhook`
   - **Mode: Connect** (NOT "Account" — this is critical, the dropdown is on the page)
   - Events to send: `account.updated` (just that one for Phase 3)
   - Save → copy the signing secret (`whsec_...`)
   - Set in Railway as `STRIPE_CONNECT_WEBHOOK_SECRET`

7. **Confirm with your banker / Wallex** that Stripe Connect Express in HK can deposit into your Wallex multi-currency account. (You said your banker is checking; if no, fall back to Stripe Standard or manual Wallex wires for payouts.)

After 4-7, the Stripe Connect flow works end-to-end. Sarah clicks the link, fills the Stripe form, her status flips to Verified within seconds of completion.

### Independent of the above (~5 minutes, can do now)

8. **Send the Pamela email.**
   Gmail draft already in your account: ID `r2430204512620199011`. ~320 words. To `yanyuan.pan@vistra.com`. Asks her seven specific questions; her answers (especially commission classification as cost-of-sales vs operating expense) shape Phase 6's category structure. No prior Gmail thread with Pamela — this is a fresh outreach.

---

## Sarah pitch flow — exactly what to do

Once setup steps 1-3 above are done:

1. Open `/montree/super-admin` → 🎟️ Referrals tab.
2. Click "+ Issue code" → fill in:
   - Agent name: `Sarah` (just first name; that becomes the prefix)
   - Email: her email
   - Revenue share %: `50`
   - Pitch label (optional): `Greenfield Montessori — May 2026 pitch` or whatever helps you remember
3. Generate. Code appears in a gold banner — Copy it.

Send Sarah this exact message:

> Hi Sarah,
> Here's your code: **SARAH-K9X7**.
> Send your school's principal this link:
> `https://montree.xyz/montree/try?ref=SARAH-K9X7`
> They fill in their school details and they're in. From the moment they sign up, you're locked to that school at 50% of net profit for as long as they're a paying subscriber.
> Once they've signed up I'll send you a separate link to set up your payout details with Stripe (5-minute form).

Once steps 4-7 above are done and Sarah's school is set up:

4. Open Referrals tab → find Sarah's row → click 💳.
5. Onboarding URL appears in a banner — copy and email to Sarah.
6. She clicks → Stripe form → fills bank/tax details → returns to `/montree/agent/onboarding?status=complete`.
7. Webhook fires → her Stripe column flips from "Not started" to "Verified" within seconds.
8. Done. She's set up to receive automated payouts.

---

## What was shipped — phase by phase, file by file

### Phase 1 — codes + redemption (`e0ee3c7d`)

10 files, 1,521 lines.

**New:**
- `migrations/186_referral_codes.sql` — `montree_referral_codes` table (code unique, agent_id, status enum, redemption tracking, expiry) + extends `montree_schools` with `referral_code_id` and `referral_code_used` columns. Idempotent.
- `lib/montree/referral/code-gen.ts` — `generateUniqueReferralCode(displayName)` produces `<FIRSTNAME>-XXXX` codes. 4-char random suffix, no I/O/0/1 (same alphabet as login codes). DB-collision-checked, retries up to 6 times. `nameToPrefix()` normalises diacritics and falls back to `AGENT` if nothing usable.
- `app/api/montree/super-admin/referral-codes/route.ts` — POST creates a code (auto-creates a shell `montree_teachers` row for non-teaching agents with `is_active=false`). GET lists codes with status filter, enriched with school name where redeemed AND (after Phase 3) the agent's Stripe Connect status. DELETE revokes pending codes only — redeemed codes are locked.
- `components/montree/super-admin/ReferralsTab.tsx` — issue-code form, reveal-once gold banner with Copy button, status filter tabs, table with code/agent/% /status/school/pitch/created/actions. Copy + Revoke buttons per row. (Phase 3 added Stripe column + 💳 button.)
- `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` — comprehensive 7-phase blueprint.
- `docs/finance/accountant-onepager.md` — for Pamela.

**Modified:**
- `app/montree/super-admin/page.tsx` — wired the 🎟️ Referrals tab into the nav.
- `app/api/montree/try/instant/route.ts` — added `resolveReferralCode()` helper that validates a code BEFORE creating any school records (clean 400 on bad code). On success, stamps `school.founding_teacher_id` (the AGENT, not the new teacher), `revenue_share_pct`, `revenue_share_active=true`, `referral_code_id`, `referral_code_used`. Marks the referral code as `redeemed`. Wired into all three role branches (teacher, principal, homeschool_parent).
- `app/montree/try/page.tsx` — reads `?ref=CODE` from `window.location` on mount (no Suspense boundary), shows a small gold banner on every step until success, passes `referral_code` in the POST body.
- `CLAUDE.md` — Session 90 entry.

### Phase 2 — code IS the principal's login (`d73a1d94`)

3 files, 106 insertions.

**Modified:**
- `app/api/montree/try/instant/route.ts` — principal branch now hashes the REFERRAL code itself (uppercased, via `legacySha256`) as `montree_school_admins.password_hash` when a referral code is present. Email fallback uses the referral code's slug. Response returns the referral code as `code` so the success screen shows it as the principal's login (not the legacy 6-char). Without a referral code, falls back to the auto-generated 6-char code unchanged.
- `app/api/montree/auth/unified/route.ts` — new `tryReferralPrecheck()` helper runs FIRST (after rate limit + length check). status=pending → 409 with `redirectTo: /montree/try?ref=CODE`. status=revoked → 401 clear message. status=expired → 401 clear message. status=redeemed → returns null, falls through (the principal's `password_hash` matches `legacySha256(code)`, so `tryPrincipalLogin` Step 1 finds them naturally). Code length cap widened from 10 → 32 to fit `<FIRSTNAME>-XXXX` format.
- `app/montree/login-select/page.tsx` — input cap widened to 32. Handles 409 `pending_referral` by `router.replace(data.redirectTo)` instead of showing an error toast.

### Phase 3 — Stripe Connect for agents (`03e2942c`)

9 files, 767 lines.

**New:**
- `migrations/187_agent_stripe_connect.sql` — `montree_teachers` extended with `stripe_connect_account_id` (UNIQUE partial index), `stripe_connect_status`, `charges_enabled`, `payouts_enabled`, `details_submitted`, `disabled_reason`, `completed_at`, `updated_at`. Idempotent.
- `lib/montree/referral/stripe-connect.ts` — Connect-specific helpers built on the existing `getStripe()` singleton. `createConnectAccount()` (Express, business_type=individual, capabilities.transfers=requested, metadata.source for audit). `createOnboardingLink()` with return + refresh URLs that land on `/montree/agent/onboarding`. `fetchAccountStatus()` for force refresh. `summariseStatus()` derives the status enum (pending/onboarding/verified/restricted/disabled) from the Stripe Account object.
- `app/api/montree/super-admin/agents/[id]/connect-onboard/route.ts` — POST. If agent has no Stripe account, creates one via Stripe API. Race-safe conditional UPDATE (`.is('stripe_connect_account_id', null)`) — on race-loss, re-fetches the canonical account ID and proceeds; orphan Stripe account logged for manual reconciliation. Always generates a fresh onboarding link (Stripe expires them in ~5min) and returns the URL.
- `app/api/montree/super-admin/agents/[id]/connect-status/route.ts` — GET. Pulls latest from Stripe, persists to DB, returns. Stamp `completed_at` on FIRST transition to verified — never overwrites (audit trail).
- `app/api/stripe/connect-webhook/route.ts` — receives `account.updated` events with signature verification (`STRIPE_CONNECT_WEBHOOK_SECRET`, falls back to `STRIPE_WEBHOOK_SECRET`). Updates the agent's denormalised status. Returns 200 on errors to prevent Stripe retry loops. All errors logged loudly.
- `app/montree/agent/onboarding/page.tsx` — Stripe's return-URL landing. Reads `?status=complete|refresh` and shows appropriate copy. Webhook is the source of truth — this page is purely friendly bouncing.

**Modified:**
- `components/montree/super-admin/ReferralsTab.tsx` — new "Stripe" column with colour-coded pills (Not started / In progress / Verified / Restricted / Disabled). 💳 button per row generates an onboarding link, displays in a banner with Copy. Hidden once agent is verified.
- `app/api/montree/super-admin/referral-codes/route.ts` — GET enrichment now includes `agent_stripe_connect_account_id` and `agent_stripe_connect_status` from `montree_teachers` in one batch query. Gracefully degrades to null if migration 187 not yet run.
- `.env.example` — added `STRIPE_CONNECT_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL`.

---

## Real bugs caught during audit cycles

The audit-fix discipline caught five real bugs across the session — listing here so future sessions know they're already-fixed and don't re-introduce them.

1. **Phase 1 — apostrophe escape** in `try/page.tsx` and `ReferralsTab.tsx`. ESLint's `react/no-unescaped-entities` flagged. Replaced raw `'` with `&apos;`. Cosmetic, but a Next.js build can fail on these in stricter configs.

2. **Phase 2 — `submitCode` accessed before declaration** in login-select. Pre-existing pattern from before this session; left unchanged after confirming behaviour was correct (TDZ doesn't apply because the effect runs after function declarations are evaluated). Documented as known.

3. **Phase 3 — race condition in `connect-onboard`.** Two simultaneous POSTs would both see null `stripe_connect_account_id`, both create Stripe accounts, second's DB write would silently overwrite first → orphaning the first Stripe account in Stripe. Fixed with conditional `.is('stripe_connect_account_id', null)` UPDATE + race-detection branch that re-fetches the canonical account and proceeds with onboarding link generation against THAT account.

4. **Phase 3 — `connect-status` route nuking `completed_at`.** Was setting it to NULL whenever current status dropped below verified. Audit trail destroyed. Fixed to mirror the webhook handler: only stamp on FIRST transition to verified, never overwrite.

5. **Phase 3 — unused `fetchAccountStatus` import** in connect-onboard route. Dead import. Removed.

---

## Production verification checklist (next session, after setup steps 1-7)

After Railway redeploys and you've completed setup steps 1-7:

**Phase 1 + 2 (referral code lifecycle):**
1. Open `/montree/super-admin` → 🎟️ Referrals → "+ Issue code". Use fake agent (`Test`, `test@example.com`, 50%). Confirm `TEST-XXXX` appears in gold banner.
2. Open private window → `/montree/login-select` → type the test code → expect immediate redirect to `/montree/try?ref=TEST-XXXX` with the gold "Referral code" banner.
3. Pick role=Principal → fill in school + name + email → submit → expect to land in principal dashboard.
4. Log out → `/montree/login-select` → type the same code → **expect to land directly in the principal dashboard.** This is the proof Phase 2 works.
5. Verify DB: `SELECT status FROM montree_referral_codes WHERE code='TEST-XXXX';` → `redeemed`. `SELECT founding_teacher_id, revenue_share_pct FROM montree_schools WHERE referral_code_used='TEST-XXXX';` → values populated.
6. Issue another test code. Revoke it from the table immediately. Try logging in with it → expect 401 "This referral code has been revoked."
7. Confirm legacy login still works — type your own `ZNGLJT` code → should land in your dashboard unchanged.

**Phase 3 (Stripe Connect):**
8. With the test agent from steps 1-3 above, click 💳 on their row → confirm onboarding URL appears in indigo banner.
9. (Optional, real test) Open the URL in a private window → land on Stripe's hosted Express form → fill in test data using Stripe's test mode credentials → return to `/montree/agent/onboarding?status=complete`.
10. Within ~10 seconds the agent's Stripe column should flip to "In progress" or "Verified" (depending on what test data Stripe accepted).
11. Verify webhook fired: Stripe Dashboard → Developers → Webhooks → your Connect endpoint → recent events → see the `account.updated` events.
12. Verify DB: `SELECT stripe_connect_status, stripe_connect_completed_at FROM montree_teachers WHERE id='<test-agent-id>';`.

If any of these trip, send me a screenshot or the Railway log line — most failures will be migration not run, env var missing, or Connect not enabled in Stripe Dashboard.

---

## What is NOT shipped — clear gap list

**Phase 4 — Stripe school subscription billing** (3-4 days, precondition for automated revenue tracking). Schools are still on manual `personal_classroom` → `school` transitions. Without Phase 4, the Money tab in Phase 6 has nothing to read for revenue — would fall back to manually entering monthly gross per school.

**Phase 5 — payout calculation engine** (~1.5 days). Idempotent monthly job that aggregates revenue + Anthropic + OpenAI + Stripe fees per school, calculates each agent's cut as `net × revenue_share_pct`, writes to `montree_agent_payouts`. Won't have anything to calculate until Phase 4 ships.

**Phase 6 — Money tab in super admin** (2-3 days). Income / direct costs / commissions / op-ex / P&L / monthly Accountant Pack ZIP export. Architecture in `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md`.

**Phase 7 — agent dashboard refresh + decide on `/for-teachers` page** (~half a day). The existing `/montree/dashboard/earnings` page from Session 72 still assumes the OLD self-serve model. Either repurpose for "request an agent code from us" or retire. The `/montree/for-teachers` landing still pitches the old 20%-if-you-bring-your-school flow — same decision pending.

**Smaller things deferred:**
- No automated email to the agent when Tredoux issues their code (you copy + paste manually).
- No notification when a school redeems (visible in Referrals tab on next refresh).
- Dark-forest theme on the new Referrals tab — uses Tailwind dark-slate matching the rest of super admin (which is consistent — dark-forest conversion is a separate Session 83 item that's only ~5% done across super admin).
- The `montree_teacher_earnings` table from Session 72 has no rows yet and is left in place. New rows will go to `montree_agent_payouts` when Phase 5 lands. We can sunset the old table later.

---

## Architectural rules locked in this session (do NOT let future agents break these)

1. **`montree_referral_codes` is the source of truth for agent referral identity.** The `code` column is plaintext; only super-admin reads it. Status enum: `pending` → `redeemed` (terminal) OR `revoked` OR `expired`.
2. **At redemption, the referral code becomes the principal's password.** `legacySha256(referralCode.toUpperCase())` is written to `montree_school_admins.password_hash`. The existing `tryPrincipalLogin` does the same hash to compare — so the existing login flow Just Works.
3. **`tryReferralPrecheck()` runs FIRST in `/api/montree/auth/unified`** — before principal/teacher/parent attempts. Pending codes route to signup. Redeemed codes fall through (the existing principal lookup naturally finds them).
4. **`founding_teacher_id` semantics are now "linked agent."** It's the agent the school is permanently bound to via referral, NOT necessarily a teacher at the school. Could be a multiplier partner, a consultant, or an agent who has no relationship with the school other than introducing them.
5. **`revenue_share_pct` on `montree_schools` is editable per-school by super admin.** Whatever's there is what applies for that school's payouts — no historical preservation of original deal across edits. Tredoux adjusts manually as deals evolve.
6. **Stripe Connect Express, not Standard.** Stripe hosts the onboarding form, we never see bank/tax info, Stripe handles 1099-NEC and equivalents.
7. **Connect webhook MUST verify signature with the raw body** before doing anything. Returns 200 even on DB errors / unknown agents to prevent Stripe retry loops; all errors logged loudly for observability.
8. **`stripe_connect_completed_at` is stamped on FIRST transition to verified — never overwritten.** Both the webhook and the GET status route follow this rule. It's the audit-trail timestamp for "when did this agent become payment-ready."
9. **Race-safe Stripe account creation:** the conditional UPDATE pattern (`.is('stripe_connect_account_id', null)`) prevents the second of two simultaneous POSTs from orphaning the first's Stripe account. The orphan is still logged so you can clean it up manually.
10. **Phase 1 graceful degradation:** if migration 186 isn't run, the new Referrals tab returns 500 (loud failure). If migration 187 isn't run, the Stripe column shows "Not setup" for all agents and clicking 💳 surfaces the missing-column error. No silent corruption.

---

## Overnight cleanup (commits 7-9)

After Phases 1-3 shipped, three issues surfaced during user testing. All fixed and deployed.

**Commit `c17ab294` — referral codes 500 fix.**
When Tredoux issued the first code for "Gloria" with email `tredoux555@gmail.com`, the route returned 500 "Could not create agent record." Two layered bugs:

1. The lookup `'.eq("email", email).maybeSingle()'` errored on multi-row results (multiple test teacher rows shared the email). Error was discarded by destructuring; data became null; the route fell through to shell-creation.
2. The shell insert lacked `school_id`, which is `NOT NULL` on `montree_teachers`.

Fixes: lookup now `.order(created_at desc).limit(1)` + take-first; shell creation pulls the OLDEST `montree_schools` row as a placeholder; the API now surfaces DB error detail in the response so the UI can show what specifically failed.

**Commit `39b36e9f` — Visitors tab null.replace crash.**
The super-admin page hard-crashed with `Cannot read properties of null (reading 'replace')` whenever any `montree_visitors` row had a null `page_url` or `referrer`. `shortenUrl(url: string)` was typed as non-null but called with possibly-null DB data. Fix: accept `string | null | undefined`, return `'/'` on null. Same defence on inline `v.referrer.replace`. Now the empty state ("No visitors in the last N days") renders correctly.

**Commit `5bb02a39` — super-admin tidy.**
Replaced the 9-button rainbow tile ribbon with a three-button slate row. Kept the actively-used links (API Usage, Community, + Register school). Hidden the dead/abandoned links (Job Tracker, Master Campaign, Marketing Hub + 18 sub-pages, Social Manager + 5 sub-pages, Content Studio, Teacher Trial). Routes preserved on disk — bookmarks still work. The visual result: tabs (Schools/Leads/Feedback/Visitors/Guru/Referrals) are no longer drowning under a wall of colourful chrome.

---

## Phase 7 — Agent Dashboard plan (NEXT BUILD)

Full strategy in `docs/AGENT_DASHBOARD_PLAN.md`. The summary:

Agents (Sarah, multipliers) need their own dashboard so they can log in, see which schools they brought in, generate their own codes self-service, and watch their earnings transparently. Phase 7 splits into 5 sub-phases (~5 days total):

- **7a Foundation (1 day)** — migration 188 + super admin "Issue agent login" button
- **7b Auth (0.5 day)** — `'agent'` JWT role, `tryAgentLogin()` in unified login
- **7c Pages (2 days)** — `/montree/agent/*` routes (dashboard, schools, codes, earnings, payouts, settings)
- **7d APIs (1 day)** — 10 endpoints, all gated to the auth'd agent's data only
- **7e Polish (0.5 day)** — first-run tutorial, redemption celebration banner, mobile sweep

**Key decisions already locked in the plan** (don't re-debate at build time):
- Agents stay in `montree_teachers` with `is_agent=true`, separate `agent_password_hash` column
- 6-char alphanumeric agent login codes (no I/O/0/1)
- Self-service code generation at agent's locked default %, 20/day rate limit
- Earnings show ESTIMATES until Phase 5 lands (then swap to actuals from `montree_agent_payouts`)
- Suspending an agent stops their login but does NOT freeze pending payouts (two-knob system)
- Subpath routing (`/montree/agent/*`), not subdomain
- Dark forest theme (matches public pages), mobile-first

**7 open questions** in the plan need decisions BEFORE Phase 7a starts. The recommendations are documented; just need a yes/no when you wake up.

---

## Next session — exact resume instructions

If you're picking this up cold (e.g. a fresh session next morning), here's the orientation:

1. **Read this doc top to bottom** (you're already reading it).
2. **Check setup steps** at the top — migrations 186 + 187 should be done (Tredoux confirmed Wed evening). Stripe Connect dashboard setup may not be done yet (steps 4-7 in "Before Stripe Connect onboarding works").
3. **Decide what to build next.** Recommended order based on what's blocking the most value:

   **Option A — Build Phase 7 (Agent Dashboard) first.** ~5 days. Read `docs/AGENT_DASHBOARD_PLAN.md`. Sub-phases are independent and shippable. After Phase 7a (~1 day) Tredoux can issue Sarah an agent login. After 7c-d (3 days) she's looking at her own dashboard with estimated earnings. Highest UX impact for the lowest effort. *Recommended next.*

   **Option B — Build Phase 4 (Stripe school subscription billing) first.** 3-4 days. Precondition for automated revenue tracking. Without it, Sarah's dashboard shows estimates only (still useful). Big but high-value. Choose this if real-money flows are urgent.

   **Option C — Smaller polish wins first.** Email automation for code issuance, redemption notification banner, Referrals tab filters. Half a day each.

4. **If picking Phase 7:** answer the 7 open questions in `docs/AGENT_DASHBOARD_PLAN.md` Section 9 first (recommendations are already there — just need yes/no). Then start Phase 7a.

5. **End-to-end verify** what's already shipped before adding more. The 12-test checklist above. Especially "type the code → redirect to signup → redeem → re-login = direct dashboard." If that doesn't work end-to-end, fix that BEFORE building more.

---

## Agent referral programme — quick reference card

| What | Where |
|------|-------|
| Issue a code | `/montree/super-admin` → 🎟️ Referrals → "+ Issue code" |
| List/filter codes | Same tab, status filter at top of table |
| Revoke a pending code | Per-row "Revoke" button (only visible while status=pending) |
| Send agent a Stripe onboarding link | 💳 button per row → URL in indigo banner → Copy |
| Refresh agent's Stripe status manually | GET `/api/montree/super-admin/agents/[id]/connect-status` (no UI yet, just curl) |
| Code format | `<FIRSTNAME>-XXXX`, e.g. `SARAH-K9X7`, no I/O/0/1 |
| Code length | 5-12 char prefix + 4 random = 10-17 chars total |
| % range | 0-100 (entered per code, locked into school at redemption, editable per-school by super admin) |
| Code lifecycle | `pending` → `redeemed`/`revoked`/`expired` |
| Connect status enum | `pending` / `onboarding` / `verified` / `restricted` / `disabled` (or null = no account yet) |
| Login as redeemed code | Type at `/montree/login-select` — falls through to principal login naturally |
| Login as pending code | Type at `/montree/login-select` — 409 redirects to `/montree/try?ref=CODE` |
| DB tables | `montree_referral_codes` (codes), `montree_schools` (linkage cols), `montree_teachers` (agent + Stripe Connect cols) |
| Migrations | `186_referral_codes.sql` + `187_agent_stripe_connect.sql` |
| Env vars | `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`, optional `NEXT_PUBLIC_APP_URL` |
| Webhook | `https://montree.xyz/api/stripe/connect-webhook`, Connect mode, `account.updated` event |

---

## Carry-overs from earlier sessions (still pending — not Session 90 work)

- User to verify bingo calling cards on industrial printer (Session 89)
- User to read v8 term reports end-to-end (Session 89)
- Verify Library Tools tiles render on production (Session 89)
- End-to-end test Sentence Match + Sorting Mat generators (Session 89)
- Test super-admin Leads bulk clean (Session 89)
- Two-stage Language Presentation flow (Session 89, paused)
- Run migration 184 (Astra interaction logging — still not run)
- Send 3 hot lead Gmail drafts: Ardtona, FAMM, Тамі (Session 84-87)
- Decide on `/montree/for-teachers` landing page (Phase 7)
