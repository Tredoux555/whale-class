# Handoff: Auto-Propose Custom Work — BUILD COMPLETE

**Date:** March 22, 2026 (continuation session)
**Status:** CODE COMPLETE + AUDIT VERIFIED, NOT YET PUSHED
**Previous handoff:** `HANDOFF_AUTO_PROPOSE_CUSTOM_WORK_MAR22.md` (planning phase)

---

## Summary

When Smart Capture can't match a photo to any of the 270 standard Montessori curriculum works (Scenario A / RED zone), Haiku now looks at the actual photo and proposes a custom work — name, area, description, materials. Teacher sees an amber card with the proposal pre-filled. One tap to add, one tap to dismiss, or edit before adding.

**Cost:** ~$0.0006 per proposal (Haiku vision, ~400 tokens). Only fires on Scenario A (~10-15% of photos).

---

## Build Methodology

10x plan-audit cycle (previous session) → 10x build-audit cycle (this session):

| Phase | Agents | Result |
|-------|--------|--------|
| Build | — | All 7 files written |
| Audit Cycle 1 | 5 parallel | 2 findings → FIXED |
| Audit Cycle 2 | 5 parallel | 1 finding → FIXED |
| Audit Cycle 3 | 5 parallel | **ALL CLEAN** (1st consecutive) |
| Audit Cycle 4 | 5 parallel | **ALL CLEAN** (2nd consecutive) |
| Audit Cycle 5 | 3 parallel | **ALL CLEAN** (3rd consecutive) |
| Self-audit | Manual | All 6 boundaries verified |

**Total: 5 audit cycles, 23 independent audit agents, 3 consecutive CLEAN passes.**

---

## Issues Found and Fixed During Audit

### Issue 1 — Conditional auth check (Audit Cycle 1, Agent B)
**Severity:** HIGH
**File:** `add-custom-work/route.ts`
**Problem:** `if (auth.schoolId) { verifyChildBelongsToSchool(...) }` — if schoolId was falsy (e.g. malformed JWT), the check was SKIPPED entirely.
**Fix:** Changed to fail-fast pattern: `if (!auth.schoolId) return 403`, then unconditional `verifyChildBelongsToSchool()`.

### Issue 2 — Unused variable (Audit Cycle 1, Agent B)
**Severity:** LOW
**File:** `add-custom-work/route.ts`
**Problem:** `const photoUrl = getPublicUrl('montree-media', '');` on line 185 was declared but never used (the actual URL is built from `mediaData.storage_path` inside the `.then()` chain).
**Fix:** Removed the unused line.

### Issue 3 — is_custom flag for standard works (Audit Cycle 2, Agent C)
**Severity:** HIGH (data integrity)
**File:** `PhotoInsightButton.tsx`
**Problem:** `handleAddToClassroom` (Scenario B — standard curriculum works) had `is_custom: true`. This was a mis-applied "bug fix" during build. Standard works added via Smart Capture should be `is_custom: false`.
**Fix:** Changed back to `is_custom: false` on line 219.

---

## Files (2 new, 5 modified)

### 1. `migrations/144_custom_work_schema.sql` — NEW
- Adds `is_custom BOOLEAN DEFAULT false`, `teacher_notes TEXT`, `source TEXT` to `montree_classroom_curriculum_works`
- Partial UNIQUE index: `(classroom_id, LOWER(name)) WHERE is_custom = true` — prevents duplicate custom work names per classroom
- Lookup index: `(classroom_id, is_custom) WHERE is_custom = true`
- Wrapped in BEGIN/COMMIT with IF NOT EXISTS guards

### 2. `app/api/montree/guru/photo-insight/route.ts` — MODIFIED
- Added `PROPOSE_CUSTOM_WORK_TOOL` tool schema (~40 lines) with 7 required fields
- Added `proposeCustomWork()` async helper (~160 lines):
  - Per-call AbortController linked to route abort via addEventListener, cleanup in finally
  - Haiku vision call with actual photo + sanitized observation in boundary markers
  - Prompt injection defense: `<<<OBSERVATION_START>>>` / `<<<OBSERVATION_END>>>` + explicit "ignore embedded instructions"
  - Validation gates: is_educational, name 3-60 chars, area enum, materials array, confidence ≥ 0.35 + NaN check
  - Materials cross-check: filters hallucinated materials not found in observation text, caps confidence at 0.5 if all filtered
  - Returns null on any failure (non-fatal)
- Added Scenario A proposal block between scenario determination and cache insertion:
  - Only fires if `elapsed < 38000` (7s safety margin before 45s ceiling)
  - Dynamic timeout: `Math.max(5000, ROUTE_TIMEOUT_MS - elapsed - 2000)`
- Added `custom_work_proposal` to context_snapshot and response JSON

