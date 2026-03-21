# Handoff: Album Photo Upload Silent Failure Fix

**Date:** March 21, 2026 (late continuation)
**Status:** COMPLETE — needs push from Mac
**Files Modified:** 2
**Audit:** CLEAN (full audit, zero issues)

---

## Problem

Teachers reported "photos are not being saved" when uploading from the album/photo library. Camera photos worked perfectly — appeared immediately in gallery. Album photos showed no toast, no error, no feedback. Console showed 503 (service worker offline fallback, unrelated) and 500 (admin route, unrelated).

## Root Cause

**Double compression causing silent async hangs on mobile devices.**

The album upload path went through TWO compression steps:

1. `CameraCapture.tsx` → `compressImage()` from `lib/montree/cache.ts` (returns `File`, maxWidth=1200)
2. `capture/page.tsx` → `compressImage()` from `lib/montree/media/compression.ts` (returns `CompressedImage`, maxWidth=1920)

The camera path only went through step 2 (no pre-compression in CameraCapture).

If the first compression's `canvas.toBlob()` hung on certain mobile devices or file formats (e.g., HEIC on some iOS versions), the entire flow froze silently — no timeout, no catch, no toast. The teacher saw nothing happen after selecting a photo from the album.

## Fix

### File 1: `components/montree/media/CameraCapture.tsx` (4 changes)

1. **Removed pre-compression from album handler** — `processAlbumFile()` now just reads the file as a data URL and extracts dimensions via `Image.onload`. No canvas, no compression. Compression happens once in `capture/page.tsx`.

2. **Added 15s timeout** — `Promise.race` wraps `processAlbumFile` with a 15-second timeout. If any async step (FileReader, Image load) hangs, the error surfaces via `setError()` and shows the `camera.error.captureFailed` toast.

3. **Reordered hooks** — Moved `processAlbumFile` definition before `handleAlbumSelect` for correct dependency ordering (was defined after but referenced in deps array).

4. **Renamed import** — `compressImage` → `compressCacheImage` (alias) to distinguish from `compression.ts` version. Only used in native Capacitor camera/album paths (lines 84, 146).

### File 2: `app/montree/dashboard/capture/page.tsx` (2 changes)

1. **Added 10s compression timeout** — `Promise.race` wraps the `compressImage()` call. On timeout or error, falls back to original blob (photo still uploads, just larger).

2. **Added diagnostic logging** — `[CAPTURE]` prefixed console.log at every pipeline step: entry, compression start/complete, enqueue, toast. `[ALBUM]` prefixed logs in CameraCapture for the album path.

## Data Flow (After Fix)

```
Album Pick Path:
  File selected → processAlbumFile (read + dimensions, NO compression, 15s timeout)
  → onCapture({ type: 'photo', data: { blob: File, dataUrl, width, height } })
  → handleMediaCapture → doUploadAndAnalyze
  → compressImage (compression.ts, SINGLE compression, 10s timeout)
  → enqueuePhoto (IndexedDB) → toast "Photo saved!" → navigate
  → syncQueue (background upload)

Camera Path (unchanged):
  getUserMedia → canvas capture → blob + dataUrl
  → user confirms "Use Photo" → onCapture
  → handleMediaCapture → doUploadAndAnalyze
  → compressImage (compression.ts, SINGLE compression, 10s timeout)
  → enqueuePhoto → toast → navigate → syncQueue

Native Capacitor Path (unchanged):
  captureNativePhoto/pickFromAlbum → compressCacheImage (cache.ts)
  → onCapture → same pipeline as above
```

## Audit Results

- **Type safety**: `File extends Blob` — passing `file` as `blob: Blob` in `CapturedPhoto` is valid
- **Native paths**: `handleNativeAlbumPick` and native camera use `compressCacheImage` independently, never hit `handleAlbumSelect` — no regression
- **Timer leak**: `Promise.race` timeout pattern is standard JS — rejected promise after race settles is safely GC'd, no unhandled rejection
- **Memory**: Large data URLs from album photos only held briefly for tag-child preview, not persisted to IndexedDB
- **Error handling**: Both timeouts surface errors (toast in CameraCapture, fallback-to-original in capture page)

## Deploy

Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add components/montree/media/CameraCapture.tsx app/montree/dashboard/capture/page.tsx
git commit -m "fix: album photo upload silent failure — remove double compression + add timeouts"
git push origin main
```

## Verification

After deploy, test on mobile:
1. Open Smart Capture → tap album icon → select a photo → should see toast "Photo saved!" and navigate
2. Check console for `[ALBUM]` and `[CAPTURE]` log entries showing the full pipeline
3. Verify photo appears in gallery within 30s (background sync)
4. Test with both JPEG and HEIC photos if possible
