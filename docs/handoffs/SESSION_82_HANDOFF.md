# Session 82 — Quick Guide System Structural Fix (3x3x3 Audit) (May 3, 2026)

**8 files changed locally. 0 commits pushed yet — ready for `git push origin main` when user is ready.**

This session applied the 3x3x3 audit methodology to the Quick Guide system after the user reported it was broken across multiple languages. What looked like a "stale state" bug turned out to be four separate structural defects layered on top of each other, all in the consumer code while the data layer was actually correct.

## TL;DR — what was broken

The Quick Guide modal (and its detailed-version sibling, plus two adjacent surfaces) was reading from "phantom" TypeScript fields (`quick_guide_zh`, `materials_zh`, etc.) that **no migration ever created and no API ever populated**. Plus, the URL-builder caller was hardcoded to only pass `&locale=` for `zh || es`, silently shipping English to nine other locales. Net effect:

| Locale | What user saw | Why |
|---|---|---|
| `en` | English (correct) | API returns English, modal reads `quick_guide` |
| `zh` | "No guide available" / blank body | API returns Chinese in `quick_guide`, modal reads phantom `quick_guide_zh` → undefined |
| `es` | Spanish (worked) | Locale passed; modal reads `quick_guide` |
| `de fr pt nl it ja ko uk ru` | English | Locale never sent to API → API defaults to English |

The user's report — *"shows English or Chinese, whatever was previous to the language change"* — was the felt experience of these four bug classes interacting plus modal state not refetching on locale change.

## The 3x3x3 audit method (preserved for future reference)

User's explicit methodology, run end-to-end this session:

1. **3x RESEARCH** — Audit codebase, count patterns, classify types
2. **3x PLAN** — Design architecture, write handoff, assess risks
3. **3x INVESTIGATE** — Deep-read every target file, verify plan fits, map exact line numbers
4. **3x BUILD** — Implement with audit cycles between rounds
5. **3x AUDIT** — Fix cycle until 3 consecutive clean audits

Each phase ran multiple rounds before advancing. After the initial five-phase pass declared "done," a self-audit caught two more files that had been missed (curriculum/page.tsx caller and WorkDetailSheet which never passed locale at all). Then an **independent fresh agent** was spawned with no context to re-derive the bugs from symptoms — confirmed the fix was sound and recommended the phantom-type cleanup as the final hardening step.

The methodology paid for itself: a "targeted fix" on 5 files turned into 8 files after the self-audit and independent review caught what the initial pass missed.

## Files changed (8)

### 1. `lib/montree/i18n/db-helpers.ts` — new canonical helper

Added `getLocalizedGuideField<T>(work, field, locale)` — the canonical pattern for reading translated guide-body content from a curriculum work row. Reads `work.guide_content_<locale>.<field>` (JSONB) with fallback to the English flat column.

```ts
getLocalizedGuideField(work, 'quick_guide', 'zh')
// → work.guide_content_zh.quick_guide ?? work.quick_guide

getLocalizedGuideField<string[]>(work, 'materials', 'es')
// → work.guide_content_es.materials ?? work.materials
```

This is now the **canonical pattern** for any future component that displays guide-body content (`quick_guide`, `materials`, `direct_aims`, `presentation_steps`, `control_of_error`, `why_it_matters`, `parent_description`).

### 2. `app/montree/dashboard/[childId]/page.tsx` — caller fix #1

Replaced hardcoded `if (locale === 'zh' || locale === 'es')` with the supported-locales gate:
```ts
if (locale !== DEFAULT_LOCALE && (SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
  url += `&locale=${locale}`;
}
```
Added imports for `SUPPORTED_LOCALES` and `DEFAULT_LOCALE`.

### 3. `app/montree/dashboard/curriculum/page.tsx` — caller fix #2 (caught in self-audit)

