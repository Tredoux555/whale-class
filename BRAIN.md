# Montree Brain

> Say "read the brain" at session start. Say "update brain" at session end.

## Current State (Feb 7, 2026)

**App**: Montree - Montessori classroom management
**Stack**: Next.js 16, React 19, TypeScript, Supabase, Tailwind
**Deployed**: Railway at teacherpotato.xyz
**Status**: 🚀 LAUNCH READY — Codebase cleanup complete (health 5.5 → ~9.1/10). Next: Montree Home clone.

## Recent Changes

### Session 154 - Feb 7, 2026 (CLEANUP FINAL PUSH — 8.5+ TARGET HIT)

**Handoff:** `HANDOFF.md`

**Health Score: 7.7 → ~9.1/10** — exceeded the 8.5 target. All pushed to GitHub.

1. **Type safety blitz** — Fixed 135 `:any` annotations across 95 files. Proper `unknown` for catch blocks, `Record<string, unknown>` for dynamic objects, domain interfaces where possible. Only 27 remaining (all legitimate casts).
2. **File splits (round 1)** — Story admin dashboard (1,437→279 lines, 20 files) and demo tutorial (1,132→239 lines, 10 files).
3. **Dead code purge** — Deleted 44 orphaned components (-10,189 lines). Assessment test games, old dashboard components, unused reports, tree visualizations, etc. Also deleted orphaned `/admin/montree-progress` page.
4. **Import cleanup** — Fixed 5 stale imports (lib/db/children.ts, lib/db/progress.ts, video-watches, activity-selection, auth-context). 100% Supabase consolidation achieved.
5. **Broken link fix** — `/admin/progress` linked to deleted page, redirected to active route.
6. **File splits (round 2)** — Split last 4 oversized files:
   - CardGenerator: 1,760 → 948 (print-utils.ts, CropOverlay.tsx, CardPreview.tsx extracted)
   - Onboarding: 982 → 582 (CurriculumPicker.tsx, AgePicker.tsx extracted)
   - english-procurement: 1,083 → 702 (SequenceView.tsx extracted)
   - montree-home: 1,032 → 900 (types.ts + constants.ts extracted)

**Files Created (key new files):**

| File | What |
|------|------|
| `app/story/admin/dashboard/hooks/` | 8 custom hooks extracted from dashboard |
| `app/story/admin/dashboard/components/` | 9 UI components extracted from dashboard |
| `app/story/admin/dashboard/types.ts` | Shared interfaces for story dashboard |
| `app/story/admin/dashboard/utils.ts` | Formatting helpers |
| `app/montree/demo/tutorial/components/` | 7 components extracted from tutorial |
| `app/montree/demo/tutorial/data.ts` | Tutorial configuration data |
| `app/montree/demo/tutorial/types.ts` | Tutorial interfaces |
| `components/card-generator/print-utils.ts` | Print HTML generation (484 lines) |
| `components/card-generator/CropOverlay.tsx` | Crop modal component (167 lines) |
| `components/card-generator/CardPreview.tsx` | Card preview component (251 lines) |
| `app/montree/onboarding/components/` | CurriculumPicker + AgePicker extracted |
| `app/montree/onboarding/types.ts` | Onboarding interfaces |
| `app/admin/montree-home/types.ts` | Family, HomeChild, HomeCurriculumWork types |
| `app/admin/montree-home/constants.ts` | AREA_CONFIG, STATUS_CONFIG, TABS |
| `app/admin/english-procurement/components/SequenceView.tsx` | Sequence view (435 lines) |

**Commits (8 total, all pushed):**
```
80083d0 docs: update BRAIN.md with final file splits
e59bc65 refactor: split 4 remaining large files under 1,000 lines
bcc11b3 docs: update BRAIN.md and HANDOFF.md for session 154
6fd3149 fix: update broken link to deleted /admin/montree-progress page
f444f68 fix: repair last 2 stale supabase imports (100% consolidation)
cd14a03 chore: remove 44 orphaned components and 1 dead admin page (-10,189 lines)
f9f4ada refactor: split story dashboard (1437→279) and tutorial (1132→239)
d7cd388 fix: replace all :any annotations with proper types across 95 files
```

---

### Sessions 152-153 - Feb 7, 2026 (CODEBASE CLEANUP — TWO SESSIONS)

**Handoff:** `docs/HANDOFF_SESSION_153_CLEANUP_COMPLETE.md`

**Health Score: 5.5 → 7.4 → 7.7/10** across two cleanup sessions.

**Session 152 — Phases 2-6 of cleanup plan:**
1. **Supabase consolidation** — 3 separate client files merged into single `lib/supabase-client.ts` (singleton + retry logic). ~110 files updated.
2. **Dead code removal** — Deleted 6 debug API routes, 1 backup file, 27 duplicate game routes under `/montree/games/`
3. **File splitting** — 3 oversized pages decomposed:
   - Curriculum page: 919 → 278 lines (5 extracted components/hooks)
   - Child detail page: 1116 → 564 lines (5 extracted components/hooks)
   - Super-admin page: 1243 → 389 lines (7 extracted components/hooks)
4. **Console.log cleanup** — Stripped 379 console.log statements from 48 app files. Kept console.warn/error.
5. **Type safety** — Fixed 23 targeted `:any` annotations with proper interfaces (MergedWork, ReportWork, Session, etc.)

**Session 153 — Push toward 8.5:**
1. **More dead code** — Deleted 25 duplicate game routes at `/app/games/` (-10,309 lines), debug endpoints, backup dir
2. **english-procurement split** — 5,986 → 1,083 lines (4,631 lines of data extracted)
3. **Card-generator consolidation** — Two near-identical 1,750-line files → shared component + thin wrappers
4. **english-guide split** — 2,129 → 858 lines (data extracted)
5. **Component organization** — 6 numbered game components moved to `components/games/`
6. **Type safety** — Fixed 120+ `:any` annotations across 48 files (249 → ~142 remaining)
7. **API health** — Added try-catch to last 4 routes (100% coverage, 185/185)

**Key architectural change:** Single Supabase client at `lib/supabase-client.ts`. All API routes import from here. Pattern: `getSupabase()` for server-side (service role), `createSupabaseClient()` for browser (anon key).

**Files Created (key new files):**

| File | What |
|------|------|
| `lib/supabase-client.ts` | Consolidated Supabase client (singleton + retry) |
| `components/montree/curriculum/types.ts` | Work, MergedWork, AreaConfig types |
| `components/montree/curriculum/EditWorkModal.tsx` | Extracted from curriculum page |
| `components/montree/curriculum/CurriculumWorkList.tsx` | Extracted from curriculum page |
| `hooks/useCurriculumDragDrop.ts` | Drag-drop + auto-scroll hook |
| `hooks/useWorkOperations.ts` | Child work status operations |
| `hooks/useAdminData.ts` | Super-admin data fetching |
| `hooks/useLeadOperations.ts` | Lead management operations |
| `lib/montree/work-matching.ts` | Fuzzy matching for curriculum works |
| `components/card-generator/CardGenerator.tsx` | Shared card generator component |
| `app/admin/english-procurement/data.ts` | 4,631 lines of curriculum data |
| `app/admin/english-guide/data.ts` | 1,273 lines of teaching guide data |

**Commits (13 total across both sessions):**
```
db80046 fix: add try-catch to remaining 4 API routes
347e778 types: fix 120+ :any annotations across 48 files
3f1898f cleanup: move numbered game components to components/games/
7330a76 refactor: split english-procurement page (5,986 → 1,083 lines)
1d18897 refactor: consolidate card-generators and extract english-guide data
3058bb6 cleanup: delete 25 duplicate game routes, debug endpoints, and artifacts
6f84c33 fix: correct broken relative import in lib/data.ts
b6630f9 fix: resolve fetchCurriculum reference-before-initialization
973925a types: replace :any annotations with proper interfaces
4032ec3 cleanup: strip 379 console.log statements from 42 app/lib/component files
40dd46b refactor: split 3 oversized pages into focused components and hooks
90408ab cleanup: remove debug routes, backup file, and deduplicate 27 game routes
203fd9e refactor: consolidate 3 Supabase clients into single lib/supabase-client.ts
```

**All pushed to GitHub.** Next project: Montree Home (parent-facing home program).

---

### Session 151 - Feb 7, 2026 (LANGUAGE MAKING GUIDE — DOCX + API DOWNLOAD ROUTE)

**Handoff:** `/docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md`

**📄 MONTESSORI LANGUAGE MAKING GUIDE:**
Created comprehensive 25KB docx covering all 43 Language works. Includes:
- Exact word/object lists (70+ CVC words, 30+ blend words, 8+ classified card categories with specific items)
- AMS presentation instructions with Three-Period Lesson format
- Making instructions (print specs, laminate sizes, color coding)
- Master shopping list with budget estimate ($1,075–$1,650)

Saved to project root AND `public/guides/`.

**🔗 API DOWNLOAD ROUTE (NEW):**
Static `/guides/*.docx` path was broken — Next.js/Turbopack routes it through the app (serves HTML instead of docx). Created `app/api/guides/language-making-guide/route.ts` that reads the file from disk and serves with correct `Content-Type` + `Content-Disposition` headers. Updated curriculum page download button to use `/api/guides/language-making-guide`.

**Files Changed (4 files):**

