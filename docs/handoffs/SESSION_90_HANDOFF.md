# Session 90 Handoff — Agent Referral Programme, Phases 1 + 2

**Date:** May 6, 2026
**Commits:** `e0ee3c7d` (Phase 1 — codes + redemption) + `d73a1d94` (Phase 2 — code IS the principal's login) on main
**Companion docs:**
- `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` — full 7-phase build plan
- `docs/finance/accountant-onepager.md` — for HK accountant review

---

## Can I give my teacher a code right now?

**Yes — after two things happen.**

1. Run migration `migrations/186_referral_codes.sql` in Supabase SQL Editor.
2. Wait for Railway to finish deploying commit `e0ee3c7d` (~2-3 minutes after push).

After those two, open `/montree/super-admin` → 🎟️ **Referrals** tab → "+ Issue code" → fill in Sarah's name, email, 50% → Generate. You'll see the code in a gold banner with a Copy button (e.g. `SARAH-K9X7`).

Send Sarah this link — the code goes in the URL so she doesn't have to explain it:

```
https://montree.xyz/montree/try?ref=SARAH-K9X7
```

She forwards it to the school. They click → fill in school name + principal name + email → submit. They're in. The school is permanently stamped with Sarah as the founding agent at 50% revenue share.

---

## How the full flow works after Phase 2

The code IS the school's login. Sarah's pitch is one sentence:

> "Go to montree.xyz, type SARAH-K9X7. You're in."

**First use (school redeems):**
1. School types `SARAH-K9X7` at `/montree/login-select`.
2. Server runs `tryReferralPrecheck` — sees status=`pending`, returns 409 with `redirectTo=/montree/try?ref=SARAH-K9X7`.
3. Login page redirects them to the trial signup form, code already in the URL.
4. They fill in school name + principal name + email, submit.
5. Backend creates the school + principal, with `password_hash = legacySha256(SARAH-K9X7)`.
6. Stamps `school.founding_teacher_id = Sarah`, locks 50% revenue share, marks code `redeemed`.
7. Issues JWT, principal lands in their dashboard.

**Every subsequent login:**
1. Principal types `SARAH-K9X7` at `/montree/login-select`.
2. Server's referral precheck sees status=`redeemed` → returns null → falls through.
3. Existing `tryPrincipalLogin` does `legacySha256(SARAH-K9X7)`, finds the matching `password_hash`, logs them in.
4. JWT issued, principal in dashboard.

**Edge cases (handled):**
- Code revoked before use → 401 "This referral code has been revoked. Please contact whoever sent it to you."
- Code expired → 401 "This referral code has expired. Ask your contact for a fresh one."
- Wrong code → 401 standard "Invalid code".
- Direct-signup schools (no referral) → completely unaffected, keep their legacy 6-char codes.

---

## Exactly what was shipped (file-by-file)

10 files, 1,521 lines of code + docs, single commit `e0ee3c7d`.

### New files

| File | Purpose |
|------|---------|
| `migrations/186_referral_codes.sql` | DB schema — creates `montree_referral_codes` table + extends `montree_schools` with `referral_code_id` and `referral_code_used` columns. **🚨 You must run this in Supabase SQL Editor before the new tab works.** |
| `lib/montree/referral/code-gen.ts` | `generateUniqueReferralCode(displayName)` — produces `<FIRSTNAME>-XXXX` codes (4-char random suffix from the same I/O/0/1-free alphabet as login codes), checks the DB for collisions, retries up to 6 times. `nameToPrefix()` strips diacritics + non-alphanumerics, falls back to `AGENT` if nothing usable. |
| `app/api/montree/super-admin/referral-codes/route.ts` | Super-admin-only API. **POST** issues a code (auto-creates a shell `montree_teachers` row for non-teaching agents). **GET** lists codes with optional status filter, enriches with school name where redeemed. **DELETE** revokes pending codes only — redeemed codes are locked. |
| `components/montree/super-admin/ReferralsTab.tsx` | The 🎟️ Referrals tab UI — issue-code form (name, email, %, optional pitch label), reveal-once gold banner with Copy button, status filter tabs, table with code/agent/% /status/school/pitch/created/actions. Copy + Revoke buttons per row. |
| `docs/AGENT_REFERRAL_AND_FINANCIALS_PLAN.md` | Comprehensive build plan — every locked decision, full DB schema (all 3 tables planned), 7 build phases with effort estimates, Stripe Connect Express specifics, risks + open questions. |
| `docs/finance/accountant-onepager.md` | For your HK accountant. Revenue model, money flow (Stripe → Wallex), three cost categories (direct cost of revenue / referral commissions / operating expenses), USD base, monthly export pack contents, seven explicit questions you need answers to (especially: classify commissions as cost-of-sales vs operating expense?). |

### Modified files

| File | Change |
|------|--------|
| `app/montree/super-admin/page.tsx` | Imported `ReferralsTab`, added 🎟️ Referrals to the tab type union, added the tab button in the nav row, added the conditional render block. |
| `app/api/montree/try/instant/route.ts` | Added `resolveReferralCode()` helper that validates a code BEFORE creating any school records (returns clear error on bad code so signup fails cleanly rather than half-creating). On success, stamps `school.founding_teacher_id` (the AGENT, not the new teacher), `revenue_share_pct`, `revenue_share_active=true`, `referral_code_id`, `referral_code_used`. Marks the referral code as `redeemed`. Wired into all three role branches: teacher, principal, homeschool_parent. |
| `app/montree/try/page.tsx` | Added `useEffect` that reads `?ref=CODE` from `window.location` on mount (avoids Suspense-boundary requirement of `useSearchParams`). Stores in `referralCode` state, shows a small gold banner on every step until success ("Referral code: SARAH-K9X7 · You'll be linked to your referrer"). Passes `referral_code` in the POST body alongside `locale`. |
| `CLAUDE.md` | Session 90 entry capturing decisions + status. |

---

## How redemption works under the hood (so future-you remembers)

1. School clicks `https://montree.xyz/montree/try?ref=SARAH-K9X7`.
2. `app/montree/try/page.tsx` `useEffect` reads `?ref=SARAH-K9X7` on mount, stores it in state, shows the gold banner.
3. School fills in their details, hits submit. POST body includes `referral_code: "SARAH-K9X7"`.
4. `app/api/montree/try/instant/route.ts` calls `resolveReferralCode()` BEFORE any DB writes:
   - Looks up the code in `montree_referral_codes`.
   - Validates: status === `pending`, not expired.
   - Throws an error (returned as 400) if anything is off — signup fails clean, no half-state.
5. School row is created normally.
6. After school creation, the route fires three updates concurrently:
   - `montree_schools.founding_teacher_id` ← the AGENT's id (overrides the new teacher)
   - `montree_schools.revenue_share_pct` ← `50.00` (or whatever you set)
   - `montree_schools.revenue_share_active` ← `true`
   - `montree_schools.referral_code_id` ← the code's UUID
   - `montree_schools.referral_code_used` ← `'SARAH-K9X7'`
   - `montree_referral_codes.status` ← `'redeemed'`
   - `montree_referral_codes.redeemed_by_school_id` ← the new school's id
   - `montree_referral_codes.redeemed_at` ← now
7. Diagnostic step `4a-referral-redeemed:SARAH-K9X7` is logged so you can grep Railway logs to confirm.

---

## What is NOT shipped yet

Phases 1 + 2 are live. The following are still ahead.

### Critical gaps

1. **No Stripe Connect onboarding for Sarah.** Phase 3. She has no automated payout rail yet — you'll Wallex-wire her manually month one.
2. **No Stripe school subscription billing.** Phase 4. Schools are still on manual `personal_classroom` → `school` transitions. Without this, the payout calculator has nothing to read from for revenue.
3. **No payout calculator.** Phase 5.
4. **No Money tab / financial dashboard.** Phase 6.
5. **No agent dashboard refresh.** Phase 7. Sarah, if she's also a teacher, can already see `/montree/dashboard/earnings` from Session 72 — but the page assumes the old self-serve model and won't reflect this new flow correctly.

### Smaller gaps

- The new tab uses Tailwind dark-slate styling (matches the rest of super admin) instead of the dark-forest aesthetic from Session 83 — consistent with all the other admin tabs that haven't been converted yet.
- No email to the agent when a code is created — you copy and send it manually.
- No notification to Tredoux when a school redeems a code — visible in the Referrals tab on next refresh, but no real-time ping.
- No bulk-issue (one code at a time).
- Pre-existing `/montree/for-teachers` landing page still pitches the old self-serve "20% if you bring in your school" model. Either repurpose or retire — Phase 7 decision.

---

## Sarah pitch flow — exactly what to do

**Before Sarah pitches:**

1. Run migration 186 in Supabase. Open `migrations/186_referral_codes.sql`, paste into SQL Editor, run. Verify `SELECT * FROM montree_referral_codes;` returns an empty table with the right columns.
2. Wait for Railway to finish deploying commit `e0ee3c7d`. Watch dashboard for green tick.
3. Hard-refresh `/montree/super-admin` (Cmd+Shift+R) to load the new bundle.
4. Click the 🎟️ Referrals tab. Confirm it loads (no 500 error).

**Issuing Sarah's code:**

1. Click "+ Issue code".
2. Agent name: `Sarah` (use just her first name — the code prefix derives from this).
3. Email: her email.
4. Revenue share %: `50`.
5. Pitch label: optional, e.g. `Greenfield Montessori — May 2026 pitch`.
6. Click Generate. Code appears in gold banner — Copy it.
7. The code is also visible in the table below as Pending.

**Send Sarah:**

> Hi Sarah,
> Here's your code: **SARAH-K9X7**.
> When you're with the school, send the principal this link:
> `https://montree.xyz/montree/try?ref=SARAH-K9X7`
> They click → fill in their school details → they're in.
> You're locked to that school at 50% revenue share for as long as they're a paying subscriber.

**After the school redeems:**

- Open the Referrals tab. Sarah's row will show status **Redeemed** with the school's name.
- Open the Schools tab. The school row will show Sarah's id on `founding_teacher_id` and `revenue_share_pct = 50`.
- Look for `4a-referral-redeemed:SARAH-K9X7` in Railway logs as the smoke-test.

---

## Next session priorities (in order)

1. **End-to-end test on production** after Railway redeploys `d73a1d94`. Concrete checklist below.

2. **Send the accountant one-pager to your HK accountant.** Email draft already in your Gmail (draft `r2430204512620199011`) — review and send when ready. Their answers, especially the cost-of-sales vs operating-expense classification for commissions, affect Phase 6 (Money tab) categories.

3. **Confirm with your banker** that Stripe Connect Express is HK-supported and Wallex receives the deposits cleanly. Affects Phase 3.

4. **Phase 3 — Stripe Connect onboarding.** ~1.5 days. Send Sarah a one-time link, she completes Stripe's hosted form, we capture her account ID. After this lands she's set up to receive automated payouts.

5. **Phase 4 — Stripe school subscription billing** (precondition for automated revenue). 3-4 days. Until this ships, the Money tab will fall back to manual entry of monthly gross per school.

6. **Phase 5 — payout calculation engine.** 1.5 days. Idempotent monthly job that aggregates revenue + costs per school, calculates each agent's cut, writes to `montree_agent_payouts`.

7. **Phase 6 — Money tab in super admin.** 2-3 days. Income / direct costs / commissions / op-ex / P&L / monthly Accountant Pack ZIP export.

8. **Phase 7 — agent dashboard refresh + decide on `/for-teachers` page.** 0.5 days.

## Phase 2 production verification checklist

After Railway finishes deploying `d73a1d94`:

1. **🚨 Migration 186 must be run first** — verify in Supabase:
   ```sql
   SELECT count(*) FROM montree_referral_codes;  -- should return 0 or more, not error
   SELECT referral_code_id FROM montree_schools LIMIT 1;  -- column should exist
   ```
2. **Issue a test code** — open `/montree/super-admin` → 🎟️ Referrals → "+ Issue code" → fake agent (e.g. name "Test", email "test@example.com", 50%). Confirm `TEST-XXXX` returned.
3. **Pending → signup redirect** — open private window → `/montree/login-select` → type the test code → expect immediate redirect to `/montree/try?ref=TEST-XXXX` with the gold banner showing the code.
4. **Complete redemption** — pick role=Principal → fill in school + name + email → submit → expect to land in principal dashboard.
5. **Code is now login** — log out → `/montree/login-select` → type the same `TEST-XXXX` → expect to land directly in the principal dashboard. This is the proof Phase 2 works.
6. **Verify DB state** — `SELECT status, redeemed_by_school_id FROM montree_referral_codes WHERE code='TEST-XXXX';` → status should be `redeemed`. `SELECT founding_teacher_id, revenue_share_pct, referral_code_used FROM montree_schools WHERE referral_code_used='TEST-XXXX';` → all three should be populated.
7. **Revoke a fresh code** — issue another test code, then immediately revoke from the table. Try logging in with it — expect 401 "This referral code has been revoked."
8. **Confirm legacy login still works** — try logging in as Tredoux (Whale Class principal, code `ZNGLJT` per Session 87). Should work unchanged.

---

## Carry-overs from Session 89 (still open)

- User to verify bingo calling cards on industrial printer
- User to read v8 term reports end-to-end
- Verify Library Tools tiles render on production
- End-to-end test Sentence Match + Sorting Mat generators
- Test super-admin Leads bulk clean
- Two-stage Language Presentation flow (paused mid-stream when grammar fix took priority)
- Run migration 184 (still pending — needed for Tracy interaction logging)
- Send 3 hot lead Gmail drafts (Ardtona, FAMM, Тамі)
