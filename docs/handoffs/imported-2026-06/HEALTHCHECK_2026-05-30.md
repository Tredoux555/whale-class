# Montree System Audit & Healthcheck — 2026-05-30 (overnight session)

**Deployed:** two waves — `cd55e448` (login/UI bugs) and `111f65ee` (service worker / data / mobile), both live in production.

> ⚠️ **READ THIS FIRST — the single most important finding:** the live origin is dropping **~20% of all requests** with connection failures (`000`), *consistently*, even on the trivial `/api/health` endpoint (measured repeatedly: 5/24, 3/12, 4/20 failures across bursts ~25 min after deploy). This is **infrastructure-level** (Cloudflare ↔ Railway origin), not application code, and it is almost certainly what makes the product "look down" and what produced the intermittent RSC `503`s the Claude-web audit saw. My code fixes reduce how badly a dropped request *freezes the UI*, but they cannot fix the drop rate itself. **This needs Railway/Cloudflare ops attention — see the new "Critical: origin instability" section at the bottom.** It pre-dates tonight's changes (the audit observed the same intermittency on the earlier build).

---

## TL;DR

The principal "stuck dashboard" was a **real bug**, not just the Chrome debugger artifact it looked like. Found and fixed it, plus two other latent runtime bugs and a PWA manifest issue. All four fixes are pushed and live. The live system itself is healthy. The wider codebase has cleanliness debt (lint/types) that is **not** deploy-blocking and was left for review rather than mass-edited overnight.

---

## The principal login bug (root cause)

The screenshot showed the principal logged in (header said "Principal Leu") but the body stuck on skeleton loaders, with `ERR_NETWORK_IO_SUSPENDED` errors in console.

- `ERR_NETWORK_IO_SUSPENDED` is Chrome throttling a backgrounded tab while the DevTools debugger is attached — a red herring that made it *look* transient.
- The actual defect: a **pure principal's JWT carries no `classroomId`** (a principal isn't bound to one classroom). On `/montree/dashboard` (a teacher-oriented child-picker), `childrenUrl` is therefore `null`, and the render guard `if (childrenUrl === null) return <DashboardSkeleton/>` has **no give-up path** — so any principal who lands on `/montree/dashboard` is trapped on the skeleton forever.
- Principals are *supposed* to land on `/montree/admin` (their login redirect target). They reach `/dashboard` via PWA `start_url`, a bookmark, or manual navigation.

**Fix:** a guard in the dashboard that redirects a classroom-less principal to `/montree/admin` instead of dead-ending. Founder-principals who also have a classroom are unaffected. Verified `/montree/admin` never redirects back to `/dashboard`, so no loop.

---

## All changes shipped (commit cd55e448)

| File | Problem | Fix |
|---|---|---|
| `app/montree/dashboard/page.tsx` | Principal infinite-skeleton dead-end | Redirect classroom-less principals to `/montree/admin` |
| `components/montree/WorkDetailModal.tsx` | 2 `useCallback`s after an early return — `react-hooks/rules-of-hooks` violation; could throw "rendered more hooks than previous render" when the modal toggled | Converted to plain functions (neither used in a dep array) |
| `app/montree/super-admin/marketing/content/page.tsx` | `<CopyButton>` used but never defined — `react/jsx-no-undef`, a runtime `ReferenceError` that **crashed the page on render** | Added a local `CopyButton` matching the sibling marketing pages |
| `public/montree-manifest.json` | `start_url` `/montree` was outside `scope` `/montree/`, so the browser ignored the declared scope (the console warning) | Set `start_url` to `/montree/` |

Also removed 8 junk `.fuse_hidden*` files from the working tree.

---

## Live system health — PASS

- `https://montree.xyz/montree` (landing) → 200
- `https://montree.xyz/montree/dashboard` → 200
- `https://montree.xyz/api/health` → 200 (this is the Railway healthcheck path in `railway.json`)
- `https://montree.xyz/api/montree/auth/me` (no cookie) → correctly 401 `{authenticated:false}`
- Railway deploy is current with `main` HEAD.
- **Secrets:** no real `.env` tracked (only `.env.stripe.example`); no hardcoded API keys in source (the one `sk-ant-` match is a literal `...` placeholder in instructional UI text); `.gitignore` correctly covers `node_modules`, `.next`, `.env*`.

---

## Codebase cleanliness debt (NOT deploy-blocking — left for review)

These do **not** break the build: `next.config.ts` sets `typescript.ignoreBuildErrors: true`, and Next 16 + flat ESLint config does not run lint during `next build`. The Railway Docker build (`npm install --force` + `next build`) succeeds regardless — proven by HEAD being live.

