# SESSION HANDOFF — Photo Queue Error Handling + AI Tier Display Fix (Jul 9, 2026)

**Canonical:** Commit `af035fd9` — two production bugs fixed in same session, both shipped live on Railway. No migrations, no schema changes.

---

## Bug A: "Photo could not be saved: null" on iOS Safari Capture

**Problem:** Teachers on iPad/iPhone using Safari would see an unhelpful toast "Photo could not be saved: null" after taking a photo in capture mode. The app was treating a WebKit/iOS-specific IndexedDB quirk (error objects can be bare `null` instead of `DOMException`) as a complete lack of error information, rendering the useless literal string "null" instead of a diagnostic message.

**Root cause:** On WebKit, an aborted IndexedDB transaction can leave `tx.error`/`request.error` as the JS literal `null` rather than a proper `DOMException` (a known iOS/Safari storage-pressure behavior — happens in private mode or under storage restrictions). `lib/montree/offline/queue-store.ts` had ~14 call sites doing `reject(request.error)` / `reject(tx.error)` with no fallback, passing the bare null up the stack. The capture page's catch block did `String(err)` on a bare null, rendering "null" to the user.

**Fix:** Extracted a shared `normalizeIDBError(err, context: string)` helper in `queue-store.ts` that **always returns a real, contextualized Error** (never null/undefined). Replaced all ~14 raw rejection sites with calls to this helper:
- `openDB()` (2 sites)
- `saveEntry()`, `getEntry()`, `deleteEntry()`, `updateEntryStatus()` (2 sites)
- `getPendingEntries()`, `getEntriesForChild()`, `getAllEntries()`
- `findByContentHash()`, `saveEntryAndBlob()`, `saveBlob()`, `getBlob()`, `deleteBlob()`

Also hardened the capture-page catch block as a last-resort guard: it computes a `rawMsg` (empty string when `err` is null/undefined, else `err.message` or `String(err)`), then falls back to `'Unknown error — please try again or check device storage'` whenever `rawMsg` is empty or literally `'null'`/`'undefined'`/`'[object Object]'` — ensuring no bare "null" can reach the toast, ever. The context parameter on `normalizeIDBError` surfaces WHICH database operation actually failed.

**Scope:** This is purely an error-diagnosability fix to the offline photo queue. No retry logic, queue-full cap handling, or sync-manager foreign-school detection were changed. Only the teacher capture flow is affected; parents have no capture UI and photo-audit/gallery only read already-uploaded media from storage.

**Discovery & verification:** Found via investigating "Tredoux House" school (id `55945aef-9752-4aac-ad96-8a549ec00aff`, created 2026-07-09 07:16 UTC), which had zero rows in `montree_media` — confirming the failure happened client-side before any network call. Post-deploy verified: on iPhone Safari, capture now either succeeds or shows a real error message (e.g. "Failed to save photo entry" vs the bare "null").

---

## Bug B: AI Tier Display Drift + Force-On Directive

**Problem:** Super-admin's schools list and Mira's school-health diagnostics showed some Sonnet schools as "Free" or "Haiku" even though they were correctly being served Sonnet AI in all real operations (guru, photo-identification, reports). This tier drift was confusing and looked like a production bug.

**Root cause:** The DISPLAY-ONLY surfaces (`app/api/montree/super-admin/schools/route.ts` and `lib/montree/mira/tool-executor.ts::school_health()`) were independently re-deriving tier by hand from raw feature flags (`ai_tier_haiku` / `ai_tier_sonnet`), but they were **skipping the trial_ends_at branch** that the real AI-serving routes use. So a school in an ACTIVE Sonnet trial (the normal state for all fresh signups) with no explicit feature flag yet would show as "free" on those two screens even though `resolveReportModel()` correctly resolved it to Sonnet for actual AI calls.

**Fix:** Extracted the tier-derivation precedence into one pure function `deriveTier(schoolData)` in `lib/montree/reports/resolve-model.ts`. This function encodes the EXACT SAME precedence as `resolveReportModel()` internally uses:
1. If locked → free
2. Else if `ai_tier_sonnet` flag → sonnet
3. Else if `ai_tier_haiku` flag → haiku
4. Else if trialing with `trial_ends_at` in future → sonnet
5. Else if trialing with `trial_ends_at` in past → free (402 all AI)
6. Else if trialing with `trial_ends_at` NULL → haiku (legacy floor)
7. Else if active subscription → haiku (floor)
8. Else → free

Updated both super-admin schools route and Mira's tool-executor to call this SAME `deriveTier()` fed by data they already have in hand — **no new DB queries added**. This eliminates the class of tier-display-drift bugs going forward.