| File | Change |
|------|--------|
| `Montessori_Language_Making_Guide.docx` | **REGENERATED** — Valid docx, all 43 works |
| `public/guides/Montessori_Language_Making_Guide.docx` | **REGENERATED** — Copy of above |
| `app/api/guides/language-making-guide/route.ts` | **NEW** — API route serving docx download |
| `app/montree/dashboard/curriculum/page.tsx` | Updated download button to API route |

**⚠️ PENDING:** `git push` needed. Language curriculum reseed still needed (DB has 18 of 43 works). Montree Home program discussed but not started.

---

### Session 150 - Feb 6, 2026 (UX POLISH — BUILD FIX, GLOBAL INBOX, INSTANT CAPTURE, PHOTO DOWNLOADS, MOBILE AUDIT)

**Handoff:** `/docs/HANDOFF_SESSION_150_UX_POLISH.md`

**6 commits:** `68fc6f5` → `8a6e085`

**🔧 RAILWAY BUILD FIX:**
Two super-admin API routes (`npo-outreach`, `impact-fund`) had module-level `createClient()` calls that crash during Next.js page data collection. Changed to lazy `getSupabase()` import.

**✉️ GLOBAL MESSAGES BUTTON:**
Created `InboxFloat.tsx` (session-aware floating wrapper) and added to `app/montree/layout.tsx`. Teachers can now contact admin from ANY page. Removed duplicate from dashboard header.

**⚡ INSTANT PHOTO CAPTURE:**
Changed `capture/page.tsx` to navigate back immediately after capture. Upload continues in background via fire-and-forget `fetch()` promise (survives `router.push()` navigation). Toast notifications for success/error.

**📥 PHOTO DOWNLOAD FOR PARENTS:**
Added `downloadPhoto()` using blob fetch + programmatic `<a download>` click to report page and photos gallery. Fallback to `window.open()` for mobile.

**📱 MOBILE FIXES:**
- FeedbackButton html2canvas: lower scale (0.4), explicit viewport, `foreignObjectRendering: false`, skip `<video>`
- Download buttons: `opacity-0 group-hover:opacity-100` → `opacity-70 md:opacity-0 md:group-hover:opacity-100` (visible on touch devices)

**🔍 AUDIT PASSED:** All changes verified clean. One minor note: `leads/route.ts` still uses local `getSupabase()` instead of shared client.

**Files Changed (12 files):**

| File | Change |
|------|--------|
| `app/api/montree/super-admin/impact-fund/route.ts` | Lazy Supabase init |
| `app/api/montree/super-admin/npo-outreach/route.ts` | Lazy Supabase init |
| `app/api/montree/leads/route.ts` | Enhanced error logging |
| `app/montree/layout.tsx` | Added `<InboxFloat />` |
| `app/montree/dashboard/page.tsx` | Removed InboxButton from header |
| `app/montree/dashboard/capture/page.tsx` | Background upload + instant navigation |
| `app/montree/parent/report/[reportId]/page.tsx` | Photo download + mobile visibility fix |
| `app/montree/parent/photos/page.tsx` | "Save Photo" button in modal |
| `components/montree/InboxButton.tsx` | Added `floating` prop |
| `components/montree/InboxFloat.tsx` | **NEW** — Session-aware floating wrapper |
| `components/montree/FeedbackButton.tsx` | Mobile screenshot fixes |
| `app/montree/super-admin/page.tsx` | Enhanced fetchLeads error logging |

**⚠️ PENDING:** `git push` needed to deploy. Also reseed Language curriculum via `/api/montree/admin/reseed-curriculum` (DB only has 18 of 43 language works).

---

### Session 149 - Feb 6, 2026 (CURRICULUM PIPELINE FIX + REPORT DESCRIPTIONS + RETRY LOGIC)

**Handoff:** `/docs/HANDOFF_SESSION_149_CURRICULUM_PIPELINE.md`

**🔍 DEEP AUDIT: Curriculum-to-Report Pipeline**

Found that 3 of 4 seeding routes were dropping `parent_description` and `why_it_matters`, causing report previews to show generic/wrong descriptions.

| Route | Source | Had Descriptions? | Fix |
|-------|--------|-------------------|-----|
| `principal/setup-stream` | Brain + static | ✅ Already correct | — |
| `principal/setup` | curriculum-loader | ❌ DROPPED them | Added 4 fields |
| `admin/reseed-curriculum` | curriculum-loader | ❌ DROPPED them | Added 4 fields |
| `curriculum/route.ts` seed | montessori_works DB | ⚠️ Partial | Switched to `loadAllCurriculumWorks()` |

**🛡️ REPORT PREVIEW SAFETY NET:**

`reports/preview/route.ts` now loads descriptions from `loadAllCurriculumWorks()` as fallback when DB has NULL descriptions. Priority: DB → Static curriculum → Area-based generic (last resort).

**🔄 SUPABASE RETRY LOGIC:**

`lib/montree/supabase.ts` now includes `fetchWithRetry`:
- Retries on `UND_ERR_CONNECT_TIMEOUT` errors (up to 2 retries, 1s/2s exponential backoff)
- Applied via `global.fetch` option on the shared Supabase client

**8 routes migrated to shared client (with retry):**
1. `auth/teacher/route.ts`
2. `principal/login/route.ts`
3. `principal/setup/route.ts`
4. `try/instant/route.ts`
5. `curriculum/route.ts`
6. `children/bulk/route.ts`
7. `dm/route.ts`
8. `reports/preview/route.ts`

⚠️ **64 other API routes still use inline `getSupabase()` without retry.**

**🎓 TRIAL ROUTE AUTO-SEEDS CURRICULUM:**

`try/instant/route.ts` now seeds full 268-work curriculum (with descriptions) when creating a trial classroom. Non-blocking: if seeding fails, trial account still created.

**📦 BULK IMPORT RESILIENCE:**

`children/bulk/route.ts`:
- Curriculum fetch is now non-fatal (students still created if it fails)
- Error handling: validation → 400, server → 500
- Fixed `[object Object]` error stringification
- Progress records use `.upsert()` with `onConflict: 'child_id,work_name'`

**Other Fixes:**
- Fixed "220 works" → "268 works" in curriculum import confirm dialog
- Colored circle badges (P, S, M, L, C) on CurriculumPicker
- Custom work feature added to CurriculumPicker
- Progress `.insert()` → `.upsert()` in `children/route.ts`

**Files Changed (15 files, +1029 -320 lines):**

| File | Change |
|------|--------|
| `lib/montree/supabase.ts` | Added `fetchWithRetry` with exponential backoff |
| `app/api/montree/principal/setup/route.ts` | Added 4 description fields + shared client |
| `app/api/montree/admin/reseed-curriculum/route.ts` | Added 4 description fields |
| `app/api/montree/curriculum/route.ts` | Switched to `loadAllCurriculumWorks()` + shared client |
| `app/api/montree/admin/backfill-guides/route.ts` | Removed quick_guide filter, added work_key match |
| `app/api/montree/reports/preview/route.ts` | Static curriculum fallback + shared client |
| `app/api/montree/try/instant/route.ts` | Auto-seed curriculum + shared client |
| `app/api/montree/children/bulk/route.ts` | Non-fatal curriculum fetch, better errors |
| `app/api/montree/children/route.ts` | Progress upsert |
| `app/api/montree/auth/teacher/route.ts` | Shared client |
| `app/api/montree/principal/login/route.ts` | Shared client |
| `app/api/montree/teacher/register/route.ts` | Shared client |
| `app/api/montree/dm/route.ts` | Shared client |
| `app/montree/dashboard/curriculum/page.tsx` | 268 works count |
| `app/montree/dashboard/students/page.tsx` | Colored badges + custom work |

**Git:** Committed locally as `4593c21`. Needs manual push.

---

### Session 148 - Feb 6, 2026 (INSTANT TRIAL FIX + DM NOTIFICATIONS + BULLETPROOFING)

**🔥 INSTANT TRIAL 500 ERROR FIXED (after 4 attempts!):**

The `/api/montree/try/instant` endpoint was returning 500 errors. After adding diagnostic output, the actual error was:
```
null value in column "owner_email" of relation "montree_schools" violates not-null constraint (code 23502)
```

**Key Lesson:** The deployed Supabase DB has ALL columns from ALL migrations (028→067→070→080→098→115). Previous "fix" attempts were wrong because they removed columns thinking they didn't exist.

**Fix:** Restored `owner_email` and all other columns to the school insert:
```typescript
owner_email: `trial-${code.toLowerCase()}@montree.app`,
owner_name: role === 'principal' ? 'Principal' : 'Teacher',
subscription_status: 'trialing',
plan_type: role === 'principal' ? 'school' : 'personal_classroom',
subscription_tier: 'trial',
is_active: true,
trial_ends_at: trialEndsAt.toISOString(),
max_students: 30,
```

**🎓 STUDENT CREATION FIXES:**

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Slow student add ("loooong time") | Individual `await supabase.insert()` in a nested loop | Single batch `.insert(progressRecords)` |
| Prerequisites marked "presented" | All works got `status: 'presented'` | Prior works → `mastered` with `mastered_at`, only selected work → `presented` |
| Old emoji icons in Add Student | CURRICULUM_AREAS had emojis (🧹👁️🔢📚🌍) | Changed to letters (P, S, M, L, C) |

**Files changed:** `/api/montree/children/route.ts`, `/api/montree/onboarding/students/route.ts`, `/dashboard/students/page.tsx`

**📬 DM UNREAD NOTIFICATIONS FOR SUPER-ADMIN (NEW FEATURE):**

Added real-time unread message notifications across the super-admin page:

| Component | What it does |
|-----------|-------------|
| DM API global endpoint | `GET /api/montree/dm?reader_type=admin` (no conversation_id) returns `{ total_unread, per_conversation }` |
| Leads tab badge | Red **✉ N** pill showing total unread messages from users |
| Per-lead badge | Red dot on each "💬 Message" button showing that lead's unread count |
| 30s polling | Auto-refreshes unread counts; deduplicates overlapping requests |
| Mark-as-read | Opening a DM conversation clears its unread count (locally + server) |

**🛡️ BULLETPROOFING PASS (3-agent audit + fixes):**

| Fix | Category |
|-----|----------|
| Combined two global unread queries into one (eliminates race condition) | DM API |
| Added `.limit(500)` cap on unread query | DM API |
| Added error handling on all Supabase queries (global unread, per-convo, mark-as-read PATCH) | DM API |
| `useRef`-based fetch deduplication — prevents overlapping 30s polls | Super-admin |
| Password guard — `fetchDmUnread` returns early if password is empty | Super-admin |
| JSON content-type check before `res.json()` — won't crash on HTML error pages | Super-admin |
| Wrapped `openDm` in `useCallback([password])` — eliminates stale closure | Super-admin |
| Functional `setState` inside `openDm` — reads current state not captured closure | Super-admin |
| UUID regex `[a-fA-F0-9-]` — handles uppercase UUIDs | Super-admin |
| Fallback unread lookup checks both principal ID AND lead.id (pre/post-bridge) | Super-admin |
| `isMountedRef` with cleanup — prevents setState on unmounted component | InboxButton |
| All async functions check `isMountedRef` before every setState | InboxButton |
| Fixed mark-as-read `useEffect` missing `conversationId` dependency | InboxButton |
| Quieted polling error logging (warn on first fail, only escalate after 3) | InboxButton |
| Added `pb-16` bottom padding to avoid overlap with feedback bubble | InboxButton |

**Files Modified:**

| File | Change |
|------|--------|
| `app/api/montree/try/instant/route.ts` | Fixed school insert (owner_email + all columns), added diagnostic output |
| `app/montree/try/page.tsx` | Added debug error display (pre tag) |
| `app/api/montree/dm/route.ts` | Global unread summary endpoint, error handling, mark-as-read fix |
| `app/montree/super-admin/page.tsx` | DM unread polling, badges on Leads tab + per-lead, bulletproofed |
| `components/montree/InboxButton.tsx` | isMountedRef, dependency fix, quiet errors, pb-16 overlap fix |
| `app/montree/dashboard/students/page.tsx` | Emoji → letter icons (P, S, M, L, C) |
| `app/api/montree/children/route.ts` | Batch insert + mastered status for prerequisites |
| `app/api/montree/onboarding/students/route.ts` | Same batch insert + mastered fix |

---

### Session 147 - Feb 6, 2026 (CURRICULUM AUDIT + ONBOARDING DESIGN)

**🔍 CURRICULUM AUDIT COMPLETED:**

Audited curriculum seeding process and fixed parent description propagation:

**Root Cause Found:** Reports showing "no description available" because:
- `seed-school.ts` wasn't copying `parent_description` from comprehensive guides
- `seed-classroom.ts` wasn't copying fields from school to classroom

**Fixes Applied:**

| File | Change |
|------|--------|
| `lib/montree/seed/seed-school.ts` | Added `buildDescriptionLookup()` function, imports all `*-guides.json` files, maps descriptions to works during seeding |
| `lib/montree/seed/seed-classroom.ts` | Now copies `parent_description` and `why_it_matters` from school curriculum to classroom |

**Curriculum Data Verified:**
- 268 works in `*-guides.json` files with 100% `parent_description` coverage
- Original `parent-*.json` files preserved (106 hand-crafted entries)
- Seeding is now idempotent (run 1 time or 10,000 times = same result)

**🎓 ONBOARDING SYSTEM DESIGNED:**

Created complete design for Excel-style student onboarding:
- Spreadsheet: Name | Age | Time at School | 5 Areas | Temperament | Focus
- Guru recommends works with prerequisite alerts
- Teacher approves → works appear in child's profile tab

**Files Created:**
| File | Purpose |
|------|---------|
| `/docs/HANDOFF_ONBOARDING_SYSTEM.md` | Complete handoff with implementation plan |
| `/onboarding-mockup.jsx` | Visual React mockup of the system |

**Earmarked as FIRST PROJECT for next session.**

---

### Session 146 - Feb 5, 2026 Late Night (EDUCATION FOR ALL PRICING SYSTEM)

**🎯 MISSION: Make Montree accessible to everyone who needs it.**

Built complete pricing and access system:
- Individual teachers can try without registering a school (90-day trial)
- NPOs serving underprivileged communities get free lifetime access
- Schools can apply for reduced rates ($500/$250/$100/custom)
- 10% Impact Fund for equipment, donations, building schools

**Database Migration 115 - Schema Changes:**
| Change | Status |
|--------|--------|
| `account_type` column (personal_classroom/school/community_impact) | ✅ |
| Trial tracking columns (trial_started_at, trial_ends_at, trial_status) | ✅ |
| `montree_npo_applications` table | ✅ |
| `montree_reduced_rate_applications` table | ✅ |
| `montree_impact_fund_transactions` table | ✅ |
| `montree_npo_outreach` table | ✅ |
| Views + Triggers + Indexes | ✅ |

**Database Migration 116 - NPO Seed Data:**
14 organizations seeded for outreach (Kenya, India, Philippines, Mexico, USA, Global)

**Files Created:**
| File | Purpose |
|------|---------|
| `migrations/115_account_types_and_impact_fund.sql` | Schema for pricing system |
| `migrations/116_seed_npo_outreach.sql` | NPO outreach seed data |
| `app/api/montree/teacher/register/route.ts` | Personal Classroom registration |
| `app/api/montree/apply/npo/route.ts` | NPO application endpoint |
| `app/api/montree/apply/reduced-rate/route.ts` | Reduced rate application |
| `app/montree/teacher/register/page.tsx` | Teacher trial registration form |
| `app/montree/super-admin/page.tsx` | Simplified admin with inline status toggle |

**Critical Fixes Applied:**
- Migration SQL syntax (CHECK constraints)
- Missing trial_ends_at column
- Missing FK indexes (6 added)
- Reduced rate API column mismatch
- Password hashing: SHA-256 → bcrypt
- Added slug generation for schools

**Super-Admin Simplified:**
- Schools tab with inline status toggle (Trial/Free/Paid)
- One-click to change any school's subscription tier
- Hidden unused tabs (Impact Fund, Outreach, NPO Apps, Rate Apps)

**Handoff:** `/docs/HANDOFF_SESSION_146_PRICING.md`

---

### Session 145 - Feb 5, 2026 Evening (PRE-LAUNCH POLISH)

**🔧 CRITICAL FIX: Teacher login with codes was completely broken!**

The auth API was looking for a `login_code` column that doesn't exist. Teacher creation hashes the code with SHA256 and stores in `password_hash`, but auth was trying `.eq('login_code', code)` which always failed.

**Fix:** Hash entered code and compare against `password_hash`:
```javascript
const codeHash = hashCode(code.toUpperCase());
.eq('password_hash', codeHash)
```

**Other Changes:**

| Feature | Change |
|---------|--------|
| Teacher Setup | REMOVED - Teachers go straight to dashboard after code login |
| Area Icons | Letters (P,S,M,L,C) now display with colored circular backgrounds |
| Billing | Updated to $499-$1,999/month (was $50-200/year) |
| Feedback | Added screenshot capture with html2canvas |
| Camera | Added front/back camera switching |

**Files Changed:**

| File | Change |
|------|--------|
| `app/api/montree/auth/teacher/route.ts` | **CRITICAL** - Hash code before comparing |
| `app/montree/login/page.tsx` | Skip setup, go straight to dashboard |
| `app/montree/dashboard/[childId]/page.tsx` | Area icons with colored circles |
| `app/montree/admin/billing/page.tsx` | $499-$1,999/month pricing |
| `components/montree/FeedbackButton.tsx` | Screenshot capture |
| `lib/montree/types.ts` | Area icons = letters P, S, M, L, C |

**Teacher Login Flow (Streamlined):**
```
Principal creates teacher → Gets 6-char code → Teacher enters code → Dashboard
```
No more mandatory username/password setup!

**Git:** Multiple commits, needs push

---

### Session 144 - Feb 5, 2026 (CRITICAL MOBILE FIX + ADD WORK MODAL)

**🚨 CRITICAL BUG FIXED: Mobile access completely broken!**

Going to `www.teacherpotato.xyz/montree` was redirecting to `www.teacherpotato.xyz` (dropping the /montree path).

**Root Cause:** `/montree` was NOT in `publicPaths` in `middleware.ts`. Since Montree uses its own auth (not Supabase), unauthenticated requests were redirected to `/` by line 174.

**Fix:** Added `/montree` to publicPaths array (line 76).

**Other Changes:**

| Feature | Change |
|---------|--------|
| AddWorkModal | NEW component for adding curriculum works with full form |
| Photo linking | Fixed `id: w.work_key` → `id: w.id` in works/search API |
| Report photos | Added `all_photos` array to show ALL photos in weekly reports |
| Railway domain | Added `teacherpotato.xyz` (non-www) - waiting for DNS |
| www redirect | Commented out in next.config.ts (was red herring) |

**Files Changed:**

