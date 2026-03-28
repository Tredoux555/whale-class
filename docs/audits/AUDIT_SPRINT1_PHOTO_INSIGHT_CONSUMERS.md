# Sprint 1 Photo-Insight API Consumer Audit
## Teacher OS: CLIP-Direct Photo Identification

**Audit Date**: Mar 28, 2026
**Sprint**: Teacher OS Sprint 1 — Simplify photo-insight route
**Scope**: All consumers of the photo-insight API and photo-insight-store

---

## Key Sprint 1 Changes

The photo-insight API now returns CLIP results directly without Haiku verification:

| Field | Sprint 0 | Sprint 1 |
|-------|----------|----------|
| `classification_method` | `'clip_enriched'` | `'clip_direct'` |
| `mastery_evidence` | Haiku assessment string (e.g., `'mastered'`) | Always `null` |
| `auto_updated` | Conditional on Haiku confidence | Always `false` |
| `needs_confirmation` | Conditional on Haiku confidence | Always `true` |
| `confidence` | Haiku confidence (0-1) | CLIP confidence (0-1) |
| `suggested_crop` | Haiku crop suggestion | Always `null` |
| `insight` | Haiku observation text | Simple `"Identified: {workName}"` |

**Rationale**: Sprint 1 simplifies to CLIP-only classification, removing expensive Haiku enrichment. Teachers now explicitly choose status via PhotoInsightPopup instead of auto-inferred from API.

---

## Consumer Audit Results

### 1. ✅ CLEAN: PhotoInsightButton.tsx
**File**: `components/montree/guru/PhotoInsightButton.tsx` (550+ lines)

**What it does**:
- Subscribes to global photo-insight-store via `useSyncExternalStore`
- Reads: `auto_updated`, `needs_confirmation`, `mastery_evidence`, `work_name`, `area`, `insight`
- Shows UI based on zone: GREEN (auto-updated), AMBER (confirm/reject), RED (teach work)
- Handles scenarios: A (unknown), B (not in classroom), C (not on shelf), D (happy path)

**Sprint 1 Behavior**:
- Line 95: `auto_updated` useEffect never fires (always `false`) — GREEN zone indicator never shows ✓ CORRECT
- Line 381: Status label pill hidden (mastery_evidence always `null`) ✓ CORRECT
- Line 476: AMBER zone always visible (needs_confirmation always `true`) ✓ CORRECT
- Line 465: Insight shows "🌿 Identified: Bead Board" ✓ CORRECT

**Verdict**: ✅ **FULLY COMPATIBLE**

**Why it works**: Component was already designed to handle conditional zones via `auto_updated` and `needs_confirmation` boolean checks. Sprint 1 just flips these to always `false`/`true` respectively, which component handles correctly.

**Status**: NO CHANGES REQUIRED

---

### 2. 🔴 CRITICAL: photo-audit/page.tsx
**File**: `app/montree/dashboard/photo-audit/page.tsx` (lines 844-860)

**What it does**:
- Batch-analyzes pending audit queue (teacher uploads photos to review)
- Counts GREEN/AMBER/RED/CUSTOM zones to show progress
- Uses fields: `needs_confirmation`, `auto_updated`, `custom_work_proposal`

**Vulnerable Code** (lines 844-860):
```typescript
const retryData = await retryRes.json();
if (retryData.needs_confirmation) results.amber++;      // ❌ BUG
else if (retryData.auto_updated) results.green++;       // ❌ BUG
else results.red++;                                      // ❌ BUG
if (retryData.custom_work_proposal) results.custom++;
```

**What breaks in Sprint 1**:
1. Sprint 1 returns `needs_confirmation: true` (ALWAYS) → ALL photos count as AMBER
2. Sprint 1 returns `auto_updated: false` (ALWAYS) → NO photos count as GREEN
3. **Result**: Counter shows "0 GREEN, 100 AMBER, 0 RED" — completely wrong

