# Cowork Session Handoff — Jun 13–14, 2026 — Vault backfill + System health check

Covers: (1) the story-vault mobile backfill (DONE, verified), and (2) a
comprehensive system health check with fixes on branch `health-check-jun14`.

---

## 1. Story vault mobile — backfill DONE + verified

The Jun-13 deploy fixed NEW vault uploads but the EXISTING backlog still used the
slow paths (encrypted videos = full-file decrypt per Range; images = no
thumbnail). A one-time backfill script (`scripts/backfill-vault-media.mjs`,
idempotent) was run against production:

- **24 / 24 photos** now have a ~480px JPEG thumbnail (`thumbnail_path` set, object stored unencrypted).
- **3 / 3 videos** re-stored as `encrypted_key='plain'` (range-streamable signed URL, like new uploads). One 3.3MB `from-message` clip needed several retries due to flaky VPN→Supabase(Singapore) network; landed on a clear window.

**Verified end-to-end** (not just logs): structural check via storage `list`
(every thumbnail + original + plain-video object present); 6/6 sampled thumbnails
are valid JPEGs; all 3 videos return **HTTP 206** (range-seekable) with valid MOV
headers. This is **live production data** — independent of any code branch — so
the vault should already be smooth on the phone. Re-open the vault app, unlock,
and confirm.

Note: old encrypted video objects were left in storage as harmless orphans
(safety over tidiness). Optional cleanup later.

---

## 2. System health check (Jun 14)

Four parallel read-only domain audits ran (security/tenant-isolation, AI
cost/reliability, API+DB correctness, build/type/test/i18n/PWA).

**Headline: the system is in good shape.** Deploy gates green (i18n 12/12, tests
143/143, build not blocked), **no CRITICAL security holes**, tenant isolation is
well-disciplined (the `audit:tenant-scoping` CI guard passes; `verifyChildBelongsToSchool`,
`resolveAuthorizedParent`, `verifySuperAdminAuth`, vault-token, middleware gate,
CSRF, timing-safe compares, fail-closed rate limiting all present and correct).

### FIXED — branch `health-check-jun14`, commit `70b46564`

| # | Severity | Fix |
|---|---|---|
| 1 | CRITICAL (functional) | `lib/montree/guru/pattern-learner.ts` queried non-existent `montree_works` → area inference was permanently dead (silent null). Now does a two-step lookup on `montree_classroom_curriculum_works.area_id` → `montree_classroom_curriculum_areas.area_key`, with `.maybeSingle()`. |
| 2 | CRITICAL (functional) | `lib/montree/admin/guru-executor.ts` feature-toggle tool verified against non-existent `montree_feature_toggles` AND upserted a non-existent `feature_name` column → tool was a 100% no-op. Now verifies `montree_feature_definitions(feature_key)` and upserts `montree_school_features(feature_key, enabled_by)` with correct `onConflict`. |
| 3 | HIGH (cost) | `tracy/draft-response` + `tracy/scan-thread` hardcoded `OPUS_MODEL` → billed Opus ($15/$75 per MTok) to non-Opus schools on every parent-thread draft/scan. Switched to `AI_MODEL` (Sonnet), matching the rest of the Astra surface. |
| 4 | MEDIUM | `app/api/montree/pulse/route.ts:113` used `supabase.rpc(...).catch()` — the query builder never rejects, so a failed lock-release silently leaked the Pulse lock. Now captures `{ error }` and logs it. |
| 5 | MEDIUM (security) | Removed 4 leftover debug/diagnostic routes: `debug-insight` (had a **cross-tenant media read** — no school_id filter), `debug-upload`, `clip-test`, `guru/clip-test`. |
| 6 | MEDIUM | `app/api/montree/guru/transcribe` (Whisper, bills per audio-minute) had no rate limit. Added 30/min per teacher, mirroring `voice-notes/transcribe`. |
| 7 | LOW (defensive) | Escaped LIKE metacharacters in 3 unescaped `.ilike()` filters: `admin/media-library`, `whale/montessori-works`, `super-admin/guru-executor` (lead search). |

**Reaudit after fixes:** i18n 12/12 PASS, tests 143/143 PASS, eslint **0 errors**
on all changed files (the 32 warnings are pre-existing `no-explicit-any`, not
introduced here).

**To deploy:** branch `health-check-jun14` is ready for review. Merge to `main` →
Railway auto-deploys. **No new migrations needed** for these fixes. (Branch also
carries the Jun-13 PM handoff doc + the backfill script + brain updates.)

### NOT fixed — documented follow-ups (deliberately deferred)

Real but either risky on a live app (Apple review in flight) or large mechanical
sweeps better done deliberately:

- **6 Sonnet routes skip the tier gate** (free/Haiku schools billed full Sonnet): `classroom-setup/describe` (vision), `photo-audit/tell-ai`, `children/[childId]/weekly-admin`, `weekly-review/[childId]/apply-shelf`, `onboarding/voice/custom-work`, `admin/import`. Plus `parent-meetings/[meetingId]/analyse`. Fix = add `resolveReportModel()` → 402 + pass `tier.model`. Touches monetization + onboarding flows — do as a focused, tested pass. (`onboarding/voice/custom-work` is hit during trial signup — test carefully.)
- **Guru generic-read allowlist + prompt hints** still reference phantom `montree_works` / `montree_feature_toggles` strings (guru-executor `GLOBAL_TABLES`, guru-tools, guru-prompt, super-admin equivalents). The *write* path (toggle tool) is fixed; these read-hints are lower impact. Correcting `feature_toggles`→`feature_definitions(feature_key,name,default_enabled)` is safe; `montree_works` needs care (the real table is classroom-scoped, conflicts with GLOBAL_TABLES "not school-scoped" semantics — don't just add it).
- **Lint/type debt** (not deploy-blocking): 26 `@ts-nocheck` files, ~7 React-Compiler "memoization could not be preserved" errors, ~1,400 `no-explicit-any` warnings, stale `eslint-disable` directives. tsc ratchet baseline is **5,233** (the brain's "743" figure measured a narrower scope — reconcile the two numbers).
- **Legacy `whale/parent/*` routes** use a dead/incorrect auth model (service-role `auth.getUser()`, legacy tables). Confirm dead → delete, or migrate to `resolveAuthorizedParent`.
- **3 `whale/ai/*` routes** (daily-plan, weekly-plan, activity-guidance) lack `maxDuration` (→ 503 on the Sonnet call) and the two GET ones are auth-light. Legacy single-school Whale Class tools.
- **Guru child-lookup `.single()`** in `guru/end-of-day` (+ concern/weekly-review siblings) → `.maybeSingle()` + null guard. Mostly cosmetic (they read `{data}` only) but tidies logs.
- **`100vh` → `100dvh`** sweep: 51 files / 71 occurrences (worst: classroom-overview ×7, which may be intentional print CSS).

---

## 3. Other open items (carried from Jun 13)

- **Loom login-item** removal — System Settings → General → Login Items (the app + all `~/Library` leftovers are already gone; only the login-item entry may remain, harmless).
- **Apple review** (live): verify demo codes WYXMN9/BAM4S9 on device, **extend demo trial past Jun 19**, recapture 2 weak screenshots, confirm support@montree.xyz inbound.
- **Cloudflare 1034** intermittent — flip montree.xyz + www to DNS-only (`docs/DNS_ERROR_1034_FIX.md`).
- Separate repos untouched: jeffy-mvp (`security-fixes-jun13`), Guardian Connect (`flutter-catchup-jun12`).