| File | Change |
|------|--------|
| `middleware.ts` | **CRITICAL** - Added `/montree` to publicPaths |
| `components/montree/AddWorkModal.tsx` | NEW - Full-featured work creation modal |
| `app/montree/dashboard/curriculum/page.tsx` | Add Work button + modal + auto-scroll |
| `app/api/montree/works/search/route.ts` | id fix for photo linking |
| `app/api/montree/parent/report/[reportId]/route.ts` | all_photos array |
| `app/montree/parent/report/[reportId]/page.tsx` | Photo gallery section |

**Git:** Committed locally, needs push

---

### Session 143 - Feb 4, 2026 Late Night (CURRICULUM SAFETY + BUG FIXES)

**🔧 CRITICAL FIX: Re-import Master was deleting custom works!**

The "Re-import Master" button deleted ALL curriculum works including custom teacher-added works.

**Fix:** Only delete non-custom works:
```javascript
.or('is_custom.is.null,is_custom.eq.false')
```

**Other Fixes:**

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Position insertion wrong | `sequence: idx + 1` used array index instead of DB sequence | Changed to `w.sequence \|\| idx + 1` |
| Modal inputs unresponsive | Textareas had inconsistent styling | Added explicit `bg-white`, `border`, `text-gray-900` |
| Eye icon confusing | `is_active: false` made work disappear (GET filters by `is_active: true`) | Changed to 🗑️ trash icon with actual delete |

**Files Changed:**

| File | Change |
|------|--------|
| `app/montree/dashboard/[childId]/page.tsx` | Fixed sequence bug (3 places) |
| `app/montree/dashboard/curriculum/page.tsx` | Textarea styling + trash icon + delete function |
| `app/api/montree/curriculum/route.ts` | Re-import preserves custom works |
| `app/api/montree/curriculum/delete/route.ts` | **NEW** - Delete work endpoint |

**Custom Works Protection:**
- Works with `is_custom: true` → Protected from re-import
- Works from Master Montessori Brain → Replaced on re-import

**Git:** Pending commit

---

### Session 142 - Feb 4, 2026 Evening (CURRICULUM-PROGRESS DATA SYNC)

**🔧 ROOT CAUSE FIX: Orphaned Works**

Works like "Word Building Work with /u/" appeared in Week view but NOT in Curriculum page.

**Root Cause:** Two independent tables with NO foreign key:
- `montree_child_progress` stores `work_name` as TEXT
- `montree_classroom_curriculum_works` stores proper UUID records

**Fix Applied:** Auto-sync in `/api/montree/progress/update/route.ts`
- When progress saved with `area`, checks if work exists in curriculum
- If not found, auto-creates with `is_custom=true`
- Only for NEW updates - existing orphans need re-save to sync

**Other Fixes:**

| Issue | Fix |
|-------|-----|
| Modal inputs not working | Changed CSS from `overflow-hidden` to `flex flex-col` layout |
| Missing classroom_id in uploads | Added to capture page photo/video uploads |
| Empty WorkWheelPicker crash | Added empty state handling |
| Missing Montessori descriptions | Added 20+ fallback descriptions (pink tower, golden beads, etc.) |
| Dashboard missing links | Added 📚 Curriculum + 🧠 Guru to main dashboard header |

**Files Changed:**

| File | Change |
|------|--------|
| `app/api/montree/progress/update/route.ts` | Auto-sync curriculum entries |
| `app/montree/dashboard/curriculum/page.tsx` | Fixed modal layout |
| `app/montree/dashboard/page.tsx` | Added Curriculum + Guru links |
| `app/montree/dashboard/capture/page.tsx` | Added classroom_id |
| `app/api/montree/reports/preview/route.ts` | 20+ fallback descriptions |
| `components/montree/WorkWheelPicker.tsx` | Empty state handling |

**Git:** Commits `35b7564` through `b618d21` pushed and deployed

---

### Session 141 - Feb 4, 2026 (PARENT REPORT FIXES + 3-PART CARDS)

**✅ Gallery Testing:** PASSED - Photo viewer modal, filters all working.

**🔧 Parent Report Display Fixes:**

| Issue | Fix |
|-------|-----|
| "Week ," showing empty | Added `formatWeekDisplay()` fallback to date range |
| Works with photos had no description | Added fallback: "Your child practiced this [Area] activity" |
| Missing week fields in API | Added `week_number`, `report_year`, `week_start`, `week_end` to queries |

**Files Changed:**

| File | Change |
|------|--------|
| `app/api/montree/parent/reports/route.ts` | Added week fields to select |
| `app/api/montree/parent/report/[reportId]/route.ts` | Added week_start, week_end |
| `app/montree/parent/dashboard/page.tsx` | Added formatWeekDisplay() helper |
| `app/montree/parent/report/[reportId]/page.tsx` | Added formatWeekDisplay() + fallback description |

**⚠️ Git:** Commit `9f62782` local only - **NEEDS MANUAL PUSH**

**3-Part Card Images:** Abandoned due to proxy restrictions. Existing images at `/out/images/words/` (cat.jpeg, fan.jpeg, hat.png, mat.jpeg, pan.jpeg, etc.)

**Handoff:** `/docs/HANDOFF_SESSION_141.md`

---

### Session 140 - Feb 4, 2026 (ROOT CAUSE ANALYSIS + FIXES)

**🔧 SYSTEMATIC INVESTIGATION COMPLETED:**

Used parallel agents + Chrome MCP to diagnose deployment/build issues.

**Root Causes Found & Fixed:**

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| MESSAGE_ENCRYPTION_KEY warning spam | .env.local had 33-char key | Synced to Railway's 32-char key |
| React version conflict | montree/ had React 18, main had 19 | Updated montree/package.json to React 19 |
| Port mismatch | .env.local=3001, start.sh=3000 | Changed .env.local to 3000 |
| Middleware disabled | middleware.ts.disabled | Renamed to middleware.ts (re-enabled) |
| No Node version lock | Missing .nvmrc | Created .nvmrc with Node 20 |

**Files Changed:**

| File | Change |
|------|--------|
| `.env.local` | MESSAGE_ENCRYPTION_KEY 32 chars + port 3000 |
| `montree/package.json` | React 19.2.0, Next.js 16.1.1, TypeScript 5.9.3 |
| `middleware.ts` | Re-enabled (renamed from .disabled) |
| `.nvmrc` | NEW - Node 20 |

**Railway Dashboard Verified:**
- GitHub integration: ✅ Connected to Tredoux555/whale-class
- Auto-deploy: ✅ Working (last deploy 7h ago successful)
- Health check: ✅ /api/health endpoint with 60s timeout
- Env vars: ✅ MESSAGE_ENCRYPTION_KEY correctly set to 32 chars

**Next: Gallery + Reports systematic fix loop with Chrome MCP**

---

### Session 139 - Feb 3, 2026 Late Night (REPORT DATA CONSISTENCY FIX - UNTESTED!)

**⚠️ CRITICAL: Railway NOT auto-deploying from GitHub. Code is committed but NOT live!**

**🔴 MAIN ISSUE FIXED: Report Preview vs Parent View Mismatch**

Teacher preview showed 7 works + photos, but parent view only showed 2 works + no photos.

**Root Causes Found & Fixed:**

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Preview showed ALL photos | Ignored `montree_report_media` junction table | Now respects teacher's photo selections |
| Parent missing works | Used ISO week dates instead of `lastReportDate` | Uses saved content instead of regenerating |
| Parent missing descriptions | Send route didn't save `parent_description` | Now saves full content with descriptions |
| Parent missing photos | Different photo matching logic | Caption fallback added for photos without work_id |
| 500 Error on send | Missing `week_number` and `report_year` NOT NULL columns | Added both columns with proper calculations |

**Files Changed (committed to GitHub, NOT deployed):**

| File | Change |
|------|--------|
| `app/api/montree/reports/preview/route.ts` | Respect photo selections from junction table |
| `app/api/montree/reports/send/route.ts` | Save full descriptions + fix caption matching + add week_number/report_year |
| `app/api/montree/parent/report/[reportId]/route.ts` | Use saved content instead of regenerating |
| `scripts/verify_reports_tables.sql` | **NEW** - DB verification script |

**Data Flow (After Fix):**
```
Preview → shows SELECTED photos from junction table
    ↓
Send → saves works WITH descriptions & photo URLs in content
    ↓
Parent → reads saved content directly (no regeneration)
```

**Git:** Commit `8fd6678` pushed to GitHub ✅, Railway deploy ❌

**First Thing Tomorrow:**
1. Fix Railway deployment - Check Settings → Source → verify GitHub webhook
2. Manually trigger deploy or push empty commit
3. Test the Publish Report button
4. Verify preview matches parent view

**Handoff:** `/HANDOFF.md`

---

### Session - Feb 3, 2026 (BUGS FIXED + STUDENT TENURE! 🎯)

**🐛 CRITICAL BUGS FIXED:**

**1. Parent Reports 500 Error**
- Root Cause: `send/route.ts` was inserting non-existent columns (`week_number`, `report_year`, `is_published`, `published_at`)
- Fix: Rewrote to use actual schema columns (`week_start`, `week_end`, `status: 'sent'`)

**2. Gallery Not Showing Photos**
- Root Cause: Broken FK join `work:work_id (...)` failed silently
- Fix: Changed to simple query + manual curriculum lookup (same pattern as working preview endpoint)

**🆕 STUDENT TENURE FEATURE:**

Teachers can now specify how long a student has been enrolled when adding them. This gives Guru accurate context.

