# Multilingual Build — Final Handoff (Session 63, Apr 24, 2026)

## PRIORITY 1: Ship Spanish for Argentina (FAMM Lead)

FAMM Argentina (Marisa Canova de Sioli) is the #1 multiplier lead — an AMI Foundation + Training Center that collaborates with "numerous educational institutions." They asked for pricing, AMI compatibility, and a CV. Spanish support would be a competitive advantage in the demo.

### What Already Exists (zero code changes needed)

| Item | Status | File |
|------|--------|------|
| `'es'` in `SUPPORTED_LOCALES` | ✅ Done | `lib/montree/i18n/locales.ts` |
| `es.ts` translation file (1,490+ keys) | ⚠️ **STUB** — all values copied from `en.ts`, not translated | `lib/montree/i18n/es.ts` |
| Spanish area labels | ✅ Done | `lib/montree/i18n/area-labels.ts` |
| `LOCALE_AI_CONFIG` Spanish entry | ✅ Done | `lib/montree/i18n/locale-config.ts` |
| `LOCALE_TO_INTL` Spanish date format | ✅ Done | `lib/montree/i18n/locales.ts` |
| `LanguageToggle` cycles through 3 locales | ✅ Done | `components/montree/LanguageToggle.tsx` |
| All IIFE Records have `es` slots | ✅ Done | ~89 files converted in Layer 3 |
| All `t()` keys resolve through `es.ts` | ✅ Done | 681 call sites across 127 files |

### What Needs to Be Done

**Step 1 — Translate `es.ts` — ✅ COMPLETE (Session 64, Apr 24, 2026)**

All ~3,713 keys translated to Argentine Spanish via two-pass Haiku API batch + manual audit-fix cycle. Uses proper voseo (tocá, ingresá, guardá, querés, podés, mirá), ustedes for plural, AMI-standard Montessori terms. Three audit passes confirmed zero English stubs remaining.

**Step 2 — Curriculum work names in Spanish — ✅ COMPLETE (Session 65, Apr 25, 2026)**

All 418 Whale Class works batch-translated to Argentine Spanish via Haiku tool_use pipeline. All 5 write paths updated with `name_es: null` INSERTs and Spanish pass in `batchTranslateWorksInBackground()`. `add-custom-work` now calls `autoTranslateWork(input, 'es')` fire-and-forget. Total cost: ~$0.87. Committed: `7e1c4918`.

Argentine schools need Spanish curriculum work names. Two options:

- **Option A (fast, recommended for now):** Add `name_es` column to `montree_classroom_curriculum_works`. Batch translate via the existing `autoTranslateToChinese()` pattern — generalize to `autoTranslateWork(input, targetLocale)`. Same glossary-first + Haiku-fallback pipeline.
- **Option B (future):** Migrate to JSONB `_localized` columns (`name_localized: { en: "...", zh: "...", es: "..." }`). Already designed in `docs/MULTILINGUAL_ARCHITECTURE.md`. More elegant but requires DB migration. Do this when a 4th language is needed.

For Option A, the write paths that need updating (same 7 paths as the `name_zh`/`name_chinese` dual-column fix from Session 14):
1. `lib/montree/auto-translate.ts` — generalize to accept target locale
2. `app/api/montree/curriculum/batch-translate/route.ts` — accept locale param
3. `app/api/montree/principal/setup-stream/route.ts` — seed `name_es` from static JSON (add `spanishName` to curriculum JSONs)
4. `app/api/montree/principal/setup/route.ts` — same
5. `app/api/montree/guru/photo-insight/add-custom-work/route.ts` — translate on custom work creation
6. `app/api/montree/admin/reseed-curriculum/route.ts` — seed from static JSON
7. `app/api/montree/admin/backfill-curriculum/route.ts` — seed from static JSON

**Step 3 — Review AI prompt config (~1 hour)**

`LOCALE_AI_CONFIG.es` in `locale-config.ts` already has a `systemPromptSuffix` and `languageName`. Review for:
- Argentine Spanish phrasing in the system prompt suffix
- Montessori glossary terms (add to the `glossary` field if needed)
- Game plan generation: verify Haiku produces natural Argentine Spanish nudges/directions
- Parent narrative generation: verify Sonnet writes warm, natural parent letters in Argentine Spanish

**Step 4 — Game plan bilingual JSONB extension (~30 min)**

The bilingual game plan JSONB pattern (Session 49) currently stores `{ en: "...", zh: "..." }`. Extend to `{ en: "...", zh: "...", es: "..." }`:
- `lib/montree/reports/replan-child.ts` — add `nudge_es` to tool schema, add `es` key to post-processing
- `app/api/montree/children/[childId]/game-plan/refresh/route.ts` — same
- `scripts/run_replan_all_whale.mjs` — same (for batch regen)
- `resolveLocalized()` in `GamePlanCard.tsx` already handles N languages — no render changes needed

**Step 5 — Test end-to-end (~1 hour)**

