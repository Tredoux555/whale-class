# Handoff: Teacher Conversational Guru + Guide Chinese Translation + i18n Fixes

**Date:** March 1, 2026 (Late Session)
**Status:** Code complete, ready to push from Mac

---

## Summary

Three interconnected changes: (1) teachers now get the same WhatsApp-style conversational Guru chat that parents have, with a professional colleague persona, (2) QuickGuideModal and FullDetailsModal content translates to Chinese when locale is zh via Sonnet, (3) several i18n bug fixes.

---

## 1. Teacher Conversational Guru

**What changed:** Teachers previously had a rigid structured Q&A form (5 sections: development, curriculum, behavior, parent communication, general). Now they get the same `GuruChatThread` component that parents use — a WhatsApp-style conversational chat — but with a professional colleague persona instead of the nurturing parent persona.

### Files Modified

**`app/montree/dashboard/guru/page.tsx`** — Removed entire structured form UI. Both teachers and parents now render `GuruChatThread`. Teachers pass `isTeacher={true}`.

**`lib/montree/guru/conversational-prompt.ts`** — Added `isTeacher` parameter to `buildConversationalPrompt()`, `buildGreetingPrompt()`, and `buildFollowUpPrompt()`. When `isTeacher=true`:
- Persona: "experienced Montessori colleague" instead of nurturing parent guide
- Tone: professional, direct, practical (skip emotional mirroring)
- Topics: classroom management, AMI methodology, differentiation, parent conferences, observation techniques
- Format: concise, uses Montessori terminology freely, no hand-holding
- Psychology: references Montessori, Piaget, Vygotsky directly (no simplification)

**`app/api/montree/guru/route.ts`** — Updated `isConversational` check: `const isConversational = isHomeschool || role === 'teacher'` (was only homeschool parents). Passes `isTeacher: role === 'teacher'` to prompt builder.

**`components/montree/guru/GuruChatThread.tsx`** — Added `isTeacher?: boolean` prop:
- Teachers skip concern picker onboarding (go straight to chat state)
- Teacher theme: violet/indigo gradient (vs botanical green for parents)
- Teacher welcome: "Hi! I'm your Montessori colleague..." (uses `guru.teacherWelcome` i18n key)
- Teacher placeholder: "Ask about this student..." (uses `guru.teacherAskPlaceholder` key)
- Header shows "Guru Advisor" for teachers (vs "Guru" for parents)

### New i18n Keys (3)
- `guru.guruAdvisor` — "Guru Advisor" / "蒙台梭利顾问"
- `guru.teacherWelcome` — Professional colleague welcome with `{name}` interpolation
- `guru.teacherAskPlaceholder` — "Ask about this student..." / "询问关于这位学生..."

---

## 2. Guide Content Chinese Translation (Sonnet)

**What changed:** When the language toggle is set to Chinese (zh), the QuickGuideModal and FullDetailsModal now display translated content. Work names show their Chinese equivalents, and guide content (quick_guide, materials, presentation_steps, aims, etc.) is translated via Sonnet API call.

### Files Modified

**`app/api/montree/works/guide/route.ts`** — Added `locale` query parameter. When `locale=zh`:
- Fetches guide data normally (English)
- Calls new `translateGuideToZh()` function
- Uses Sonnet (`AI_MODEL`) per user's explicit instruction (NOT Haiku)
- Translates: quick_guide, materials, presentation_steps (title/description/tip), direct_aims, indirect_aims, parent_description, control_of_error, why_it_matters
- Returns merged object with translated fields

**`app/montree/dashboard/[childId]/page.tsx`** (child week view):
- Added `locale` from `useI18n()`
- Added `chineseName?: string` to `Assignment` interface
- Added `quickGuideDisplayName` state
- `openQuickGuide()` accepts optional `chineseName`, sets display name, passes `&locale=zh` to API
- QuickGuideModal and FullDetailsModal use `quickGuideDisplayName` for work name header
- WeekViewGuide callback passes `focusWorks[0].chineseName`

**`components/montree/child/FocusWorksSection.tsx`**:
- Added `chineseName?: string` to `Assignment` interface
- Updated `onOpenQuickGuide` prop type to `(workName: string, chineseName?: string) => void`
- Call site passes `work.chineseName`

**`app/montree/dashboard/curriculum/page.tsx`**:
- Added `locale` from `useI18n()`
- Added `fullDetailsDisplayName` state
- `openFullDetails()` accepts optional `chineseName`, passes `&locale=zh` to API
- FullDetailsModal uses `fullDetailsDisplayName`

**`components/montree/curriculum/CurriculumWorkList.tsx`**:
- Updated `onOpenFullDetails` prop type to `(workName: string, chineseName?: string) => void`
- Call site passes `work.name_chinese`
- **Bug fix:** Line 120 was using `work.chineseName` (wrong field) — fixed to `work.name_chinese` (matches Work type)

---

## 3. Other i18n Fixes

- **FeatureWrapper removal:** Removed from `curriculum/page.tsx`, `capture/page.tsx`, `guru/page.tsx` (onboarding tours were already hidden with `false &&` but FeatureWrapper imports and wrapping were still present)
- **Area name fix:** Curriculum page was using `.replace('_', ' ')` for area names instead of i18n keys — fixed to use `t('areas.practical_life')` etc.

---

## Cost Impact

- Guide translation uses Sonnet (~$0.003-0.01 per translation call)
- Only triggered when locale=zh AND user opens a guide modal
- No caching yet — could add if usage warrants it

---

## Push Command

From Mac terminal:
```bash
cd ~/Desktop/"Master Brain"/ACTIVE/whale
git add app/montree/dashboard/guru/page.tsx app/api/montree/guru/route.ts lib/montree/guru/conversational-prompt.ts components/montree/guru/GuruChatThread.tsx lib/montree/i18n/en.ts lib/montree/i18n/zh.ts app/api/montree/works/guide/route.ts "app/montree/dashboard/[childId]/page.tsx" components/montree/child/FocusWorksSection.tsx app/montree/dashboard/curriculum/page.tsx components/montree/curriculum/CurriculumWorkList.tsx
git commit -m "feat: teacher conversational guru + guide Chinese translation + i18n fixes"
git push origin main
```

---

## Testing

1. **Teacher Guru:** Log in as teacher → open Guru for any student → should see violet-themed WhatsApp chat, not structured form
2. **Parent Guru:** Log in as homeschool parent → should still see green botanical theme, concern picker on first visit
3. **Chinese guide (week view):** Toggle to 中文 → tap a focus work → tap Quick Guide → work name should be Chinese, guide content should be translated
4. **Chinese guide (curriculum):** Toggle to 中文 → expand a work → tap Full Details → same Chinese translation
5. **English guide:** Toggle to EN → guides should show English as before (no `locale` param sent)