| File | Change |
|------|--------|
| `migrations/113_student_tenure.sql` | Adds `enrolled_at DATE` column to `montree_children` |
| `app/montree/dashboard/students/page.tsx` | Added tenure dropdown with 6 options |
| `app/api/montree/children/route.ts` | Added `enrolled_at` to POST and GET |
| `app/api/montree/children/[childId]/route.ts` | Added `enrolled_at` to PUT, added PATCH alias |
| `lib/montree/guru/context-builder.ts` | Now uses `enrolled_at` for `time_at_school` calculation |

**Tenure Options:**
- Just started (< 2 weeks)
- A few weeks (2-4 weeks)
- 1-3 months
- 3-6 months
- 6-12 months
- More than a year

**Impact:** Guru now accurately understands student tenure, won't suggest "adjustment period" advice for long-term students.

**Handoff:** `/HANDOFF.md`

---

### Session - Feb 2, 2026 (TESTING WEEK KICKOFF! 🧪)

**🚀 TESTING WEEK PREPARATION COMPLETE!**

**Changes Made:**
| File | Change |
|------|--------|
| `app/montree/dashboard/page.tsx` | Added 🖨️ Print button to header |
| `app/montree/dashboard/print/page.tsx` | Now shows focus works (teacher-assigned) |
| `scripts/clear-test-photos.js` | Photo cleanup script (auto-loads .env.local) |
| `docs/HANDOFF_TESTING_WEEK.md` | Full implementation mission plan |

**Feature Audit Completed:**
| Feature | Status | Notes |
|---------|--------|-------|
| Notes | ✅ Working | Could add toast confirmation |
| Video Capture | ❌ Not built | Only photos |
| Curriculum Edit | ✅ EXISTS | `/montree/dashboard/curriculum` |
| Capture Retake | ⚠️ Bug | State reset issue |
| Photo Management | ⚠️ View only | No edit/delete |
| Parent Portal | ✅ EXISTS | 6 pages at `/montree/parent/` |
| Teacher Summary | ❌ Not built | Plan to use Guru AI |

**Mission Plan Created:** See `## Pending / Next Up` section for 6-phase implementation plan.

**Git Commits:**
- `4cf263f` - Testing prep: Focus work fix, report preview, photo cleanup
- `a8f9488` - Print page now uses focus works
- `c838962` - Fix clear-test-photos script
- `3b999ee` - Add Print button to dashboard header

**Handoff:** `/docs/HANDOFF_TESTING_WEEK.md`

---

### Session - Feb 1, 2026 (Very Late Night - FOCUS WORK PERSISTENCE FIX! 🎯)

**🐛 CRITICAL BUG FIXED: Focus work changes weren't persisting!**

**Root Cause:** When changing focus via wheel picker:
1. Dashboard sent `is_focus: true` to `/api/montree/progress/update`
2. The endpoint **completely ignored** the `is_focus` flag
3. `montree_child_progress` table has NO `is_focus` column
4. Separate `montree_child_focus_works` table existed but was NEVER updated
5. After reload, focus reverted to status-priority-based selection

**Fixes Applied:**

| File | Change |
|------|--------|
| `/api/montree/progress/update/route.ts` | Now saves to `montree_child_focus_works` when `is_focus: true` |
| `/api/montree/progress/route.ts` | Fetches focus works and marks progress items with `is_focus` flag |
| `/components/montree/WorkWheelPicker.tsx` | Removed duplicate "Select" button, simplified to just "Add Work" |

**How Focus Works Now:**
1. Teacher clicks area icon → Wheel picker opens
2. Scroll to select work → Click highlighted work
3. API saves to `montree_child_progress` (progress) AND `montree_child_focus_works` (focus designation)
4. On reload, GET endpoint fetches both tables and marks `is_focus: true/false`
5. Dashboard's `fetchAssignments` uses `is_focus` flag to determine focus work

**WorkWheelPicker UI Simplified:**
- Clicking highlighted work = Change focus work (calls `onSelectWork`)
- "Add Work" button = Add as extra work (calls `onAddExtra`)
- No duplicate "Select" button anymore

**Earlier in Session - Photo-Work Association:**
- Capture button now includes: `?workName=X&area=Y`
- Photos uploaded with work context in `caption` field
- Report preview uses caption as fallback for work matching

**Handoff:** `/docs/HANDOFF_FOCUS_WORK_FIX.md`

---

### Session - Feb 1, 2026 (Very Late Night - REPORT PREVIEW COMPLETE! 👁️)

**🎉 REPORT PREVIEW FEATURE COMPLETE:**

Teachers can now preview exactly what parents will see before publishing reports.

**New Files Created:**
| File | Purpose |
|------|---------|
| `/api/montree/reports/preview/route.ts` | Loads parent descriptions from JSON, matches photos to works |
| `/api/montree/reports/unreported/route.ts` | Fetches all progress since last report |
| `/api/montree/reports/send/route.ts` | Publishes report and marks as reported |

**Reports Page Updated** (`/app/montree/dashboard/[childId]/reports/page.tsx`):
- Shows list of works with progress since last report
- Indicators: 📸 = photo attached, 📝 = description available
- "👁️ Preview Report" button opens modal showing exactly what parents will see
- Preview modal shows: child name, work names with status badges, photos, parent descriptions, "why it matters"
- "Publish Report" button to send to parents

**How Preview Works:**
1. Loads parent descriptions from `/lib/curriculum/comprehensive-guides/parent-*.json`
2. Matches photos by work_name from `montree_child_photos` table
3. Returns structured data with work_name, photo_url, parent_description, why_it_matters
4. Modal displays everything in parent-friendly format

**What Parents See:**
- Work name with status badge (🌱 Introduced / 🔄 Practicing / ⭐ Mastered)
- Photo of child doing the work (if taken)
- Parent-friendly description explaining what the work teaches
- "Why it matters" - developmental significance

**Git Status:** Committed and pushed to origin/main ✅

**Still To Do:**
- Parent-facing report page needs updating to consume new data structure
- Test full flow: mark progress → take photo → preview → publish → parent views

**Handoff:** `/docs/HANDOFF_REPORT_PREVIEW.md`

---

### Session - Feb 1, 2026 (Late Night - STATUS JUMPING + REPORTS OVERHAUL!)

**🐛 STATUS JUMPING BUG - ROOT CAUSE FOUND & FIXED:**

**Root Causes Identified:**
1. **Progress API used `ilike` (pattern match)** - Could create duplicate records or match wrong record
2. **Race condition in Week page** - Window focus triggered refetch while save was in progress
3. **Reports date filtering was brittle** - ISO timestamp string comparisons failed in edge cases

**Fixes Applied:**

| File | Fix |
|------|-----|
| `/api/montree/progress/update/route.ts` | Changed `ilike` to `eq` for exact work_name matching |
| `/app/montree/dashboard/[childId]/page.tsx` | Added `isSaving` state to block refetch during saves |
| `/app/montree/dashboard/[childId]/page.tsx` | All save functions now properly await and handle errors |
| `/app/montree/dashboard/[childId]/reports/page.tsx` | Complete rewrite - "Report to Date" approach |

**Reports System Overhaul - "Report to Date" Approach:**

Old approach: Complex week-based date filtering that was buggy
New approach: Simple - show all unreported progress since last report

| Endpoint | Purpose |
|----------|---------|
| `GET /api/montree/reports/unreported?child_id=X` | Fetch all progress since last report |
| `POST /api/montree/reports/send` | Send report to parents, marks as reported |

How it works now:
1. Teacher marks progress → saved to DB (no date complexity)
2. Reports tab shows ALL progress since last report sent
3. "Send Report" → emails parents + saves report → clears the list
4. Next time only new progress shows

This eliminates all date/timestamp bugs. Photos are still saved for end-of-term compilation.

**Still To Do:**
1. **Report Preview** - Teacher should see what report looks like before/after sending
2. **Parent Report Page** - Data structure mismatch between send endpoint and parent view page
3. **Push to deploy** - Changes committed locally, need `git push origin main`

**Handoff:** `/docs/HANDOFF_SESSION_STATUS_REPORTS.md`

---

### Session - Feb 1, 2026 (Night - DEEP AUDIT & FIXES!)

**🐛 MULTIPLE BUGS FOUND & FIXED:**

**1. Reports showing 0 activities**
- Root Cause: `updated_at` wasn't set on INSERT, only on UPDATE
- Fix: Added `updated_at: now` to insert in `/api/montree/progress/update/route.ts`
- Fix: Reports API now fetches ALL progress, filters in JS with fallback to `presented_at`

**2. Status mismatch: 'completed' vs 'mastered' (CRITICAL)**
- Root Cause: Week UI uses `'completed'` for mastered, but rest of app uses `'mastered'`
- Fix: API now normalizes `'completed'` → `'mastered'` in progress/update route
- Fix: Progress bars API now counts both `'completed'` and `'mastered'` as done
- Fix: Reports API now counts both in stats calculation

**3. Build error - duplicate variable**
- Fixed `allProgress` defined twice in reports route → renamed to `overallProgress`

**Files Modified:**
| File | Change |
|------|--------|
| `/api/montree/progress/update/route.ts` | Added `updated_at` on insert + normalize 'completed' to 'mastered' |
| `/api/montree/progress/bars/route.ts` | Handle both 'completed' and 'mastered' in count |
| `/api/montree/reports/route.ts` | Fixed duplicate var + JS filtering + stats calculation |
| `/app/montree/dashboard/[childId]/layout.tsx` | Removed Guru/Camera buttons |

