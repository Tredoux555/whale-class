# Handoff: Demo Prep Fixes — Mar 22, 2026 (Late Session)

## Context
Critical demo tomorrow (Monday Mar 23) with a hostile tester. Four issues raised by user:
1. Parent report showing "0 Activities" — totally broken
2. Ensure every photo is captured properly
3. Teachers need ability to download photos on phones
4. CLIP still can't initialize on Railway

## Changes Made (5 files, 9 edits total)

### 1. Parent Report "0 Activities" Fix — CRITICAL

**Root cause:** `AUTO_UPDATE_THRESHOLD` was 0.95, but two-pass Haiku (the only working identification path with CLIP broken) returns confidence scores of 0.80-0.92. Nothing EVER reached GREEN zone → progress never auto-updated → parent reports queried empty `montree_child_progress` → "0 Activities".

**Fix:** `app/api/montree/guru/photo-insight/route.ts`
- `AUTO_UPDATE_THRESHOLD` lowered from 0.95 → 0.85 (line 387)
- Haiku confidence calibration prompt updated to match (lines 1508-1517): tells Haiku that 0.85+ = auto-update, 0.75-0.84 = teacher confirmation. Previously told Haiku 0.95+ = auto-update, which meant Haiku rarely gave scores above 0.85 because it thought that range was "likely match, needs confirmation"
- All 4 stale comments referencing 0.95 updated to reference AUTO_UPDATE_THRESHOLD (0.85)

**How it flows now:**
- Haiku identifies work with ≥0.85 confidence → GREEN zone → auto-updates `montree_child_progress` → report preview API finds entries → parent sees activities

### 2. Gallery Photo Download Button

**File:** `app/montree/dashboard/[childId]/gallery/page.tsx`
- Added 💾 download button on each photo card (before crop and delete buttons)
- Uses blob download pattern: fetch → createObjectURL → programmatic `<a download>` click → revokeObjectURL
- Fallback: `window.open()` for manual save if blob download fails
- Filename: `{work_name}_{date}.jpg` with both parts sanitized via `.replace(/[^a-zA-Z0-9]/g, '_')`
- All 3 action buttons (download/crop/delete) now always visible on mobile (<640px), hover-only on desktop (≥640px) — changed `opacity-0 group-hover:opacity-100` to `sm:opacity-0 sm:group-hover:opacity-100`

**i18n:** Added `gallery.downloadPhoto` key to both `en.ts` and `zh.ts`

### 3. CLIP RawImage Fix

**Root cause:** Previous fix attempt passed URL strings directly to the SigLIP `feature-extraction` pipeline, but that pipeline treats strings as TEXT input (tokenizes them as words), not images. Result: "Missing inputs: pixel_values" error on every classification attempt.

**Fix:** `lib/montree/classifier/clip-classifier.ts`
- `classifyImageInternal()` now uses `RawImage.fromURL(imageUrl)` from `@xenova/transformers`
- `RawImage` properly: downloads image → decodes pixels → creates image tensor → auto-resizes to 224x224
- Dead code cleaned up: removed `downloadImageAsBuffer()` function (26 lines) and its unused constants (`MAX_IMAGE_SIZE_BYTES`, `IMAGE_DOWNLOAD_TIMEOUT_MS`)

**Status:** Fix is in code but NOT YET PUSHED to Railway. Even without CLIP, two-pass Haiku handles identification fine. CLIP is a cost optimization ($0.00 vs $0.006/photo), not a blocker for the demo.

### 4. Photo Capture Pipeline — VERIFIED

Audit confirmed the single-child capture → upload → gallery pipeline is reliable for the demo scenario. No code changes needed.

## Audit Results

3 parallel audit agents examined all changes. Issues found and fixed:
1. **CRITICAL:** Haiku confidence calibration prompt still said "0.95+ = auto-update" while code used 0.85 — would cause Haiku to calibrate scores to wrong ranges → FIXED
2. **HIGH:** 4 stale comments referencing 0.95 thresholds → FIXED
3. **MEDIUM:** Download filename `formatDate()` output contained commas/spaces → FIXED with sanitization
4. **LOW:** Dead `downloadImageAsBuffer()` function + unused constants → REMOVED
5. **INFO:** iOS Safari blocks `window.open()` after async operations — primary blob path works fine, fallback is edge case only

## Files Modified

| File | Edits | What |
|------|-------|------|
| `app/api/montree/guru/photo-insight/route.ts` | 6 | Threshold 0.95→0.85, prompt calibration, 4 comment fixes |
| `lib/montree/classifier/clip-classifier.ts` | 3 | RawImage fix, dead function removal, dead constants removal |
| `app/montree/dashboard/[childId]/gallery/page.tsx` | 2 | Download button + filename sanitization |
| `lib/montree/i18n/en.ts` | 1 | `gallery.downloadPhoto` key |
| `lib/montree/i18n/zh.ts` | 1 | `gallery.downloadPhoto` key (Chinese) |

## Deploy

⚠️ **NOT YET PUSHED.** Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/api/montree/guru/photo-insight/route.ts lib/montree/classifier/clip-classifier.ts app/montree/dashboard/\[childId\]/gallery/page.tsx lib/montree/i18n/en.ts lib/montree/i18n/zh.ts
git commit -m "fix: lower auto-update threshold to 0.85 + CLIP RawImage fix + gallery download button"
git push origin main
```

No migrations needed for these changes.

## Demo Day Checklist (Monday Mar 23)

1. **Push this code** (above command)
2. **After deploy, test Smart Capture:** Take a photo of a Montessori work → should auto-update progress (check Railway Deploy Logs for `[CLIP]` entries to see if CLIP initializes)
3. **Test parent report:** Generate a report for a child with auto-updated progress → should show activities
4. **Test download:** Tap 💾 on a gallery photo → should download to phone
5. **Check CLIP logs:** In Railway Deploy Logs, search for `[CLIP]` — if RawImage fix works, you'll see "Image loaded: WxH, computing embedding..."
6. **If CLIP still fails:** No problem — two-pass Haiku is the primary path and works with the 0.85 threshold

## Confidence Level

**HIGH** for demo readiness. The threshold fix is the most impactful change — it unblocks the entire parent report pipeline. Download button and CLIP fix are bonuses.
