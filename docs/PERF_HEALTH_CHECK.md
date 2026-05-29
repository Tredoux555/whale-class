# Montree Performance Health Check — May 10, 2026 (v2 — post-audit)

**Goal:** make the app feel **instant like native** — for principals, teachers, parents, and especially the user himself on flaky Astrill VPN from Beijing.

**Method:** 3x3x3 cycle — three independent perspective audits (Frontend / Backend+Data / Network+UX) → combine v1 → adversarial audit found CVE-class auth leak + 4 missing wins + over-engineering → v2 patches all of it.

**Source of truth:** this doc.

**v2 changes from v1:** added measurement (Web Vitals), Postgres EXPLAIN audit, Railway post-deploy pre-warm; rewrote Tier 1.1 SW caching with mandatory auth-keyed cache plugin (CVE fix); rewrote Tier 1.4 as cookie dispatch (simpler, safer); reordered Tier 2 (2.4 before 2.3); dropped over-engineered items (5.2, 5.5, 6.3); annotated explicit dependencies; updated effort estimate from 40-50h to 55-65h; corrected false premises (next-pwa already has 3 runtimeCaching rules — extend, don't add).

---

## Headline diagnosis (unchanged from v1)

The app is functionally rich but has **three structural perceived-perf gaps**:

1. **Every navigation is a cold network call.** Service worker only caches static assets. On flaky VPN, every dashboard return is a fresh spinner.
2. **No `loading.tsx` files anywhere** (verified empty via `Glob app/**/loading.tsx`). On cold chunk download, blank screen until JS executes.
3. **Astra SSE has no retry, no resume, no rAF throttling.** On VPN hiccup, question + partial answer lost. During streaming, one re-render per token.

Plus mechanical wins (Lora `@import` waterfalls in 6 files, eager-loaded locale files, missing `maxDuration` on 4 AI routes, `select('*')` on hot paths, no image dimensions on 93 `<img>` tags causing CLS).

---

## What "instant like native" means

| Quality | Target | How verified |
|---|---|---|
| First Contentful Paint | < 800ms | `web-vitals` library → `/api/montree/client-error` (Tier 0.12) |
| Time-to-Interactive on cockpit | < 1.5s warm, < 3s cold | same |
| Tap → next-screen visible | < 100ms (warm cache served by SW) | manual measurement on real device |
| Astra first token | < 2s | timestamp on SSE first chunk |
| Photo confirm tap → UI update | < 50ms (optimistic) | manual |
| Cumulative Layout Shift | 0.0 | web-vitals CLS metric |
| Re-render count during typing | 1 per keystroke, scoped to input | React DevTools Profiler |
| VPN drop mid-Astra | invisible — auto-resume | manual VPN-toggle test |
| Cold-start container response | < 1.5s after wake | Railway logs + Tier 0.14 ping loop |

---

## Tier 0 — Quick wins + measurement (under 30 minutes each, batch into one commit)

🚨 **MUST land before any other Tier work.** Several Tier 1 items depend on Tier 0 (see "Explicit dependencies" below).

| # | What | File / spot | Effort | Win |
|---|---|---|---|---|
| 0.1 | Add `maxDuration = 120` to **4 AI routes missing it** | `app/api/montree/guru/stream/route.ts`, `app/api/montree/admin/guru/chat/route.ts`, `app/api/montree/super-admin/guru/route.ts`, `app/api/montree/guru/photo-insight/add-custom-work/route.ts` | 5 min | Eliminates 503 class. **🚨 BLOCKING for Tier 1.1** — without this, SW would cache 503 errors. |
| 0.2 | Add `maxDuration = 30` to billing webhook | `app/api/montree/billing/webhook/route.ts` | 2 min | Prevents Stripe retry storms |
| 0.3 | Switch `works/guide` translator from Sonnet → Haiku | `app/api/montree/works/guide/route.ts:275` | 5 min + spot-check | $30-80/mo + 1-2s on first-view in any non-English locale |
| 0.4 | Manifest `start_url` fix | `public/montree-manifest.json` (verify reference path in `app/layout.tsx`) — change `/montree/parent/login` → `/montree` | 2 min | PWA install from cockpit no longer dumps user on parent login |
| 0.5 | `useMemo` `getStatusConfig(t)` | `components/montree/child/FocusWorksSection.tsx:200` | 3 min | Eliminates dozens of cascaded child re-renders |
| 0.6 | Pin stale Sonnet model id to `AI_MODEL` alias | `app/api/montree/social-guru/route.ts:46`, `app/api/montree/admin/import/route.ts:201` | 2 min | Future model upgrades flow automatically |
| 0.7 | `optimizePackageImports: ['lucide-react']` | `next.config.ts` `experimental` | 2 min | 50-150 KB potential savings (75 files import lucide) |
| 0.8 | Drop unused `recharts` dep | `package.json` — verified zero `from 'recharts'` imports | 5 min | ~150 KB shipped saved |
| 0.9 | `.single()` → `.maybeSingle()` on the 3 known offenders | `app/api/montree/intelligence/conference-notes/route.ts:144,277`, `app/api/montree/messages/route.ts:277` | 10 min | "No row" no longer surfaces as 500 |
| 0.10 | Verify SchoolsTab `backdrop-filter` won't break with future virtualization | inspect `components/montree/super-admin/SchoolsTab.tsx` glass card stacking before Tier 5.3 | 5 min | Pre-emptive — Session 96 had a `backdrop-filter` stacking-context bug. |
| 0.11 | **Railway region: pin to Singapore or HK** | Railway dashboard config (no code change) | 5 min | **Halves TTFB for Asian users.** Largest TTFB win in entire plan. Was Tier 4.6 in v1 — promoted. |
| 0.12 | **Web Vitals telemetry** | `npm i web-vitals` + small client hook + extend existing `/api/montree/client-error` POST endpoint OR create one | 30 min | Without this, ALL OTHER TIER WORK SHIPS BLIND. Records LCP, INP, CLS, TTFB per-user-per-route. |
| 0.13 | **Postgres EXPLAIN ANALYZE pass on top 8 dashboard queries** | Run via Supabase SQL Editor on: child page `/api/montree/progress`, `/api/montree/admin/today`, `/api/montree/works/guide`, dashboard `/api/montree/children`, photo-audit list, principal_memory load, message threads list, messaging recipients | 1 hr | Validates Audit 2's "indexes look good" claim. Adds 1-3 missing indexes if seq scans found. **🚨 BLOCKING for Tier 3** — wall-clock wins compound on top of correct indexes. |
| 0.14 | Railway post-deploy pre-warm ping loop | Add after `git push` hook OR cron: ping `/api/health`, `/api/montree/admin/today`, `/api/montree/works`, `/api/montree/curriculum` | 30 min | Every deploy = empty cache today. With 15+ commits/day, real felt cost. |

**Total Tier 0 effort: ~3 hours. Ship one or two commits.**

**Explicit dependencies introduced by Tier 0:**
- `0.1 maxDuration` is BLOCKING for `1.1 SW SWR` — without it, SW would stale-cache 503 timeout responses.
- `0.13 EXPLAIN audit` is BLOCKING for Tier 3 wall-clock work — wins compound on top of correct indexes.
- `0.12 Web Vitals telemetry` is BLOCKING for all post-Tier-0 validation — without it, no measurement.

---

## Tier 1 — Perceived-instant foundation

### 1.1 🥇 Service worker stale-while-revalidate API GET cache (REWRITTEN — auth-leak fix mandatory)

**🚨 CRITICAL CHANGES from v1:** v1 handwaved cross-user safety. v1 also said "add runtimeCaching" but `next.config.ts:169-194` already has 3 runtimeCaching rules — this **EXTENDS** the existing array, doesn't add. Effort revised 6h → **12-16h** once auth-keyed cache + broadcastUpdate consumers are required.

**Problem:** Returning to the dashboard 10 minutes later on flaky VPN = blank skeleton + spinner waiting on a 1-2s API roundtrip. Today every nav is a cold network call.

**Fix:** Extend existing `next-pwa` `runtimeCaching` array with a stale-while-revalidate rule for safe-to-cache API GETs. **MANDATORY:** include a `cacheKeyWillBeUsed` plugin that appends the authenticated userId to the cache key, so two users on a shared device cannot cross-leak.

```js
// next.config.ts — extend existing withPWA runtimeCaching array (do NOT replace)
{
  urlPattern: /\/api\/montree\/(children|today|works|progress|me|admin\/today|curriculum)/,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'montree-api-read',
    expiration: { maxAgeSeconds: 600, maxEntries: 50 },
    cacheableResponse: { statuses: [0, 200] },
    plugins: [
      {
        // 🚨 CVE FIX: append userId from auth cookie to cache key
        cacheKeyWillBeUsed: async ({ request }) => {
          const authToken = (await caches.match('auth-cookie')) || '';
          // OR parse `request.headers` cookie + hash userId
          const userId = await deriveUserIdFromCookie(request);
          const url = new URL(request.url);
          url.searchParams.set('__u', userId || 'anon');
          return new Request(url.toString(), request);
        },
      },
    ],
    broadcastUpdate: { channelName: 'api-updates' },
  },
}
```

**Plus mandatory client-side consumer:** components must subscribe to `BroadcastChannel('api-updates')` and trigger SWR revalidation. Without this, "stale-while-revalidate" is just stale.

**Critical guardrails (PATCH from v1):**
- ONLY GETs. Never cache mutation routes.
- Auth-keyed cache plugin is non-negotiable. Do NOT ship without it.
- Audit each whitelisted URL pattern: does it return data scoped to anything OTHER than the authenticated user? If yes, exclude.
- broadcastUpdate channel needs at least 8-10 component subscribers — list them.

**Effort:** 12-16h (4h core SW config, 4h auth-keyed cache plugin + Tier 0.12 telemetry to confirm no leaks, 4-6h broadcastUpdate consumer integration in 8-10 components, 2-4h flaky-VPN testing).

**Win:** ~80% of returning-visit perceived latency, gone. The single biggest win in this entire doc.

### 1.2 🥈 Add `loading.tsx` files for cockpit + child + parent routes

(Unchanged from v1 — verified zero `loading.tsx` files exist via `Glob app/**/loading.tsx`.)

**Routes:** `/montree/admin`, `/montree/admin/communication`, `/montree/admin/classrooms`, `/montree/admin/people`, `/montree/admin/pulse`, `/montree/dashboard`, `/montree/dashboard/[childId]`, `/montree/dashboard/photo-audit`, `/montree/parent/dashboard`, `/montree/parent/messages`.

Each renders shape-matched skeleton (zero CLS). Verify with web-vitals telemetry from Tier 0.12.

**Effort:** 6h.

### 1.3 🥉 Lora → `next/font/google`

(Unchanged from v1 — verified 6 `@import url('fonts.googleapis.com')` instances via grep.)

🚨 **Risk added:** `next/font/google` downloads from `fonts.googleapis.com` at build time. If Railway's build region has unstable access to Google Fonts CDN, builds fail intermittently. **Verify before sweep:** kick a deploy, watch for `next/font` errors. If problems, pre-download fonts and self-host as a backup.

🚨 **Sub-issue:** Sessions 97/100 added Lora via inline `<style jsx global>` in super-admin and admin/layout because there's no super-admin layout file. Verify routes inherit root layout's Lora variable — if super-admin is in a `(group)` segment with separate layout, won't inherit.

**Effort:** 2h + 30 min sweep verification.

### 1.4 Cookie-based locale dispatch (REWRITTEN — simpler than v1's async provider)

**🚨 PATCH from v1:** v1 proposed an async-aware i18n provider with synchronous-to-async refactor across 173 importers. v2 takes the simpler path:

**Fix:**
1. On first visit, write `localStorage.locale` AND `document.cookie = 'mt_locale=<lang>'`.
2. In `app/layout.tsx`, read the `mt_locale` cookie server-side.
3. Statically import only `en.ts` + dynamically import the user's actual locale BEFORE hydration via inline server-rendered script tag.
4. Provider stays synchronous; importers are unchanged.

```ts
// app/layout.tsx (server component)
import { cookies } from 'next/headers';
const locale = cookies().get('mt_locale')?.value || 'en';
const messages = locale === 'en' ? enMessages : await import(`@/lib/montree/i18n/${locale}`).then(m => m.default);
// pass messages to client provider as initial value
```

**Win:** ~700KB gzip saved on every initial page load (only the user's locale is in their bundle, not all 12). No async hydration risk.

**Effort:** 1-2h (server-side cookie read + initial-message-passing wire) — half the v1 estimate.

---

## Tier 2 — Astra: principal's daily entrypoint (REORDERED)

🚨 **REORDERED from v1.** Old order: 2.1 → 2.2 → 2.3 → 2.4. New order: **2.1 (rAF throttle) → 2.2 (AbortController + retry) → 2.4 (skip Sonnet greeting) → 2.3 (lazy panel mount).**

**Why:** if you lazy-mount the panel (2.3) but Sonnet greeting still fires on expand, the user clicks the avatar → stares at thinking dots for 2-5s → worse UX than today's auto-greeting because they actively triggered it. Static greeting MUST be in place before mount becomes lazy.

### 2.1 SSE token throttle via `requestAnimationFrame`

**Problem:** Both `app/montree/admin/page.tsx:615-624` and `components/montree/admin/TracyFloat.tsx:464` do `setTurns(prev => [...prev.slice(0,-1), updated])` per token. CPU spikes during streaming.

**Fix:** Buffer text into `useRef<string>('')` and flush via `requestAnimationFrame`. **Alternative noted by audit:** React 19's `useTransition` around buffer flush eliminates jank without rAF plumbing — explore as Plan B.

**Effort:** 1.5h.

**Win:** ~80% CPU reduction during streaming.

### 2.2 SSE AbortController + retry-with-resume

**Problem:** Astra SSE has no `AbortController` (memory leak on navigation). On VPN drop, generic error swallows question + partial answer.

**Fix:** Three-part:
1. Wrap the `fetch()` with `new AbortController()`. Return `controller.abort()` from `useEffect` cleanup.
2. Track `isCancelled` ref; check before each setState.
3. On network error mid-stream, retry 3x with exponential backoff (500/1500/3500ms). For non-resumable, surface "Tap to retry" preserving state.

**Effort:** 4-6h.

**Win:** Astra survives VPN drops invisibly.

### 2.3 Skip Sonnet greeting on first paint (PROMOTED — was 2.4)

**Problem:** `[GREETING_FIRST]` fires Sonnet/Opus call on every cold session — user sees thinking dots for 2-5s before greeting streams in. On flaky VPN, worst first impression.

**Fix:** Render static greeting from system prompt template (`Hi, ${firstName}.` + situational from last login) on first paint. Only fire AI when user types their first message.

**Effort:** 2h.

**Win:** Astra's first frame goes from 2-5s to instant. No Sonnet cost wasted on no-question sessions. **MUST land before 2.4 lazy-mount or UX regresses.**

### 2.4 Astra float: instant paint, lazy-mount panel content (REORDERED — was 2.3)

**Problem:** TracyFloat (1,074 lines) mounts on every `/montree/admin/*` page. All sub-components load eagerly.

**Fix:**
1. Render only avatar button + collapsed pulse on initial mount.
2. `dynamic()`-import the panel content; only load on first click.
3. Confirm static greeting from 2.3 renders instantly when panel expands.

**Effort:** 1.5-2h.

**Win:** ~30-50 KB JS off every admin route's initial bundle. Avatar paints in <50ms.

---

## Tier 3 — Backend wall-clock wins

🚨 **DEPENDENCY:** Tier 0.13 EXPLAIN audit MUST land first — wins compound on correct indexes.

### 3.1 Weekly Wrap: parallelize teacher + parent reports per child

(Unchanged from v1.) Per-child `Promise.all` over Sonnet calls. ~3-5 minutes off 20-child wrap.

**Effort:** 1h.

### 3.2 Photo identification pre-Pass-1 parallelize

(Unchanged.) `Promise.all` over child read + attempted_at write + custom-works fetch.

**Effort:** 30 min. Saves 200-450ms per photo.

### 3.3 `select('*')` → explicit columns on 4 hot routes

(Unchanged.) `messages`, `progress`, `photo-bank`, `analysis`.

**Effort:** 1-2h.

### 3.4 Validation chain parallelization

(Unchanged.) 5-6 sequential awaits in `conference-notes`, `messages/[id]/...`, `photo-audit/resolve`.

**Effort:** 2h.

### 3.5 Billing webhook fire-and-forget

(Unchanged.) Verify signature → respond 200 → handler in `void (async () => {})()` IIFE.

**Effort:** 30 min.

### 3.6 Photo bank GET parallelize

(Unchanged.) `Promise.all` over photos + categories.

**Effort:** 5 min.

---

## Tier 4 — China + flaky VPN resilience

### 4.1 `montreeApi()` auto-retry on network errors

(Unchanged.) Idempotent methods only (GET, HEAD): 1 retry @ 1s, 1 retry @ 3s. POST/PATCH/DELETE never auto-retry.

**Effort:** 2h.

### 4.2 Direct `fetch()` audit — top 5 endpoints only (DOWNSCOPED from v1)

🚨 **PATCH from v1:** v1 proposed a 1-day audit of all ~80 direct `fetch()` call sites. Audit caught this as too-large-for-the-win. v2 phases:
- Phase A (this plan): TracyFloat SSE, Whisper transcription, photo upload, Weekly Wrap stream, child onboard. ~4h.
- Phase B (organic refactor): rest as files are touched.

### 4.3 Optimistic message-state in messaging UIs

(Unchanged.) iMessage-style sending → checkmark → tap-to-retry pattern.

**Effort:** 4h.

### 4.4 `prefetchUrl` wiring on dashboard child grid

(Unchanged.) Verified `lib/montree/cache.ts:260` exports it; never used. Wire on hover/focus in dashboard.

**Effort:** 4h.

### 4.5 Client-error telemetry

(Already merged into Tier 0.12 — Web Vitals + client-error endpoint share the same surface.)

---

## Tier 5 — Layout + interaction polish (TRIMMED)

🚨 **PATCH from v1:** dropped 5.2 (next/image migration), 5.5 (LQIP/blur-up). Audit caught both as gold-plating.

### 5.1 Image dimensions sweep — CLS to 0

**Verified:** 93 raw `<img>` tags across 51 files (v1 said 92 — close enough). Zero with `width`/`height`.

**Fix:** Sweep all 93. Where Cloudflare-proxied dimensions known, set explicit attrs. Where not known, use CSS `aspect-ratio: 4/3`.

**Effort:** 2-3h.

**Win:** CLS → 0. **This alone covers 80% of what v1's Tier 5.2 next/image migration would have delivered. Don't over-build.**

### 5.2 SchoolsTab virtualization — DEFER

🚨 **DEFERRED from v1 Tier 5.3.** Risk per audit R4: SchoolsTab uses `backdrop-filter` glass cards. `react-window` absolutely positions rows; per-row `backdrop-filter` creates own stacking context — would break the kebab dropdowns from Session 96 lessons.

**If still needed after Tier 1 wins:** test `IntersectionObserver`-based windowing instead. Defer until super-admin actually slows down at 200+ schools (currently 7).

### 5.3 Child page: extract NoteField (with React 19 alternative)

**Problem:** `app/montree/dashboard/[childId]/page.tsx` 1,040-line monolith re-renders on every keystroke.

**Fix Option A (v1):** Extract `<NoteField />` with local state, commit on blur.
**Fix Option B (audit suggestion):** Use React 19's `useDeferredValue` to defer the parent's read of the value while keeping input synchronous. No component extraction needed.

Pick whichever is faster after a 30-min spike.

**Effort:** 1-2h.

### 5.4 Dynamic-import heavy libs

(Unchanged.) `jspdf` (29MB), `JSZip` (1.7MB), verify `framer-motion` not pulled into dashboard chunk.

**Effort:** 30 min each.

---

## Tier 6 — Mobile / PWA polish (TRIMMED)

🚨 **PATCH from v1:** dropped 6.3 (PWA install prompt) — audit flagged as cargo-cult.

### 6.1 Pull-to-refresh on principal portal

(Unchanged.) Reuse Session 95's `lib/story/use-pull-to-refresh.ts` on cockpit + child pages.

**Effort:** 2-3h.

### 6.2 iOS keyboard handling in Astra chat

(Unchanged.) `scrollIntoView({block: 'end'})` on focus + `visualViewport` listener.

**Effort:** 2h.

### 6.3 Tap target audit (REORDERED — was 6.4)

(Unchanged.) Visual audit on real iPhone.

**Effort:** 30 min audit + 1h fixes.

### 6.4 Two-manifest disambiguation (REORDERED — was 6.5)

(Unchanged.) Confirm which manifest is referenced from `<link rel="manifest">`. Delete unused.

**Effort:** 5 min.

---

## Tier 7 — Things to leave alone

(Unchanged from v1.) Visual memory context loader, correction enrichment, replan as Stage 0, Astra on Opus, SW narrow-intercept on documents (Tier 1.1 ADDS API caching as separate runtime rule, doesn't modify document handling).

---

## Things explicitly DROPPED from v1 (with reasoning)

- **next/image migration to gallery + child page (was 5.2, 4-6h)** — CSS `aspect-ratio` covers 80% of the win at 30 min effort. Blur placeholders are polish on a non-problem (Cloudflare CDN already serves photos fast).
- **LQIP / blur-up via proxy (was 5.5, 4h)** — premature; photos already cache via Cloudflare. Polish on a non-problem.
- **PWA install prompt (was 6.3, 4-6h)** — cargo-cult. iOS users who want PWA install already use Share button. Probably nets <50 installs/quarter.
- **Removing `[req]` console.log (was 0.9 in v1)** — Session 84 architectural rule for diagnosing edge vs app 503s. Keep.
- **Wholesale `montreeApi()` migration (was 4.2, 1 day)** — too large for the win. Phase A only (5 hot endpoints) in this plan; rest is organic refactor.

---

## Sequencing recommendation (REVISED)

🚨 **Hard dependency block:** Tier 0 first. Period. Some Tier 0 items BLOCK Tier 1 and Tier 3.

**Week 1 (Tier 0 + measurement, ~5h):**
- Day 1 morning: Tier 0.1-0.10 batch (~1h) — ship one commit
- Day 1 afternoon: Tier 0.11 Railway region + 0.12 Web Vitals telemetry (~45 min)
- Day 2 morning: Tier 0.13 EXPLAIN audit (~1h)
- Day 2 afternoon: Tier 0.14 post-deploy pre-warm (~30 min) + soak with web-vitals telemetry to set BASELINE (~2h)

**Week 1 continued (Tier 1 foundation, ~25-30h):**
- Day 3-4: Tier 1.3 Lora migration (2h) + Tier 1.4 cookie locale dispatch (2h)
- Day 5-7: Tier 1.1 SW SWR with auth-keyed cache + broadcastUpdate (12-16h, careful)
- Day 8: Tier 1.2 loading.tsx files (6h)

**Week 2 (Tier 2 Astra, ~10h):**
- 2.1 rAF throttle (1.5h)
- 2.2 AbortController + retry-with-resume (4-6h)
- 2.3 skip Sonnet greeting (2h) — must precede 2.4
- 2.4 lazy-mount panel content (1.5-2h)
- Re-validate via web-vitals: Astra first-token, INP during typing

**Week 3 (Tier 3 backend wins + Tier 4 resilience, ~12h):**
- Tier 3.1 Weekly Wrap parallelize (dedicated session, 1h)
- Tier 3.2-3.6 backend sweep (~5h)
- Tier 4.1 montreeApi auto-retry (2h)
- Tier 4.4 prefetchUrl wiring (4h)

**Week 4 (Tier 5-6 polish, ~8h):**
- Tier 5.1 image dims sweep (3h)
- Tier 5.3 NoteField/useDeferredValue (1-2h)
- Tier 5.4 dynamic imports (~1h)
- Tier 6.1 pull-to-refresh (2-3h)
- Tier 6.2 iOS keyboard (2h)
- Tier 6.3 tap targets (1.5h)
- Tier 6.4 manifest cleanup (5 min)

**Total estimated effort: 55-65 hours of focused work.** v1 estimated 40-50h; audit caught the 10-15h underestimate (mostly in Tier 1.1 SW SWR with auth-keyed cache).

**Tiers 0-2 alone (~25h) deliver the bulk of the perceived "instant like native" feel.**

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| **SW cache leaks user data across users on shared device** | CRITICAL | `cacheKeyWillBeUsed` plugin appending userId is mandatory in 1.1. Block ship without it. |
| `next/font/google` build-time fetch fails from Railway region | HIGH | Verify build before ship. Fallback: pre-download fonts + self-host. |
| `react-window` virtualization breaks `backdrop-filter` glass cards | MED | Tier 5.2 deferred; if revisited, test with IntersectionObserver-based pattern instead. |
| broadcastUpdate channel without consumers = stale-while-stale | MED | Tier 1.1 must include component-side subscribers in the same commit. List 8-10 consumers in the PR. |
| Lora super-admin inheritance issue | MED | Verify root layout's Lora CSS variable propagates to super-admin pages. |
| Auth-keyed cache plugin breaks Astrill cold-start | LOW | Test on real flaky-VPN setup before merge. |

---

## What this plan deliberately doesn't include

- Server-side rendering optimization for `/montree/admin` (cockpit fundamentally interactive)
- Edge runtime migration (most routes use Supabase service-role, not all edge-compatible)
- Database read replica (Supabase pooler isn't the bottleneck per Audit 2)
- Image CDN rewrite (Cloudflare proxy is well-engineered)
- React Server Components migration for client-heavy pages (architectural; would invalidate optimistic UI)

---

## Validation plan

After each Tier ships:

1. **Web vitals telemetry** (Tier 0.12) shows the deltas per route per percentile.
2. **Manual flaky-VPN test** on Astrill Frankfurt: Beijing → cockpit nav → child page → photo audit → Astra → toggle VPN off → Astra retries → toggle back on → conversation continues.
3. **Real-device tap test** on iPhone PWA install: home-screen tap → cockpit shell renders < 1.5s warm.
4. **Lighthouse CI** on landing page: target FCP < 800ms, LCP < 2.5s, CLS < 0.1, TBT < 200ms.

If any target misses by >20%, the responsible Tier ships incomplete and gets a fix-up commit.

---

**End of v2 plan. Next: re-audit confirms patches address all v1 audit findings.**