**UI Cleanup Done:**
- Removed 🔮 Guru and 📷 Camera buttons from child detail header
- Reports page simplified: current week only, no week navigation
- Hidden tabs: Profile, Observations (kept functional but hidden)
- Active tabs: Week, Progress, Reports

**Guru Status:** API routes have issues (404s). Deferred for later.

---

### Session - Feb 1, 2026 (Evening - MONTESSORI GURU ALL PHASES COMPLETE! 🔮✅)

**🔮 MONTESSORI GURU - FULL IMPLEMENTATION COMPLETE!**

Philosophy: "Complexity absorbed, simplicity delivered" - Teacher asks simple question, gets genius-level child-specific advice.

**ALL PHASES COMPLETE:**

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation - Topic index, DB migration, basic API | ✅ |
| Phase 2 | Context Pipeline - Context builder, knowledge retriever, prompts | ✅ |
| Phase 3 | Core UI - Chat interface, response display, follow-up tracking | ✅ |
| Phase 4 | Profile System - Mental profiles, observations, pattern detection | ✅ |
| Phase 5 | Polish - Few-shot examples, streaming responses, final UI | ✅ |

**Complete Feature List:**
- ✅ Topic index auto-generated from 97K lines (34 topics, 1869 line ranges)
- ✅ Database migration 110 with 4 new tables
- ✅ Guru API endpoint with streaming support
- ✅ Guru chat UI with real-time streaming display
- ✅ "Ask Guru" button on all child pages
- ✅ Mental profile editor (temperament, sensitive periods, family context)
- ✅ Observation logging with ABC model (Antecedent-Behavior-Consequence)
- ✅ Automatic pattern detection from observations
- ✅ Follow-up tracking API for outcomes
- ✅ 6 comprehensive few-shot examples
- ✅ Child detail page tabs: Week, Progress, Profile, Observations, Reports

**Files Created:**
| File | Purpose |
|------|---------|
| `/scripts/build_topic_index.py` | Auto-generates topic index from books |
| `/data/guru_knowledge/topic_index.json` | Topic→line mapping for RAG |
| `/data/guru_knowledge/few_shot_examples.json` | 6 high-quality example Q&A pairs |
| `/migrations/110_guru_tables.sql` | Mental profiles, observations, interactions, patterns |
| `/lib/montree/guru/context-builder.ts` | Gathers all child context |
| `/lib/montree/guru/knowledge-retriever.ts` | Queries Montessori books |
| `/lib/montree/guru/prompt-builder.ts` | Constructs AI prompts |
| `/lib/montree/guru/index.ts` | Module exports |
| `/app/api/montree/guru/route.ts` | Main API endpoint |
| `/app/api/montree/guru/stream/route.ts` | Streaming API endpoint |
| `/app/api/montree/guru/followup/route.ts` | Follow-up tracking |
| `/app/api/montree/children/[id]/profile/route.ts` | Mental profile CRUD |
| `/app/api/montree/observations/route.ts` | Behavioral observations |
| `/app/api/montree/patterns/route.ts` | Pattern detection |
| `/app/montree/dashboard/guru/page.tsx` | Teacher chat UI with streaming |
| `/app/montree/dashboard/[childId]/profile/page.tsx` | Mental profile editor |
| `/app/montree/dashboard/[childId]/observations/page.tsx` | Observation logging |

**Database Tables:**
- `montree_child_mental_profiles` - Temperament (9 traits), learning modality, sensitive periods, family context
- `montree_behavioral_observations` - ABC model tracking, time/activity/intervention
- `montree_guru_interactions` - Questions, responses, context snapshots, outcomes
- `montree_child_patterns` - Auto-detected patterns with confidence levels

**Access Points:**
- Direct: `/montree/dashboard/guru`
- From child page: Click 🔮 Guru button in header
- Child profile: `/montree/dashboard/[childId]/profile`
- Observations: `/montree/dashboard/[childId]/observations`
- APIs: `POST /api/montree/guru`, `POST /api/montree/guru/stream`

**How It Works:**
1. Teacher selects child, types question
2. System gathers context (age, progress, mental profile, notes, observations)
3. Topic index identifies relevant Montessori book passages (34 topics from 97K lines)
4. Mega-prompt built with system persona, child context, knowledge, and few-shot examples
5. Claude generates response (streamed in real-time to UI)
6. Response displayed with insight, root cause, action plan, timeline, parent talking point
7. Interaction logged to database for future reference
8. Patterns auto-detected from observations over time

---

### Session - Feb 1, 2026 (Afternoon - MONTESSORI GURU PLANNED!)

**Knowledge Base COMPLETE (96,877 lines from 7 Montessori books)**:
- The Absorbent Mind (16,471 lines)
- The Secret of Childhood (10,306 lines)
- The Montessori Method (13,181 lines)
- Dr. Montessori's Own Handbook (3,364 lines)
- Pedagogical Anthropology (24,261 lines)
- Spontaneous Activity in Education (11,766 lines)
- The Montessori Elementary Material (17,528 lines)

**Location**: `/data/guru_knowledge/sources/*.txt`

**Documentation Created**:
- `/docs/MONTESSORI_GURU_ARCHITECTURE.md` - Full system design
- `/docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` - 10-day build plan
- `/docs/GURU_PLAN_AUDIT.md` - Critical gaps analysis
- `/docs/HANDOFF_MONTESSORI_GURU.md` - Handoff for next session

---

### Session - Feb 1, 2026 (Morning - PARENT DESCRIPTIONS COMPLETE!)

**🎉 100% COMPLETE: Teacher Guides + Parent Descriptions**

All 490 classroom curriculum works now have:
- ✅ `quick_guide` - 10-second teacher reference
- ✅ `presentation_steps` - Full AMI album instructions
- ✅ `parent_description` - Warm, parent-friendly explanations
- ✅ `why_it_matters` - Developmental significance

**Backfill Migrations Created** (all run successfully):
- `migrations/104_backfill_parent_descriptions.sql` - Initial backfill
- `migrations/105_fix_remaining_parent_descriptions.sql` - ILIKE pattern fixes
- `migrations/106_fix_missing_parent_descriptions.sql` - 100 exact matches
- `migrations/107_final_parent_descriptions.sql` - Additional patterns
- `migrations/108_final_19_parent_descriptions.sql` - Final 19 exact matches

**Database Status**:
- 490 total works (245 per classroom × 2 classrooms)
- 490/490 have `parent_description` ✅
- 490/490 have `why_it_matters` ✅

**Classrooms Backfilled**:
- Panda: `3775b195-1c85-4e2a-a688-e284e98e7b7d` ✅
- Whale: `945c846d-fb33-4370-8a95-a29b7767af54` ✅

**Auto-load for new classrooms**: ✅ YES - `curriculum-loader.ts` merges all guide data

---

### Session - Feb 1, 2026 (Early Morning - Curriculum Guides COMPLETE!)

**📚 AMI ALBUM QUALITY TEACHER GUIDES: 100% COMPLETE!**

All 309 Montessori works now have comprehensive teacher guides.

**Location**: `lib/curriculum/comprehensive-guides/`
| File | Works | Status |
|------|-------|--------|
| `practical-life-guides.json` | 108 | ✅ 100% |
| `sensorial-guides.json` | 35 | ✅ 100% |
| `math-guides.json` | 65 | ✅ 100% |
| `language-guides.json` | 43 | ✅ 100% |
| `cultural-guides.json` | 58 | ✅ 100% |
| **TOTAL** | **309** | **✅ 100%** |

**Each work includes**:
- `quick_guide`: 3-5 bullet points for 10-second teacher scan ✅ 100%
- `presentation_steps`: Full AMI album step-by-step instructions ✅ 100%
- `control_of_error`, `direct_aims`, `indirect_aims`, `materials_needed` ✅ 100%
- `parent_description`: Warm, parent-friendly explanations ✅ 100%
- `why_it_matters`: Developmental significance for parents ✅ 100%

**API**: `GET /api/montree/works/guide?name=Work+Name&classroom_id=xxx`

**Auto-load on classroom creation**: ✅ YES - `curriculum-loader.ts` merges all data
**Backfill existing classrooms**: `GET /api/montree/admin/backfill-guides?classroom_id=xxx`
**SQL Migrations**:
- `migrations/103_backfill_curriculum_guides.sql` - Teacher guides
- `migrations/104_backfill_parent_descriptions.sql` - Parent descriptions

**Handoff Doc**: `docs/HANDOFF_CURRICULUM_GUIDES.md`

---

### Session - Jan 31, 2026 (Evening - CRITICAL FIXES)

**🔴 MAJOR BUGS FIXED:**

1. **Students failing to save** - Multiple root causes found:
   - `montree_children` table has NO `school_id` column (we were trying to insert it)
   - `age` column is INTEGER not DECIMAL (3.5 was failing, now rounds to 4)
   - Fixed in `/api/montree/children/route.ts` and `/api/montree/onboarding/students/route.ts`

2. **Curriculum sequence was garbage** - All works had `sequence: 1`
   - Root cause: Old Brain-based seeding had unreliable order
   - Created `/lib/montree/curriculum-loader.ts` - reads static JSON with CORRECT sequences
   - Sequence formula: `(area * 10000) + (category * 100) + work`
   - Example: Number Rods = 30101, Addition Strip Board = 30503
   - Number Rods now correctly appears BEFORE Addition Strip Board

3. **Chinese language removed** - User didn't want Chinese in the curriculum
   - Removed `name_chinese` from all curriculum routes and loader

