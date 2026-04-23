# Multilingual Architecture — Execution Plan

**Phase 2 deliverable (3x PLAN). Written Apr 24, 2026.**
**Goal:** Make Montree translatable into ANY language by adding a translation file and running a script — zero code changes, zero migrations per new language.

---

## 1. Scope Summary (Phase 2 Round 1 Data)

| Category | Count | Files | Risk |
|----------|-------|-------|------|
| `=== 'zh'` ternaries | 646 | 98 | HIGH volume, LOW per-item risk (mechanical) |
| `'en' \| 'zh'` type annotations | 33 | ~20 | LOW — widen to `string` |
| Chinese DB column refs (`name_zh`, `name_chinese`, etc.) | 373+69+20 = 462 | 86 | MEDIUM — need JSONB migration path |
| Chinese-specific functions (`autoTranslateToChinese`, etc.) | 17 files | 17 | MEDIUM — generalize to any target locale |
| `AREA_LABELS_ZH` / `AREA_LABELS_EN` refs | 9 files | 9 | LOW — map-based lookup |
| i18n barrel imports (`@/lib/montree/i18n`) | 173 | 173 | LOW — barrel just needs new exports |
| Direct i18n sub-imports (`/context`, `/server`, `/area-labels`) | 54 | ~25 | LOW — keep working, barrel re-exports |
| `TranslationKey` type usages | 331 | 41 | ZERO — type derived from `en.ts`, no change needed |
| `t()` call sites already working | 681 | 127 | ZERO — already locale-agnostic |

**Key finding:** ZERO `switch(locale)` patterns in the codebase. All locale branching uses ternaries. This means no TypeScript exhaustiveness checks break when `Locale` widens from union to string.

---

## 2. Ternary Classification (646 total)

| Type | Count | Pattern | Fix |
|------|-------|---------|-----|
| A — Inline label swap | ~346 | `locale === 'zh' ? '中文' : 'English'` | Add `t()` key to en.ts + locale files |
| B — DB column / function | ~42 | `locale === 'zh' ? name_chinese : name` | `getLocalizedName(work, locale)` helper |
| C — Area labels | ~5 | `locale === 'zh' ? AREA_LABELS_ZH[k] : AREA_LABELS_EN[k]` | Already have `getAreaLabel(k, locale)` — just make it map-based |
| D — Date format locale | ~42 | `locale === 'zh' ? 'zh-CN' : 'en-US'` | `LOCALE_TO_INTL[locale]` map |
| E — AI prompt locale | ~42 | `locale === 'zh' ? 'Chinese (Mandarin)' : 'English'` | `LOCALE_CONFIG[locale].languageName` |
| F — Conditional logic / other | ~169 | Various (field selection, template fallbacks, system prompts) | Case-by-case in Phase 3 |

---

## 3. Architecture Design

### 3.1 Locale Type — Open-ended with validation

**Current (context.tsx:17):**
```typescript
export type Locale = 'en' | 'zh';
```

**New (lib/montree/i18n/locales.ts — NEW FILE):**
```typescript
export const SUPPORTED_LOCALES = ['en', 'zh', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

// Intl.DateTimeFormat locale codes
export const LOCALE_TO_INTL: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
};

// AI prompt language names
export const LOCALE_CONFIG: Record<Locale, {
  languageName: string;           // "English", "Chinese (Mandarin)", "Spanish"
  aiSystemSuffix: string;         // Extra system prompt instruction for this locale
  nativeName: string;             // "English", "中文", "Español"
}> = {
  en: {
    languageName: 'English',
    aiSystemSuffix: '',
    nativeName: 'English',
  },
  zh: {
    languageName: 'Chinese (Mandarin)',
    aiSystemSuffix: '\n⚠️ 关键要求：你必须完全用中文（普通话）书写。不要使用任何英文。用温暖自然的中文语气写信，像一位真正关心孩子的老师在和家长聊天。避免翻译腔，用地道的中文表达。',
    nativeName: '中文',
  },
  es: {
    languageName: 'Spanish',
    aiSystemSuffix: '\n⚠️ Requisito clave: Debes escribir completamente en español. No uses inglés. Usa un tono cálido y natural, como un maestro que realmente se preocupa por el niño hablando con los padres.',
    nativeName: 'Español',
  },
};

export function isValidLocale(v: unknown): v is Locale {
  return typeof v === 'string' && SUPPORTED_LOCALES.includes(v as Locale);
}
```

