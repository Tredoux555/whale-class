# Montree Native App — Rock-Solid Migration Plan

**Date:** March 18, 2026
**Research:** 5 cycles × (plan + audit + deep dive + research) = 10+ parallel research agents
**Confidence:** HIGH — Every critical path validated against actual codebase

---

## THE VERDICT

**Capacitor thin native wrapper** pointing at your existing Railway server. Zero backend extraction. Zero static export. The codebase is already 90% ready — your `next.config.ts` literally has `CAPACITOR_BUILD` support built in.

**What you get:** Native camera, offline photo queue (photos NEVER lost), push notifications, live JS updates without App Store review, and your entire existing web app works unchanged.

**What you don't touch:** API routes, auth system, middleware, database, deployment pipeline. Everything stays on Railway exactly as-is.

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│  NATIVE APP (Capacitor Shell)                    │
│  ┌───────────────────────────────────────────┐  │
│  │  WKWebView (iOS) / Chrome WebView (And)   │  │
│  │  Loads: https://montree.xyz               │  │
│  │  Auth: httpOnly cookies (same-origin)      │  │
│  │  All existing React pages work as-is       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  NATIVE PLUGINS:                                 │
│  ├── @capacitor/camera (native photo capture)    │
│  ├── @capacitor/filesystem (local blob storage)  │
│  ├── @capacitor-community/sqlite (queue DB)      │
│  ├── @capacitor/network (online/offline detect)  │
│  ├── @capacitor/app (lifecycle events)           │
│  ├── @capacitor/push-notifications               │
│  └── @capgo/capacitor-updater (live JS updates)  │
│                                                  │
│  OFFLINE PHOTO QUEUE:                            │
│  Photo → Filesystem (guaranteed) → SQLite queue  │
│  → Upload when online → Delete local blob        │
└─────────────────────────────────────────────────┘
          │
          │  HTTPS (same-origin via server.url config)
          │  httpOnly cookies auto-sent
          ▼
┌─────────────────────────────────────────────────┐
│  RAILWAY SERVER (unchanged)                      │
│  Next.js standalone + 60+ API routes             │
│  Auth, Guru AI, Smart Capture, Reports           │
│  Supabase (database + storage)                   │
└─────────────────────────────────────────────────┘
```

**Why this works:** Capacitor's `server.url: 'https://montree.xyz'` tells the webview to treat your server as the origin. All relative API calls (`/api/montree/...`) resolve correctly. Cookies are same-origin. Zero CORS issues. Zero API extraction needed.

---

## WHY NOT STATIC EXPORT

I audited static export thoroughly. It's the wrong approach because:
- 12+ dynamic routes (`[childId]`, `[classroomId]`, `[reportId]`) need `generateStaticParams` — means querying the DB at build time for every school, every child
- Real-time data (photos, progress, assignments) would be stale the moment you build
- School-specific data can't be pre-rendered — every customer has different children
- Would require extracting 60+ API routes to a separate backend

The server.url approach gives you native capabilities with zero architectural changes.

---

## THE OFFLINE PHOTO QUEUE (Core Feature)

This is the entire reason for going native. Here's how photos become indestructible:

### Current Flow (Photos Get Lost)
```
Capture → Compress → Upload (60s timeout, 2 retries) → LOST if all fail
```

### New Flow (Photos Never Lost)
```
Capture → Compress → Save to Device Filesystem (INSTANT, GUARANTEED)
                   → Queue metadata in SQLite
                   → Show photo locally in gallery immediately
                   → Upload when online (foreground sync on app resume)
                   → Delete local blob after confirmed upload
