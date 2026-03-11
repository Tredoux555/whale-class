# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management

Production: `https://montree.xyz` (migrated from teacherpotato.xyz — old domain returns 405 on API calls)
Deploy: Railway auto-deploys on push to `main`
Git remote: `git@github.com:Tredoux555/whale-class.git` (SSH — Cowork VM key "Cowork VM Feb 15" added Feb 15, 2026; old "Cowork VM" Feb 11 key is stale)
Local path: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale` (note space in "Master Brain")

---

## 🔥 NEXT SESSION PRIORITIES

### Deploy All Local Changes (Priority #0 — URGENT)

All code is local, NOT yet pushed. 4 features + fixes from Mar 8–10 sessions + fire-and-forget Smart Capture from Mar 11. Push from Mac: `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: smart capture rewrite + batch reports + whole-class guru fix + classroom overview + fire-and-forget + audit fixes" && git push origin main`

**Includes:** Smart Capture rewrite (2 rewritten + 3 modified), fire-and-forget background store (1 new + 1 rewritten), whole-class Guru fix (3 files), FeedbackButton removal (3 layouts), batch parent reports (2 new + 6 modified), classroom overview print page (2 new), guru whole-class mode (1 new + 9 modified), 3-cycle audit fixes (8 issues fixed across 9 files), 15+ audit cycles all clean, 23+ new i18n keys.
**Full deploy handoff:** `docs/handoffs/HANDOFF_DEPLOY_ALL_MAR10.md`, `docs/handoffs/HANDOFF_FIRE_AND_FORGET_SMART_CAPTURE_MAR11.md`, `docs/handoffs/HANDOFF_AUDIT_FIXES_MAR11.md`

### Fix i18n Work Names Not Translating to Chinese (Priority #1)

**Problem:** When Chinese is selected, UI labels translate correctly but **work names stay English** ("Dropper Water Transfer" instead of Chinese). Affects: FocusWorksSection work names, Weekly Admin generated content, classroom overview print page.

**Root cause:** The Weekly Admin API (`/api/montree/children/[childId]/weekly-admin/route.ts`) passes English `work_name` from `montree_child_focus_works` to Claude without enriching with Chinese names. The child dashboard's focus works fetch may also lack enrichment. The `enrichWithChineseNames()` function exists in curriculum-loader.ts and works in the progress API — just needs to be wired into more places.

**Fix plan (~1hr):**
1. `weekly-admin/route.ts` — Import `getChineseNameMap()`, enrich focus work names before passing to Claude prompt context
2. Verify child dashboard focus works fetch includes Chinese name enrichment (check what API the `[childId]/page.tsx` focus works section uses)
3. `classroom-overview/page.tsx` — Already enriches via batch API's `getChineseNameMap()` — verify it works
4. Ensure Claude's `outputLang` directive is working for narrative generation in Weekly Admin

### Fix `{count}m ago` Timestamp Bug (Priority #2)

GuruChatThread welcome message shows literal `{count}m ago` instead of actual time. Check timestamp formatting in GuruChatThread — likely a missing i18n interpolation or template literal issue.

### Seed Community Library (Priority #3)

Go to `/montree/super-admin/community` → Click "Seed 329 Works". The fix for the 500 error is deployed (commit `41bf0c18`).

### Per-School Guru Personality Settings (Priority #4)

**Status:** DESIGNED, ready to build. ~1-2 hours.
**What:** Let principals configure Guru tone, philosophy, focus areas, materials available, custom instructions per school.
**Handoff:** `docs/handoffs/HANDOFF_PER_SCHOOL_GURU_SETTINGS.md`

### Stripe Setup (Priority #5 — Deferred)

**Needs:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_GURU_MONTHLY`, `STRIPE_WEBHOOK_SECRET_GURU`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM`

### i18n Remaining Wiring (Priority #6)

Wire `t()` calls in: `useWorkOperations.ts` (13 toasts), `useCurriculumDragDrop.ts` (3 toasts), `admin/students/page.tsx` (~31 strings), `admin/reports/page.tsx` (~15), `admin/activity/page.tsx` (~23), `admin/billing/page.tsx` (~16), `onboarding/page.tsx` (~30), `PhotoEditModal.tsx` (~12). Estimated ~2hrs.

### Story Vault Image Viewer (Priority #7 — Deferred)

**Handoff:** `docs/HANDOFF_VAULT_IMAGE_VIEWER_FEB16.md`

---

## CURRENT STATUS (Mar 11, 2026)

### Session Work (Mar 11, 2026 — Late Session)

**3-Cycle Audit Fix Loop — COMPLETE, NOT YET DEPLOYED (8 issues fixed across 9 files, 3 audit cycles):**

Full audit-fix-reaudit cycle on all unpushed code from Mar 8–11 sessions. Ran until zero issues found.

**Cycle 1 (7 fixes):**
- `PhotoInsightButton.tsx` — 2 silent `catch {}` blocks → added `console.error` logging + non-ok response logging
- `BatchReportsCard.tsx` — Hardcoded `'Network error'` → `t('common.networkError')` i18n call
- `GuruChatThread.tsx` — 3 hardcoded English strings → i18n `t()` calls (`selectImageFile`, `imageTooLarge`, `unableLoadClassroom`)
- `photo-insight/route.ts` — Missing rate limiting on Sonnet vision API → added `checkRateLimit()` 60/hr per IP
- `classroom-context-builder.ts` — `.single()` → `.maybeSingle()` on classroom name fetch (prevents throw on 0 rows)
- `batch/route.ts` — `.single()` → `.maybeSingle()` on child fetch (same fix)
- `en.ts` + `zh.ts` — 4 new i18n keys with perfect EN/ZH parity

**Cycle 2 (1 fix):**
- `GuruChatThread.tsx` — Init `useEffect` made 3 fetch calls without cleanup → added `AbortController` with signal on all 3 fetches + cleanup `return () => abortController.abort()` + `AbortError` guard in catch

**Cycle 3:** CLEAN — zero issues across all 9 modified files.

