# Multilingual Build Handoff — Session 61 (Apr 24, 2026)

**Purpose:** Comprehensive handoff so a fresh session can continue the multilingual build without context loss.

**Goal:** Make Montree translatable into ANY language by adding a translation file — zero code changes, zero migrations per new language. Triggered by FAMM Argentina hot lead (Spanish competitive advantage).

**Development cycle:** 3x3x3x3x3 — RESEARCH ✅ → PLAN ✅ → INVESTIGATE ✅ → BUILD (IN PROGRESS) → AUDIT (pending)

**Current status (Session 61):** Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 IN PROGRESS.

### Layer 3 progress — Files FULLY CONVERTED (no `=== 'zh'` or only TYPE B preserves):
- `components/montree/reports/WeeklyWrapTab.tsx` — ✅ COMPLETE (38 edits, prior sessions)
- `app/montree/dashboard/focus/page.tsx` — ✅ COMPLETE (19 → 0)
- `app/montree/dashboard/photo-audit/page.tsx` — ✅ COMPLETE (20 → 0)
- `app/montree/parent/dashboard/page.tsx` — ✅ COMPLETE (18 → 3 TYPE B preserves only)
- `components/montree/onboarding/TellGuruCard.tsx` — ✅ COMPLETE (20 → 0)
- `app/montree/dashboard/classroom-overview/page.tsx` — ✅ COMPLETE (20 → 1 TYPE B preserve only)
- `app/montree/dashboard/language-semester/page.tsx` — ✅ COMPLETE (17 → 0)
- `components/montree/curriculum/CurriculumWorkList.tsx` — ✅ NO CHANGES NEEDED (all 13 are TYPE B)

### Layer 3 — Files with edits IDENTIFIED but NOT YET APPLIED:
- `components/montree/photo-audit/ThisIsSheet.tsx` — 2 TYPE A edits needed (lines 492, 974)
  - Keys: `thisIsSheet.flagForDiscussion` ('标记为讨论'/'Flag for discussion'), `thisIsSheet.tapToUseInstead` ('点击使用'/'tap to use this instead')
  - 6 remaining are TYPE B (DB column reads) — leave as-is
- `app/montree/dashboard/weekly-admin-docs/page.tsx` — 8 TYPE A edits needed
  - 2 of 8 are `displayField` ternaries selecting `'chinese_text'` vs `'english_text'` — need locale-keyed map, not t() key
  - Keys needed: `weeklyAdmin.thisWeekActivities`, `weeklyAdmin.summaryPlaceholder`, `weeklyAdmin.developmentalNote`, `weeklyAdmin.weeklyFocusPlaceholder`, `weeklyAdmin.notes`, `weeklyAdmin.notesPlaceholder`
  - 2 remaining are TYPE B (area label DB reads) — leave as-is

### Layer 3 — Files NOT YET INVESTIGATED:
- `app/montree/dashboard/weekly-wrap/page.tsx` — 76 ternaries catalogued in Section 10, 0 edits applied
- `app/montree/dashboard/[childId]/gallery/page.tsx` — 31 occurrences
- `app/montree/parent/report/[reportId]/page.tsx` — 16
- `components/montree/photo-audit/PendingReviewPanel.tsx` — 15
- `components/montree/DashboardHeader.tsx` — 14
- `components/montree/reports/BatchNarrativesCard.tsx` — 14
- `components/montree/child/BigMicPanel.tsx` — 14
- `components/montree/child/ChildGuruChat.tsx` — 13
- 4 small components not yet accessed: PhotoDetailView.tsx (1), MediaCard.tsx (1), MediaDetailModal.tsx (1), TodaysFocusStrip.tsx (2)
- ~40+ other files with <13 occurrences each (many are API routes, likely TYPE B/E/F)

### Translation keys added across Sessions 60-61:
- **Batch 1 (Session 60, WeeklyWrapTab):** 38 edits, keys in `weeklyWrap.*` namespace
- **Batch 2 (Session 61, before compaction):** 72 keys across `parentReport.*` (12), `pendingReview.*` (15), `batchNarratives.*` (14), `dashboard.*` (15), `childGuru.*` (13)
- **Batch 3 (Session 61, before compaction):** ~97 keys for `focus.*`, `photoAudit.*`, `parentDashboard.*`, `tellGuru.*`, `classroomOverview.*`
- **Batch 4 (Session 61, after compaction):** 17 keys in `languageSemester.*` namespace

