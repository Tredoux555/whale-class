# Existing Offline + Capacitor State (Session 113 Investigation)

**Created:** Friday May 15 / overnight Saturday May 16 2026
**Author:** Desktop Claude (Opus 4.7) — Session 113 auto-run
**Purpose:** What's ACTUALLY in the codebase before tomorrow's build. The original `WEEKEND_BUILD_PLAN.md` assumed greenfield. Reality is much further along.

---

## TL;DR

**Phase A from the weekend plan is essentially already built.** A production-hardened offline photo capture queue (`lib/montree/offline/*`) has been live since around March 18 2026, with explicit "10x health check audit" hardening (CRITICAL-001 through MED-002 fixes called out in code comments). It is wired into the live capture flow, the dashboard layout, and the photo-audit page.

**Capacitor is fully scaffolded for both iOS and Android** with a "thin native wrapper" architecture (loads montree.xyz inside a native webview). Both platforms have been built before — Android has a `build/` directory, iOS has a `.xcodeproj` and SPM workspace.

**Phase B from the weekend plan (persistent read cache) genuinely does not exist yet.** That's the real gap.

**Phase C (full offline write queue with conflict resolution) still doesn't exist.** Scoping is the right next step.

---

## What's already built

### `lib/montree/offline/` — Production offline photo queue

Files:

| File | Size | What it does |
|---|---|---|
| `index.ts` | 586 B | Barrel exports |
| `types.ts` | 3 KB | `PhotoQueueEntry`, `PhotoQueueStatus`, `SyncEvent`, `UploadProgress` types + constants (MAX_RETRIES=5, MAX_QUEUE_SIZE=200) |
| `queue-store.ts` | 11.5 KB | IndexedDB layer. DB name `montree-photo-queue`. Atomic `saveEntryAndBlob` in single transaction. Content-hash dedup. Single-pass stats. CRITICAL-001 fix for orphan blobs. |
| `sync-manager.ts` | 21.7 KB | Core sync engine. 3 concurrent upload slots, 90s sync timeout, exponential backoff, auth 401 stops loop, aggressive cleanup on quota exceeded. |
| `sync-triggers.ts` | 4.2 KB | Registers 4 sync triggers: visibility/appStateChange, online/networkStatusChange, periodic cleanup every 30min, initial sync on mount. Detects Capacitor vs web at runtime. |

Comments at the top of `sync-manager.ts` explicitly call out:

```
HARDENED after 10x health check audit (Mar 18, 2026):
  CRITICAL-001: Atomic blob+entry save (single IndexedDB transaction)
  CRITICAL-002: Dedup race condition (try-catch on save, not pre-check only)
  CRITICAL-003: Delete blob BEFORE marking uploaded (prevents orphan on crash)
  CRITICAL-004: Sync lock timeout (90s max, guaranteed reset)
  CRITICAL-005: Aggressive cleanup on quota exceeded (delete oldest pending)
  HIGH-001: Auth 401 stops sync loop immediately (no wasted retries)
  MED-002: Always mark failed/permanent_failure on ANY error path
```

This is mature, audited code. Do NOT rewrite. Reuse.

### Where it's wired live

Verified via grep on `from.*['"]@/lib/montree/offline`:

- `app/montree/dashboard/capture/page.tsx` — calls `enqueuePhoto()` + `syncQueue()` on photo capture. Compresses image, then enqueues to local IndexedDB. Toast says "Photo saved to device" — language acknowledges the local-first behavior.
- `app/montree/dashboard/layout.tsx` line 23 — calls `registerSyncTriggers()` on mount. This is what kicks off background sync system-wide.
- `app/montree/dashboard/photo-audit/page.tsx` — imports from `lib/montree/offline`. Uses the system for the photo audit flow.

### Translation keys present

14 keys under `offline.*` namespace in `lib/montree/i18n/en.ts` (lines 934-947 and 3407):

