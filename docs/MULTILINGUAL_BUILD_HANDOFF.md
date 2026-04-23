# Multilingual Build Handoff — Session 59 (Apr 24, 2026)

**Purpose:** Comprehensive handoff so a fresh session can continue the multilingual build without context loss.

**Goal:** Make Montree translatable into ANY language by adding a translation file — zero code changes, zero migrations per new language. Triggered by FAMM Argentina hot lead (Spanish competitive advantage).

**Development cycle:** 3x3x3x3x3 — RESEARCH ✅ → PLAN ✅ → INVESTIGATE ✅ → BUILD (IN PROGRESS) → AUDIT (pending)

---

## 1. What's DONE — Infrastructure (Layer 0 + Layer 1)

All 6 infrastructure files are created and working. These are the foundation everything else builds on.

### 1.1 `lib/montree/i18n/locales.ts` — Canonical locale definitions (NEW)
- `SUPPORTED_LOCALES = ['en', 'zh', 'es'] as const`
- `type Locale = (typeof SUPPORTED_LOCALES)[number]` — the single source of truth
- `DEFAULT_LOCALE: Locale = 'en'`
- `isValidLocale(s: string): s is Locale`
- `LOCALE_TO_INTL: Record<Locale, string>` — maps to Intl strings (`en→en-US`, `zh→zh-CN`, `es→es-ES`)
- `getIntlLocale(locale: string): string` — safe lookup with fallback
- `LOCALE_DISPLAY_NAMES`, `LOCALE_SHORT_LABELS`

### 1.2 `lib/montree/i18n/locale-config.ts` — AI prompt config per locale (NEW)
- `LocaleAIConfig` interface: `languageName`, `aiLanguageInstruction`, `aiShortDirective`, `yourChild`, `dateFormatHint`
- `LOCALE_AI_CONFIG: Record<Locale, LocaleAIConfig>` with full entries for en, zh, es
- `getAILanguageInstruction(locale)` — returns empty string for English, full "LANGUAGE REQUIREMENT: You MUST respond ENTIRELY in..." for others
- `getLanguageName(locale)` — returns "English", "Simplified Chinese (中文)", "Spanish (Español)"

### 1.3 `lib/montree/i18n/db-helpers.ts` — DB column resolution (NEW)
- `LOCALE_COLUMN_SUFFIX: { zh: '_zh' }` — add new language suffixes here
- `getLocalizedWorkName(work, locale)` — handles Chinese dual-column legacy (`name_chinese` + `name_zh`), general `name_{suffix}` pattern
- `getLocalizedField(obj, field, locale)` — generic resolution for any field (`parent_description`, `why_it_matters`, etc.)
- `getLocalizedColumn(field, locale)` — returns DB column name for Supabase queries (e.g., `getLocalizedColumn('name', 'zh')` → `'name_chinese'`)

### 1.4 `lib/montree/i18n/area-labels.ts` — Multilingual area labels (UPDATED)
- `AREA_LABELS_EN`, `AREA_LABELS_ZH`, `AREA_LABELS_ES` — per-locale maps
- `AREA_LABELS: Record<string, Record<string, string>>` — map-of-maps keyed by locale
- `getAreaLabel(area, locale)` — safe lookup with English fallback
- `getAreaArrowExample(locale)` — for AI prompt examples

### 1.5 `lib/montree/i18n/index.ts` — Barrel re-exports (UPDATED)
- Re-exports everything from all sub-modules
- 173 files import via this barrel — all get new exports automatically

### 1.6 Other completed infrastructure:
- `lib/montree/i18n/es.ts` — Spanish translation file (stub with all 1,490+ keys)
- `lib/montree/i18n/localized-types.ts` — extracted `resolveLocalized()`, `resolveLocalizedArray()` (JSONB resolvers)
- `lib/montree/i18n/context.tsx` — updated `Locale` import from `locales.ts`, added `'es'` support
- `lib/montree/i18n/server.ts` — updated with re-exports from new modules
- `components/montree/LanguageToggle.tsx` — cycle-through-all pattern for 3+ locales

---

## 2. What's DONE — Layer 4 AI Pipeline (2 core files)

Two core AI pipeline files fully converted. Zero `=== 'zh'` in narrative-generator. Only 3 intentional separator checks (`'、'` vs `', '`) remain in teacher-report-generator — these are TYPE H list separators and correct.

### 2.1 `lib/montree/reports/teacher-report-generator.ts` — ✅ COMPLETE

