# Session Handoff — Montree Home System (Ivy) + Shelf instructions + Sanctuary nav trim

**Date:** Jun 16, 2026 (Cowork)
**State:** All commits on `main`, Railway auto-deployed. Migration 264 RUN. Step-card route verified live (401 auth gate, not 404).

---

## 🎨 FIRST CALL TO ACTION ON RETURN — REDESIGN THE SHELF (make it WOW)

Tredoux's verdict: the **Shelf** tab (`components/montree/home/ShelfView.tsx`) "looks
quite poor — it's what you designed three generations back. It feels very rough, like a
draft, not a finished product. It doesn't feel good." It is the weakest surface in the
Home product and the redesign is the top priority next session.

**Do this, in order:**
1. **RESEARCH FIRST (don't just restyle).** What does a genuinely great "child's progress
   / works at a glance" surface look like for a PARENT (not a teacher)? Look at what
   actually wows in this class of dashboard: calm progress dashboards, learning-app home
   screens (Duolingo path, Khan kid), Montessori-album aesthetics, "today / this week"
   focus cards, gentle progress rings, warm editorial layouts. The parent should open the
   Shelf and instantly feel *"I see where my child is and what's next, and it's beautiful."*
2. **Use the new design capability** (Claude design / stunning HTML) — this is a finished
   consumer product at $8/mo, hold it to that bar. BIO bioluminescent theme
   (`lib/montree/bioluminescent-theme.ts`) is the palette; elevate the composition, not
   just the colors.
3. **Keep the working wiring intact:** the new `onPresentWork` tap → Step Card modal (this
   session) MUST survive the redesign — tapping a work still opens Ivy's how-to card.
   Empty slots → `onAskGuide`. Per-area Guru reason. Search-to-add. Don't regress these.
4. **Decide the Shelf↔weekly-activity relationship** as part of the redesign — Tredoux
   found it confusing that the weekly DIY (Plan tab) isn't on the Shelf. Either surface
   "this week's activity" on the Shelf too, or make the separation obviously intentional.
5. Audit (eslint --max-warnings=0 + scoped tsc), commit via Desktop Commander, push,
   then EYEBALL it live as a logged-in homeschool parent.

The shelf is the showcase. Make it the thing families screenshot and send to friends.

---

## What this session shipped

### 1. The Montree **Home System** — a standalone $8/month consumer product (Ivy)

A "resident expert / guide / psychologist + curriculum" for ONE parent, ONE
subscription. Built on the Smart-Capture + Guru foundation. Lives at
`/montree/home/[childId]`, BIO bioluminescent theme, 4 bottom tabs:

| Tab | What |
|-----|------|
| **Ivy** | The companion — chat, photos (vision), the Step Card, the whole loop. The front door. |
| **Shelf** | The child's works at a glance, on a wooden shelf. Tap a work → Ivy's how-to card (see #2). |
| **Plan** | The family week — weekly make-it activity + "✨ Make another" + calendar + routines. |
| **Shop** | Creator marketplace (admin-curated; parents buy from third-party sellers, money goes to THEM). |

**Pricing model (LOCKED — do not reintroduce pay-per-use):** the subscription is
full access to EVERYTHING. NO per-usage charges ("would infuriate me"). The weekly
activity is a free promo (Facebook-style cool DIY). The full curriculum + written
instructions live in the **Montree Library** (subscriber access). The "$1 thing" is
NOT a site feature — it's a SEPARATE future concept for third-party creators who
publish works outside the curriculum and earn from them (money to them, not Tredoux).

**Ivy architecture (`lib/montree/companion/` + `app/api/montree/companion/`):**
- `route.ts` — main SSE route, 13 tools (present_step, set_focus_work, update_progress,
  save_observation [these 3 reuse Guru's `executeTool`], remember, recall, add_to_calendar,
  set_routine, list_schedule, cancel_calendar_item, growth_snapshot, weekly_work, find_materials).
  Tier-gated 402 `feature:'companion'`. Vision support. `__greeting__` fast path (no tools).
  Companion-log archive + `after()` on-wake consolidation. Thread resume.
- `present.ts` — `generateStepCard()` (the warm hand-held card) + **NEW** `generateStepCardForWork()`.
- `system-prompt.ts` — `buildCompanionSystemPrompt`, `COMPANION_NAME='Ivy'`. Three hats + Guru bridge.
- `memory.ts` — per-family memory in `montree_children.settings.companion.memories` JSONB.
- `schedule.ts` — family calendar/routines (events in `montree_home_events`, routines in settings).
- `consolidation.ts` — Haiku nightly fold of `montree_companion_log`.
- `growth.ts` — `gatherGrowthData()` (pure gather, no AI).
- `weekly-work.ts` — curated→cached→AI→template; `generateExtraWork()` for "make another" (ungated).
- `marketplace.ts` — `listActiveProducts/summariseProducts`.

**UI (`components/montree/home/`):** IvyChat, StepCard, MarkdownLite (safe md renderer,
no dangerouslySetInnerHTML), FamilyPlan, Shop, ShelfView, BottomTabs, AmbientParticles.

**Migration 264 (RUN):** `montree_home_events`, `montree_companion_log`,
`montree_weekly_works`, `montree_marketplace_products` — all RLS-enabled+forced, idempotent.

**Access:** `/montree/home/[childId]` gated by `isHomeschoolContext(session)` (role
`homeschool_parent` OR `school.plan_type==='homeschool'`); confirmed via `auth/me`
plan_type so homeschool FOUNDERS (a teacher/principal whose school is a homeschool,
e.g. Tredoux House) get in too. `auth/me` + `MontreeSession.school` now carry `plan_type`.

### 2. Shelf tap → Ivy's hand-held how-to card (THIS SESSION's fix)

**Problem (real-use feedback):** tapping a work on the Shelf opened the *teacher*
progress panel (mark presented/practicing/mastered) with the guide buried behind
another button — a parent saw no instructions and felt lost. The weekly activity
(Banana Peeling Station) being separate from the shelf added to the confusion.

**Fix:**
- `present.ts` → `generateStepCardForWork(supabase, {childId, classroomId, schoolId, workName, area, areaLabel?, childName?, childAgeYears?, locale?})` — synthesizes a `NextStep` and calls `generateStepCard`, so ANY work the parent taps yields the full warm card (why now / what you need / set it up / show it slowly / what to say / what NOT to say / what success looks like).
- **NEW** `POST /api/montree/companion/step-card` `{child_id, work_name, area}` → `{card}`. `verifySchoolRequest` + `verifyChildBelongsToSchool`, tier-aware via `resolveReportModel`, fetches child name/dob for age. maxDuration 60. Verified live: 401 without auth (deployed, not 404).
- `ShelfView.tsx` — NEW optional prop `onPresentWork?: (work) => void`. When provided (home/Ivy context only), tapping a shelf work calls it instead of `openWorkDetail`. **Teacher path unchanged** (prop absent → old progress panel).
- `app/montree/home/[childId]/page.tsx` — Step Card modal: tap → POST step-card → modal with loading state → `<StepCard>`. Closes on backdrop/✕. Mobile bottom-sheet, desktop centered.

### 3. Sanctuary nav trim (Story personal platform)

`app/story/admin/(personal)/layout.tsx` — removed **Board** and **People** from the
nav (Tredoux's call). Route pages stay on disk; ALL Story logins untouched. Removed
the now-unused `isOwner` state + `/whoami` fetch. Nav is now: **Planner · Coach · Projects**.
Restore by re-adding Board to NAV + the owner-only People entry.

---

## Commits this session (all on `main`)
- `ef6fd966` — Ivy greeting fast path (names next step in words, no tool call on greet)
- `996cda42` — open Home to homeschool founders (isHomeschoolContext + plan_type)
- `fe758b84` — MarkdownLite (Ivy bubbles render markdown, not raw `**`/`##`)
- `bce50cfb` — kill the $1 DIY paywall everywhere (full access on subscription)
- `eb551190` — **Shelf tap → Ivy how-to card** (present.ts + step-card route + ShelfView prop + modal)
- `cff221a1` — **Sanctuary nav: hide Board + People** (routes + logins intact)

(Earlier session commits built the rest of the home system — see git log around the Ivy/companion files.)

---

## Audit state
- eslint `--max-warnings=0` clean on every file I authored/changed.
- tsc: zero errors in my code. Pre-existing baseline untouched: `lib/montree/curriculum-loader.ts` ×17, `ShelfView.tsx` ×1 (the `t={t}` ShelfPlank prop type — predates me). ShelfView's 7 eslint warnings (`any`/`<a>`) are pre-existing in a shared file — left alone (not mine, scope creep).
- Project runs `typescript.ignoreBuildErrors:true`; build is green.

---

## One eyeball check left (do on next open)
Log into the Home product as a homeschool parent (Tredoux House works), open the
**Shelf** tab, tap any work → confirm the warm Step Card modal appears with full
instructions (not the teacher progress panel). The route is confirmed deployed
(401 auth), StepCard + companion pipeline were verified live earlier this session,
and the wiring is a thin wrapper + standard modal — but a human tap is the final tick.

⚠ Side effect from an earlier chat test: Amy's focus work on production Whale Class
was set to "Greetings" via the companion test. Reversible from the teacher dashboard.

---

## Open / next (offered, not requested)
- Draft a first **curated weekly activity** INSERT into `montree_weekly_works` (so the
  weekly promo isn't AI-generated per family — a human "cool DIY of the week").
- Solidify the **Montree Library** / creator-marketplace economics (the third-party-creator
  earning model — "a place where people put all their works in one place and make money from it").
- Soft cost-guard (silent rate limit, NOT a paywall) on "Make another".
- i18n sweep of the home product's English chrome.
- Wire **$8 Stripe billing** for the home/companion subscription (operational).
- Reduce the Shelf↔weekly-activity mental-model gap further if it still reads as two
  separate things (the weekly activity is a bonus in Plan; the Shelf is tracked curriculum).

## 💰 Pricing + usage cap — UNDER DISCUSSION Jun 16 (NOT locked; design comes first)

**Home runs SONNET.** Tredoux: "Sonnet is king, Haiku doesn't cut it." Do NOT flip
home to Haiku-only (supersedes an earlier note). **Working direction (not final):**
**two tiers, BOTH starting on Sonnet**, with **top-up** OR **fall back to Haiku** once
the Sonnet allowance is spent — so it never hard-stops. $8 was the Haiku number; Sonnet
≈ a $30 product. Exact prices/allowances TBD. **Priority: design the Shelf first, then
finalize pricing.** (Earlier sketch below — ~$29 / 350 msgs — is a starting point only.)

**Sustainability = a fair-use allowance, NOT pay-per-use** (the "would infuriate me"
rule was about per-action metering + the $1 paywall, not a generous ceiling):
- **350 Ivy CHAT messages / month + ~30 / day guardrail.**
- **Step Card taps are FREE / uncounted** — tapping the shelf for instructions stays unlimited.
- Hitting the cap = a **warm Ivy message** ("we've covered a lot today 🌿 — let's pick
  this up tomorrow / next month"), **never a 402, never a paywall**.

**Why it's sustainable** (Sonnet, caching already on): typical Ivy turn ~$0.05–0.08,
heavy multi-tool/photo turn ~$0.12–0.20. Full-cap COGS ≈ $21 → ~$7 margin worst case;
typical family (30–100 msgs) ≈ $2–6 → 80–90% margin. The cap protects the tail. A
20×/day user would be ~$30–45/mo uncapped — hence the hard line.

### 🚧 BUILD (next session, after / alongside the Shelf redesign)
1. **Usage counters per family** — monthly + daily, in `montree_children.settings.companion`
   (`usage: {month, monthCount, day, dayCount}`) or a small table.
2. **Gate in `app/api/montree/companion/route.ts`** — count only CHAT turns (NOT `__greeting__`,
   NOT `/companion/step-card`). Limits **350/mo + 30/day**. Over → stream a warm Ivy
   "continue tomorrow" message, NOT a 402. Reset monthly + daily.
3. **Free margin lever (do regardless):** `MAX_TOOL_ROUNDS` 6→4, `MAX_TOOL_RESULT_CHARS`
   40_000→~15_000 — cuts worst-case heavy-turn cost 30–50%, negligible quality loss.
4. **Step Card route:** optionally prompt-cache the static system prefix (cross-tap saving
   in the 5-min window). Step cards stay free to the user.
5. **Stripe:** wire the **$29/mo** Home/companion price (operational).
Coach stays Sonnet (single user) — unchanged.
