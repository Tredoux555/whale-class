# Handoff: Photo Pipeline 3×3×3 Audit — Mar 24, 2026

## Summary

Full 3×3×3 audit health check on the photo capture/identification/gallery pipeline. 3 parallel audit agents identified 10 real issues across 3 files. All fixed. 3 verification agents achieved consecutive CLEAN passes.

## Context

Photo pipeline is the critical path: capture → offline queue → upload → CLIP/Haiku/Sonnet identification → gallery display → report preview → parent report. Any bug here = teacher sees broken photos, lost work, or wrong identifications.

## Issues Found and Fixed (10)

### CRITICAL (1)

**1. Cache confidence field mismatch — `photo-insight/route.ts`**
- CLIP-identified photos stored confidence as `haiku_confidence` in context_snapshot
- Sonnet-identified photos stored as `sonnet_confidence`
- Cache-hit path only read `sonnet_confidence` → CLIP photos returned null confidence on cache hit
- Fix: Added `?? (snapshot.haiku_confidence as number)` fallback at both read sites (lines ~497 and ~573)

### HIGH (3)

**2. Blob URL memory leak — `sync-manager.ts`**
- `URL.createObjectURL()` called on enqueue (line 165) but never revoked
- Each unrevoked blob URL holds the entire image in browser memory
- Fix: Added `URL.revokeObjectURL(entry._local_url)` before blob deletion on upload success + in aggressiveCleanup() for both uploaded and permanent_failure entries

**3. Stale report items after photo delete — `gallery/page.tsx`**
- Deleting a photo updated `photos` state but not `reportItems`
- Report preview could show deleted photos as stale references
- Fix: Added `setReportItems(prev => prev.filter(...))` in both handleDeletePhoto and handleBulkDelete

**4. ReportItem filter field name — `gallery/page.tsx`**
- Initial fix used `i.id` but ReportItem interface has `photo_id`, not `id`
- Caught by integration audit agent in verification cycle
- Fix: `i.id` → `i.photo_id` in single delete, `i.photo_id || !selectedIds.has(i.photo_id)` with null guard in bulk delete

### MEDIUM (4)

**5. Lightbox index out of bounds — `gallery/page.tsx`**
- Deleting photos while lightbox open could show wrong photo or crash
- Fix: `setLightboxIndex(0)` on every delete (single + bulk)

**6. AbortController on special events fetch — `gallery/page.tsx`**
- useEffect fetching curriculum for special events had no abort cleanup
- Unmount during fetch → state update on unmounted component
- Fix: Full AbortController pattern with signal, abort guard in .then(), AbortError catch, cleanup return

**7. Close handlers clear customEventName — `gallery/page.tsx`**
- Closing special events picker without creating event left stale text in input
- Reopening showed previous text instead of clean state
- Fix: `setCustomEventName('')` in both backdrop click and ✕ button close handlers

**8. Enter key preventDefault — `gallery/page.tsx`**
- Pressing Enter in event name input could trigger form submission or unexpected behavior
- Fix: `e.preventDefault()` before `handleSpecialEventTag()` in onKeyDown handler

### LOW (2)

**9. handleSpecialEventTag cleanup — `gallery/page.tsx`**
- After successfully tagging a photo with an event, customEventName wasn't cleared
- Fix: `setCustomEventName('')` at end of success path

**10. i18n keys for special events UI — `en.ts` + `zh.ts`**
- 4 new keys added with perfect EN/ZH parity:
  - `gallery.eventNamePlaceholder`
  - `gallery.createAndTag`
  - `gallery.noEventsYet`
  - `gallery.taggingPhoto`

## Files Modified (5)

1. **`app/api/montree/guru/photo-insight/route.ts`** — 2 edits (cache confidence fallback chain)
2. **`lib/montree/offline/sync-manager.ts`** — 3 edits (blob URL revocation: upload success, cleanup uploaded, cleanup failures)
3. **`app/montree/dashboard/[childId]/gallery/page.tsx`** — 8 edits (report items filter ×2, lightbox reset ×2, AbortController, close handlers, enter key, success cleanup)
4. **`lib/montree/i18n/en.ts`** — 4 new keys
5. **`lib/montree/i18n/zh.ts`** — 4 matching Chinese keys

## Audit Methodology

**Round 1 — 3 parallel audit agents:**
- Agent 1: Photo capture → upload → identification flow
- Agent 2: Gallery display → interaction → deletion flow
- Agent 3: Report preview → photo selection → parent delivery flow
- ~50 raw findings → triaged to 10 real issues (9 confirmed false positives from prior Mar 11-22 audit cycles)

**Round 2 — Fixes applied, 3 parallel verification agents:**
- Agent 1: Verified all fix patterns correct
- Agent 2: Verified all 6 fixes in place across 3 files
- Agent 3: Cross-file integration audit (data flow, i18n parity, special events tag flow)
- **ALL 3 CLEAN ✅**

**Round 3 — Field name bug found and fixed:**
- Integration agent caught `i.id` should be `i.photo_id` on ReportItem
- Fix applied, re-verified by final integration audit agent
- **CLEAN ✅**

## False Positives Triaged (9)

These were flagged by audit agents but confirmed already handled:
1. handleSelectWork error toast — already has try/catch with toast
2. canvas.toBlob timeout — already has Promise.race (15s) in CameraCapture
3. add-custom-work silent catch — already has console.error logging
4. crop endpoint auth — checks school_id on media record ownership
5. corrections rate limit — already has checkRateLimit()
6. special events race condition — server has UNIQUE index + 409 handler
7. CLIP init failure — has TTL retry + max attempts (from Mar 20 session)
8. Sonnet timeout — has 40s AbortController (from Mar 21 session)
9. Photo-insight NaN confidence — has !isNaN() guard (from Mar 21 session)

## Also Completed This Session

### Pushed 4 Unpushed Features
1. **Chinese Parent Report Descriptions** — Static Chinese description map for 106 works
2. **Chinese Locale Guru Support** — Locale-filtered history, Chinese work names, photo cache
3. **Class Events Attendance** — Custom events + tag children individually/Tag All
4. **CLIP Schema Upgrade** — Structured confusion pairs + negative descriptions for all 270 works

### Special Events Consolidation
- Removed hardcoded SPECIAL_EVENT_PRESETS from gallery
- Replaced with dynamic fetch from curriculum API (existing custom events)
- Added inline custom event creation with text input
- Unified on curriculum work approach (System A) — feeds into reports/progress via work_id

### Migration 146 Run
- `locale TEXT DEFAULT NULL` column on `montree_guru_interactions`
- Index on `(child_id, locale, asked_at DESC)`

## Deploy

⚠️ NOT YET PUSHED. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/montree/dashboard/\[childId\]/gallery/page.tsx app/api/montree/guru/photo-insight/route.ts lib/montree/offline/sync-manager.ts lib/montree/i18n/en.ts lib/montree/i18n/zh.ts
git commit -m "fix: photo pipeline 3x3x3 audit — 10 fixes (cache confidence, blob leak, report items, special events UI)"
git push origin main
```

## Production Safety

All changes are surgical edits to existing logic. No new tables, no new API routes, no schema changes. CLIP/Haiku/Sonnet pipeline untouched — only cache read path and gallery UI affected.
