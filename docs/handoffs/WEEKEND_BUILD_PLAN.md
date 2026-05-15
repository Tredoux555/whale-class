# Weekend Build Plan — Offline-First + Open Tasks

**Created:** Friday May 15, 2026 (Session 113 prep)
**Build window:** Saturday May 16 – Sunday May 17, 2026
**Author:** Desktop Claude (Opus 4.7)
**Status:** Forward-looking plan, not a post-session summary

---

## ⚠️ READ THIS FIRST — Significant scope revision (added 15 May 2026 23:xx)

After writing this plan, the auto-run investigation discovered the codebase is **MUCH further along than this document assumes**. Specifically:

- **Phase A (offline photo queue) is essentially already built and shipped.** A production-hardened system lives at `lib/montree/offline/*` with explicit "10x health check audit" hardening from Mar 18 2026. Wired into the capture page, dashboard layout, and photo-audit page.
- **Capacitor is fully scaffolded** for both iOS and Android with a thin-webview architecture. Both platforms have build outputs. Whether deployed to stores is unknown.
- **An older orphan offline system exists at `lib/media/*`** from Feb 2026 — should be deleted as part of cleanup.
- **The REAL gap is UI surfacing** of the existing offline queue (pending-photos pill, offline indicator) + **persistent read cache (Phase B from below)**.

**🚨 Before executing the plan below, read the companion doc:**

`docs/handoffs/EXISTING_OFFLINE_AND_CAPACITOR_STATE.md`

It contains the corrected scope and four questions to answer before deciding which tracks to run this weekend. The Phase A section below is OBSOLETE — the work is largely done. The Phase B and Phase C sections are still accurate.

The Saturday/Sunday hour-by-hour sequence at the bottom of this plan was written before the investigation and should be REPLACED by the "Revised weekend scope" section in the companion doc.

The rest of this plan (architectural decisions, schemas, files-to-touch lists) is still valid and useful as reference material.

---

---

## Goal

Push Montree from "online-only cloud SaaS" toward "works when school WiFi drops." Cover the credibility queue from Session 113 (LinkedIn, Cloudflare email routing, sitemap, og-image) in parallel as quick wins so the weekend ships both deep work AND polish.

This is a **hard build weekend**. >50% of weekly Claude usage available. Burn it.

---

## Honest scoping reality

True offline-first for a multi-tenant cloud SaaS is a 3-6 month engineering project. Cannot be crammed into one weekend without leaving real bugs.

What CAN ship this weekend:

| Phase | Scope | Outcome |
|---|---|---|
| A | Offline photo capture queue | Teachers stop losing photos when WiFi drops. Highest pain-per-hour win. |
| B | Persistent read cache for roster + curriculum + recent observations | Teachers can OPEN the app offline and see today's roster, yesterday's notes, the curriculum guide. Cannot edit yet. |
| C | **SCOPING ONLY** — full offline edit queue + conflict resolution | Architecture locked, schema designed, hard problems flagged. Build is next sprint (~3-4 weeks). |
| Quick wins | LinkedIn About copy, Cloudflare walkthrough doc, sitemap audit, og-image redesign | Ship Session 113 queue items in parallel. |

What CANNOT ship this weekend:

- Full offline edit-and-sync with conflict resolution (Phase C build itself)
- Capacitor / native app wrap (separate sprint, deferred per Session 113 strategic discussion)
- Offline AI features (fundamentally impossible — Sonnet/Haiku/Opus need a server)
- Real-time push notifications via APNs/FCM (separate sprint)

---

## Architectural decisions to LOCK IN before building

These are answered now so the build doesn't re-debate them tomorrow.

### A1. Persistence layer: IndexedDB via `idb` library

Use the lightweight `idb` wrapper (~3 KB gzip) over native IndexedDB. NOT Dexie — too heavy for our scope, brings ORM patterns we don't need. NOT raw IndexedDB — too much boilerplate, error handling is awful.

