# Performance Pass — June 13, 2026 (Tier 2 item 9)

Lighthouse 13.4.0, mobile config (default), headless Chrome, run from the Mac against
production `https://montree.xyz` (Railway origin behind Cloudflare). Code audit on branch
`burn-jun12-night2`. **No code changes made — findings + recommendations only.**

Lens for ranking: users are mostly in China/Asia. Cloudflare has PoPs near them for
static assets (confirmed `cf-cache-status: HIT`), but every **dynamic round trip**
(SSR HTML, `/api/montree/*`) goes to the Railway origin — observed server-response-time
was 514–615ms from a US connection; from China expect 800ms–1.5s per round trip.
**Round trips matter more than bytes-on-wire here.**

---

## Part 1 — Lighthouse scores (mobile)

| Page | Perf | FCP | LCP | TBT | CLS | Total bytes | Top opportunity |
|---|---|---|---|---|---|---|---|
| `/montree` (splash) | **46** | 2.7s | 4.8s | 10ms | **0.931** | **13,452 KiB** | server-response-time 554ms |
| `/montree/explainer` | **56** | 2.5s | 4.0s | 70ms | **0.636** | 3,963 KiB | server-response-time 547ms |
| `/montree/login-select` | **82** | 2.4s | 3.7s | 10ms | 0.000 | 402 KiB | server-response-time 615ms |
| `/pricing` | **74** | 2.6s | 4.8s | 0ms | 0.034 | 426 KiB | server-response-time 514ms |
| `/support` → **307 to `/`** | 47* | 2.7s | 4.8s | 50ms | 0.931 | 19,412 KiB | **redirects 1,245ms** |

\* The `/support` run never reached a support page — production 307-redirects
`/support` → `/` (re-probed with `curl -sI`, confirmed; `/montree/support` is a 404 in
prod). The page exists in code (`app/support/page.tsx`) but **tonight's build is not
deployed yet**. The score shown is effectively the splash page plus a 1.2s redirect tax.

Per-page top-3 opportunities (Lighthouse, estimated savings):

- **/montree** — 1) server-response-time 554ms, 2) unused-javascript 150ms (~27KB),
  3) *(diagnostic)* 13.4MB total weight dominated by `montree-splash-video-v4.mp4`
  (5.7MB, fetched **twice**) + `montree-splash-video-zh-v3.mp4` (3.5MB).
- **/montree/explainer** — 1) server-response-time 547ms, 2) unused-javascript 150ms,
  3) *(diagnostic)* `main-explainer.mp4` 3.5MB eagerly preloaded; CLS 0.64.
- **/montree/login-select** — 1) server-response-time 615ms, 2) unused-javascript 300ms
  (~50KB). Otherwise clean (CLS 0, 402KB total). Best page of the five.
- **/pricing** — 1) server-response-time 514ms, 2) unused-javascript 150ms (~50KB).
  Clean apart from TTFB.
- **/support** — 1) redirects 1,245ms, 2) server-response-time 517ms, 3) inherits all
  splash-page weight because it lands on `/`.

Static/CDN posture (Part 3 probes):
- `/_next/static/...` → `cache-control: public, max-age=31536000, immutable`,
  `cf-cache-status: HIT` (age 572587). Correct.
- `woff2` font → same immutable header, `accept-ranges: bytes`. Correct.
- Explainer video via `/api/montree/media/proxy/explainer/main-explainer.mp4` with a
  Range request → `206`, `content-range: bytes 0-1023/5885282`,
  `cache-control: public, max-age=14400, s-maxage=86400, stale-while-revalidate=604800`,
  `cf-cache-status: HIT`. Range + CDN caching both working — video bytes are served
  from a PoP near the user, not Railway. Good.

---

## Part 2 — Teacher dashboard payload audit (`/montree/dashboard`)

### (a) Endpoints fetched on first load + over-fetching

Cold-load mount fires **up to 9 API round trips**, several serialized:

| # | Endpoint | Fired from | Notes |
|---|---|---|---|
| 1 | `GET /api/montree/features?school_id=` | `lib/montree/features/cache.ts:83` via `FeaturesProvider` (`app/montree/dashboard/layout.tsx:35`) | `cache: 'no-store'`; gates #7/#8 rendering |
| 2 | `GET /api/montree/children?classroom_id=` | `app/montree/dashboard/page.tsx:225-228` (`useMontreeData`) | the main grid query |
| 3 | `GET /api/montree/children?classroom_id=` **(duplicate)** | `components/montree/DashboardHeader.tsx:241-263` (raw `montreeApi`, own sessionStorage cache) | same URL as #2 but bypasses the SWR cache — two identical queries race on cold load |
| 4 | `GET /api/montree/classroom/teachers?classroom_id=` | `components/montree/DashboardHeader.tsx:266-288` | header teacher menu |
| 5 | `GET /api/montree/onboarding/voice/status` | `app/montree/dashboard/page.tsx:426-447` | **render-blocking** — see waterfall below |
| 6 | `GET /api/montree/dashboard/daily-focus` | `components/montree/focus/TodaysFocusStrip.tsx:101` | `no-store` |
| 7 | `GET /api/montree/dashboard/group-lessons` | `components/montree/GroupLessonCard.tsx:77` | only after features resolve |
| 8 | `GET /api/montree/dashboard/curriculum-gaps` | `components/montree/CurriculumGapCard.tsx:88` | only after features resolve |
| 9 | `GET /api/montree/appointments` | `components/montree/appointments/PendingAppointmentsBanner.tsx:100-127` | full hydrated list for a usually-empty banner |

**The waterfall is the real problem (China lens).** The skeleton-hold guards serialize
three stages of round trips before anything renders:

1. `getSession()`/`recoverSession()` → children URL becomes non-null
   (`page.tsx:224-228`, recover path `page.tsx:326-337`)
2. children fetch resolves (`page.tsx:460-462` + trust gate `page.tsx:476-485` hold
   `<DashboardSkeleton/>` until then)