```
offline.photo, offline.uploading, offline.waitingToUpload, offline.syncNow,
offline.failedToUpload, offline.retryAll, offline.retry, offline.photoSaved,
offline.photosSynced, offline.queueFull, offline.offline, offline.backOnline,
offline.uploaded, offline.failedShort, offline.title
```

These exist — but **need to verify** they're rendered in actual UI. The capture page uses `offline.photoSaved` and `offline.queueFull`. The other 12 keys may or may not have a UI surface. WORTH CHECKING TOMORROW.

### Capacitor — fully scaffolded

`capacitor.config.ts` at repo root:

```typescript
{
  appId: 'xyz.montree.app',
  appName: 'Montree',
  webDir: 'out',
  server: {
    url: 'https://montree.xyz',  // thin webview wrapper — loads live site
    cleartext: false,
  },
  ios: { ... },
  android: { ... },
  plugins: { SplashScreen: { backgroundColor: '#0D3330', spinnerColor: '#4ADE80' } },
}
```

Plus `package.json` scripts:

```json
"build:native": "bash scripts/build-native.sh",
"cap:sync": "npx cap sync",
"cap:ios": "npm run build:native && npx cap sync ios && npx cap open ios",
"cap:android": "npm run build:native && npx cap sync android && npx cap open android"
```

Folder state:

- `ios/App/App.xcodeproj` exists
- `ios/App/CapApp-SPM` exists (Swift Package Manager workspace)
- `ios/App/App/capacitor.config.json` exists
- `android/app/build.gradle` exists
- `android/app/build/` directory exists — gradle has been run before
- `android/app/src/main/assets/capacitor.config.json` exists
- File modification dates indicate active touch through May 2026

`scripts/build-native.sh` creates a minimal `out/index.html` shell with a Montree-branded loading spinner (dark teal `#0D3330` with emerald `#4ADE80` spinner). Since the config uses `server.url`, the native shell IS just a loading placeholder while Capacitor connects to montree.xyz.

`lib/montree/platform.ts` exports `isNative()`, `getPlatform()`, `hasNativeCamera()`, `hasNativeFilesystem()`. The sync-triggers system uses `isNative()` to register Capacitor-specific event listeners (App.appStateChange, Network.networkStatusChange) vs web fallbacks.

### Capacitor plugins installed

From `package.json`:

```
@capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android
@capacitor/app, @capacitor/camera, @capacitor/filesystem
@capacitor/network, @capacitor/preferences, @capacitor/push-notifications
@capacitor/splash-screen, @capacitor-community/sqlite
@capgo/capacitor-updater  (OTA updates)
```

Eleven plugins total. SQLite IS available natively if needed for Phase C. Camera + Push + Network + Preferences + Filesystem are all there for the obvious use cases.

### The older orphan: `lib/media/*`

Separate, older offline photo system from "Session 54" (per code comments). Files date Feb 15. Uses DB name `whale-media`. Has compression, MediaRecord type, generic Blob queueing. **No multi-tenant awareness** (no `school_id`, no `classroom_id`). Imports from `./types` (its own types) and `./db` (its own DB).

**Status: orphan.** Not imported anywhere in `app/` or `components/` after grep. Was probably the predecessor to `lib/montree/offline/*`. Sits in the codebase taking up space.

**Recommendation:** Delete `lib/media/*` entirely. The newer system is multi-tenant, hardened, wired, and superior. Keeping two parallel systems is technical debt.

---

## What's NOT built yet

### 1. Pending-photos UI pill in DashboardHeader

The queue system exposes `getQueueStats()` (returns pending/uploading/failed counts) and `addSyncListener(callback)` (subscribes to live sync events). Neither has a UI consumer in `DashboardHeader.tsx`. Teachers currently have no visibility into queue state.

Translation keys exist (`offline.uploading`, `offline.waitingToUpload`, etc.) but I don't see them rendered anywhere user-facing. **Worth grep-checking tomorrow** before assuming.