```bash
npm install idb
```

Single DB name: `montree-offline`. Three object stores:
- `photo_queue` — pending photo uploads
- `api_cache` — cached GET responses with TTL metadata
- `meta` — sync state, last-online-at, etc.

### A2. SW changes are conservative — DO NOT break the Session 76 contract

Current SW (v8) deliberately does NOT intercept API calls. This is load-bearing — Session 76 fixed the "stale dashboard while live API calls fail" bug by removing API caching from the SW.

For Phase A (photo queue): NO SW changes needed. The queue lives client-side in IndexedDB; uploads use `montreeApi()` which already handles retry. SW stays at v8.

For Phase B (read cache): Client-side IndexedDB cache layer extending `lib/montree/cache.ts`. SW STILL doesn't touch `/api/`. The persistence happens in the JS layer, after the page has loaded.

For Phase B navigation offline: ADD `/montree/dashboard` and `/montree/admin` to `PRECACHE_ASSETS` in the SW so the shell loads when WiFi is down. Bump cache to v9. The shell hydrates from the IndexedDB-backed cache.

### A3. Photo upload contract

Photo capture is currently synchronous: capture → POST to `/api/montree/photo-upload` → optimistic UI. New flow:

```
capture → write to photo_queue store with status='pending'
       → optimistic UI ("photo captured, will upload when online")
       → trigger upload attempt
            ├─ success → mark status='uploaded', delete blob from queue
            ├─ network error → mark status='retry', schedule next attempt
            └─ server error 4xx → mark status='failed', surface to UI
```

Blob is held in the IndexedDB queue entry. NOT in a separate IndexedDB blob store. Keeps deletion atomic.

Upload attempts:
- Immediately on capture (online or not — fail fast)
- On `online` event from `window.addEventListener('online', ...)`
- Every 30s while pending items exist (in-page interval)
- On dashboard mount (catch up after refresh)

### A4. UI surface for pending photos

Pending count pill in `DashboardHeader` (mobile + desktop). Tap opens a sheet showing:
- List of pending photos with thumbnails
- Per-photo status (pending / retrying / failed)
- "Retry all" button for failed ones
- "Delete" button for individual photos teacher wants to abandon

Don't surface the queue if `count === 0`. Pill becomes amber when retrying, red when failed.

### A5. Cache layer extension contract

`lib/montree/cache.ts` currently has in-memory only. Extend with optional IndexedDB persistence:

```typescript
export function useMontreeData<T>(url, options) {
  // ... existing in-memory logic ...
  // NEW: on first call, hydrate from IndexedDB if no in-memory entry
  // NEW: on cache.set, also persist to IndexedDB (fire-and-forget)
}
```

