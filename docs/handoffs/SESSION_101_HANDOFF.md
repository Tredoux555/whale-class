# Session 101 Handoff — May 10–11, 2026

**Tagline:** Cleanup session + comprehensive perf health check (planned, not built).

---

## What shipped this session

**3 commits on origin/main:**
1. `b0361112` — Billing history dedupe fix. The "Payment failed" duplicate row on `/montree/admin/billing` after retried-card-success is gone. Webhook still writes both rows to the DB (audit trail preserved); read-side dedup in `/api/montree/billing/status` returns only the most recent status per `stripe_invoice_id`.
2. `59e488f7` — Super-admin top page cleanup. Removed: the "Onboarding System" 4-toggle block (vestigial since Migration 175 flipped voice-onboarding default to true at school feature flag level) + the Guru tab (Astra on principal portal does the equivalent, school-scoped). Renamed: Referrals tab → Agents. Final 5-tab structure: Schools / Leads / Feedback / Visitors / Agents. Hide-don't-delete on all routes; `ReferralsTab.tsx` component file unchanged.
3. `7beb48e0` — Performance health check v2 plan doc. **Plan only. Zero code changes.** Lives at `docs/PERF_HEALTH_CHECK.md`.

**SQL run in Supabase (you ran):**
- ✅ Migration 184 — `montree_principal_agent_log` table created. Astra interactions now log to it (no more silent failure).
- ✅ Test School 2 cleanup — finance_transactions + billing_history + school row deleted.
- ✅ Gloria's dashboard cleanup — Test School 1 deleted, all 3 referral codes (GLORIA-UD2Z redeemed, GLORIA-WK9A pending, GLORIA-3KD5 revoked) deleted. Gloria's agent record intact (id `77abc850-e62c-421a-8061-6fa6b69055d9`, ready for fresh code when real Gloria onboards).

**Stripe-side (you did):**
- ✅ Test School 2 subscription `sub_1TVVetRngZj3YCjeA1Y68JJ4` canceled immediately.
- ✅ $21 paid invoice `in_1TVPGc...` fully refunded to the Visa ending 2014.

**Net state:** Stripe live mode proven + fully reset. Migration 184 live. Gloria's dashboard slate-clean. Super-admin top page decluttered. Performance plan documented but not implemented.

---

## Are we over-complicating the perf work?

**Yes, partly.** Honest reflection:

The full `docs/PERF_HEALTH_CHECK.md` is 55-65 hours across 7 tiers. That estimate is realistic if every tier ships. But:
- The app has ~7 active schools today
- You're the daily user
- Your actual pain points are Astra stutter on long answers, VPN drops losing conversation state, and returning to a cached page that shows a spinner
- Tiers 5-6 (polish) + the heavier parts of Tier 1 (SW SWR with auth-keyed cache, loading.tsx files) are correctly engineered but compound the most at 100+ schools, not 7

**A trimmed "comfortable rollout" addresses ~80% of the felt perceived-perf gap in ~15-18 hours over 3 days.** Below is that path.

The full plan stays in `docs/PERF_HEALTH_CHECK.md` for reference. When you cross 50 schools or when a real user complains about a specific bottleneck, the corresponding Tier item is ready to ship.

---

## Trimmed rollout — 3 comfortable days

### Day 1 — Quick wins + measurement (~3 hours)

**Goal:** Ship a batch of small fixes that remove daily annoyances + add the telemetry that lets us measure everything after this.

1. **`maxDuration = 120` on 4 missing AI routes** (5 min total)
   - `app/api/montree/guru/stream/route.ts`
   - `app/api/montree/admin/guru/chat/route.ts`
   - `app/api/montree/super-admin/guru/route.ts`
   - `app/api/montree/guru/photo-insight/add-custom-work/route.ts`
   - Eliminates a class of "feels broken" 503s during long Sonnet/Opus turns.

2. **`maxDuration = 30` on billing webhook** (2 min)
   - `app/api/montree/billing/webhook/route.ts`

3. **Sonnet → Haiku for `works/guide` translator** (5 min + spot-check)
   - `app/api/montree/works/guide/route.ts:275`
   - Saves $30-80/mo + 1-2s on first-view in any non-English locale.

4. **`useMemo` on `getStatusConfig(t)`** (3 min)
   - `components/montree/child/FocusWorksSection.tsx:200`
   - Stops re-creating 5 nested style objects every render.

5. **Pin stale Sonnet model id** (2 min)
   - `app/api/montree/social-guru/route.ts:46` + `app/api/montree/admin/import/route.ts:201`
   - `'claude-sonnet-4-20250514'` → `AI_MODEL` constant.

6. **`optimizePackageImports: ['lucide-react']`** (2 min)
   - `next.config.ts` `experimental`
   - 75 files import lucide; 50-150 KB potential savings.

7. **Drop `recharts` dep** (5 min)
   - Verified zero imports across `app/`, `components/`, `lib/`. ~150 KB shipped saved.
   - `npm uninstall recharts`