**Impact**:
- Teacher sees misleading stats (looks like every photo needs manual review)
- Cannot distinguish between identified vs unidentified vs errors
- Cannot see at-a-glance GREEN (auto-updated) progress anymore
- User experience degrades significantly

**Fix Required**:
```typescript
// NEW LOGIC FOR SPRINT 1
if (retryData.work_name && !retryData.error) {
  results.amber++;  // Identified — teacher must explicitly confirm
} else if (!retryData.work_name && !retryData.error) {
  results.red++;    // No match — teacher must pick work manually
} else {
  results.red++;    // Error — network/timeout/server error
}
if (retryData.custom_work_proposal) results.custom++;
```

**Verdict**: 🔴 **CRITICAL BREAKING CHANGE**

**Status**: ⚠️ **MUST FIX BEFORE SPRINT 1 DEPLOYMENT**

---

### 3. ✅ CLEAN: capture/page.tsx
**File**: `app/montree/dashboard/capture/page.tsx` (line 13)

**Usage**: Imports `startAnalysis` from photo-insight-store
**What it does**: Calls `startAnalysis(mediaId, childId, locale)` after photo capture

**Verdict**: ✅ **FULLY COMPATIBLE**

**Why**: Just kicks off async analysis. Doesn't read or depend on response shape. Works unchanged with Sprint 1.

**Status**: NO CHANGES REQUIRED

---

### 4. ✅ CLEAN: gallery/page.tsx
**File**: `app/montree/dashboard/[childId]/gallery/page.tsx` (lines 13-15)

**Usage**: Imports `PhotoInsightButton`, renders it at line 996

**Verdict**: ✅ **FULLY COMPATIBLE**

**Why**: Delegates all response handling to PhotoInsightButton (which is compatible). No direct field access.

**Status**: NO CHANGES REQUIRED

---

### 5. ✅ CLEAN: progress/page.tsx
**File**: `app/montree/dashboard/[childId]/progress/page.tsx` (line 13)

**Usage**: Imports `PhotoInsightButton`, renders it

**Verdict**: ✅ **FULLY COMPATIBLE**

**Why**: Only renders PhotoInsightButton. No direct field access.

**Status**: NO CHANGES REQUIRED

---

### 6. ✅ CLEAN: sync-manager.ts & queue-store.ts
**Files**:
- `lib/montree/offline/sync-manager.ts` (line 20)
- `lib/montree/offline/queue-store.ts` (implicit)

**Usage**: Imports `startAnalysis` from photo-insight-store

**Verdict**: ✅ **FULLY COMPATIBLE**

**Why**: Only calls `startAnalysis()`, doesn't read response fields. Store handles API interaction.

**Status**: NO CHANGES REQUIRED

---

### 7. ⚠️ MEDIUM: photo-insight-store.ts
**File**: `lib/montree/photo-insight-store.ts` (lines 52-62)

**Issue**: Comments claim backward-compat fields are "mapped from v2 status", but API returns them directly:

```typescript
// OUTDATED COMMENT
/** @deprecated v1 compat — mapped from v2 status: true when status='identified' */
needs_confirmation?: boolean;
```

**Reality** (photo-insight/route.ts line 892-893):
```typescript
// API returns hardcoded values, NOT store-mapped
auto_updated: false,
needs_confirmation: true,
```

**Verdict**: ⚠️ **OUTDATED DOCUMENTATION**

**Impact**: Low — code works correctly. Comments just need updating for clarity.

**Fix**:
```typescript
/** @deprecated v1 compat — Sprint 1 always false (teacher OS: explicit status via popup) */
auto_updated?: boolean;
/** @deprecated v1 compat — Sprint 1 always true (teacher OS: explicit confirmation required) */
needs_confirmation?: boolean;
```

**Status**: SHOULD FIX (documentation/clarity)

---

## Summary Table

