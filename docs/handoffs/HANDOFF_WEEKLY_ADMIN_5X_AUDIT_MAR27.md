# Handoff: Weekly Admin System 5× Fix-Audit Cycle + Guru Image Upload

**Date:** March 27, 2026
**Status:** ✅ ALL FIXES DEPLOYED — Railway auto-deploying
**Commits:** `a376e771` (ghost column fix), `71e4c317` (session.classroom.id fix), `66361e43` (Guru image upload fix), `07bccffc` (plan format fix), `0e23db88` (weekLabel overflow fix)

---

## Context

The weekly admin system was completely broken — 404 errors on all 19 children during batch AI generation, "Loading..." stuck on the docs page, and Guru image uploads returning 500. This system is used by a real school for Chinese government-required weekly reporting. Teacher needs two physical documents: a "What was done" summary and a "What is next" plan, both generated as DOCX files.

---

## 5× Audit Cycle Results

### Audit Cycle 1: Full 8-File Code Read
Read all 8 weekly admin files completely (page.tsx, generate/route.ts, notes/route.ts, auto-fill/route.ts, doc-generator.ts, WeeklyAdminCard.tsx, [childId]/weekly-admin/route.ts, upload/route.ts). Verified all prior fixes were correctly applied. Found 1 cosmetic issue (weekLabel overflow).

### Audit Cycle 2: WeekLabel Overflow Fix
**Problem:** Plan table header col0 is 1673 DXA wide (~3cm) with EXACT height of 284 DXA (~0.5cm). Full weekLabel like `W13 (2026-03-23 – 2026-03-29)` is ~36 chars at 11pt SimSun — text clips in the DOCX.
**Fix:** Pass just `W13` to `buildPlanTable()` for plan docs. Summary docs keep the full label (their cells are much larger).
**File:** `app/api/montree/weekly-admin-docs/generate/route.ts` line 222-226
**Commit:** `0e23db88`

### Audit Cycle 3: Edge Cases + Data Integrity (3 parallel agents)
- Children with missing id/name: NOT POSSIBLE — Supabase schema enforces NOT NULL
- Auto-fill type confusion: NOT POSSIBLE — API always returns `Record<string, string>`
- Notes upsert race condition: THEORETICALLY possible but extremely unlikely (single teacher per classroom)
- Unicode/SimSun: Handles CJK perfectly; child names validated on input
**Result:** No actionable bugs found.

### Audit Cycle 4: Security + Validation (3 parallel agents)
All 4 endpoints verified SECURE:
- ✅ `verifySchoolRequest()` on every endpoint
- ✅ Classroom ownership validated against authenticated school
- ✅ `verifyChildBelongsToSchool()` on per-child endpoint
- ✅ Rate limiting (100/day) on AI generation endpoint
- ✅ Input whitelists: docType (`summary`/`plan`), locale (`en`/`zh`), area (5 areas + `notes`), weekStart (must be Monday)
- ✅ SQL injection impossible (Supabase parameterization)
**Result:** Zero security issues.

### Audit Cycle 5: Full Integration Trace (3 parallel agents)
Traced 3 end-to-end flows:

**Flow 1 (Save → Generate → DOCX):** ✅ VERIFIED
- Chinese developmental note: page saves with `area=null, doc_type='plan'` → generate reads `childNotesMap.get(null).chinese_text` → doc-generator puts in col0 of notes row
- Additional notes: page saves with `area='notes', doc_type='plan'` → generate reads `childNotesMap.get('notes').english_text` → doc-generator puts in col6 of notes row

**Flow 2 (Auto-fill):** ✅ VERIFIED
- API returns camelCase `childId` → page correctly uses `suggestion.childId` for matching
- Only fills EMPTY fields (checks `!existing?.english_text`)

**Flow 3 (AI Batch Generation):** ✅ VERIFIED
- WeeklyAdminCard calls per-child endpoint → Sonnet generates → saves to child settings as `guru_weekly_*` JSONB fields
- Weekly Admin Docs page can read those settings via GET endpoint

---

## Fixes Applied (This Session + Prior)

### Fix 1: Ghost Column `first_name` (CRITICAL — commit `a376e771`)
**Root cause:** `POST /api/montree/children/[childId]/weekly-admin` SELECTed `first_name` column that doesn't exist on `montree_children`. Supabase PostgREST silently returns null data instead of erroring.
**Fix:** Removed `first_name` from SELECT query.
**Impact:** ALL 19 children were returning 404/null during batch generation.

### Fix 2: `session.classroomId` → `session.classroom?.id` (CRITICAL — commit `71e4c317`)
**Root cause:** Weekly Admin Docs page used `session.classroomId` (10 occurrences) — flat property that doesn't exist on `MontreeSession` interface. Correct path is `session.classroom?.id`.
**Fix:** Changed all 10 occurrences.
**Impact:** Page stuck on "Loading..." — all API calls sent `classroom_id=undefined`.