Same locale-pass fix as #2 — was previously even worse: `if (locale === 'zh') url += '&locale=zh';` (Chinese-only). Plus the modal display name was `locale === 'zh' && chineseName ? chineseName : workName` — only handled Chinese. Now resolves the localized name from `curriculum` state via `getLocalizedWorkName(work, locale)` so all 11 non-English locales show the right header.

### 4. `components/montree/child/QuickGuideModal.tsx` — phantom-field fix #1

```diff
- const guideText = locale === 'zh' ? guideData?.quick_guide_zh : guideData?.quick_guide;
- const materials = locale === 'zh' ? guideData?.materials_zh : guideData?.materials;
+ const guideText = guideData?.quick_guide;
+ const materials = guideData?.materials;
```
The API merges JSONB into the flat response fields server-side, so the modal just reads them. `locale` is no longer destructured from `useI18n()` (only `t`).

### 5. `components/montree/child/FullDetailsModal.tsx` — phantom-field fix #2

Same pattern, 5 fields: `quick_guide`, `direct_aims`, `materials`, `control_of_error`, `why_it_matters`. All read flat directly.

### 6. `components/montree/curriculum/CurriculumWorkList.tsx` — phantom-field fix #3 + hardening

7 read sites converted to use `getLocalizedGuideField()`. Added `Array.isArray()` guards around 3 array fields (`direct_aims`, `indirect_aims`, `materials`) in case any legacy JSONB row stored a string instead of array (Haiku's translation tool schema permitted both via `oneOf`). Without the guard, `.map()` would crash. Used IIFE pattern to extract once + guard + render.

The YouTube fallback at line 310 was `!work.quick_guide` (English-only); now `!getLocalizedGuideField<string>(work, 'quick_guide', locale)` — only renders when there's truly no guide in the active locale OR English fallback.

### 7. `components/montree/home/WorkDetailSheet.tsx` — caller fix #3 (caught in self-audit)

Was passing **no locale param at all** to `/works/guide`. Now passes for any non-English supported locale. Added `locale` to the useEffect dep array so the modal refetches if the user switches language while it's open.

### 8. `components/montree/curriculum/types.ts` — phantom type cleanup (independent agent's recommendation)

Surgically deleted the phantom-field declarations:
- `Work`: removed `direct_aims_zh`, `indirect_aims_zh`, `materials_zh`, `quick_guide_zh` (no DB columns ever existed)
- `QuickGuideData`: removed all 8 `_zh`-suffixed fields (API never returns them)

KEPT (these are REAL columns per migration 182): `name_chinese`, `parent_description_zh`, `why_it_matters_zh`, `control_of_error_zh`.

ADDED typed `guide_content_<locale>?: Record<string, unknown>` for all 11 non-English locales so `getLocalizedGuideField()` has type support.

## Architectural rules locked in (do NOT let future agents break these)

🚨 **The `/works/guide` API merges `guide_content_<locale>` JSONB into the flat response fields.** It NEVER returns `_zh`-suffixed body fields. Consumers should always read flat fields (`quick_guide`, `materials`, etc.) on the API response.

🚨 **`getLocalizedGuideField(work, field, locale)` is the canonical pattern** for reading translated guide-body content from a curriculum work row. Don't re-invent the lookup. Don't read from phantom columns.

🚨 **There are NO `quick_guide_<locale>`, `materials_<locale>`, `direct_aims_<locale>`, `indirect_aims_<locale>`, `presentation_steps_<locale>`, `control_of_error_<locale>` columns.** Only `guide_content_<locale>` JSONB exists for guide-body content (since migration 169). Reading any `<bodyField>_<locale>` will silently return undefined — TypeScript no longer gives you these as autocomplete options.

🚨 **`parent_description_<locale>`, `why_it_matters_<locale>`, `control_of_error_<locale>`, `name_<locale>` ARE real columns** (per migration 182's `apply_global_translations`). Read them via `getLocalizedField()` (existing helper) — NOT `getLocalizedGuideField()` (which only knows about JSONB).

🚨 **Every caller of `/api/montree/works/guide` MUST pass `&locale=`** for any non-English supported locale. Don't hardcode locale lists. Use `if (locale !== DEFAULT_LOCALE && SUPPORTED_LOCALES.includes(locale))`. Validated callers: `[childId]/page.tsx`, `curriculum/page.tsx`, `ShelfView.tsx`, `WorkDetailSheet.tsx`.

🚨 **Defensive `Array.isArray()` checks before `.map()` on guide-body arrays.** The Haiku translation tool schema permitted `oneOf: [array, string]` for `materials` and `direct_aims`. Old rows in production may have a string. Render-loop crashes are visible to the teacher.

## Verification status

| Check | Result |
|---|---|
| 5 phases × 3 rounds (RESEARCH/PLAN/INVESTIGATE/BUILD/AUDIT) | ✅ Complete |
| Self-audit caught missed callers | ✅ Found 2 more (curriculum/page, WorkDetailSheet) |
| Independent fresh-agent audit | ✅ Confirmed soundness, recommended phantom-type cleanup |
| Phantom-field reads anywhere in codebase | ✅ Zero (`grep` clean) |
| Phantom-field type declarations | ✅ Deleted from `Work` and `QuickGuideData` |
| ESLint on all 8 changed files | ✅ Zero new errors, zero new warnings |
| TypeScript full compile | ⚠️ Sandbox timeout at 30s (codebase too large) — Railway `next build` will catch |
| Production data populated for all 11 locales | ✅ Per CLAUDE.md Session 78 (migrations 180-182, all batch scripts ran) |
| User-side production verification | ⏳ User to verify after Railway deploy |

## Adjacent issues flagged (NOT in scope this session)

- **`components/montree/home/ShelfView.tsx` lines 441, 602, 870** — work *name* display uses `locale === 'zh' && work.chineseName ? work.chineseName : work.name`. Same TYPE B pattern as the original Quick Guide bug, but on work names (not guide content). Spanish/German/etc. users on the home/shelf view see English work names. Already on the radar from CLAUDE.md Session 75's "TYPE B sweep across components" TODO. Recommend addressing in a dedicated session along with the other listed files (`ThisIsSheet.tsx`, `EditWorkModal.tsx`, super-admin pages).

- **Pre-existing `@ts-nocheck` at `CurriculumWorkList.tsx:1`** — single ESLint error on the file but pre-existing (didn't touch). Future cleanup.

- **Reports routes (`weekly-wrap`, `send`, `preview`, `batch-narratives`)** — `parent_description_zh` / `why_it_matters_zh` are read with Chinese-only ternaries. Spanish/German/etc. parent narratives still render English. Already in CLAUDE.md Session 75/76 next-session priorities.

## Next session priorities

1. **🚨 Push to main + verify on Railway production** — open the dashboard with each locale (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru), tap a focus work, verify Quick Guide body shows in the right language. Verify Full Details modal too. Verify curriculum directory page → tap work → guide modal. Verify home shelf view's WorkDetailSheet.

2. **ShelfView work-name TYPE B fix** — addresses the adjacent surface flagged above. Estimated 30 min: convert 3 sites to use `getLocalizedWorkName(work, locale)` and verify shelf renders correctly across locales. Same pattern as the curriculum directory display-name fix in this session.

3. **Carry-over from Session 81:**
   - Verify production: tap "Update" on review, manually add a work, generate one Language Semester Report (v7 quality check)
   - Finish v7 `postProcess` polish (~30 min)
   - `Update` additive transcript FIFO cap (~5 lines)
   - Welcome script tone review for zh/ja/ko/uk
   - Free-tier gate decision for voice onboarding
   - Send 3 hot-lead Gmail drafts (Copenhagen, Paint Pots UK, Ardtona House UK)
   - FAMM Argentina follow-up (past Apr 28 deadline)
   - Welcome Тамі in Ukrainian
   - Resend domain verification