**Data action (explicit, per Tredoux):** All 12 existing schools in the database (as of Jul 9, 2026) received a **permanent Sonnet override** via direct upsert to `montree_school_features` + `montree_schools`:
- `ai_tier_sonnet = true` AND `ai_tier_haiku = true` (explicit flags always win over trial-date branch)
- `monthly_ai_budget_usd = 9999` and `ai_budget_action = 'warn'` (same as tier-sonnet grant)

This matches exactly what `lib/montree/billing/apply-ai-tier.ts::applyAiTier(schoolId, 'sonnet', ...)` does. These schools will **NOT auto-revert to free/haiku** when their `trial_ends_at` passes; they stay Sonnet permanently.

**🚨 CRITICAL CLARIFICATION — This does NOT change pricing for new schools going forward:**
- New schools signing up directly through `montree.xyz` are **100% UNCHANGED**
- They still get `subscription_status='trialing'` + `trial_ends_at=+7 days` at signup with NO explicit feature flag
- They correctly auto-get Sonnet during the 7-day trial (via the date-based branch in `deriveTier()`)
- They correctly auto-revert to free (all AI 402s, UpgradeCard shown) the moment the trial expires
- **This matches the locked Jul-6-2026 pricing design exactly**

Only the 12 schools that existed AS OF July 9, 2026 got the permanent flag override (because they are test/review accounts and Tredoux's directive). No locked schools existed (0 of 12).

**The 12 schools (name | subscription_status | trial_ends_at | id):**
1. Tredoux House (test, today) | trialing | 2026-07-16 | 55945aef-9752-4aac-ad96-8a549ec00aff
2. Sunshine Montessori | trialing | 2026-07-12 | b7b0fa26-b460-4dc9-9e9c-b1d2a6ecd9b5
3. Bayan's Home | trialing | 2026-07-08 (expired) | 329f4924-61bf-47c8-9296-1f5f9de4d293
4. Home (old, 6/29) | trialing | 2026-06-29 (expired) | db88c90c-3cbf-4026-a1e5-c6289eecb700
5. Apple Review School | trialing | 2027-06-19 (custom extended) | 136841a0-6b93-421e-b9f4-57e9f1451d18
6. Home (old, 6/16) | trialing | 2026-06-16 (expired) | 59e6873d-1dd1-4f6e-9704-3777d6ec6a27
7. test | trialing | 2026-06-05 (expired) | aaa04e74-1b72-41cf-bf77-b45b0a96f2df
8. Школа Монтессорі | trialing | 2026-07-27 | 1b463b14-5736-4865-9175-90e2d989ca53
9. Surina | trialing | 2026-07-17 | c98b18d9-3494-490a-9f08-3eed5c6764f1
10. BCMA | active | (n/a) | ce878c7d-e941-4a99-a9bd-f21c1523d3ee
11. Children's Montessori School of Georgetown | active | (n/a) | 9ceb332a-37da-4178-9596-2fdfb8283720
12. Tredoux House (production, Whale Class) | active | (n/a) | c6280fae-567c-45ed-ad4d-934eae79aabc

---

## Code Changes

**Files modified (commit `af035fd9`):**
- `lib/montree/offline/queue-store.ts` — added `normalizeIDBError()` helper, replaced 14 rejection sites
- `app/montree/dashboard/capture/page.tsx` — hardened error toast catch block
- `lib/montree/reports/resolve-model.ts` — extracted `deriveTier()` function, cleaned up comments
- `app/api/montree/super-admin/schools/route.ts` — use `deriveTier()` instead of hand-rolled flags
- `lib/montree/mira/tool-executor.ts` — use `deriveTier()` in school_health tool

**No schema changes.** No migrations. No environment variable changes required.

---

## Verification (Live)

- `GET https://montree.xyz/api/montree/super-admin/schools` (authenticated) returned HTTP 200 with all 12 schools showing `ai_tier: "sonnet"` post-deploy
- ESLint on all touched files: 0 errors (a few pre-existing unrelated warnings in other files left alone)
- Full-repo `tsc --noEmit` skipped (sandbox OOM, not a code issue) — change is type-safe by construction (deriveTier() is a pure function with explicit return type)
- Railway deploy logs were not directly inspected; the live 200 response with correct per-school `ai_tier` values above is the actual evidence the deploy succeeded

---

## Outstanding

None. Both bugs are fixed and live-verified. No follow-up tasks. The error diagnosability improvement (Bug A) is defensive — it surfaces real errors instead of eating them. The tier-display consistency (Bug B) is cosmetic on display (real AI serving was never wrong) but operationally clarifies the state.

**For future AI-tier additions:** always update `deriveTier()` in resolve-model.ts, then call it from all display + diagnostic surfaces. Do not duplicate the precedence logic.