### 40+ files changed locally — NOT YET COMMITTED. Ready for commit + push.

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

### Layer 4 — AI Pipeline — Mostly COMPLETE

**✅ Done:**
- `lib/montree/auto-translate.ts` — Generalized to N-language with `autoTranslateWork(input, targetLocale)`
- `app/api/montree/curriculum/batch-translate/route.ts` — Accepts `target_locale` parameter
- `lib/montree/reports/replan-child.ts` — Type widened to `Locale`
- `app/api/montree/photo-identification/process/route.ts` — Type widened + imports
- `app/api/montree/photo-identification/sonnet-review/route.ts` — Type widened + imports
- `lib/montree/photo-identification/two-pass.ts` — Type widened
- `lib/montree/photo-identification/sonnet-draft.ts` — Type widened

**⏳ Remaining (low complexity, mostly have `=== 'zh'` ternaries in AI prompt sections):**
- `app/api/montree/children/[childId]/game-plan/refresh/route.ts` — Has zh-specific prompt text
- `scripts/run_replan_all_whale.mjs` — Has inline zh references
- `app/api/montree/children/[childId]/activity-summary/route.ts` — Has zh-specific prompt + area labels

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

### Layer 5 — Type Widening — ✅ COMPLETE (all 16 files done)

All 16 files converted. Every `'en' | 'zh'` type annotation replaced with `Locale` from `locales.ts`. Every hardcoded validation replaced with `isValidLocale()`. Only 5 comment-only hits remain (acceptable — no code impact).

**Also completed as part of Layer 4:**
- `lib/montree/auto-translate.ts` — Generalized to N-language: `autoTranslateWork(input, targetLocale)` + deprecated `autoTranslateToChinese` wrapper
- `app/api/montree/curriculum/batch-translate/route.ts` — Accepts `target_locale` parameter

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

---

## 10. `weekly-wrap/page.tsx` Ternary Catalog (76 occurrences, 0 applied)

File: `app/montree/dashboard/weekly-wrap/page.tsx` (~1647 lines)

**Existing infrastructure already in file:**
- Lines 8-10: Already imports `useI18n`, `AREA_LABELS_ZH`, `AREA_LABELS_EN`, `getIntlLocale`
- Line 108: Already destructures `const { t, locale } = useI18n()`
- Line 317: Already uses `getIntlLocale(locale)` for date formatting

**Step 1 — Add import for `getAreaLabel`:**
```typescript
import { getAreaLabel as getAreaLabelI18n } from '@/lib/montree/i18n/area-labels';
```

**Step 2 — Replace local `getAreaLabel` function (lines 727-728):**
```typescript
// REMOVE:
const getAreaLabel = (area: string) =>
  locale === 'zh' ? (AREA_LABELS_ZH[area] || area) : (AREA_LABELS_EN[area] || area.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
// REPLACE WITH:
const getAreaLabel = (area: string) => getAreaLabelI18n(area, locale);
```

**Step 3 — Convert STATUS_CONFIG (lines 398-403):**
```typescript
// BEFORE:
presented: { label: locale === 'zh' ? '已展示' : 'Presented', ... },
practicing: { label: locale === 'zh' ? '练习中' : 'Practicing', ... },
mastered: { label: locale === 'zh' ? '已掌握' : 'Mastered', ... },
// AFTER: use t('status.presented'), t('status.practicing'), t('status.mastered')
```

### 10.1 TYPE B — DB column reads (LEAVE AS-IS, 3 total)

These read localized DB columns, not UI labels. Do NOT convert:
- **Line 743:** `(locale === 'zh' && rec.work_zh) ? rec.work_zh : rec.work`
- **Line 915:** `(locale === 'zh' && item.work_zh) ? item.work_zh : item.work`
- **Line 1191:** `(locale === 'zh' && matchedWork?.name_zh) ? matchedWork.name_zh : photo.work_name`

### 10.2 TYPE C — Area labels (3 total, replace with `getAreaLabelI18n`)

- **Lines 727-728:** Local `getAreaLabel` function definition → replace per Step 2 above
- **Lines 828-830:** Complex area label with `area_analyses` fallback → use `getAreaLabel(area)` (the local wrapper)
- **Line 1196:** Area label in photo description badge → use `getAreaLabel(area)`

### 10.3 TYPE G — Complex dynamic content (3 total, locale-keyed Record maps)

- **Lines 749-752:** Recommendation sentence:
  ```typescript
  // zh: `${areaLabel}的${works.join('和')}`
  // en: `${areaLabel} works such as ${works.join(' and ')}`
  // → Record map with locale keys + English default
  ```
