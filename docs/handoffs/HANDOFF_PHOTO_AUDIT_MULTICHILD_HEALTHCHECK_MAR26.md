# Handoff: Photo Audit Multi-Child Tagging + Untagged Bug Fix + Health Checks (Mar 26, 2026)

## Summary

Three issues fixed in one session: (1) photos showing as "Untagged" despite successful Smart Capture identification, (2) no way to tag multiple children to a single photo from the photo-audit page, and (3) health check issues across several API routes.

---

## Fix 1: Untagged Photo Bug — work_key Fallback (CRITICAL)

**Root cause:** Smart Capture identifies a work via CLIP/Haiku but only persists `work_id` on `montree_media` if the classroom curriculum lookup (`.ilike()` on `montree_classroom_curriculum_works.name`) succeeds. When the AI returns a slightly different name than what's in the curriculum (e.g., "Pouring Water" vs "Pouring"), the lookup fails silently and `work_id` stays NULL — causing the photo to appear as "Untagged" despite successful identification.

**Fix:** Added `work_key` fallback lookup on both identification paths:

1. **CLIP path** (line ~821): Changed `const classroomWorkId` to `let classroomWorkId`. When `.ilike()` on name fails, falls back to `.eq('work_key', clipDecision.clipResult.work_key)` query.

2. **Two-pass path** (line ~1818): After parallel name-based lookup via `.ilike()`, added identical `work_key` fallback using `finalWorkKey` variable from curriculum matching.

Both paths use `.maybeSingle()`, try-catch wrapping, and diagnostic logging.

**File:** `app/api/montree/guru/photo-insight/route.ts` — 2 sections modified

---

## Fix 2: Multi-Child Photo Tagging (HIGH)

**Problem:** Photos with multiple children only showed one child tagged. No UI existed to tag additional children from the photo-audit page.

**Architecture:**
- `montree_media` has single `child_id` column (primary child)
- `montree_media_children` junction table already existed with UNIQUE(media_id, child_id)
- Upload endpoint already supports `child_ids` array

### Backend Changes

**New endpoint: `POST /api/montree/media/children`** (139 lines)
- 3 actions: `add` (single child), `remove` (single child), `set` (replace all children)
- Auth via `verifySchoolRequest`, validates media belongs to school, validates all children belong to school
- Manages primary `child_id` on `montree_media`: sets on first add, reassigns to first remaining on remove, syncs on set
- Uses `.maybeSingle()` throughout, proper error handling

**Modified: `app/api/montree/audit/photos/route.ts`**
- Added `montree_media_children` junction table query to Step 4 parallel enrichment
- Built `multiChildMap` (Map<string, Set<string>>) for efficient lookup
- Added secondary fetch for junction-table-only children not in initial childMap
- Response now includes `child_ids[]` and `child_names[]` per photo

### Frontend Changes

**Modified: `app/montree/dashboard/photo-audit/page.tsx`**
- `AuditPhoto` interface: added `child_ids: string[]`, `child_names: string[]`
- New state: `classroomChildren`, `taggingPhoto`, `taggingSelection`, `taggingSaving`
- `useEffect` fetches all classroom children on mount (sorted alphabetically)
- `handleOpenChildTagger(photo)` — opens modal, pre-selects existing children
- `handleToggleChild(childId)` — toggles child in selection set
- `handleSaveChildTags()` — calls `/api/montree/media/children` with `action: 'set'`, updates local photos state
- Child Tagger Modal: full-screen overlay with photo thumbnail, checkbox list, save/cancel buttons
- AuditPhotoCard: multi-child name display with clickable `👶+` icon to open tagger

### i18n (5 new keys, perfect EN/ZH parity)
- `audit.tagChildren`, `audit.taggedChildren`, `audit.noChildrenTagged`, `audit.childTagUpdated`, `audit.childTagFailed`

---

## Fix 3: Health Check Issues (MEDIUM)

### `.single()` → `.maybeSingle()` fixes (prevents runtime crashes on 0 rows)

1. **`app/api/montree/reports/available-photos/route.ts`** (line 38) — child lookup query
2. **`app/api/montree/guru/route.ts`** (line 151) — classroom verification query
3. **`app/api/montree/guru/route.ts`** (line 168) — child settings query in greeting handler
4. **`app/api/montree/guru/route.ts`** (line 170) — last interaction query in greeting handler

### Describe route validation strengthened

**`app/api/montree/classroom-setup/describe/route.ts`** (lines 145-151)
- Previously only checked `visual_description` for presence
- Now checks all 3 required string fields: `visual_description`, `parent_description`, `why_it_matters`
- Ensures `key_materials` and `negative_descriptions` arrays are present (Sonnet sometimes omits them)
- Added diagnostic logging on incomplete results

---

## Files Summary

**Files Created (1):**
1. `app/api/montree/media/children/route.ts` — NEW (139 lines)

**Files Modified (7):**
1. `app/api/montree/guru/photo-insight/route.ts` — work_key fallback on CLIP + two-pass paths
2. `app/api/montree/audit/photos/route.ts` — junction table query + multi-child response
3. `app/montree/dashboard/photo-audit/page.tsx` — child tagger modal + multi-child display
4. `app/api/montree/reports/available-photos/route.ts` — .maybeSingle() fix
5. `app/api/montree/guru/route.ts` — 3× .maybeSingle() fixes
6. `app/api/montree/classroom-setup/describe/route.ts` — validation strengthening
7. `lib/montree/i18n/en.ts` — 5 new keys
8. `lib/montree/i18n/zh.ts` — 5 matching Chinese keys

**No migrations needed.** Junction table `montree_media_children` already exists.

---

## Deploy

⚠️ NOT YET PUSHED. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add \
  app/api/montree/guru/photo-insight/route.ts \
  app/api/montree/media/children/route.ts \
  app/api/montree/audit/photos/route.ts \
  app/montree/dashboard/photo-audit/page.tsx \
  app/api/montree/reports/available-photos/route.ts \
  app/api/montree/guru/route.ts \
  app/api/montree/classroom-setup/describe/route.ts \
  lib/montree/i18n/en.ts \
  lib/montree/i18n/zh.ts \
  docs/handoffs/HANDOFF_PHOTO_AUDIT_MULTICHILD_HEALTHCHECK_MAR26.md \
  CLAUDE.md
git commit -m "fix: photo audit multi-child tagging + untagged bug fix + health checks"
git push origin main
```