```

### Queue Architecture

**Storage:** SQLite for metadata + Capacitor Filesystem for blobs

**Queue entry:** id, child_id, school_id, content_hash (SHA-256 dedup), blob_path, status (pending/uploading/uploaded/failed), attempt_count (max 5), timestamps

**Sync triggers:**
1. App comes to foreground (most common)
2. Network status changes from offline → online
3. After each new photo capture (immediate attempt)

**NOT background sync** — iOS kills background tasks after 30 seconds, which isn't enough for 3G uploads. Foreground sync on app resume is reliable and predictable.

**Gallery integration:** Merge local queue + server photos. Pending photos show with status badge (spinner, retry, failed). Uploaded photos show normally. Content-hash deduplication prevents double-uploads.

**Disk full protection:** Check available space before capture. Warn if <50MB free. Cap queue at 200 photos.

**SQLite reliability:** WAL mode prevents corruption on crash. Content-hash UNIQUE constraint prevents duplicates.

---

## PHASE-BY-PHASE IMPLEMENTATION

### Phase 1: Capacitor Shell (3 days)
**Goal:** App opens in iOS Simulator / Android Emulator, loads montree.xyz, auth works.

**Steps:**
1. Install Capacitor core: `npm install @capacitor/core @capacitor/cli`
2. Initialize: `npx cap init "Montree" "xyz.montree" --web-dir out`
3. Create `capacitor.config.ts`:
   ```
   server.url: 'https://montree.xyz'
   server.cleartext: false
   ```
4. Add platforms: `npx cap add ios`, `npx cap add android`
5. Install core plugins: camera, filesystem, network, app, preferences
6. Open in Xcode / Android Studio, run on simulator
7. Test: Login with teacher code → verify cookie persists → navigate dashboard

**Validation:** Teacher can log in, see dashboard, navigate all pages. Photos work via web camera (not native yet).

**Your effort:** Near zero — I build the config, you run the simulator commands.

### Phase 2: Offline Photo Queue (5 days)
**Goal:** Photos save to device first, upload when online, never lost.

**Steps:**
1. Build `PhotoSyncManager` class (SQLite + Filesystem)
2. Build `lib/montree/platform.ts` — `isNativeCapacitor()` feature detection
3. Modify `capture/page.tsx`: if native → enqueuePhoto() instead of direct upload
4. Build gallery merge: show local + server photos together
5. Add sync triggers: app resume listener, network change listener
6. Add queue status banner in gallery (X photos waiting to upload)
7. Test: Airplane mode → capture 5 photos → turn on WiFi → all 5 upload

**Validation:** Take 10 photos offline. Kill app. Reopen. All 10 still queued. Connect to WiFi. All 10 upload. Gallery shows them.

### Phase 3: Native Camera (2 days)
**Goal:** Use device camera instead of web camera for better reliability and performance.

**Steps:**
1. Platform branch: `isNativeCapacitor()` ? `Camera.getPhoto()` : existing `getUserMedia()`
2. Pipe native photo through existing `compressImage()` (1200px, quality 0.8)
3. Test photo quality, compression, and upload flow end-to-end

**Why:** Native camera is more reliable on low-end Android devices, handles permissions better, and gives access to the photo library natively.

### Phase 4: Polish + Notifications (3 days)
**Goal:** Professional UX for offline/online states, push notifications.

**Steps:**
1. Offline detection: Show banner "You're offline — photos are saved locally"
2. Sync progress: Show upload progress bar when syncing queued photos
3. Push notifications via Firebase Cloud Messaging (optional — nice-to-have)
4. Error handling: 401 during sync → prompt re-login, don't lose photos

### Phase 5: Live Updates (1 day)
**Goal:** Push JS fixes without App Store review.

**Steps:**
1. Install `@capgo/capacitor-updater`
2. Configure auto-update checking on app launch
3. Test: Push a UI change → app picks it up next launch → no App Store wait

### Phase 6: App Store Submission (3-5 days)
**Goal:** Live on iOS App Store and Google Play.

**Steps:**
1. Apple Developer Account ($99/year) — you may already have this
2. Google Play Developer Account ($25 one-time)
3. Create app icons, splash screens, screenshots
4. Write privacy policy (must disclose Claude AI usage)
5. Build signed release: `npx cap build ios`, `npx cap build android`
6. Submit to both stores
7. Respond to any review feedback (expect 1-2 rounds)

---

## RISK MATRIX

| Risk | Impact | Likelihood | Score | Mitigation |
|------|--------|------------|-------|------------|
| Server down = blank screen | 5 | 3 | 15 | Cache last-known HTML, show offline banner |
| iOS bg sync fails (30s limit) | 4 | 4 | 16 | Use foreground sync only (reliable) |
| Great Firewall blocks app | 5 | 4 | 20 | Document VPN requirement for China teachers |
| Apple rejects webview app | 4 | 3 | 12 | Native camera + offline queue = real native features |
| Photo queue data loss (disk full) | 5 | 2 | 10 | Check disk before capture, warn user |
| SQLite corruption | 5 | 1 | 5 | WAL mode, integrity checks, JSON backup |
| Slow 3G initial load | 3 | 4 | 12 | Existing skeleton screens, Cache-Control headers |
| Cookie auth edge cases | 3 | 2 | 6 | 365-day TTL, session recovery already built |

### Critical Risk: Great Firewall (Score 20)
Your teachers in China use VPN (Astrill). The native app will have the same GFW issues as the web app. This is NOT a new problem introduced by going native — it's the existing reality. The native app actually helps here because local photo storage means teachers can capture all day and sync when they have good VPN connection at night.

### Critical Risk: Apple Rejection (Score 12)
Mitigated by having genuine native features: native camera, offline photo storage, SQLite database, push notifications. This is NOT "just a webview wrapper" — it has real native functionality that the web version can't do.

---

## WHAT I DO vs WHAT YOU DO

### I Build (100% of the code):
- Capacitor configuration and project setup
- PhotoSyncManager (SQLite + Filesystem offline queue)
- Platform detection layer
- Capture page modifications (native branch)
- Gallery merge (local + server photos)
- Sync triggers and status UI
- Live update configuration
- All TypeScript, all tests

### You Do (minimal):
- Apple Developer Account signup ($99) + Google Play ($25)
- Run `npx cap open ios` in Xcode (click Run)
- Run `npx cap open android` in Android Studio (click Run)
- Test on your physical devices
- Submit to app stores (I prepare everything, you click Submit)
- Provide app icon and screenshots (or I generate them)

### You Don't Touch:
- Railway deployment (unchanged)
- API routes (unchanged)
- Auth system (unchanged)
- Database (unchanged)
- Existing web app (unchanged)

---

## TIMELINE

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | Phase 1: Capacitor Shell | App loads in simulator, auth works |
| 1-2 | Phase 2: Offline Photo Queue | Photos never lost, even offline |
| 2 | Phase 3: Native Camera | Device camera integration |
| 3 | Phase 4: Polish + Notifications | Offline banners, sync progress |
| 3 | Phase 5: Live Updates | Push fixes without App Store |
| 3-4 | Phase 6: App Store Submission | Submitted to both stores |
| 5-6 | App Store Review | Live on both stores |

**Total: 4-6 weeks to live in app stores.**

---

## COST

| Item | Cost | Recurring |
|------|------|-----------|
| Apple Developer | $99/year | Yes |
| Google Play Developer | $25 | No |
| Capgo (live updates) | $29/month | Yes |
| Railway | Already paying | — |
| **Total new cost** | **~$155/year + $29/month** | |

---

## THE KEY INSIGHT

Your codebase is already 90% ready. The `CAPACITOR_BUILD` flag in `next.config.ts` proves someone already planned this. The `montreeApi()` wrapper is domain-agnostic. Auth uses httpOnly cookies that work in webviews. 85-90% of your UI is already `'use client'`.

The only genuinely new code is the offline photo queue (~500 lines of TypeScript). Everything else is configuration and wiring.

This plan doesn't require touching the ground. It flies.
