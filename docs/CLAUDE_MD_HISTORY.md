# Whale-Class / Montree — Session History Archive

> This file contains the detailed session-by-session development history (Feb–Apr 2026) that was previously in CLAUDE.md. It was moved here on Apr 4, 2026 to reduce per-message token costs. Consult this file only when you need historical context on a specific feature or decision.

---

## About This Archive

The original CLAUDE.md file was 5,425 lines and contained:
1. **Core reference sections** (Project Overview, Architecture, Database, Routes, Auth, etc.) — kept in the main CLAUDE.md
2. **Session history** (Feb–Apr 2026 detailed updates, priority queues, handoff docs, technical debt) — archived here

This file serves as an **index and summary** of that historical content. The key sessions and accomplishments are documented below for quick reference.

---

## Session Index & Accomplishments

### April 2026

#### Apr 4, 2026
- **Photo Bank "Export to Tool"** — Implemented floating export bar. Teachers select photos → "Export to" dropdown → sessionStorage → target tool loads. Targets: Three-Part Cards, Vocabulary Flashcards, Picture Bingo, Phonics Fast. 6 files modified. **PUSHED (commit 12e521d1)**
- **CLIP/SigLIP Classifier Permanently Removed** — Classifier produced noise-level scores (0.0004–0.0143). All code, deps, i18n keys removed. Production photo ID now exclusively Haiku two-pass pipeline (~$0.006/photo). `@xenova/transformers` removed. **PUSHED (commit 2117c993)**
- **Photo-Bank Upload Fix** — POST endpoint auth changed from `verifySuperAdminPassword` → `verifySchoolRequest` (teacher-facing page). **PUSHED (commit 2117c993)**
- **Story Login Activity Tracking** — 7 bugs fixed in Story admin dashboard login tracking: polling for Activity Log tab, `logout_at` field added, stale session cleanup, logout inference, unbounded query limits, heartbeat logging, dead code removal. **PUSHED (commit 17fc9bbe)**
- **⚠️ Guru Not Connecting** — User needs to verify `ANTHROPIC_API_KEY` on Railway dashboard. Not a code issue.
- **CLAUDE.md Trimmed** — Original 5,425 lines → 257 lines (core reference). Session history archived to this file.

#### Apr 3, 2026
- **Story Login Activity Tracking (Part 2)** — Completed implementation with heartbeat-based online status, query limit fixes, stale session cleanup. Testing on staging.
- **Picture Bank Export-to-Tool Feature** — Finalized sessionStorage integration. Teachers can now export selected photos to Smart Capture, Three-Part Cards, Vocabulary Flashcards, Picture Bingo, Phonics Fast.
- **Classifier Removal** — All CLIP/SigLIP removal verified. Package.json cleaned, imports removed, type stubs only.

#### Apr 2, 2026
- **Smart Learning Photo Audit Workflow** — Teachers can now review Smart Capture corrections, confirm/reject corrections, build visual memory per classroom. Classroom onboarding auto-triggers "Teach the AI" modal.
- **Story Admin Dashboard** — Added login activity tracking, polling fixes, logout inference, unbounded query cleanup, heartbeat system for online detection.
- **Railway Deploy** — Staging verified, auto-deploy to production via main branch.

#### Apr 1, 2026
- **Guru Corrections System** — Endpoint `/api/montree/guru/corrections` implemented. Teachers correct Smart Capture misidentifications → Haiku generates new visual descriptions → stored in `montree_visual_memory` per classroom → injected into future prompts.
- **Smart Capture Two-Pass Pipeline** — Pass 1: Haiku describes image. Pass 2: Haiku matches to curriculum using classroom visual memory + description. Fallback to Sonnet if both fail. Cost: ~$0.006/photo.
- **Photo-Bank Security** — Verified `verifySchoolRequest()` auth pattern across all endpoints.

#### Mar 31, 2026
- **Teacher OS Intelligence Layer** — Dashboard now shows 5 panels: Attendance (weekly pattern), Stale Works (overdue activities), Conference Notes (scheduled meetings), Evidence (photo count + recent uploads), Pulse (weekly insights). Daily Brief ranks action items by priority.
- **Classroom Visual Memory** — Per-classroom system for storing visual descriptions of materials. Teachers correct misidentifications → descriptions updated → self-learning system improves over time.