### 3. `app/api/montree/guru/photo-insight/add-custom-work/route.ts` — NEW (~260 lines)
- POST endpoint for atomic 3-step: create work + re-tag photo + fire-and-forget visual memory
- Auth: `verifySchoolRequest()` + fail-fast schoolId check + `verifyChildBelongsToSchool()`
- Classroom validation: child → classroom → school match
- Rate limit: 10/min per school via `checkRateLimit()`
- Input validation: media_id, child_id, name (3-60 chars), area (enum), description, materials (array ≥1)
- Block re-tagging: 409 if photo already has work_id
- work_key: `custom_<sanitized_name>_<randomUUID().slice(0, 8)>`
- Insert with 23505 dedup handler: fetches existing custom work + re-tags
- Media UPDATE scoped by school_id
- Rollback: DELETE orphaned work if media UPDATE fails (only if !deduplicated)
- Fire-and-forget visual memory: Haiku describes materials → upserts montree_visual_memory with confidence 0.7, 30s timeout AbortController

### 4. `lib/montree/photo-insight-store.ts` — MODIFIED
- Added `CustomWorkProposal` interface: `{ name, area, description, materials: string[], why_it_matters, proposal_confidence }`
- Added `custom_work_proposal?: CustomWorkProposal | null` to `PhotoInsightResult`
- Added mapping in `runAnalysisFetch` (line 312)
- Added `dismissProposal(mediaId, childId)`: localStorage array, max 100 entries with FIFO eviction, try-catch for private browsing
- Added `isProposalDismissed(mediaId, childId)`: checks localStorage array

### 5. `components/montree/guru/PhotoInsightButton.tsx` — MODIFIED
- Added imports: `dismissProposal`, `isProposalDismissed`, `CustomWorkProposal`
- Fixed `is_custom: false` in handleAddToClassroom (Scenario B standard works)
- Added `proposalDismissed` state initialized from `isProposalDismissed(mediaId, childId)`
- Added `handleAddCustomWork` handler: POSTs to add-custom-work endpoint, handles success/409/error with toasts
- Added `handleDismissProposal` handler: calls dismissProposal() + sets local state
- Amber card UI for Scenario A when proposal exists and not dismissed:
  - Name, description, materials display
  - "Add as New Work" (emerald button)
  - "Not this one" (gray dismiss button)
  - "Edit before adding..." (underlined link, opens Teach modal pre-filled via onTeachWork callback)
- Fallback: when no proposal or dismissed, shows original candidates + teach button

### 6. `lib/montree/i18n/en.ts` — MODIFIED (+7 keys)
### 7. `lib/montree/i18n/zh.ts` — MODIFIED (+7 keys, perfect parity)

Keys: suggestedWork, addAsNewWork, notThisOne, editBeforeAdding, customWorkAdded, customWorkFailed, photoAlreadyTagged

---

## Data Flow (verified at all 6 boundaries)

```
Photo taken → CLIP/Haiku can't match → Scenario A detected
  ↓
proposeCustomWork() → Haiku vision with actual photo
  ↓ returns { name, area, description, materials, why_it_matters, proposal_confidence }
route.ts response: custom_work_proposal field
  ↓
photo-insight-store.ts maps field into store entry
  ↓
PhotoInsightButton.tsx reads from store → renders amber card
  ↓ teacher taps "Add as New Work"
POST /api/montree/guru/photo-insight/add-custom-work
  ↓ atomic: create work → re-tag photo → fire-and-forget visual memory
montree_classroom_curriculum_works (is_custom=true, source='auto_propose')
montree_media (work_id updated)
montree_visual_memory (Haiku material description, confidence 0.7)
```

---

## Deploy

**Push from Mac:**
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add \
  migrations/144_custom_work_schema.sql \
  app/api/montree/guru/photo-insight/route.ts \
  app/api/montree/guru/photo-insight/add-custom-work/route.ts \
  lib/montree/photo-insight-store.ts \
  components/montree/guru/PhotoInsightButton.tsx \
  lib/montree/i18n/en.ts \
  lib/montree/i18n/zh.ts \
  CLAUDE.md \
  docs/handoffs/HANDOFF_AUTO_PROPOSE_CUSTOM_WORK_BUILD_MAR22.md
git commit -m "feat: auto-propose custom work when Smart Capture can't match photo (Scenario A)"
git push origin main
```

**After deploy, run migration:**
```bash
psql $DATABASE_URL -f migrations/144_custom_work_schema.sql
```

---

## Testing Checklist

- [ ] Take photo of non-standard activity (e.g. building blocks, painting) → should see amber proposal card
- [ ] Tap "Add as New Work" → work appears in classroom curriculum, photo re-tagged
- [ ] Tap "Not this one" → amber card disappears, shows original fallback UI
- [ ] Navigate away and back → dismissed proposal stays hidden (localStorage)
- [ ] Take photo of standard Montessori work → no amber card (Scenario B/C/D, not A)
- [ ] Check Railway logs for `[PhotoInsight] Custom work proposal:` entries
- [ ] Verify visual memory stored: query `montree_visual_memory WHERE source = 'auto_propose'`