NOT every URL persists. Only allow-listed URLs are written to IndexedDB:
- `/api/montree/children?classroom_id=*` (roster)
- `/api/montree/children/[childId]` (child detail)
- `/api/montree/works` (curriculum — mostly static)
- `/api/montree/works/guide?work_id=*` (guide content)
- `/api/montree/intelligence/daily-brief` (today's plan)

NOT cached (no point or actively wrong):
- AI endpoints (Tracy, Mira, Guru, photo-identification, weekly-wrap) — costs money on retry
- Auth endpoints
- Any POST/PATCH/DELETE
- Any user-write endpoint

### A6. Cache TTL strategy

Each cached entry gets:
- `staleTime` (current behavior — 30s default)
- `maxAge` (NEW — hard expiry, served only as offline fallback after this; default 24h)

If online and fresh: serve cached, no fetch.
If online and stale: serve cached, fetch in background (SWR — current behavior).
If offline and within maxAge: serve cached with `isStale: true` flag for UI to surface.
If offline and beyond maxAge: return null with offline error.

### A7. "You're offline" visual treatment

Single global `OfflineIndicator` component renders a thin amber bar across top of app when `navigator.onLine === false`. Disappears when back online. Not modal — never blocks interaction.

Plus per-component "stale data" indicators when serving from cache after maxAge: small clock icon next to the affected data with tooltip "Showing cached data from {timestamp}."

---

## Phase A — Offline Photo Capture Queue (Saturday)

### Estimated time
6-10 focused hours. Realistic in one Saturday.

### Files to touch / create

**Create:**
- `lib/montree/offline/db.ts` — `idb` wrapper, opens `montree-offline` database, exports typed accessors
- `lib/montree/offline/photo-queue.ts` — queue API (`enqueuePhoto`, `getPendingPhotos`, `markUploaded`, `markFailed`, `retryAll`)
- `lib/montree/offline/sync-engine.ts` — orchestrator (online listener, interval poller, dashboard-mount catchup)
- `components/montree/PendingPhotosPill.tsx` — header pill + sheet
- `lib/montree/offline/types.ts` — shared types (`QueuedPhoto`, `SyncStatus`)

**Modify:**
- Wherever photo capture currently calls upload directly — search for `/api/montree/photo-upload` or similar route. Replace direct call with `enqueuePhoto()`.
- `components/montree/DashboardHeader.tsx` — mount `PendingPhotosPill`
- `app/montree/dashboard/page.tsx` — kick off sync-engine on mount
- `app/montree/dashboard/photo-audit/page.tsx` — refresh pill after upload completes

**Don't touch yet:**
- `public/montree-sw.js` (Phase A doesn't need SW changes)
- `lib/montree/cache.ts` (that's Phase B)

### Implementation order

1. Create the `idb` wrapper (`lib/montree/offline/db.ts`). Single function `openMontreeDB()` returning typed handle. Object stores defined.

2. Build the queue layer (`lib/montree/offline/photo-queue.ts`) with full unit-test-style functions in isolation. No UI yet.

3. Build sync engine (`lib/montree/offline/sync-engine.ts`). Wire up online event, interval, manual trigger.

4. Find the current photo capture upload site. Read carefully. Identify the synchronous upload call.

5. Refactor the upload site to write through the queue. Keep the existing optimistic UI logic.

6. Build `PendingPhotosPill` component with the sheet.

7. Wire pill into `DashboardHeader`.

8. Test offline: Chrome DevTools → Network → Offline → take a photo → see it queue → toggle back online → see it upload.

9. Commit + push.

### Schema (IndexedDB)

```typescript
// montree-offline database, version 1

interface MontreeDB {
  photo_queue: {
    key: string; // UUID
    value: {
      id: string;           // client-generated UUID
      blob: Blob;           // raw photo bytes
      classroomId: string;
      childId: string | null;  // null if not yet attributed
      capturedAt: string;   // ISO timestamp
      status: 'pending' | 'uploading' | 'uploaded' | 'failed';
      retryCount: number;
      lastError: string | null;
      lastAttemptAt: string | null;
    };
    indexes: {
      by_status: string;     // for "find all pending"
      by_captured: string;   // for chronological display
    };
  };

  api_cache: { /* Phase B */ };
  meta: { /* sync state */ };
}
```

### Acceptance criteria — Phase A

- Capture photo offline (Chrome DevTools offline mode) → photo appears in pending pill within 1s
- Toggle online → photo uploads within 30s, pill count decrements
- Force a 500 from server → photo marked failed, surfaced in pill, "Retry" button works
- Close browser tab while offline → reopen → pending photo still present, still uploads when online
- Take 30 photos offline → all queue → toggle online → all upload (test the high-volume case)
- Photo audit page sees the uploaded photos correctly attributed

---

## Phase B — Persistent Read Cache (Sunday morning)

### Estimated time
4-6 focused hours.

### Files to touch / create

**Create:**
- `lib/montree/offline/api-cache.ts` — IndexedDB-backed cache with TTL + maxAge logic
- `lib/montree/offline/sync-engine.ts` — extend with cache-warm-up routine
- `components/montree/OfflineIndicator.tsx` — top-of-app amber bar
- `app/montree/offline/page.tsx` — RICHER offline page (currently just exists as a route stub for SW fallback)

**Modify:**
- `lib/montree/cache.ts` — extend `useMontreeData()` to optionally read-through from IndexedDB
- `public/montree-sw.js` — bump to v9, add `/montree/dashboard` and `/montree/admin` to `PRECACHE_ASSETS`
- `app/montree/layout.tsx` — mount `OfflineIndicator`

### Implementation order

1. Build IndexedDB-backed cache (`lib/montree/offline/api-cache.ts`). Allow-list of cacheable URL patterns (regex matching). `cacheGet()`, `cacheSet()`, `cachePurgeStale()`.

2. Extend `useMontreeData()` in `lib/montree/cache.ts` to read-through from IndexedDB when in-memory miss + URL matches allow-list. Write-through on set.

3. Build cache-warm-up: after dashboard mounts, prefetch the allow-listed URLs for current classroom + recent children. Quietly populates IndexedDB so next offline session has data.

4. Build `OfflineIndicator` — listens to `online`/`offline` events, renders amber bar.

5. Bump SW to v9. Add the two dashboard pages to PRECACHE_ASSETS. Test that Add-to-Home-Screen install gets them.

6. Test offline: warm cache by browsing online → DevTools Offline → close + reopen tab → page loads from SW → data hydrates from IndexedDB → user sees yesterday's roster.

7. Commit + push.

### Acceptance criteria — Phase B

- Browse the dashboard online for 30 seconds (warms cache)
- DevTools → Offline → close tab → reopen → dashboard loads with current classroom roster from cache
- Stale indicator visible (small clock icon + tooltip)
- Open a child profile that was viewed online — loads from cache
- Open a child profile NEVER viewed online — graceful "not available offline" state, not a crash
- Toggle back online → indicator clears → background refresh fires → indicator stays clear
- Tracy / Mira / weekly wrap correctly fail with "this needs network" instead of attempting cached AI responses

---

## Phase C — Full Offline Edit Queue (Sunday afternoon: SCOPING ONLY)

**No code shipping in this phase this weekend.** Output is an architectural design doc + schema + open-questions list, ready for the next sprint.

### What needs to be designed

#### C1. Operation log
Every mutation (POST/PATCH/DELETE to Montree API) gets recorded as an operation in IndexedDB BEFORE the network call. Schema:

```typescript
interface QueuedOperation {
  id: string;              // UUID
  url: string;             // full API URL
  method: 'POST' | 'PATCH' | 'DELETE';
  body: unknown;           // serialized request body
  optimisticState: unknown; // what the UI showed immediately
  createdAt: string;
  status: 'pending' | 'sent' | 'failed' | 'conflict';
  attempts: number;
  serverResponse: unknown | null;
  conflictResolution: 'auto' | 'manual' | null;
}
```

Operations applied optimistically to UI immediately. Sent to server when online.

#### C2. Conflict resolution policy

Simple fields (last-write-wins): notes, descriptions, status flags. Server returns latest, client overwrites local optimistic state.

Append-only collections (CRDT-friendly): observation logs, photo attachments, message threads. Both edits land, no conflict.

Hard conflicts (rare): the same single field edited by two people while one was offline. Examples: classroom assignment, child name. Surface a "resolve" dialog with both versions, let user pick. Until resolved, that record's local state is locked.

Lock in: which fields are which? Need a per-endpoint conflict policy table.

#### C3. AI endpoint queueing

When teacher triggers Tracy / Mira / weekly-wrap offline:
- Record the request in operation log with type='ai_request'
- Show pending state in UI
- When online: replay request, surface result in original location (notification + scroll-to)

Risk: replay 4 hours later may produce different results (data has changed). Acceptable for v1 — flag in result UI ("generated from data as of {when_queued}").

#### C4. Sync engine state machine

```
[idle] --online event--> [syncing]
[syncing] --all sent--> [idle]
[syncing] --conflict--> [conflict-pending]
[conflict-pending] --resolved--> [syncing]
[idle] --offline event--> [offline]
[offline] --online event--> [syncing]
```

Visual indicator throughout. Never lose user data — operations sit in queue until explicitly confirmed sent.

#### C5. Authentication offline

Auth cookie may expire mid-offline-session. When sync resumes and hits 401:
- Surface "session expired, please log in" banner
- Hold all queued operations (don't delete)
- After re-auth, replay queue
- Critical: queue blob photos (Phase A) need same treatment

#### C6. Schema migration story

How does cache schema change without losing user data? Versioned IndexedDB upgrades. On schema change, attempt graceful migration; if not possible, archive old data + start fresh with a "we updated, here's what we kept" notification.

### Hard problems to flag for next sprint

1. **Conflict UX is a real design problem.** Not just engineering. How does a teacher resolve "you and the principal both edited Sandpaper Letters status for Amy"? Mock-ups needed before code.

2. **Selective sync.** A school with 200 kids — do we cache everything or just current classroom? Current classroom is right answer. Edge: principal switching between classrooms.

3. **Photo cache size.** Local storage isn't infinite. Need eviction policy. LRU? Time-based? Manual?

4. **AI feature degradation surface.** "This feature requires connection" — needs to feel intentional, not broken. Per-feature copy + design.

5. **Multi-tab coordination.** Two tabs open, both queue operations, both come back online — operations should not duplicate. Use BroadcastChannel + leader election.

6. **Service worker upgrade across queued data.** When SW bumps version, IndexedDB shouldn't be wiped. Test the upgrade path.

7. **Performance.** Hydrating from IndexedDB on every page mount could be slow if data set is large. Lazy hydrate per panel.

### Estimated build cost (after scoping)

3-4 weeks of focused engineering for Phase C. Roughly:
- Week 1: Operation log + simple-field LWW conflict resolution
- Week 2: CRDT-friendly collections + AI request queueing
- Week 3: Conflict UI + manual resolution
- Week 4: Edge cases (auth expiry, schema migration, multi-tab)

Should be a dedicated sprint with a single owner. Do NOT mix with feature work.

---

## Quick Wins — interleave throughout the weekend

These can land between Phase A and Phase B, or while compile/build is running, or when stuck on Phase C scoping.

### QW1. LinkedIn company page About section (Session 113 task #3)

~2000 char copy, three paragraphs, matches the locked About page facts exactly. Tagline (120 char max). Already approved facts:

- Legal name: Montree Limited
- BRN: 80261361
- Founded: 23 April 2026
- Founder: Tredoux Willemse, AMS-certified Montessori Young Learner Specialist
- Beijing, currently teaching PreK 4
- Hong Kong SAR jurisdiction
- Contact: hello@montree.xyz

Deliver as one-click copy block. Send back through user → Browser Claude approval → Tredoux pastes into LinkedIn.

### QW2. Cloudflare Email Routing walkthrough doc (Session 113 task #4)

The walkthrough was already written in the prior Browser Claude prompt. Pull it into a standalone markdown doc at `docs/operations/CLOUDFLARE_EMAIL_ROUTING.md` so it persists in the repo for reference.

### QW3. Sitemap audit (Session 113 task #5)

Inspect `package.json` and look for `next-sitemap.config.*`. Determine: is the existing `montree.xyz/sitemap.xml` generated by next-sitemap or hand-rolled in `/public/sitemap.xml`?

If next-sitemap: add `/montree/about` to the URL list, regenerate.
If hand-rolled: add `<url>` entry for `/montree/about` directly.

Either way, ship + push.

### QW4. og-image.png redesign (Session 113 task #6)

Current `/public/og-image.png` is off-brand teal. Replace with brand-aligned 1200x630 PNG:
- Dark forest gradient background (matches favicon palette)
- Lora gold M monogram on left (mini favicon style, ~280x280)
- "Montree" wordmark in Lora gold serif, large
- "Montessori School Management" tagline below in lighter color
- "montree.xyz" small at bottom right

Generate via Pillow + Lora font (already in the sandbox per Phase A prep). Replace existing file. Commit + push. Cloudflare cache purge needed for OG card update.

---

## Risks & failure modes to watch for

### R1. Breaking the Session 76 SW contract
The whole point of v8 is "API calls always go to network." If Phase A or Phase B accidentally adds API caching to the SW, we re-introduce the stale-shell bug. Solution: keep all API caching client-side via `lib/montree/cache.ts` extension. SW only handles static + navigation.

### R2. Photo blob storage size
Each photo is 2-5 MB. 30 photos = 100+ MB in IndexedDB. Mobile Safari may quota-restrict. Mitigation: detect quota errors, surface "device storage full" banner, prevent further captures until queue drains.

### R3. Race conditions in upload
Multiple captures triggering multiple sync attempts. The sync engine should serialize uploads (one at a time) or limit concurrency to 2-3. Don't fire 30 parallel uploads on reconnect — will timeout / fail / hammer the server.

### R4. Auth cookie expiring mid-offline-session
JWT expires. Photo queue piles up. User reconnects, all uploads 401. Mitigation: catch 401, surface re-auth UI, hold queue. Don't delete on 401 — that loses user work.

### R5. Optimistic UI lying
Photo "captured" but eventually fails. Don't show as confirmed until upload succeeds. Use distinct "pending" / "synced" visual states.

### R6. Service worker update during active offline session
SW bumps mid-session. Old IndexedDB schema. New code expects v2 schema. Use IndexedDB versioned upgrades; never lose data on bump.

### R7. Phase B cache poisoning
Cached `/api/montree/children` from teacher A served to teacher B if cache key is just URL. MUST scope cache keys by user ID OR rely on server-set cache headers. Recommendation: include `userId` from JWT in IndexedDB cache key.

### R8. Weekend energy
Long build sessions tank quality. Force breaks. Don't ship unaudited code. Re-read each file before commit. Test on real device (iPhone) for at least Phase A before signing off.

---

## Reference: existing infrastructure to extend

Read these files BEFORE starting each phase. Don't re-invent.

| File | Why it matters |
|---|---|
| `public/montree-sw.js` (v8) | Current SW. Lines 116-117 enforce "API never SW-touched" — Session 76 contract. Don't break. Bump to v9 in Phase B for new precache entries. |
| `lib/montree/cache.ts` | Existing in-memory SWR cache. `useMontreeData()` hook is the canonical data-fetch surface. Extend, don't replace. |
| `lib/montree/api.ts` | `montreeApi()` wrapper. Already has retry-on-network-error for GET/HEAD (Tier 4.1, Session 107). Cookie-based auth. Use as-is. |
| `app/montree/dashboard/photo-audit/page.tsx` | Current photo capture / upload site. Read carefully to find the upload call to refactor. |
| `components/montree/DashboardHeader.tsx` | Where the pending-photos pill mounts. |
| `app/montree/offline/page.tsx` | Currently a stub. Phase B makes it useful. |
| `app/layout.tsx` | Where `OfflineIndicator` mounts. Already imports fonts + sets metadata — careful. |

---

## Acceptance criteria for the weekend overall

By Sunday night:

- ✅ Phase A shipped + pushed + verified on real iPhone with airplane mode toggle
- ✅ Phase B shipped + pushed + verified
- ✅ Phase C scoping doc complete at `docs/handoffs/OFFLINE_FIRST_PHASE_C_DESIGN.md`
- ✅ All 4 quick wins shipped or documented
- ✅ CLAUDE.md updated with Session 113 entry capturing weekend's work
- ✅ No regressions on existing functionality (especially the Session 76 SW contract)

If Phase B can't ship cleanly Sunday morning, push to next sprint. Don't rush. Phase A alone is a meaningful win.

---

## Decision log — choices already locked in

These are answered. Don't re-debate tomorrow.

1. **`idb` library, not Dexie or raw IndexedDB.** ~3KB gzip, typed wrapper, just enough.
2. **All persistence client-side, NOT in SW.** Preserves Session 76 contract.
3. **Allow-list of cacheable URLs, not "cache everything GET."** Prevents auth bleed + AI cost on retry.
4. **Photo blobs in queue rows, not separate blob store.** Atomic delete.
5. **Single global `OfflineIndicator`, no per-component banners.** Less noise.
6. **Phase C scoping only this weekend.** Build is next sprint.
7. **No Capacitor / native wrap this weekend.** Per Session 113 strategic discussion.
8. **iPhone real-device test is mandatory before Phase A merge.** Browser DevTools offline ≠ real airplane mode.
9. **English-only for UI strings in offline indicators.** i18n batch can come later.
10. **Don't touch the Session 76 "API never SW-touched" contract.** Hard rule.

---

## Suggested Saturday sequence (~10 focused hours)

```
09:00  Read this doc end-to-end. Re-verify decision log.
09:30  Read public/montree-sw.js + lib/montree/cache.ts + photo-audit page.
10:00  Phase A.1: idb wrapper + db.ts
10:30  Phase A.2: photo-queue.ts (queue API, no UI)
11:30  Phase A.3: sync-engine.ts (online listener, interval, catchup)
12:30  Lunch — read what was built, audit cycle 1.
13:30  Phase A.4: refactor photo capture to use queue
15:00  Phase A.5: PendingPhotosPill component + sheet
16:00  Phase A.6: wire into DashboardHeader
16:30  Local test: DevTools offline / online cycles
17:00  iPhone airplane-mode test (real device)
17:30  Audit cycle 2 — re-read all changed files
18:00  Commit + push
18:30  QW1: draft LinkedIn About copy (one-click block)
19:00  Done for the day. Phase B tomorrow.
```

## Suggested Sunday sequence (~8 focused hours)

```
09:00  Phase B.1: api-cache.ts (IndexedDB-backed)
10:00  Phase B.2: extend cache.ts useMontreeData hook
11:00  Phase B.3: cache warm-up routine
12:00  Phase B.4: OfflineIndicator + SW bump to v9
12:30  Lunch — audit cycle 1 of Phase B
13:30  Phase B.5: testing — close tab while offline, reopen, hydrate
14:30  iPhone real-device test
15:00  Phase B audit cycle 2 + commit + push
15:30  QW2-4: Cloudflare doc, sitemap audit, og-image redesign
17:00  Phase C scoping doc (Phase C.1-C7 from this doc, expanded)
18:30  CLAUDE.md update — Session 113 entry
19:00  Done. Burn complete.
```

---

## Notes for whoever picks this up

- The user (Tredoux) wants to push HARD this weekend. Don't sandbag estimates.
- But also don't ship sloppy. Audit cycles are non-negotiable, especially around the SW.
- Real-device iPhone test is the canonical pass criterion. DevTools offline lies.
- Browser Claude is running in parallel handling LinkedIn page setup, Search Console, Cloudflare guidance with Tredoux directly. Don't duplicate that work — focus on code.
- The `/montree/about` page from Session 113 ships with `logo-1024.png` referenced in JSON-LD. If you delete or rename that file during Phase A/B work, the About page JSON-LD breaks. Don't.
- The /api/ exclusion at line 117 of `montree-sw.js` is load-bearing. Touching it requires re-reading Session 76 in CLAUDE.md and probably needs explicit approval first.

End of plan. Build well.
