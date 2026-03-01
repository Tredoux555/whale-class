# Handoff: i18n Full Platform Cleanup — March 1, 2026

## Summary

Comprehensive i18n cleanup across the entire Montree platform. 3-cycle implement→audit→fix approach. Translation keys grew from ~1,378 to ~1,490+ keys. All user-facing pages now have translation keys defined. Wiring partially complete — keys added, ~6 files still need `t()` calls connected.

## What Was Done

### Cycle 1: Foundation + High-Impact Fixes
- **Created `lib/montree/i18n/server.ts`** — Server-side translator for API routes (can't use React hooks)
  - `getTranslator(locale)` — returns `t()` function for server code
  - `getLocaleFromRequest(url)` — extracts `?locale=` from URL
  - `getTranslatedAreaName(area, locale)` / `getTranslatedStatus(status, locale)`
- **Report system fully translated:**
  - `app/api/montree/reports/route.ts` — status labels, area names use translator
  - `app/api/montree/reports/generate/route.ts` — greeting, closing, area display all locale-aware
  - `lib/montree/reports/pdf-generator.ts` — section headers translated, accepts locale
  - `app/api/montree/reports/send/route.ts` — email subject/body translated
  - `app/montree/parent/report/[reportId]/page.tsx` — status badges use `t()`
- **Parent dashboard** — `app/montree/parent/dashboard/page.tsx` wired with `useI18n()`
- **Home parent components** — PortalChat.tsx and ShelfView.tsx wired
- **Locale passthrough** — Added `?locale=${locale}` to all client→API fetch calls

### Cycle 2: Admin Pages + Curriculum Names
- **Admin pages wired:** `admin/teachers/page.tsx`, `admin/guru/page.tsx`, `dashboard/vocabulary-flashcards/page.tsx`
- **chineseName display** — 6 components now show `work.chineseName` when locale is `zh`:
  - FocusWorksSection, CurriculumWorkList, WorkPickerModal, ShelfView, progress/page, curriculum/browse/page

### Cycle 3: Stragglers + Final Keys
- **47 straggler keys** added (validation messages, placeholders, accessibility labels, curriculum labels, onboarding)
- **Wired into:** set-password, teacher/register, FeedbackButton, curriculum/browse, PhotoEditModal, WorkDetailSheet
- **~110 final keys** added for remaining pages:
  - Toast messages (18 keys)
  - Admin students page (31 keys)
  - Admin reports page (15 keys)
  - Admin activity page (23 keys)
  - Admin billing page (16 keys)
  - Onboarding page expanded (47 keys)
  - PhotoEditModal (19 keys)

### Parity Fixes
- Removed 6 duplicate area keys from both files
- Resolved 62-key gap between en.ts and zh.ts
- Final audit: perfect parity confirmed

## What's NOT Done (Wiring Remaining)

These files have **translation keys defined** in en.ts/zh.ts but the actual `t()` calls are NOT yet wired:

1. **`hooks/useWorkOperations.ts`** — 13 toast messages still hardcoded (use `toast.failedToUpdate`, `toast.removed`, `toast.focusSet`, etc.)
2. **`hooks/useCurriculumDragDrop.ts`** — 3 toast messages still hardcoded
3. **`app/montree/admin/students/page.tsx`** — ~31 strings still hardcoded (add `useI18n()`, replace all strings with `admin.students.*` keys)
4. **`app/montree/admin/reports/page.tsx`** — ~15 strings still hardcoded (add `useI18n()`, replace with `admin.reports.*` keys)
5. **`app/montree/admin/activity/page.tsx`** — ~23 strings still hardcoded (add `useI18n()`, replace with `admin.activity.*` keys)
6. **`app/montree/admin/billing/page.tsx`** — ~16 strings still hardcoded (add `useI18n()`, replace with `admin.billing.*` keys)
7. **`app/montree/onboarding/page.tsx`** — ~30 strings still hardcoded (add `useI18n()`, replace with `onboarding.*` keys)
8. **`components/montree/media/PhotoEditModal.tsx`** — ~12 strings still hardcoded (some already wired for placeholders, rest needs `photoEdit.*` keys)

### How to Wire Each File

Pattern for each file:
```typescript
// 1. Add import at top
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';

// 2. Add hook call inside component
const { t, locale } = useI18n();

// 3. Replace hardcoded strings
// Before: toast.error('Failed to update')
// After:  toast.error(t('toast.failedToUpdate' as TranslationKey))

// Before: <h1>Students</h1>
// After:  <h1>{t('admin.students.title' as TranslationKey)}</h1>
```

For hooks (useWorkOperations, useCurriculumDragDrop): These are not React components, so they can't use `useI18n()` directly. Options:
- Accept a `t` function as a parameter
- Or import `en`/`zh` directly and use a locale parameter

**Estimated effort to complete wiring: ~2 hours**

## Files Created (1)
- `lib/montree/i18n/server.ts` — Server-side translator

## Files Modified (~25)
- `lib/montree/i18n/en.ts` — ~1,490+ keys (up from 1,378)
- `lib/montree/i18n/zh.ts` — ~1,490+ keys (matching en.ts)
- `lib/montree/i18n/index.ts` — Added server exports
- `app/api/montree/reports/route.ts` — Locale-aware status/area names
- `app/api/montree/reports/generate/route.ts` — Locale-aware report generation
- `app/api/montree/reports/send/route.ts` — Translated email subject/body
- `lib/montree/reports/pdf-generator.ts` — Translated PDF headers
- `app/montree/parent/report/[reportId]/page.tsx` — Status badges + locale passthrough
- `app/montree/parent/dashboard/page.tsx` — Full i18n wiring + locale passthrough
- `app/montree/parent/weekly-review/page.tsx` — Locale passthrough
- `app/montree/dashboard/[childId]/reports/page.tsx` — Locale passthrough
- `components/montree/home/PortalChat.tsx` — Full i18n wiring
- `components/montree/home/ShelfView.tsx` — Full i18n + chineseName
- `app/montree/admin/teachers/page.tsx` — Full i18n wiring
- `app/montree/admin/guru/page.tsx` — Full i18n wiring
- `app/montree/dashboard/vocabulary-flashcards/page.tsx` — Full i18n wiring
- `components/montree/child/FocusWorksSection.tsx` — chineseName display
- `components/montree/curriculum/CurriculumWorkList.tsx` — chineseName display
- `components/montree/child/WorkPickerModal.tsx` — chineseName display
- `app/montree/dashboard/[childId]/progress/page.tsx` — chineseName display
- `app/montree/dashboard/curriculum/browse/page.tsx` — chineseName + curriculum labels
- `app/montree/set-password/page.tsx` — Validation message i18n
- `app/montree/teacher/register/page.tsx` — Validation message i18n
- `components/montree/FeedbackButton.tsx` — Accessibility label i18n
- `components/montree/media/PhotoEditModal.tsx` — Placeholder i18n
- `components/montree/home/WorkDetailSheet.tsx` — Accessibility label i18n

## Also Fixed (From Previous Session)
- `lib/montree/guru/context-builder.ts` — Fixed `context_snapshot` mapping for celebration detection
- `lib/montree/guru/conversational-prompt.ts` — Added `mode` to `buildGreetingPrompt()` and `buildFollowUpPrompt()` returns
