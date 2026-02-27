# i18n Deep Audit — February 27, 2026

## Executive Summary

The Montree i18n system is **well-architected and mostly complete**, but has **3 bugs, 15 untranslated pages, and 1 major feature gap** (curriculum `chineseName` not wired for display). The en.ts and zh.ts files have perfect parity at 1,373 keys each with no empty values.

---

## 1. Architecture Assessment

### What's Good ✅

- **Hydration-safe**: `useState('en')` default + `useEffect` localStorage read prevents SSR/client mismatch
- **Type-safe**: `as const` on translation objects gives full TypeScript autocomplete
- **Fallback chain**: `messages[locale][key] → messages['en'][key] → key` — graceful degradation
- **Zero dependencies**: Custom React Context, no npm packages
- **Clean barrel export**: `lib/montree/i18n/index.ts` re-exports everything
- **Provider placement**: `I18nClientWrapper` wraps the Montree layout correctly

### Architecture Concerns ⚠️

1. **No interpolation helper** — The codebase uses `.replace('{name}', value)` manually in ~30+ places. This is fragile — if a translated string changes the placeholder format, the replace silently fails. A proper `t('key', { name: value })` interpolation function would be safer.

2. **No pluralization support** — Some translations hack around this with `.split(' ')` indexing (e.g., `library/browse/page.tsx` line 302). This breaks in Chinese where word boundaries differ.

3. **1,373 keys in a single flat object** — Works fine now but will get unwieldy. Consider namespaced objects in future (already partially done with dot-separated keys like `dashboard.title`).

4. **No missing-key detection in dev** — `t()` silently returns the key string when not found. A `console.warn` in development would catch typos faster.

---

## 2. Translation File Parity

| Metric | en.ts | zh.ts | Status |
|--------|-------|-------|--------|
| Total keys | 1,373 | 1,373 | ✅ Perfect parity |
| Empty values | 0 | 0 | ✅ All populated |
| Untranslated (English in zh.ts) | 0 | 0 | ✅ All translated |

---

## 3. Bugs Found

### Bug 1: Double Arrow in ABC Model (CONFIRMED)

**File**: `app/montree/dashboard/[childId]/observations/page.tsx` line 233
**Translation**: `observations.antecedentDescription` = `'ntecedent (what happened before) →'`

The JSX adds its own ` →` after each `t()` call:
```tsx
<strong>A</strong>{t('observations.antecedentDescription')} →{' '}
```

The translation string ALSO ends with ` →`. Result: **double arrow** rendered as `→ →`.

**Same bug in zh.ts**: `'前因（之前发生了什么）→'` + JSX `→` = double arrow.

**Fix**: Remove the trailing ` →` from both `antecedentDescription` and `behaviorDescription` translation values in en.ts and zh.ts (consequence correctly has no arrow).

### Bug 2: Fragile Pluralization Hack

**File**: `app/montree/library/browse/page.tsx` line 302
```tsx
t('library.work').replace('{count}', ...).split(' ')[length !== 1 ? 1 : 0]
```

This splits on spaces to pick singular/plural form — completely broken for Chinese where there may be no space-separated words. The Chinese translations need a different pluralization approach.

### Bug 3: Mixed Hardcoded Toast Messages

Several i18n-migrated files still have hardcoded English toast messages:

- `dashboard/students/page.tsx` — `toast.success('Removed')`, `toast.success('Photo saved!')`
- `dashboard/[childId]/reports/page.tsx` — `toast.success('Report published!...')`, `toast.error('Failed to send')`
- `parent/photos/page.tsx` — `toast.error('No child selected')`
- `parent/milestones/page.tsx` — `toast.error('No child selected')`

These files DO import `useI18n` and use `t()` for other strings, so the hardcoded toasts are oversight gaps.

---

## 4. Pages Missing i18n Entirely

### High Priority (User-facing, regularly accessed)

| # | File | Hardcoded Strings |
|---|------|------------------|
| 1 | `admin/students/page.tsx` | Table headers, labels, management UI |
| 2 | `admin/teachers/page.tsx` | Form labels, toasts, classroom assignment |
| 3 | `admin/activity/page.tsx` | Activity types, metrics, dashboard labels |
| 4 | `admin/billing/page.tsx` | Subscription plans, pricing, plan features |
| 5 | `admin/parent-codes/page.tsx` | QR code instructions, button labels |
| 6 | `admin/reports/page.tsx` | "School-wide reports", stat labels, time ranges |
| 7 | `admin/guru/page.tsx` | "Principal Guru", search labels, report modes |
| 8 | `parent/dashboard/page.tsx` | Widgets, stats labels, activity feed |

### Medium Priority

