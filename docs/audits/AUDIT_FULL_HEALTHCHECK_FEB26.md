# Full Health Check & Performance Audit — Feb 26, 2026

## Executive Summary

4 deep audits run in parallel across the entire Montree codebase. **73 issues found.**

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 6 | Must fix NOW |
| 🟠 HIGH | 14 | Fix today |
| 🟡 MEDIUM | 28 | Fix this week |
| 🔵 LOW | 25 | Backlog |

---

## 🔴 CRITICAL ISSUES (6)

### C1. Cross-Pollination Security — 5 Routes Still Unprotected
**The Feb 22 security fix (verifyChildBelongsToSchool) was NOT added to:**
- `app/api/montree/media/upload/route.ts`
- `app/api/montree/reports/generate/route.ts`
- `app/api/montree/reports/pdf/route.ts`
- `app/api/montree/reports/send/route.ts`
- `app/api/montree/focus-works/route.ts`

**Risk:** Any authenticated teacher can access/modify ANY child's data across ALL schools.
**Fix:** Add `verifyChildBelongsToSchool()` to each route (5-10 min each).

### C2. Guru Stream Route — Missing verifyChildBelongsToSchool
**File:** `app/api/montree/guru/stream/route.ts`
**Risk:** Stream endpoint fetches child data without verifying school ownership.
**Fix:** Add the check after `verifySchoolRequest()`.

### C3. Reports Route — Missing verifyChildBelongsToSchool on GET
**File:** `app/api/montree/reports/route.ts`
**Risk:** GET with `childId` param returns reports without school verification.

### C4. Media Upload — child_ids Array Not Verified
**File:** `app/api/montree/media/upload/route.ts`
**Risk:** Group photos can be linked to arbitrary children across schools via `child_ids` array.

### C5. Reports Send — Parent Email Exposure
**File:** `app/api/montree/reports/send/route.ts`
**Risk:** Parent email addresses can be exfiltrated by querying arbitrary child_ids.

### C6. .env.local Secrets Exposure
**Note:** `.env.local` contains all API keys, passwords, DB URLs. Verify it's in `.gitignore` and NOT committed to git history. If it was ever committed, rotate ALL secrets on Railway immediately.

---

## 🟠 HIGH ISSUES (14)

### H1-H5. Anthropic Client — 5 Routes Create New Instances Per Call
Instead of using the shared `anthropic` import from `lib/ai/anthropic.ts`, these routes create `new Anthropic({ apiKey })` on every request:
- `app/api/montree/guru/concern/route.ts` (line 189)
- `app/api/montree/guru/daily-plan/route.ts` (line 252)
- `app/api/montree/guru/work-guide/route.ts` (line 167)
- `app/api/montree/guru/quick/route.ts` (line 75)
- `app/api/montree/guru/weekly-review/route.ts` (line 140)

**Fix:** Replace `new Anthropic({ apiKey })` with import `{ anthropic }` from `@/lib/ai/anthropic`.

### H6. No Rate Limiting on ANY Guru Endpoint
**Risk:** A malicious user could spam Sonnet calls ($0.01/each). No rate limiting on `/guru`, `/guru/stream`, `/guru/concern`, `/guru/suggestions`.
**Fix:** Add `checkRateLimit()` (already exists in codebase) to all Guru POST endpoints.

### H7. Hardcoded Haiku Model Strings in 8 Files
Model string `'claude-haiku-4-5-20251001'` is hardcoded in 8 separate files. Some use a constant, some inline the string.
**Fix:** Export `HAIKU_MODEL` from `lib/ai/anthropic.ts`, import everywhere.

### H8. Dashboard-Summary — Silent AI Failures + No Error Logging
**File:** `app/api/montree/guru/dashboard-summary/route.ts`
Both end-of-day and suggestion generation wrap AI calls in empty `try/catch` with no logging.
**Fix:** Add `console.error()` in catch blocks.

### H9. Dashboard-Summary — Fire-and-Forget DB Inserts
Cache inserts use `.then(() => {})` — if they fail, no one knows.
**Fix:** Add `.catch(err => console.error('Cache insert failed:', err))`.

### H10. focus-works — No Input Validation on work_name
POST accepts arbitrary `work_name` without length validation.
**Fix:** Add `if (!work_name || work_name.length > 200)` check.

### H11. dangerouslySetInnerHTML in ConcernDetailModal
**File:** `components/montree/guru/ConcernDetailModal.tsx`
API response injected directly into DOM via `dangerouslySetInnerHTML`.
**Fix:** Use the same `renderInlineBold()` pattern from GuruDashboardCards.

### H12. Middleware — Allows Traffic Through on Supabase Failure
If Supabase client creation fails, middleware returns `NextResponse.next()` allowing ALL requests.
**Fix:** Return 503 error for protected routes when Supabase unavailable.

### H13. Stub Routes Leak error.message
**Files:** `app/api/montree-home/curriculum/`, `families/`, `children/`
3 incomplete stub routes expose database error details to client.
**Fix:** Delete these stub routes (montree-home system was removed) or sanitize errors.

### H14. Guru Concerns POST — No Validation of Concern IDs
**File:** `app/api/montree/guru/concerns/route.ts`
Accepts any string as concern ID without validating against `getAllConcerns()`.
**Fix:** Add `getConcernById()` validation for each submitted ID.

---

## 🟡 MEDIUM ISSUES (28)

