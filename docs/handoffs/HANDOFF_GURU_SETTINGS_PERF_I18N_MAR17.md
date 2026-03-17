# Handoff: Per-School Guru Personality Settings + Performance + i18n + Library Fixes

**Date:** Mar 17, 2026
**Status:** COMPLETE — NOT YET PUSHED (pending VPN off)

---

## Session Summary

This session completed Priority #6 (Per-School Guru Personality Settings), verified Priorities #5/#8/#9 were already done, and fixed two user-reported bugs (library language toggle + multi-word picture bank).

---

## Feature 1 — Per-School Guru Personality Settings (Priority #6)

**What:** Principals can configure how the AI Guru communicates — tone, philosophy, focus areas, materials available, custom instructions. Settings are injected into every Guru conversation for that school.

**Architecture:** Uses existing `montree_schools.settings` JSONB column (no migration needed). New `guru_personality` key with 8 configurable fields.

**Files Created (2):**
- `app/api/montree/guru/settings/route.ts` — GET/PUT API with full validation (enum checks, char limits, prompt injection sanitization via regex)
- `app/montree/admin/guru-settings/page.tsx` — Settings UI: tone radio buttons (4 options with descriptions), communication style selector (3), age range picker (4), focus area checkboxes (5 Montessori areas), free-text fields for philosophy (500 chars), materials note (500), language preference (200), custom instructions (1000). Character counters, save button.

**Files Modified (6):**
- `lib/montree/guru/context-builder.ts` — Added `schoolGuruPersonality` to ChildContext interface, extracted from school settings (zero extra DB queries — reuses existing ESL school fetch)
- `lib/montree/guru/conversational-prompt.ts` — New `buildSchoolPersonalitySection()` function (~60 lines) builds formatted prompt section. Injected after persona+mode, before tool instructions. Handles null gracefully (backward compatible). Includes `TONE_LABELS`, `STYLE_LABELS`, `AREA_LABELS_FULL` maps.
- `app/api/montree/guru/route.ts` — Passes `childContext!.schoolGuruPersonality` as new parameter to `buildConversationalPrompt()`
- `app/montree/admin/page.tsx` — 🧠 button in header nav linking to `/montree/admin/guru-settings`
- `lib/montree/i18n/en.ts` — 40 new keys (`admin.guruSettings.*`)
- `lib/montree/i18n/zh.ts` — 40 new keys (perfect EN/ZH parity)

**Safety:**
- Guru reads settings but NEVER writes to them (human-only editing)
- Free text sanitized: strips "ignore all previous instructions", "you are now a", "system:", "prompt:" patterns
- Character limits enforced server-side
- Default behavior unchanged when no settings configured

---

## Feature 2 — Performance Optimization (Priority #9 — Earlier in Session)

**Status:** Highest-impact items DONE.

- **Cache-Control headers** added to ~24 additional API GET routes (now 59/87 routes cached). TTLs: 30s (messages/DM) to 3600s (work guides). Pattern: `private, max-age=N, stale-while-revalidate=M`.
- **Media DELETE parallelized** — 3 sequential awaits → `Promise.all`. Saves ~100-300ms per bulk delete.
- **verifyChildBelongsToSchool TTL cache** — 30-second module-level Map cache with `clearChildAccessCache(childId?, schoolId?)` export.
- **Discovery:** Most DB queries were already parallelized from prior sessions. DashboardHeader already had 5-min sessionStorage cache.

---

## Feature 3 — i18n Audit (Priority #8 — Earlier in Session)

**Status:** All 8 files from Priority #8 already fully wired. Only fix needed: 1 hardcoded toast in `admin/activity/page.tsx` → `t('admin.activity.fetchError')`. Added key to both en.ts and zh.ts.

---

## Bug Fix 1 — Language Toggle on Library Pages

**Problem:** Library pages were stuck in Chinese with no way to switch back to English. Pages used `useI18n()` for translations but never included the `LanguageToggle` component.

**Fix:** Added `<LanguageToggle />` to 5 library-related pages:
- `app/montree/library/page.tsx` — In nav bar (flex justify-between)
- `app/montree/library/tools/page.tsx` — In header next to back link
- `app/montree/library/photo-bank/page.tsx` — In nav next to upload button
- `app/montree/library/tools/vocabulary-flashcards/page.tsx` — In header
- `components/card-generator/CardGenerator.tsx` — In header after title

---

## Bug Fix 2 — Multi-Word Picture Bank Search

**Problem:** PhotoBankPicker only supported single-word search. Other tools (bingo, flashcards) support multi-word input.

**Fix:** Rewrote `components/montree/PhotoBankPicker.tsx`:
- `<input>` → `<textarea>` that auto-expands based on line count
- Newline-separated words detected → parallel `Promise.all` fetch per word
- Results grouped by word with green header badges showing word + count
- Single-word behavior unchanged (backward compatible)
- New state: `multiWordResults`, `isMultiWord`, `fetchMultiWord` callback

---

## Priority #5 — Seed Community Library

**Status:** Already seeded. Navigated to `/montree/super-admin/community` and clicked "Seed 329 Works" — response: "Seeded 0 works (329 already existed)".

---

## Deploy

⚠️ **NOT YET PUSHED.** No new migrations needed. Push command:

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: per-school guru personality settings, language toggles, multi-word picture bank, performance cache headers, i18n fixes" && git push origin main
```

**Still need to run (after push):**
- `psql $DATABASE_URL -f migrations/137_raz_4th_photo.sql`
- `psql $DATABASE_URL -f migrations/138_visual_memory.sql`

---

## Files Modified Summary (~35 files total)

| Category | Files | Changes |
|----------|-------|---------|
| Guru Settings (new) | 2 | API route + Settings UI page |
| Guru Settings (modified) | 4 | context-builder, conversational-prompt, route.ts, admin/page.tsx |
| i18n | 2 | en.ts (41 keys), zh.ts (41 keys) |
| Performance | ~26 | 24 API routes (Cache-Control), media DELETE, verify-child-access cache |
| Library language toggle | 5 | 5 pages with LanguageToggle added |
| Picture Bank | 1 | PhotoBankPicker multi-word rewrite |
| Activity i18n fix | 1 | 1 toast hardcoded → t() |

---

## Remaining Priorities

| # | Priority | Status |
|---|----------|--------|
| 1 | Deploy all local changes | ⚠️ Push pending (VPN off) |
| 2 | Rewrite Phonics Image Downloader | Ready to rewrite script |
| 3 | Fix i18n Chinese work names | ✅ DONE |
| 4 | Fix `{count}m ago` timestamp | ✅ DONE |
| 5 | Seed Community Library | ✅ DONE (329 already existed) |
| 6 | Per-School Guru Settings | ✅ DONE (this session) |
| 7 | Stripe Setup | Blocked on env vars |
| 8 | i18n Remaining Wiring | ✅ DONE |
| 9 | Performance Optimization | ✅ Highest-impact DONE |
| 10 | Story Vault Image Viewer | Deferred |