If the pill doesn't exist: 2-4 hour build. Subscribe to `addSyncListener` in `DashboardHeader`, render a small pill showing count when > 0, expand to a sheet on tap with "Sync now" / "Retry failed" buttons.

### 2. Global OfflineIndicator

The amber bar that appears across the top of the app when `navigator.onLine === false`. Does not exist. Teachers don't know they're offline.

1-2 hour build. Single component mounted in `app/layout.tsx` (or dashboard layout for teacher-side only).

### 3. Persistent read cache (Phase B from the weekend plan)

The `lib/montree/cache.ts` is in-memory only. Closing the tab drops the cache. Reopening offline = no data shows.

This is the real Phase B work. Roughly as scoped in the original `WEEKEND_BUILD_PLAN.md`:

- Extend `useMontreeData()` to read-through from IndexedDB
- Allow-list of cacheable URLs (roster, child detail, curriculum, daily-brief)
- Per-user-ID cache keying (avoid multi-tenant bleed)
- Cache warm-up on dashboard mount
- "Stale data" indicators when serving from cache
- Add `/montree/dashboard` + `/montree/admin` to SW PRECACHE_ASSETS so the shell loads when fully offline
- SW bump v8 → v9

Estimated: 4-6 hours focused. Largely as the weekend plan describes — that part of the plan still holds.

### 4. Full offline edit queue (Phase C from the weekend plan)

Edit non-photo data offline with conflict resolution. Still 3-4 weeks of dedicated work. Still scoping-only this weekend.

### 5. Capacitor — production deployment

The apps are SCAFFOLDED and BUILD. Unknown: are they SUBMITTED to Google Play or App Store? Three sub-questions:

1. Has anyone done `npm run cap:android` recently and produced a `.aab` file? Has it been uploaded?
2. Has anyone done `npm run cap:ios` and run through Xcode's Archive → upload flow?
3. If not deployed, why was the work paused? Is there a blocker (developer accounts, app review, missing native features)?

**Tredoux is the person who knows.** Ask in the morning before assuming next steps.

### 6. AI offline graceful degradation

Tracy, Mira, Guru, photo-identification, weekly-wrap all require network. When offline:

- Photo identification: currently the queued photo gets uploaded eventually, then identification fires server-side. ALREADY DEGRADES OK because the queue handles it.
- Tracy / Mira chat: would just hang or 503 with the network error. Needs UI handling — surface "Tracy can't reach the server right now — try again when you're back online" instead of a generic error.
- Weekly wrap: usually triggered manually, can fail clean.

Minor polish work — 2-3 hours across all AI surfaces. Not blocking anything.

### 7. Background sync via Service Worker `sync` event

