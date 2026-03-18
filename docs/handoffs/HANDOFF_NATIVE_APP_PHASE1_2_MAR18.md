# Handoff: Capacitor Native App — Phase 1+2 Complete

**Date:** March 18, 2026
**Status:** Code complete, NOT YET DEPLOYED
**Plan doc:** `docs/PLAN_MONTREE_NATIVE_APP.md`

---

## What Was Built

### Phase 1: Capacitor Shell
Thin native wrapper that loads `https://montree.xyz` in a native webview. Zero API extraction. Zero static export. All 60+ API routes stay on Railway unchanged. httpOnly cookies work same-origin.

### Phase 2: Offline Photo Queue
Photos now save to IndexedDB (guaranteed local persistence) before upload. Queue syncs when online. Teachers never lose photos on bad networks.

---

## Architecture

```
Native App (Capacitor)
  └── WKWebView / Chrome WebView
        └── Loads: https://montree.xyz (server.url)
        └── Auth: httpOnly cookies (same-origin)
        └── Native plugins: camera, filesystem, network

Offline Photo Queue (IndexedDB):
  Photo capture → compressImage() → IndexedDB (blob + metadata)
  → syncQueue() uploads when online → Smart Capture analysis
  → deleteBlob() after confirmed upload
```

Key decisions:
- **IndexedDB over SQLite** — Works in both web browser AND Capacitor webview, no native plugin dependency, supports storing Blobs directly
- **Foreground sync over background** — iOS kills background tasks after 30s. Sync on app resume is reliable.
- **server.url over static export** — Real-time data essential, 12+ dynamic routes, zero architectural changes needed

---

## Files Created (10)

1. `capacitor.config.ts` — server.url: https://montree.xyz, splash screen (dark teal + emerald)
2. `lib/montree/platform.ts` — isNative(), getPlatform(), hasNativeCamera(), hasNativeFilesystem(), hasNativeNetwork()
3. `lib/montree/offline/types.ts` — PhotoQueueEntry, PhotoQueueStats, SyncResult, constants
4. `lib/montree/offline/queue-store.ts` — IndexedDB persistence (entries store + blobs store), CRUD, dedup by content_hash, cleanup
5. `lib/montree/offline/sync-manager.ts` — enqueuePhoto(), syncQueue(), retryEntry(), addSyncListener(), content hash dedup, sequential upload with exponential backoff (5 retries: 2s→4s→8s→16s→32s), health check ping, Smart Capture trigger after upload
6. `lib/montree/offline/sync-triggers.ts` — App resume (Capacitor App plugin or visibilitychange), network reconnection (Capacitor Network or online event), periodic cleanup (30min), initial sync on load (3s delay)
7. `lib/montree/offline/index.ts` — Barrel exports
8. `hooks/usePhotoQueue.ts` — React hook: stats, entries, enqueue, sync, retry, syncing state, auto-refresh on sync events
9. `components/montree/media/PhotoQueueBanner.tsx` — Amber banner (pending count, progress bar, sync button), red banner (permanent failures, retry all)
10. `app/api/montree/health/route.ts` — GET/HEAD returns {ok: true, ts: timestamp}, no auth required

## Files Modified (8)

1. `app/montree/dashboard/capture/page.tsx` — Fire-and-forget upload replaced with enqueuePhoto() + syncQueue(). Import added for enqueuePhoto, syncQueue. Upload retry logic removed (handled by sync manager).
2. `app/montree/dashboard/[childId]/gallery/page.tsx` — Import PhotoQueueBanner, render above Contextual Tip Bubble
3. `app/montree/dashboard/layout.tsx` — Import registerSyncTriggers, call in useEffect with cleanup
4. `lib/montree/i18n/en.ts` — 12 new offline.* keys (photo, uploading, waitingToUpload, syncNow, failedToUpload, retryAll, retry, photoSaved, photosSynced, queueFull, offline, backOnline)
5. `lib/montree/i18n/zh.ts` — 12 matching Chinese keys (perfect EN/ZH parity)
6. `package.json` — Added @capacitor/camera, @capacitor/network, @capacitor/app, @capacitor/push-notifications, @capacitor/splash-screen, @capgo/capacitor-updater
7. `.gitignore` — Added /ios/ and /android/
8. `scripts/build-native.sh` — Rewritten: creates minimal out/index.html shell, adds platforms if needed, syncs Capacitor

---

## How The Queue Works

### Capture Flow (capture/page.tsx)
```
Teacher taps camera
  → compressImage(blob) → 1200px width, quality 0.8
  → enqueuePhoto(blob, {child_id, school_id, ...})
    → calculateContentHash(blob) → SHA-256
    → findByContentHash() → dedup check
    → saveBlob(id, blob) → IndexedDB blob store
    → saveEntry(entry) → IndexedDB metadata store (status: 'pending')
  → toast("Photo saved to device")
  → navigateAfterCapture()
  → syncQueue() (fire-and-forget, non-blocking)
```

### Sync Flow (sync-manager.ts)
```
syncQueue() triggered by: app resume, network change, after capture, initial load
  → if syncInProgress: skip
  → checkNetworkReachable() → HEAD /api/montree/health (5s timeout)
  → if offline: skip
  → getPendingEntries() → status IN ('pending', 'failed'), ordered by created_at
  → for each entry (sequential):
    → updateEntryStatus(id, 'uploading')
    → getBlob(id) → read from IndexedDB
    → POST /api/montree/media/upload (FormData, 60s timeout)
    → if 401/403: mark failed, don't retry
    → if success: mark 'uploaded', delete blob, trigger startAnalysis()
    → if error: attempt_count++, mark 'failed' (or 'permanent_failure' at 5)
```

### Queue Status UI (PhotoQueueBanner.tsx)
- Amber banner: "{N} photos waiting to upload" + progress bar + "Sync now" button
- Red banner: "{N} photos failed to upload" + "Retry all" button
- Spinner while syncing
- Shows pending MB total

---

## To Test Locally

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
npm install                    # Installs new Capacitor plugins
bash scripts/build-native.sh   # Creates iOS/Android projects, syncs
npx cap open ios               # Opens Xcode — pick simulator, click Run
```

Requires: Xcode (free, Mac App Store). Android Studio optional.

---

## Next Phases

| Phase | What | Status | Effort |
|-------|------|--------|--------|
| 1 | Capacitor Shell | ✅ Done | — |
| 2 | Offline Photo Queue | ✅ Done | — |
| 3 | Native Camera (@capacitor/camera) | Not started | 2 days |
| 4 | Offline banner + network indicator | Not started | 2 days |
| 5 | Capgo live updates | Not started | 1 day |
| 6 | App Store submission | Not started | 3-5 days |

---

## Risk Notes

- **Web version gets the offline queue for free** — IndexedDB works in regular browsers too
- **Railway deployment untouched** — server.url approach means zero backend changes
- **No migration needed** — Queue is client-side IndexedDB, no server DB changes
- **Migration 141 still pending** — `psql $DATABASE_URL -f migrations/141_auto_crop.sql` (for auto-crop feature, unrelated to native app)