- **Lines 821-823:** `本周 ${firstName} 的活动：` vs `This week ${firstName} did:`
- **Lines 883-885:** `下周建议 ${firstName} 多做 ${recSentenceParts.join('、')}` vs `Next week I recommend ${firstName} focuses more on ${recSentenceParts.join(' and ')}`

### 10.4 TYPE A — Simple label ternaries (~67 total, replace with `t()`)

**New keys to add to `en.ts` / `zh.ts` / `es.ts`:**

| Key | English | Chinese | Context |
|-----|---------|---------|---------|
| `weeklyWrap.flagsCount` | `{count} flag` / `{count} flags` | `{count}个标记` | Line 802 |
| `weeklyWrap.noRecordedActivities` | `No recorded activities this week` | `本周无记录活动` | Line 863 |
| `weeklyWrap.teacherNotes` | `Teacher Notes` | `教师备注` | Line 945 |
| `weeklyWrap.recordOrType` | `Record or type notes...` | `录音或输入备注...` | Line 959 |
| `weeklyWrap.viewAiAnalysis` | `View AI Analysis` | `查看 AI 分析` | Line 969 |
| `weeklyWrap.approving` | `Approving...` | `审批中...` | Line 985 |
| `weeklyWrap.agree` | `Agree ✓` | `同意` | Line 985 |
| `weeklyWrap.approved` | `Approved` | `已同意` | Line 989 |
| `weeklyWrap.updateShelf` | `Update Shelf` | `更新书架` | Line 999 |
| `weeklyWrap.shelfUpdated` | `Shelf Updated` | `书架已更新` | Line 1005 |
| `weeklyWrap.edited` | `Edited` | `已编辑` | Line 1068 |
| `weeklyWrap.parentNarrative` | `Parent Narrative` | `家长叙述` | Line 1087 |
| `weeklyWrap.photos` | `Photos` | `照片` | Line 1130 |
| `weeklyWrap.activityPhoto` | `Activity photo` | `活动照片` | Line 1152 |
| `weeklyWrap.crop` | `Crop` | `裁剪` | Line 1161 |
| `weeklyWrap.moveUp` | `Move up` | `上移` | Line 1167 |
| `weeklyWrap.moveDown` | `Move down` | `下移` | Line 1173 |
| `weeklyWrap.openFullReport` | `Open full parent report →` | `打开完整家长报告 →` | Line 1237 |
| `weeklyWrap.saveChanges` | `Save Changes` | `保存修改` | Line 1249 |
| `weeklyWrap.sendToParent` | `Send to Parent` | `发送给家长` | Line 1279 |
| `weeklyWrap.weeklyWrap` | `Weekly Wrap` | `周报总结` | Line 1329 |
| `weeklyWrap.children` | `children` | `学生` | Line 1338 |
| `weeklyWrap.cancelSelect` | `Cancel` | `取消选择` | Line 1370 |
| `weeklyWrap.regenerateSelected` | `🔄 Regenerate ({count})` | `🔄 重新生成 ({count})` | Line 1389 |
| `weeklyWrap.generate` | `✨ Generate` | `✨ 生成` | Line 1411 |
| `weeklyWrap.teacherSummary` | `Teacher Summary` | `教师总结` | Line 1438 |
| `weeklyWrap.selected` | `{count} selected` | `已选择 {count} 名学生` | Line 1483 |
| `weeklyWrap.tapToSelectChildren` | `Tap children to select` | `点击选择要生成的学生` | Line 1484 |
| `weeklyWrap.needsAttention` | `Needs Attention` | `需要关注` | Line 1507 |
| `weeklyWrap.onTrack` | `On Track` | `正常发展` | Line 1517 |
| `weeklyWrap.approveAll` | `Approve All ({count} remaining)` | `全部同意 ({count} 剩余)` | Line 1555 |
| `weeklyWrap.approvingAll` | `Approving...` | `正在审批...` | Line 1553 |
| `weeklyWrap.reportsReadyToSend` | `{count} parent reports ready to send` | `{count} 份家长报告准备就绪` | Line 1598 |

