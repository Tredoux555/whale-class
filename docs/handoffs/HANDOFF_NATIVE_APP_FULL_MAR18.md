# Handoff: Capacitor Native App — Phase 1-4 Complete + APK Distribution

**Date:** March 18, 2026
**Status:** Code complete, pushed to Railway. Capacitor build tested on Mac (sync succeeded, APK blocked on Android SDK install).

---

## What Was Built (This Session)

### Phase 1: Capacitor Shell
Thin native wrapper loading `https://montree.xyz` via Capacitor `server.url`. Zero API extraction needed — all 60+ routes stay on Railway. httpOnly cookies work same-origin.

### Phase 2: Offline Photo Queue
Photos save to IndexedDB before upload. Queue syncs when online. Teachers never lose photos on bad networks. SHA-256 content hash prevents duplicate uploads. 5 retries with exponential backoff (2s→4s→8s→16s→32s). Max queue 200 photos.

### Phase 3: Native Camera
Camera abstraction layer. On native: Capacitor Camera plugin opens device camera directly (skips getUserMedia). On web: existing camera code runs unchanged. Album button uses native picker on device, web file input on browser.

### Phase 4: Offline/Online UI
Red "You're offline" banner when disconnected. Green "Back online — syncing photos" on reconnection (3s auto-dismiss). Amber queue status banner in gallery showing pending count, progress bar, sync button. Red banner for permanently failed photos with retry.

### APK Distribution
Build script generates debug APK and copies to `public/downloads/montree.apk`. Download page at `/montree/download` with bilingual EN/ZH install instructions. Teachers in China get APK via WeChat — no Google Play needed.

---

## Files Created (16)

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `capacitor.config.ts` | 42 | Capacitor config (server.url, splash screen, plugins) |
| 2 | `lib/montree/platform.ts` | 55 | Platform detection (isNative, getPlatform, hasNativeCamera, etc.) |
| 3 | `lib/montree/platform/camera.ts` | 157 | Native camera abstraction (captureNativePhoto, pickFromAlbum) |
| 4 | `lib/montree/offline/types.ts` | 55 | Queue types, status enum, constants |
| 5 | `lib/montree/offline/queue-store.ts` | 230 | IndexedDB persistence (entries + blobs stores, CRUD, dedup, cleanup) |
| 6 | `lib/montree/offline/sync-manager.ts` | 280 | Core sync engine (enqueue, upload, retry, listeners, network check) |
| 7 | `lib/montree/offline/sync-triggers.ts` | 85 | App resume + network change + periodic cleanup triggers |
| 8 | `lib/montree/offline/index.ts` | 20 | Barrel exports |
| 9 | `hooks/usePhotoQueue.ts` | 90 | React hook (stats, entries, enqueue, sync, retry, syncing state) |
| 10 | `components/montree/media/PhotoQueueBanner.tsx` | 85 | Queue status UI (amber pending, red failed, progress bar) |
| 11 | `components/montree/NetworkStatusBanner.tsx` | 100 | Offline/online detection banner |
| 12 | `app/api/montree/health/route.ts` | 12 | Lightweight health check (network ping) |
| 13 | `app/montree/download/page.tsx` | 80 | Bilingual APK download page |
| 14 | `docs/PLAN_MONTREE_NATIVE_APP.md` | 250 | Full migration plan (5 research cycles) |
| 15 | `docs/handoffs/HANDOFF_NATIVE_APP_PHASE1_2_MAR18.md` | 150 | Phase 1-2 handoff |
| 16 | `docs/handoffs/HANDOFF_NATIVE_APP_FULL_MAR18.md` | This file |

## Files Modified (10)

| # | File | Change |
|---|------|--------|
| 1 | `app/montree/dashboard/capture/page.tsx` | Fire-and-forget → enqueuePhoto() + syncQueue() |
| 2 | `app/montree/dashboard/[childId]/gallery/page.tsx` | Added PhotoQueueBanner import + render |
| 3 | `app/montree/dashboard/layout.tsx` | Added NetworkStatusBanner + registerSyncTriggers |
| 4 | `components/montree/media/CameraCapture.tsx` | Native camera useEffect + native album picker + mounted-check |
| 5 | `lib/montree/i18n/en.ts` | 12 new offline.* keys |
| 6 | `lib/montree/i18n/zh.ts` | 12 matching Chinese keys (perfect parity) |
| 7 | `package.json` | 6 new Capacitor plugins |
| 8 | `.gitignore` | Added /ios/ and /android/ |
| 9 | `scripts/build-native.sh` | Rewritten: server.url approach + APK build mode |
| 10 | `CLAUDE.md` | Full native app status section |

---

## Audit Results

Full audit of all 16 files by independent agent. Issues found and fixed:

| Severity | Issue | Fix |
|----------|-------|-----|
| CRITICAL | sync-triggers cleanup race condition | Added .catch(() => {}) to listener Promise cleanup |
| HIGH | CameraCapture native useEffect memory leak | Added mounted-check pattern (let mounted = true) |
| HIGH | Image dimension fallback returns 0x0 | Changed to 1920x1080 sensible defaults |
| HIGH | usePhotoQueue re-renders on every sync event | Optimized: only refresh on complete/uploaded/failed |

---

## Distribution Plan

**Chinese Android teachers (primary target):**
1. Build APK: `bash scripts/build-native.sh apk`
2. APK copies to `public/downloads/montree.apk`
3. Push to git → Railway serves at `montree.xyz/downloads/montree.apk`
4. Teachers visit `montree.xyz/montree/download` or receive APK via WeChat
5. Install: tap APK → allow unknown sources → done

**iOS teachers:**
1. TestFlight (when Apple Developer account ready)
2. Or use Safari web app (current PWA still works)

**Web users:**
Nothing changes. The offline photo queue works in regular browsers too via IndexedDB.

---

## Prerequisites for APK Build

Need installed on Mac (one-time setup):
- Java 17: `brew install openjdk@17`
- Android Studio: download from developer.android.com/studio
- Set ANDROID_HOME: `echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc`

Xcode already installed and working (Capacitor sync succeeded for iOS).

---

## Remaining Phases

| Phase | What | Status | Blocker |
|-------|------|--------|---------|
| 5 | Capgo live updates | Not started | None — install + config |
| 6 | App Store submission | Not started | Apple $99/yr account needed |
| — | Android Studio install | Blocked | User needs to download + install |
| — | Migration 141 | Pending | `ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS auto_crop JSONB DEFAULT NULL` |