- **ESLint (`npm run lint`): 41 errors, 2102 warnings.** Most are in `scripts/`, `archive/`, generated `public/workbox-*.js`, and `lib/youtube/*`. The genuinely risky ones (rules-of-hooks, jsx-no-undef) were the ones I fixed. Remaining errors are cosmetic or intentional:
  - 27× `ban-ts-comment` (`@ts-nocheck`/`@ts-ignore`) — deliberate escape hatches.
  - 2× `set-state-in-effect` (phonics-fast, WordBuildingGame) — benign extra render.
  - `archive/marketing/montree-content-factory.jsx` — dead code in `archive/`.
- **`tsc --noEmit`:** many errors, all non-blocking (ignored by build). Clustered in `scripts/`, `lib/permissions/middleware.ts`, `lib/youtube/*`, `lib/story/push.ts` (web-push types), `lib/video-playback-utils.ts`.

### Recommended follow-ups (your call, not done overnight)
1. **Make `npm run lint` meaningful again:** add `scripts/`, `archive/`, `public/`, and generated files to the ESLint `ignores`. This drops the count from ~2143 to a small number focused on real app code, making `--max-warnings=0` achievable as a real gate.
2. Add `.fuse_hidden*` to `.gitignore` so the FUSE mount artifacts stop showing as untracked.
3. Optional hardening: broaden the dashboard guard so *any* non-parent session lacking a classroom redirects (today only `role === 'principal'` does) — defends against a teacher whose classroom was deleted.

> Note: I could not run a full local `next build` as a final gate — local `node_modules` is platform-mismatched (lightningcss `darwin-arm64` binary missing) and missing some installed packages (`agora-rtc-sdk-ng`, `web-push`). All are present in `package.json`, so Railway's fresh install builds fine. Each edited file was validated by ESLint (which parses with the TS compiler and would surface any syntax error) and the four changes are small and pattern-matched to existing code.

---

## Astra / voice arc (Session 139)
Did not exercise the live voice flow (needs a real session + Agora connect). The Claude-web verification prompt I gave you covers a hands-on pass over principal/parent/teacher login, voice/Astra connect, the Story call, and mobile/PWA — run that for the end-to-end behavioral confirmation this static audit can't provide.


---

# Wave 2 — fixes from the live Claude-in-Chrome audit (commit `111f65ee`)

The Claude-web pass found issues a static audit couldn't, and reframed the dashboard freeze. Acted on all of it:

| Area | Finding | Action |
|---|---|---|
| **Service worker** | `montree-sw.js` was edge-cached by Cloudflare (`max-age=14400`), so for up to 4h after a deploy, clients kept the OLD worker — including pre-v4 workers that fabricated synthetic `503`s on Next.js RSC prefetches. | Serve `montree-sw.js` / `story-sw.js` with `no-cache, must-revalidate`; register with `updateViaCache:'none'` + `registration.update()` on load. Verified live: SW now returns `must-revalidate` and `cf-cache-status: REVALIDATED` (Cloudflare revalidates with origin, so a new worker propagates immediately). |
| **Data bug** | Guru fetched `/api/montree/children?classroom_id=${sess.classroom?.id}` unconditionally → for a classroom-less principal it sent the literal `classroom_id=undefined` → **404** + empty Guru. | Guard the fetch on a real classroom id; otherwise set children to `[]`. |
| **Mobile header** | At ≤430px the action-icon cluster overlapped the wordmark + teacher pill (logo block is `flexShrink:0`, wordmark only capped at `min(40vw,200px)`). | Additive mobile-only media queries (≤640 / ≤380px) tighten row padding/gap, hard-cap then drop the wordmark. Desktop untouched. |
| **"Astra not reachable"** | Audit reported no Astra/Agora on the principal build; mic is just a voice-note recorder. | **Not a bug — expected.** `AstraVoiceButton` renders only on `/montree/admin` and only when the `voice_astra` feature flag is ON (off by default). The token/llm/agent routes are all flag-gated. To see Astra: be on `/montree/admin` **and** enable `voice_astra` for the school. The dashboard mic is the quick voice-note recorder by design. |

On the dashboard freeze: the route already has an `error.tsx` boundary (catches render crashes). The stuck skeleton is the route-level Suspense `loading.tsx` shown while the RSC/data request is in flight — when that request is dropped by the unstable origin (below), it can hang. The wave-1 principal redirect + wave-2 SW hardening + data guards reduce the blast radius, but the durable fix is stabilising the origin.

---

# 🔴 CRITICAL: origin instability (~20% request drop) — needs ops, not code

**Measured live, ~25 min after the final deploy (so not a rollout blip):**

- `/montree/dashboard`: 19 ok / **5 fail** / 24
- `/api/health`: 9 ok / **3 fail** / 12, then 16 ok / **4 fail** / 20
- All failures are `000` (connection reset/timeout), interleaved with `200`s seconds apart — e.g. `200 000 200 200 000 200 ...`