| Consumer | File | Issues | Severity | Status | Fix |
|----------|------|--------|----------|--------|-----|
| **PhotoInsightButton** | components/montree/guru/PhotoInsightButton.tsx | Works correctly with Sprint 1 behavior | - | ✅ COMPATIBLE | None |
| **photo-audit page** | app/montree/dashboard/photo-audit/page.tsx | Zone counting logic broken (if-else chain) | **CRITICAL** | 🔴 BREAKING | Update zone logic |
| **capture page** | app/montree/dashboard/capture/page.tsx | None | - | ✅ COMPATIBLE | None |
| **gallery page** | app/montree/dashboard/[childId]/gallery/page.tsx | None (delegates) | - | ✅ COMPATIBLE | None |
| **progress page** | app/montree/dashboard/[childId]/progress/page.tsx | None (delegates) | - | ✅ COMPATIBLE | None |
| **sync-manager** | lib/montree/offline/sync-manager.ts | None | - | ✅ COMPATIBLE | None |
| **photo-insight-store** | lib/montree/photo-insight-store.ts | Outdated comments | LOW | ⚠️ COMPATIBLE | Update docs |

---

## Recommendations

### 🔴 Must Fix (Blocking)
1. **photo-audit/page.tsx (lines 844-860)**
   - Update zone-counting conditional logic
   - Test with Sprint 1 API responses
   - Verify counter shows correct AMBER/RED/CUSTOM splits

### ⚠️ Should Fix (Quality)
2. **photo-insight-store.ts (lines 52-62)**
   - Update deprecation comments to reflect Sprint 1 hardcoded values
   - Clarify that these fields are ALWAYS false/true, not computed

### 📝 Optional (Informational)
3. **PhotoInsightButton.tsx (line 95)**
   - Add comment explaining that `auto_updated: false` in Sprint 1 means teacher must manually confirm
   - Document the change from auto-update to explicit-status model

---

## Data Flow (Sprint 1)

```
Teacher takes photo or uploads from album
  ↓
startAnalysis(mediaId, childId, locale)
  ↓
POST /api/montree/guru/photo-insight
  ↓
CLIP classification executed (no Haiku enrichment)
  Response:
    - classification_method: 'clip_direct' ✓
    - mastery_evidence: null ✓
    - auto_updated: false ✓
    - needs_confirmation: true ✓
    - confidence: CLIP confidence ✓
    - insight: "Identified: {work_name}" ✓
  ↓
Returned to photo-insight-store subscribers
  ↓
PhotoInsightButton re-renders:
  - Work name + area badge (✓ shown)
  - Insight text (✓ shown)
  - Status label pill (✗ hidden — mastery_evidence: null)
  - AMBER zone confirm/reject buttons (✓ ALWAYS shown)
  - GREEN zone auto-updated banner (✗ NEVER shown — auto_updated: false)
  ↓
Teacher clicks "Confirm" or "Reject" button
  OR photo-audit counts zones (need FIX at line 844-860)
  ↓
Teacher explicitly chooses status via PhotoInsightPopup (NEW in Teacher OS)
```

---

## Backward Compatibility Assessment

**Question**: Will Sprint 1 API break old clients that expect Haiku enrichment?

**Answer**: NO — by design. Sprint 1 intentionally removes Haiku enrichment:
- Cheaper (CLIP only, no Haiku call)
- Simpler (no complex scenario logic)
- More explicit (teacher chooses status, not auto-inferred)

**Consumers that read `mastery_evidence`** (PhotoInsightButton.tsx line 381):
- Will receive `null` instead of string
- Will not show status label pill
- This is CORRECT behavior for Sprint 1
- Teacher picks status via PhotoInsightPopup, not from API

---

## Conclusion

**Total Issues Found**: 2
- **1 CRITICAL**: photo-audit zone counting (if-else logic)
- **1 LOW**: photo-insight-store documentation

**Compatibility Status**: ✅ **6/7 consumers fully compatible**
**Deployment Readiness**: ⚠️ **Blocked on photo-audit fix**

**Estimated Fix Time**: 30 minutes (update 1 if-else block in photo-audit/page.tsx)