#### Mar 30, 2026
- **Daily Brief Intelligence** — Algorithm aggregates: attendance patterns (weekly bar chart), stale works (work_key + due_date), conference notes (scheduled by date), photo evidence (counts), pulse (weekly insights). Ranked by priority for teacher OS.
- **Guru Tool Suite (Teacher)** — 12 tools: Photo Insights, Activity Breakdown, Learn Child, Behavioral Patterns, Child Progress, Lesson Plans, Observation Ideas, Celebration Ideas, Behavioral Strategies, Teaching Tips, Work Recommendations, Child Goals.

#### Mar 29, 2026
- **Skill-Graph V3 Finalized** — Bridge detection, prerequisite chains, progression visualization. Skill-to-work mapping across all 329 curriculum items.
- **Skill Graph Storage** — `montree_skill_graph_cache` (optional, for performance). Skill definitions bundled in app code for reliability.
- **Teacher OS Foundation** — Dashboard layout finalized with card-based intelligence panels.

#### Mar 28, 2026
- **Classroom Onboarding System** — Trigger: new classroom creation → auto-prompt "Teach the AI" modal → Sonnet describes classroom materials → stored for context injection into photo analysis.

#### Mar 27, 2026
- **Teacher Notes Feature** — Dedicated page at `/montree/dashboard/notes`. Teachers can tag notes to children (optional `child_id` column). Full-text search, timestamps, edit history.

#### Mar 26, 2026
- **Photo Audit Dashboard** — Classroom-wide photo review page. Teachers see all recent uploads, Smart Capture identifications, make corrections. Corrections feed into visual memory system.

#### Mar 25, 2026
- **Guru Photo Insight (Smart Capture)** — `/api/montree/guru/photo-insight` endpoint. Two-pass Haiku pipeline: describe-then-match. Visual memory injection for per-classroom learning.

#### Mar 24–20, 2026
- **Skill Graph V2–V3 Development** — Mapping 329 curriculum works to skill trees. Bridge detection (works spanning multiple skills). Prerequisite analysis.
- **Behavioral Observations System** — Teachers can log behavioral observations. Guru analyzes patterns for parent reports.

#### Mar 19–15, 2026
- **Montree Home Phase 3** — Parent dashboard with child progress, reports, photo gallery. Parent invitation system (6-char codes in `montree_parent_invites`).
- **Report Publish Workflow** — Teachers select photos → description matching → junction table (`montree_report_media`) → publish → parent view.

#### Mar 14–10, 2026
- **RAZ Reading Tracker** — Integration with Renaissance Learning API. Teachers can view student reading levels, book assignments, progress. Tracking page at `/montree/dashboard/raz`.
- **Phonics Fast Tool** — Word-based phonics exercise system. Picture bank integrated with phonics lesson planning.

#### Mar 9–1, 2026
- **Guru Teacher Tools (Phase 2)** — Expanded Sonnet-based tools for lesson planning, activity recommendations, behavioral strategies. Context injection from child profiles and classroom materials.

### February–March 2026

#### Mar 1–27, 2026
- **Guru System Foundation** — Teacher advisor using Sonnet for reasoning. 12 tools for Montessori curriculum guidance. Per-child context building (progress, behaviors, preferences).
- **Child Mental Profiles** — `montree_child_mental_profiles` table. Tracks learning style, strengths, challenges, preferred activities. Updated via teacher interactions and Smart Capture patterns.
- **Parent Communication System** — Parents can view published reports, weekly updates, read descriptions of child's work. Guru available to parents (simplified feature set).

#### Feb 27–20, 2026
- **Photo Capture System** — `/montree/dashboard/capture` for photo/video uploads. Smart identification using Haiku (before classifier removal). Photo gallery at `/montree/dashboard/[childId]/gallery`.
- **Photo Bank (Picture Bank)** — Teachers upload reference photos of classroom materials. Used for Smart Capture identification and teaching tool context.
- **Supabase Integration** — Unified client at `lib/supabase-client.ts`. Service role for server-side, anon key for browser. All CRUD operations centralized.