The current sync-triggers system uses online events + visibility + periodic interval. It does NOT use the Service Worker's `sync` event (which allows real background sync on Android when the app is closed). On iOS this doesn't matter (Apple doesn't support SW sync). On Android Chrome it would be a quality lift. Future enhancement.

---

## Revised weekend scope (replaces WEEKEND_BUILD_PLAN.md Phases A/B/C)

```
Saturday (~6-10h focused)
─ Verify existing offline photo queue UI surfaces (1h):
    grep for offline.* translation key usage,
    open dashboard on iPhone in airplane mode, see what happens,
    document gaps in CLAUDE.md Session 113 entry
─ Build the missing UI surfaces (3-4h):
    PendingPhotosPill component in DashboardHeader,
    OfflineIndicator component globally,
    Connect to existing getQueueStats + addSyncListener APIs
─ Delete the orphan lib/media/* system (30 min):
    Just rm + remove from any tsconfig paths if present
─ Capacitor status check (30 min, depends on Tredoux):
    Are the apps deployed?
    If no — what's the blocker?
    If yes — when was last release?
─ Begin Phase B if time allows (2-3h):
    api-cache.ts IndexedDB layer,
    extend useMontreeData hook

Sunday (~6-8h focused)
─ Finish Phase B (3-4h):
    Cache warm-up,
    SW bump to v9 with dashboard/admin precache,
    Per-user cache key scoping
─ iPhone real-device test (1-2h):
    Airplane mode toggle,
    Photo capture offline,
    Dashboard offline,
    Stale indicator visible
─ Phase C scoping doc (2-3h):
    Operation log schema,
    Conflict resolution policy table,
    AI request queueing,
    Sync engine state machine
─ Update CLAUDE.md Session 113 entry
─ Push, commit messages capture each major step
```

This is more realistic than the original "build Phase A from scratch" framing because Phase A already exists.

---

## Risk: Capacitor deployment status is the strategic blocker

If the apps are NOT deployed, the user's question from Session 113 ("turn this into an actual app on app stores") is still genuinely open. Reading the code, the infrastructure is 90% there — what's missing is:

1. Apple Developer account ($99/year) — may or may not exist
2. Google Play Console account ($25 one-time) — may or may not exist
3. App Store Connect submission + review (~1-3 days)
4. Play Store submission + review (~few hours)
5. App icons + screenshots + listing copy
6. Privacy policy URL (compliance gate)

None of this is code. All of it is operational. Tredoux's question in the morning should be: "Are the iOS/Android apps deployed? If not, what's blocking?" That single answer reshapes the rest of the conversation.

---

## What to ask Tredoux first thing in the morning

1. **Capacitor apps:** ever deployed to Google Play or App Store? Live now? If not, what stopped you last time? (Apple/Google account hurdles? Lack of time? Waiting for offline-first to ship?)
2. **Pending-photos UI:** does any UI today show teachers how many photos are pending upload? If yes, where (and ignore me telling you to build the pill). If no, that's a real gap.
3. **lib/media/*:** any reason it still exists? Or can it be deleted clean?
4. **Phase C urgency:** is the "edit data offline" gap actually losing you deals, or is it theoretical? Helps prioritize scoping depth.

---

## Recommended order for the morning

1. Read this doc + WEEKEND_BUILD_PLAN.md side by side
2. Answer the four questions above (5 min)
3. Decide which tracks to run this weekend:
   - Track A: UI surfacing of existing offline queue (high-leverage, 4-6h, ships visible improvement to teachers)
   - Track B: Persistent read cache (the real Phase B from the original plan, 4-6h)
   - Track C: Capacitor app store push if applicable (operational, may need Apple/Google account setup time, could be days not hours)

If you can only do one: **Track A.** The biggest current pain isn't "offline doesn't work" — it's "offline works but teachers can't see it working." Shipping the pill + indicator turns invisible engineering into a visible product feature, which is also a marketing story (screenshots showing "5 photos waiting to upload" pill, "you're offline" amber bar).

Track B is the right next-most-leverage if time allows. Track C is its own dedicated push that doesn't conflict with A or B.

---

## Code references for tomorrow's session

| Symbol | File | Purpose |
|---|---|---|
| `enqueuePhoto(blob, opts)` | `lib/montree/offline/sync-manager.ts` | Atomic local save + sync trigger |
| `syncQueue()` | `lib/montree/offline/sync-manager.ts` | Force-run upload loop |
| `getQueueStats()` | `lib/montree/offline/queue-store.ts` | Counts: pending/uploading/uploaded/failed/permanent_failure |
| `addSyncListener(cb)` | `lib/montree/offline/sync-manager.ts` | Subscribe to live sync events |
| `registerSyncTriggers()` | `lib/montree/offline/sync-triggers.ts` | Already called in `app/montree/dashboard/layout.tsx:23` |
| `isNative()` | `lib/montree/platform.ts` | Capacitor detection |
| `useMontreeData()` | `lib/montree/cache.ts` | The hook that needs Phase B extension |
| `montree-sw.js` | `public/montree-sw.js` | Service worker, v8, will need bump to v9 in Phase B |

End of investigation. Ship well.