Programmatic audit COMPLETE (Session 65, Apr 25, 2026):
- ✅ 418/418 Whale Class works have `name_es` — zero missing
- ✅ `name_es` present in all 5 INSERT write paths
- ✅ `batchTranslateWorksInBackground()` runs Spanish pass in both setup routes
- ✅ `add-custom-work` fires `autoTranslateWork(input, 'es')` fire-and-forget
- ✅ 3,713 es.ts keys — zero English stubs remaining
- ✅ Zero new TypeScript errors introduced

Manual UI verification PENDING — requires running app with Spanish locale:
1. Switch locale to Spanish in the app
2. Verify all UI strings render in Spanish (not English fallback)
3. Generate a Weekly Wrap report — verify parent narrative is in Spanish
4. Open a child page — verify game plan nudge/works/direction in Spanish
5. Open Photo Audit — verify all labels, area badges, status pills in Spanish
6. Open parent dashboard — verify full parent experience in Spanish

### What Does NOT Need to Change

- **Zero code changes in components or API routes** — the multilingual build already made everything locale-agnostic
- **No new feature flags** — Spanish is just another locale value
- **No middleware changes** — locale is stored in school settings, not URL
- **No DB schema changes** (for Option A, just one `ALTER TABLE ADD COLUMN`)
- **`resolveLocalized()` / `resolveLocalizedArray()`** — already handle N languages
- **All IIFE Records** — already have `es` slots with fallback to English

### Estimated Total Effort

| Task | Time | Blocking? |
|------|------|-----------|
| Translate `es.ts` (batch + review) | 4-6h | Yes — everything depends on this |
| Curriculum `name_es` column + batch translate | 2h | Yes — for curriculum views |
| AI prompt review | 1h | No — English fallback works |
| Game plan JSONB extension | 30min | No — English fallback works |
| End-to-end test | 1h | Yes — final verification |
| **Total** | **~9-10h** | |

### Demo-Ready Shortcut (2-3 hours)

If FAMM Argentina asks for a demo before full translation is done, a minimal viable Spanish experience can be shipped in 2-3 hours:
1. Translate only the ~200 parent-facing keys in `es.ts` (parent dashboard, report view, login, narratives)
2. Skip curriculum translation — English work names are internationally recognized in Montessori
3. Skip game plan JSONB — falls back to English nudge, which is fine for a demo
4. AI narratives will generate in Spanish automatically via `LOCALE_AI_CONFIG.es` — just verify the output reads naturally

---

## Status: ALL 5 PHASES COMPLETE ✅

The 3x3x3x3x3 development cycle for making Montree fully multilingual is **finished**.

| Phase | Status | Sessions |
|-------|--------|----------|
| 3x RESEARCH | ✅ COMPLETE | Session 58 |
| 3x PLAN | ✅ COMPLETE | Session 58 |
| 3x INVESTIGATE | ✅ COMPLETE | Session 59 |
| 3x BUILD | ✅ COMPLETE | Sessions 59-62 |
| 3x AUDIT | ✅ COMPLETE | Session 63 |

## Commits (chronological)

| Commit | Description |
|--------|-------------|
| `99fe8f3e` | Build fix: unescaped apostrophe in `en.ts` |
| `bd7abba7` | Layer 3: convert 17 files (153 ins, 63 del) |
| `fb542929` | Layer 3: last 2 voice-note ternaries |
| `8fa6eecb` | Commit all Layer 3+4+5 changes (38+ files) |
| `b5e42dbd` | Fix guru/route.ts: dangling `isZh` → locale-agnostic |

## What Was Built

### Layer 0-1: Foundation Infrastructure (10 files)
- `lib/montree/i18n/locales.ts` — Canonical `Locale` type, `SUPPORTED_LOCALES`, `isValidLocale()`, `LOCALE_TO_INTL`
- `lib/montree/i18n/locale-config.ts` — `LOCALE_AI_CONFIG`, `getAILanguageInstruction()`, `getLanguageName()`
- `lib/montree/i18n/db-helpers.ts` — `getLocalizedWorkName()`, `getLocalizedField()`, `getLocalizedColumn()`
- `lib/montree/i18n/localized-types.ts` — `resolveLocalized()`, `resolveLocalizedArray()` JSONB resolvers
- `lib/montree/i18n/es.ts` — Spanish translation file (stub, all 1,490+ keys)
- `lib/montree/i18n/area-labels.ts` — Map-of-maps `AREA_LABELS`, Spanish labels added
- Updated: `context.tsx`, `server.ts`, `index.ts`, `LanguageToggle.tsx`

### Layer 3: Ternary Sweep (~89 files, ~563 occurrences converted)
All `=== 'zh'` ternaries converted to locale-agnostic patterns:
- **Client-side**: `t()` translation keys
- **Server-side**: IIFE Record pattern: `(() => { const L: Record<string,string> = { zh: '...', es: '...' }; return L[locale] || 'default'; })()`