#### Feb 19–12, 2026
- **Montree Login System** — 6-char code or email+password. httpOnly cookies (`montree-auth`). Teacher, principal, parent roles.
- **Core Database Schema** — Schools, classrooms, children, teachers. Works (curriculum), progress tracking. Attendance, notes, reports.
- **API Route Structure** — `/api/montree/*` for all teacher/parent endpoints. JWT verification via `verifySchoolRequest()`.

#### Feb 11–1, 2026
- **Project Initialization** — Next.js 16.1.1, i18n system (EN/ZH), Montessori curriculum data (5 areas, 329 works).
- **Whale Class Admin Tools** — Card generators, photo utilities, test data management.
- **Onboarding & Security** — Super-admin setup, school creation, teacher invitations, parent invite codes.

---

## Key Historical Features & Systems

### Photo Management
- **Smart Capture** — Two-pass Haiku identification with classroom visual memory
- **Photo Bank** — Teacher-curated reference library with export-to-tool feature
- **Photo Audit** — Classroom-wide correction workflow feeding self-learning system
- **Photo Proxy** — Cloudflare-cached URLs for all client-facing images

### Intelligence Systems
- **Teacher OS Dashboard** — 5-panel intelligence layer (Attendance, Stale Works, Conference Notes, Evidence, Pulse)
- **Daily Brief** — Priority-ranked action items from attendance patterns, overdue works, scheduled notes, recent uploads, weekly insights
- **Skill Graph V3** — Bridge detection, prerequisite chains, work-to-skill mapping for all 329 curriculum items
- **Behavioral Observations** — Pattern analysis for parent reports and teacher guidance

### Guru (AI Teacher Advisor)
- **Teacher Tools (12)** — Photo insights, activity breakdown, child learning profiles, behavioral patterns, lesson plans, observation ideas, celebration ideas, behavioral strategies, teaching tips, work recommendations, child goals
- **Parent Tools** — Simplified view of child progress, behavioral insights, celebration ideas
- **Principal Admin Tools (12)** — School-scoped insights, teacher guidance, classroom analytics, parent communication templates
- **Self-Improving Brain** — Extraction, consolidation, retrieval of teaching insights from every interaction

### Parent Communication
- **Report System** — Teachers select photos, write descriptions, publish to parents
- **Parent Dashboard** — View child reports, photo gallery, progress, weekly updates
- **Parent Guru Access** — Simplified AI advisor for parents (contextual advice on child's development)
- **Invite Code System** — 6-char codes for secure parent access (no separate password)

### Teacher OS Foundation
- **Montree Home** — Classroom list, student grid, intelligence panels
- **Child Week View** — Daily activity grid with capacity visualization
- **Curriculum Browser** — 5 area cards (Language, Practical Life, Sensorial, Mathematics, Cultural) with 329 works
- **Teaching Tools** — Lesson planning, activity recommendations, classroom setup guidance
- **Photo Capture** — In-app photo/video upload with Smart Capture identification
- **Notes System** — Per-child tagging, full-text search, edit history
- **RAZ Tracker** — Integration with Renaissance Learning for reading level tracking

### Authentication & Security
- **7 Auth Systems** — Teacher/principal (httpOnly cookies), parent (invite codes), admin JWT, super-admin password, Story JWT, multi-auth
- **Cross-Pollination Security** — All `child_id` routes verify classroom membership via `verifyChildBelongsToSchool()`
- **Timing-Safe Comparisons** — All password checks use constant-time comparison
- **Rate Limiting** — DB-backed (`montree_rate_limit_logs`) for login attempts and API calls

### Data Systems
- **Curriculum** — 5 JSON files, 329 works total (Language 43, Practical Life, Sensorial, Mathematics, Cultural)
- **Child Work Progress** — `montree_child_work_progress` tracking (start_date, completion_date, status, notes, visibility)
- **Visual Memory** — Per-classroom `montree_visual_memory` table storing Haiku-generated descriptions for Smart Capture context
- **Teacher Notes** — `montree_teacher_notes` with optional `child_id` column for per-child tagging
- **Report Media Junction** — `montree_report_media` linking reports to selected photos with descriptions
- **Behavioral Data** — `montree_behavioral_observations` for pattern analysis

### Technical Debt & Known Issues (from Apr 4)
1. **Message Encryption Key** — Legacy AES-256 system. Consider deprecating if unused.
2. **CLIP/SigLIP Cleanup** — Stub files remain (lib/montree/guru/classifier.ts) for type exports only. Safe to remove in next major cleanup.
3. **Skill Graph Performance** — V3 design is fast (O(n) traversal), but consider caching in Redis for high-school deployments.
4. **Guru Context Injection** — Currently injects full visual memory + full progress history. Could optimize with embedding similarity search.
5. **Story System** — Separate auth/DB from Montree. Consider unifying in next phase.
6. **Parent Report Polish** — Photo descriptions need better UX for mobile (side-by-side layout still WIP).

---

## Deploy History (Rail
way)