**15 total edits applied.** All `=== 'zh'` ternaries converted to locale-keyed `Record<string, string>` maps with English as default fallback. Key changes in `generateTeacherFallback()`:
- `area_analyses.narrative` — IIFE with `AREA_NARRATIVE` map, locale-aware work names + separators
- `concentration.narrative` — IIFE with `CONC_NAR` map using existing `CONC_GOOD`/`CONC_DEV` constants
- `normalization_narrative` — IIFE with `NORM_NAR` map using existing `NORM_GOOD`/`NORM_BUILD` constants
- `recommendations[].work_zh` → renamed to `work_localized` (no consumers used `work_zh`)
- `key_insight` — IIFE with `KEY_INSIGHT` map, locale-aware work names + area labels
- `teacher_guidance` — IIFE with `GUIDANCE` map replacing if/else chain
- 3 intentional `=== 'zh'` remain — all are list separator checks (`'、'` vs `', '`), correct behavior

### 2.2 `lib/montree/reports/narrative-generator.ts` — ✅ COMPLETE

**7 total edits applied.** Zero `=== 'zh'` remaining. Key changes:
- `generateTemplateFallback()` — Refactored to `TEMPLATES: Record<string, () => string>` map with zh/es builders + English default block. Spanish template added with full paragraph structure.
- No-photos narrative — `NO_PHOTOS: Record<string, string>` map with zh/es/English default via IIFE
- System message — `baseSystem + getAILanguageInstruction(locale)` pattern replaces hardcoded Chinese system prompt. Works for any locale automatically.
- `buildNarrativePrompt()` — Already used `getLanguageName(locale)` and `getAILanguageInstruction(locale)` from prior edits. No changes needed.

---

## 3. What's DONE — Other Files (from earlier in this build phase)

These files were fully converted in prior build rounds:

- **`lib/montree/guru/conversational-prompt.ts`** — All zh blocks replaced with locale-keyed patterns
- **`lib/montree/reports/ai-generator.ts`** — Fully rewritten for N-language
- **`lib/montree/reports/pdf-generator.ts`** — TYPE B + TYPE D fixed
- **22 files** with TYPE D date format replacements — all now use `getIntlLocale(locale)` from `locales.ts`

---

## 4. What's REMAINING — By Layer

### Layer 4 — AI Pipeline (9 untouched files)

These files have `=== 'zh'` patterns or `'en' | 'zh'` type annotations that need conversion:

| File | `=== 'zh'` | `'en'\|'zh'` | Complexity |
|------|-----------|-------------|------------|
| `lib/montree/auto-translate.ts` | 0 | 0 | HIGH — generalize `autoTranslateToChinese()` → `autoTranslateWork(input, targetLocale)` |
| `app/api/montree/curriculum/batch-translate/route.ts` | 0 | 0 | MEDIUM — accept `targetLocale` param |
| `lib/montree/reports/replan-child.ts` | 0 | 1 | LOW — widen type annotation |
| `app/api/montree/children/[childId]/game-plan/refresh/route.ts` | 0 | 0 | LOW — uses locale from body |
| `scripts/run_replan_all_whale.mjs` | 0 | 0 | LOW — inline locale references |
| `app/api/montree/photo-identification/process/route.ts` | 1 | 2 | LOW — widen type, use locale-config |
| `app/api/montree/photo-identification/sonnet-review/route.ts` | 1 | 2 | LOW — widen type, use locale-config |
| `lib/montree/photo-identification/two-pass.ts` | 0 | 1 | LOW — widen type annotation |
| `lib/montree/photo-identification/sonnet-draft.ts` | 0 | 1 | LOW — widen type annotation |

**`auto-translate.ts` is the most complex.** Currently `autoTranslateToChinese()` is called fire-and-forget from 5+ locations. Needs to become `autoTranslateWork(work, targetLocale)` using `LOCALE_AI_CONFIG` for system prompts and `LOCALE_COLUMN_SUFFIX` for DB column writes. The batch-translate route similarly needs a `targetLocale` parameter.

### Layer 2-3 — Ternary Sweep (~89 source files, ~563 occurrences)

This is the bulk of the work — mechanical conversion of `locale === 'zh' ? '中文' : 'English'` patterns.

**Top files by `=== 'zh'` count (source code only, excluding docs/CLAUDE.md):**