3. **then** the `willProbe` guard (`page.tsx:497-504`) holds the skeleton again until
   `/api/montree/onboarding/voice/status` resolves (`page.tsx:426-447`) — and that gate
   itself needs the features fetch (#1) to have resolved first, since
   `isEnabled('tell_guru_onboarding')` is fail-closed-false while loading
   (`hooks/useFeatures.ts:23-26`, `lib/montree/features/context.tsx:80-86`).

At ~800ms–1.5s per round trip from China, that's a **2.5–4.5s skeleton on every cold
load** even though the grid data arrived in stage 2.

**Over-fetching (SELECT vs rendered):**

- `app/api/montree/children/route.ts:203` —
  `select('id, name, age, photo_url, notes, classroom_id, enrolled_at')`.
  The dashboard `Child` interface uses **only `id`, `name`, `photo_url`**
  (`page.tsx:55-59`); DashboardHeader's `StudentOption` likewise. `notes` is capped at
  5,000 chars (`children/route.ts:27-29`) — a 35-child classroom with rich notes can ship
  **~175KB of JSON nobody renders**, on the hottest endpoint, twice per cold load (#2+#3).
- `app/api/montree/onboarding/voice/status/route.ts:45-49` re-selects the entire
  children roster (`id, name, photo_url`) server-side — duplicate DB work of #2/#3; the
  dashboard only uses `pending.length` (`page.tsx:437-438`), yet the payload carries the
  full pending-children array with photo URLs.
- `app/api/montree/appointments/route.ts:129-185` hydrates appointments + hosts +
  parents + children + teachers (5 queries) and returns **all** appointments in range;
  the banner then filters client-side to "pending where I'm a pending host"
  (`PendingAppointmentsBanner.tsx:109-122`). A `?status=pending&host=me` param would
  make this a near-empty payload and 1 DB query for 99% of loads.

### (b) N+1 patterns

- **No per-child fetch loops on the dashboard mount path** — good. The grid prefetch
  (`page.tsx:853-863`) fires `prefetchUrl('/api/montree/progress?child_id=')` only on
  hover/focus/touch per child, deduped (`lib/montree/cache.ts:292-312`). Deliberate, fine.
- Server-side N+1 (not mount-critical): `app/api/montree/dashboard/daily-focus/route.ts:124-129`
  verifies each child in a `for` loop with sequential `await verifyChildBelongsToSchool()`
  calls on POST — a 10-child focus list = 10 serial DB round trips. Batch with one
  `.in('id', ids)` query.

### (c) Payload-size risks

- **`notes` in the children list** (above) — the single biggest avoidable payload on the
  hot path. No base64 blobs found; `photo_url` is a URL, proxied via `getProxyUrl`
  (`page.tsx:119,150`), images lazy-loaded with `onError` fallbacks. Good.
- **Silent 1000-row truncation:** `app/api/montree/dashboard/group-lessons/route.ts:135-138`
  fetches all progress rows for the roster with **no pagination and no `.limit()`** —
  Supabase caps at 1000 rows silently. The sibling route knows this and pages
  (`curriculum-gaps/route.ts:124-135`: "a busy classroom can exceed the 1000 default").
  A busy classroom gets *wrong group suggestions*, not a crash. Correctness > perf bug.
- `appointments` is bounded (`.limit(500)`, `appointments/route.ts:92`) — fine.
- `children` query is unbounded but classroom-scoped (~10–40 rows) — fine.

### (d) Client bundle red flags on the route

- The page is in good shape: **27 heavy panels are `dynamic(..., { ssr: false })`**
  (`page.tsx:26-52`). Auth is JWT-verify only, no DB hit per request
  (`lib/montree/verify-request.ts:37-93`).
- **Dead dynamic imports** — declared but never rendered in the JSX:
  `WeeklyAdminCard` (:34), `ShelfAutopilotCard` (:38), `AttendanceWidget` (:39),
  `StaleWorksPanel` (:40), `ConferenceNotesPanel` (:41), `PulsePanel` (:42),
  `EvidencePanel` (:43), `PaperworkPanel` (:44), `DailyBriefPanel` (:45),
  `BirthdayBanner` (:46). Also `WelcomeModal`/`DashboardGuide` rendered behind
  `{false && ...}` (`page.tsx:887,896`). Near-zero runtime cost (lazy chunks never
  requested) but dead code that confuses future audits — delete.
- `unused-javascript` ~27–50KB flagged on every public page — shared framework chunk,
  low priority.

---

## Part 3 — Service worker + caching posture (verified, no change proposed)

`public/montree-sw.js` is **immutables-only by design** (Session 76 rule —
cross-user cache poisoning). Verified, not challenged:

- Cache name `montree-v10` (`montree-sw.js:41`).
- Cacheable set = `/_next/static/`, `/montree-icons/`, and immutable extensions only
  (`montree-sw.js:47-58`); **API calls explicitly skipped** (`:128`), non-cacheable
  non-navigation requests not intercepted at all (`:138`).
- Precache = offline page, parent login/dashboard shells, manifest, 2 icons (`:62-69`).
- Navigations: network-first with offline-page fallback, no synthetic 503s (`:169-177`).
- Server headers back this up: `/_next/static` → `immutable` + CF HIT; explainer video →
  `206` + `accept-ranges` + `s-maxage=86400` + CF HIT (see Part 1 probe results).
  **Posture is correct. Leave it alone.**

One observation only: the static-asset strategy is network-first-then-cache
(`montree-sw.js:144-162`). For content-hashed `/_next/static/` URLs, cache-first would
save a round trip per asset on flaky China connections — but the browser HTTP cache
already absorbs most of this (immutable). Optional, low value, touches the SW —
**recommend not doing it** under the Session 76 rule unless PWA cold-start telemetry
says otherwise.

---

## Findings, ranked by user impact (China-latency lens)

### 1. Dashboard cold-load waterfall: 3 serialized round-trip stages before first render
- **Where:** `app/montree/dashboard/page.tsx:497-504` (`willProbe` skeleton hold),
  `:426-447` (voice/status probe), `:476-485` (trust gate); gated on features
  (`lib/montree/features/context.tsx:40-64`).
- **Impact:** every teacher, every cold open; ~1–2.5s of avoidable skeleton in Asia.
- **Fix:** stop render-blocking on `voice/status`. Render the grid as soon as children
  arrive; let the onboarding-choice screen take over *if/when* the probe returns
  pending>0 (it's a full-screen takeover anyway — a 300ms-late takeover is fine, and the
  per-classroom `photo` localStorage flag already suppresses re-shows). Alternatively
  fold `pending_onboarding_count` into the `/children` response (one fewer endpoint).
- **Effort:** S–M (delete one guard + handle late takeover; or +1 field server-side).

### 2. `/children` ships `notes` (≤5KB/child) nobody renders — twice per cold load
- **Where:** `app/api/montree/children/route.ts:203` (SELECT list);
  consumers `page.tsx:55-59`, `DashboardHeader.tsx:253`.
- **Impact:** hottest authed endpoint; up to ~175KB × 2 of dead JSON per cold load on
  3G/4G China connections; also slows the Supabase query.
- **Fix:** drop `notes` (and `age`, `enrolled_at`, `classroom_id` unless another caller
  needs them — grep callers first; child-detail pages fetch `/children/[childId]`
  separately). Keep `id, name, photo_url`.
- **Effort:** S (one line + caller sweep).

### 3. Duplicate children fetch: header bypasses the SWR cache
- **Where:** `components/montree/DashboardHeader.tsx:241-263` raw `montreeApi` GET of the
  exact URL the page fetches via `useMontreeData` (`page.tsx:225-228`).
- **Impact:** +1 origin round trip and duplicate DB query on every cold dashboard load
  (the header's sessionStorage TTL hides it on revisits only).
- **Fix:** switch the header to `useMontreeData(childrenUrl)` — the in-memory cache dedupes
  in-flight requests (`lib/montree/cache.ts:114-126`), so both consumers share one GET.
- **Effort:** S.

### 4. Splash page: 13.4MB on load (dual-locale hero videos + double-fetch), CLS 0.93
- **Where:** `app/montree/page.tsx:97-104` (fetch-prime of BOTH locale videos),
  `:855-872` (two `<video preload="auto" autoPlay>` elements, EN 5.7MB + ZH 5.3MB);
  Lighthouse shows `montree-splash-video-v4.mp4` fetched **twice** (the fetch() prime
  races the video element's own request — `cache: 'force-cache'` doesn't dedupe an
  in-flight media request with Range semantics). CLS 0.931 attributed to
  `section.m-hero` (Lighthouse layout-shifts audit).
- **Impact:** first marketing impression in China: LCP 4.8s, near-worst-case CLS, and
  ~11–15MB pulled on mobile data. CF HIT mitigates distance but not size.
- **Fix:** (i) load only the active locale's video, `preload="metadata"` + poster for
  the inactive one, swap to `preload="auto"` on first toggle hover/tap — keeps the
  instant-toggle goal for the 2nd video at 1/10th the cost; (ii) remove the fetch()
  prime (`:97-104`) — it's the double-fetch source; (iii) chase the m-hero CLS: give
  `.m-hero-corner-video-frame` a fixed aspect-ratio box and check the reveal pattern
  (`page.tsx:123-127` sets transform via ref post-hydration) plus font swap on the Lora
  headline.
- **Effort:** M.

### 5. `/support` not live — 307 redirect to splash (and Lighthouse run 5 measured `/`)
- **Where:** prod routing; page exists at `app/support/page.tsx` but tonight's build
  isn't deployed. `curl -sI https://montree.xyz/support` → `307 location: /`;
  `/montree/support` → 404.
- **Impact:** any user/App-Store-reviewer hitting the support link tonight gets the
  marketing splash after a 1.2s redirect chain — broken expectation, not just perf.
- **Fix:** deploy; re-run Lighthouse on the real page after deploy. Zero code change.
- **Effort:** S (deploy + verify).

### 6. Group-lessons progress query silently truncates at 1000 rows
- **Where:** `app/api/montree/dashboard/group-lessons/route.ts:135-138` (no `.range()`
  pagination, no `.limit()`), vs. the paged sibling `curriculum-gaps/route.ts:124-135`.
- **Impact:** correctness — busy classrooms get suggestions computed on a truncated
  progress set. Payload itself is fine.
- **Fix:** copy the 1000-row paging loop from curriculum-gaps (or select only the
  columns used: `child_id, work_name, status` — already minimal).
- **Effort:** S.

### 7. Appointments banner over-fetches a fully-hydrated list to show usually-nothing
- **Where:** `app/api/montree/appointments/route.ts:86-185` (5-table hydration),
  client filter `PendingAppointmentsBanner.tsx:109-122`.
- **Impact:** 1 extra heavy-ish origin round trip per dashboard load; payload usually
  discarded entirely.
- **Fix:** add `?pending_for=me` server-side filter returning ids+minimal fields; or
  defer this fetch by 2s post-render (banner is non-critical).
- **Effort:** S–M.

### 8. Explainer page: 3.5MB hero auto-preload, no poster, CLS 0.64
- **Where:** `app/montree/explainer/page.tsx:622-631` — `preload="auto" autoPlay`, **no
  `poster` attr**, no fixed aspect-ratio on `.ex-hero-video`; grid section also shifts
  (CLS 0.461 on `.ex-features`, likely i18n `t()` hydration swap).
- **Fix:** add poster + `aspect-ratio` CSS to the hero frame; `preload="metadata"` until
  in-viewport (12 gallery videos already lazy). CLS fix matters more than the bytes.
- **Effort:** S–M.

### 9. Server response time 514–615ms on every SSR page
- **Where:** Railway origin (all 5 pages flagged; measured from the US — worse from Asia).
- **Impact:** floor under every page's FCP; public marketing pages shouldn't pay SSR tax.
- **Fix:** make `/pricing`, `/support`, `/montree` static/ISR (`export const dynamic =
  'force-static'` / `revalidate`) so Cloudflare can cache the HTML at the edge — this is
  the single biggest China-latency lever for the public funnel. (`/montree/layout.tsx`
  reads `cookies()` for locale (`app/montree/layout.tsx:118-123`), which forces dynamic
  rendering of every `/montree/*` page — worth a deliberate design pass.)
- **Effort:** M–L (locale-cookie read must move client-side or to middleware rewrite).

### Minor
- Dead dynamic imports on dashboard (`page.tsx:34-46`) + `{false && ...}` blocks
  (`:887-902`) — delete. Effort: S.
- `features` endpoint fetched `no-store` (`lib/montree/features/cache.ts:83`) but has a
  proper 5-min sessionStorage cache — fine as is.

---

## The 3 fixes I'd do first

1. **Un-block the dashboard render from the voice-status probe** (Finding 1,
   `page.tsx:497-504`) — removes a full origin round trip from the critical path for
   every teacher, every cold open. Biggest felt win in China for paying users.
2. **Slim `/children` SELECT + dedupe the header's duplicate fetch** (Findings 2+3,
   `children/route.ts:203` + `DashboardHeader.tsx:241-263`) — two small diffs, kills the
   double query and up to ~350KB of dead JSON on the hottest authed path.
3. **Single-locale splash video + kill the fetch-prime + fix m-hero CLS** (Finding 4,
   `app/montree/page.tsx:97-104, 855-872`) — the splash is the first thing every
   prospect (and the App Store reviewer) sees; 46→~75+ perf and CLS 0.93→~0 are within
   reach without touching the instant-toggle UX promise.

(Finding 5 — deploy so `/support` exists — is a release action, not a code fix, but do
it tonight before the reviewer clicks the support link.)

---

## SSR edge-caching options (follow-up to Finding 9)

### What actually forces dynamic rendering (the real cookies() story)

`app/montree/layout.tsx:118-123` reads `cookies()` to get `mt_locale` and SSR-render the
right language (no English flash). That read **does** opt the whole `/montree/*` subtree
into dynamic rendering — but it is **not the only cause, nor the widest one**:

- **Root `app/layout.tsx` reads `headers()`** (`x-hostname`, lines ~28-32 in
  `generateMetadata` and ~178 in `RootLayout`) to serve domain-aware metadata + JSON-LD
  (Montree vs Whale-Class branding). `headers()` is a dynamic API, so it opts **every
  page in the app** into dynamic rendering — including the root-level `/pricing`,
  `/support`, `/privacy`, which are **not even under the montree layout**.
- Net effect, verified live with `curl -sI`:
  - `/montree`, `/pricing`, `/privacy` all return
    `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`,
    `cf-cache-status: DYNAMIC`. Cloudflare refuses to cache → Railway origin on every hit
    → the 514–615ms TTFB floor (worse from China).
  - `/montree` additionally carries `set-cookie: mt_locale=de` (the middleware first-visit
    locale seed, `middleware.ts:123-132`). **This is why `/montree` cannot be naively
    shared-cached** — different visitors get different `mt_locale` and a differently-
    rendered locale; one cache entry would leak locale across users.
  - `/support` still 307s in prod (build not yet deployed — matches Finding 5).

How the locale is consumed: the server cookie read seeds `I18nClientWrapper` →
`I18nProvider` (`lib/montree/i18n/context.tsx`) with `initialLocale` + pre-loaded message
data. The provider **already has a client-side fallback**: if no `initialLocale` arrives,
it reads `localStorage` on mount (`context.tsx:130-135`) and writes both `localStorage`
and the `mt_locale` cookie on every switch (`context.tsx:181-187`). So a client-only
locale resolution is technically viable — at the cost of reintroducing an English-flash on
first paint for non-en users (the exact thing the server read was added to kill).

### Blast radius — which pages are under which layout

| Page | Layout chain | Per-user content? | Cacheable? |
|---|---|---|---|
| `/montree` (splash) | root + montree | **Yes** — locale via `mt_locale` cookie + `Set-Cookie` seed | No (per-locale) |
| `/montree/about` | root + montree | No (English-only static), but inherits cookie read | Only if locale read removed for it |
| `/montree/explainer` | root + montree | Locale-translated UI strings | Per-locale |
| `/montree/support` | root + montree | redirects to `/support` | n/a |
| `/montree/login-select`, `/montree/library`, `/montree/try`, … | root + montree | Public funnel, locale-translated | Per-locale |
| `/montree/dashboard`, `/parent/*`, `/admin/*`, `/super-admin/*`, `/agent/*` | root (+ own) | **Yes — authed, per-user** | **Never cache** |
| `/pricing` | **root only** | **No** — `'use client'`, no fetch/cookie/session | **Yes** |
| `/support` | **root only** | **No** — pure server component, no dynamic reads | **Yes** |
| `/privacy` | **root only** | **No** — pure server component | **Yes** |

### The three options

**Option A — split the funnel into its own non-cookie route segment.**
Move the public marketing/funnel pages under a route group whose layout does **not** call
`cookies()`, resolving locale client-side (localStorage) or from the URL, so those pages
can be static/ISR + edge-cached.
- *Effort:* **L.** A route restructure (route groups, moving `app/montree/page.tsx` and
  siblings, splitting the layout, re-pointing internal links). The root `headers()` read
  would also still have to be addressed or those pages stay dynamic anyway.
- *Risk:* **High** for an overnight change — touches the shared layout every public page
  depends on, reintroduces the non-en English-flash, easy to get the `<html lang>` /
  translation seeding subtly wrong. **Not recommended tonight.**

**Option B — middleware-based locale (rewrite to locale-prefixed path / set header).**
Read the cookie in `middleware.ts` (it already runs on every `/montree` request and
already computes locale on first visit) and either rewrite to a locale-prefixed path or
inject an `x-locale` request header the layout reads instead of `cookies()`.
- *Effort:* **M–L.** Reading a request header in the layout still counts as a dynamic read
  unless paired with locale-prefixed *static* routes (`/en/montree`, `/zh/montree`, …),
  which is itself an A-sized restructure plus a `generateStaticParams` matrix across 12
  locales. A pure header-read alone does **not** make the page cacheable.
- *Risk:* **Medium–High.** The locale-prefix variant is the "correct" long-term i18n shape
  but is a big, link-rewriting change. **Not recommended tonight.**

**Option C — keep pages dynamic, but send a cacheable `Cache-Control` for the public,
per-user-free pages only.** A dynamically-rendered page can still carry
`public, s-maxage=…, stale-while-revalidate=…` if it has no per-user content — Cloudflare
will then cache the rendered HTML at a PoP near the user. The current setup sends
`private, no-cache, no-store` (Next.js default for dynamic pages), which is the only reason
CF reports `DYNAMIC`. Overriding it for safe paths flips them to `cf-cache-status: HIT`
without any route restructure.
- *Effort:* **S.** A few entries in `next.config.ts headers()`.
- *Risk:* **Low — for the right paths only.** Safe iff the path has **no per-user content
  and never carries `Set-Cookie`**. `/pricing`, `/support`, `/privacy` qualify: pure
  static content, not under `/montree`, so the middleware's `mt_locale` `Set-Cookie` never
  fires on them. **Must NOT** be applied to `/montree` or `/montree/*` (per-locale +
  `Set-Cookie`) or any authed route — that would serve one user's locale/session from a
  shared cache.

### Recommendation

**Do Option C now for `/pricing`, `/support`, `/privacy` (done — see below). It is the
single biggest China-latency lever for the public funnel that is safe overnight:** it
removes the 514–615ms origin round trip from three public pages with zero restructure and
zero risk of cross-user leakage.

For the locale-bearing pages (`/montree` splash, `/explainer`, the funnel), the win
requires Option A or B and the cooperation of the root `headers()` read — **defer to a
deliberate daytime design pass**, not an overnight change. A pragmatic middle path worth
evaluating then: have the middleware **rewrite the `mt_locale` cookie value into the
Cloudflare cache key (`Vary` / `Cache-Tag` by locale)** so each locale gets its own edge
entry while still being shared across users of that locale — but only after confirming no
`Set-Cookie` rides on the cached response (the first-visit seed would have to move so it
doesn't poison the per-locale entry).

### Change applied (safe, build-verified)

Added a `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` override in
`next.config.ts` (`headers()`) for **exactly three paths**: `/pricing`, `/support`,
`/privacy`.

Why it is safe:
- All three are pure static-content pages — no `cookies()`/`headers()`/`fetch`/session
  reads of their own (`/pricing` is `'use client'` with only local UI state; `/support`
  and `/privacy` are server components with only `metadata` + static JSX).
- None are under `/montree`, so the middleware locale seed
  (`middleware.ts:123`, gated on `pathname.startsWith('/montree')`) **never** sets a
  cookie on their responses — verified live (`/pricing`, `/privacy` carry no `Set-Cookie`).
  No per-user data can be cached.
- The override is scoped to the exact paths; `/montree/*` and all authed routes are
  untouched and keep their `private, no-store` posture.

Effect after deploy: Cloudflare can edge-cache these three pages' HTML
(`s-maxage=3600` CDN TTL, `stale-while-revalidate=86400` keeps them warm), turning
`cf-cache-status: DYNAMIC` → `HIT` and removing the ~514ms origin TTFB for the most
latency-sensitive public/App-Store-reviewer-facing pages. **Effectiveness must be
re-verified post-deploy with `curl -sI` (Next.js can occasionally win the `Cache-Control`
race on dynamic routes; if so, fall back to per-page `export const dynamic`/`revalidate`
once the root `headers()` read is removed).**

Build: `npm run build` on the Mac → **Compiled successfully in 27.7s, BUILD_EXIT=0**, zero
new eslint warnings (`npx eslint next.config.ts` clean). Routes `/pricing`, `/support`,
`/privacy` remain `ƒ (Dynamic)` in the build output — expected; Option C caches the dynamic
output rather than making the page static. **Not committed.**