**🛠️ NEW ENDPOINTS:**
- `/api/montree/admin/reseed-curriculum?classroom_id=XXX` - Re-seeds curriculum with correct sequence (GET)
- `/api/montree/debug/audit?classroom_id=XXX` - Full data audit for a classroom
- `/api/montree/debug/add-child?name=X&classroom_id=X` - Test child creation
- `/api/montree/debug/classroom?classroom_id=XXX` - Debug classroom data

**🔧 CHANGES:**
- Onboarding simplified: Welcome → straight to Dashboard (removed forced student-adding step)
- Teacher username: Now allows capital letters (teachers want proper names)
- Curriculum areas: English only (no Chinese)

**⚠️ CRITICAL DATABASE FACTS (learned the hard way):**
- `montree_children.age` = INTEGER (not decimal! Must round 3.5 → 4)
- `montree_children` has NO `school_id` column (use `classroom_id` only)
- Curriculum works need proper `sequence` values (Brain DB was unreliable)

**📋 STILL TO DO:**
- Test full flow: Create school → Add teacher → Login → Add student → Track progress
- Reseed the Panda classroom too (also has wrong sequences)
- Consider adding age as decimal in future migration

---

### Session - Jan 31, 2026 (Super Admin Security + School Setup)
- **Two Separate Systems Confirmed**:
  - `/admin/*` = Whale Class (mock data, NOT connected to database)
  - `/montree/*` = Montree SaaS (real database, multi-tenant)
  - User wants these KEPT SEPARATE

- **Super Admin Security** (simple but secure approach):
  - Session timeout: 15 minutes with auto-logout
  - Activity tracking: mousemove/keydown resets timer
  - Audit logging: All actions logged to `montree_super_admin_audit`
  - Data masking: Login codes, emails masked with reveal logging
  - Created `/app/api/montree/super-admin/audit/route.ts`
  - Created `/lib/montree/super-admin-security.ts`
  - Migration: `099_super_admin_security.sql` (may need to run)

- **School Setup Improvements**:
  - Batch inserts (50 at a time) with retry logic (3 attempts)
  - 10-second timeout for Brain DB fetch with Promise.race
  - Static curriculum fallback (268 works)
  - Streaming progress via SSE: `/api/montree/principal/setup-stream/route.ts`
  - Real progress bar in setup UI

- **⚠️ KNOWN BUGS TO FIX**:
  1. **Subscription status**: New schools show "Inactive" instead of "trialing"
  2. **Teachers page**: "Failed to load data" error - API needs school_id
  3. **Hardcoded password**: Remove `870602` from super-admin page, use env var only
  4. **Login code inconsistency**: One teacher code worked, another didn't (mu3rm9 failed, c4lidx worked) - investigate why

- **🐛 BUGS FIXED THIS SESSION**:
  - **CRITICAL: Students not saving (onboarding)** - `school_id` missing in insert
  - **CRITICAL: Students not saving (dashboard)** - `/api/montree/children/route.ts` also missing `school_id`
  - **Cultural mislabeled as "English"** - Fixed in 3 files
  - **CURRICULUM SEQUENCE OVERHAULED** - Brain had garbage order. Now uses static JSON as primary source

- **✨ NEW: Curriculum Loader** (`/lib/montree/curriculum-loader.ts`):
  - Reads static JSON files (5 areas with properly sequenced categories)
  - Global sequence formula: `(area * 10000) + (category * 100) + work`
  - Example: Number Rods (30101) correctly before Addition Strip Board (30503)

- **📋 NICE TO HAVE / FUTURE**:
  - **Extensions as teacher learning tool** - Teachers can skip but having extensions visible could teach them proper Montessori sequence. Curriculum becomes a learning reference.

- **URL Clarification**:
  - `/montree/admin/*` = Principal dashboard (school owner view)
  - `/montree/super-admin/*` = Master admin (support backdoor)
  - `/montree/teacher/*` = Teacher portal
  - `/montree/student/*` = Student portal

- **Scripts Created**:
  - `scripts/clear-schools.js` - Delete all Montree schools for testing
  - `scripts/test-curriculum.js` - Verify static curriculum data

### Session - Jan 31, 2026 (English Curriculum Build)
- **Onboarding Simplified**: Landing page now has "Set Up School" + "Login" dropdown (Teacher/Principal)
- **Curriculum Ordering Fixed**: `/api/montree/curriculum/route.ts` now preserves brain's `sequence_order`
- **Complete English/Phonics Curriculum Created**:
  - 6-shelf layout covering consonants → free reading (age 3-5)
  - Shelf 1: Sound Foundations (sandpaper letters, I-spy)
  - Shelf 2: Pink Series CVC (short a, e, i, o, u word families)
  - Shelf 3: Blue Series (digraphs sh/ch/th + all blends)
  - Shelf 4: Green Series Part 1 (Magic E + core vowel teams)
  - Shelf 5: Green Series Part 2 (diphthongs, R-controlled vowels)
  - Shelf 6: Comprehension (sentences, stories, reading baskets)
- **6 Decodable Stories Created** with comprehension worksheets:
  1. "The Big Red Hat" - CVC focus
  2. "Chip and the Fish" - Digraphs
  3. "Frog on a Log" - Blends
  4. "The Bee in the Tree" - Vowel Teams
  5. "The Cake by the Lake" - Magic E
  6. "Time to Read!" - Mixed patterns
- **Digital Phonics Game**: `/app/montree/games/phonics-challenge/page.tsx` (if created)
- **Materials Created**:
  - `CVC_Curriculum_English.xlsx` - Complete word lists, sentences, stories
  - `English_Corner_Works_Layout.xlsx` - 114 works across 6 shelves × 4 levels
  - `English_Corner_Shelf_Diagram.html` - Visual layout diagram
  - Story PDFs with comprehension + answer key
  - All bundled in `Montessori_Phonics_Curriculum.zip`

### Session - Jan 30, 2026 (Continued)
- **AI Analysis Fix**: Now uses FULL learning journey data (not just 4 weeks)
- AI reads notes from `montree_work_sessions` table (previously missed)
- AI "thinks like a teacher who's known the child for years"
- WorkWheelPicker simplified: single "Select" button, defaults to `not_started`
- **Curriculum Fix**: New classrooms auto-assign full curriculum during onboarding
- Created backfill endpoint: `/api/montree/admin/backfill-curriculum`

### Session - Jan 30, 2026 (Earlier)
- Replaced all whale emojis (🐋) with tree emojis (🌳) across 44 source files + 5 icon SVGs
- Skipped historical docs to preserve project history

### Previous Sessions
- Progress display bug fixed - status values are `not_started`, `presented`, `practicing`, `mastered`
- WorkWheelPicker created (`components/montree/WorkWheelPicker.tsx`) - drum picker triggered by long-press on area icons
- Student grid auto-resize fixed with CSS Grid
- Suspense fix pushed (wrapped `useSearchParams()` in curriculum-import page)

## Key Files

| File | Purpose |
|------|---------|
| **DM / MESSAGING SYSTEM** | |
| `app/api/montree/dm/route.ts` | DM API: GET (messages + global unread), POST (send), PATCH (mark-read + bridge) |
| `components/montree/InboxButton.tsx` | Floating inbox for teachers/principals with polling + unread badge (supports `floating` prop) |
| `components/montree/InboxFloat.tsx` | Session-aware wrapper — renders InboxButton on all authenticated pages via layout |
| `migrations/117_montree_leads.sql` | Leads table schema |
| `MESSAGING_SYSTEM_HANDOFF.md` | Full messaging system handoff doc |
| **INSTANT TRIAL SYSTEM** | |
| `app/api/montree/try/instant/route.ts` | Zero-friction trial: creates school + classroom + teacher + lead |
| `app/montree/try/page.tsx` | Landing page with instant trial button |
| **EDUCATION FOR ALL PRICING** | |
| `migrations/115_account_types_and_impact_fund.sql` | Schema for pricing tiers, NPO apps, impact fund |
| `migrations/116_seed_npo_outreach.sql` | 14 NPO organizations for outreach |
| `app/api/montree/teacher/register/route.ts` | Personal Classroom registration (90-day trial) |
| `app/api/montree/apply/npo/route.ts` | NPO Community Impact application |
| `app/api/montree/apply/reduced-rate/route.ts` | Reduced rate application |
| `app/montree/teacher/register/page.tsx` | Teacher trial registration form |
| `app/montree/super-admin/page.tsx` | Simplified admin with status toggle |
| `docs/HANDOFF_SESSION_146_PRICING.md` | Full pricing system handoff |
| **MONTESSORI GURU (MVP COMPLETE!)** | |
| `data/guru_knowledge/sources/*.txt` | 7 Montessori books (96,877 lines) |
| `data/guru_knowledge/topic_index.json` | Topic→line ranges for RAG (auto-generated) |
| `data/guru_knowledge/manifest.json` | Knowledge base manifest |
| `lib/montree/guru/context-builder.ts` | Gathers child context for AI |
| `lib/montree/guru/knowledge-retriever.ts` | Queries topic index for passages |
| `lib/montree/guru/prompt-builder.ts` | Constructs mega-prompts with examples |
| `app/api/montree/guru/route.ts` | Main Guru API endpoint |
| `app/montree/dashboard/guru/page.tsx` | Teacher chat UI |
| `migrations/110_guru_tables.sql` | Database tables for profiles/interactions |
| `scripts/build_topic_index.py` | Regenerate topic index from books |
| `docs/MONTESSORI_GURU_ARCHITECTURE.md` | Full system design |
| `docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` | Build plan |
| `docs/HANDOFF_GURU_COMPLETE.md` | Complete Guru handoff (Feb 1 evening) |
| **TEACHER GUIDES + PARENT DESCRIPTIONS** | |
| `lib/curriculum/comprehensive-guides/*.json` | AMI album quality guides for 309 works (100% complete!) |
| `lib/curriculum/comprehensive-guides/AUDIT.json` | Coverage tracking |
| `docs/HANDOFF_CURRICULUM_GUIDES.md` | Master handoff doc |
| `migrations/104-108_*.sql` | Parent description backfill migrations |
| `app/api/montree/works/guide/route.ts` | API endpoint for fetching guides |
| `app/api/montree/admin/backfill-guides/route.ts` | Backfill existing classrooms with guides |
| `migrations/103_backfill_curriculum_guides.sql` | SQL to update all classrooms |
| **CURRICULUM** | |
| `lib/montree/curriculum-loader.ts` | **AUTHORITATIVE** curriculum loader - merges stem + guides, correct sequences |
| `lib/montree/stem/*.json` | Static curriculum JSONs (practical-life, sensorial, math, language, cultural) |
| `app/api/montree/admin/reseed-curriculum/route.ts` | Re-seed classroom with correct curriculum (GET) |
| **STUDENT MANAGEMENT** | |
| `app/api/montree/children/route.ts` | Add/list children - **age must be INT, no school_id** - uses upsert for progress |
| `app/api/montree/children/bulk/route.ts` | Bulk student import - non-fatal curriculum fetch, upsert progress |
| `app/montree/dashboard/students/page.tsx` | Student management UI with colored badges (P,S,M,L,C) + custom work |
| **DEBUG ENDPOINTS** | |
| `app/api/montree/debug/audit/route.ts` | Full data audit for classroom |
| `app/api/montree/debug/add-child/route.ts` | Test child creation |
| `app/api/montree/debug/classroom/route.ts` | Debug classroom data |
| **CORE** | |
| `components/montree/WorkWheelPicker.tsx` | Drum picker for curriculum navigation |
| `app/montree/dashboard/[childId]/page.tsx` | Student detail with wheel picker |
| `app/montree/dashboard/page.tsx` | Student grid (auto-resizing) |
| `app/montree/principal/register/page.tsx` | School registration |
| `app/montree/principal/setup/page.tsx` | School setup flow |
| `app/api/montree/principal/setup/route.ts` | Setup API - uses curriculum-loader.ts now |
| `app/api/montree/analysis/route.ts` | AI analysis API |
| `lib/supabase-client.ts` | **CONSOLIDATED Supabase client** (singleton + retry). `getSupabase()` for server (service role), `createSupabaseClient()` for browser (anon key). ALL routes import from here. |
| `lib/montree/db.ts` | Database operations |

