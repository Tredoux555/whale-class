# Session Handoff — Lyf Coach rename + portfolio audit + App Store prep
**Jun 19, 2026 (Cowork, evening).** Picks up from `SESSION_SANCTUARY_RENAME_JUN18.md`.

---

## TL;DR — where we stand

| Thing | State |
|---|---|
| **Lyf Coach** (was "Sanctuary") | Renamed, **own standalone repo**, **builds clean**, **crypto tests 2/2 green**, account-deletion + privacy page **built**. App Store **code blocker cleared**. |
| **Montree** | **Stripe is LIVE** (`sk_live_`, all 4 vars present). **Open for business** — first $ = Gloria closing one school. Migration 265 run. |
| **Coach pipeline** | Live (Chrome + now copy-paste). Coach's call: **Montree first**, Lyf Coach = StoreKit(iOS)+PayFast(web), **public** app. |
| **Pending on Tredoux** | Apple enrolment (from 🇿🇦), push the montree branch, extend demo-school trial, get Gloria a school. |

---

## What we did tonight

1. **Located & understood the app.** "Sanctuary" is the native iOS app that lived in `montree/native/Sanctuary/`. It's an **on-device-first** private journal/coach/planner/projects: Apple Foundation Models answer for free on-device by default; cloud Claude (`claude-sonnet-4-6`) only on an explicit "deeper coach" tap.
2. **Monetisation analysis** → `~/Desktop/Sanctuary_Coach_Monetization_Reply.md`. Headlines: **PayFast can't power the iOS in-app sub — Apple forces StoreKit/IAP**; meter **cloud** prompts not total (else the $14.99/500 tier loses money); cloud cost ~$0.03 typical/prompt; fair-use cap ~150–200 cloud prompts/mo.
3. **Renamed Sanctuary → Lyf Coach** everywhere users see it: `CFBundleDisplayName`, door title, Face ID prompt, in-app copy, App Store listing copy, **bundle id → `xyz.montree.lyfcoach`** (+ cryptotests id). **Kept** the internal crypto type names (`SanctuaryCrypto`) + `lib/sanctuary-e2e` so the byte-for-byte server parity holds.
4. **Broke it out into its own project** at `~/Desktop/Master Brain/ACTIVE/lyf-coach/` (its own git repo, openable like montree/jeffy). Left `montree/native/MOVED.md` as a pointer. The original `montree/native/Sanctuary/` is now stale (remove with `git rm -r` when ready).
5. **Verified:** regenerated with XcodeGen, **BUILD SUCCEEDED** in the new location, **crypto parity XCTest 2/2 passed**.
6. **Deep health check** → `lyf-coach/HEALTH_CHECK_JUN19.md`. Engineering is solid (Argon2id, Secure-Enclave ECIES wrap, fail-closed crypto, auto-lock). One hard blocker found: **in-app account deletion missing** → built (below).
7. **Full 6-project portfolio audit** → `~/Desktop/Portfolio_Audit_Jun19.md` (Montree, Lyf Coach, Ivy, Guardian Connect, Jeffy, Sentinel: state, gaps, time-to-$, costs).
8. **Monetisation timeline** → `~/Desktop/Monetisation_Timeline_Jun19.md`.
9. **Built account deletion** (clears App Store 5.1.1(v)):
   - iOS: new **Settings tab** → "Delete my account" (confirm alert) → wipes server data → forgets device. **iOS build green.**
   - Backend: **`DELETE /api/story/admin/account`** — deletes the account row by verified username + personal content scoped by space (best-effort per table).
10. **Built the Lyf Coach privacy page** → `app/lyf-coach/privacy/page.tsx` (URL `montree.xyz/lyf-coach/privacy` once deployed) — honest on-device-encryption copy for App Store Connect.
11. **Coach pipeline:** posted updates via Chrome; coach replied with direction (Montree first; StoreKit+PayFast; public app). Switched to **copy-paste** going forward.
12. **Confirmed Montree Stripe is LIVE** in Railway (`sk_live_`; `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PER_STUDENT`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` all present).
13. **Migration 265 run** by Tredoux ✓ (Lyf Coach e2e columns).
14. **Explained the "Apple Review School"** — it's the demo account created Jun 12 (`docs/APPLE_REVIEW_DEMO_SCHOOL.md`), NOT Apple snooping. `+applereview` is Gmail plus-addressing; "Frankfurt" is IP geo.

---

## Commits (NOTHING PUSHED — main untouched, no deploy)

**`lyf-coach` repo (new, standalone):**
- `cf871c0` standalone project (rename Sanctuary→Lyf Coach)
- `6ef3748` account deletion: Settings tab + Delete my account

**`montree` repo — branch `account-deletion-jun19` (main still at `c87e082c`):**
- `bf346dff` `DELETE /api/story/admin/account`
- `bdf5c277` `/lyf-coach/privacy` page

**Deliverable docs on `~/Desktop/`:** `Sanctuary_Coach_Monetization_Reply.md`, `Portfolio_Audit_Jun19.md`, `Monetisation_Timeline_Jun19.md`. In `lyf-coach/`: `HEALTH_CHECK_JUN19.md`, `README.md`.

---

## Where we're going — next actions

**Tredoux (this weekend / from South Africa):**
1. **Apple Developer enrolment from 🇿🇦** — on iPhone (Apple Developer app), SA SIM/IP/card. Enrolment kept choking from China behind a VPN ("not an Apple device" at final verify). **First resolve:** do you already have a developer account (Montree was being prepped for one)? Lyf Coach (`xyz.montree.lyfcoach`) + Montree (`xyz.montree.app`) share the prefix → use the **same** account, don't create a second.
2. **Review + push** branch `account-deletion-jun19` → deploys the delete endpoint + privacy page to prod. (Auto-deploys on push to main — review the destructive delete route first.)
3. **Extend the Apple-review demo school trial** (it expired Jun 19): `UPDATE montree_schools SET trial_ends_at = NOW() + INTERVAL '1 year' WHERE id = '136841a0-6b93-421e-b9f4-57e9f1451d18';`
4. **Get Gloria to close one school** → Montree's first dollar (Stripe is already live; the first real charge is the true end-to-end test).

**Next build (on coach's go):** Lyf Coach monetisation — **cloud-prompt metering** (count cloud calls only; bare integer for e2e accounts) + **StoreKit** (iOS) / **PayFast** (web). Then Lyf Coach App Store admin: reviewer demo account + screenshots + submit.

---

## Gotchas & invariants (read before touching)
- **montree `main` auto-deploys to Railway on push.** Don't push unreviewed; pushes are Tredoux's via Desktop Commander.
- **Crypto parity contract:** `lyf-coach/Tests/vectors.json` ↔ `montree/lib/sanctuary-e2e/vectors.json` must stay byte-identical; re-run both crypto tests if either changes. Do NOT rename the crypto types.
- **Live domain is `montree.xyz`** (`teacherpotato.xyz` retired). Lyf Coach app points at `https://montree.xyz` (`AppConfig.swift`).
- **Stripe is live** — the next real charge moves real money; watch the first one clear.
- **Lyf Coach lives in `lyf-coach/` now**, not `montree/native/Sanctuary/` (stale copy, see `MOVED.md`).