**Why union, not `string`:** Keeps autocomplete and prevents garbage values. Adding a language = add to `SUPPORTED_LOCALES` + add `LOCALE_CONFIG` entry + add translation file + add area labels. That's it.

### 3.2 Area Labels — Map of maps

**Current (area-labels.ts):**
```typescript
export const AREA_LABELS_ZH: Record<string, string> = { ... };
export const AREA_LABELS_EN: Record<string, string> = { ... };
export function getAreaLabel(area: string, locale: string): string {
  const map = locale === 'zh' ? AREA_LABELS_ZH : AREA_LABELS_EN;
  return map[area] ?? area;
}
```

**New (area-labels.ts):**
```typescript
import { type Locale, DEFAULT_LOCALE } from './locales';

export const AREA_LABELS: Record<string, Record<string, string>> = {
  en: { practical_life: 'Practical Life', sensorial: 'Sensorial', mathematics: 'Mathematics', language: 'Language', cultural: 'Cultural' },
  zh: { practical_life: '日常', sensorial: '感官', mathematics: '数学', language: '语言', cultural: '文化' },
  es: { practical_life: 'Vida Práctica', sensorial: 'Sensorial', mathematics: 'Matemáticas', language: 'Lenguaje', cultural: 'Cultural' },
};

// Backward compat exports (deprecated — use AREA_LABELS[locale] directly)
export const AREA_LABELS_EN = AREA_LABELS.en;
export const AREA_LABELS_ZH = AREA_LABELS.zh;

export function getAreaLabel(area: string, locale: string): string {
  const map = AREA_LABELS[locale] || AREA_LABELS[DEFAULT_LOCALE];
  return map[area] ?? area;
}

export function getAreaArrowExample(locale: string): string {
  const map = AREA_LABELS[locale] || AREA_LABELS[DEFAULT_LOCALE];
  return `${map.practical_life} → ${map.sensorial} → ${map.language}`;
}

// Re-export unchanged
export const AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
export type AreaKey = (typeof AREA_KEYS)[number];
```

**Backward compat:** `AREA_LABELS_EN` and `AREA_LABELS_ZH` remain as aliases. 9 files import them — can be migrated to `AREA_LABELS[locale]` in the sweep, or left as deprecated aliases indefinitely.

### 3.3 Translation Files — One per locale

**Current:** `en.ts` (3,758 lines, ~3,383 keys), `zh.ts` (3,758 lines).

**New:** Add `es.ts` as the third language. Same flat key structure. Missing keys fall back to `en` (already implemented in `context.tsx:76`).

**`TranslationKey` stays derived from `en.ts`** — this is already correct. English is always the complete set; other locales may have gaps (fallback chain handles it).

### 3.4 Context Provider — Dynamic locale loading

**Current (context.tsx):**
```typescript
import { en } from './en';
import { zh } from './zh';
const messages: Record<Locale, Record<string, string>> = { en, zh };
```

**New (context.tsx):**
```typescript
import { en, type TranslationKey } from './en';
import { zh } from './zh';
import { es } from './es';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale, type Locale } from './locales';

const messages: Record<string, Record<string, string>> = { en, zh, es };

// In I18nProvider:
useEffect(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      setLocaleState(stored);
    }
  } catch { /* SSR or private browsing */ }
}, []);
```

