# Photo Audit Page — Plan v2 (Post-Audit)

## Overview
Dedicated page at `/montree/dashboard/photo-audit` for teachers/principals to review and correct Smart Capture classifications. For intensive auditing during early school onboarding.

## Architecture Decisions (from Plan v1 audit)

### D1: No guru_interactions JOIN
`montree_guru_interactions` stores confidence in `context_snapshot` JSONB, keyed by TEXT `question = 'photo:{media_id}:{child_id}'`. No FK. 
**Fix:** Separate batch query — construct cache keys from media results, batch-fetch with `.in('question', keys)`, extract `context_snapshot.sonnet_confidence ?? context_snapshot.haiku_confidence`.

### D2: Flat zone tabs, not grouped-by-child
4 tabs: ALL | GREEN | AMBER | RED | UNTAGGED. Flat photo grid. Each card shows child name + thumbnail + classification.

### D3: Fire-and-forget Haiku for corrections
Uses EXISTING `POST /api/montree/guru/corrections` endpoint per photo (not batch). Haiku visual memory already fires in background. Sequential calls with 200ms delay for batch operations.

### D4: Reuse existing components
- WorkWheelPicker for work selection (already in gallery)
- PATCH /api/montree/media for tagging
- POST /api/montree/guru/corrections for corrections
- Standard verifySchoolRequest() auth

### D5: Pagination + Security
- Hard limit: 200 photos max, default 50
- Scoped to auth.classroomId (teachers) or auth.schoolId (principals)
- Date range filter: default last 7 days

---

## Files to Create (3 new)

### 1. `app/api/montree/audit/photos/route.ts` (~180 lines)
**GET endpoint** — Fetches photos with confidence data for audit view.

**Query params:**
- `classroom_id?: string` — For principals (teachers auto-use auth.classroomId)
- `zone?: 'green'|'amber'|'red'|'untagged'|'all'` — Default 'all'
- `date_from?: string` — ISO date, default 7 days ago
- `date_to?: string` — ISO date, default now
- `limit?: number` — 1-200, default 50
- `offset?: number` — default 0

**Implementation (4 parallel queries):**
1. Auth: `verifySchoolRequest(request)` → determine effectiveClassroomId
2. Query 1: `montree_media` with school/classroom/date filters, ORDER BY captured_at DESC
3. Query 2: `montree_children` batch for distinct child_ids → name map
4. Query 3: `montree_classroom_curriculum_works` batch for distinct work_ids → name/area map
5. Query 4: `montree_guru_interactions` batch with `.in('question', cacheKeys)` → confidence map
   - Cache keys constructed as `photo:{media_id}:{child_id}` from media results
   - Extract: `snapshot.sonnet_confidence ?? snapshot.haiku_confidence`
6. Zone classification (server-side):
   - GREEN: work_id NOT NULL AND confidence >= 0.85
   - AMBER: work_id NOT NULL AND (confidence < 0.85 OR confidence IS NULL)
   - RED: work_id NOT NULL AND confidence < 0.50
   - UNTAGGED: work_id IS NULL
7. Apply zone filter, return paginated results + zone counts

**Response shape:**
```json
{
  "success": true,
  "photos": [{
    "id": "uuid", "child_id": "uuid", "child_name": "Jimmy",
    "work_id": "uuid|null", "work_name": "Threading Beads|null",
    "area": "practical_life|null", "confidence": 0.92,
    "zone": "green", "thumbnail_url": "...", "captured_at": "..."
  }],
  "total": 44,
  "counts": { "green": 20, "amber": 10, "red": 5, "untagged": 9 },
  "limit": 50, "offset": 0
}
```
Cache-Control: `private, max-age=30, stale-while-revalidate=60`


### 2. `app/montree/dashboard/photo-audit/page.tsx` (~650 lines)
**Client page** — Photo audit grid with zone tabs.

**State:**
- photos: AuditPhoto[], counts: ZoneCounts, loading: boolean
- zone: 'all'|'green'|'amber'|'red'|'untagged'
- dateRange: { from: string, to: string }
- page: number (0-indexed)
- correctingPhoto: AuditPhoto | null (photo being corrected)
- selectedIds: Set<string> (batch selection)
- batchProcessing: boolean, batchProgress: { current: number, total: number }