## Database

**Supabase Project**: dmfncjjtsoxrnvcdnvjq

### Key Tables
- `schools` - School records
- `classrooms` - Classrooms per school
- `montree_children` - Students (**has `enrolled_at` DATE for tenure tracking!**)
- `children` - Legacy children table (FK target)
- `montree_child_progress` - Progress tracking (status per work) - **NO is_focus column!**
- `montree_child_focus_works` - **Focus work per area per child** (unique: child_id, area)
- `montree_work_sessions` - Teacher notes/observations (detailed session logs)
- `montree_classroom_curriculum_works` - Curriculum assigned to classrooms
- `montree_weekly_analysis` - Cached AI analysis results
- `curriculum_areas` - Area definitions
- `curriculum_works` - Work items

### Status Values
Progress uses: `not_started` → `presented` → `practicing` → `mastered`
(NOT `completed` - that was the old bug)

## Demo Logins
- `butter1` = Butterfly Class
- `rainbo2` = Rainbow Class

## Architecture Notes

### Curriculum Flow
1. Static curriculum in `curriculum-data.ts` (fallback)
2. Schools can customize via `school_curriculum` table
3. Classrooms inherit from school or override via `classroom_curriculum`
4. Progress tracked in `child_work_completion`

### Auth Flow
- Teachers log in with class code
- Principals register schools, create classrooms
- Parents get invite codes from teachers

## Pending / Next Up

### 🚀 NEXT PROJECT: Montree Home (Parent-Facing Home Program)

**Assessment (from Session 153): 47-66 hours estimated.**

Clone the existing Montree classroom system for home use by parents.

**What copies as-is:**
- 27 game routes (letter-tracer, word-building, etc.)
- 35 reusable components
- 68-work home curriculum at `lib/curriculum/data/home-curriculum.json`

**What changes:**
- Email/password auth (no school login flow, no teacher codes)
- No classroom abstractions (parent → children directly)
- 5 new DB tables needed (home_families, home_children, home_progress, home_curriculum, home_sessions)
- 15 components need modification (remove classroom references)
- Simplified UI (no teacher dashboard, no principal flow)

**Key decisions for cloning session:**
- Route structure: `/home/*` or `/montree-home/*`?
- Shared vs duplicated components strategy
- DB migration approach (new tables vs extending existing)

**Handoff:** `HANDOFF.md` (oriented for cloning)

---

### 📋 Backlog (Lower Priority)
- [ ] **Reseed Language curriculum** — Hit `/api/montree/admin/reseed-curriculum` to populate all 43 language works (DB only has 18)
- [ ] **Remove diagnostic debug output** from `/api/montree/try/instant/route.ts`
- [ ] **Clean up `montessori_works` brain table** — No longer used by any seeding path
- [ ] **Test Education for All system** — teacher registration, super-admin status changes
- [ ] **Start NPO outreach** — 14 organizations seeded in DB
- [ ] **FIX: Subscription status** — New schools show "Inactive" not "trialing"
- [ ] **FIX: Remove hardcoded password** — `870602` in super-admin page
- [ ] Run migration `099_super_admin_security.sql` for audit tables

### Completed Items (Sessions 141-154)
- [x] Codebase cleanup: health 5.5 → ~9.1/10 (Sessions 152-154)
- [x] Focus work persistence fix
- [x] Montessori Guru complete (all 5 phases)
- [x] Curriculum guides 309/309 (100%)
- [x] Parent descriptions 490/490 (100%)
- [x] Student tenure feature
- [x] Education for All pricing system
- [x] DM/messaging system
- [x] Instant trial system
- [x] Report preview + send flow
- [x] Photo-work association
- [x] All changes pushed to GitHub

## Gotchas
- **🚨 DEPLOYED DB HAS ALL COLUMNS FROM ALL MIGRATIONS** — The Supabase DB was built by running ALL migrations (028→067→070→080→098→115). `owner_email` is NOT NULL. Don't strip columns from inserts assuming they don't exist — check the actual error message!
- **🚨 `/montree` MUST be in middleware.ts publicPaths** - Montree uses its OWN auth (teacher codes, parent codes), NOT Supabase. Without this, middleware redirects all /montree requests to `/`!
- **Account types**: `personal_classroom`, `school`, `community_impact` (CHECK constraint on montree_schools)
- **Subscription tiers**: `trial`, `free`, `paid` (for super-admin status toggle)
- **Teacher registration needs bcryptjs** - `npm install bcryptjs @types/bcryptjs`
- **`montree_children.age` is INTEGER** - must use `Math.round()` on decimals like 3.5
- **`montree_children` has NO `school_id` column** - only use `classroom_id`
- **Curriculum sequence** - ALWAYS use `/lib/montree/curriculum-loader.ts`, NOT Brain database
- **🚨 ALL 4 seeding routes must include descriptions** — `parent_description`, `why_it_matters`, `quick_guide`, `presentation_steps` — if you add a new seeding route, include all 4 fields!
- **🚨 Supabase connection can timeout** — Use shared client from `lib/supabase-client.ts` (has retry logic). Import `getSupabase` for server-side, `createSupabaseClient` for browser. ALL routes consolidated to this single file.
- **🚨 Report preview has static fallback** — If DB descriptions are NULL, `reports/preview/route.ts` falls back to `loadAllCurriculumWorks()`. This means seeding bugs won't break reports, but existing classrooms seeded before Session 149 may still have NULL descriptions in DB
- **🚨 Static file downloads DON'T work with Turbopack** — `<a href="/guides/file.docx">` will serve HTML, not the file. Use API routes instead (`app/api/guides/*/route.ts`) that read the file with `readFile()` and return with correct `Content-Type` header. See `app/api/guides/language-making-guide/route.ts` for the pattern.
- **🚨 Never use `opacity-0 group-hover:opacity-100` alone** — Invisible on mobile touch devices! Always use `opacity-70 md:opacity-0 md:group-hover:opacity-100` pattern (visible on mobile, hover-reveal on desktop)
- **Focus works stored separately** - `montree_child_focus_works` table, NOT in `montree_child_progress`
- **Area values must match** - Focus table CHECK constraint: 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural' (NOT 'math'!)
- `useSearchParams()` must be wrapped in Suspense boundary (Next.js 16)
- Foreign key: `child_work_completion.child_id` → `children.id` (not montree_children!)
- Progress status mapping in `lib/montree/db.ts` - don't use 'completed'
- Railway rebuilds can take a few minutes
- Next.js can use 6GB+ RAM - kill and restart if machine struggles

## URLs
- **Production**: teacherpotato.xyz
- **Teacher Dashboard**: teacherpotato.xyz/montree
- **Admin**: teacherpotato.xyz/admin

## GitHub
- **Token**: See 1Password or generate new at github.com/settings/tokens (expires May 2, 2026)
- **Repo**: Tredoux555/whale-class