| File | Count | Type |
|------|-------|------|
| `app/montree/dashboard/weekly-wrap/page.tsx` | 76 | UI — TYPE A labels |
| `components/montree/reports/WeeklyWrapTab.tsx` | 49 | UI — TYPE A labels |
| `app/montree/dashboard/[childId]/gallery/page.tsx` | 31 | UI — TYPE A labels |
| `app/montree/dashboard/classroom-overview/page.tsx` | 20 | UI — TYPE A labels |
| `components/montree/onboarding/TellGuruCard.tsx` | 20 | UI — TYPE A labels |
| `app/montree/dashboard/photo-audit/page.tsx` | 20 | UI — TYPE A labels |
| `app/montree/dashboard/focus/page.tsx` | 19 | UI — TYPE A labels |
| `app/montree/parent/dashboard/page.tsx` | 18 | UI — TYPE A labels |
| `app/montree/dashboard/language-semester/page.tsx` | 17 | UI — TYPE A labels |
| `app/montree/parent/report/[reportId]/page.tsx` | 16 | UI — TYPE A labels |
| `components/montree/photo-audit/PendingReviewPanel.tsx` | 15 | UI — TYPE A labels |
| `components/montree/DashboardHeader.tsx` | 14 | UI — TYPE A labels |
| `components/montree/reports/BatchNarrativesCard.tsx` | 14 | UI — TYPE A labels |
| `components/montree/child/BigMicPanel.tsx` | 14 | UI — TYPE A labels |
| `components/montree/child/ChildGuruChat.tsx` | 13 | UI — TYPE A labels |
| `components/montree/curriculum/CurriculumWorkList.tsx` | 13 | UI — TYPE A+B mix |

**Conversion pattern for TYPE A (inline labels):** Add a key to `en.ts`, `zh.ts`, `es.ts`, replace ternary with `t('key')`. Example:
```typescript
// BEFORE:
locale === 'zh' ? '保存' : 'Save'
// AFTER:
t('common.save')  // with en.ts: { common: { save: 'Save' } }, zh.ts: { common: { save: '保存' } }
```

**Conversion pattern for TYPE B (DB columns):** Replace with `getLocalizedWorkName()` or `getLocalizedField()` from `db-helpers.ts`:
```typescript
// BEFORE:
locale === 'zh' && work.name_chinese ? work.name_chinese : work.name
// AFTER:
getLocalizedWorkName(work, locale)
```

### Layer 5 — Type Widening (16 files, 28 occurrences)

Replace `locale: 'en' | 'zh'` with `locale: Locale` (importing from `locales.ts`):

| File | Count |
|------|-------|
| `app/api/montree/reports/weekly-wrap/send/route.ts` | 3 |
| `app/api/montree/reports/route.ts` | 3 |
| `app/api/montree/reports/generate/route.ts` | 3 |
| `app/api/montree/reports/weekly-wrap/route.ts` | 2 |
| `app/api/montree/reports/batch-narratives/route.ts` | 2 |
| `app/api/montree/weekly-review/[childId]/route.ts` | 2 |
| `app/api/montree/children/[childId]/onboard/route.ts` | 2 |
| `app/api/montree/photo-identification/process/route.ts` | 2 |
| `app/api/montree/photo-identification/sonnet-review/route.ts` | 2 |
| `lib/montree/reports/replan-child.ts` | 1 |
| `lib/montree/photo-identification/two-pass.ts` | 1 |
| `lib/montree/photo-identification/sonnet-draft.ts` | 1 |
| `app/api/montree/reports/send/route.ts` | 1 |
| `app/api/montree/children/[childId]/activity-summary/route.ts` | 1 |
| `app/api/montree/weekly-review/[childId]/send/route.ts` | 1 |
| `app/api/montree/guru/route.ts` | 1 |

---

## 5. Established Patterns — How to Convert Each Type

### Pattern A — Inline label ternary → `t()` key

```typescript
// BEFORE:
const label = locale === 'zh' ? '保存' : 'Save';

// AFTER:
const { t } = useI18n(); // or useT() for just the t function
const label = t('common.save');

// In en.ts: common: { save: 'Save' }
// In zh.ts: common: { save: '保存' }
// In es.ts: common: { save: 'Guardar' }
```

### Pattern B — DB column read → helper

```typescript
// BEFORE:
const name = locale === 'zh' && work.name_chinese ? work.name_chinese : work.name;

// AFTER:
import { getLocalizedWorkName } from '@/lib/montree/i18n';
const name = getLocalizedWorkName(work, locale);
```

### Pattern C — Area label → map lookup

```typescript
// BEFORE:
const label = locale === 'zh' ? AREA_LABELS_ZH[area] : AREA_LABELS_EN[area];

// AFTER:
import { getAreaLabel } from '@/lib/montree/i18n';
const label = getAreaLabel(area, locale);
```

### Pattern D — Date format → Intl locale

```typescript
// BEFORE:
new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');

// AFTER:
import { getIntlLocale } from '@/lib/montree/i18n';
new Date().toLocaleDateString(getIntlLocale(locale));
```