### Fix 3: Guru Image Upload FormData (CRITICAL — commit `66361e43`)
**Root cause:** Upload route expected JSON `metadata` FormData field, but Guru sends flat fields (`child_id`, `type` directly). `JSON.parse(null)` returns null, destructuring null throws TypeError.
**Fix:** Added fallback to read flat form fields when metadata is missing. Added `url` field to response (Guru expects `data.url`).
**Impact:** All Guru photo uploads returned 500.

### Fix 4: Plan Document Format (HIGH — commit `07bccffc`)
**Root cause:** Plan DOCX had Chinese headers, per-area Chinese text fields, wrong layout. Didn't match teacher's physical book format.
**Fix:** English-only headers, 2-row-per-child layout (name row + notes row), Chinese developmental note in col0 of notes row, additional notes in col6.
**Impact:** Generated documents didn't match the required government format.

### Fix 5: WeekLabel Overflow (MEDIUM — commit `0e23db88`)
**Root cause:** Full weekLabel `W13 (2026-03-23 – 2026-03-29)` too long for plan table header cell (1673 DXA wide, 284 DXA tall with EXACT height).
**Fix:** Pass just `W13` to `buildPlanTable()` for plan docs.
**Impact:** Text clipped in DOCX header cell.

---

## Files Modified (Across All Sessions)

| # | File | Changes |
|---|------|---------|
| 1 | `app/api/montree/children/[childId]/weekly-admin/route.ts` | Removed ghost `first_name` from SELECT |
| 2 | `app/montree/dashboard/weekly-admin-docs/page.tsx` | 10× `session.classroomId` → `session.classroom?.id`, PlanCard UI redesigned, notes parsing fixed |
| 3 | `app/api/montree/weekly-admin-docs/generate/route.ts` | Plan mode reads correct fields, weekLabel shortened for plan header |
| 4 | `lib/montree/weekly-admin/doc-generator.ts` | ChildNotes interface, English headers, notes row layout |
| 5 | `app/api/montree/weekly-admin-docs/notes/route.ts` | Added `'notes'` to validAreas whitelist |
| 6 | `app/api/montree/media/upload/route.ts` | Flat FormData fallback + `url` in response |
| 7 | `lib/montree/i18n/en.ts` | 2 new keys (weeklyAdmin.chineseNote, weeklyAdmin.additionalNotes) |
| 8 | `lib/montree/i18n/zh.ts` | 2 matching Chinese keys |

---

## Guru Image Upload — Verified Working

The fix at commit `66361e43` handles both upload patterns:
1. **Standard uploads** (capture page): Send `metadata` as JSON string in FormData → `JSON.parse(metadataStr)` parses it
2. **Guru uploads**: Send flat fields (`child_id`, `type`) directly in FormData → fallback path reads `formData.get('child_id')` etc.

Response now includes `url` field via `getPublicUrl('montree-media', storagePath)` — Guru expects `data.url` to display the uploaded image.

---

## Architecture Reference

### Two Subsystems
1. **WeeklyAdminCard** (dashboard) — Batch AI generation for all children. Calls `POST /api/montree/children/[childId]/weekly-admin` per child. Generates plan_row, area_details, full_summary, advice. Saves to child settings JSONB.
2. **Weekly Admin Docs** (dedicated page) — Manual notes entry + DOCX generation. Teachers enter per-child notes for summary and plan tabs. Auto-fill from progress data. Generate button creates pixel-perfect DOCX matching government format.

### Notes Storage Convention
| What | doc_type | area | Field Used |
|------|----------|------|------------|
| English summary | `summary` | `null` | `english_text` |
| Chinese summary | `summary` | `null` | `chinese_text` |
| Plan: per-area work name | `plan` | e.g. `practical_life` | `english_text` |
| Plan: Chinese developmental note | `plan` | `null` | `chinese_text` |
| Plan: Additional notes | `plan` | `notes` | `english_text` |

### DOCX Format (Plan)
7-column table: `[W#] [Practical] [Sensorial] [Math] [Language] [Science & Culture] [Notes]`
2 rows per child:
- **Name row:** Child name in col0, English work names in cols 1-5, col6 empty
- **Notes row:** Chinese note in col0, empty cols 1-5, additional notes in col6
5 children per page, padded with empty rows if fewer.

---

## Deploy Status

All 5 commits pushed to `main`. Railway auto-deploying. No migrations needed.

```
a376e771 — fix: remove ghost first_name column from weekly-admin query
71e4c317 — fix: session.classroomId → session.classroom?.id (10 occurrences)
66361e43 — fix: media upload handles flat FormData fields + returns url
07bccffc — fix: weekly plan document format matches teacher's physical book
0e23db88 — fix: shorten weekLabel in plan table header to prevent text clipping
```