### Guru Architecture
- M1. Inconsistent caching strategies across 13 routes (daily/weekly/permanent/none)
- M2. `/guru/quick/route.ts` stores to DB but never reads cache before generating
- M3. `/guru/work-guide/route.ts` doesn't cache at all (generates fresh every call)
- M4. Duplicated freemium increment logic in `/guru/route.ts` (lines 256-265 and 313-323)
- M5. Fragile rate limit detection via string matching on `error.message`
- M6. Sonnet used for free-tier responses (cost issue — Haiku would suffice)

### Frontend
- M7. 4 dead components: GuruDailyBriefing, EndOfDayNudge, GuruSuggestionCard, WeeklyReview
- M8. `guru/page.tsx` is 762 lines — should split into TeacherUI/ParentUI/Paywall/History
- M9. `dashboard/[childId]/page.tsx` is 689 lines with 15+ useState hooks
- M10. `dashboard/page.tsx` has IIFE patterns (80+ lines in inline arrow functions)
- M11. Missing useMemo for repeated `children.find()` lookups
- M12. Missing React error boundaries on key pages
- M13. Missing loading skeletons (GuruDashboardCards returns null while loading)
- M14. GuruContextBubble and GuruFAQSection may be orphaned (no imports found)

### API
- M15. `/observations/route.ts` — no max limit on `limit` and `days` params (DoS risk)
- M16. `/reports/generate/route.ts` — no maximum date range enforced
- M17. `/reports/pdf/route.ts` — unbounded progress query (no LIMIT)
- M18. `/media/route.ts` — loads all photos into memory before pagination
- M19. focus-works POST doesn't validate work_name against curriculum

### TypeScript & Build
- M20. CSP uses `'unsafe-inline'` for scripts (Next.js limitation, documented)
- M21. `npm install --force` in Dockerfile bypasses dependency resolution
- M22. Dockerfile runs as root (no USER directive)
- M23. Middleware session failures not audit-logged

### Accessibility
- M24. Empty `alt=""` on child profile photos
- M25. Missing `aria-label` on toggle buttons in GuruDashboardCards
- M26. Form inputs without associated `<label>` elements in guru/page.tsx
- M27. Weak types: `any` used in library browse, curriculum types, catch blocks
- M28. Hardcoded viewport heights and animation times across components

---

## 🔵 LOW ISSUES (25)

- L1-L4: Various `Record<string, unknown>` type casts defeating type safety
- L5: Unnecessary `.then(() => {})` on ignored promises
- L6: `Suspense` imported but partially utilized
- L7-L8: Missing name fallbacks (child.name could be undefined)
- L9: focus-works GET includes redundant `raw` field in response
- L10: Concerns not database-driven (hardcoded in TypeScript)
- L11: No API documentation for 13 Guru endpoints
- L12: Conversational mode not documented in route JSDoc
- L13: teacher_id naming confusion in conversational mode
- L14-L25: Various hardcoded values, magic numbers, minor code quality items

---

## FOLDER CLEANUP NEEDED

### Root Level Junk (should move/delete)
- `Tredoux_Resume_Draft2.pdf` — personal file, not app code
- `Tredoux_Resume_Tight.html` — personal file
- `CVC_Curriculum_English V3.xlsx` — duplicate (also in assets/)
- `3D Printed Classrooms/` — empty or duplicate of `3d-montessori/`
- `montree/` — appears to be old standalone copy with own package.json
- `jobs/` — single file (`video-discovery-cron.ts`), could go in `scripts/`
- `data/` — procurement JSONs, could go in `lib/data/`
- `curriculum/` — old curriculum assets, overlap with `lib/curriculum/`
- `deploy.sh` — likely outdated (Railway auto-deploys)
- `.env.stripe.example` — merge into `.env.example`

### Docs Folder (155 files!)
- 155 markdown files with no organization
- Mix of handoffs, audits, gameplans, session notes, guides
- Should organize into: `docs/handoffs/`, `docs/audits/`, `docs/guides/`, `docs/archive/`

### Assets Folder (27 files)
- PDFs, XLSX, DOCX, ZIP files
- Mix of personal (resume), curriculum guides, shopping lists, quote posters
- Should separate: `assets/curriculum/`, `assets/personal/`, `assets/marketing/`

---

## RECOMMENDED FIX ORDER

### Phase 1: Critical Security (30 min)
1. Add `verifyChildBelongsToSchool()` to 6 remaining routes
2. Verify .env.local is gitignored

### Phase 2: Guru Cleanup (45 min)
3. Replace 5 `new Anthropic()` calls with shared import
4. Export `HAIKU_MODEL` from lib/ai/anthropic.ts
5. Add error logging to dashboard-summary catch blocks
6. Add rate limiting to Guru POST endpoints
7. Delete 4 dead components
8. Validate concern IDs in concerns POST

### Phase 3: Code Quality (30 min)
9. Delete montree-home stub routes
10. Fix dangerouslySetInnerHTML in ConcernDetailModal
11. Add input validation to focus-works and observations
12. Fix middleware Supabase failure handling

### Phase 4: Folder Cleanup (20 min)
13. Move root junk files to appropriate locations
14. Organize docs/ into subdirectories
15. Remove duplicate/dead folders
16. Delete old standalone montree/ folder

### Phase 5: Frontend Polish (future session)
17. Split large page components
18. Add error boundaries
19. Add loading skeletons
20. Accessibility improvements