8. **Manifest `start_url` fix** (2 min)
   - Change `/montree/parent/login` → `/montree` in the manifest.
   - PWA install from cockpit no longer dumps user on parent login.

9. **`.single()` → `.maybeSingle()` on the 3 known offenders** (10 min)
   - `app/api/montree/intelligence/conference-notes/route.ts:144,277`
   - `app/api/montree/messages/route.ts:277`
   - "No row" no longer surfaces as 500.

10. **Pin Railway region to Singapore or HK** (5 min — config in Railway dashboard, no code)
    - Halves TTFB for you on Astrill Frankfurt. Largest single TTFB win, free.
    - Verify in Railway dashboard whether project has region pinned and whether HK/Singapore is available on the current plan.

11. **Web Vitals telemetry** (30 min — without this, everything after is vibes)
    - `npm i web-vitals`
    - Tiny client hook in `app/layout.tsx` reporting LCP, INP, CLS, TTFB
    - Create `/api/montree/client-vitals` endpoint that writes to a new `montree_web_vitals` table (or appends to existing api_usage log)
    - Without baselines, you can't tell if Day 2/3 work actually helped.

**One commit at end of Day 1.** Title: "Tier 0 perf quick wins + Web Vitals telemetry"

---

### Day 2 — Bundle + Astra smoothness (~5-6 hours)

**Goal:** Cut bundle size for everyone + make Astra feel native during streaming.

1. **Lora → `next/font/google`** (~2 hours)
   - Move Lora to `next/font/google` in `app/layout.tsx`
   - Delete the 6 `@import url('fonts.googleapis.com')` blocks: `app/montree/admin/layout.tsx:421`, `app/montree/super-admin/page.tsx:587`, `app/montree/page.tsx:43`, `app/montree/for-teachers/page.tsx:45`, plus Playfair in `app/pricing/page.tsx`, plus per-tool fonts in `phonics-fast/sentence-cards/page.tsx`
   - Self-hosted, preloaded, swappable
   - Verify Lora still renders correctly on `/montree/admin`, `/montree/super-admin`, landing, pricing
   - **🚨 Risk:** `next/font/google` fetches from `fonts.googleapis.com` at build time. If Railway build region has unstable access, deploys can fail. Kick a deploy after the change and watch logs.

2. **Cookie-based locale dispatch** (~1-2 hours)
   - Currently `lib/montree/i18n/context.tsx:11-23` static-imports all 12 locale files (~700KB gzip shipped to every user, every page).
   - Read `mt_locale` cookie server-side in `app/layout.tsx`. Statically import `en.ts`. Dynamically import user's actual locale before hydration. Pass to provider as initial value.
   - Provider stays synchronous; 173 importers unchanged.
   - Win: ~700KB gzip saved per user on every initial page load.

3. **Astra SSE token throttle via `requestAnimationFrame`** (~1.5 hours)
   - `app/montree/admin/page.tsx:615-624` AND `components/montree/admin/TracyFloat.tsx:464`
   - Buffer text into `useRef<string>('')`. Flush via `requestAnimationFrame`. Don't `setTurns` per token.
   - Win: ~80% CPU reduction during streaming. Smooth scroll while Astra types long answers.
   - **Alternative noted:** React 19's `useTransition` around buffer flush — explore as 30-min spike before committing to rAF plumbing.

**One commit at end of Day 2.** Title: "Lora next/font + cookie locale dispatch + Astra rAF throttle"

**At end of Day 2, check web-vitals dashboard.** If FCP didn't drop ≥200ms or INP during Astra streaming didn't drop ≥50%, something's wrong and worth investigating before Day 3.

---

### Day 3 — Resilience for flaky VPN (~7-9 hours)

**Goal:** Make the app survive your daily VPN flake invisibly.

1. **Astra SSE AbortController + retry-with-resume** (~4-6 hours)
   - `app/montree/admin/page.tsx` AND `TracyFloat.tsx`
   - Wrap fetch in `AbortController`. Abort on `useEffect` cleanup. Check `isCancelled` ref before each setState.
   - On network error mid-stream: 3 retries with exponential backoff (500/1500/3500ms). For non-resumable, surface "Tap to retry" affordance preserving the user's question + partial response.
   - Test by toggling Astrill mid-Astra-response: conversation should auto-recover, not error out.

2. **`montreeApi()` auto-retry on network errors** (~2 hours)
   - `lib/montree/api.ts:91-117`
   - For idempotent methods (GET, HEAD) only: 1 retry @ 1s, 1 retry @ 3s on `TypeError`/timeout.
   - **NEVER** auto-retry POST/PATCH/DELETE (data-corruption risk).
   - Win: most transient VPN flakes become invisible.