**False positives identified:** `/api/montree/curriculum` POST flagged as missing (exists, handles single work additions with full auth). Focus-works "batch endpoint" flagged (doesn't exist — only single upserts).

**Deploy:** ⚠️ NOT YET PUSHED. Include in consolidated push. No new migrations.
**Handoff:** `docs/handoffs/HANDOFF_AUDIT_FIXES_MAR11.md`

---

## PREVIOUS STATUS (Mar 10, 2026)

### Session Work (Mar 10, 2026 — Late Session)

**Smart Capture Rewrite + Whole-Class Guru Fix + FeedbackButton Removal — COMPLETE, NOT YET DEPLOYED (2 rewritten files, 6 modified, 9 audit passes):**

Three changes in this session:

**Feature 1 — Smart Capture / Photo Insight Complete Rewrite:**
"Self-driving car" model — Guru auto-tags photos and upgrades progress; teacher overrides anytime on the shelf.

**Rewritten files (2):**
- `app/api/montree/guru/photo-insight/route.ts` — Complete rewrite (~420 lines). Sonnet vision + `tool_use` for structured extraction (work_name, area, mastery_evidence, confidence 0-1, observation). Curriculum fuzzy matching via `fuzzyScore()`. Auto-tags `montree_media.work_id` via classroom curriculum work lookup. Auto-upgrades `montree_child_progress` with upgrade-only protection (STATUS_RANK: never downgrade). Cache in `montree_guru_interactions`. Locale-aware Chinese system prompt. All `.maybeSingle()`.
- `components/montree/guru/PhotoInsightButton.tsx` — Complete rewrite (~170 lines). AreaBadge + work name + status pill (mastered/practicing/presented with colors). Brief observation. Auto-update indicator with i18n. `onProgressUpdate` callback. AbortController cleanup.

**Modified files (4):**
- `app/montree/dashboard/[childId]/progress/page.tsx` — Extracted `fetchAll` from `useEffect` to `useCallback` (was inaccessible to JSX — CRITICAL bug caught in Audit Cycle 3). Added `useCallback` import. Wired `onProgressUpdate={fetchAll}`. Removed homeschool-only gate — Smart Capture now available to ALL users.
- `lib/montree/i18n/en.ts` — 1 new key (`photoInsight.progressAutoUpdated`)
- `lib/montree/i18n/zh.ts` — 1 matching Chinese key

**3x3 Audit Results (9 passes):** Cycle 1: 12 issues (all fixed). Cycle 2: 2 issues (all fixed). Cycle 3: 2 issues (all fixed — useCallback extraction + text truncation). Final state: CLEAN.

**Feature 2 — Whole-Class Guru 404 Fix:**
Fixed "No students found in classroom" error when using Guru whole-class mode.

**Modified files (3):**
- `lib/montree/guru/classroom-context-builder.ts` — Individual try/catch per DB query, error tracking array, null/empty guards
- `app/api/montree/guru/route.ts` — Distinguishes errors vs empty classroom, logs context errors
- `components/montree/guru/GuruChatThread.tsx` — Client-side guard for missing classroomId

**3x3 Audit Results (6 passes):** All clean after fixes.

**Feature 3 — FeedbackButton Removal:**
- `app/montree/dashboard/layout.tsx` — Removed FeedbackButton
- `app/montree/admin/layout.tsx` — Removed FeedbackButton
- `app/montree/parent/layout.tsx` — Removed FeedbackButton

**Deploy:** ⚠️ NOT YET PUSHED. Push from Mac to deploy. No new migrations needed.
**Handoff:** `docs/handoffs/HANDOFF_SMART_CAPTURE_WHOLECLASS_MAR10.md`

### Session Work (Mar 10, 2026 — Earlier)

**Batch Parent Reports "Generate All" + 5 Audit Fixes — COMPLETE, NOT YET DEPLOYED (2 new files, 6 modified, 6 audit cycles):**

Built "Generate All Reports" dashboard card for teachers to generate weekly parent reports for ALL children at once. Also fixed 5 pre-existing audit findings.

**New files (2):**
- `app/api/montree/reports/batch/route.ts` — Per-child batch report API. Auth + rate limit (50/day) + 5 parallel DB queries (child, weekProgress, focusWorks, allProgress, media) + saves draft to `montree_weekly_reports`. Locale validated against `['en', 'zh']` whitelist. supabaseUrl guard for photo URLs.
- `components/montree/reports/BatchReportsCard.tsx` — Dashboard card with sequential generation loop, AbortController, mountedRef pattern, progress bar, expandable per-child results, retry failed. Full i18n (16 keys).

**Modified files (6):**
- `app/montree/dashboard/page.tsx` — Wired BatchReportsCard after WeeklyAdminCard (teachers only)
- `lib/montree/i18n/en.ts` — 17 new keys (16 `batchReports.*` + `common.networkError`)
- `lib/montree/i18n/zh.ts` — 17 matching Chinese keys (perfect parity)
- `app/api/montree/guru/photo-insight/route.ts` — Word boundary regex fix (CRITICAL: "hand" was matching "Sand Tray") + error handling on media update
- `components/montree/guru/PhotoInsightButton.tsx` — Hardcoded title → i18n `t()` call
- `app/api/montree/reports/generate/route.ts` — Removed ALL hardcoded Chinese, unified i18n for both locales

**6 Audit Cycles:** Cycle 1 (29 issues → all fixed, full API rewrite + component rewrite), Cycle 2 (3 real fixes: locale validation, supabaseUrl guard, networkError key), Cycle 3 (CLEAN), Deep audit API (1 fix: date format consistency), Deep audit UI (CLEAN), Deep audit i18n (CLEAN).

**Deploy:** ⚠️ NOT YET PUSHED. Push from Mac to deploy. No new migrations needed.
**Handoff:** `docs/handoffs/HANDOFF_BATCH_REPORTS_MAR10.md`

---

## PREVIOUS STATUS (Mar 8, 2026)

### Session Work (Mar 8, 2026 — Late Night Session)

**Classroom Overview Print Page + Guru Whole-Class Mode — COMPLETE, NOT YET DEPLOYED (3 new files, 9 modified, 2 build-audit cycles):**

Two features built across 2 sessions (continued from previous context that ran out). 5 audit bugs found and fixed.

**Feature 1 — Classroom Overview Print Page:**
A4 landscape print page showing all children with focus works + large writing space. 2×2 grid (4 per page), auto page breaks, Chinese name support. Accessed via 📋 icon in DashboardHeader.

**New files (2):**
- `app/montree/dashboard/classroom-overview/page.tsx` — Print-optimized page (~200 lines)
- `app/api/montree/focus-works/batch/route.ts` — Batch fetch all children + focus works for classroom

**Feature 2 — Guru "Whole Class" Mode:**
Teachers select "👥 Whole Class" from Guru dropdown. Guru gets context for ALL students — can suggest teaching groups, compare progress, plan lessons. Tools work via `student_name` parameter resolved to child_id.

**New file (1):**
- `lib/montree/guru/classroom-context-builder.ts` — Builds compact context for all children (4 parallel Supabase queries, token-efficient formatting)

**Modified files (9):**
- `app/api/montree/guru/route.ts` — Whole-class branching: skip per-child auth, validate classroom, buildClassroomContext, resolveStudentName helper, tool loop with CHILD_SCOPED_TOOLS whitelist, interaction save with null child_id
- `lib/montree/guru/conversational-prompt.ts` — Added `buildClassroomModePrompt()` + CLASSROOM_MODE_SYSTEM_PROMPT
- `lib/montree/guru/tool-definitions.ts` — Added `student_name` to 4 tools (set_focus_work, clear_focus_work, update_progress, save_observation)
- `lib/montree/guru/tool-executor.ts` — Added `classroomIdOverride` param, fixed get_classroom_overview + group_students for whole-class mode
- `components/montree/guru/GuruChatThread.tsx` — isWholeClassMode prop, welcome messages, placeholder text
- `app/montree/dashboard/guru/page.tsx` — Whole class dropdown option, URL deep linking
- `components/montree/DashboardHeader.tsx` — 📋 nav icon (teachers only)
- `lib/montree/i18n/en.ts` — 9 new keys
- `lib/montree/i18n/zh.ts` — 9 new keys (perfect parity)

**Timeouts adjusted:** MAX_TOOL_ROUNDS 2→4, TOTAL_REQUEST_TIMEOUT_MS 55s→90s (classroom ops need more rounds)

**Audit fixes (5 bugs, all fixed):**
1. CRITICAL: `batch/route.ts` — `auth.classroomId` is optional, strict equality always rejected → DB school verification
2. CRITICAL: `classroom-context-builder.ts` — wrong table `montree_child_work_progress` → `montree_child_progress`
3. HIGH: `guru/route.ts` — no school verification for whole-class classroom_id → added DB check
4. HIGH: `tool-executor.ts` — `get_classroom_overview`/`group_students` pass 'whole_class' as childId → added classroomIdOverride
5. LOW: `batch/route.ts` — redundant getSupabase() calls → consolidated

**Production bugs seen (not yet deployed):**
- Guru whole-class shows "No students found in classroom" (wrong table name in context builder)
- POST `/api/montree/guru` returns 404 (same root cause)
- `{count}m ago` timestamp shows as literal string in GuruChatThread (not yet fixed)

**i18n gap found:** Work names don't translate to Chinese in FocusWorksSection and Weekly Admin. UI labels translate fine. Root cause: Weekly Admin API doesn't enrich focus work names with `getChineseNameMap()` before passing to Claude. Fix planned for next session.

**Deploy:** ⚠️ NOT YET PUSHED. All changes local. Push from Mac to deploy.
**Handoff:** `docs/handoffs/HANDOFF_CLASSROOM_OVERVIEW_GURU_WHOLECLASS_MAR8.md`

### Session Work (Mar 8, 2026 — Late Session)

**Guru Reliability Fix — Hanging/Timeout Resolution — COMPLETE + DEPLOYED (3 commits: `0b60fccb`, `70469eb9`, `ea3dc455`):**

Deep audit + 3-commit fix for Guru hanging on tool-use requests. Root cause: multi-round tool loop + hallucination retry + fallback API call = up to 275s worst case. Fixed to 55s max.

**Root causes found:**
1. CRITICAL: Hallucination retry safety net (commit `1b38a482`) added a SECOND full Anthropic API call when it detected the model claiming actions without tool calls. Each call up to 55s = total 110s+.
2. HIGH: Fallback text-only API call (lines 504-543) fired when tools produced no text — another 15-55s API call on top.
3. HIGH: MAX_TOOL_ROUNDS=3 × API_TIMEOUT=55s = 165s worst case for tool loop alone.
4. MEDIUM: `shelfUpdatePattern` regex too broad (`update.*her`, `mastered.*!`) — false positives forced unnecessary tool_choice:"any".
5. LOW: No client-side fetch timeout — typing indicator showed forever if server hung.

**Fixes applied (3 files modified):**
- `app/api/montree/guru/route.ts`:
  - MAX_TOOL_ROUNDS 3→2, API_TIMEOUT_MS 55s→35s
  - Added TOTAL_REQUEST_TIMEOUT_MS=55s wrapping initial call + all tool rounds
  - Removed hallucination retry (replaced with log-only monitoring)
  - Removed fallback text-only API call (replaced with server-side summary from tool results)
  - Tightened `shelfUpdatePattern` regex with `\s+` word boundaries
- `components/montree/guru/GuruChatThread.tsx`:
  - Added 60s client-side fetch timeout with AbortController
  - AbortError caught separately → shows "took too long" instead of "connection failed"
- `lib/montree/guru/conversational-prompt.ts`:
  - Added anti-hallucination instructions to TEACHER_NORMAL_MODE and TOOL_USE_INSTRUCTIONS
  - Added SPEED RULE: batch multiple tool calls in single response to minimize rounds

**Latency analysis (before vs after):**
- Before: Initial(55s) + 3 rounds(55s×3) + fallback(55s) + retry(55s) = **275s worst case**
- After: Total capped at 55s, per-round 35s, max 2 rounds, no fallback, no retry = **55s max**

**Deploy:** ✅ 3 commits pushed to main, Railway auto-deploy.

### Session Work (Mar 8, 2026 — Earlier)

**Guru Curriculum Access + Weekly Admin System + Performance Analysis — COMPLETE + DEPLOYED (3 modified files, 1 new file, 2 commits `45b6aedf` + `bd90c3ba`):**

Multi-part session: gave the Guru read-only curriculum browsing tools, built per-child + batch weekly admin generation, debugged two production issues, and did deep Guru performance analysis.

**Part 1 — Weekly Admin Per-Child + Batch (earlier in session, from previous context):**
Extended the weekly admin generator to support per-child generation AND batch "Generate All" for the whole classroom. Fixed 404 on weekly admin route (missing route file) and Guru hanging issue (conversation memory query returning too many rows).

**Part 2 — Guru Curriculum Tools (3 read-only tools added to 12 total):**
Guru previously had 9 action tools but couldn't SEE the curriculum. Added 3 read-only tools so it can browse, search, and check progress before recommending works:

- `browse_curriculum` — Browse works by area, optional category filter. Caps at 30 results with 80-char descriptions.
- `get_child_curriculum_status` — Child's progress across all works in an area (mastered/practicing/presented/not_started + current focus work). 2 parallel DB queries.
- `search_curriculum` — Keyword search across name/description/category/materials. Caps at 20 results.

All 3 tools: area enum validation, try-catch on curriculum loading, token-optimized output. Available in SETUP, INTAKE, CHECKIN, NORMAL modes (not REFLECTION).

**Files modified (3):**
- `lib/montree/guru/tool-definitions.ts` — 3 new tool schemas added to `GURU_TOOLS` array (now 12 total: 9 action + 3 read-only)
- `lib/montree/guru/tool-executor.ts` — 3 new case blocks with enum validation, try-catch, AREA_LABELS map
- `lib/montree/guru/conversational-prompt.ts` — CURRICULUM BROWSING section added to TOOL_USE_INSTRUCTIONS

**Audit (4 issues found, all fixed in commit `bd90c3ba`):**
- CRITICAL: Area enum not validated (could silently return empty) → added `validAreas` check
- HIGH: No try-catch on `loadAllCurriculumWorks()` → wrapped with graceful error
- HIGH: Token explosion risk (50 results × 100-char descriptions) → reduced to 30 results × 80-char descriptions, removed sequence field
- MEDIUM: Description truncation inconsistency → standardized to 80 chars

**Part 3 — Guru Performance Analysis:**
Investigated 10-30s response times. Found system prompt is ~52,000 chars (~13,000 tokens). Biggest contributors: psychology knowledge (5,000 tokens), tool definitions (2,800 tokens), sensitive periods (1,500 tokens). Total input per call: 20-25K tokens. Conclusion: 10-30s is normal for Sonnet with this context + up to 3 tool rounds. Haiku not viable — lacks nuance for developmental psychology.

**Part 4 — Marketing Quotes:**
Added "Killer Quotes — Use These Everywhere" section to nerve-center/page.tsx (Playbook tab). 3 amber-themed quote cards: speed vs expert consultation, short-form social media version, parent-facing feature depth angle.

**Deploy:** ✅ Committed + pushed from Mac via Desktop Commander.
**Handoff:** `docs/handoffs/HANDOFF_CURRICULUM_TOOLS_MAR8.md`

---

## PREVIOUS STATUS (Mar 7, 2026)

### Session Work (Mar 7, 2026)

**ESL Guru Upgrade + Spy Game & Command Cards Generators — COMPLETE + DEPLOYED (4 new files, 5 modified, 1,621 insertions, commit `908d93bc`):**

Three-part session: ESL intelligence for the Guru, plus two new printable generators for the Montree library tools page.

**Part 1 — ESL Guru Upgrade (1 new, 3 modified):**
Guru now recognizes L1 Chinese children learning English. New `esl-chinese-learners.ts` knowledge file (~200 lines): 5 developmental stages (Silent Period → Advanced Fluency), Mandarin phonological challenges (th/v/r/l, clusters, final consonants), L1 transfer patterns, classroom strategies (TPR, comprehensible input). `context-builder.ts` auto-detects ESL status from school settings or name heuristics. `conversational-prompt.ts` injects ESL context into all Guru conversations. `ami-language-progression.ts` got `eslNotes` on 12 language works.

**Part 2 — Spy Game Generator (1 new file, ~700 lines):**
`app/montree/library/tools/spy-game/page.tsx` — 3 ESL-friendly levels: Sound Spy (12 sounds, Mandarin-shared first), Word Spy (CVC by vowel), Action Spy (16 TPR commands). 3 print modes (mission cards, code cards, spy report). Custom word/action input + quick-add CVC sets.

**Part 3 — Command Cards Generator (1 new file, ~480 lines):**
`app/montree/library/tools/command-cards/page.tsx` — AMI Language Work #24. 3 levels: single commands (24 verbs + optional Chinese), two-action phrases (16), action chains (12). Cards per page, border color, font settings.

**Part 4 — Integration (3 modified):**
- `tools/page.tsx` — 2 new TOOLS entries
- `en.ts` + `zh.ts` — 30 new i18n keys each (perfect parity)

**Also this session (earlier commits):**
- Fixed 500 on POST `/api/montree/sessions` (work_id NOT NULL) — commit `5db683b9`
- Fixed context-builder wrong column (work_name → work_id) — commit `b964cea1`
- Reverted voice note extraction from Sonnet back to Haiku

**Audit:** 4 issues found and fixed (dead MissionCard interface, unused pageNum variable, missing escapeHtml on Chinese text, comment concatenation). Zero TS errors.

**Deploy:** ✅ Pushed from Mac, Railway auto-deploy.
**Handoff:** `docs/handoffs/HANDOFF_ESL_GURU_GENERATORS_MAR7.md`

---

## PREVIOUS STATUS (Mar 6, 2026)

### Session Work (Mar 6, 2026)

**Voice Notes + Weekly Admin Generator — COMPLETE + DEPLOYED (9 new files, 4 modified, ~1,940 lines, 3 audit cycles, commit `e2068e01`):**

Two-part feature: inline voice note recorder for child observations + weekly admin document generator for government-required school paperwork.

**Part 1 — Voice Notes:** Teachers tap 🎙️ next to Save in any expanded work card's observation textarea. Records audio → Whisper transcribes → Sonnet extracts (child, work, area, status, behavioral notes) via `tool_use` → auto-applies to progress when confidence ≥ 0.85 (child match) + ≥ 0.7 (work match + status). Transcript fills textarea so teacher can edit before saving.

**Part 2 — Weekly Admin Generator:** Dashboard card generates copy-paste-ready narrative summaries + weekly plan tables for government-required school documents. Uses Sonnet via streaming. Rate limited 3/day per classroom.

**New files (9):**
- `migrations/136_voice_notes_weekly_admin.sql` — 2 tables (`montree_voice_notes`, `montree_weekly_admin_output`) + indexes + RLS + trigger
- `lib/montree/voice-notes/extraction.ts` (~310 lines) — Sonnet `tool_use` extraction, Jaro-Winkler name matching, fuzzyScore work matching
- `lib/montree/voice-notes/weekly-admin.ts` (~250 lines) — Sonnet narrative generation + plan tables
- `lib/montree/voice-notes/index.ts` — Barrel exports
- `app/api/montree/voice-notes/transcribe/route.ts` — Whisper transcription endpoint
- `app/api/montree/voice-notes/route.ts` — POST (create + extract + auto-apply) + GET (fetch notes)
- `app/api/montree/voice-notes/weekly-admin/route.ts` — POST (generate) + GET (fetch)
- `components/montree/voice-notes/ChildVoiceNote.tsx` — Compact inline mic button (7×7, next to Save)
- `components/montree/voice-notes/WeeklyAdminCard.tsx` — Dashboard card with copy buttons

**Modified files (4):**
- `components/montree/child/FocusWorksSection.tsx` — Wired mic button next to Save, `pb-10` textarea padding
- `app/montree/dashboard/[childId]/page.tsx` — Removed standalone ChildVoiceNote, now inline in FocusWorksSection
- `app/montree/dashboard/page.tsx` — Wired WeeklyAdminCard on teacher dashboard
- `lib/montree/i18n/en.ts` + `zh.ts` — ~30 `voiceNotes.*` + ~15 `weeklyAdmin.*` keys each

**Voice Note Inline Relocation (late session):** Moved from standalone floating component above focus works to compact mic button next to Save in each observation textarea. `onTranscript` callback fills textarea with transcript. useEffect cleanup on unmount (aborts fetch, stops recorder, releases mic).

**Model upgrade:** Extraction changed from Haiku to Sonnet (`AI_MODEL`) for rock-solid structured extraction.

**3 Audit Cycles:** Cycle 1 (2 issues), Cycle 2 (5 issues), Cycle 3 (0 issues) + inline relocation audit (2 issues). All fixed.

**Railway Deploy Fix:** Auto-deploy broken for this session. Fixed via Railway GraphQL API `serviceInstanceDeployV2` mutation with explicit `commitSha`. Migration 136 run manually.

**Deploy:** ✅ Code pushed + deployed via GraphQL API. Migration 136 run.
**Handoffs:** `docs/handoffs/HANDOFF_VOICE_NOTE_INLINE_MAR6.md`

---

## PREVIOUS STATUS (Mar 5, 2026)

### Session Work (Mar 5, 2026)

**RAZ Reading Tracker Redesign — COMPLETE + DEPLOYED (1 new/rewritten file, 2 modified, ~600 lines):**

Complete UI redesign of `/montree/dashboard/raz` from table-based layout to status-first rapid-fire camera flow. 3 build iterations with 2 full audit cycles (16 total issues found and fixed).

**New UX:** Each student card shows 4 status buttons (Read / Not Read / No Folder / Absent). Tapping "Read" triggers a rapid-fire 3-photo camera sequence (Book → Signature → New Book) with non-blocking background uploads — zero lag between students.

**Architecture (v3 — ref-based):**
- `flowRef` as single source of truth for camera state (set synchronously, avoids React batching issues)
- `cameraFlowUI` state only for rendering
- `sessionRef` / `dateRef` avoid stale closures in callbacks
- `openCamera()` sets ref FIRST, then state, then triggers file input
- Single `handlePhotoCapture` with empty deps array (reads from refs)
- Upload merges only photo URL field, never overwrites status
- Unique upload keys for retakes (`retake-${childId}-${photoType}`)
- AbortController cleanup on unmount for all in-flight uploads

**Files:**
- `app/montree/dashboard/raz/page.tsx` — Complete rewrite (~600 lines), 3 iterations + 2 audit cycles
- `app/api/montree/raz/route.ts` — Auth fix (3 instances)
- `app/api/montree/raz/upload/route.ts` — Auth fix (1 instance)

**CRITICAL Auth Bug Fixed:** All RAZ API routes returned 401 on every request. Root cause: `verifySchoolRequest()` returns `VerifiedRequest | NextResponse` but RAZ routes checked `auth.valid` (doesn't exist on either type — always `undefined`). Fixed to `if (auth instanceof NextResponse) return auth;` pattern. 4 instances across 2 files.

**Also this session:**
- Migration 134 run (feature toggles: 3 tables + 6 features seeded + RAZ tracker table)
- Migration 135 run (voice observation: 4 tables + storage bucket)
- Voice Observations feature enabled for Beijing International school
- Voice observation bug fix: missing `.json()` on `montreeApi()` calls in voice observation page
- AMI English Language Progression document generated

**Performance Optimization — COMPLETE + AUDITED (2 new files, 4 modified, ~470 lines):**

Zero-dependency performance infrastructure to eliminate page load lag. Three pillars:

1. **SWR Data Cache** (`lib/montree/cache.ts`, ~300 lines) — `useMontreeData<T>()` hook with stale-while-revalidate caching (30s TTL), request deduplication, window focus refetch, LRU eviction at 100 entries. Also exports `invalidateCache()`, `setCacheData()`, `prefetchUrl()`.
2. **Client-Side Image Compression** (`compressImage()` in cache.ts) — Canvas API reduces 5MB phone photos to ~150KB JPEG before upload. Never rejects (try/catch wrapper, all error paths resolve with original file).
3. **Skeleton Loading Screens** (`components/montree/Skeletons.tsx`, ~170 lines) — 6 page-specific skeletons (Dashboard, WeekView, Gallery, Progress, RAZ, Curriculum) replacing blank pages and bouncing emoji spinners.

**Wired into 4 pages:** Dashboard (SWR cache + skeleton + homeschool redirect flash fix + searchParams fix), RAZ (image compression + skeleton), Child Week View (skeleton), Progress (skeleton).

**Audit:** 18 issues found (5 CRITICAL, 1 HIGH, 12 MEDIUM). All 5 CRITICALs + 1 HIGH fixed:
- compressImage: wrapped in try/catch, never rejects
- Dashboard: early return with skeleton during homeschool redirect (prevents teacher UI flash)
- prefetchUrl: .finally() in chain, error guards, evictOldest()
- searchParams: extracted primitive boolean to avoid object reference in useEffect deps

**Files:**
- `lib/montree/cache.ts` — NEW (~300 lines)
- `components/montree/Skeletons.tsx` — NEW (~170 lines)
- `app/montree/dashboard/page.tsx` — SWR cache + skeleton + redirect fix + searchParams fix
- `app/montree/dashboard/raz/page.tsx` — Image compression + skeleton
- `app/montree/dashboard/[childId]/page.tsx` — Skeleton
- `app/montree/dashboard/[childId]/progress/page.tsx` — Skeleton

**Deploy:** ✅ RAZ page pushed. ✅ Auth fix pushed (commit `2c8aec00`). ⚠️ Performance files need manual push (VM disk full — 6 files listed above).
**Handoffs:** `docs/handoffs/HANDOFF_RAZ_TRACKER_REDESIGN_MAR5.md`, `docs/handoffs/HANDOFF_PERFORMANCE_OPTIMIZATION_MAR5.md`

---

## PREVIOUS STATUS (Mar 4, 2026)

### Session Work (Mar 4, 2026)

**Voice Observation System — COMPLETE + DEPLOYED (20 new files, 4 modified, ~3,730 lines, commit `005bc94a`):**

Premium ($1000/month) hands-free classroom observation system. Teachers record work cycles, AI transcribes (Whisper), identifies students (Jaro-Winkler), matches works to 329-work curriculum (fuzzy-matcher), and proposes progress updates (Haiku tool_use). Teacher reviews and commits at end-of-day. ALL audio/transcripts permanently deleted after commit.

**Build methodology:** 3 plan-audit cycles + 3 build-audit cycles. 9 issues found and fixed across 3 audit cycles.

**New files (20):**
- `migrations/135_voice_observations.sql` — 4 tables (sessions, extractions, audio_chunks, student_aliases) + `voice-obs` private storage bucket
- `lib/montree/voice/audio-processor.ts` (~344 lines) — Whisper transcription orchestrator, cost calculator, cleanup, session processor
- `lib/montree/voice/observation-analyzer.ts` (~303 lines) — Haiku tool_use analysis pipeline, transcript segmentation, extraction consolidation
- `lib/montree/voice/student-matcher.ts` (~170 lines) — Jaro-Winkler name matching + alias learning
- `lib/montree/voice/prompts.ts` (~175 lines) — Haiku system prompt + tool definition
- `lib/montree/voice/index.ts` — Barrel exports
- 9 API routes: `start`, `upload`, `pause`, `end`, `status`, `review`, `extraction/[extractionId]`, `commit`, `history`
- `app/montree/dashboard/voice-observation/page.tsx` — 6-state machine (idle→recording→paused→processing→review→committed)
- 4 components: `VoiceObservationRecorder`, `VoiceObservationProgress`, `VoiceObservationReview`, `ExtractionCard`

**Modified files (4):**
- `migrations/134_feature_toggles_and_raz_tracker.sql` — Added `voice_observations` to feature seed
- `components/montree/DashboardHeader.tsx` — Added 🎙️ nav link (gated: feature toggle, not role)
- `lib/montree/i18n/en.ts` + `zh.ts` — ~57 `voiceObs.*` keys each

**Also deployed this session:**
- Migration 134 run (feature toggles: 3 tables + 6 features seeded + RAZ tracker table)
- Migration 135 run (voice observation: 4 tables + storage bucket)
- Voice Observations feature enabled for Beijing International school

**Deploy:** ✅ Code pushed, Railway build succeeded, API responding in production.
**Handoff:** `docs/handoffs/HANDOFF_VOICE_OBSERVATION_SYSTEM_MAR4.md`
**Plan:** `.claude/plans/cryptic-tumbling-turing.md`

**Curriculum Fixes — COMPLETE + DEPLOYED (3 files modified, commits `70a60756` through `b998e868`):**

4 issues fixed in late session:

1. **Voice obs nav link gating** — Changed from `!isHomeschoolParent()` to feature-toggle-based gating. DashboardHeader now fetches `/api/montree/features?school_id=...` and checks `voice_observations` enabled state.

2. **CRITICAL: Curriculum area filtering bug** — WorkWheelPicker showed ALL areas' works when selecting Math. Root cause: `montree_classroom_curriculum_areas` had old keys (`math`, `science_culture`) instead of canonical (`mathematics`, `cultural`). Three-pronged fix: DB keys updated, API hardened with `normalizeAreaKey()` alias map + empty-result safety (returns `[]` instead of all works when area not found), setup-stream verified correct.

3. **Missing curriculum works** — Whale Class had only 63/329 works (partial legacy seed). Reseeded via existing `/api/montree/admin/reseed-curriculum` endpoint → 329 works + 5 areas confirmed.

4. **WorkWheelPicker sequence ordering** — `mergeWorksWithCurriculum()` was overwriting DB sequences with `idx + 1` (array position). Fixed to preserve original DB sequences. Imported/custom works get derived sequence from neighbours. Pure curriculum order with status checkmarks on assigned works.

**Modified files (3):**
- `components/montree/DashboardHeader.tsx` — Feature toggle gating for voice obs nav link
- `app/api/montree/works/search/route.ts` — Area key normalization + empty-result safety net
- `lib/montree/work-matching.ts` — Preserve DB sequences instead of renumbering

**Handoff:** `docs/handoffs/HANDOFF_CURRICULUM_FIXES_MAR4.md`

---

## PREVIOUS STATUS (Mar 2, 2026)

### Session Work (Mar 2, 2026)

**Marketing Hub Overhaul — COMPLETE + DEPLOYED (3 files: 1 new, 2 modified, commits pushed + build fix `5df476fb`):**

Cleaned up cluttered marketing hub, installed master outreach letter, and built "The Nerve Center" marketing intelligence brain.

**1. Master Outreach Letter — Installed in Sales Playbook:**
- `app/montree/super-admin/marketing/sales-playbook/page.tsx` — Complete rewrite of outreach content:
  - All 6 personalized school emails (HD Qingdao, QAIS, Hongwen, Etonkids, MSB Beijing, Nebula) rewritten with sincere tone reflecting real story: built for own classroom, exceeded expectations, needs testing/validation, offering 1 year free
  - Psychology tab renamed "The Honest Approach — 6 Reminders" (was "6 Psychological Principles")
  - 5-touch sequence, objection handling, WeChat message, follow-up email all updated
  - **Templates tab replaced with "The Letter" tab** — single master letter written by Tredoux for top 6 Montessori schools in China
  - Schedule task language softened throughout

**2. The Nerve Center — NEW Marketing Intelligence Brain:**
- `app/montree/super-admin/marketing/nerve-center/page.tsx` — **NEW FILE** (~450 lines)
- 4 tabs:
  - **Algorithms** — 2026 algorithm data for TikTok, Instagram, YouTube, LinkedIn with expandable detail cards (watch time signals, hashtag strategy, engagement windows, posting frequency)
  - **Hooks & Virality** — 6 hook formulas with Montessori-specific examples, viral psychology stats, pattern interrupt techniques
  - **Montree Playbook** — 5 content pillars (Before/After Transformations, Guru AI Demos, "Why Montessori?" Series, Behind the Build, Parent Testimonials) + 5 growth tactics with cost/ROI data
  - **Content Calendar** — Weekly schedule (Mon-Sun), optimal posting times by platform, batching system (4hrs/month)

**3. Marketing Hub Cleanup:**
- `app/montree/super-admin/marketing/page.tsx` — Complete rewrite from 5 cluttered sections to clean hierarchy:
  - ⚡ INTELLIGENCE (featured, green accent): Nerve Center + Sales Playbook
  - 📝 CONTENT & CREATIVE: Warroom, Content Factory, Creative Studio
  - 📨 OUTREACH: Prospect HQ, Growth Engine
  - 🌐 WEB PAGES: Landing, Links, Pitch
  - 📖 ARCHIVE: Launch HQ, Objections, Cold Email HQ, Outreach Legacy, Full Playbook

**Deploy:** ✅ PUSHED + BUILD FIX DEPLOYED. Initial push had JSX parse error (`>` in "Consistency > Perfection" on line 455 of nerve-center/page.tsx parsed as JSX closing tag). Fixed with `&gt;` escape (commit `5df476fb`). Railway build succeeded.
**Handoff:** `docs/handoffs/HANDOFF_MARKETING_HUB_OVERHAUL_MAR2.md`

---

## PREVIOUS STATUS (Mar 1, 2026)


### Session Work (Mar 1, 2026 — Late Session)

**Teacher Conversational Guru — COMPLETE:**

Teachers now get the same WhatsApp-style conversational chat as parents, replacing the rigid 5-section structured Q&A form. Professional colleague persona instead of nurturing parent guide.

- `guru/page.tsx` — Removed structured form UI. Both roles render `GuruChatThread`. Teachers pass `isTeacher={true}`.
- `conversational-prompt.ts` — Added `isTeacher` param to all 3 prompt builders. Teacher persona: experienced Montessori colleague, direct/practical tone, uses AMI terminology freely, references Piaget/Vygotsky directly.
- `route.ts` — `isConversational` now true for both homeschool parents AND teachers. Passes `isTeacher: role === 'teacher'` to prompt builder.
- `GuruChatThread.tsx` — `isTeacher` prop: skip concern picker, violet/indigo theme (vs botanical green), teacher-specific welcome message and placeholder.
- 3 new i18n keys: `guru.guruAdvisor`, `guru.teacherWelcome`, `guru.teacherAskPlaceholder`

**Guide Content Chinese Translation (Sonnet) — COMPLETE:**

QuickGuideModal and FullDetailsModal now translate to Chinese when locale is zh. Uses Sonnet (NOT Haiku) per user instruction.

- `app/api/montree/works/guide/route.ts` — Added `locale` query param. When `locale=zh`, translates guide JSON via Sonnet (`translateGuideToZh()`). Translates: quick_guide, materials, presentation_steps, aims, parent_description, control_of_error, why_it_matters.
- `[childId]/page.tsx` — `openQuickGuide()` accepts `chineseName`, passes `&locale=zh` to API, sets `quickGuideDisplayName` for modal header.
- `FocusWorksSection.tsx` — Passes `work.chineseName` through `onOpenQuickGuide` callback.
- `curriculum/page.tsx` — `openFullDetails()` accepts `chineseName`, passes `&locale=zh` to API, sets `fullDetailsDisplayName` for modal header.
- `CurriculumWorkList.tsx` — Passes `work.name_chinese` through `onOpenFullDetails`. **Bug fix:** was using `work.chineseName` (wrong field) → fixed to `work.name_chinese` (matches Work type).

**Other i18n Fixes:**
- Removed FeatureWrapper from curriculum, capture, guru pages (onboarding tours already hidden)
- Fixed curriculum page area names: `.replace('_', ' ')` → `t('areas.practical_life')` etc.

Modified files (11): guru/page.tsx, route.ts, conversational-prompt.ts, GuruChatThread.tsx, en.ts, zh.ts, guide/route.ts, [childId]/page.tsx, FocusWorksSection.tsx, curriculum/page.tsx, CurriculumWorkList.tsx

**Handoff:** `docs/handoffs/HANDOFF_TEACHER_GURU_I18N_MAR1.md`

### Session Work (Mar 1, 2026 — Earlier)

**Guru Health Check Fixes (3 bugs fixed):**
- `context-builder.ts` — Fixed `context_snapshot` not mapped in PastInteraction array (celebrations never triggered)
- `conversational-prompt.ts` — Added `mode` return to `buildGreetingPrompt()` (was missing, tool gating broken for greetings)
- `conversational-prompt.ts` — Added `mode` return to `buildFollowUpPrompt()` (same issue for follow-ups)

**i18n Full Platform Cleanup — 3-Cycle Deep Pass:**

Grew translation keys from ~1,378 to ~1,490. Created server-side translator. Translated report system end-to-end.

**Cycle 1 (Foundation):**
- NEW: `lib/montree/i18n/server.ts` — `getTranslator(locale)`, `getLocaleFromRequest()`, `getTranslatedAreaName()`, `getTranslatedStatus()`
- Report system: `reports/route.ts`, `reports/generate/route.ts`, `reports/send/route.ts`, `pdf-generator.ts` all locale-aware
- Parent dashboard, PortalChat, ShelfView wired with `useI18n()`
- Locale passthrough (`?locale=`) added to all client→API fetches

**Cycle 2 (Admin + Curriculum):**
- `admin/teachers/page.tsx`, `admin/guru/page.tsx`, `vocabulary-flashcards/page.tsx` wired
- `chineseName` display on 6 components (FocusWorks, CurriculumWorkList, WorkPicker, ShelfView, progress, browse)

**Cycle 3 (Stragglers + Final Keys):**
- 47 keys: validation, placeholders, accessibility, curriculum labels, onboarding buttons
- ~110 keys: toast messages, admin students/reports/activity/billing, onboarding expanded, PhotoEditModal
- Wired: set-password, teacher/register, FeedbackButton, curriculum/browse, PhotoEditModal placeholders, WorkDetailSheet

**Parity fix:** Removed 6 duplicate area keys, resolved 62-key gap. Final audit: perfect parity.

**NOT wired yet (keys exist, ~2hrs):** `useWorkOperations.ts`, `useCurriculumDragDrop.ts`, `admin/students`, `admin/reports`, `admin/activity`, `admin/billing`, `onboarding/page.tsx`, `PhotoEditModal.tsx` (remaining fields)

New files (1): `lib/montree/i18n/server.ts`
Modified files (~25): en.ts, zh.ts, index.ts, 4 report API routes, pdf-generator, parent dashboard, parent report, parent weekly-review, teacher reports, PortalChat, ShelfView, admin/teachers, admin/guru, flashcards, 6 chineseName components, set-password, teacher/register, FeedbackButton, curriculum/browse, PhotoEditModal, WorkDetailSheet

**Handoff:** `docs/handoffs/HANDOFF_I18N_FULL_CLEANUP_MAR1.md`

---

## PREVIOUS STATUS (Feb 28, 2026)

### Session Work (Feb 28, 2026 — Late Session)

**Proactive Guru Intelligence — 5 Features Complete (audit cycle, 6 bugs found and fixed):**

Closed the "7% gap" in the home parent system. The Guru now reaches OUT to parents instead of waiting for them to act.

5 features implemented:

1. **Cold Start Guru (Feature 1)** — When a parent's shelf is empty but intake is complete, Guru enters SETUP_MODE: builds the first shelf collaboratively ("Let's build Marina's first shelf together!"). Uses `set_focus_work` tool to add age-appropriate starter works.

2. **Mastery Celebrations (Feature 2)** — `buildCelebrationContext()` compares current `mastered_count` against previous interaction's `context_snapshot.mastered_count`. Detects new masteries, first mastery ever, 5th/10th milestones, all 5 areas active. Injects celebration context into greeting prompt.

3. **Weekly Rhythm Nudge (Feature 3)** — REFLECTION_MODE triggers when `daysSinceLastInteraction >= 5` OR `dayOfWeek === 0` (Sunday). Relaxed "coffee chat" tone, no guilt about gaps, open-ended reflection questions. Lower priority than INTAKE/CHECKIN.

4. **Sensitive Period Alerts (Feature 4)** — New file `lib/montree/guru/knowledge/sensitive-periods.ts` (310 lines). 8 sensitive periods (order, language, movement, sensory, small_objects, grace_courtesy, writing, reading) with age ranges, peak windows, observable behaviors, curriculum alignment, home activities. `formatSensitivePeriodsForPrompt(ageMonths)` injects active periods into every conversation.

5. **Stern's Vitality Affects + Emotional Mirroring (Feature 5)** — `buildEmotionalMirroringInstructions()` maps parent confidence/stress/themes to Daniel Stern's vitality affect guidance. Low confidence → "mirror first, fading affect". Overwhelm → "fading, spacious". Joy → "surging affect". Recovering → acknowledge growth. Psychology-foundations.ts expanded with full Stern coverage (~25 lines: vitality affects, affect attunement, intersubjectivity, temporal contours).

**Mode Priority System:** SETUP > INTAKE > CHECKIN > REFLECTION > NORMAL

**Route.ts Greeting Handler Rewrite:**
- 3 parallel DB queries on greeting trigger (settings + focus works count + last interaction)
- Priority-based greeting question selection
- `mastered_count` now saved in context_snapshot for both conversational and structured modes

**Audit Cycle (6 bugs found, all fixed):**
1. Duplicate `parentState` variable declaration in `buildConversationalPrompt` — removed second
2. `childContext` referenced in greeting handler before construction — changed to generic text
3. `buildCelebrationContext` used non-existent fields (`progress_summary`, `recent_progress`) — fixed to `mastered_count` and `current_works`
4. `context_snapshot` not fetched in past_interactions query — added to select in context-builder.ts
5. `PastInteraction` interface missing `context_snapshot` field — added it
6. Duplicate local `PastInteraction` interface — replaced with import from context-builder

New files (1): `lib/montree/guru/knowledge/sensitive-periods.ts`
Modified files (4): `conversational-prompt.ts`, `route.ts`, `context-builder.ts`, `psychology-foundations.ts`

**Social Media Research — COMPLETE:**
Deep dive into Montessori homeschool social media channels. Report: `docs/RESEARCH_MONTESSORI_HOMESCHOOL_SOCIAL_MEDIA.md`
Key findings: Facebook groups are #1 hub (10+ groups with 50K-150K+ members), Instagram top accounts (@montessorifromtheheart 653K), parent pain points = curriculum overwhelm + isolation.

**Handoff:** `docs/handoffs/HANDOFF_PROACTIVE_GURU_FEB28.md`

### Session Work (Feb 28, 2026 — Earlier)

**Self-Improving Guru Brain System — COMPLETE (3 audit cycles + health check + deep audit, 56 issues fixed):**

Built the Guru's self-evolving brain — a living JSONB document that grows smarter after every conversation across ALL families.

4-part architecture:
1. **Brain Storage** — `montree_guru_brain` table, single global row, categorized wisdom sections
2. **Learning Extraction** — After every guru conversation (teacher + parent), learnings extracted and atomically appended via RPC
3. **Brain Consolidation** — Haiku reads raw learnings buffer and synthesizes into polished wisdom entries (auto-triggers at 20 learnings, max 1x per 6 hours)
4. **Brain Retrieval** — Before each conversation, relevant wisdom scored by age/area/concerns and injected into system prompt

**Cross-family pattern learning** also wired: `pattern-learner.ts` aggregates insights across families, tracks success rates (EMA α=0.2), injects anonymized patterns into prompts.

**Daily Rate Limits** (replaced monthly counters):
- Haiku tier ($5/mo): 10 messages/day → max $3.60/mo cost = healthy margin
- Sonnet tier ($20/mo): 5 messages/day → max $6.75/mo cost = great margin
- Free trial: 3 messages/day for 7 days from signup, then paywall
- Counts from `montree_guru_interactions` table (no counter drift), UTC midnight boundary

**Psychology Brain** — 13 developmental psychologists in `knowledge/psychology-foundations.ts`: Freud, Piaget, Erikson, Bowlby/Ainsworth, Winnicott, Vygotsky, Jung, Montessori, Bandura, Maslow, Bronfenbrenner, Stern, Dweck, Kohn. Sonnet tier gets full psychology reference injected into prompt.

New files (2): `lib/montree/guru/brain.ts` (668 lines), `migrations/133_guru_tiers.sql`
Modified files (5): `route.ts` (brain wiring + daily limits), `pattern-learner.ts` (safety fixes + EMA tuning), `lib/ai/anthropic.ts` (HAIKU_MODEL + getModelForTier), `conversational-prompt.ts` (Kohn + psych safety), `psychology-foundations.ts` (Alfie Kohn + nuance)

3 audit cycles: 25 + 17 + 1 = 43 issues found and fixed. Health check: 8 additional issues found and fixed (UTC timezone fix, null guards, index, EMA tuning, consolidation docs). Deep audit: 4 more issues (teacher_id rate-limit bypass, broken success rate updates, dead code). Total: 56 issues.

**Deploy:** Run `psql $DATABASE_URL -f migrations/133_guru_tiers.sql` before testing.
**Handoff:** `docs/handoffs/HANDOFF_BRAIN_SYSTEM_FEB28.md`

---

## PREVIOUS STATUS (Feb 27, 2026)

### Session Work (Feb 27, 2026)

**i18n Deep Audit — COMPLETE + DEPLOYED (commit `a429695b`):**

Comprehensive audit of the entire Montree translation system. Full report: `docs/audits/AUDIT_I18N_DEEP_FEB27.md`

Key findings:
- **1,378 keys** each in en.ts and zh.ts (perfect parity, 5 new keys added)
- **3 bugs found**: double-arrow in ABC model (FIXED), fragile pluralization hack (deferred), hardcoded toasts in 4 files (FIXED)
- **15 pages missing i18n entirely**: 8 admin pages, parent dashboard, tools/print, application forms
- **chineseName NOT wired**: All 329 works have Chinese names in JSON but no display component shows them when locale is zh
- **Architecture grade: A-** — hydration-safe, type-safe, clean fallback chain. Missing interpolation helper.

Files modified (7): en.ts, zh.ts, students/page.tsx, reports/page.tsx, parent/photos/page.tsx, parent/milestones/page.tsx, audit doc

**Home Parent Redesign (Portal + Shelf) — PUSHED with Wooden Shelf + TTS Voice:**

Complete redesign from previous session, enhanced this session with two new features:

**Wooden Shelf UI** — ShelfView.tsx full rewrite:
- 5 horizontal wooden planks (CSS gradient wood texture + grain overlay) stacked vertically, one per Montessori area
- Works displayed as 3D-ish material icons with `perspective()` CSS transforms and drop shadows
- 60+ work-to-emoji icon mappings in `BIO.workIcon` (theme file) for visual variety
- Area-colored accent tabs, progress bars, mastered ⭐ sparkle effects
- Empty slots show ghost `+` icons → tap to ask Guru for suggestions
- Same props/API as before — drop-in replacement

**OpenAI TTS Voice** — new `/api/montree/tts` route + PortalChat integration:
- API route: POST text → strips markdown → calls OpenAI `tts-1` model with `nova` voice → streams MP3 back
- Cost: ~$0.015 per 1K characters
- Rate limited: 10 requests/minute per IP (uses existing `checkRateLimit()` from `lib/rate-limiter.ts`)
- `useTTS()` hook in PortalChat manages audio lifecycle with AbortController for safe unmount
- 🔈 "Listen" button on every Guru message bubble → toggles to 🔊 while playing → tap again to stop

**Audit (4 issues found, all fixed):**
- CSS `group-hover:scale-105` overriding inline `transform: perspective()` → removed conflicting class
- TTS fetch missing AbortController → added `abortRef` with cancellation on stop/unmount
- Dead `emptyAreas` state never read → removed
- No rate limiting on TTS route → added `checkRateLimit()` (10/min/IP)

Previous session work (3 build-audit-fix cycles):
- Cycle 2: 28 issues found & fixed (AbortController, drop-shadow, useCallback deps, a11y, type safety)
- Cycle 3: 7 issues found & fixed (final polish)

10 new files + 4 modified. Bioluminescent botanical theme. Two-tab Portal (AI chat) + Shelf (visual works) interface.
Push command in handoff: `docs/handoffs/HANDOFF_I18N_AUDIT_HOME_REDESIGN_FEB27.md`
Late session push: `docs/handoffs/HANDOFF_SHELF_REDESIGN_GUIDES_HIDDEN_FEB27.md`

**Onboarding Guides — ALL HIDDEN (not deleted):**

User decided onboarding guides are unnecessary. All guide renders wrapped with `false &&` — code preserved for reinstatement.
- Files modified (6): `dashboard/page.tsx`, `[childId]/page.tsx`, `students/page.tsx`, `principal/setup/page.tsx`, `admin/layout.tsx`
- Hidden: WelcomeModal, DashboardGuide, WeekViewGuide, StudentFormGuide, PrincipalSetupGuide, PrincipalAdminGuide, principal welcome overlay, auto-open bulk form
- To re-enable: search `HIDDEN: onboarding guides disabled` and remove `false &&`

**Visual Shelf Redesign — ShelfView.tsx rewritten + audited:**

Shelf redesigned from vertical list of 5 planks to actual 3-plank visual Montessori shelf. Works are tappable 3D objects sitting on wooden planks.
- 3 horizontal wooden planks with up to 3 works each (9 slots total), works distributed top-down
- Each work: area-colored border, large 3D emoji icon, work name, status glow/sparkle
- Empty slots show dashed `+` icon → tap to ask Guru for suggestions
- **Tap a work → opens teacher-style QuickGuideModal** (same component teachers use!)
- "Full Details" button → FullDetailsModal with step-by-step presentation guide
- "Watch Video" → YouTube search
- Reuses existing components: `QuickGuideModal.tsx`, `FullDetailsModal.tsx` (zero changes to those)
- Replaced `WorkDetailSheet` (accordion bottom sheet) with teacher modals
- Shelf frame with CSS wood gradients, side rails, top/bottom caps

**Audit (7 issues found, all fixed):**
- Removed dead `AREA_ORDER` constant
- Added AbortController to `fetchShelf()` + `openWorkGuide()` (race condition prevention)
- Added cleanup useEffect for abort-on-unmount
- Added `aria-label` to all interactive buttons
- Fixed React keys from `idx` to `work.work_name`
- Guide fetch error now sets `null` instead of `{ error: true }`

**Handoff:** `docs/handoffs/HANDOFF_SHELF_REDESIGN_GUIDES_HIDDEN_FEB27.md`

---

## PREVIOUS STATUS (Feb 26, 2026)

### Session Work (Feb 26, 2026 — Late Session)

**Full i18n Migration — ALL Pages Bilingual — COMPLETE (not yet pushed):**

Migrated the ENTIRE Montree application from hardcoded English to bilingual EN↔ZH. 11 phases + audit round.

Stats: 194 → **1,373 translation keys**, ~65 files modified, en.ts/zh.ts at perfect parity.

11 Phases:
1. Core Teacher Flow (FocusWorks, WorkPicker, FullDetails, QuickGuide, WorkDetail, AddWork, EditWork, CurriculumWorkList, TeachingTools) — ~150 keys
2. Onboarding & Welcome (WelcomeModal, WeekViewGuide, StudentFormGuide, DashboardGuide) — ~45 keys
3. Principal Flow (setup/page, PrincipalSetupGuide, PrincipalAdminGuide, admin/page) — ~95 keys
4. Child Sub-Pages (gallery, observations, summary, weekly-review, profile) — ~130 keys
5. Reports & Messaging (reports, report detail, messages, InviteParent, PhotoSelection) — ~90 keys
6. Settings & Media (settings, CameraCapture, ChildSelector, DeleteConfirmDialog, InstallBanner) — ~45 keys
7. Guru Components (GuruChatThread, GuruOnboardingPicker, ChatBubble, GuruDashboardCards, ConcernDetailModal) — ~37 keys
8. Parent Portal (login, photos, milestones, messages, weekly-review, report) — ~109 keys
9. Library & Tools (library hub, browse, upload, tools page) — ~60 keys
10. Feedback & Utility (FeedbackButton, InboxButton, FocusModeCard) — ~50 keys
11. Admin Sub-Pages (classroom detail, student detail, settings) — ~60 keys
Audit: Additional ~160 keys — WorkWheelPicker, full media system, messaging components, guru ecosystem, media gallery page, labels page, progress detail, work detail, tools page

Intentionally NOT translated: 27+ game pages (English learning games), 17 marketing/social pages (internal), super-admin panel (internal), demo pages.

Curriculum data: All 329 works already have `chineseName` in JSON. Descriptions/materials/aims are English-only. Need to wire `chineseName` display when language is zh.

**Handoff:** `docs/handoffs/HANDOFF_I18N_FULL_MIGRATION_FEB26.md`

### Session Work (Feb 26, 2026)

**Guru Chat Overhaul — WhatsApp-Style Conversational UI — COMPLETE + DEPLOYED (commit `d3a78e2c`):**

Transformed the Guru for homeschool parents from a structured Q&A form into a personal coaching chat. Teachers keep existing structured UI — zero changes.

New files (6):
- `app/api/montree/guru/concerns/route.ts` — GET/POST concerns saved in `montree_children.settings` JSONB (no migration needed)
- `lib/montree/guru/conversational-prompt.ts` — natural chat persona prompt builder with greeting/follow-up variants
- `components/montree/guru/ChatBubble.tsx` — message bubble with markdown, botanical theme
- `components/montree/guru/ConcernPills.tsx` — small pills showing selected concerns
- `components/montree/guru/GuruOnboardingPicker.tsx` — multi-select grid (10 concerns, max 3), saves to API
- `components/montree/guru/GuruChatThread.tsx` — core chat UI (history, typing indicator, voice, auto-scroll)

Modified files (2):
- `app/api/montree/guru/route.ts` — `conversational: true` flag branches to conversational prompt path
- `app/montree/dashboard/guru/page.tsx` — early return for parents renders full-screen chat

Flow: Parent opens Guru → concern picker onboarding (first visit) → WhatsApp-style chat with history, follow-up greetings, voice input

**Bug Fixes — DEPLOYED (commit `6de6ad86`):**
- `lib/montree/guru/progress-analyzer.ts` — wrong table name `montree_child_work_progress` → `montree_child_progress` (2 occurrences)
- `app/api/montree/guru/photo-insight/route.ts` — missing `classroom_id` in insert (NOT NULL column)
- `app/montree/library/english-corner/page.tsx` — iframe → redirect (X-Frame-Options blocked self-embed)
- `app/montree/library/page.tsx` — English Corner rename ("English Language Corner" / "AMI Master Setup & Implementation Plan")

**Dashboard Guru Consolidation — DEPLOYED (commit `944348c7`):**
- Dashboard was firing 4 separate API calls on load (end-of-day, suggestions, weekly-review, daily-plan). Consolidated to single endpoint + single component.
- NEW: `app/api/montree/guru/dashboard-summary/route.ts` — single endpoint, 5 parallel DB queries, Haiku only on cache miss
- NEW: `components/montree/guru/GuruDashboardCards.tsx` — replaces 4 separate components (GuruDailyBriefing, EndOfDayNudge, GuruSuggestionCard, WeeklyReview)
- Modified: `app/montree/dashboard/page.tsx` — swapped 4 component imports for 1
- Fixed: `end-of-day/route.ts` + `suggestions/route.ts` — added missing `classroom_id` to inserts

**Test account:** Code ZYNXER, child "Marina"
**Handoff:** `docs/handoffs/HANDOFF_GURU_CHAT_OVERHAUL_FEB26.md`

**Full Health Audit + Performance Sweep — COMPLETE + DEPLOYED (commit `f310a63b`):**

73 issues found across 4 parallel deep audits (Guru APIs, non-Guru APIs, frontend components, TypeScript/build). All CRITICAL and HIGH items fixed.

Phase 1 — CRITICAL Security (6 routes):
- Added `verifyChildBelongsToSchool()` to: `media/upload` (single + array), `reports/generate`, `reports/pdf`, `reports/send`, `focus-works` (GET/POST/DELETE), `guru/stream`
- **Priority #0 fully resolved** — every route accepting child_id now verifies school ownership

Phase 2 — Guru Cleanup (9 routes):
- Added `HAIKU_MODEL` export to `lib/ai/anthropic.ts`
- Replaced `new Anthropic()` with shared singleton in 5 routes (concern, daily-plan, work-guide, quick, weekly-review)
- Replaced hardcoded model strings in suggestions, end-of-day, dashboard-summary
- Added error logging to dashboard-summary catch blocks + .catch() on cache inserts
- Added concern ID validation to concerns POST

Phase 3 — Code Quality (3 files):
- `ConcernDetailModal.tsx` — replaced `dangerouslySetInnerHTML` with safe `renderInlineBold()`
- `focus-works/route.ts` — work_name validation (type + max 200 chars)
- `observations/route.ts` — capped limit to 100, days to 365

Phase 4 — i18n Extension (3 files):
- Added 80+ translation keys to `en.ts` and `zh.ts` (students, week view, common actions, errors, empty states)
- Wired `students/page.tsx` with `useI18n()` hook — 40+ hardcoded strings → `t()` calls

Phase 5 — Folder Reorganization:
- `docs/` reorganized: `handoffs/` (~133 files), `audits/` (3), `plans/` (2), `archive/` (~50)
- Personal files → `assets/personal/`, curriculum → `assets/curriculum/`, deploy.sh → `scripts/`
- Merged `.env.stripe.example` into `.env.example`

Dead code identified (delete next session): 4 old Guru dashboard components (GuruDailyBriefing, EndOfDayNudge, GuruSuggestionCard, WeeklyReview), 3 montree-home stub routes, .env.stripe.example

**Guru-Driven Home System Concept Doc — WRITTEN:**
- `docs/CONCEPT_GURU_DRIVEN_HOME_SYSTEM.md` — Vision for Guru as sole interface for homeschool parents
- Guru uses Anthropic tool-use to control classroom backend (add works, update progress, schedule check-ins)
- 5 implementation phases, ~15-20 hours total, no new DB tables needed

**Handoff:** `docs/handoffs/HANDOFF_HEALTH_AUDIT_FEB26.md`
**Audit report:** `docs/audits/AUDIT_FULL_HEALTHCHECK_FEB26.md`

---

## PREVIOUS STATUS (Feb 25, 2026)

### Session Work (Feb 25, 2026 — Late Night Session)

**1688.com English Corner Miniatures Shopping — COMPLETE:**

Browsed 1688.com (Chinese wholesale marketplace) and opened 20+ product tabs across ALL categories needed for the English Corner Master Plan. User handles cart operations — assistant only finds and opens product pages.

Categories covered:
- **Animals (Cartoon):** 3D Printing Colorful Small Animals (¥0.75, 267K+ sold) — cute for matching activities
- **Animals (Realistic):** 8 tabs — zodiac set (¥3.33), marine/penguins (¥1.28), poultry/goose/chicken (¥1.28), giraffe/wild (¥6.90), birds individually (¥0.71), animal bucket (¥17.20), monkeys/apes (¥1.56), box set (¥26.80)
- **Fruits & Vegetables:** Foam mini models (¥1.80, 69K+ sold)
- **Kitchen/Household:** Resin coffee cups, chocolate/bread, cakes, snacks (80+ varieties at ¥0.30, 53K+ sold — BEST for I Spy baskets), vegetable rack model
- **Furniture:** 1:12 dollhouse bedroom, kitchen, living room sets
- **Vehicles:** 48 mini pull-back cars gift box (¥21.50) + cartoon engineering cars (¥0.75)
- **Resin Miniatures:** Multiple resin food/object tabs for I Spy sound baskets

Key search terms: "仿真食玩 树脂迷你摆件 娃娃屋配件 微缩模型 小物件" (best for resin miniatures), "仿真动物模型套装 实心 儿童认知" (realistic animals)

User confirmed: already has baskets (no wooden trays needed), wants both cartoon AND realistic animals.

Data files: `lib/data/master-words.ts` (30 CVC words + I Spy objects), `lib/games/vocabulary-data.ts` (88 vocab words)

**Handoff:** `docs/HANDOFF_1688_SHOPPING_FEB25.md`

### Session Work (Feb 25, 2026 — Night Session)

**Bilingual i18n System — COMPLETE + DEPLOYED (commit `8259683`):**

Custom React Context i18n with 140 EN↔ZH translation keys, zero npm dependencies.

Foundation:
- `lib/montree/i18n/en.ts` — 140 keys, TypeScript `as const` for auto type safety
- `lib/montree/i18n/zh.ts` — 140 matching Chinese translations
- `lib/montree/i18n/context.tsx` — `I18nProvider` + `useI18n()` + `useT()` hooks, localStorage key `montree_lang`
- `lib/montree/i18n/index.ts` — barrel export
- `components/montree/I18nClientWrapper.tsx` — client wrapper (layout is server component)
- `components/montree/LanguageToggle.tsx` — compact EN/中文 toggle

Pages migrated to `t()` calls (5 files):
- `app/montree/login/page.tsx` — all strings + LanguageToggle top-right
- `app/montree/try/page.tsx` — all 4 steps + LanguageToggle
- `app/montree/dashboard/page.tsx` — student count, empty states, errors
- `app/montree/principal/login/page.tsx` — all strings + LanguageToggle
- `components/montree/DashboardHeader.tsx` — LanguageToggle in header nav bar + titles + logout

Architecture: Custom Context (not next-intl) because all pages are `'use client'`, only 2 languages, no server components to translate. TypeScript objects over JSON for type safety. `useState('en')` default + `useEffect` localStorage read prevents hydration mismatch.

**Phase 2 remaining:** Migrate child week view, curriculum, guru, reports, students, settings, onboarding guides to `t()`.

**Sales Playbook — COMPLETE + DEPLOYED (commit `8259683`):**

- `app/montree/super-admin/marketing/sales-playbook/page.tsx` — ~600 lines, 4 tabs
- Tab 1 (Schedule): 28-day outreach plan with localStorage checkboxes + progress bar
- Tab 2 (Schools): 6 deep-dived schools — HD Qingdao, QAIS, Hongwen QD, Etonkids, MSB Beijing, Nebula Shanghai — each with intel, personalized email, WeChat message, follow-up
- Tab 3 (Psychology): 6 principles, decision-maker table, 5-touch sequence, objection handling
- Tab 4 (Templates): A (Pure Montessori), B (Chain HQ), C (Bilingual K-12)
- Linked from marketing hub + old playbook page
- `public/montree-sales-playbook.html` — original HTML preserved

**Handoff:** `docs/HANDOFF_I18N_SALES_PLAYBOOK_FEB25.md`

---

### Session Work (Feb 25, 2026 — Late Session)

**Guru Improvements — ALL 8 PHASES BUILT + AUDITED:**

Built complete Guru AI enhancement suite for homeschool parents (13 new files, 10 modified):

Phase 1 — Conversation Memory:
- `app/api/montree/guru/route.ts` — fetches last 5 interactions per child, injects as CONVERSATION MEMORY
- `lib/montree/guru/prompt-builder.ts` — HOMESCHOOL_ADDENDUM rewrite + conversation memory section

Phase 2 — FAQ Cache:
- `lib/montree/guru/faq-cache.ts` — 10 static Q&As, zero API calls
- `components/montree/guru/GuruFAQSection.tsx` — accordion component

Phase 3 — Contextual Page Tips:
- `lib/montree/guru/page-tips.ts` — per-page tip definitions (dashboard, week view, progress, curriculum)
- `components/montree/guru/GuruContextBubble.tsx` — floating bubble, dismiss via localStorage

Phase 4 — End-of-Day Nudge:
- `app/api/montree/guru/end-of-day/route.ts` — Haiku summary, cached per child/day
- `components/montree/guru/EndOfDayNudge.tsx` — dismissible banner

Phase 5 — Proactive Suggestions:
- `lib/montree/guru/progress-analyzer.ts` — detects stale works (2+ weeks) + inactivity
- `app/api/montree/guru/suggestions/route.ts` — suggestion API
- `components/montree/guru/GuruSuggestionCard.tsx` — dismissible card

Phase 6 — Photo-Aware Observations:
- `app/api/montree/guru/photo-insight/route.ts` — Sonnet vision API
- `components/montree/guru/PhotoInsightButton.tsx` — button on progress photo strip

Phase 7 — Knowledge Base Expansion:
- `lib/montree/guru/knowledge-retriever.ts` — ~20 new keyword mappings across all areas

Phase 8 — Voice Notes:
- `app/api/montree/guru/transcribe/route.ts` — OpenAI Whisper, audio NOT stored
- `components/montree/guru/VoiceNoteButton.tsx` — native MediaRecorder (no npm dep)
- `components/montree/guru/QuickGuruFAB.tsx` — VoiceNoteButton integrated

Full audit: **zero bugs found** across all 8 phases.

**Library Browse Page Redesign — COMPLETE:**
- `app/montree/library/browse/page.tsx` — complete rewrite
- Tab-based navigation replacing accordion: 6 sticky tabs (P/S/M/L/C + Miscellaneous)
- Miscellaneous tab catches uncategorized works
- Works grouped by category within each tab
- Area-colored accents, improved card design, search switches tabs
- Hidden scrollbar CSS for mobile tab overflow

**English Corner Navigation Fix:**
- `app/montree/library/page.tsx` — added English Corner card (pink/rose accent)
- Previously existed at `/montree/library/english-corner` but was undiscoverable

**Home Guru Revamp — Earlier in Session (commit `bd774ec3`):**
- Concern-first dashboard: ConcernCardsGrid, ConcernDetailModal, QuickGuruFAB, WeeklyReview
- 10 concern mappings, rich HOMESCHOOL_ADDENDUM prompt
- Concern/Quick/Weekly-Review API routes (all Haiku, all cached)
- Bugfix commit `71ea39e4`: property name + type mismatches in concern route

**Handoff:** `docs/HANDOFF_GURU_LIBRARY_FEB25.md`
**Plan:** `.claude/plans/guru-improvements-v1.md`

---

## PREVIOUS STATUS (Feb 24, 2026)

### Session Work (Feb 24, 2026 — Late Session)

**Library Polish, Signup Cleanup, CurriculumWorkList Fix — COMPLETE (11 commits pushed):**

Homeschool removal from signup/login:
- Removed "I'm a Parent" third option from `/montree/try` signup page — backend code preserved
- Simplified login page text to "Log in with your 6-character code"

Material Generator 401 fix:
- Was calling `/api/whale/materials/generate` (requires admin JWT that teachers don't have)
- Rewrote to generate ALL PDFs client-side using existing generator libs in `lib/materials/generators/`
- Removed API dependency entirely — all 10 material types now work without auth

CurriculumWorkList field name fixes:
- Updated `Work` interface in `types.ts` to match actual DB column names
- Fixed expanded work details to use correct field names (`quick_guide`, `parent_description`, etc.)

Word Bingo Generator — complete rewrite of `public/tools/bingo-generator.html`:
- Matches Picture Bingo Generator design (same toolbar, tabs, border controls)
- Two modes: Word Sets (CVC by vowel, digraphs, blends, sight words, letter sounds) and Custom Words
- Uniform border approach, calling cards with indent cutting guides
- Non-sticky toolbar (fixed the viewport consumption issue)

Picture Bingo preview fix:
- Removed `position: sticky; top: 0;` from toolbar CSS — was consuming viewport leaving only thin slit for output

Label rename:
- "Movable Alphabet Labels" → "Label Generator" in tools page

**Commits:** `4dacc51e` through `2eee75ae` (10 earlier) + `6339ca6` (this session's 8-file commit)

**Files modified (this session):** `app/montree/try/page.tsx`, `app/montree/login/page.tsx`, `components/materials/MaterialGenerator.tsx`, `public/tools/picture-bingo-generator.html`, `public/tools/bingo-generator.html`, `app/montree/library/tools/page.tsx`, `components/montree/curriculum/CurriculumWorkList.tsx`, `components/montree/curriculum/types.ts`

**Handoff:** `docs/HANDOFF_LIBRARY_TOOLS_FEB24.md`, `docs/HANDOFF_LIBRARY_TOOLS_POLISH_FEB24B.md`

### Session Work (Feb 24, 2026 — Early Session)

**Montree Library Tools Polish — COMPLETE (10 commits pushed):**

Picture Bingo Generator — complete rewrite over multiple iterations:
- Bingo boards: picture AND word together on each cell, single-sided (one page per board)
- Calling cards: picture on front, word on back (duplex, mirrored rows for alignment)
- Removed FREE space — every cell gets a real picture, no exceptions
- Bingo board borders: uniform grid-background approach (padding = gap = border width)
- Calling card borders: 3-Part Card Generator indent approach (per-card background + padding + border-radius, grid gap=0, diamond indent cutting guides)
- Border color picker, width selector (Thin/Medium/Thick), corner radius selector
- Two modes: CVC Word Sets (preset 69 words) and Custom Bingo (drag & drop images)
- Comic Sans MS for word text (kid-friendly single-story 'a')
- Vowel highlighting removed entirely

Video Flashcard Maker — complete rewrite:
- Replaced broken server-dependent version (4 missing API routes) with fully client-side tool
- Video upload, frame capture via HTML5 canvas, timeline scrubber, auto-extract, editable labels
- Border color + font selection, print as landscape A4 flashcards

**Commits:** `4dacc51e`, `ef4adc66`, `142dc01a`, `7c0366d6`, `5b1045a8`, `b73e83bb`, `57984eea`, `61b303ae`, `ec7b6e0b`, `2eee75ae`

**Files modified:** `public/tools/picture-bingo-generator.html`, `app/montree/library/tools/flashcard-maker/page.tsx`, `app/montree/library/tools/page.tsx`

**Handoff:** `docs/HANDOFF_LIBRARY_TOOLS_FEB24.md`

---

## PREVIOUS STATUS (Feb 23, 2026)

### Session Work (Feb 23, 2026 — Late Session)

**Resume HTML→PDF Conversion — IN PROGRESS:**
- Previous session crashed mid-resume-update work. Recovered by re-uploading source files.
- Original HTML resume: `Tredoux_Resume.html` in ACTIVE folder (beautiful 2-column teal sidebar design with Poppins + Playfair Display fonts)
- **Breakthrough:** Playwright + headless Chromium renders HTML→PDF pixel-perfectly. Previous session struggled ~1hr with other approaches.
- Installed Playwright + Chromium at `/tmp/resume-work/` on Mac
- Conversion script: `/tmp/resume-work/convert-tight.mjs`

**3 Drafts produced:**
- Draft 1: Perfect quality, 2 pages (References on page 2) — `Tredoux_Resume_Draft.pdf`
- Draft 2: Tight CSS (font 12.5px, reduced spacing), forced 1 page (`height: 297mm; overflow: hidden`) — `Tredoux_Resume_Draft2.pdf`
- Draft 3: Edge-to-edge attempt (`width: 100%`, `margin: 0`) — `Tredoux_Resume_Draft3.pdf` — user says still not fully edge-to-edge

**CSS changes for 1-page fit (97px recovered):**
- Body: 13px→12.5px, line-height 1.6→1.5
- Sidebar: padding 32/20/24→22/18/14, gap 18→11, avatar 100→85px
- Main: padding 30/28/24→20/26/14, gap 16→10
- Bullets: line-height 1.5→1.4, margins trimmed
- Page: `height: 297mm; max-height: 297mm; overflow: hidden`

**Still TODO:**
- Fix edge-to-edge (content doesn't fully bleed to page edges)
- Resume content updates (original session goal before crash)
- Generate final PDF

**Files:** All in `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/`
**Handoff:** `docs/HANDOFF_RESUME_PDF_FEB23.md`

---

## PREVIOUS STATUS (Feb 22, 2026)

### Session Work (Feb 21-22, 2026 — Late Session)

**Production Deploy + Seed Fix — COMPLETE:**
- Pushed 69 files to `main` via GitHub REST API (TLS issues blocked git clone)
- Fixed Dockerfile: 5 iterations to solve ARM64 optional dep issue → `rm -f package-lock.json && npm install --force`
- Confirmed migrations 131 + 132 already in production Supabase
- Fixed seed route 500: `points_of_interest` was string not array → `Array.isArray()` checks on all array fields
- Admin UI now shows full error detail + stack trace for seed failures

**Git Push Infrastructure — scripts/push-to-github.py:**
- Reusable Python script for pushing via GitHub REST API
- 5 retries with exponential backoff for TLS flakiness
- Handles multi-file commits, base64 blob creation
- **Root cause of push failures:** Cowork VM intermittent TLS drops — not fixable, but retries work around it

**Files created/modified:**
- `scripts/push-to-github.py` — **NEW** reusable GitHub push script
- `app/api/montree/community/seed/route.ts` — Array safety + detailed error logging
- `app/montree/super-admin/community/page.tsx` — Shows error detail in admin UI
- `Dockerfile` — `rm -f package-lock.json && npm install --force`
- `docs/HANDOFF_DEPLOY_SEED_FEB21.md` — Full handoff

**Community Library Curriculum Ordering — COMPLETE:**
- Works now display in Montessori curriculum sequence (same as classroom system)
- In-memory sort using `loadAllCurriculumWorks()` → `work_key → sequence` map (cached at module load)
- Sequence formula: `area * 10000 + category * 100 + work` (from curriculum-loader.ts)
- Attempted DB column approach first but Railway can't reach Supabase PostgreSQL via IPv6 (`ENETUNREACH`)
- Default sort changed from "newest" to "curriculum" on API and frontend
- "Curriculum Order" option added to sort dropdown

**Commits:** `72c6df75` (69-file deploy), `29a69180` (error logging), `f6186281` (admin UI), `41bf0c18` (array fix), `89f2c69f` (sequence feature), `563247f0` (in-memory sort fix)

**Handoff:** `docs/HANDOFF_DEPLOY_SEED_FEB21.md`

---

## PREVIOUS STATUS (Feb 21, 2026)

### Session Work (Feb 21, 2026)

**Community Montessori Works Library — COMPLETE (14 new files, 2-pass security audit):**

Public, community-driven Montessori works database. Teachers browse without login, share works (pending moderation), and inject approved works into their classroom via teacher code.

**Files created (14 new, 1 modified):**
- `migrations/132_community_works.sql` — 2 tables, 7 indexes, `updated_at` trigger
- `app/api/montree/community/works/route.ts` — GET (browse + filters) + POST (upload via FormData)
- `app/api/montree/community/works/[id]/route.ts` — GET (detail) + PATCH (admin edit) + DELETE (storage cleanup)
- `app/api/montree/community/works/[id]/inject/route.ts` — "Send to Classroom" via teacher code
- `app/api/montree/community/works/[id]/guide/route.ts` — AI guide generation (Claude Haiku)
- `app/api/montree/community/backup/route.ts` — Daily JSON backup, keeps last 30
- `app/api/montree/community/seed/route.ts` — Pre-seed 329 standard curriculum works
- `app/montree/library/page.tsx` — Public browse (area tabs, search, sort, pagination, inject modal)
- `app/montree/library/[workId]/page.tsx` — Detail page (photo gallery, lightbox, AI guide, inject)
- `app/montree/library/upload/page.tsx` — Upload form (contributor info, work details, photos/videos/PDFs)
- `app/montree/library/layout.tsx` — Pass-through layout
- `app/montree/super-admin/community/page.tsx` — Admin moderation panel (approve/reject/flag, guide gen, backup, seed)
- `app/montree/super-admin/page.tsx` — Added Community Library link

**Security audit (2 full passes, 14 issues found and fixed):**
- Pass 1: `.valid` boolean fix (4 routes), RPC replacement, search SQL injection, admin bypass, status exposure, description validation, variations rendering, `updated_at` trigger, seed cleanup, admin fetch headers
- Pass 2: `age` filter injection (validated against whitelist), file size limits (10MB/50MB/20MB), file extension sanitization, backup pagination (1000-row limit)

**Handoff:** `docs/HANDOFF_COMMUNITY_LIBRARY_FEB21.md`

---

### Session Work (Feb 23, 2026)

**PrincipalSetupGuide Copy Simplification — COMPLETE:**
- Reduced from 9 → 8 steps (removed separate `teacher-codes` step — page handles codes display)
- Tightened all speech bubble messages (removed redundancy with page content)
- Removed "What's Next?" section from step 3 page (was duplicating speech bubble info)
- Success banner simplified: "N Classrooms Ready!" + "Share these login codes"
- Final step: "Let's head to your dashboard — I'll show you around."

**PrincipalAdminGuide (NEW — Multi-Page Dashboard Walkthrough) — COMPLETE:**
- New component: `components/montree/onboarding/PrincipalAdminGuide.tsx` (~280 lines)
- Renders in admin layout — persists step in localStorage across page navigations
- 4 steps spanning admin overview + classroom detail pages:
  1. Admin overview → highlights first classroom tile → "Tap on a classroom to look inside" → navigates into classroom
  2. Classroom detail → highlights first student tile → "Tap on a student... generate a report for the parent" → navigates back
  3. Admin overview → highlights Guru nav tab → "Ask the Guru anything a parent might ask you..."
  4. Centered farewell → "That's it, Principal ___! I left all the technical stuff to the teachers..."
- Uses `usePathname()` to detect current page, shows correct step per page
- `data-href` attribute on first classroom tile provides navigation URL
- localStorage keys: `montree_guide_admin_step` (current step), `montree_guide_admin_done` (completed)

**Files changed (9 modified, 1 new):**
- `components/montree/onboarding/PrincipalSetupGuide.tsx` — copy rewrite, 9→8 steps
- `components/montree/onboarding/PrincipalAdminGuide.tsx` — **NEW** multi-page guide
- `app/montree/principal/setup/page.tsx` — removed "What's Next?" section
- `app/montree/admin/page.tsx` — `data-guide="first-classroom"` + `data-href` on first tile
- `app/montree/admin/classrooms/[classroomId]/page.tsx` — `data-guide="first-student"` on first student
- `app/montree/admin/layout.tsx` — wired PrincipalAdminGuide, `data-guide="nav-guru"` on Guru link
- `docs/HANDOFF_ONBOARDING_GUIDES_FEB23.md` — updated with all changes

**Handoff:** `docs/HANDOFF_ONBOARDING_GUIDES_FEB23.md`

### Session Work (Feb 23, 2026 — Earlier)

**PrincipalSetupGuide (NEW) — 8-step wizard guide:**
- Built from scratch, same speech-bubble + GPB pattern as WeekViewGuide
- Spans all 3 wizard phases with `wizardStep` prop auto-advancing guide
- Removed FeatureWrapper/useOnboardingStore from setup page

**All Onboarding Popups Audit — 4 BUGS FIXED:**
- WelcomeModal: added `!localStorage.getItem('montree_welcome_done')` check
- DashboardGuide: replaced TEMP `if (kids.length > 0)` with proper localStorage gate
- Principal welcome: sessionStorage → localStorage
- Auto-open bulk form: added localStorage check

**WeekViewGuide Bug Fixes:**
- Wheel picker no longer stays open behind subsequent steps (removed `onAdvance: onOpenWheelPicker`)
- Nav-home step now navigates to dashboard on "Done!" (new `onNavigateHome` prop)
- Removed 🏷️ label icon from header (labels still on students page)
- 20→19 steps (removed nav-labels)

**Copy Rewrite:** All 3 guides (WeekView 19 steps, StudentForm 13 steps, PrincipalSetup 8 steps)
**localStorage Persistence:** All guides + popups now show once per device (8 localStorage keys total)

### Session Work (Feb 22, 2026 — Late Session)

**🚨 CRITICAL: Cross-Pollination Security Fix — COMPLETE:**
- `/api/montree/children` GET was returning ALL children from ALL schools when `classroom_id` not provided
- Created `lib/montree/verify-child-access.ts` — centralized `verifyChildBelongsToSchool()` helper
- Added school-scoping to `/api/montree/children` GET (now always filters by authenticated user's school)
- Added `verifyChildBelongsToSchool()` to 13 API routes: progress, progress/update, progress/summary, progress/batch-master, observations, sessions, media, guru, guru/daily-plan, guru/work-guide, reports, children/[childId], children/[childId]/profile
- **Remaining routes need the check:** media/upload, reports/generate, reports/pdf, reports/send, weekly-planning/*, focus-works

**Week View Onboarding Guide (WeekViewGuide.tsx) — 20-STEP FULL PLATFORM TOUR:**
- Expanded from 13 → 17 → 20 steps across multiple iterations
- Draggable speech bubbles (pointer event handlers with drag offset state, resets per step)
- Removed all "demonstration" callbacks — guide only highlights and explains (no YouTube open, no capture navigation, no full details modal)
- Reordered: area-badge, notes, status-badge moved RIGHT AFTER capture-info, BEFORE tab highlights
- Added student faces finale: centered "Ooohhh!" intro → home link (go to Students → Edit → Photo → Update) → label printing (Done!)
- 20 steps: focus-block → work-name → quick-guide-btn → quick-guide-content → watch-video → capture → capture-info → **area-badge → notes → status-badge** → tab-progress → tab-gallery → tab-reports → nav-guru → nav-curriculum → nav-inbox → feedback-btn → **student-faces-intro → nav-home → nav-labels**
- Callbacks: `onAdvance` fires going forward, `onReverse` fires going backward (proper undo)
- Progress API bomb-proofed: never returns 500, table name fallback, independent try/catch per section
- **TEMP flag:** `showWeekViewGuide = true` on line 88 of `[childId]/page.tsx` — remove before production

**DashboardHeader Changes:**
- 🖨️ print icon → 🏷️ label icon, title "Print" → "Print Labels"
- Added `data-guide="nav-home"` to classroom name/logo link
- Added `data-guide="nav-labels"` to label printing link

**WorkWheelPicker Area Badge Update:**
- Replaced plain text area icon in header with round colored circle matching AreaBadge component
- Applied to main header (w-12 h-12), empty state (w-16 h-16), and position picker header (w-12 h-12)
- Uses `backgroundColor: areaConfig.color` from AREA_CONFIG

**data-guide attributes added across sessions:**
- `[childId]/layout.tsx`: tab-week, tab-progress, tab-gallery, tab-reports (on tab Links)
- `DashboardHeader.tsx`: nav-curriculum, nav-guru, nav-home, nav-labels
- `InboxButton.tsx`: nav-inbox (line 172)
- `FeedbackButton.tsx`: feedback-btn (line 306)

**Handoff:** `docs/HANDOFF_WEEKVIEW_GUIDE_V2_FEB22.md`

### Session Work (Feb 22, 2026 — Early Session)

**Student Form Guided Onboarding — COMPLETE:**
- Replaced broken dashboard FeatureWrapper auto-start (showed floating contextless modals targeting elements that don't exist on dashboard) with purpose-built `StudentFormGuide` component
- New component: `components/montree/onboarding/StudentFormGuide.tsx` (~570 lines) — 13-step field-by-field guided tour with cartoon speech bubbles and green pulsating borders
- 13 steps: name → age → gender → tenure → curriculum overview → P → S → M → L → C → **profile-notes** → add-another → save-all
- Profile-notes step (step 11) dynamically references child's name: "This is the first step to building Joey's profile..."
- Add-another step tells user they can add all students and save at once
- Save-all step triggers on user clicking actual Save All button
- Steps 1-4 auto-advance on input/change events, steps 5-13 are manual (Got it!/Next)
- Removed FeatureWrapper from `app/montree/dashboard/page.tsx` (kept WelcomeModal + pulsating card)
- Added `data-guide` attributes to 9 form elements on students page (only first student index)
- Auto-opens bulk form for first-time users with 0 students
- Passes `childName` prop from `bulkStudents[0]?.name` for dynamic profile-notes messaging
- Homeschool parent role-aware: student→child, classroom→home throughout

**Post-Save Dashboard Guide — COMPLETE:**
- New component: `components/montree/onboarding/DashboardGuide.tsx` — speech bubble on dashboard after first save
- After saving students → redirect to `/montree/dashboard?onboarded=1` → green pulsating border on first child card
- Message uses child's actual name: "This is so exciting! This is your classroom! But it gets better... so much better. Let's tap on Joey to kick things off!"
- `data-guide="first-child"` on first child card, `?onboarded=1` query param triggers guide (cleaned from URL after detection)
- Dismiss button to close guide

**Handoff:** `docs/HANDOFF_STUDENT_FORM_GUIDE_FEB22.md`

### Session Work (Feb 21, 2026)

**Onboarding Phase 3-5 Integration — COMPLETE:**
- Wrapped all 6 pages with FeatureWrapper (dashboard, week view, curriculum, capture, guru, principal setup)
- Principal setup got separate onboarding init (not under dashboard layout)
- All `data-tutorial` attributes were already in place from Phase 1-2
- Module names verified against configs.ts definitions

**Home Guru Daily Coach — COMPLETE (4 new files):**
- `app/api/montree/guru/daily-plan/route.ts` — Personalized daily plan using Haiku (~$0.001/plan), cached per child per day in `montree_guru_interactions`
- `app/api/montree/guru/work-guide/route.ts` — Step-by-step presentation guide using Haiku, assumes zero Montessori experience
- `components/montree/guru/GuruDailyBriefing.tsx` — Dashboard card with "Generate Today's Plan" button
- `components/montree/guru/GuruWorkGuide.tsx` — Inline "How to Present This" button on each expanded work card
- All gated behind `isHomeschoolParent()` — teachers see ZERO changes

**Guru Wiring (3 files modified):**
- `app/montree/dashboard/page.tsx` — GuruDailyBriefing rendered per child above student grid (home parents only)
- `components/montree/child/FocusWorksSection.tsx` — GuruWorkGuide inside expanded work cards (home parents only)
- `app/montree/dashboard/[childId]/page.tsx` — Passes `isHomeschoolParent` prop to FocusWorksSection

**Whale Folder Cleanup — COMPLETE:**
- Root: 209 items → 34 items
- Moved: 66 .md → `docs/archive/`, 22 .sql → `migrations/archive/`, assets → `assets/`, old scripts → `scripts/archive/`, marketing → `archive/marketing/`
- Fixed broken reference in `api/guides/language-making-guide/route.ts`

**Handoff:** `docs/HANDOFF_GURU_COACH_ONBOARDING_FEB21.md`

### Session Work (Feb 20, 2026)

**Montree Home Botanical Aesthetic — COMPLETE:**
- Applied "Tender Cartography" botanical theme to ALL homeschool parent pages
- Created `lib/montree/home-theme.ts` — centralized theme constants (HOME_COLORS + HOME_THEME Tailwind classes)
- Modified 5 files: DashboardHeader, try/page, dashboard/page, guru/page, curriculum/browse/page
- All changes gated behind `isHomeschoolParent()` — teachers see ZERO visual changes
- Palette: dark teal (#0D3330) primary, warm cream (#FFF8E7) backgrounds, soft cream (#F5E6D3) sections, near-white (#FFFDF8) cards
- Botanical emoji (🌿🌱) replaces generic icons for home parents
- Full holistic audit passed — 30+ conditionals verified, no broken syntax, consistent colors
- **Plan file:** `.claude/plans/home-aesthetic-v1.md`

**3D Printable Montessori Classroom — Folder Structure Created:**
- Created `whale/3d-montessori/` with full folder tree: 5 shelves (language, mathematics, sensorial, practical-life, culture) + guides
- README.md = concept doc (mission, work schema, cost estimates, print schedule, trilingual scope)
- Trilingual: English + Afrikaans + Arabic subfolders for sandpaper letters, moveable alphabet, object boxes
- No STL files yet — user designing with web Claude separately
- Vision: open-source STL database for 3D-printing complete Montessori classrooms, mobile printer vehicle for disadvantaged schools

**Handoff:** `docs/HANDOFF_HOME_AESTHETIC_FEB20.md`

### Session Work (Feb 19, 2026) — Late Session

**Guru-Guided Home Parent Experience — Design Complete:**
- Deep codebase audit of homeschool system, Guru, Stripe, voice notes feasibility
- Created `Montree_Home_Guru_Design.docx` — 10-section design document covering full Guru integration
- Designed 3 new UI primitives: GuruContextBubble, GuruInlinePrompt, GuruSuggestionCard
- Designed voice notes system: `react-media-recorder` + OpenAI Whisper + optional Guru enhancement
- All Guru integration ONLY for homeschool parents — gated behind `isHomeschoolParent()`, teachers never see it
- Contextual tips use Haiku (cheap/fast), full Guru chat stays on Sonnet
- New caching layer: `montree_guru_cache` table, 24h TTL, invalidated on progress change
- Updated monetisation model: credits-based (2x API markup + $2/mo base), deferred in favour of existing $5/child subscription for launch

**Critical Audit Findings:**
- ⚠️ Migrations 126, 127, 131 STILL not run — homeschool system cannot function
- ⚠️ Zero Stripe env vars set — all billing crashes on call
- ⚠️ `GURU_FREEMIUM_ENABLED` not set — defaults to false, everyone gets unlimited Guru free
- ✅ All homeschool code IS complete (try page, auth, dashboard trimming, isHomeschoolParent helper)
- ✅ Guru model is `claude-sonnet-4-20250514` (current)
- ❌ `react-media-recorder` not in package.json (needs install for voice notes)

**Voice Notes Research:**
- Best recording lib: `react-media-recorder` (64K weekly downloads, hook-based API)
- Best transcription: OpenAI Whisper via existing `OPENAI_API_KEY` ($0.006/min)
- Alternative: AssemblyAI Universal-2 (comparable price, has streaming + sentiment)
- iOS Safari 18.4+ finally supports WebM/Opus (Jan 2025)
- No pre-built full voice-note component exists — must compose libs

**Visual Asset — Montessori Quote Poster:**
- `Montree_Montessori_Quote.pdf` + `.png` — "Never help a child with a task at which he feels he can succeed."
- Montree brand palette (deep teal, emerald, warm cream)
- "Tender Cartography" design philosophy — botanical specimen plate aesthetic
- Phyllotaxis (Fibonacci) seed pattern, naturalist field study framing

**Handoff:** `docs/HANDOFF_GURU_HOME_INTEGRATION_FEB19.md`

### Session Work (Feb 19, 2026) — Early Session

**Story System Analysis:**
- Accessed Story messaging system (1,875 messages total in `story_message_history`)
- Decrypted 218 text messages (Feb 11-19) using current `MESSAGE_ENCRYPTION_KEY`
- 1,364 older messages (pre-Feb 11) failed to decrypt — encrypted with the rotated key that only exists on Railway, NOT in `.env.local`
- **To decrypt all messages:** Need the `MESSAGE_ENCRYPTION_KEY` from Railway env vars (the one set during the Feb 11 rotation)
- Two participants: "T" (904 msgs) and "Z" (971 msgs), dating from Jan 11 to Feb 19, 2026
- Psychological analysis completed and discussed with user

**12-Month Roadmap Created:**
- `TREDOUX_ROADMAP_2026.pdf` — 7-page strategic plan covering personal + business goals
- 4 phases: Detach (M1-2) → Monetize (M2-4) → Scale (M4-8) → Exit (M8-12)
- Includes pricing strategy, financial projections, weekly schedule, success metrics
- Generated via reportlab (`roadmap.py` in session working dir)

**1688 Shopping Cart Status (from earlier in session):**
- ✅ Xinshicheng — 7" IPS Cloud Photo Album (WiFi+BT), White, qty 1 — ¥144.40
- ✅ Baishunda — 7" WiFi Digital Photo Frame, 8GB, qty 1 — ¥192.00
- ✅ Mansray — 7" Video Brochure LCD, White, qty 2 — ¥218.76
- ❌ Greentech P1.875 LED modules still in cart (unchecked, needs deletion)
- Total checked: ~¥805 (4 sellers, 4 varieties, 6 pcs including shipping)
- **1688 cart bug:** Clicking "Add cart" resets qty to 0 visually but item IS added. Double-clicking causes qty 2. Always check cart and reduce after adding.

---

### ✅ DEPLOYED PREVIOUSLY (Feb 17, 2026)

**Late Session Fixes (commit `f42529e`):**
- ✅ CurriculumWorkList: replaced emoji area icons (🧹👁️🔢📚🌍) with uniform AreaBadge colored circles (P/S/M/L/C)
- ✅ Principal setup overlay: replaced chaotic statusMessage animation with smooth curated 6-step progression (timer-based, CSS transitions, step indicators)
- ✅ Cleaned up stale `statusMessage` state — button now shows simple spinner during loading
- ✅ `setup-stream` route: fixed to use static JSON curriculum (329 works) instead of Brain DB (220 works)
- ✅ Admin panel: new classroom/student management pages, guru page, student search API
- ✅ Tutorial complete API endpoint + teacher tutorial flag migration (130)
- ✅ English Language Curriculum Guide DOCX created
- ✅ Zustand added to dependencies

**Teacher Login Code Fix (Complete):**
- ✅ Code deployed (commits `b4917e1`, `99a3d0b`, `68887b2`)
- Root cause: `principal/setup-stream` and `principal/setup` routes generated lowercase codes and never set `password_hash` (NULL). Auth route normalized to uppercase → case mismatch + NULL lookup = all 3 auth steps failed.
- Fix: All 5 teacher-creation routes now use uppercase charset + `legacySha256()` for `password_hash`
- Auth route Step 2 now case-insensitive (`.ilike()`), handles NULL password_hash, tries both cases in bcrypt fallback
- `onboarding/route.ts` also fixed: `hashPassword` (bcrypt) → `legacySha256` (SHA-256)
- Backward compatible: old teachers with lowercase login_code or bcrypt hashes still work via fallback paths

**My Classroom Cleanup:**
- ✅ Principals no longer get auto-created "My Classroom" during onboarding (`try/instant`)
- ✅ Overview API filters out empty "My Classroom" placeholders (name match + 0 teachers + 0 students)

**Handoff:** `docs/HANDOFF_LOGIN_CODE_FIX_FEB17.md`

---

### 🎓 Comprehensive Onboarding System — ALL PHASES COMPLETE (Feb 21, 2026)

Platform-wide onboarding system for guiding all user types through features on first use.

**Status:** All phases complete. Needs migration 131 run to function.

| Phase | What | Status |
|-------|------|--------|
| 1 | Database (3 tables) + API (3 endpoints) | ✅ Complete |
| 2 | Components (OnboardingOverlay, FeatureWrapper) + State (Zustand) | ✅ Complete |
| 3-5 | Integration (data-tutorial attrs + page wrapping) | ✅ Complete (Feb 21) |

**What's Ready:**
- ✅ Migration 131 created (progress, settings, events tables)
- ✅ 3 API routes (settings toggle, progress tracking, skip module)
- ✅ Super-admin toggle UI (4 checkboxes for role-based enable/disable)
- ✅ OnboardingOverlay component (tutorial modal with SVG spotlight effect)
- ✅ FeatureWrapper component (contextual tour trigger)
- ✅ Zustand store with localStorage persistence
- ✅ Type-safe configs (role-specific onboarding flows)
- ✅ 968 lines of code written

**What's Not Ready:**
- ❌ Migration 131 NOT run against Supabase (tables don't exist yet — only remaining blocker)

**Architecture:**
- 3 PostgreSQL tables: `montree_onboarding_progress` (step tracking), `montree_onboarding_settings` (role toggles), `montree_onboarding_events` (analytics)
- JWT auth via `verifySchoolRequest()` (existing pattern)
- Super-admin password protection on settings PATCH
- Zustand store with Set-based completedSteps tracking
- SVG mask for spotlight cutout effect
- Progressive disclosure (tours trigger on first visit per feature)

**Files Created (8 new):**
- `migrations/131_onboarding_system.sql` — 3 tables + 5 indexes
- `app/api/montree/onboarding/settings/route.ts` — Toggle GET/PATCH
- `app/api/montree/onboarding/progress/route.ts` — Progress GET/POST
- `app/api/montree/onboarding/skip/route.ts` — Skip module POST
- `lib/montree/onboarding/configs.ts` — Type-safe step definitions
- `components/montree/onboarding/OnboardingOverlay.tsx` — Tutorial modal
- `components/montree/onboarding/FeatureWrapper.tsx` — Page wrapper
- `hooks/useOnboarding.ts` — Zustand store (154 lines)

**Files Modified (2):**
- `app/montree/super-admin/page.tsx` — Added toggle UI section (+65 lines)
- `package.json` — Added zustand dependency

**Onboarding Flows Defined:**
- Teachers: 5 modules, ~15-20 steps (student mgmt, week view, curriculum, capture, guru)
- Principals: 3 modules, ~9 steps (classroom mgmt, teacher mgmt, overview)
- Homeschool Parents: Same as teachers, auto-derived with label swaps
- Parents: 2 modules, ~5 steps (dashboard overview, reports/photos)

**Next Steps:**
1. Run migration 131 against Supabase: `psql $DATABASE_URL -f migrations/131_onboarding_system.sql`
2. Audit foundation with Opus (comprehensive handoff written)
3. Decide: Continue with Phase 3-5 or iterate on foundation
4. If approved: Add data-tutorial attributes to ~20 pages (3-4 hours)

**Plan File:** `.claude/plans/splendid-herding-tome.md`
**Handoff:** `docs/HANDOFF_ONBOARDING_SYSTEM_FEB17.md`

**Key Design Decisions:**
- Zustand over Redux (simpler API, built-in persistence)
- Normalized tables over JSONB (easier analytics, better indexing)
- Singleton settings table (no env restarts needed)
- Step-level tracking (not just module completion)
- Client + server storage (offline support + DB backup)

---

### ✅ DEPLOYED PREVIOUSLY (Feb 16, 2026)

**Location Tracking:**
- ✅ Code deployed (commit 286ccc35)
- ✅ Migrations run (126, 127, 128)
- ✅ Super-admin panel shows flag emoji + city/country for all new signups
- IP geolocation via ip-api.com (45 req/min free tier)
- Captures: country, city, region, timezone, IP address

**Three-Issue Child Week Fix:**
- ✅ Code deployed (commit 333d884e)
- ✅ Migration 124 run (montree_child_extras table)
- Extras leak fixed (no more historical record pollution)
- Auto-mastery (setting focus #15 masters works 1-14 automatically)
- Area icon uniformity (shared AreaBadge component across 11 pages)

**Cleanup:**
- ✅ Deleted dead homeschool auth route
- ✅ Added audit docs + task list

**Handoffs:** `docs/AUDIT_LOCATION_TRACKING_FEB16.md`, `docs/SUGGESTED_TASKS_FEB16.md`, `docs/HANDOFF_THREE_ISSUE_FIX.md`

---

### 🏠 Montree Home — ALL 4 PHASES DEPLOYED (Feb 15, 2026)

Standalone Montessori homeschool product. Shared codebase with classroom version.

**Product:** Free activity tracking + paid Guru ($5/month per child). Parents self-register with code-based login, manage multiple children, track works across 5 areas using the same UI as teachers.

**Architecture:** Homeschool parents stored in `montree_teachers` table with `role='homeschool_parent'`. They get a school (`plan_type: 'homeschool'`), a classroom ("My Home"), seeded curriculum, and go through IDENTICAL onboarding as teachers. 30-day JWT/cookie TTL (vs 7 for teachers). Teacher auth reads role from DB and issues correct token.

**NO separate table.** No `montree_homeschool_parents`. No separate auth route. No separate dashboard. Same system, different role.

**4 Phases:**

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation — auth + DB migration + signup/login | ✅ Done (Feb 15) |
| 2 | Dashboard — role-based UI trimming, hide school features for parents | ✅ Done (Feb 15) |
| 3 | Guru — freemium gate + paywall + Stripe billing + homeschool prompt | ✅ Done (Feb 15) |
| 4 | Curriculum browser — browse works by area, age filtering, materials list | ✅ Done (Feb 15) |

**Pricing:** Free = full tracking. Paid = Guru access ($5/child/month). 3 free Guru prompts for new signups, then hard paywall.

**Plan file:** `.claude/plans/montree-home-v1.md`
**Handoff Phase 1:** `docs/HANDOFF_MONTREE_HOME_PHASE1.md`
**Handoff Phase 2:** `docs/HANDOFF_MONTREE_HOME_PHASE2.md`
**Handoff Phase 4:** `docs/HANDOFF_MONTREE_HOME_PHASE4.md`

**Phase 1 commits:** `9378007e` (initial), `cb5bfd24` (corrected — identical teacher flow)
**Phase 2 commit:** `fc1521ef` (dashboard trimming — 6 files, isHomeschoolParent helper, hide Invite Parent + Labels, child vs student labels, role in auth response)

**Phase 2 changes:** `isHomeschoolParent()` helper in `lib/montree/auth.ts`. Dashboard shows "children" vs "students". Child week view hides Invite Parent button+modal. Students page hides Labels button, swaps Student→Child. Onboarding uses "Enter My Home", "Add Your Children". CRITICAL: teacher auth route now returns `role` in teacher response object (was missing — would break session role detection on login).

**Phase 3 commit:** `c5e18ef2` (Guru freemium — 7 files: 3 modified, 4 new)

**Phase 3 changes:**
- `app/api/montree/guru/route.ts` — Freemium gate: checks `guru_prompts_used` before AI call, returns `guru_limit_reached` error when 3 free prompts used. Increments counter for free-tier homeschool parents. Also passes `isHomeschoolParent` flag to prompt builder.
- `app/api/montree/guru/status/route.ts` — NEW: Returns guru access level (`unlimited`/`paid`/`free_trial`), prompts used/remaining, `is_locked` flag. Teachers get unlimited. Homeschool parents get trial or paid based on Stripe subscription.
- `app/api/montree/guru/checkout/route.ts` — NEW: Creates Stripe Checkout session for Guru subscription. Gets/creates Stripe customer on `montree_teachers`, counts children for quantity billing ($5/month × N children).
- `app/api/montree/guru/webhook/route.ts` — NEW: Stripe webhook handler for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Updates `guru_plan`/`guru_subscription_status`/`guru_current_period_end` on teacher record.
- `app/montree/dashboard/guru/page.tsx` — Paywall modal overlay (upgrade CTA with features list), free trial prompts counter banner, checkout flow, role-aware quick questions and placeholder text, handles `?upgrade=success|cancel` URL params.
- `lib/montree/guru/prompt-builder.ts` — `HOMESCHOOL_ADDENDUM` injected into system prompt for homeschool parents: addresses as parent, replaces classroom language, suggests DIY materials, home environment tips, encourages.
- `migrations/127_guru_freemium.sql` — Adds `guru_plan`, `guru_prompts_used`, `guru_stripe_customer_id`, `guru_stripe_subscription_id`, `guru_subscription_status`, `guru_current_period_end` columns to `montree_teachers`. Indexes on Stripe IDs.

**Phase 3 env vars needed:**
- `STRIPE_PRICE_GURU_MONTHLY` — Stripe Price ID for the Guru monthly subscription
- `STRIPE_WEBHOOK_SECRET_GURU` — Stripe webhook signing secret for the Guru endpoint

**Migrations needed:** Run `migrations/126_homeschool_tables.sql` + `migrations/127_guru_freemium.sql` against Supabase before testing. ⚠️ NOT YET RUN.

**Deploy commit:** `d04eb483` (Feb 15, 2026 — pushed via GitHub REST API, all 30 files in single commit)

**Phase 4 commit:** `62ad6772` (curriculum browser — 2 files: 1 new, 1 modified), `cd9eb8c7` (audit fix)

**Phase 4 changes:**
- `app/montree/dashboard/curriculum/browse/page.tsx` — NEW: Read-only curriculum browser. Imports all 5 static JSON files directly (no API). 5 area tabs with AREA_CONFIG colors, search by name/description/materials, age range filter (Year 1/Year 2/Year 3), collapsible categories, expandable work cards with full details (materials, aims, prerequisites, levels with YouTube demo links). Role-aware labels for homeschool parents ("Materials You'll Need", "What Your Child Learns", "Hidden Benefits", "How They Self-Correct"). Prerequisite names resolved via cross-area lookup map.
- `app/montree/dashboard/curriculum/page.tsx` — Added "Browse Guide" button in header linking to `/montree/dashboard/curriculum/browse`.

**Dead file to delete:** `app/api/montree/auth/homeschool/route.ts` — created in initial push, no longer called. FUSE-locked, delete when possible.

**Resolved decisions:**
- Branding: Same as classroom (same Mercedes, different driver)
- Signup: Third option on existing try flow ("I'm a parent")
- Custom works: Yes, same WorkPickerModal UI
- Observations: Yes, full system, same as classroom
- Onboarding: IDENTICAL to teacher — school + classroom + add children from dashboard
- Login: Same page, same auth endpoint — teacher auth handles both roles
- **CRITICAL:** This is NOT a rebuild. Homeschool parents are teachers with `role='homeschool_parent'`. Same table, same classroom, same everything. Do NOT create separate systems, tables, or routes.

---

### Security Hardening — ALL 9 PHASES COMPLETE ✅

9-phase security hardening project COMPLETE. All phases done.

| Phase | Name | Status |
|-------|------|--------|
| 1 | API Auth (JWT for all routes) | ✅ Done |
| 1B | Parent session tokens | ✅ Done |
| 2 | bcrypt password migration (100% audited) | ✅ Done |
| 3 | Quick security wins (11 fixes across ~25 files) | ✅ Done + Audited |
| 4 | Secret rotation & env hardening (12 fixes across ~20 files) | ✅ Done + Audited |
| 5 | Password policy & rate limiting (23 files, 1123 insertions) | ✅ Done |
| 6 | Input sanitisation & CSP headers (17 files) | ✅ Done |
| 7 | Session management (timing-safe auth, HttpOnly cookies, CSRF) | ✅ Done |
| 8 | Logging & monitoring (6 fixes across ~15 files) | ✅ Done |
| 9 | Production security review (8 fixes across ~45 files) | ✅ Done |

**Handoff docs:**
- `docs/HANDOFF_SECURITY_PHASE4_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE6_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE7_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`

**Plan files:** `.claude/plans/phase5-plan-v3.md`, `.claude/plans/phase6-plan-v3.md`, `.claude/plans/phase7-plan-v3.md`, `.claude/plans/phase8-plan-v2.md`, `.claude/plans/phase9-plan-v1.md`

### ✅ POST-SECURITY ACTIONS — KEY ROTATION COMPLETE

**MESSAGE_ENCRYPTION_KEY rotation** — ✅ DONE (Feb 11, 2026). Old insecure default key rotated to a new random 32-char key. Script (`scripts/rotate-encryption-key.ts`) processed 1,619 messages: 1,381 re-encrypted (CBC→GCM), 238 plaintext skipped, 0 failures. Pagination bug fixed in script (Supabase 1000-row default limit). Key updated on Railway and in `.env.local`. Verified: 5/5 sample messages decrypt correctly.

**Frontend update** — ✅ DONE. Super-admin panel now sends password with audit POST and schools GET.

### Other Open Items

**Domain Migration** — ✅ DONE. `montree.xyz` is live. Old `teacherpotato.xyz` redirects to `www.teacherpotato.xyz` and returns 405 on API calls.

**Codebase Cleanup** — ✅ ALL PHASES COMPLETE:

| Phase | What | Status |
|-------|------|--------|
| 1 | Security fixes (secret + dead auth route) | ✅ Done |
| 2 | Consolidate 3 Supabase clients into one | ✅ Done |
| 3 | Delete dead code + dedup 27 game routes | ✅ Done |
| 4 | Split 3 oversized files (918, 1115, 1243 lines) | ✅ Done |
| 5 | Strip console.log statements (219 → 0) | ✅ Done |
| 6 | Fix `: any` type annotations (23 → 2 trivial) | ✅ Done |

---

### 🔧 Three-Issue Fix — ✅ CODE COMPLETE (Feb 12, 2026)

Three fixes to the child Week view. **Needs migration + push to deploy.**

| Issue | What | Status |
|-------|------|--------|
| 1 | Extras Leak — new `montree_child_extras` table, `is_extra` flag | ✅ Done |
| 2 | Auto-Mastery — batch-master API, fire-and-forget on focus set | ✅ Done |
| 3 | Area Icon Uniformity — shared `AreaBadge` component across 11 pages | ✅ Done |

**Deploy steps:**
1. Run `migrations/124_child_extras_table.sql` against Supabase
2. `git push origin main` — ⚠️ BLOCKED (see Git Push section below)

**Files created (3 new):**
- `migrations/124_child_extras_table.sql` — extras table + index
- `app/api/montree/progress/batch-master/route.ts` — batch mark works as mastered
- `components/montree/shared/AreaBadge.tsx` — shared colored-circle area icon

**Files modified (~19):**
- `lib/montree/types.ts` — extended AREA_CONFIG with decorative fields
- `app/api/montree/progress/route.ts` — fetches extras, adds `is_extra` flag
- `app/api/montree/progress/update/route.ts` — `remove_extra`, `is_extra`, focus cleanup
- `app/montree/dashboard/[childId]/page.tsx` — extras filter + wheelPickerWorks pass-through
- `hooks/useWorkOperations.ts` — removeExtra, addExtra, addWork, auto-mastery logic
- `components/montree/child/FocusWorksSection.tsx` — AreaBadge + is_extra interface
- `components/montree/child/WorkPickerModal.tsx` — is_extra interface
- `lib/montree/work-matching.ts` — is_extra interface
- 11 pages refactored for AreaBadge (progress, detail, gallery, summary, weekly-review, reports, print, milestones, AreaProgressGrid, students, curriculum)

**Bug fixed:** students/page.tsx had Practical Life and Language colors swapped.

**Handoff:** `docs/HANDOFF_THREE_ISSUE_FIX.md`

---

### 🎬 Promo Video Production — ✅ COMPLETE (Feb 13, 2026)

Produced optimized social media videos from raw screen recording (`Final Edit Montree Intro.mp4`).

**Outputs (all in `Promo Videos/`):**
- `Montree_Shorts_9x16.mp4` — 1080×1920, 57.9s, YouTube Shorts / Reels / TikTok
- `Montree_Social_Square.mp4` — 1080×1080, 57.9s, Instagram feed / Facebook / LinkedIn
- `Montree_Thumbnail.png` — 1280×720, YouTube thumbnail
- `YOUTUBE_SEO_UPLOAD_GUIDE.md` — Ready-to-paste title, description, tags, upload settings, social captions

**What was done:**
- Cropped source to preserve webcam face overlay (top 25px macOS bar removed, Chrome UI kept)
- Burned in captions from SRT file (Poppins Bold, white on dark teal box)
- Shorts: branded top bar (logo + hook) + bottom bar (features + CTA) + intro/outro cards
- Square: branded bottom bar + intro/outro cards
- All assets use Montree brand colors (dark teal #0D3330, emerald #4ADE80, Poppins font)
- SEO guide includes YouTube metadata + social media captions for all platforms

**Known issues:** Thumbnail face extraction slightly off (needs coordinate tuning in `build_thumbnail_v2.py`). Browser chrome visible in video (required to keep webcam face).

**Handoff:** `docs/HANDOFF_PROMO_VIDEO_PRODUCTION.md`

---

### 📱 Social Media Uploads & Group Posting — ✅ MOSTLY COMPLETE (Feb 14, 2026)

**Platform uploads:**

| Platform | Handle | What | Status |
|----------|--------|------|--------|
| Instagram | @montreexyz | Onboarding reel + Intro reel | ✅ Live |
| Facebook | facebook.com/montreexyz | Onboarding reel + Intro reel | ✅ Live |
| TikTok | @montreexyz | Onboarding video + Intro video | ✅ Live |
| LinkedIn | tredoux@montree.xyz account | Intro video + Onboarding video | ✅ Posted (Feb 14) |

**Tutorial video branding:** Created branded versions of tutorial screen recording with minimalist Montree overlays.
- `Promo Videos/Video 3 - Tutorial/Montree_Tutorial_Social_BRANDED.mp4` (70MB, 1080×1080)
- `Promo Videos/Video 3 - Tutorial/Montree_Tutorial_Youtube_BRANDED.mp4` (86MB, 1920×1080)

**Facebook group reel campaign — 17 groups posted (Feb 14, 2026):**
Shared intro reel (https://www.facebook.com/reel/1437788707724055) to 17 Montessori Facebook groups with standard caption + montree.xyz CTA + social links. Estimated combined reach: ~815K+ members.

Top groups: Montessori activities (157K), Montessori Works at home and in schools (121K), McDaniels International Montessori Virtual (~88K), Montessori Matters (78K), MONTESSORI TEACHING METHODOLOGY (72K), ...MONTESSORI... (61K), Montessori Teachers International (56K), Montessori at HOME (51K), Montessori Materials For School (43K), + 8 more.

**Groups posted today (Feb 14, late session):** Montessori Research Interest Group, McDaniels International Montessori (Virtual)

**Key workflow notes for group posting:**
- Do NOT use hashtags in caption (triggers autocomplete dropdown that dismisses dialog)
- Always verify caption with `cmd+Home` before clicking Post
- Use `find` tool to locate text inputs (Facebook DOM changes frequently)
- Groups only appear in Share list if membership is approved

**Bug fix:** `html2canvas` → `html2canvas-pro` in `components/montree/FeedbackButton.tsx` (Tailwind CSS v4 `lab()` color function compatibility)

**Status:** All visible groups in share list posted to (as of Feb 14 late session). 4 pending membership groups not yet accessible (Montessori at Home 3-6, Materials for Sale, AMI Montessori, Cool Things).

**LinkedIn session (Feb 14):**
- New account created with `tredoux@montree.xyz` (old account locked — China location mismatch)
- Profile fully set up: headline, about, experience, education, skills, contact info, organizations
- 25 connection requests sent (1 personalized to Morais Velemo Mabyeka, 24 quick connects)
- 2 videos posted (Intro + Onboarding) — user uploaded manually, assistant provided captions
- Video 3 (Tutorial, 70MB) deferred — user will edit down first
- Company page creation blocked (needs accepted connections first)
- Premium checkout failed (520 Cloudflare / NETWORK_ERROR — VPN + DevTools interference)
- Rate limits hit on messaging and group joins (~24hr cooldown)

**Pending:** Join new Montessori groups, monitor pending approvals, LinkedIn company page (needs connections), YouTube uploads, LinkedIn Premium (payment errors).

**Handoff:** `docs/HANDOFF_SOCIAL_MEDIA_GROUP_POSTING.md`, `docs/HANDOFF_SOCIAL_MEDIA_UPLOADS.md`, `docs/HANDOFF_LINKEDIN_SESSION_FEB14.md`

---

### 📱 Social Media Manager — ✅ COMPLETE (Feb 14, 2026)

Comprehensive Social Media Manager tool built for managing Montree's social media presence across Instagram, TikTok, Facebook, LinkedIn, and YouTube.

**Location:** `/montree/super-admin/social-manager`

**System Architecture:**

1. **Knowledge Base (Training Data)** — `lib/social-media-guru/knowledge/`
   - `instagram-strategy.md` (125 lines) — Algorithm priorities, posting times, content mix, hashtag strategy, Reel best practices
   - `caption-writing.md` (230 lines) — 3-part formula (Hook/Value/CTA), platform-specific strategies, tone guide, 4 ready-to-use templates
   - `hashtag-strategy.md` (267 lines) — Mix formula (5 large + 10 medium + 5 small), Montessori-specific hashtags, pre-built sets

2. **Social Media Guru (AI Advisor)** — `app/api/montree/social-guru/route.ts`
   - Claude Sonnet 4 API with 900+ lines of curated knowledge
   - Instant advice for captions, hashtags, posting times, platform strategies
   - System prompt includes Montree product details + brand voice guidelines

3. **Database Tables** — `migrations/125_social_media_tables.sql`
   - `social_content_library` — Store final videos/images with metadata
   - `social_accounts` — Encrypted credentials (AES-256-GCM) for each platform
   - `social_post_log` — Manual tracking of what was posted where

4. **User Interface (6 Pages)**
   - Main hub: `app/montree/super-admin/social-manager/page.tsx` (5 module cards, platform badges, quick stats)
   - **Social Media Guru:** `guru/page.tsx` — Chat interface with streaming Claude responses, conversation history
   - Placeholder pages (future build-out): `vault/page.tsx`, `credentials/page.tsx`, `tracker/page.tsx`, `calendar/page.tsx`

**Migration Status:** ✅ SQL migration run successfully — 3 tables + 5 indexes created

**Deploy Status:** ✅ Code committed (commit 549b589), awaiting `git push origin main` from local terminal

**Files created (13 new):**
- 3 knowledge base files (instagram-strategy.md, caption-writing.md, hashtag-strategy.md)
- 2 API files (context-builder.ts, social-guru/route.ts)
- 1 migration (125_social_media_tables.sql)
- 6 UI pages (page.tsx, guru/page.tsx, vault/page.tsx, credentials/page.tsx, tracker/page.tsx, calendar/page.tsx)
- 1 modified (super-admin page.tsx — added Social Manager button)

**Immediate Value:**
- Social Media Guru is **ready to use today** (fully functional AI advisor)
- Ask for captions, hashtags, posting times, platform strategies
- All advice grounded in 900+ lines of curated Montessori + social media knowledge

**Future Phases:**
1. Content Vault — Upload/manage videos with metadata, track which platforms posted to
2. Credentials Vault — AES-256-GCM encrypted password storage
3. Post Tracker — Manual logging with platform/URL/caption/hashtags
4. Content Calendar — Drag-and-drop monthly calendar for scheduling posts

**Handoff:** `docs/HANDOFF_SOCIAL_MEDIA_MANAGER.md`

---

### 🐛 FeedbackButton Fix — ✅ COMPLETE (Feb 14, 2026)

Fixed `components/montree/FeedbackButton.tsx` — completely broken on mobile (textarea unresponsive, screenshot capture corrupted DOM). 5 fix attempts, final one working.

**Root causes:**
1. `disabled={!selectedType}` on textarea — input disabled until feedback type selected
2. `html2canvas-pro` DOM corruption on mobile — leaves invisible elements blocking touch events
3. Race condition: useEffect cleanup wiped `selectedType` + `message` during screenshot capture

**Fix (attempts 4-5, commits `972d426` + `fec10bb`):**
- Removed `disabled` from textarea — always enabled, placeholder changes dynamically
- Close-reopen pattern: form closes before screenshot capture, reopens with fresh DOM after
- `pendingScreenshotRef` replaces `formKey` state — manages screenshot handoff during close/reopen cycle
- `savedTypeRef` + `savedMessageRef` preserve form state across close/reopen (fixes greyed-out send button)
- Removed `key={formKey}` force-remount — unnecessary with close/reopen pattern

**Prior fix:** `html2canvas` → `html2canvas-pro` (Tailwind CSS v4 `lab()` color function compatibility)

**Handoff:** `docs/HANDOFF_FEEDBACKBUTTON_FIX_FEB14.md`

---

### 🚀 Git Push — ✅ FULLY RESOLVED (Feb 15, 2026)

**Root cause found: Astrill VPN (TCP protocol)** was intercepting TLS handshakes to github.com:443. TCP-over-TCP meltdown killed larger transfers. Small requests sometimes squeezed through, which is why it seemed intermittent.

**Fix:** Turn off Astrill VPN → git push/pull → turn Astrill back on. Alternatively, try switching Astrill to UDP protocol (avoids TCP-over-TCP).

**whale-class repo** — pushed successfully via GitHub Desktop (22 files, "deploy: latest changes"). 26 stashed changes discarded (stale). Still the active Railway deployment repo.

**montree repo (clean alternative):**
- `github.com/Tredoux555/montree` (private)
- Clean copy at `/Users/tredouxwillemse/Desktop/ACTIVE/montree/` (68MB vs 600MB+ whale-class .git)
- Commit `87f0321` ("Initial commit: Montree platform") confirmed on GitHub
- Bulletproof `.gitignore` (blocks node_modules, .next, media, audio, videos, env files, large binaries)
- NOT yet used for Railway deployment — whale-class still active

**GitHub PAT:**
- User has a `cowork-permanent` PAT — **ASK USER FOR IT** if not provided. GitHub push protection blocks PATs in committed files.
- ⚠️ `.github-pat` file does NOT exist in Cowork mount — user must provide PAT in chat each session

**⚡ Cowork Push Workflow (PREFERRED — uses GitHub REST API with retries):**
```bash
# User provides PAT in chat, then:
GITHUB_PAT="<pat>" python3 scripts/push-to-github.py "commit message" \
  "repo/path/file.ts" "/sessions/practical-wonderful-volta/mnt/whale/repo/path/file.ts" \
  "repo/path/file2.ts" "/sessions/practical-wonderful-volta/mnt/whale/repo/path/file2.ts"
```
- Script at `scripts/push-to-github.py` — REST API push with 5 retries + exponential backoff
- Handles TLS flakiness automatically (root cause: Cowork VM intermittent SSL drops)
- Multi-file single-commit support
- **DO NOT use git clone approach** — TLS drops kill large transfers, FUSE locks block /tmp clones

**Mac git config (set during debugging, needs cleanup):**
```bash
# These should be cleaned up:
git config --global http.sslverify true        # currently false
git config --global --unset http.version       # currently HTTP/1.1
git config --global --unset http.timeout       # currently 300
git config --global --unset http.lowspeedlimit # currently 0
git config --global --unset http.lowspeedtime  # currently 0
```

**Mac local state:**
- `~/Desktop/ACTIVE/whale/` — Working whale-class repo (Railway deploys from this)
- `~/Desktop/ACTIVE/montree/` — Clean montree repo (future migration target)
- Can delete: `whale-clean/`, `whale-old/`, `whale-class-mirror.git/`, `~/Desktop/whale-backup-feb15/`

**GitHub SSH keys:**
- "My Mac" (Nov 2025) — user's MacBook
- "Cowork VM" (Feb 11) — ⚠️ stale, can delete
- "Cowork VM Feb 14" — previous session
- "Cowork VM Feb 15" — previous session
- Note: SSH keys are per-session in Cowork. Prefer PAT workflow above instead.

**Handoff:** `docs/HANDOFF_GIT_SSL_FIX_FEB15.md`, `docs/HANDOFF_GIT_PUSH_FIX_FEB15.md`

---

### 🐳 Dockerfile Build Fix — ✅ FIXED (Feb 15, 2026)

Railway builds failing with `supabaseUrl is required` / `supabaseKey is required` during `npm run build` inside Docker.

**Root cause:** Next.js 16.1.1 Turbopack evaluates server modules during page data collection at build time. Docker env vars weren't declared as `ARG` in the Dockerfile, so `process.env.*` was undefined during `RUN npm run build`. Railway injects env vars during Docker build, but they must be declared as `ARG` to be accessible.

**Phantom route:** Build error referenced `/api/classroom/[classroomId]/curriculum` — doesn't exist as a file. Turbopack generated it from `app/admin/schools/[slug]/classrooms/[id]/curriculum/page.tsx`.

**Fix (2 commits via GitHub web editor):**

| Commit | What | Result |
|--------|------|--------|
| `055438e` | Added 3 `NEXT_PUBLIC_*` ARGs | Partial — error changed to `supabaseKey is required` |
| `79ae195` | Added ALL 18 env vars as ARGs (client + server) | ⏳ Awaiting Railway build |

**18 ARGs declared:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `STORY_JWT_SECRET`, `MESSAGE_ENCRYPTION_KEY`, `SUPER_ADMIN_PASSWORD`, `TEACHER_ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `VAULT_PASSWORD`, `VAULT_PASSWORD_HASH`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OPENAI_API_KEY`, `STRIPE_PRICE_GURU_MONTHLY`, `STRIPE_WEBHOOK_SECRET_GURU`

**Method:** Both commits pushed via GitHub web editor (Chrome browser automation). Cowork VM `.git/index.lock` is FUSE-locked.

**IMPORTANT PATTERN:** For Next.js Docker deployments, ALL env vars referenced by ANY server module must be declared as Docker ARGs before `RUN npm run build` — even "lazy" patterns like `getSupabase()` get triggered by Turbopack's build-time page data collection.

**Handoff:** `docs/HANDOFF_DOCKERFILE_BUILD_FIX_FEB15.md`

---

### 📧 Email Setup — ✅ COMPLETE (Feb 14, 2026)

Created new email forwarding address `tredoux@montree.xyz` for LinkedIn account registration.

**Context:** User's LinkedIn account was locked due to location mismatch (set as China, user is South African). The existing `hello@montree.xyz` email was already used for the old account, so a new email address was needed.

**Email Configuration:**

```
Service:     Cloudflare Email Routing (free)
Address:     tredoux@montree.xyz
Action:      Send to an email
Destination: tredoux555@gmail.com
Status:      Active (enabled)
```

**How It Works:**
1. Email sent to `tredoux@montree.xyz`
2. Cloudflare Email Routing receives it (via MX records)
3. Forwards to `tredoux555@gmail.com`
4. User receives in Gmail inbox

**LinkedIn Setup Steps:**
1. Go to LinkedIn signup
2. Use email: `tredoux@montree.xyz`
3. Set location: South Africa (correct location)
4. Verify email via Gmail inbox
5. Complete profile setup

**Cloudflare Access:**
- Dashboard: https://dash.cloudflare.com/c34a0012899443b32a0de1ffd5dc6af3/montree.xyz/email/routing/routes
- Account: tredoux555@gmail.com
- Domain: montree.xyz

**Technical Notes:**
- MX records already configured (route1/2/3.mx.cloudflare.net)
- Unlimited custom addresses on free plan
- 1000 emails/day limit
- Receive-only forwarding (sending requires SMTP setup)

**Handoff:** `docs/HANDOFF_EMAIL_SETUP.md`

---

### 📊 Child Progress Portfolio — ✅ COMPLETE (Feb 11, 2026)

Rebuilt the Progress tab (`/montree/dashboard/[childId]/progress`) from a simple bar chart into a full portfolio view.

**What it shows:**
- Hero stats: 3 big numbers (Mastered / Practicing / Presented)
- 5 area progress bars — tappable to filter timeline (emerald/amber/indigo/rose/violet)
- Recent photos strip — horizontal scroll with lightbox viewer
- Timeline grouped by month — mastery ⭐, practicing 🔄, presented 📋, notes 📝, observations 👁

**Data sources (3 parallel fetches):**
- `/api/montree/progress/summary?child_id=X` → area bars + overall %
- `/api/montree/media?child_id=X&limit=20` → photo strip
- `/api/montree/progress?child_id=X&include_observations=true` → hero stats + timeline

**API enhancement:** Progress route now accepts `include_observations=true` query param → fetches from `montree_behavioral_observations` table.

**Files:** `app/montree/dashboard/[childId]/progress/page.tsx` (rewritten, 413 lines), `app/api/montree/progress/route.ts` (enhanced)

**Handoff:** `docs/HANDOFF_PROGRESS_DASHBOARD.md`

**Also in this session:**
- Position picker added to AddWorkModal (`84dab04`) — teachers can choose where to insert new works in sequence
- Camera capture fix (`6d86791`) — Permissions-Policy unblocked + facingMode fix
- Checkbox persistence fix (`0cefeeb`) — localStorage via useEffect

---

### 🚀 Marketing Hub — ✅ COMPLETE (Feb 11, 2026)

13 marketing tools added to super-admin panel under `/montree/super-admin/marketing/*`.

**Status:** All 18 new files created, committed. Needs `git push origin main` — ⚠️ BLOCKED (see Git Push section).

**Handoff:** `docs/HANDOFF_MARKETING_HUB.md`

**What was built (18 new files + 1 edit):**
- `app/montree/super-admin/marketing/layout.tsx` — auth wrapper (password gate, 15-min timeout, reuses `/api/montree/super-admin/auth`)
- `app/montree/super-admin/marketing/page.tsx` — hub with 13 clickable cards in 5 sections
- 8 JSX sub-pages (launch-hq, objections, warroom, content, studio, prospects, outreach, growth) — all have `// @ts-nocheck`, back buttons, `'use client'`
- 4 iframe sub-pages (landing, links, pitch, playbook) serving HTML from `public/`
- 4 HTML files copied to `public/` (montree-landing.html, montree-links.html, montree-pitch-v2.html, montree-playbook.html)
- 1 edit to `app/montree/super-admin/page.tsx` (added 🚀 Marketing Hub card in header)

**Source files still in project root** (not committed — can be deleted after verifying): 8 JSX + 4 HTML (`montree-*.jsx`, `montree-*.html`). Also `montree-mission-control.jsx`, `montree-demo.jsx`, `montree-pitch.html` — not part of marketing hub.

**Key decisions:**
- Auth via `layout.tsx` client wrapper (one gate for all pages, no per-page duplication)
- No middleware changes needed (`/montree/*` already in publicPaths)
- No new API routes (reuses `/api/montree/super-admin/auth`)
- JSX content kept 100% as-is — zero modifications to marketing copy
- `// @ts-nocheck` added to all 8 JSX-converted pages (original files were untyped JS)

---

### Recent Changes (Progress Dashboard + Feature Fixes, Feb 11)

**Child Progress Portfolio — `ba7b47d` (rewrite of progress/page.tsx + API enhancement):**
- Rebuilt `/montree/dashboard/[childId]/progress` from basic bars to full portfolio view
- 4 sections: hero stats (mastered/practicing/presented), 5 tappable area progress bars, recent photos strip with lightbox, timeline grouped by month
- Timeline shows mastery events, practicing, presentations, teacher notes, and behavioral observations
- Area bars filter the timeline when tapped
- Enhanced `/api/montree/progress/route.ts` — added `include_observations=true` query param (fetches `montree_behavioral_observations`)
- 3 parallel API fetches on mount: summary, media, progress+observations
- 3 rounds of planning: `.claude/plans/progress-dashboard-v1.md` → `v2.md` → `v3-FINAL.md`

**Position Picker in AddWorkModal — `84dab04`:**
- `components/montree/AddWorkModal.tsx` — full-screen position picker overlay for choosing where to insert new works
- Options: Beginning / After #N [work name] / End of list
- Sends `after_sequence` to curriculum POST API (already supported server-side)
- `app/montree/dashboard/curriculum/page.tsx` — passes `areaWorks={byArea}` to AddWorkModal

**Bug Fixes:**
- `6d86791` — Camera capture: unblocked Permissions-Policy in next.config.ts + fixed facingMode for mobile
- `0cefeeb` — Checkbox persistence: marketing hub checkboxes now use useEffect for localStorage read

**Commits need push:** `git push origin main` from local terminal (2 commits ahead of remote).

---

### Previous Changes (Marketing Hub + Encryption Rotation, Feb 11)

**Marketing Hub — 18 new files, 8,190 insertions:**
- Created `app/montree/super-admin/marketing/layout.tsx` — client-side auth wrapper (password gate, 15-min timeout, activity tracking). Reuses `/api/montree/super-admin/auth` endpoint.
- Created `app/montree/super-admin/marketing/page.tsx` — hub with 13 tool cards in 5 sections (Launch, Content, Outreach, Web Pages, Reference)
- Created 8 JSX sub-pages from source files in project root: launch-hq, objections, warroom, content, studio, prospects, outreach, growth. Each has `// @ts-nocheck` (line 1), `'use client'`, `import Link`, back button injected after first div.
- Created 4 iframe sub-pages: landing, links, pitch, playbook. Each embeds HTML from `public/`.
- Copied 4 HTML files to `public/`: montree-landing.html, montree-links.html, montree-pitch-v2.html, montree-playbook.html
- Added 🚀 Marketing Hub card (purple, `bg-purple-600`) to super-admin header buttons
- Committed as `8886849`. **Needs `git push origin main`** (VM SSH key not available this session).

**Encryption Key Rotation — COMPLETE:**
- Fixed pagination bug in `scripts/rotate-encryption-key.ts` (Supabase 1000-row default limit → added `.range()` pagination loop)
- Generated new 32-char random key, ran dry-run (1,619 messages found across 2 pages)
- Ran live: 1,381 re-encrypted (CBC→GCM), 238 plaintext skipped, 654 already GCM skipped, 0 failures
- Updated `MESSAGE_ENCRYPTION_KEY` on Railway and in `.env.local`
- Verified: 5/5 sample messages decrypt correctly with new key
- Updated CLAUDE.md status sections

**Build note:** Full `npm run build` couldn't run (`.next` directory FUSE-locked in Cowork VM). Used `npx tsc --noEmit` instead — 0 errors in marketing files after adding `// @ts-nocheck`.

---

### Previous Changes (Tech Debt Cleanup — 4 Tasks Complete, Feb 11)

**Tech Debt Project — ALL 4 TASKS COMPLETE:**

| Task | What | Status |
|------|------|--------|
| 1 | Dead code removal (Home product + unused routes) | ✅ Done |
| 2 | Whale API auth (43 routes protected via middleware) | ✅ Done |
| 3 | API route consolidation (story send 4→1, curriculum CRUD) | ✅ Done |
| 4 | Auth restructure (localStorage JWT → httpOnly cookies) | ✅ Done |

**Task 1 — Dead Code Removal (35 files, 6,226 lines deleted):**
- Deleted entire Home product: `app/home/`, `app/api/home/`, `lib/home/`, `components/home/`, `lib/curriculum/data/home-curriculum.json`
- Deleted `app/api/whale/themes/route.ts` (dead), `app/admin/montree-home/` (orphaned)
- Removed FamiliesTab from super-admin panel
- Removed Home references from middleware

**Task 2 — Whale API Auth (middleware-level protection):**
- Added admin JWT check (`admin-token` cookie) in middleware for all `/api/whale/*` routes
- Excludes `/api/whale/parent/*` and `/api/whale/teacher/*` (have own auth)
- Added `/api/whale/:path*` to middleware matcher (was excluded by regex)

**Task 3 — API Route Consolidation:**
- Story send: 4 routes (send-message, send-audio, send-image, send-video) → 1 unified `/api/story/admin/send`
- Extracted shared helpers to `lib/story/story-admin-auth.ts`
- Curriculum: Merged update/delete into main route as PATCH/DELETE methods
- Deleted 6 route files total

**Task 4 — Auth Restructure (localStorage → httpOnly cookies):**
- Server: Login routes (teacher, principal, try/instant) now set `montree-auth` httpOnly cookie
- Server: `verifySchoolRequest()` checks cookie first, then Bearer header. x-school-id fallback REMOVED
- Server: New `/api/montree/auth/logout` route clears the cookie
- Server: try/instant now creates JWT token (was missing — `setToken(responseData.token)` was setting `undefined`)
- Client: `montreeApi()` no longer sends Authorization header (cookie auto-sent by browser)
- Client: `setToken()` is now a no-op, `clearToken()` calls logout API
- Client: Login pages no longer call `setToken()`
- Weekly-planning routes updated to use `getSchoolIdFromRequest()` for cookie auth

**Key files created:** `app/api/montree/auth/logout/route.ts`, `lib/story/story-admin-auth.ts`
**Key files modified:** `middleware.ts`, `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`, `lib/montree/api.ts`

### Previous Changes (Codebase Cleanup Completion + SSH Setup, Feb 11)

**Codebase Cleanup Phase 5 (Final):**
- Stripped 46 remaining `console.log`/debug `console.warn` statements across 35 files
- Preserved all `console.error` (catch blocks) and security-tagged `console.warn` ([CSRF], [PARENT-AUTH], [SECURITY])
- Phases 2–4 and 6 were already completed in previous sessions

**SSH & Git Setup:**
- SSH key "Cowork VM" (ed25519) added to GitHub account for direct pushing from Cowork sessions
- Git remote switched from HTTPS to SSH: `git@github.com:Tredoux555/whale-class.git`
- Future sessions can `git push origin main` directly — no manual terminal needed

**MESSAGE_ENCRYPTION_KEY Rotation — REVERTED, Script Fixed:**
- Attempted rotation changed key on Railway to a new random value
- **BROKE 1,605 Story messages** — they displayed as raw `gcm:...` text in the Story admin dashboard
- Root cause: rotation script targeted `montree_messages` (doesn't exist) — actual table is `story_message_history.message_content`
- **Key reverted** to `change-this-to-32-char-key-12345` on Railway — messages readable again
- **Script fixed** (`scripts/rotate-encryption-key.ts`) — now targets correct table/column, handles both CBC and GCM formats
- **LESSON**: Always verify which table stores encrypted data before rotating keys. The `montree_messages` table was a placeholder that was never created.

**Post-Phase 9 Audit & Fixes:**
- **CRITICAL CSP FIX**: `script-src 'self'` in `next.config.ts` was blocking ALL inline JavaScript. Next.js requires inline scripts for hydration. Changed to `script-src 'self' 'unsafe-inline'`. Also added Google Fonts to `style-src` and `font-src`. This was breaking the ENTIRE site since Phase 6.
- **3 audit rounds** caught ~20 additional files with `error.message` leaks (total now ~65 files sanitized)
- **Super-admin panel frontend**: `hooks/useAdminData.ts` sends password header with schools GET; `page.tsx` sends password in audit POST body
- **Migration 123 applied**: Renamed `login_time` → `login_at` in `story_login_logs` and `story_admin_login_logs` (Phase 3 code change was never applied to DB). Created `montree_super_admin_audit` table (migration 099 never ran — all audit logging was silently failing). Ensured `montree_rate_limit_logs` exists.
- **Rate limiting added** to schools PATCH (10/15min) and DELETE (5/15min)
- **Duplicate `getSupabase()` deduped** in audit GET handler

**Files created:** `docs/HANDOFF_POST_PHASE9_AUDIT.md`, `migrations/123_fix_story_columns_and_audit_table.sql`

### Previous Changes (Phase 9 — Production Security Review, Feb 11)

**Phase 9 — Production Security Review (8 fixes across ~45 files):**
- Fix 1 (CRITICAL): Created `lib/verify-super-admin.ts` — shared timing-safe `verifySuperAdminPassword()` helper using `timingSafeEqual()` with fixed 256-byte buffers. Replaced 9 plaintext `!==` comparisons across 6 super-admin route files.
- Fix 2 (CRITICAL): Secured `audit/route.ts` — both GET and POST were completely unauthenticated. Added `verifySuperAdminPassword()` + rate limiting + query limit cap (500).
- Fix 3 (CRITICAL): Secured `schools/route.ts` GET — was returning all school data publicly. Added auth (header or query param).
- Fix 4 (CRITICAL): Upgraded `lib/message-encryption.ts` from AES-256-CBC to AES-256-GCM. New format: `gcm:<iv>:<authTag>:<encrypted>`. Backward compatible (auto-detects by prefix). Created `scripts/rotate-encryption-key.ts` migration script.
- Fix 5 (HIGH): Added input length validation — messages (5000/500/200 chars), curriculum generate-description (255/50 chars).
- Fix 6 (HIGH): Added 8 missing env vars to `.env.example`. Converted Stripe PRICE_IDS from hardcoded fallbacks to lazy-throw pattern via Proxy.
- Fix 7 (HIGH): Sanitized ~43 API files — removed `error.message`/`error.details`/`error.hint`/`JSON.stringify(error)` from client responses. All now return generic messages.
- Fix 8 (MEDIUM): Added `checkRateLimit()` to 5 super-admin endpoints (audit, schools, npo-applications, reduced-rate-applications, reset-password).

**Files created:** `lib/verify-super-admin.ts`, `scripts/rotate-encryption-key.ts`, `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`

### Previous Changes (Phase 8 — Logging & Monitoring, Feb 11)

**Phase 8 — Logging & Monitoring (6 fixes across ~15 files):**
- Fix 1: Added `login_success` audit logging to 5 auth endpoints (teacher, parent, admin, home, super-admin login-as)
- Fix 2: Added `logout` audit logging to 2 endpoints (admin, parent — both required rewrite for `NextRequest` param)
- Fix 3: Added destructive operation logging — `school_delete`, `child_delete`, `account_created` (all log BEFORE cascade)
- Fix 4a: Created `lib/api-error.ts` — safe error logging utility
- Fix 4b: Sanitized error responses — removed `error.message`/`error.details` leaks from leads, children, schools routes
- Fix 4b (bug fix): Removed undefined `fallbackPassword` variable in `leads/route.ts` (would throw ReferenceError at runtime)
- Fix 4b (bug fix): Removed partial password logging (`superAdminPassword.substring(0, 2)`) in leads route
- Fix 5: Added CSRF block logging (`console.warn('[CSRF]')`) in middleware
- Fix 6: Extended audit logger `requires_review` for new action types: `school_delete`, `child_delete`, `login_as`, `account_created`
- Hash migration logging: Home family login now logs `password_hash_upgraded` when SHA256→bcrypt migration occurs

### Previous Changes (Security Hardening + Cleanup, Feb 10)

**ElevenLabs Cleanup (subscription cancelled):**
- Deleted 4 scripts: `generate-elevenlabs-audio.js`, `regenerate-audio.js`, `regenerate-audio-charlotte.js`, `regenerate-all-audio-charlotte.js`
- Removed `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from `.env.local`, `.env.example`, CLAUDE.md, Railway
- Pre-generated audio files in `/public/audio-new/` remain — still used by sound games
- Reference docs in `/docs/` and `/public/audio-new/` left as historical context

**Phase 4 — Secret Rotation & Env Hardening (12 fixes across ~20 files):**
- Fix 1: Removed hardcoded ElevenLabs API key from 4 scripts → `process.env.ELEVENLABS_API_KEY`
- Fix 2: Removed hardcoded Supabase service role key from `scripts/upload-to-supabase.js`
- Fix 3: Removed hardcoded `870602` from `hooks/useLeadOperations.ts` (3 instances) → uses `password` prop
- Fix 4: Removed Story auth plaintext fallback (`USER_PASSWORDS`) — bcrypt-only now
- Fix 5: Removed insecure fallback defaults from `lib/auth-multi.ts`, `lib/montree/super-admin-security.ts`, `lib/message-encryption.ts` — all now throw if env vars missing
- Fix 6: Removed `'change-this-in-env'` fallback from 3 vault routes (upload, download, save-from-message)
- Fix 7: Moved vault password hash to `process.env.VAULT_PASSWORD_HASH`
- Fix 8: Added security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) in `next.config.ts`
- Fix 9: Created `.env.example` with all required env vars documented
- Fix 10: Updated CLAUDE.md env vars section (added 11 missing vars)
- Fix 11: Updated `.env.local` with `VAULT_PASSWORD_HASH` and `ELEVENLABS_API_KEY`
- ElevenLabs scripts deleted (subscription cancelled) — pre-generated audio files in `/public/audio-new/` still in use

**Phase 4 Post-Audit Fixes (3 issues found, all resolved):**
- Audit fix 1 (CRITICAL): `deleteSchool()` regression — API route now accepts password from header OR query param
- Audit fix 2: `MESSAGE_ENCRYPTION_KEY` was 31 chars (quotes stripped by dotenv) → set to old default `change-this-to-32-char-key-12345` for backward compat with existing encrypted messages
- Audit fix 3: `.env.example` updated — added "no quotes!" note for MESSAGE_ENCRYPTION_KEY

**Phase 4 Build Fix:**
- Railway build crashed because `lib/auth-multi.ts` and `lib/montree/super-admin-security.ts` threw at module-load time (env vars aren't available during Next.js build)
- Fix: moved env var checks into lazy getter functions (`getSecretKey()`, `getEncryptionKey()`) — checks now run at runtime, not import time
- `lib/message-encryption.ts` was already correct (used `getKey()` from the start)
- **IMPORTANT PATTERN**: Never validate `process.env.*` at the top level of a module — always inside a function

**Railway env vars set during Phase 4 deployment:**
- `VAULT_PASSWORD_HASH` ✅
- `MESSAGE_ENCRYPTION_KEY=change-this-to-32-char-key-12345` ✅
- `TEACHER_ADMIN_PASSWORD` ✅ (was missing from Railway)
- **Phase 9**: Encryption upgraded to GCM + rotation script created (`scripts/rotate-encryption-key.ts`). **✅ Key rotation DONE** (Feb 11) — 1,381 messages re-encrypted, pagination bug fixed in script, new key deployed to Railway.

**Phase 3 — Quick Security Wins (11 fixes):**
- Fix 1: `login_time` → `login_at` across 11 files (column rename)
- Fix 2: Session token stored on Story user login (`story_login_logs.session_token`)
- Fix 3: Created `app/api/story/heartbeat/route.ts` (was missing, client already called it)
- Fix 4: Rewrote online-users to dual-query `story_online_sessions` + `story_login_logs`
- Fix 5: System-controls auth upgraded from `token.length > 10` to JWT verification
- Fix 6: Hardcoded `870602` moved to `process.env.SUPER_ADMIN_PASSWORD` (13 files)
- Fix 7: Admin token TTL 30d → 7d + cookie maxAge aligned
- Fix 8: Vault refs in system-controls fixed (table→`vault_files`, bucket→`vault-secure`, column→`file_url`)
- Audit fix: Empty password bypass in Whale Class login (rewrote credential loading)
- Audit fix: Added `TEACHER_ADMIN_PASSWORD` env var
- Audit fix: `OnlineUser.lastLogin` → `lastSeen` type alignment

### Previous Changes (Session 155, Feb 8)

**Montree Home — Code-Based Auth:**
- `app/home/page.tsx` — Added name input, sends name to API
- `app/home/register/page.tsx` — Full rewrite: working code-based registration (was redirect stub)
- `app/home/login/page.tsx` — Full rewrite: 6-digit code entry with auto-advance (was email/password)
- `app/api/home/auth/try/route.ts` — Accept name, added debug error output
- `app/api/home/auth/login/route.ts` — Converted from bcrypt to SHA256 code lookup
- `app/api/home/auth/register/route.ts` — Replaced with 410 stub

**Montree Classroom — Name Collection:**
- `app/montree/try/page.tsx` — Added 'details' step (name + school name between role pick and creation)
- `app/api/montree/try/instant/route.ts` — Accept name + schoolName, use in all DB inserts + leads

**Super-Admin:**
- `components/montree/super-admin/FamiliesTab.tsx` — Shows join_code instead of email

**Previous Sessions (152, Feb 7):**
- `lib/auth.ts`: Removed hardcoded fallback secret
- Deleted dead auth route
- Teaching Tools section on curriculum page
- Language Making Guide download button (43 works, all 5 categories)

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress`
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions`, `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_child_extras` — explicitly-added extra works per child (UNIQUE child_id+work_name)
- `montree_raz_records` — RAZ reading tracker records (child_id, date, status, 3 photo URLs)
- `montree_feature_toggles`, `montree_school_features`, `montree_feature_audit_log` — feature flag system
- `montree_community_works` — public community works library (title, area, materials, photos, videos, PDFs, AI guide, moderation status, stats)
- `montree_community_backups` — daily JSON backup records (date, work_count, storage_path)
- `montree_super_admin_audit` — central security audit log (all auth events, destructive ops)
- `montree_rate_limit_logs` — DB-backed rate limiting (survives container restarts)
- `story_users`, `story_admin_users` — Story system auth (bcrypt hashes)
- `story_login_logs`, `story_admin_login_logs` — Story login tracking (column: `login_at`)

### Whale Class Data
- Classroom ID: `945c846d-fb33-4370-8a95-a29b7767af54`
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## Environment Variables (Railway + .env.local)

See `.env.example` for the full template. All vars below must be set in Railway production.

```
# --- Core Auth ---
ADMIN_SECRET=...              # REQUIRED — JWT signing for Whale Class admin (lib/auth.ts)
ADMIN_USERNAME=...            # Whale Class admin display name
ADMIN_PASSWORD=...            # Whale Class admin password
SUPER_ADMIN_PASSWORD=...      # REQUIRED — Montree super-admin + Whale Class "Tredoux" login
TEACHER_ADMIN_PASSWORD=...    # REQUIRED — Whale Class "Teacher" login
STORY_JWT_SECRET=...          # REQUIRED — Story JWT signing (lib/story-db.ts)

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...              # PostgreSQL pooler connection string

# --- Encryption ---
MESSAGE_ENCRYPTION_KEY=...    # REQUIRED — Exactly 32 chars for AES-256 (lib/message-encryption.ts)
VAULT_PASSWORD=...            # REQUIRED — Vault file encrypt/decrypt (vault routes)
VAULT_PASSWORD_HASH=...       # REQUIRED — bcrypt hash for vault unlock (vault/unlock/route.ts)

# --- External APIs ---
ANTHROPIC_API_KEY=...         # Claude API (Guru advisor)
OPENAI_API_KEY=...            # DALL-E image generation
NEXT_PUBLIC_YOUTUBE_API_KEY=... # YouTube Data API

# --- Email ---
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

---

## Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/login` | Teacher login (6-char code or email+password) |
| `/montree/dashboard` | Class list |
| `/montree/dashboard/[childId]` | Child week view (1,115 lines — needs splitting) |
| `/montree/dashboard/[childId]/progress` | Progress portfolio (hero stats, area bars, photos, timeline) |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools section |
| `/montree/dashboard/card-generator` | 3-Part Cards tool |
| `/montree/dashboard/vocabulary-flashcards` | Vocab Flashcards tool |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/raz` | RAZ Reading Tracker (status-first camera flow) |
| `/montree/dashboard/voice-observation` | Voice Observation recording + review |
| `/montree/dashboard/games/*` | 27+ educational games |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/photos` | Child's photos |
| `/montree/parent/milestones` | Progress timeline |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub |
| `/admin/card-generator` | 3-Part Cards (admin version) |
| `/admin/vocabulary-flashcards` | Vocab Flashcards (admin version) |
| `/admin/description-review` | Work description editor |
| `/montree/super-admin` | Super admin panel (1,243 lines — needs splitting) |

---

## Authentication

7 auth systems. Teacher/principal tokens now use httpOnly cookies (migrated from localStorage in tech debt Task 4).

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256 hash) or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/auth/teacher` |
| Principal login | Code or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/principal/login` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET` env var, httpOnly cookie (`admin-token`) | `lib/auth.ts` |
| Super admin | Password from env var (timing-safe compare) | `/api/montree/super-admin/login-as` |
| Story auth | Separate system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Montree auth flow:** Login routes issue JWT → set `montree-auth` httpOnly cookie → `verifySchoolRequest()` reads cookie (or Bearer header as fallback) → extracts userId, schoolId, classroomId, role. Logout via `/api/montree/auth/logout` (clears cookie). Client-side `montreeApi()` relies on cookie auto-sending (no Authorization header needed).

**Key auth files:** `lib/montree/server-auth.ts` (JWT create/verify + cookie helpers), `lib/montree/verify-request.ts` (route-level auth check), `lib/montree/api.ts` (client-side wrapper)

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton pattern with retry logic for Cloudflare timeouts.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Aliases: `createSupabaseAdmin`, `createAdminClient`, `createServerClient` (backward compat)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

### Master Data (JSON files)
5 area files in `lib/curriculum/data/`:
- `language.json` (43 works)
- `practical_life.json`
- `sensorial.json`
- `mathematics.json`
- `cultural.json`

### Teaching Guides
- `public/guides/Montessori_Language_Making_Guide.docx` — 43 works, all 5 categories
- `public/guides/Montessori-English-Materials-List.pdf` — 337 pics, 1011 cards, 115 objects
- `public/guides/Montessori-English-Materials-List.docx` — Editable version

---

## Known Technical Debt

### Cleanup Plan — ✅ ALL COMPLETE
- ~~3 Supabase client files~~ → consolidated to `lib/supabase-client.ts`
- ~~6 debug API endpoints~~ → deleted
- ~~27 duplicate game routes~~ → deduplicated
- ~~3 files over 900 lines~~ → split into components + hooks
- ~~469 console.log statements~~ → stripped (0 remaining, security console.warn preserved)
- ~~23 `: any` types~~ → fixed (2 trivial remain: settings page + test script)

### Immediate Next Steps
- **Guru knowledge update** — 3 new books to add to the Guru's knowledge base (user will provide)
- **Search bar** — Add search functionality (scope TBD)
- **Run migrations** — `migrations/126_homeschool_tables.sql` + `migrations/127_guru_freemium.sql` not yet run against Supabase

### 3D Printable Montessori Classroom
- **Location:** `whale/3d-montessori/` — full folder structure for all 5 Montessori shelves
- **Mission:** Democratize Montessori by making every material 3D-printable. Traditional materials cost $10K-$30K+, a 3D printer + filament costs ~$200.
- **Outreach vision:** Mobile printer vehicle visiting disadvantaged schools, printing materials over a few days or donating printers
- **Trilingual:** English + Afrikaans + Arabic
- **Status:** Folder structure created, concept doc as README.md. No STL files yet — user designing separately with web Claude.
- **Concept doc:** `docs/CONCEPT_3D_PRINTABLE_CLASSROOM.md`

### Deferred (Future Sessions)
- Centralized logging service
- PWA manifest not linked
- Email sending not tested
- DB only has 18/43 language works (needs reseed)
- Clean up x-school-id headers from ~11 frontend files (harmless, cookie-auth checked first)
- Clean up stale GitHub SSH keys ("Cowork VM" Feb 11)
- Delete old Mac repos: `whale-clean/`, `whale-old/`, `whale-class-mirror.git/`, `~/Desktop/whale-backup-feb15/`

### Cross-Pollination Security Fix (Feb 22, 2026) — CRITICAL

**Problem:** API routes accepting `child_id` didn't verify the child belonged to the requesting user's school. Any authenticated teacher could access ANY child's data across ALL schools.

**Fix:** Created `lib/montree/verify-child-access.ts` with `verifyChildBelongsToSchool(childId, schoolId)`. Added to 13 routes. Children API now always scopes to authenticated user's school.

**IMPORTANT PATTERN FOR ALL NEW API ROUTES:** Every route that accepts a `child_id` parameter MUST call `verifyChildBelongsToSchool()` after auth. No exceptions.

**Routes still needing the check:** `media/upload`, `reports/generate`, `reports/pdf`, `reports/send`, `weekly-planning/*`, `focus-works`

### Known Security Debt (Explicitly Deferred in Phase 9)
- Parent invite codes stored as plaintext — low priority
- CSP `script-src 'unsafe-inline'` + `style-src 'unsafe-inline'` — required by Next.js, nonce-based approach would be more secure
- `ignoreBuildErrors: true` in next.config.ts — pre-existing
- Audit table naming (`montree_super_admin_audit` logs all events, not just super-admin)

---

## Guru System (AI Teacher Advisor)

AI advisor for child development questions. Uses Anthropic API.

**Core chat — Both Teachers & Parents (Sonnet, conversational WhatsApp-style):**
- `lib/montree/guru/conversational-prompt.ts` — persona builder with `isTeacher` flag. Teachers get professional colleague persona (violet theme, direct/practical, AMI terminology). Parents get nurturing guide persona (botanical green theme, emotional mirroring).
- `lib/montree/guru/context-builder.ts` — builds child context
- `lib/montree/guru/knowledge-retrieval.ts` — Montessori knowledge
- `lib/montree/guru/prompt-builder.ts` — system prompt + homeschool addendum (legacy structured mode — no longer used)
- `app/api/montree/guru/route.ts` — main chat endpoint (`isConversational` true for both teachers and homeschool parents)
- `app/api/montree/guru/concerns/route.ts` — GET/POST concerns saved in `montree_children.settings` JSONB (parents only)
- `components/montree/guru/GuruOnboardingPicker.tsx` — concern picker (10 concerns, max 3, parents only)
- `components/montree/guru/GuruChatThread.tsx` — shared chat UI with `isTeacher` prop (history, typing indicator, voice, auto-scroll). Teachers skip concern picker, get violet theme.
- `components/montree/guru/ChatBubble.tsx` — message bubble with markdown rendering
- `components/montree/guru/ConcernPills.tsx` — concern pills display
- `guru/page.tsx` — both roles render `GuruChatThread` (structured form removed)

**Daily Coach (Haiku — homeschool parents only):**
- `app/api/montree/guru/daily-plan/route.ts` — personalized daily plan, cached per child per day
- `app/api/montree/guru/work-guide/route.ts` — step-by-step work presentation guide
- `components/montree/guru/GuruDailyBriefing.tsx` — dashboard card ("Generate Today's Plan")
- `components/montree/guru/GuruWorkGuide.tsx` — inline "How to Present This" on expanded work cards

**Text-to-Speech:**
- `app/api/montree/tts/route.ts` — OpenAI TTS (`tts-1` model, `nova` voice), returns MP3 stream, rate limited 10/min/IP

**Billing:**
- `app/api/montree/guru/status/route.ts` — access level check (unlimited/paid/free_trial)
- `app/api/montree/guru/checkout/route.ts` — Stripe checkout session
- `app/api/montree/guru/webhook/route.ts` — Stripe webhook handler

**Self-Improving Brain:**
- `lib/montree/guru/brain.ts` — Core brain system (storage, extraction, consolidation, retrieval)
- `lib/montree/guru/pattern-learner.ts` — Cross-family pattern aggregation + success rate tracking
- Brain grows after EVERY conversation (teacher + parent), consolidated by Haiku every 20 learnings
- 7 wisdom categories: developmental_wisdom, therapeutic_techniques, montessori_insights, behavioral_patterns, parent_psychology, failure_modes, breakthrough_moments

Tables: `montree_guru_interactions`, `montree_child_mental_profiles`, `montree_behavioral_observations`, `montree_child_patterns`, `montree_guru_brain`

---

## Report & Photo System

Photo selection flow:
```
Teacher Preview → Select Photos → Saved to montree_report_media junction table
Publish → send/route.ts queries junction table → Creates final report
Parent View → parent/report/[id]/route.ts queries junction table
```

Both routes query junction table first, fall back to date-range query for backwards compatibility.

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Key Handoff Docs

| Doc | What |
|-----|------|
| `docs/handoffs/HANDOFF_AUDIT_FIXES_MAR11.md` | **CURRENT** — 3-cycle audit fix loop: 8 issues fixed (rate limiting, .maybeSingle, i18n, AbortController, error logging) |
| `docs/handoffs/HANDOFF_DEPLOY_ALL_MAR10.md` | Consolidated deploy handoff: all 4 unpushed features (Smart Capture + Batch Reports + Whole-Class Guru + Classroom Overview) |
| `docs/handoffs/HANDOFF_SMART_CAPTURE_WHOLECLASS_MAR10.md` | Smart Capture rewrite (tool_use + auto-progress) + whole-class Guru fix + FeedbackButton removal |
| `docs/handoffs/HANDOFF_BATCH_REPORTS_MAR10.md` | Batch parent reports "Generate All" + 5 audit fixes + 6 audit cycles |
| `docs/handoffs/HANDOFF_ESL_GURU_GENERATORS_MAR7.md` | ESL Guru upgrade + Spy Game & Command Cards generators |
| `docs/handoffs/HANDOFF_PERFORMANCE_OPTIMIZATION_MAR5.md` | SWR cache + skeletons + image compression + audit fixes |
| `docs/handoffs/HANDOFF_RAZ_TRACKER_REDESIGN_MAR5.md` | RAZ tracker redesign (status-first camera flow) + API auth fix |
| `docs/handoffs/HANDOFF_VOICE_OBSERVATION_SYSTEM_MAR4.md` | Voice observation system (20 new files, Whisper + Haiku pipeline) |
| `docs/handoffs/HANDOFF_CURRICULUM_FIXES_MAR4.md` | Curriculum area filtering bug + WorkWheelPicker sequence fix |
| `docs/handoffs/HANDOFF_TEACHER_GURU_I18N_MAR1.md` | Teacher conversational guru + guide Chinese translation + i18n fixes |
| `docs/handoffs/HANDOFF_WOODEN_SHELF_TTS_FEB27.md` | Wooden shelf UI + OpenAI TTS voice for home parents |
| `docs/HANDOFF_GURU_CHAT_OVERHAUL_FEB26.md` | Guru WhatsApp-style chat for parents (concern picker, conversational prompts, chat thread) |
| `docs/HANDOFF_I18N_SALES_PLAYBOOK_FEB25.md` | Bilingual i18n system (140 keys EN/ZH) + Sales Playbook (28-day plan, 6 schools) |
| `docs/HANDOFF_DEPLOY_SEED_FEB21.md` | Production deploy, Dockerfile fix, seed 500 fix, push script |
| `docs/HANDOFF_COMMUNITY_LIBRARY_FEB21.md` | Community Works Library (14 files, 2-pass audit, deploy steps) |
| `docs/HANDOFF_WEEKVIEW_GUIDE_SECURITY_FEB22.md` | Week view guide + CRITICAL cross-pollination security fix |
| `docs/HANDOFF_STUDENT_FORM_GUIDE_FEB22.md` | Student form guided onboarding (13-step speech bubble tour) |
| `docs/HANDOFF_GURU_COACH_ONBOARDING_FEB21.md` | Guru Daily Coach + Onboarding Phase 3-5 wiring + folder cleanup |
| `docs/HANDOFF_HOME_AESTHETIC_FEB20.md` | Botanical theme for home parents + 3D Montessori folder setup |
| `docs/HANDOFF_LOGIN_CODE_FIX_FEB17.md` | Complete login code fix (setup routes + case-insensitive auth) |
| `docs/HANDOFF_DOCKERFILE_BUILD_FIX_FEB15.md` | Docker ARG fix for Next.js build-time env vars |
| `docs/HANDOFF_GIT_SSL_FIX_FEB15.md` | Astrill VPN root cause, clean montree repo, git workflow fix |
| `docs/HANDOFF_DEPLOY_MONTREE_HOME_FEB15.md` | Montree Home deploy: repo cleanup, REST API push, LibreSSL fix |
| `docs/HANDOFF_MONTREE_HOME_PHASE4.md` | Montree Home Phase 4: Curriculum browser (all 4 phases complete) |
| `docs/HANDOFF_FEEDBACKBUTTON_FIX_FEB14.md` | FeedbackButton mobile fix (4 attempts, close-reopen pattern) |
| `docs/HANDOFF_LINKEDIN_SESSION_FEB14.md` | LinkedIn profile, videos, connections, git push (now resolved via API) |
| `docs/HANDOFF_SOCIAL_MEDIA_MANAGER.md` | Social Media Manager tool (AI Guru, knowledge base, 6 pages) |
| `docs/HANDOFF_THREE_ISSUE_FIX.md` | Extras leak fix, auto-mastery, area icon uniformity |
| `docs/HANDOFF_PROGRESS_DASHBOARD.md` | Progress portfolio, position picker, bug fixes |
| `docs/HANDOFF_POST_PHASE9_AUDIT.md` | Post-Phase 9 audit, CSP fix, frontend fixes, DB migration |
| `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md` | Security Phase 9 complete (FINAL), production security review |
| `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md` | Security Phase 8 complete, logging & monitoring |
| `docs/HANDOFF_SECURITY_PHASE7_COMPLETE.md` | Security Phase 7 complete, session management improvements |
| `docs/HANDOFF_SECURITY_PHASE6_COMPLETE.md` | Security Phase 6 complete, input sanitisation & CSP |
| `docs/HANDOFF_SECURITY_PHASE4_COMPLETE.md` | Security Phase 4 complete, all fixes listed |
| `.claude/plans/phase9-plan-v1.md` | Phase 9 execution plan (final production review) |
| `.claude/plans/phase8-plan-v2.md` | Phase 8 execution plan (2 rounds of audit refinement) |
| `.claude/plans/phase7-plan-v3.md` | Phase 7 execution plan (3 rounds of audit refinement) |
| `.claude/plans/phase4-plan-v3.md` | Phase 4 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SECURITY_PHASE3_COMPLETE.md` | Security Phase 3 complete, all fixes listed |
| `.claude/plans/phase3-plan-v3.md` | Phase 3 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md` | Codebase cleanup plan (5 remaining phases) |
| `docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md` | Language guide + API download route |