**Layout:**
```
┌─────────────────────────────────────────────┐
│ 📋 Photo Audit           [Last 7d ▾] [← Back]│
├─────────────────────────────────────────────┤
│ [ALL (44)] [GREEN (20)] [AMBER (10)]        │
│ [RED (5)]  [UNTAGGED (9)]                   │
├─────────────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐    │
│ │ photo │ │ photo │ │ photo │ │ photo │    │
│ │ Jimmy │ │ Kevin │ │ Lucky │ │ Amy   │    │
│ │Thread.│ │Bead St│ │ ???   │ │Sandp. │    │
│ │ ✅ 92%│ │ ⚠️ 71%│ │ ❌    │ │ ✅ 95%│    │
│ │[✓][✏️] │ │[✓][✏️] │ │  [✏️] │ │[✓][✏️] │    │
│ └───────┘ └───────┘ └───────┘ └───────┘    │
├─────────────────────────────────────────────┤
│ Batch: [5 selected — Confirm All | Correct] │
│ [← Prev]  Page 1 of 1  [Next →]            │
└─────────────────────────────────────────────┘
```

**Photo Card contents:**
- Thumbnail (80x80, object-cover, auto_crop via CSS if available)
- Child name (bold, small text)
- Work name OR "Untagged" (truncated to ~20 chars)
- Confidence badge: ✅ GREEN (≥85%), ⚠️ AMBER (50-84%), ❌ RED (<50%), ➖ UNTAGGED
- Two action buttons: ✓ Confirm (green) | ✏️ Correct (amber)
- Checkbox (top-left) for batch selection

**Correction Flow (single):**
1. Tap ✏️ → if no area, show area picker first
2. WorkWheelPicker opens with photo's area
3. Select correct work → POST /api/montree/guru/corrections
4. Optimistic update: photo moves to GREEN zone locally
5. Toast success

**Confirm Flow (single):**
1. Tap ✓ → POST /api/montree/guru/corrections with action:'confirm'
2. Optimistic: badge → confirmed checkmark
3. Toast "Confirmed"

**Batch Flow:**
1. Check multiple photos via checkboxes
2. Floating bar: "{N} selected — [Confirm All] [Correct All]"
3. Confirm All: sequential corrections API calls, 200ms delay, progress shown
4. Correct All: WorkWheelPicker opens, selected work applied to all checked
5. Progress: "Correcting 3/5..."

**Date Range:** Dropdown — "Last 24h", "Last 7 days", "Last 30 days", "All time"
**Pagination:** Prev/Next buttons, "Page X of Y"


### 3. i18n keys (~45 new keys in en.ts + zh.ts)
Keys prefixed with `audit.*`:
- Title/navigation: title, back, loading, fetchError, noPhotos, noPhotosInZone
- Zone labels: allPhotos, greenZone, amberZone, redZone, untagged
- Actions: confirm, correct, confirmed, corrected, confirmAll, correctAll
- Batch: selected, correcting, confirming, batchComplete, batchError
- Fields: confidence, child, work, area, date, unidentified
- Date ranges: last24h, last7d, last30d, allTime
- Pagination: page, prev, next, totalPhotos
- Stats: percentReviewed, zoneBreakdown, quickStats
- Errors: correctionFailed, confirmFailed, selectArea, selectWork

## Files to Modify (3)

### 4. `components/montree/DashboardHeader.tsx`
- Add 📋 audit nav icon (teachers + principals only)
- Route: `/montree/dashboard/photo-audit`

### 5. `lib/montree/i18n/en.ts`
- Add ~45 `audit.*` keys

### 6. `lib/montree/i18n/zh.ts`
- Add ~45 matching Chinese `audit.*` keys (perfect parity)

---

## Security Model
1. Auth: verifySchoolRequest() on GET endpoint
2. Teachers: scoped to auth.classroomId (403 if missing)
3. Principals: scoped to auth.schoolId, optional classroom_id filter
4. Corrections: existing corrections API has its own auth
5. No new write endpoints — all writes through existing routes

## Performance
1. 4 parallel queries on page load (media + children + works + confidence)
2. Batch .in() queries for children/works/confidence (not N+1)
3. Server-side pagination (LIMIT/OFFSET)
4. Cache-Control: 30s private
5. Optimistic UI updates (no re-fetch after confirm/correct)

## Zone Classification Logic
```typescript
function classifyZone(workId: string|null, confidence: number|null): Zone {
  if (!workId) return 'untagged';
  if (confidence === null) return 'amber';  // No AI data = needs review
  if (confidence >= 0.85) return 'green';
  if (confidence >= 0.50) return 'amber';
  return 'red';
}
```
Note: confidence=null means manually tagged (no Smart Capture) or cache evicted → AMBER.

## Error Handling
1. Auth failure: 401 → redirect to login
2. Missing classroom: 403 for teachers
3. Fetch error: toast + retry button
4. Correction failure: toast, photo stays in original zone
5. Batch partial failure: toast "X of Y succeeded", failed remain selected