**Existing keys to reuse:**
- `status.presented` / `status.practicing` / `status.mastered` — Lines 399-402
- `common.remove` — Lines 850, 1180
- `common.edit` — Line 1099
- `common.done` — Line 1106
- `common.back` — Line 1325
- `common.select` — Line 1372
- `common.saving` — Line 1249
- `common.generating` — Lines 1386, 1406
- `common.backToDashboard` — Line 1633
- `weeklyWrap.worksCount` — Line 796
- `weeklyWrap.nextWeekFocus` — Line 892
- `weeklyWrap.tapToSelect` — Line 919
- `weeklyWrap.sent` / `weeklyWrap.sentCheck` — Lines 1063, 1284
- `weeklyWrap.regenerateAll` — Line 1409
- `weeklyWrap.parentReports` — Line 1448
- `weeklyWrap.noReports` — Line 1470
- `weeklyWrap.deselectAll` — Line 1496
- `weeklyWrap.selectAll` — Line 1498
- `weeklyWrap.inviteParent` — Line 1607
- `weeklyWrap.sending` — Lines 1279, 1614
- `weeklyWrap.sendAll` — Line 1616
- `weeklyWrap.sentDone` — Line 1627

### 10.5 Execution Plan

1. Batch-add ~33 new keys to `en.ts`, `zh.ts`, `es.ts`
2. Add `getAreaLabelI18n` import
3. Replace local `getAreaLabel` with wrapper calling `getAreaLabelI18n`
4. Convert STATUS_CONFIG (3 ternaries → `t()`)
5. Convert all TYPE A ternaries (~67 occurrences)
6. Convert TYPE C ternaries (3 occurrences → `getAreaLabel()`)
7. Convert TYPE G ternaries (3 occurrences → locale-keyed Record maps)
8. Leave TYPE B ternaries as-is (3 occurrences)
9. Grep verify: only TYPE B ternaries should remain

---

## 11. Full Layer 3 Remaining File List (updated Session 61)

**✅ DONE (converted or confirmed no changes needed):**

| File | Original Count | Status |
|------|---------------|--------|
| `components/montree/reports/WeeklyWrapTab.tsx` | 49 | ✅ COMPLETE (Session 60) |
| `components/montree/onboarding/TellGuruCard.tsx` | 20 | ✅ COMPLETE (Session 61) |
| `app/montree/dashboard/photo-audit/page.tsx` | 20 | ✅ COMPLETE (Session 61) |
| `app/montree/dashboard/classroom-overview/page.tsx` | 20 | ✅ COMPLETE (1 TYPE B preserve) |
| `app/montree/dashboard/focus/page.tsx` | 19 | ✅ COMPLETE (Session 61) |
| `app/montree/parent/dashboard/page.tsx` | 18 | ✅ COMPLETE (3 TYPE B preserves) |
| `app/montree/dashboard/language-semester/page.tsx` | 17 | ✅ COMPLETE (Session 61) |
| `components/montree/curriculum/CurriculumWorkList.tsx` | 13 | ✅ ALL TYPE B — no changes |

**⏳ EDITS IDENTIFIED, NOT YET APPLIED:**

| File | Count | TYPE A Edits Needed |
|------|-------|---------------------|
| `components/montree/photo-audit/ThisIsSheet.tsx` | 8 | 2 (lines 492, 974) |
| `app/montree/dashboard/weekly-admin-docs/page.tsx` | 10 | 8 (includes 2 `displayField` specials) |

**📋 NOT YET INVESTIGATED:**

| Priority | File | Count |
|----------|------|-------|
| HIGH | `app/montree/dashboard/weekly-wrap/page.tsx` | 76 (catalogued in Section 10) |
| HIGH | `app/montree/dashboard/[childId]/gallery/page.tsx` | 31 |
| MED | `app/montree/parent/report/[reportId]/page.tsx` | 16 |
| MED | `components/montree/photo-audit/PendingReviewPanel.tsx` | 15 |
| MED | `components/montree/DashboardHeader.tsx` | 14 |
| MED | `components/montree/reports/BatchNarrativesCard.tsx` | 14 |
| MED | `components/montree/child/BigMicPanel.tsx` | 14 |
| MED | `components/montree/child/ChildGuruChat.tsx` | 13 |
| LOW | `components/montree/media/PhotoDetailView.tsx` | 1 |
| LOW | `components/montree/media/MediaCard.tsx` | 1 |
| LOW | `components/montree/media/MediaDetailModal.tsx` | 1 |
| LOW | `components/montree/focus/TodaysFocusStrip.tsx` | 2 |
| LOW | ~40+ other files with <13 occurrences each | ~200+ |

All follow the same TYPE A/B/C/D/G/H patterns documented in Section 5.