3. **Weekly Wrap teacher + parent parallelize** (~1 hour)
   - `app/api/montree/reports/weekly-wrap/route.ts`
   - Per-child block currently runs `generateTeacherReport()` then `generateWeeklyNarrative()` sequentially. They write to different `report_type` rows; safe to `Promise.all`.
   - Win: ~3-5 minutes off a 20-child Weekly Wrap. You run this weekly so the cumulative win is real.
   - **🚨 Architectural rule:** replan MUST stay Stage 0. Teacher + parent parallelize INSIDE the per-child block only.

**One commit at end of Day 3.** Title: "Astra SSE resilience + montreeApi auto-retry + Weekly Wrap parallel teacher/parent reports"

---

## Stopping point — re-evaluate after Day 3

After Day 3, the Web Vitals dashboard should show meaningful deltas on:
- FCP (Lora migration)
- Bundle size / TTI (locale dispatch)
- INP during Astra streaming (rAF throttle)
- Stream resilience (Astra survives VPN drops in manual testing)
- Weekly Wrap wall-clock (parallel reports)

**If the felt experience is now good enough, STOP HERE.** The other ~40 hours of perf plan stay in `docs/PERF_HEALTH_CHECK.md` for when scale or real user feedback demands them.

**If there are still pain points,** the next likely-worthwhile items are:
- Astra 2.3 (skip Sonnet greeting on first paint) — 2h, removes the "thinking dots on Astra expand" lag
- Tier 0.13 (Postgres EXPLAIN audit) — 1h, validates DB index claims
- Tier 4.4 (prefetchUrl wiring on dashboard child grid) — 4h, makes child-tap feel instant
- Tier 5.1 (image dimension sweep) — 2-3h, takes CLS to 0

---

## What to deliberately DEFER (until 50+ schools or specific user complaint)

| Item | Why defer |
|---|---|
| **Service worker stale-while-revalidate (Tier 1.1)** | 12-16h. CVE-class auth-leak risk requires careful `cacheKeyWillBeUsed` plugin. Real win compounds at scale; for 7 schools the felt difference is marginal. |
| **`loading.tsx` files (Tier 1.2)** | 6h. Web Vitals telemetry will tell us if blank-screen-during-chunk-download is actually felt. Probably yes for cockpit specifically; defer until measurement confirms. |
| **`next/image` migration for gallery (was Tier 5.2)** | Dropped from plan. CSS `aspect-ratio` (in Day 4-X if needed) covers 80% of the win at 5% of the effort. |
| **LQIP / blur-up** | Dropped. Cloudflare proxy handles photos fine. Polish on a non-problem. |
| **PWA install prompt** | Dropped. Cargo-cult. iOS users who want PWA install already use Share button. |
| **SchoolsTab virtualization** | Defer. Currently 7 schools. Revisit at 100+. |
| **Wholesale `fetch()` audit (~80 sites)** | Defer. Phase A (top 5 endpoints) covered in Day 3 via Astra + `montreeApi`. Rest is organic refactor as files are touched. |

---

## Carry-overs from prior sessions (not perf-related, still pending)

These were in the Session 100 handoff and are unaffected by this session:

1. **🚨 Onboard real Gloria as first agent** — super-admin Referrals (now "Agents") → 🔑 Issue agent login → reveal-once code → send to her. Then 💳 Stripe Connect onboarding link. (Note: she'll get a fresh code now; the old GLORIA-* codes were all cleaned up this session.)
2. **🚨 Fix admin.* i18n keys** — Settings page reveals raw `admin.actions.saveChanges` keys to non-English locale users. Add to `lib/montree/i18n/en.ts`, then `npm run i18n:fill-ui`. ~31 missing keys.
3. **Astra production testing** — verify memory works end-to-end, thinking indicator pulses, copy cards render. Test plan in Session 100 handoff Section "Test plan for the next session".
4. **Stripe cancel direction test** — without waiting for Jun 10, test from `/montree/admin/billing` → Manage in Stripe → Customer Portal → Cancel. Should auto-flip tier to Free within seconds.
5. **Outreach follow-ups** — FAMM Argentina (#1 multiplier lead, last nudge May 5), Cambridge Montessori Global, Otari NZ Susan West, Lions Gate, Montessori Norge.
6. **Phase 5 Payout calculator + Phase 6 super-admin Money tab** — now actually unblocked since Stripe is live + cleaned up.

---

## TL;DR for the next session

The performance plan is documented in `docs/PERF_HEALTH_CHECK.md`. It's comprehensive (55-65h, audited twice) but more than current scale needs. Trimmed rollout is **~15-18 hours across 3 comfortable days**, targeting the actual felt pain points (Astra stutter, VPN resilience, bundle size, Lora paint waterfall). After Day 3, measure with Web Vitals and decide whether to continue. The other ~40 hours of plan is ready to ship when scale or real complaints justify it.

Tier 0 quick wins is the right place to start tomorrow. ~3 hours, ships in one commit, gives you measurement infrastructure for everything that follows.

---

**End of Session 101 handoff.**
