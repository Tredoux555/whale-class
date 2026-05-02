# Session 81 — Two-Path Onboarding + Voice Onboarding Hardening + Critical 503/500 Fixes + Super Admin Restored + Language Semester v7 Port (May 2–3, 2026)

**16 commits pushed to `main`. Outreach can restart once user verifies on production.**

This session was a big one. We started polishing the WorkWheelPicker, ended up redesigning the entire onboarding entry point, hit a cascade of latent 503/500s that had been silently breaking shelves and progress writes, restored super-admin visibility regressions, and ported the canonical v7 end-of-semester report format into the in-app generator.

## Commit log (top to bottom = oldest to newest)

| Commit | Title |
|---|---|
| `fd4cb638` | WorkWheelPicker brand pass: emerald/gold status dots + softened area badge |
| `618b023f` | getAreaLabel: normalize 'math' alias to 'mathematics' |
| `0c55a0e3` | WorkWheelPicker: localize global-search area badge via getAreaLabel |
| `d42727bc` | Voice onboarding: Update (additive) + Shelf Editor + persist is_focus |
| `a281f9fe` | Voice onboarding shelf editor: always render 5-area frame |
| `9d4a7757` | Onboard: always seed 5 focus works (one per area), Sonnet best-guesses |
| `c18fd212` | Voice onboarding polish: foundation copy + dashboard-shelf parity + prominent search |
| `fcab43bc` | Remove legacy WorkSearchBar from child page + fix Chinese leak in search |
| `8391b541` | Two-path onboarding choice: Tell me about my class / Just start with photos |
| `7c5e5724` | Audit fixes: prevent dashboard flicker + delete orphaned WorkPickerModal |
| `941bcaa6` | Health check fix: maxDuration=90 on Whisper transcribe (was 503-ing) |
| `294a0648` | Health check: maxDuration on 25 AI-calling routes (was 503-prone) |
| `beb0ffd1` | CRITICAL FIX: stop writing is_focus to montree_child_progress (column doesn't exist) |
| `17ae7b9b` | Super admin: always render API spend (was hidden when $0) |
| `8a1b26d4` | Language Semester Report: port v7 format into in-app generator |
| `1bee23ea` | Super admin: restore visible spend + fix 'Never' activity for active schools |

## Headline themes

### A. Two-Path Onboarding Choice (`8391b541`)

The forced auto-redirect to voice onboarding is gone. When a teacher first lands on the dashboard with un-onboarded children, they get a clean full-screen choice with the canonical copy (locked):

> **Tell me about my class** — 90 seconds per child. I'll build their profiles and your first reports will sound like you wrote them.
>
> **Just start with photos** — Skip ahead. Take photos and watch the dashboard come alive. Your first reports will focus on what we observed this week.

Path A routes into the existing voice onboarding flow (unchanged). Path B writes `montree.onboardingChoice.<classroomId> = 'photo'` to localStorage and drops onto the dashboard. The choice doesn't nag on refresh. Bulk-import callback no longer auto-redirects to voice — it bumps `pendingOnboardingCount` so the choice surfaces unless the teacher already chose photo.

New component: `components/montree/onboarding/OnboardingPathChoice.tsx`. Dynamic-imported with `ssr: false`. Dark forest aesthetic with emerald mic icon (path A) and gold camera icon (path B). 6 i18n keys filled across 12 locales.

### B. Voice Onboarding Hardening — Update flow + Shelf Editor + 5-area frame

**Update flow (`d42727bc`)** — "Try again" renamed to "Update". Tapping it preserves the prior transcript via `priorTranscript` state and `isUpdateModeRef`. The next recording's transcript is prepended with `[Teacher added more:]` separator and Sonnet builds a merged profile rather than replacing it. Each Update accumulates more context.

**Shelf Editor stage (`d42727bc` + `a281f9fe`)** — after "That's right", the orchestrator now lands on a per-student shelf editor that mimics the dashboard's `FocusWorksSection` exactly (same `AREA_DOT_RGB` colors, same row chrome, same status badge, same chevron). 5 area slots ALWAYS render in canonical PL/S/M/L/C order — empty slots show a brand-emerald dashed pill (was `+ Add custom work`, then changed to just the area label per user feedback). Tap any row → opens WorkWheelPicker for that area. WorkWheelPicker's amber "+ Add custom work" pill creates new curriculum works inline. "Looks great →" advances to the next student.

**Onboard always seeds 5 focus works (`9d4a7757`)** — the extraction tool gained 5 required `focus_<area>` + 5 `focus_<area>_status` fields. Sonnet now MUST pick one work per area (matching what teacher said when possible, best-guessing otherwise) from the classroom curriculum. New `seedFocusWorks()` function runs ALWAYS regardless of expLevel: 3-pass match (exact ILIKE → fuzzy ILIKE → canonical fallback that auto-creates the curriculum row). Status preservation via SELECT-then-UPDATE-or-INSERT — never downgrades a higher status from breadth seeding. **Later partly rolled back in `beb0ffd1` because the `is_focus` writes were hitting a non-existent column.**

**Foundation copy (`c18fd212`)** — processing screen says "Laying the foundation for {name}" instead of "Processing / Putting it all together for {name}".

**WorkWheelPicker search bar prominence (`c18fd212`)** — promoted to primary interaction per user feedback ("teacher will use this more than the scrolling"). Larger input (`pl-14 pr-12 py-4 text-lg`), brighter resting state, bolder border, magnifier icon at `22x22 white/55`, focus state has emerald glow ring. Reads as the most important element on the picker screen.

### C. WorkWheelPicker Brand Pass (`fd4cb638` + `618b023f` + `0c55a0e3`)

Status dots moved on-brand: practicing was stock blue (`#3b82f6`) → brand emerald (`#34d399`); presented was stock orange (`#f59e0b`) → brand gold (`#E8C96A`). Mastered keeps deep emerald (`#10b981`) for visual differentiation.

Top area badge softened: solid per-area color (e.g. hot pink for Practical Life) replaced with emerald-tinted surface + subtle area-color border. Localized letter prefix via `getAreaPrefix()` renders inside.

`getAreaLabel` gained the same `'math' → 'mathematics'` normalization that `getAreaPrefix` already had. Fixes a regression where the heading would render literally `"math"` for that area in some entry paths.

Global search overlay area badge (the pill on each search result) localized via `getAreaLabel(w.area_key, locale)` instead of the old `locale === 'zh' ? area_name_zh : area_name` ternary that fell back to English for 9 of 12 locales.

### D. WorkSearchBar Removal + Chinese Leak Fix (`fcab43bc`)

The "Find a work" search bar at the top of `[childId]` page is gone. New works flow through the photo-capture pipeline (camera → identify → confirm), so the search-and-add input was redundant. The legacy white-theme `WorkPickerModal` it opened was also broken (took teacher to area view, not specific work; adding made the work disappear) — both removed.

Files touched: `[childId]/page.tsx` lost the `WorkSearchBar` import + render, the `WorkPickerModal` dynamic import + mount, and the dead state (`pickerOpen`, `selectedArea`, `loadingCurriculum`, `onAddWork`, `openPicker`, `addWorkFromHook` destructure). `WorkPickerModal.tsx` deleted entirely (`7c5e5724`).

`WorkSearchBar` component itself is KEPT — still used on the curriculum directory page where searching is essential nav.

**Chinese leak root cause:** `WorkSearchBar`'s dropdown rendered `result.work.name_chinese` as a subtitle on EVERY result regardless of locale. English-mode teachers saw "Carrying a Chair / 搬椅子", "Walking on the Line / 线上行走" stacked. Fix: primary label uses `getLocalizedWorkName(work, locale)`, Chinese subtitle removed entirely. Search now matches against canonical English + the active locale's name. Audited every other `name_chinese` reference in user-facing surfaces — `WorkSearchBar` was the only offender. Whale-Class admin pages (print, description-review, classroom report) intentionally bilingual, kept as-is.

### E. CRITICAL: 503/500 Cascade Resolved

Three layers of latent failures, all surfaced and fixed this session:

**Layer 1 — Whisper transcribe missing maxDuration (`941bcaa6`)** — `app/api/montree/voice-notes/transcribe/route.ts` had no `export const maxDuration`. Railway/Next.js default is 15s. Whisper on a 60–90s recording exceeds 15s, Railway kills the container, returns 503. Fix: `export const maxDuration = 90`. The user hit this exactly when expected — tapping "Update" on the review screen kicked off a fresh recording, which got chopped at 15s.

**Layer 2 — 25 AI-calling routes missing maxDuration (`294a0648`)** — health-check sweep found a systemic gap. Every route that calls Anthropic / OpenAI / Whisper without declaring `maxDuration` inherits the 15s default. Sonnet-on-heavy-prompt or cold-start spike → 503. Bulk-fixed via Python script that found the last `import` line in each file and injected `export const maxDuration = N` after it:
- 15 heavy Sonnet routes → 120s (weekly-review, weekly-review/apply-shelf, guru/weekly-review, photo-insight, snap-identify, teaching-instructions, photo-enrich, generate-work-content, daily-plan, end-of-day, classroom-setup/describe, photo-audit/tell-ai, children/weekly-admin, children/activity-summary, weekly-planning/upload)
- 1 transcribe-style → 90s (`guru/transcribe`)
- 9 quick Haiku → 60s (work-guide, quick, concern, suggestions, smart-note, works/guide, community/works/[id]/guide, tts, admin/import)
- 25/25 modified, 0 errors, 0 skips.

**Layer 3 — `is_focus` column doesn't exist on `montree_child_progress` (`beb0ffd1`)** — commits `d42727bc` and `9d4a7757` introduced writes to an `is_focus` column that has never existed in production. No migration ever added it. Postgres rejected every write → 500 on every progress update. The user surfaced it as "I tried to manually add a work and got 500." But the impact was wider — `seedFocusWorks` was silently failing inside try/catch, which is why earlier in the session the user's seeded shelves came back empty after onboarding.

**The insight that unlocked it:** the dashboard's progress GET route at `app/api/montree/progress/route.ts` line 243 DERIVES `is_focus` from the legacy `montree_child_focus_works` table (focusMap lookup), not from a column on `montree_child_progress`. The focus shelf has always worked off `focus_works` as the source of truth. We just need to stop writing the non-existent column and let the legacy mirror keep doing its job.

Three files fixed:
- `app/api/montree/progress/update/route.ts` — removed the `record.is_focus = !!is_focus` upsert addition + the post-upsert demote block. Kept the legacy `focus_works` mirror block intact.
- `app/api/montree/children/[childId]/onboard/route.ts` — `seedFocusWorks` lost `is_focus: true` from both UPDATE and INSERT branches. Lost the demote block. `seededShelf` SELECT lost `is_focus` from the column list and the sort comparator simplified to status priority alone.
- `app/montree/dashboard/voice-onboarding/page.tsx` — `onSwapWorkSelected` KEPT `is_focus: true` in the request body. The route uses it to trigger the legacy `focus_works` mirror — which IS what makes the swapped work appear as the area focus on the dashboard. The body field is the trigger, not the persisted column.

### F. Super Admin Restored (`17ae7b9b` + `1bee23ea`)

Two regressions the user caught:

1. **API spend column** — was rendered alongside the Free/Pro tier pill but `text-slate-600` on dark slate background = invisible. Schools with $0 spend looked like tracking was missing. Fix: `text-slate-600 → text-slate-500` for $0 spend, `text-slate-400 → text-slate-300` for active spend, calls count same upgrade. Spend rendering already reads `api_spent_this_month` and `api_calls_this_month` from the API response — data was never lost, just invisible.

2. **"Never" last_active for active schools** — `last_active = max(last_guru_interaction, last_media_upload)` had two gaps: guru interactions only fire when teacher uses Guru directly, and `recentMedia` is `.limit(500)` globally so schools outside the top-500-most-recent get nothing. Fix in `app/api/montree/super-admin/schools/route.ts`: existing `apiUsageRaw` query now also captures `created_at`. New `lastApiUsageMap` tracks max(created_at) per school. `last_active` candidates = `[interaction, media, api_usage]` filtered for nulls then `Math.max`. Any school making any AI-routed call gets accurate activity.

### G. Language Semester Report — v7 Format Ported (`8a1b26d4`)

The `term-reports-v7/` outputs (21 PPTXs from `scripts/generate-term-reports.mjs`) were the canonical end-of-semester format we landed on after 7 iterations. Ported the v7 prompt rules into `app/api/montree/reports/language-semester/generate/route.ts` so future end-of-semester runs go through the in-app flow.

REPORT_TOOL descriptions tightened:
- `para_opening`: 25-30 words HARD LIMIT (was ~30-40)
- `para_circle`: 60-70 words total, 1-2 sentences per point, "do NOT repeat the work name twice", "every sentence must be COMPLETE" (was ~75-90 words, 2-3 sentences)
- `para_english`: 20-25 words HARD LIMIT, "Do NOT start with Dear" (was ~25-30)

System prompt added these v7 rules:
- Do NOT start `para_english` with "Dear"
- NEVER repeat a work name twice in the same sentence
- NEVER invent work names — use ONLY the exact names from ALLOWED list
- Every sentence MUST be complete — never trail off or end mid-thought
- Total body (opening + circle) MUST stay under 110 words

Still TODO (deferred, not blocking outreach):
- `postProcess`: strip `Dear X,` from closing if Sonnet emitted one
- `postProcess`: de-dupe `Work - Work` and `Work (Work)` patterns
- `scrubHallucinatedWorks`: stricter (no fuzzy substring match, expanded `SAFE_STARTS` regex)
- `trimToWords`: better fallback when joined string ends with bare punctuation (no trailing space)

The v7 script (`scripts/generate-term-reports.mjs`) is the canonical reference if there's any doubt about format.

## i18n state

12 locales at 100% parity. `npm run i18n:check` passes strict mode. New keys added across the session:
- `voiceOnboarding.review.update` + `voiceOnboarding.review.updateHint`
- `voiceOnboarding.shelfEditor.title/subtitle/tapToSwap/addCustom/confirm/empty`
- `voiceOnboarding.processing.layingFoundation`
- `dashboard.onboardingChoice.title/subtitle/voiceTitle/voiceBody/photoTitle/photoBody`

All Haiku-batch translated. Pre-commit strict check verified each commit.

## Architectural rules locked in this session

- **`is_focus` is NOT a column on `montree_child_progress`.** Never write to it. The legacy `montree_child_focus_works` table is the source of truth for focus, and `progress/route.ts` line 243 derives `is_focus` for clients from that table. Future code should respect this — if true `is_focus` persistence is wanted on the progress table, ship a migration first then re-enable writes.
- **Every AI-calling route MUST declare `maxDuration`.** Default 15s will 503 most Sonnet calls and any Whisper call >15s. Use 60s for quick Haiku, 90s for transcribe, 120s for heavy Sonnet, 300s for batch generations.
- **Two-path onboarding: voice flow stays opt-in.** The forced auto-redirect is the wrong default. Photo-driven is the canonical Montessori-aligned path. Voice is the front-loading shortcut for teachers who want it. The choice copy is canonical and locked across 12 locales — do not "improve" the wording.
- **Voice onboarding shelf editor mirrors the dashboard exactly.** Same `AREA_DOT_RGB` colors, same row chrome, same status badge, same chevron. If the dashboard shelf evolves, the editor must evolve with it.
- **Sonnet's `focus_<area>` extraction is REQUIRED, never null.** The 5 fields (one per area) plus their statuses are required in the tool schema. Empty curriculum is handled via the 3-pass match in `seedFocusWorks` with hardcoded canonical fallbacks.
- **`Update` button on review = additive merge, not replace.** Prior transcript + separator + new transcript → Sonnet sees the full history. The previous result stays visible until the next pass returns.
- **No bilingual stacking in user-facing UI.** One language per locale. The Chinese subtitle in `WorkSearchBar` was the last user-facing offender — gone. Whale-Class admin pages intentionally bilingual, those are internal.

## Outstanding / deferred (not blocking)

- **Language semester `postProcess` polish** — strip Dear from closing, de-dupe work names, stricter scrub, better trim fallback. v7 script has these; in-app route still missing them. Worth 30 min when convenient.
- **`Update` additive transcript unbounded growth** — after 5 Updates the combined text could reach 10–15KB. Not a 503 cause, just inefficient. ~5-line FIFO cap is the fix.
- **WorkPickerModal alternate dark-forest rebuild** — the file is now deleted, but Session 80 mentioned this. Now resolved by removal.
- **Welcome script tone review** for zh/ja/ko/uk versions of `voiceOnboarding.welcome.*` — Haiku reliable for short functional copy but can come back literal-but-flat for longer warm passages.
- **Free-tier gate decision** — voice onboarding currently works for all tiers including Free. Cost is ~$1/classroom. Gate via `resolveReportModel()` 402 if we want Free-tier blocked.
- **TYPE B sweep across components** (Session 78 carry-over) — remaining `locale === 'zh' ? work.x_zh : work.x` ternaries should be replaced with `getLocalizedField()` everywhere. Hot files: `components/montree/photo-audit/ThisIsSheet.tsx`, `components/montree/curriculum/EditWorkModal.tsx`, `components/montree/super-admin/*`.

## Outreach carry-over (still parked)

- 3 hot lead Gmail drafts: Copenhagen, Paint Pots UK, Ardtona House UK. Already in Gmail. Awaiting Tredoux send.
- FAMM Argentina follow-up — past Apr 28 deadline.
- Welcome Тамі (Школа Монтессорі) in Ukrainian — first organic Ukrainian signup.
- Resend domain verification — verify `montree.xyz` in Resend, update `RESEND_FROM_EMAIL` in Railway.

## Verification status

- ✅ All 16 commits pushed to `origin/main`. Railway auto-deploys triggered.
- ✅ Lint clean across all touched files (only pre-existing warnings).
- ✅ All 12 locales at 100% i18n parity. Pre-commit strict check passes.
- ✅ Service worker correctly excludes `/api/` from caching (line 73 of `montree-sw.js`).
- ✅ The 500 cascade resolved after `beb0ffd1` deployed — `is_focus` writes gone, voice onboarding's `seedFocusWorks` should now successfully INSERT.
- ⏳ User to verify on production: tap "Update" on review screen, manually add a work on child page, generate a Language Semester Report and confirm v7 format quality.

## Next session priorities

1. **Verify production looks right** — open dashboard with un-onboarded children, expect choice screen with the canonical copy. Tap "Tell me about my class" → voice onboarding flow lands. Tap "Just start with photos" → empty dashboard with photo CTA, choice doesn't reappear on refresh.
2. **Generate one Language Semester Report through the app** — confirm v7 quality (word limits, no work-name repeats, complete sentences, no "Dear" in closing).
3. **Finish v7 `postProcess` polish** — strip Dear, de-dupe work names, stricter scrub, better trim. ~30 min.
4. **Send the 3 hot lead Gmail drafts.**
5. **FAMM Argentina follow-up.**
6. **Welcome Тамі in Ukrainian.**
7. **Resend domain verification.**