**Note:** Static imports, not dynamic `import()`. Each locale file is ~180KB. Three locales = ~540KB. Acceptable for now — all loaded at build time via tree-shaking (unused locales are dead code... actually no, they're all referenced in the `messages` object). If we ever hit 10+ languages, switch to `React.lazy` + `import()` for non-default locales. For 3 languages this is fine.

### 3.5 Server-side Translator — Unified type

**Current (server.ts:8):**
```typescript
export type Locale = 'en' | 'zh';  // DUPLICATE definition
```

**New (server.ts):**
```typescript
import { type Locale, DEFAULT_LOCALE, isValidLocale } from './locales';
// Remove local Locale type — import from shared locales.ts

export function getTranslator(locale: Locale) {
  // Dynamic import would be ideal but these are small files
  const messages: Record<string, string> = 
    locale === 'zh' ? zh : 
    locale === 'es' ? es : 
    en;
  // ... rest unchanged
}

export function getLocaleFromRequest(url: URL | string): Locale {
  const u = typeof url === 'string' ? new URL(url) : url;
  const raw = u.searchParams.get('locale');
  if (raw && isValidLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}
```

### 3.6 Language Selector — Replace binary toggle

**Current:** `LanguageToggle.tsx` — binary flip between en/zh.

**New:** `LanguageSelector.tsx` — dropdown or pill selector showing all `SUPPORTED_LOCALES` with `nativeName` labels. When only 2 locales exist, renders as a simple toggle (backward compat UX). When 3+, renders as a dropdown.

### 3.7 Barrel Export — Add new exports

**Current (index.ts):**
```typescript
export { en, type TranslationKey } from './en';
export { zh } from './zh';
export { I18nProvider, useI18n, useT, type Locale } from './context';
export { getTranslator, getLocaleFromRequest, getTranslatedAreaName, getTranslatedStatus } from './server';
```

**New (index.ts):**
```typescript
export { en, type TranslationKey } from './en';
export { zh } from './zh';
export { es } from './es';
export { I18nProvider, useI18n, useT } from './context';
export { getTranslator, getLocaleFromRequest, getTranslatedAreaName, getTranslatedStatus } from './server';
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_TO_INTL, LOCALE_CONFIG, isValidLocale, type Locale } from './locales';
export { AREA_LABELS, AREA_LABELS_EN, AREA_LABELS_ZH, AREA_KEYS, getAreaLabel, getAreaArrowExample, type AreaKey } from './area-labels';
```

**Note:** `type Locale` now exported from `locales.ts` instead of `context.tsx`. The barrel handles the re-routing — consumers importing `{ type Locale } from '@/lib/montree/i18n'` won't notice.

### 3.8 DB Schema — JSONB columns (NO per-language columns)

**Current state:** 5 Chinese-specific columns on `montree_classroom_curriculum_works`:
- `name_zh` TEXT
- `name_chinese` TEXT (duplicate of name_zh — Session 14 dual-column legacy)
- `parent_description_zh` TEXT
- `why_it_matters_zh` TEXT
- `guide_content_zh` JSONB

**New approach — JSONB locale columns (Phase 2, single migration):**
```sql
-- Add JSONB columns that store {locale: value} maps
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_localized JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_description_localized JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS why_it_matters_localized JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guide_content_localized JSONB DEFAULT '{}';

-- Backfill from existing _zh columns
UPDATE montree_classroom_curriculum_works
SET 
  name_localized = jsonb_build_object('zh', COALESCE(name_zh, name_chinese))
WHERE name_zh IS NOT NULL OR name_chinese IS NOT NULL;

UPDATE montree_classroom_curriculum_works
SET parent_description_localized = jsonb_build_object('zh', parent_description_zh)
WHERE parent_description_zh IS NOT NULL;

UPDATE montree_classroom_curriculum_works
SET why_it_matters_localized = jsonb_build_object('zh', why_it_matters_zh)
WHERE why_it_matters_zh IS NOT NULL;

UPDATE montree_classroom_curriculum_works
SET guide_content_localized = jsonb_build_object('zh', guide_content_zh)
WHERE guide_content_zh IS NOT NULL;
```

**DB helper function (lib/montree/i18n/db-helpers.ts — NEW FILE):**
```typescript
import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * Read a localized value from a JSONB column.
 * Fallback chain: requested locale → 'en' → first available → raw fallback.
 */
export function resolveLocalizedDB(
  jsonb: Record<string, string> | null | undefined,
  locale: Locale,
  fallback?: string
): string {
  if (!jsonb || typeof jsonb !== 'object') return fallback ?? '';
  return jsonb[locale] || jsonb[DEFAULT_LOCALE] || Object.values(jsonb)[0] || fallback || '';
}

/**
 * Get the localized work name from a curriculum work row.
 * Prefers JSONB `name_localized`, falls back to legacy `name_zh`/`name_chinese`.
 */
export function getLocalizedWorkName(
  work: { name: string; name_localized?: Record<string, string> | null; name_zh?: string | null; name_chinese?: string | null },
  locale: Locale
): string {
  if (locale === DEFAULT_LOCALE) return work.name;
  // Try JSONB first
  if (work.name_localized) {
    const resolved = resolveLocalizedDB(work.name_localized, locale);
    if (resolved) return resolved;
  }
  // Legacy fallback for zh
  if (locale === 'zh') {
    return work.name_chinese || work.name_zh || work.name;
  }
  return work.name;
}
```

**Migration strategy:** JSONB columns COEXIST with legacy `_zh` columns. Both are written during a transition period. Reads prefer JSONB via `getLocalizedWorkName()`. Legacy columns dropped in a future cleanup session after all reads are migrated.

### 3.9 Auto-Translate — Generalize to any target locale

**Current:** `autoTranslateToChinese()` — hardcoded Chinese system prompt, Chinese tool fields, writes `_zh` columns.

**New:** `autoTranslateWork(input, targetLocale)` — parameterized:
- System prompt from `LOCALE_CONFIG[targetLocale].aiSystemSuffix` + a generic "translate to {languageName}" instruction
- Tool fields: `name_translated`, `parent_description_translated`, `why_it_matters_translated`
- DB write: both legacy `_zh` columns (when targetLocale === 'zh') AND JSONB `_localized` column
- Glossary lookup: `MONTESSORI_GLOSSARY[targetLocale]` (new map-of-maps pattern)

**Backward compat:** `autoTranslateToChinese()` becomes a thin wrapper: `autoTranslateWork(input, 'zh')`.

### 3.10 AI Content Generation — Locale-parameterized prompts

**Affected files (7):**
1. `lib/montree/reports/narrative-generator.ts` — parent narrative
2. `lib/montree/reports/teacher-report-generator.ts` — teacher report
3. `lib/montree/reports/replan-child.ts` — game plan (already bilingual JSONB)
4. `app/api/montree/children/[childId]/game-plan/refresh/route.ts` — interactive refresh
5. `app/api/montree/children/[childId]/onboard/route.ts` — child onboarding
6. `app/api/montree/children/[childId]/activity-summary/route.ts` — weekly summary
7. `scripts/run_replan_all_whale.mjs` — batch replan

**Pattern for all:**
```typescript
// Before:
const lang = locale === 'zh' ? 'Chinese (Mandarin)' : 'English';
const systemSuffix = locale === 'zh' ? '\n⚠️ 关键要求...' : '';

// After:
import { LOCALE_CONFIG } from '@/lib/montree/i18n/locales';
const { languageName, aiSystemSuffix } = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG.en;
```

The `replan-child.ts` already uses bilingual JSONB storage with `resolveLocalized()`. The pattern extends naturally to 3+ languages — AI generates `{ en: "...", es: "..." }` JSONB objects. English is always the canonical form; other locales are derived post-generation.

---

## 4. Execution Layers (Build Order)

### Layer 0 — Foundation (4 new files, 2 modified files)
**Risk: LOW. No breaking changes. Pure additions.**

| # | File | Action |
|---|------|--------|
| 0.1 | `lib/montree/i18n/locales.ts` | **CREATE** — `SUPPORTED_LOCALES`, `Locale`, `LOCALE_TO_INTL`, `LOCALE_CONFIG`, `isValidLocale`, `DEFAULT_LOCALE` |
| 0.2 | `lib/montree/i18n/es.ts` | **CREATE** — Spanish translation file (start with ~100 critical keys, rest fallback to English) |
| 0.3 | `lib/montree/i18n/db-helpers.ts` | **CREATE** — `resolveLocalizedDB()`, `getLocalizedWorkName()` |
| 0.4 | `lib/montree/i18n/area-labels.ts` | **MODIFY** — `AREA_LABELS` map-of-maps, keep backward compat aliases |
| 0.5 | `lib/montree/i18n/index.ts` | **MODIFY** — add new exports |
| 0.6 | `components/montree/LanguageSelector.tsx` | **CREATE** — replaces LanguageToggle (keep LanguageToggle as deprecated alias) |

### Layer 1 — Type Unification (2 modified files)
**Risk: LOW. Widening types never breaks consumers.**

| # | File | Action |
|---|------|--------|
| 1.1 | `lib/montree/i18n/context.tsx` | Import Locale from locales.ts, remove local type, import es.ts, update messages map, update localStorage validation |
| 1.2 | `lib/montree/i18n/server.ts` | Import Locale from locales.ts, remove local type, add es to getTranslator, update getLocaleFromRequest |

### Layer 2 — DB Schema (1 migration + helper adoption)
**Risk: MEDIUM. Migration is additive (new columns only). Reads use helper with fallback.**

| # | File | Action |
|---|------|--------|
| 2.1 | `migrations/XXX_multilingual_jsonb.sql` | **CREATE** — Add 4 JSONB `_localized` columns + backfill from `_zh` |
| 2.2 | 86 files with Chinese column refs | **MODIFY** — Replace direct `name_zh`/`name_chinese` reads with `getLocalizedWorkName(work, locale)`. This is the bulk mechanical work. |

### Layer 3 — Ternary Sweep (98 files)
**Risk: HIGH volume, LOW per-item risk. Mechanical but tedious.**

Sub-layers:
- **3a** — 42 date-format ternaries → `LOCALE_TO_INTL[locale]` (grep `zh-CN.*en-US`)
- **3b** — ~346 inline Chinese labels → add `t()` keys to en.ts + zh.ts + es.ts
- **3c** — ~42 DB/function ternaries → `getLocalizedWorkName()` or `resolveLocalizedDB()`
- **3d** — 5 AREA_LABELS ternaries → already fixed by Layer 0.4
- **3e** — ~169 remaining (AI prompts, template fallbacks, conditional logic) → case-by-case with `LOCALE_CONFIG`

### Layer 4 — AI Pipeline (7+ files)
**Risk: MEDIUM. Prompt changes need testing.**

| # | File | Action |
|---|------|--------|
| 4.1 | `lib/montree/auto-translate.ts` | Generalize to `autoTranslateWork(input, targetLocale)` |
| 4.2 | `lib/montree/reports/narrative-generator.ts` | Replace 5 zh-ternaries with `LOCALE_CONFIG[locale]` |
| 4.3 | `lib/montree/reports/teacher-report-generator.ts` | Replace ~15 zh-ternaries with `LOCALE_CONFIG[locale]` |
| 4.4 | `lib/montree/reports/replan-child.ts` | Widen `locale: 'en' | 'zh'` to `Locale`, extend JSONB storage to 3+ locales |
| 4.5 | `app/api/montree/children/[childId]/game-plan/refresh/route.ts` | Same as 4.4 |
| 4.6 | `app/api/montree/children/[childId]/onboard/route.ts` | Replace zh-specific prompt with `LOCALE_CONFIG` |
| 4.7 | `app/api/montree/children/[childId]/activity-summary/route.ts` | Replace zh-specific fallback with `LOCALE_CONFIG` |
| 4.8 | `scripts/run_replan_all_whale.mjs` | Same as 4.4 (inline copy of replan logic) |

### Layer 5 — Widen remaining type annotations (20 files)
**Risk: LOW. Mechanical find-and-replace.**

Replace all 33 instances of `locale: 'en' | 'zh'` with `locale: Locale` (importing from `@/lib/montree/i18n/locales`).

---

## 5. "Drop a Language In" Workflow (Post-Infrastructure)

Once Layers 0-5 are complete, adding a new language (e.g., Japanese) requires:

1. **Create `lib/montree/i18n/ja.ts`** — copy en.ts structure, translate keys (can be AI-assisted batch)
2. **Add to `SUPPORTED_LOCALES`** in `locales.ts`: `['en', 'zh', 'es', 'ja']`
3. **Add `LOCALE_CONFIG.ja`** entry with `languageName`, `aiSystemSuffix`, `nativeName`
4. **Add `LOCALE_TO_INTL.ja`**: `'ja-JP'`
5. **Add `AREA_LABELS.ja`** entry
6. **Import ja in context.tsx** and add to `messages` map
7. **Import ja in server.ts** and add to `getTranslator` resolver
8. **Run batch-translate** for curriculum works: `POST /api/montree/curriculum/batch-translate?locale=ja`
9. **Export from index.ts** and **import in barrel**

**Zero code changes in 98+ component files. Zero migrations. Zero API route changes.**

---

## 6. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Ternary sweep introduces typos | MEDIUM | LOW | Each t() key is type-checked against en.ts via TranslationKey |
| JSONB migration corrupts data | LOW | HIGH | Additive columns only; legacy columns kept; backfill is SELECT-based |
| AI generates wrong language | LOW | MEDIUM | LOCALE_CONFIG.aiSystemSuffix + explicit "Write in {lang}" prompt rule |
| Missing translation key shows raw key | MEDIUM | LOW | Already handled — t() falls back en → key name |
| Performance with 3 locale files loaded | LOW | LOW | ~540KB total, gzipped ~60KB. Fine for 3. Lazy-load if 10+ |
| Breaking existing zh functionality | MEDIUM | HIGH | Layer-by-layer build with audit after each layer. Backward compat aliases everywhere. |

---

## 7. What NOT to Touch

- **`TranslationKey` type** — derived from `en.ts`, already correct
- **681 existing `t()` call sites** — already locale-agnostic
- **`resolveLocalized()` / `resolveLocalizedArray()`** — already take `locale: string`, fully multilingual
- **`montree_child_focus_works` / `montree_child_progress` table structure** — no locale columns
- **Photo identification pipeline** — locale only affects logging, not identification
- **Story system** — completely separate auth/i18n
- **Whale Class admin** (`/admin/*`) — English-only, not part of Montree i18n

---

## 8. Estimated Effort

| Layer | Files | Estimated Lines Changed | Time |
|-------|-------|------------------------|------|
| 0 — Foundation | 6 | ~300 new | 30 min |
| 1 — Type Unification | 2 | ~30 | 10 min |
| 2 — DB Schema | 87 | ~400 | 2 hours |
| 3 — Ternary Sweep | 98 | ~800 | 3 hours |
| 4 — AI Pipeline | 8 | ~200 | 1 hour |
| 5 — Type Widening | 20 | ~40 | 20 min |
| **Total** | **~120 unique files** | **~1,770 lines** | **~7 hours** |

Plus audit cycles (3x per the 3x3x3x3x3 system) = ~2 hours additional.

---

## 9. Phase 3 (INVESTIGATE) Checklist

Before building, Phase 3 must validate each layer by reading the exact lines that will change:

- [ ] Read all 6 files in Layer 0 — verify no naming conflicts
- [ ] Read context.tsx lines 17, 22, 51-63 — verify Locale type swap is safe
- [ ] Read server.ts lines 8, 15, 30-35 — verify duplicate Locale removal is safe  
- [ ] Sample 10 of 86 DB column files — verify `getLocalizedWorkName()` covers all read patterns
- [ ] Sample 20 of 98 ternary files — verify t() key pattern works for all TYPE A ternaries
- [ ] Read all 7 AI pipeline files — verify LOCALE_CONFIG substitution covers all zh-specific logic
- [ ] Grep for any `=== 'en'` ternaries (reverse direction) — assess separately
- [ ] Verify `en.ts` TranslationKey type generation still works with no changes to en.ts structure
