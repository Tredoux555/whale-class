# Session 90 Handoff — Agent Referral Programme, Phase 1

**Date:** May 6, 2026
**Commit:** `e0ee3c7d` on main
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

## ⚠️ Important nuance — read this before promising Sarah anything

You asked for the code to be the school's **login**. What shipped is the code being the school's **referral link** at signup. There's a small but real difference:

**What ships TODAY:**
- School clicks the referral link → lands on the trial signup form → fills in details → school + principal accounts created → school is linked to Sarah.
- The principal still gets a separate 6-character login code emailed back at signup (the existing flow).
- The referral code itself is NOT the principal's password.

**What was originally pitched ("type the code → you're in the school") — Phase 2:**
- School types `SARAH-K9X7` at the login screen → if pending, routed to school signup → if redeemed, treated as the principal's password and they're in their dashboard.
- Requires hashing the referral code into `montree_school_admins.password_hash` at redemption.
- About a half-day's work. Slot it in next session if you want it before Sarah pitches.

The Phase 1 flow IS still a "give them this code/link, they're set up and you're paid" experience — it just goes through a signup form rather than a login box. For Sarah's first pitch this is genuinely fine.

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

These are the gaps between Phase 1 and the full vision. Documented so future-you can pick up the right next thing.

### Critical gaps

1. **The code isn't yet the principal's login.** Phase 2. ~Half a day. See "Important nuance" above.
2. **No Stripe Connect onboarding for Sarah.** Phase 3. She has no automated payout rail yet — you'll Wallex-wire her manually month one.
3. **No Stripe school subscription billing.** Phase 4. Schools are still on manual `personal_classroom` → `school` transitions. Without this, the payout calculator has nothing to read from for revenue.
4. **No payout calculator.** Phase 5.
5. **No Money tab / financial dashboard.** Phase 6.
6. **No agent dashboard refresh.** Phase 7. Sarah, if she's also a teacher, can already see `/montree/dashboard/earnings` from Session 72 — but the page assumes the old self-serve model and won't reflect this new flow correctly.

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

1. **Phase 2 — code as principal login.** Half a day. Hash the redeemed referral code into `montree_school_admins.password_hash` at signup, plus handle the `/montree/login-select` flow so typing a referral code routes correctly (pending → signup, redeemed → login). This delivers the original "type the code, you're in the school" UX.

2. **Send the accountant one-pager to your HK accountant.** Run in parallel with Phase 2. Their answers — especially the cost-of-sales vs operating-expense classification for commissions — affect Phase 6 (Money tab) categories.

3. **Confirm with your banker** that Stripe Connect Express is HK-supported and Wallex receives the deposits cleanly. Affects Phase 3.

4. **Phase 3 — Stripe Connect onboarding.** ~1.5 days. Send Sarah a one-time link, she completes Stripe's hosted form, we capture her account ID. After this lands she's set up to receive automated payouts.

5. **Phase 4 — Stripe school subscription billing** (precondition for automated revenue). 3-4 days. Until this ships, the Money tab will fall back to manual entry of monthly gross per school.

6. **Phase 5 — payout calculation engine.** 1.5 days. Idempotent monthly job that aggregates revenue + costs per school, calculates each agent's cut, writes to `montree_agent_payouts`.

7. **Phase 6 — Money tab in super admin.** 2-3 days. Income / direct costs / commissions / op-ex / P&L / monthly Accountant Pack ZIP export.

8. **Phase 7 — agent dashboard refresh + decide on `/for-teachers` page.** 0.5 days.

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
