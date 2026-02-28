# Handoff: Full i18n Migration — All Pages Bilingual (Feb 26, 2026)

## Summary

Migrated the ENTIRE Montree application from hardcoded English to bilingual EN↔ZH using the custom React Context i18n system built on Feb 25. Every user-facing page and component now uses `t()` calls.

**Before:** 194 keys across 11 files
**After:** 1,373 keys across ~65+ files
**Key parity:** en.ts and zh.ts both have exactly 1,373 keys ✅

## What Was Migrated (11 Phases + Audit)

### Phase 1 — Core Teacher Flow (~150 keys, 9 files)
- `FocusWorksSection.tsx` — Focus works on week view
- `WorkPickerModal.tsx` — Add extra work modal
- `FullDetailsModal.tsx` — Work details popup
- `QuickGuideModal.tsx` — Quick guide popup
- `WorkDetailModal.tsx` — Work detail + notes
- `AddWorkModal.tsx` — Add custom work form
- `EditWorkModal.tsx` — Edit work form
- `CurriculumWorkList.tsx` — Work list display
- `TeachingToolsSection.tsx` — Teaching tools

### Phase 2 — Onboarding & Welcome (~45 keys, 4 files)
- `WelcomeModal.tsx` — First-time welcome
- `WeekViewGuide.tsx` — 19-step guided tour (STEPS refactored to factory function `getSTEPS(t)`)
- `StudentFormGuide.tsx` — Student form guide (STEPS refactored to factory function)
- `DashboardGuide.tsx` — Dashboard intro

### Phase 3 — Principal Flow (~95 keys, 4 files)
- `principal/setup/page.tsx` — Classroom setup wizard
- `PrincipalSetupGuide.tsx` — Principal setup guide
- `PrincipalAdminGuide.tsx` — Admin walkthrough
- `admin/page.tsx` — Admin overview

### Phase 4 — Child Sub-Pages (~130 keys, 5 files)
- `gallery/page.tsx` — Photo gallery
- `observations/page.tsx` — Behavioral observations (ABC model)
- `summary/page.tsx` — Child summary
- `weekly-review/page.tsx` — Weekly review
- `profile/page.tsx` — Child developmental profile

### Phase 5 — Reports & Messaging (~90 keys, 5 files)
- `[childId]/reports/page.tsx` — Report list & preview
- `reports/[reportId]/page.tsx` — Report detail view
- `messages/page.tsx` — Teacher messaging
- `InviteParentModal.tsx` — Parent invite codes
- `PhotoSelectionModal.tsx` — Photo selection for reports

### Phase 6 — Settings & Media (~45 keys, 5 files)
- `settings/page.tsx` — Settings page
- `CameraCapture.tsx` — Camera interface
- `ChildSelector.tsx` — Child picker
- `DeleteConfirmDialog.tsx` — Delete confirmation
- `InstallBanner.tsx` — PWA install prompt

### Phase 7 — Guru Components (~37 keys, 5 files)
- `GuruChatThread.tsx` — WhatsApp-style chat UI
- `GuruOnboardingPicker.tsx` — Concern picker (10 concerns)
- `ChatBubble.tsx` — Message bubble with time labels
- `GuruDashboardCards.tsx` — Dashboard guru cards
- `ConcernDetailModal.tsx` — Concern detail modal

### Phase 8 — Parent Portal (~109 keys, 6 files)
- `parent/page.tsx` — Parent login
- `parent/photos/page.tsx` — Parent photo view
- `parent/milestones/page.tsx` — Milestone timeline
- `parent/messages/page.tsx` — Parent messaging
- `parent/weekly-review/page.tsx` — Parent weekly review
- `parent/report/[reportId]/page.tsx` — Parent report view

### Phase 9 — Library & Tools (~60 keys, 4 files)
- `library/page.tsx` — Library hub
- `library/browse/page.tsx` — Community works browser
- `library/upload/page.tsx` — Work upload form
- `library/tools/page.tsx` — Teaching tools page

### Phase 10 — Feedback & Utility (~50 keys, 3 files)
- `FeedbackButton.tsx` — Quick feedback widget
- `InboxButton.tsx` — Direct messaging inbox
- `FocusModeCard.tsx` — Focus mode add button

### Phase 11 — Admin Sub-Pages (~60 keys, 3 files)
- `admin/classrooms/[classroomId]/page.tsx` — Classroom detail
- `admin/classrooms/[classroomId]/students/[studentId]/page.tsx` — Student detail
- `admin/settings/page.tsx` — Admin school settings

### Audit Round — Additional Components (~160 keys, 15+ files)
- `WorkWheelPicker.tsx` — Critical work area/position selector
- `MediaGallery.tsx`, `MediaDetailModal.tsx`, `MediaCard.tsx` — Full media system
- `MessageComposer.tsx`, `MessageCard.tsx` — Messaging components
- `ConcernCardsGrid.tsx`, `GuruFAQSection.tsx`, `VoiceNoteButton.tsx`, `QuickGuruFAB.tsx` — Guru ecosystem
- Media gallery page, labels page, progress detail page, work detail page, tools page
- Dashboard home parent strings, guru quick questions

## What's Intentionally NOT Translated

| Category | Why |
|----------|-----|
| 27+ game pages | English language learning games — translating defeats the purpose |
| 17 marketing/social pages | Internal only (super-admin) |
| 7 demo pages | One-time setup |
| Super-admin panel | Internal admin only |

## Curriculum Data Status

The 5 JSON files (`lib/curriculum/data/*.json`) already have a `chineseName` field on all 329 works. The following fields remain English-only:
- `description`, `materials`, `directAims`, `indirectAims`, `controlOfError`, level details

**To wire Chinese names:** Update curriculum browser/display components to check current language and show `chineseName` when zh is selected. This is a ~30-minute task.

## Technical Pattern

```tsx
import { useI18n } from '@/lib/montree/i18n';

export default function MyComponent() {
  const { t } = useI18n();

  return <h1>{t('key.name')}</h1>;
  // Dynamic: t('key').replace('{name}', value)
  // Emoji stays OUTSIDE: {'🎯 ' + t('label')}
}
```

## Files Modified

- `lib/montree/i18n/en.ts` — 1,373 keys (from 194)
- `lib/montree/i18n/zh.ts` — 1,373 keys (from 194)
- ~65 component/page files with `t()` calls added

## Next Steps

1. **Wire curriculum `chineseName`** — show Chinese work names when language is zh
2. **Translate curriculum descriptions** — add `chineseDescription`, `chineseMaterials` etc. to JSON files (~329 works × 5 fields)
3. **Test on mobile** — verify all pages render correctly in both languages
4. **Deploy** — push to main, Railway auto-deploys