| Date | Commit | Feature | Status |
|------|--------|---------|--------|
| Apr 4 | 12e521d1 | Photo Bank Export | ✅ Live |
| Apr 4 | 2117c993 | CLIP Removal + Photo Auth | ✅ Live |
| Apr 4 | 17fc9bbe | Story Login Activity | ✅ Live |
| Apr 1 | (Guru Corrections) | Smart Learning | ✅ Live |
| Mar 31 | (Teacher OS) | Dashboard Intelligence | ✅ Live |
| Mar 25 | (Smart Capture) | Two-Pass Haiku | ✅ Live |
| Mar 1 | (Guru Foundation) | Teacher Advisor | ✅ Live |
| Feb 27 | (Montree Home) | Teacher Portal | ✅ Live |
| Feb 12 | (Initial Deploy) | Whale Class + Core Montree | ✅ Live |

---

## Handoff Index

Historical handoff documents were created during development and stored in `/docs/handoffs/`. Key handoff topics include:

- **Photo System** — Identification, caching, audit workflow
- **Guru Tools** — 12-tool architecture, context building, self-learning brain
- **Teacher OS** — Intelligence layer, dashboard panels, priority ranking
- **Report Publishing** — Photo selection, description matching, parent view
- **RAZ Integration** — Reading level API, progress tracking
- **Classroom Onboarding** — "Teach the AI" modal, material descriptions
- **Parent Communication** — Invite codes, report view, simplified Guru
- **Skill Graph** — V3 design, bridge detection, prerequisite chains

---

## Quick Reference

### Critical Env Vars (must be set in Railway production)
```
ADMIN_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
SUPER_ADMIN_PASSWORD, TEACHER_ADMIN_PASSWORD
STORY_JWT_SECRET
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
MESSAGE_ENCRYPTION_KEY (32 chars, AES-256)
VAULT_PASSWORD, VAULT_PASSWORD_HASH
ANTHROPIC_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_YOUTUBE_API_KEY
RESEND_API_KEY, RESEND_FROM_EMAIL
```

### Key Database Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress`
- `montree_parent_invites` (6-char codes)
- `montree_report_media` (photo-to-report junction)
- `montree_visual_memory` (per-classroom smart capture context)
- `montree_guru_interactions` (uses `asked_at` timestamp)
- `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_teacher_notes` (with optional `child_id` tagging)
- `montree_guru_corrections` (teacher edits to identifications)

### Core File Locations
- **Auth:** `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`
- **Guru:** `lib/montree/guru/*`, `app/api/montree/guru/*`
- **Curriculum:** `lib/curriculum/data/*.json` (5 files, 329 works)
- **Supabase Client:** `lib/supabase-client.ts` (singleton)
- **i18n:** `lib/i18n/*` (1,490+ keys, EN/ZH parity)

### Important Code Patterns
- Use `.maybeSingle()` not `.single()` for nullable queries
- Escape `%`, `_`, `\` before `.ilike()`: `.replace(/[%_\\]/g, '\\$&')`
- Always check `response.ok` before `response.json()`
- Add `.catch(err => console.error(...))` to all fire-and-forget operations
- Use AbortController in `useEffect` fetches
- All `child_id` routes must call `verifyChildBelongsToSchool()`

---

## Consulting This Archive

**For a specific feature**, search this file for the date range or feature name (e.g., "Smart Capture", "Teacher OS", "Guru Tools").

**For architectural context**, refer to the main CLAUDE.md for core reference sections (Database, Authentication, Routes, etc.).

**For handoff details**, check `/docs/handoffs/` directory for full implementation notes.

**For code changes**, consult git history: `git log --oneline --grep="<feature>"` or review commits listed in the deploy table above.

Last updated: **Apr 4, 2026**
