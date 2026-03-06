# Handoff: RAZ Reading Tracker Redesign — Mar 5, 2026

## Summary

Complete UI redesign of the RAZ Reading Tracker (`/montree/dashboard/raz`) from a table-based layout to a status-first rapid-fire camera flow. Also fixed a critical auth bug (401 on all RAZ API calls).

## What Was Built

### RAZ Tracker Page Redesign (`app/montree/dashboard/raz/page.tsx`)

**Before:** Table layout with multiple buttons per student row.

**After:** Card-based status-first UI. Each student card shows 4 status buttons: Read / Not Read / No Folder / Absent. Tapping "Read" triggers a rapid-fire 3-photo camera flow (Book → Signature → New Book) with non-blocking background uploads so there's zero lag between students.

**3 iterations built:**
- v1: Basic redesign with status buttons + camera flow
- v2: Fixed 11 audit issues (race conditions, retake, unmount cleanup)
- v3 (FINAL): Ref-based architecture eliminating all React batching/timing issues

**Key architectural patterns (v3):**
- `flowRef` is the single source of truth for camera state (set synchronously)
- `cameraFlowUI` state exists only to trigger React re-renders
- `sessionRef` and `dateRef` avoid stale closures in callbacks
- `openCamera()` sets ref FIRST, then state, then triggers file input
- Single `handlePhotoCapture` with empty deps array (reads everything from refs)
- Upload merges only the photo URL field, never overwrites status
- Unique upload keys for retakes (`retake-${childId}-${photoType}` vs `${childId}-${photoType}`)
- AbortController cleanup on unmount for all in-flight uploads

**Features:**
- Date picker for historical records
- Green progress banner showing current photo step (e.g. "📸 Joey — Book Photo (1/3)")
- Background uploads with visual indicator (spinning icon on student card)
- Retake any individual photo without re-entering full flow
- Photo thumbnails with tap-to-retake
- Status toggle (tap same status to clear it)
- Save all records in single batch

### RAZ API Auth Fix

**Bug:** All RAZ API routes returned 401 on every request.

**Root cause:** `verifySchoolRequest()` returns `VerifiedRequest | NextResponse`. The RAZ routes checked `auth.valid` which doesn't exist on either type — it's always `undefined`, so `!auth.valid` is always `true`.

**Fix:** Changed to `if (auth instanceof NextResponse) return auth;` pattern (same as all other Montree API routes). 4 instances across 2 files.

**Files:**
- `app/api/montree/raz/route.ts` — 3 handlers (GET, POST, PATCH)
- `app/api/montree/raz/upload/route.ts` — 1 handler (POST)

## Audit History

**Audit Round 1 (11 issues found, all fixed in v2):**
1. CRITICAL: Upload response overwrites status in local state → merge only photo URL field
2. CRITICAL: Concurrent camera flows possible → busy state guard
3. CRITICAL: Failed setStatus still starts camera → await status, only start camera on success
4. HIGH: Double-tap Read opens camera twice → busy guard
5. HIGH: No retake functionality → added retakePhoto with oneShot mode
6. HIGH: File input not reset → reset before every .click()
7. MEDIUM: Toggle-off doesn't persist → calls setStatus('not_read')
8. MEDIUM: No unmount cleanup → mountedRef + AbortController
9. LOW: Various minor issues

**Audit Round 2 (5 new issues from v2 fixes, all fixed in v3):**
1. CRITICAL: oneShot ref/state sync timing due to React batching → moved into flowRef
2. CRITICAL: uploadAbortRef key collisions between normal and retake → unique prefix
3. CRITICAL: handlePhotoCaptureWrapped closure staleness → refs + empty deps
4. HIGH: cameraFlowRef sync timing → flowRef set synchronously in openCamera()
5. MEDIUM: Various timing issues → single ref architecture

## Files Changed

### New/Rewritten (1):
- `app/montree/dashboard/raz/page.tsx` — Complete rewrite (~600 lines), 3 iterations

### Modified (2):
- `app/api/montree/raz/route.ts` — Auth fix: `auth.valid` → `auth instanceof NextResponse` (3 instances)
- `app/api/montree/raz/upload/route.ts` — Auth fix: same pattern (1 instance)

## Deploy Status

- ✅ `raz/page.tsx` — Pushed earlier in session
- ⚠️ Auth fix (route.ts + upload/route.ts) — **NEEDS PUSH** (VM disk full, user applying fix manually via terminal)
  - The fix: replace `if (!auth.valid) { return NextResponse.json(...) }` with `if (auth instanceof NextResponse) return auth;` in 4 places
  - Python command provided to user for applying fix

## Migration 134 (Feature Toggles + RAZ Tracker)

Migration 134 was run this session. It creates:
- `montree_feature_toggles` — feature flag table
- `montree_school_features` — per-school feature enablement
- `montree_feature_audit_log` — feature change audit trail
- `montree_raz_records` — RAZ reading tracker records (child_id, date, status, 3 photo URLs)
- 6 default features seeded (voice_observations, raz_tracker, parent_portal_v2, guru_brain, community_library, advanced_reports)

## Known Issues

- VM disk full — prevented git operations from Cowork VM this session
- Auth fix may need manual application on Mac if Python command fails (zsh `!` escaping issues)
- If auth fix not applied: RAZ tracker will show students but 401 on every Read/Save action

## Testing

1. Go to `/montree/dashboard/raz`
2. Students should load (19 kids)
3. Tap "Read" on any student → camera should open (no 401)
4. Take 3 photos in sequence (Book → Signature → New Book)
5. Notice no lag — uploads happen in background
6. Tap Save to persist all records