`/api/health` is a trivial endpoint, so ~20% failure there means the problem is the **connection to the Railway origin (through Cloudflare)**, not app logic. Cloudflare returning `000`/reset (rather than a clean 5xx) points to it being unable to reliably reach the origin. This matches the audit's intermittent RSC `503`s and is the most likely reason the app "looks down" to real users.

**What to check (in priority order):**
1. **Railway service logs + metrics for the web service.** Look for OOM kills / restarts / crash-loops, and CPU saturation. A single replica that restarts or is resource-starved drops in-flight connections exactly like this.
2. **Replica count + zero-downtime.** If it's a single instance, add a second replica so a restart/deploy doesn't drop traffic; confirm healthcheck/rollout is zero-downtime (`healthcheckPath: /api/health`, `healthcheckTimeout: 60`).
3. **Memory headroom.** This image bundles ffmpeg + yt-dlp + a big Next standalone server; if the instance tier is small it may be OOM-cycling under load.
4. **Self-fetch hairpin.** Known prior issue: server-to-self API calls must use `127.0.0.1:$PORT`, not the public origin — public hairpin breaks on Railway region moves (current edge: `europe-west4`). Any remaining public-origin self-fetch will both add origin load and fail intermittently. Worth grepping server code for fetches to `https://montree.xyz` / the public origin.
5. **Cloudflare origin settings.** Check Cloudflare's origin connection (keep-alive, timeouts) and whether a recent Railway region move left a stale origin IP.

**Belt-and-suspenders (optional) for the SW cache:** add a Cloudflare Cache Rule for `/montree-sw.js` and `/story-sw.js` → "Bypass cache" (or "Respect existing headers"). The code change already makes Cloudflare revalidate, but a bypass rule removes any doubt.

I could not fix this layer tonight — it requires the Railway dashboard / Cloudflare dashboard, which aren't reachable from here. Everything code-side that I *can* fix is fixed and deployed.


---

# Wave 4 — QA-sweep fixes (commit `04320e76`)

Acted on the live Claude-in-Chrome QA report. All were silent (no JS console errors).

**Critical / High — fixed & deployed:**
- **Teachers page "No teachers yet" (despite 4):** the page fetched teachers + classrooms in parallel and threw on `!classroomsRes.ok` before `setTeachers`. `GET /api/montree/admin/classrooms` had no handler → 405 → threw → teachers discarded. Added the missing GET (verified live: now 401 unauth, not 405) and made the page tolerate a classrooms failure without blanking. Fixes bug #1 + #3.
- **Classrooms list (1 of N) + no refresh after create:** `/admin/overview` is `Cache-Control: max-age=300`, so the post-create re-fetch got the stale list. The mutating Classrooms page now reads it with `cache:'no-store'`. Fixes #2 + #8.
- **Parent QR codes broken:** were hot-linked from `api.qrserver.com` (503 *and* not in the CSP `img-src` allowlist). Now generated locally as `data:` URLs via the bundled `qrcode` lib, in both the admin and dashboard parent-codes routes. Fixes #4.
- **Astra enable message:** corrected the dead-end "Admin → Features" pointer. See enable path below.

**Polish — fixed:** `+3 3 assistants` → `+3 assistants`; Import `← ← Back to Admin` → single arrow.

**Astra enable path (#5):** `voice_astra` is a **school-level** flag (`montree_school_features`), but the Features UI is **per-classroom**, so there's no UI path. The features **API already supports it** — a principal can enable it for their own school:
```js
// Run in the browser console while logged in as the principal on montree.xyz:
fetch('/api/montree/features', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ feature_key:'voice_astra', enabled:true, school_id:'c6280fae-…79aabc' }) })
  .then(r=>r.json()).then(console.log)
```
(Use Tredoux House's real school_id.) After enabling, clicking "Talk to Astra" should mint a token; if it then 503s "Voice is not configured", the Agora server env keys are missing on Railway.

**Deferred (documented, not done overnight — need visual testing / bigger scope):**
- #6 Astra (TracyFloat) panel overlaps main content at desktop — needs layout/state coordination; content is recoverable by collapsing the panel.
- #7 No UI to delete a classroom (API works; UI control missing).
- #9 Guru plan metadata stale (trial "expired" May 16, "max 10" vs 22 students).
- #11 remainder: raw `pending-…` IDs shown as parent row subtitle; sidebar active-nav state on non-nav routes; `/admin/messages` 404 if linked.
- **Proper Astra fix:** surface school-level flags (incl. `voice_astra`) in a principal-facing toggle UI.
- **SW cache:** Cloudflare still serves `montree-sw.js` as `max-age=14400` (it overrides the origin `no-cache`); `must-revalidate` + `updateViaCache:'none'` mitigate it, but a Cloudflare cache-bypass rule for the SW files is the clean fix (ops).
