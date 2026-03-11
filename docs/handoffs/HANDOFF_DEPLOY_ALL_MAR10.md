# Handoff: Deploy All Local Changes — Mar 10, 2026

## ⚠️ CRITICAL: Everything Below Is LOCAL, NOT PUSHED

All features from Mar 8–10 sessions are complete but sitting on the Mac. One push deploys everything.

## Deploy Command

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: smart capture rewrite + batch reports + whole-class guru fix + classroom overview + audit fixes" && git push origin main
```

No new migrations needed. Railway auto-deploys on push to `main`.

## What's Being Deployed (4 Features + Fixes)

### Feature 1 — Smart Capture / Photo Insight Rewrite (Mar 10 Late)
"Self-driving car" model — Guru auto-tags photos and upgrades progress; teacher overrides anytime.

**Rewritten (2):**
- `app/api/montree/guru/photo-insight/route.ts` — Sonnet vision + `tool_use` structured extraction, curriculum fuzzy matching, auto-tags `montree_media.work_id`, auto-upgrades `montree_child_progress` (upgrade-only), cache in `montree_guru_interactions`, locale-aware
- `components/montree/guru/PhotoInsightButton.tsx` — AreaBadge + work name + status pill + observation + auto-update indicator + `onProgressUpdate` callback

**Modified (3):**
- `app/montree/dashboard/[childId]/progress/page.tsx` — `fetchAll` extracted to `useCallback`, wired `onProgressUpdate`, removed homeschool-only gate
- `lib/montree/i18n/en.ts` — 1 key (`photoInsight.progressAutoUpdated`)
- `lib/montree/i18n/zh.ts` — 1 matching key

### Feature 2 — Whole-Class Guru Fix (Mar 10 Late)
Fixed "No students found in classroom" / 404 error in whole-class Guru mode.

**Modified (3):**
- `lib/montree/guru/classroom-context-builder.ts` — Individual try/catch per query, error tracking, null guards
- `app/api/montree/guru/route.ts` — Errors vs empty classroom distinction, context error logging
- `components/montree/guru/GuruChatThread.tsx` — Client-side classroomId guard

### Feature 3 — Batch Parent Reports "Generate All" (Mar 10 Earlier)
Teachers generate weekly parent reports for ALL children at once from dashboard.

**New (2):**
- `app/api/montree/reports/batch/route.ts` — Per-child batch API, auth + rate limit + 5 parallel queries + saves draft
- `components/montree/reports/BatchReportsCard.tsx` — Dashboard card with sequential generation, progress bar, retry

**Modified (6):**
- `app/montree/dashboard/page.tsx` — Wired BatchReportsCard
- `lib/montree/i18n/en.ts` — 17 new keys (16 `batchReports.*` + `common.networkError`)
- `lib/montree/i18n/zh.ts` — 17 matching keys
- `app/api/montree/guru/photo-insight/route.ts` — Word boundary regex fix + error handling
- `components/montree/guru/PhotoInsightButton.tsx` — Hardcoded title → i18n
- `app/api/montree/reports/generate/route.ts` — Removed all hardcoded Chinese, unified i18n

### Feature 4 — Classroom Overview Print Page + Guru Whole-Class Mode (Mar 8)
A4 landscape print page (4 children per page) + "Whole Class" Guru mode for teachers.

**New (3):**
- `app/montree/dashboard/classroom-overview/page.tsx` — Print-optimized A4 landscape
- `app/api/montree/focus-works/batch/route.ts` — Batch fetch all children + focus works
- `lib/montree/guru/classroom-context-builder.ts` — Builds compact context for all children

**Modified (9):**
- `app/api/montree/guru/route.ts` — Whole-class branching, resolveStudentName, CHILD_SCOPED_TOOLS whitelist
- `lib/montree/guru/conversational-prompt.ts` — `buildClassroomModePrompt()` + CLASSROOM_MODE_SYSTEM_PROMPT
- `lib/montree/guru/tool-definitions.ts` — `student_name` param on 4 tools
- `lib/montree/guru/tool-executor.ts` — `classroomIdOverride` param, whole-class fixes
- `components/montree/guru/GuruChatThread.tsx` — isWholeClassMode prop
- `app/montree/dashboard/guru/page.tsx` — Whole class dropdown + URL deep linking
- `components/montree/DashboardHeader.tsx` — 📋 nav icon for classroom overview
- `lib/montree/i18n/en.ts` — 9 new keys
- `lib/montree/i18n/zh.ts` — 9 matching keys

### Other Changes
- **FeedbackButton Removal** — Removed from 3 layouts (dashboard, admin, parent)
- **Guru Timeouts** — MAX_TOOL_ROUNDS 2→4, TOTAL_REQUEST_TIMEOUT_MS 55s→90s

## Total File Count
- **7 new files** (2 rewritten + 3 new + 2 batch report)
- **~25 modified files** across all features
- **19+ new i18n keys** (perfect EN/ZH parity)
- **15 audit cycles** across all features (all clean)

## Post-Deploy Verification

1. Open `/montree/dashboard` → verify BatchReportsCard appears for teachers
2. Open child progress → upload photo → verify Smart Capture auto-tags + upgrades
3. Open Guru → select "Whole Class" → verify context loads for all students
4. Open `/montree/dashboard/classroom-overview` → verify print layout
5. Verify FeedbackButton is gone from all 3 layouts

## Known Issues (Not Fixed in This Deploy)
- `{count}m ago` timestamp bug in GuruChatThread (Priority #2)
- i18n work names don't translate to Chinese (Priority #1)
- Community Library not yet seeded (Priority #3)