### Layer 4: AI Pipeline (11 files)
- `teacher-report-generator.ts`, `narrative-generator.ts` — locale-keyed `Record` maps
- `conversational-prompt.ts`, `ai-generator.ts`, `pdf-generator.ts` — locale-config helpers
- `sonnet-draft.ts`, `extraction.ts`, `prompts.ts` — IIFE Records for prompts
- All AI routes now use `getAILanguageInstruction(locale)` instead of hardcoded Chinese strings

### Layer 5: Type Widening (16 files, 28 annotations)
- All `locale: 'en' | 'zh'` narrowed types → `Locale` from `locales.ts`

## Conversion Pattern Reference

| Type | Pattern | Count | Action |
|------|---------|-------|--------|
| TYPE A | Inline label ternaries | ~346 | Converted to `t()` or IIFE Record |
| TYPE B | DB column reads (`name_chinese`, `name_zh`, etc.) | 512 | **PRESERVED** — these read actual DB columns |
| TYPE C | Area label ternaries | 5 | Converted to `getAreaLabel()` |
| TYPE D | Date format ternaries | 42 | Converted to `getIntlLocale()` |
| TYPE E/F | AI prompts + conditional logic | ~211 | Converted to `LOCALE_CONFIG` / `getAILanguageInstruction()` |
| TYPE G | Locale normalization | few | Converted to `isValidLocale()` |
| TYPE H | List separators (`'、'` vs `', '`) | 3 | Converted to locale-keyed Record |

## Audit Results

3 consecutive clean passes:
- **116 remaining `=== 'zh'` occurrences** across 44 files — ALL are TYPE B (DB column reads)
- **0 TYPE A violations** — every conversion target was converted
- **0 `== 'zh'` occurrences** — none exist

## How to Add a New Language

Adding a language is now a config change + one script. Run:

```
node scripts/add-language.mjs <locale>
```

The script prints all required steps. Summary:

1. Run `ALTER TABLE` SQL in Supabase (adds `name_{locale}`, `parent_description_{locale}`, `why_it_matters_{locale}`)
2. Add `'<locale>'` to `ENABLED_LOCALES` in `lib/montree/locales-config.ts` (ONE LINE)
3. Create `lib/montree/i18n/{locale}.ts` — copy `en.ts`, translate all ~3,713 keys
4. Add area labels to `AREA_LABELS` map in `area-labels.ts`
5. Add `LOCALE_AI_CONFIG` entry in `locale-config.ts`
6. Add `LOCALE_TO_INTL` / display name / short label entries in `locales.ts`
7. Run batch translate via `POST /api/montree/curriculum/batch-translate` with `target_locale`

**Zero additional code changes** in components, API routes, or write paths — `ENABLED_LOCALES` drives all of them.

### Locale Onboarding Architecture (Session 66, Apr 25, 2026)

Two new shared modules centralize locale handling for curriculum INSERTs and background translation:

| File | Purpose |
|------|---------|
| `lib/montree/locales-config.ts` | `ENABLED_LOCALES`, `buildLocaleInsertFields()`, `getNameColumn()` |
| `lib/montree/insert-curriculum-work.ts` | `batchTranslateAllLocales()`, `translateAllLocales()` |

Five write paths now import from these modules instead of duplicating locale logic:

| Write Path | Change |
|------------|--------|
| `principal/setup-stream/route.ts` | `buildLocaleInsertFields()` + `batchTranslateAllLocales()` |
| `principal/setup/route.ts` | Same |
| `guru/photo-insight/add-custom-work/route.ts` | `translateAllLocales()` replaces inline 3b+3c blocks |
| `admin/reseed-curriculum/route.ts` | `buildLocaleInsertFields()` |
| `admin/backfill-curriculum/route.ts` | `buildLocaleInsertFields()` |

Note: `add-custom-work` zh translation now uses Haiku tool_use (same as all other locales) instead of the previous Sonnet raw-JSON path — this is intentional, making zh consistent with the system-wide pattern.

Committed: `cc47fe9c` (Session 66, Apr 25, 2026)

## Known Items NOT in Scope

- **TYPE B preserves are intentional** — 512 occurrences of `name_chinese`, `name_zh`, etc. read actual PostgreSQL columns. These are NOT conversion targets.
- **6 Sonnet-hardcoded routes** still need `resolveReportModel()` gating — orthogonal to i18n.
- **DB migration for `_localized` JSONB columns** — additive, not yet needed. Current dual-column (`name` + `name_zh`) pattern works. JSONB migration planned for when a 4th language ships.

## Files Reference

See `docs/MULTILINGUAL_PLAN.md` for the original architecture plan.
See `docs/MULTILINGUAL_ARCHITECTURE.md` for the bilingual JSONB pattern used in game plans.
See `docs/MULTILINGUAL_BUILD_HANDOFF.md` for the Layer 3 file-by-file conversion log.