### Pattern E — AI language name → config

```typescript
// BEFORE:
const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';

// AFTER:
import { getLanguageName } from '@/lib/montree/i18n';
const lang = getLanguageName(locale);
```

### Pattern F — AI system prompt → base + instruction

```typescript
// BEFORE:
const systemMessage = locale === 'zh'
  ? '你是一位蒙台梭利老师...'
  : 'You are a Montessori teacher...';

// AFTER:
import { getAILanguageInstruction } from '@/lib/montree/i18n';
const baseMessage = 'You are a Montessori teacher...';
const langInstruction = getAILanguageInstruction(locale);
const systemMessage = langInstruction ? `${baseMessage}${langInstruction}` : baseMessage;
```

### Pattern G — Fallback content with dynamic data → locale-keyed Record maps

```typescript
// BEFORE:
const text = locale === 'zh'
  ? `${name}本周参与了${count}项活动。`
  : `${name} engaged with ${count} activities this week.`;

// AFTER (define map inside function where variables are in scope):
const TEMPLATE: Record<string, string> = {
  zh: `${name}本周参与了${count}项活动。`,
  es: `${name} participó en ${count} actividades esta semana.`,
};
const text = TEMPLATE[locale] || `${name} engaged with ${count} activities this week.`;
```

### Pattern H — List separator

```typescript
// BEFORE:
works.join(locale === 'zh' ? '、' : ', ')

// AFTER:
const LIST_SEP: Record<string, string> = { zh: '、' };
works.join(LIST_SEP[locale] || ', ')
```

---

## 6. "Drop a Language In" Workflow (the end goal)

After all layers are complete, adding a new language (e.g., French) requires:

1. Create `lib/montree/i18n/fr.ts` — copy `en.ts`, translate all 1,490+ keys
2. Add `'fr'` to `SUPPORTED_LOCALES` in `locales.ts`
3. Add `AREA_LABELS_FR` to `area-labels.ts` + add to `AREA_LABELS` map
4. Add `fr` entry to `LOCALE_AI_CONFIG` in `locale-config.ts`
5. Add `fr: 'fr-FR'` to `LOCALE_TO_INTL` in `locales.ts`
6. Add `fr: '_fr'` to `LOCALE_COLUMN_SUFFIX` in `db-helpers.ts` (when DB columns exist)
7. Run `autoTranslateWork()` batch for curriculum works
8. Test with locale toggle
9. Ship — zero code changes in components needed

---

## 7. Execution Order for Remaining Work

**Recommended order (dependencies matter):**

1. **Finish teacher-report-generator.ts** — 6 remaining zh hits (Section 2.1)
2. **Finish narrative-generator.ts** — 3 remaining edits (Section 2.2)
3. **Layer 4 remaining files** — Start with type-widening-only files (quick wins), then tackle `auto-translate.ts` generalization last (most complex)
4. **Layer 5 type widening** — 16 files, 28 annotations. Mechanical: `import type { Locale } from '@/lib/montree/i18n/locales'`, replace `'en' | 'zh'` with `Locale`
5. **Layer 3 ternary sweep** — Start with highest-count files (weekly-wrap/page.tsx has 76). For TYPE A, batch-add keys to `en.ts`/`zh.ts`/`es.ts` then sweep the file
6. **Layer 2 DB schema** — Add `_localized` JSONB columns (future, not blocking Layer 3-5)
7. **3x AUDIT** — Fix cycle until 3 consecutive clean audits

**Effort estimate:** ~120 unique files, ~1,770 lines changed, ~7 hours build + 2 hours audit.

---

## 8. What NOT to Touch

- `TranslationKey` type — derived from `en.ts`, auto-extends
- 681 existing `t()` call sites — already fully locale-agnostic
- `resolveLocalized()` / `resolveLocalizedArray()` — already multilingual (JSONB pattern)
- Photo identification pipeline logic (only touch type annotations)
- Story system — separate from Montree i18n
- Whale Class admin tools — English-only, not localized

---

## 9. Key References

- **Architecture plan:** `docs/MULTILINGUAL_PLAN.md` — full scope, ternary classification, 5-layer design
- **Infrastructure files:** All in `lib/montree/i18n/` — `locales.ts`, `locale-config.ts`, `db-helpers.ts`, `area-labels.ts`, `localized-types.ts`, `index.ts`
- **Gold standard component:** `components/montree/child/FocusWorksSection.tsx` — ZERO `=== 'zh'` checks despite being locale-aware. Uses `resolveLocalized()`, `getAreaLabel()`, locale-keyed patterns throughout.
- **Session 58 CLAUDE.md section** — has the original research findings and pattern classification