| # | File | Hardcoded Strings |
|---|------|------------------|
| 9 | `dashboard/tools/page.tsx` | Tool titles and descriptions |
| 10 | `dashboard/print/page.tsx` | Print layout labels |
| 11 | `set-password/page.tsx` | Form labels, validation messages, toasts |

### Lower Priority (Less frequently accessed)

| # | File | Hardcoded Strings |
|---|------|------------------|
| 12 | `apply/npo/page.tsx` | Extensive form (org type, countries, mission) |
| 13 | `apply/reduced-rate/page.tsx` | Application form labels |
| 14 | `join/page.tsx` | "Welcome to Montree", code display |
| 15 | `welcome/page.tsx` | Success messages, trial/demo copy |

### Intentionally Excluded (per CLAUDE.md)

- 27+ game pages (`dashboard/games/*`) — English learning games
- 17 marketing/social pages — internal tools
- Super-admin panel — internal
- Demo pages — demo only
- Home pages (`home/*`) — separate system

---

## 5. Curriculum chineseName — NOT WIRED

### What Exists ✅
- All 329 works in the 5 JSON files have `chineseName` populated
- TypeScript interfaces include `name_chinese?: string`
- `WorkSearchBar.tsx` searches both `name` and `name_chinese`
- `EditWorkModal.tsx` has a Chinese Name input field

### What's Missing ❌
**No display component conditionally shows `chineseName` when locale is 'zh'.**

These components always show English names regardless of language setting:
- `FocusWorksSection.tsx` — `{work.work_name}` (English only)
- `WorkPickerModal.tsx` — `{work.name}` (English only)
- `WorkWheelPicker.tsx` — interface has `name_chinese` but never uses it for display
- `CurriculumWorkList.tsx` — no locale-based conditional
- `FullDetailsModal.tsx` — English name only
- `QuickGuideModal.tsx` — English name only

### Recommended Fix
Create a utility function:
```typescript
// lib/montree/i18n/work-name.ts
export function getWorkDisplayName(
  work: { name?: string; work_name?: string; name_chinese?: string },
  locale: string
): string {
  if (locale === 'zh' && work.name_chinese) return work.name_chinese;
  return work.name || work.work_name || '';
}
```

Then import and use in all display components. Estimated: ~6 files, ~30 minutes of work.

---

## 6. Interpolation Patterns Audit

The codebase uses manual `.replace('{placeholder}', value)` for variable interpolation. Found **30+ instances** across the app. Pattern analysis:

| Placeholder | Usage Count | Example |
|------------|-------------|---------|
| `{name}` | 12 | Guru quick questions, child name display |
| `{count}` | 8 | Photo counts, work counts, student counts |
| `{childName}` | 5 | Weekly review, dashboard, milestones |
| `{area}` | 3 | Library browse area names |
| `{percent}` | 1 | Principal setup progress |
| `{period}` | 1 | Summary areas not worked |
| `{num}` | 1 | Classroom name placeholder |

All replacements are simple string substitutions. No cases of nested or chained replacements. The pattern works but is not type-safe — if a key's translation is missing the `{placeholder}`, the replacement silently does nothing.

---

## 7. Recommendations (Priority Order)

### P0 — Fix Bugs (30 min)
1. Remove trailing ` →` from `antecedentDescription` and `behaviorDescription` in both en.ts and zh.ts
2. Replace hardcoded toast messages in the 4 files identified in Bug 3

### P1 — Wire chineseName Display (~1 hour)
1. Create `getWorkDisplayName()` utility
2. Update 6 display components to use locale-aware work names

### P2 — Translate Remaining Pages (~3 hours)
1. Add i18n to 8 admin pages (~40 new keys)
2. Add i18n to parent dashboard (~15 new keys)
3. Add i18n to tools/print/set-password pages (~15 new keys)

### P3 — Architecture Improvements (Future)
1. Add interpolation support to `t()` function: `t('key', { name: 'Emma' })`
2. Add `console.warn` for missing keys in development mode
3. Consider proper pluralization approach for Chinese

---

## 8. Overall Grade

| Area | Grade | Notes |
|------|-------|-------|
| Architecture | **A-** | Clean, hydration-safe, type-safe. Missing interpolation helper. |
| EN/ZH Parity | **A+** | Perfect 1,373/1,373 with no gaps |
| Page Coverage | **B** | ~80% of user-facing pages migrated, 15 remain |
| Curriculum i18n | **D** | Data exists but display not wired |
| Bug Count | **B+** | 3 bugs, 1 rendering (double arrow), 1 logic (pluralization), 1 oversight (mixed toasts) |

**Overall: B+** — Strong foundation, needs chineseName wiring and remaining page migration to reach A.
