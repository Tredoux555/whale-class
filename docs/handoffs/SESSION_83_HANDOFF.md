# Session 83 — Principal Cockpit Reframe + Invite Flow + 503 Diagnostic + Speed Fix

**Date:** May 3, 2026
**Commits:** 9 pushed to main
**Status:** All changes live on production after Railway deploys

---

## Commits in order

| Commit | Title |
|---|---|
| `38839e36` | Session 82: Quick Guide structural fix — phantom-field cleanup across 12 locales |
| `05d70462` | Cockpit V1: Today page + 6-item sidebar + classrooms relocated + Today API |
| `6c9ad229` | V1 audit fix: teacher_confirmed=true filter + sidebar fallback links |
| `4cd40016` | Cockpit V2: People + Pulse hub pages + sidebar wired to real routes |
| `a0c4bd2e` | Cockpit V3: Settings full rewrite + theme cleanup across 8 admin pages |
| `303d9bfb` | Cockpit V4: Guru chat dark-forest theme |
| `4c2acd07` | 503 diagnostic: request log in verifySchoolRequest + pip install timeout in start.sh |
| `247de394` | Principal invite flow + viewer-mode billing gates |
| `775afac5` | Speed up progress/update — bookkeeping fire-and-forget after response |

---

## A. Session 82 ship (commit 38839e36)

The 3x3x3 Quick Guide structural fix from Session 82 was sitting in the local working tree — never pushed. Verified `git log origin/main..HEAD` was empty when session started; the commit message at the top of CLAUDE.md said "8 files changed locally. 0 commits pushed yet."

**What it fixed (recap):** Quick Guide modal was reading phantom TypeScript fields (`quick_guide_zh`, `materials_zh`, `direct_aims_zh`, `indirect_aims_zh`) that no migration ever created. The /works/guide API merges `guide_content_<locale>` JSONB into flat fields server-side; consumers should read flat fields. Plus the URL-builder caller in `[childId]/page.tsx` was hardcoded to `if (locale === 'zh' || locale === 'es') url += &locale=...` — silently shipping English to nine other locales.

**Files (already documented in CLAUDE.md Session 82 entry, just needed the push):**
- `lib/montree/i18n/db-helpers.ts` — added `getLocalizedGuideField<T>(work, field, locale)`
- `app/montree/dashboard/[childId]/page.tsx` — locale gate via `SUPPORTED_LOCALES.includes`
- `app/montree/dashboard/curriculum/page.tsx` — same gate fix + `getLocalizedWorkName` for header
- `components/montree/child/QuickGuideModal.tsx` — read `guideData?.quick_guide` directly
- `components/montree/child/FullDetailsModal.tsx` — same fix for 5 fields
- `components/montree/curriculum/CurriculumWorkList.tsx` — 7 read sites via helper + `Array.isArray()` guards
- `components/montree/home/WorkDetailSheet.tsx` — pass locale param + locale in deps
- `components/montree/curriculum/types.ts` — phantom field declarations deleted

---

## B. Principal Cockpit reframe (commits 05d70462 through 303d9bfb)

The principal portal was reframed from a CRUD admin tool into a **school cockpit**. Same data, completely different mental model: "what's happening at my school right now" instead of "manage my classrooms."

### V1: Today page + 6-item sidebar (`05d70462`)

Replaced 3-tab teacher-style layout with a 6-destination dark-forest sidebar (240px desktop, drawer mobile). Six destinations:
- **Today** — the cockpit / home
- **Classrooms** — tile list (relocated from `/admin`)
- **People** — placeholder until V2 hub built
- **Pulse** — placeholder until V2 hub built
- **Settings**
- **Ask Guru**

`/montree/admin` is now the Today cockpit:
- Hero: school name in Lora serif (clamp 28-40px), "Welcome back, {firstName}. It's {weekday}, {date}."
- Weekly digest paragraph — natural-language summary ("X of Y children have moments to share, Z photos confirmed, A of B teachers logged in")
- 4 metric tiles: children, classrooms, active teachers ratio, observation rate %
- Wants-your-attention list (gold accents): idle teachers (3+d no login), classrooms without lead teacher, children not observed in 8+d
- Quick actions row

New API: `app/api/montree/admin/today/route.ts`. Aggregates school + principal + stats + 7-day digest + attention items. Conservative — only queries tables whose schemas were verified. 5-min cache + 10-min SWR.

Old classroom-tile view migrated from `/admin/page.tsx` to `app/montree/admin/classrooms/page.tsx`. Restyled with dark-forest tokens. Same modals, same i18n keys, same flow.

Layout file (`app/montree/admin/layout.tsx`) hoisted `SidebarContent` to top-level component (was being recreated each render — `react-hooks/static-components` rule).

### V1 audit fix (`6c9ad229`)

Two issues caught immediately after V1 ship:
1. Today API recent-observation query missing `.eq('teacher_confirmed', true)` — was inflating "observed this week" %.
2. People + Pulse sidebar items pointed at `/admin/people` and `/admin/pulse` (not yet built) — produced 404. Re-pointed to existing `/admin/students` and `/admin/activity` as fallbacks. The `match()` functions in NAV still highlight People/Pulse for the consolidated routes.

### V2: People + Pulse hub pages (`4cd40016`)

Built `app/montree/admin/people/page.tsx` and `app/montree/admin/pulse/page.tsx`. Both follow the same hub-with-cards pattern.

**People hub:** 4 cards — Teachers, Students, Parent codes, Bulk import. Each shows a key metric from `/api/montree/admin/today` and drills into the existing dedicated page. No logic duplication — the existing teachers/students/parent-codes pages stay intact (they keep their old emerald theme until V3).

**Pulse hub:** 4 cards — This week (photo + observation count), Reports, Billing, Engagement. Same pattern, drills into `/admin/activity`, `/reports`, `/billing`.

Sidebar links updated from fallbacks to real hub pages. `match()` expanded so `/import` highlights People and `/billing` highlights Pulse.

### V3: Settings rewrite + theme cleanup on 8 pages (`a0c4bd2e`)

`app/montree/admin/settings/page.tsx` — full rewrite. Dark forest tokens, Lora serif headings, Lucide section icons (Building2, KeyRound, UserRound, CreditCard), glass cards, brand emerald inputs. Removed the page-level back arrow (sidebar provides nav). Removed Danger Zone logout (sidebar Sign-out is canonical exit). Subscription status uses brand emerald/gold/red badges instead of green/amber/red Tailwind. All existing i18n keys preserved.

Theme cleanup on 8 other admin pages — minimal-touch intervention to kill the gradient-on-gradient conflict against the new dark-forest layout. Stripped `min-h-screen bg-gradient-to-br ...` outer wrappers from:
- `activity/page.tsx` (loading + main)
- `reports/page.tsx`
- `billing/page.tsx`
- `teachers/page.tsx`
- `students/page.tsx` (loading skeletons + main)
- `import/page.tsx` (loading + main)
- `classrooms/[classroomId]/page.tsx` (loading + main + sticky header softened)
- `guru-settings/page.tsx` (loading + main)

Inner content (cards, buttons, inputs) unchanged. Pages now sit on the layout's `#0a1a0f` background instead of fighting their own gradients. Still wear original card colors — inconsistent with cockpit pages but no longer visually broken.

Skipped: `parent-codes` (light theme intentional — printable page) and `features` (no theme conflict found).

### V4: Guru chat dark-forest theme (`303d9bfb`)

Last sidebar destination still on slate gradient. `app/montree/admin/guru/page.tsx` — chat container themed to dark forest, glass card surface, Lora hero ("Ask Guru" instead of "Admin Guru"), brand emerald Send button, brand red Cancel, emerald pill Clear chat button, emerald-tinted input bar. Inner message bubbles (still slate-700) unchanged — slate is dark enough to read fine on dark forest, and the bubbles are part of the chat metaphor we don't want to over-tune.

---

## C. 503 diagnostic instrumentation (commit 4c2acd07)

After 6 commits in quick succession, user reported persistent 503s. Realized:

**Root cause hypothesis:** Each commit triggers a Railway redeploy. During the 30-60s container-replacement window, Railway's edge proxy returns 503 to all in-flight requests. This is NOT an app bug — it's a normal consequence of deploying. But it FELT like a persistent app bug because the user was testing during deploy windows.

**Diagnostic shipped to confirm:**

1. `lib/montree/verify-request.ts` — added `console.log('[req] ${method} ${pathname}')` at the top of every API call. Next time a 503 happens:
   - `[req]` line present in Railway logs → app got the request (real bug, would normally be 500)
   - `[req]` line absent → request never reached Node (Railway edge during churn)

2. `start.sh` — wrapped `pip3 install --upgrade yt-dlp` in `timeout 20`. Previously could hang indefinitely on slow PyPI days, blocking `exec node server.js` past Railway's 60s healthcheck timeout, marking container unhealthy and replacing it. Removes one specific failure mode.

**Important context:** `export const maxDuration` from prior sessions does NOT take effect on Railway standalone mode. Only enforced by Vercel/Lambda. Session 81's commit `294a0648` ("maxDuration on 25 AI-calling routes") was a placebo on this stack. No 503s come from that path. Confirmed by the user explicitly running `node server.js` from `.next/standalone` — long-running container, no per-route timeout enforcement.

**Awaiting evidence:** the next 503 the user hits will produce evidence in Railway logs. The hypothesis is that 503s will cluster around our deploy windows (which we've now stopped creating).

---

## D. Principal invite flow + viewer-mode billing gates (commit 247de394)

The missing mid-funnel piece. Until now, principals of teacher-led schools (where a teacher signed up at `/montree/try` first) had **no path in** — the teacher signup at `app/api/montree/try/instant/route.ts` line 332 doesn't create a `montree_school_admins` row. This commit closes that gap with the right business model.

### The flow now

1. **Teacher** (Tredoux) is on the dashboard, opens More menu, clicks "Invite your principal"
2. Modal opens: name, email, optional note
3. Server creates `montree_school_admins` row tied to the same `school_id`, generates a unique 6-char login code
4. Resend sends warm welcome email **from `RESEND_FROM_EMAIL`** (currently `onboarding@resend.dev` — see Resend setup section below) with subject *"Tredoux wants to show you something"*
5. **Principal** (Mrs. Chen) clicks "Open Montree" in email → lands on `/montree/login-select?code=ABC123` → auto-authenticated → redirects to `/montree/admin` (Today cockpit)
6. Principal sees gold viewer banner: *"You're a viewer. This is a teacher's classroom — you can browse everything below for free. To add your own classrooms or invite your other teachers, upgrade to a school plan."*
7. Add-classroom buttons replaced with gold "Upgrade to add classrooms" links to `/pricing`

### Files (commit 247de394)

- `app/api/montree/invite-principal/route.ts` — NEW. Teacher-only POST. Validates name + email, generates unique 6-char code (avoids I/O/0/1 for verbal sharing), inserts `montree_school_admins` row tied to teacher's `school_id`, calls `sendPrincipalInviteEmail`. Re-inviting same email regenerates code (security hygiene — invalidates old email). Returns code + email status.

- `lib/montree/email.ts` — NEW `sendPrincipalInviteEmail()` function + HTML/text generators + `escapeHtml()` helper. Subject: `'{teacherName} wants to show you something'`. Tone is warm and human, not transactional. Code shown prominently in dark glass card. Optional teacher note rendered as styled quote with `— TeacherName` attribution. Uses `getFromEmail()` so when `RESEND_FROM_EMAIL` env var is updated to `hello@montree.xyz` after domain verification, it kicks in automatically.

- `components/montree/InvitePrincipalModal.tsx` — NEW. Two-state modal: form (name + email + 600-char optional note) → success (code shown big with copy-to-clipboard, plus message about whether email actually delivered via Resend). Dark forest tokens, Lora hero, brand emerald CTA.

- `components/montree/DashboardHeader.tsx` — wired modal into More menu. New "Invite your principal" row with `UserPlus` icon, between feature-gated extras and Menu Management. Always visible (no feature flag) — it's a core conversion path.

- `app/api/montree/admin/today/route.ts` — added plan info. New `plan` object: `{ plan_type, subscription_status, is_teacher_led }`. `is_teacher_led = (plan_type === 'personal_classroom') || has founding_teacher_id`. This is the signal that drives the principal cockpit gates.

- `app/montree/admin/page.tsx` — Today cockpit renders viewer banner above digest when `plan.is_teacher_led`. Gold accent (`#E8C96A`), soft tone, links to `/pricing`. Doesn't block any cockpit content — viewers see everything, just can't expand.

- `app/montree/admin/classrooms/page.tsx` — both "Add classroom" affordances (header pill button + bottom-of-grid tile) gate behind `plan.is_teacher_led`. Replaced with "Upgrade to add classrooms" links to `/pricing`. Gold accents flag "this is a paid action" without nagging.

### Pricing model that this enforces

| State | Plan | What | Who pays |
|---|---|---|---|
| Trial | `personal_classroom` + `subscription_status='trialing'` | 1 classroom · 1 teacher · 30 days · full AI | Free |
| Single classroom | `personal_classroom` + `subscription_status='active'` | 1 classroom · 1 teacher · full AI | $7/student/mo (teacher pays) |
| School plan | `school` + `subscription_status='active'` | N classrooms · N teachers · principal billing · full AI per classroom | $7/student/mo (principal pays for all classrooms) |

Principal **invited to a teacher-led school** sees but pays nothing — they're a witness. AI work was already done for the teacher; principal is just looking at cached data. Conversion happens at the moment of EXPANSION (adding their own classrooms / teachers), not at the door.

### NOT shipped — Stripe upgrade flow

Clicking "Upgrade to add classrooms" goes to `/pricing` which is a marketing page, not a checkout. The state transition `personal_classroom` → `school` is currently manual (super-admin must update `montree_schools.plan_type`). Stripe self-serve upgrade is its own session.

---

## E. Speed fix on /api/montree/progress/update (commit 775afac5)

User reported "the work does get updated but its far from instant which is far from ideal." Confirmed: route was awaiting 8-10 sequential DB queries before responding. Auth + `verifyChild` + `SELECT child` + `SELECT existing` + `UPSERT progress` is the actual write. Then 4-6 more queries of bookkeeping that the user was waiting for unnecessarily:
- Curriculum auto-sync (1-4 queries — checks if work has a curriculum row, creates one if not)
- `is_extra` upsert (1 query)
- `focus_works` legacy mirror + extras cleanup (2 queries)

**Fix:** moved all three bookkeeping blocks into `void (async () => { ... })()` fire-and-forget IIFEs that run AFTER `NextResponse.json()` returns. Critical path drops from ~1200ms (sequential) to ~250ms (auth + verifyChild + UPSERT only).

**Why safe:**
- `montree_child_progress` UPSERT is the source of truth — still awaits, blocks response, durable before client knows
- Curriculum auto-sync only matters for custom work names (rare per click); failure is `non-fatal` per existing comment
- Focus mirror to `montree_child_focus_works` is legacy bookkeeping; the GET route in `/api/montree/progress` derives `is_focus` from this table, so a 50ms delay means the next page-refresh briefly shows the old focus work (acceptable)
- Extras upsert is metadata about whether a work is an "extra"; doesn't affect focus shelf rendering

**Behavior change:** client gets `success: true` 2-5x faster. Background work completes within ~500ms after response.

---

## Architectural rules locked in this session

- **`maxDuration` exports are placebo on Railway standalone mode.** Don't ship more of them attributing 503 fixes. Real fixes for Railway 503s are at the container level (memory, healthcheck, startup races).
- **`is_teacher_led = (plan_type === 'personal_classroom') || has founding_teacher_id`.** This is the canonical signal for principal-as-viewer mode. Drives banners and add-capacity gates.
- **Bookkeeping after a write goes in fire-and-forget IIFEs.** The user shouldn't wait for side effects. Pattern: `void (async () => { try { ... } catch (e) { console.error(...) } })()` before the response return.
- **`getLocalizedGuideField(work, field, locale)`** is the canonical helper for translated guide-body content from a curriculum work row. Reads `guide_content_<locale>` JSONB with fallback to English flat field. Use this everywhere — never read `quick_guide_<locale>` (phantom field).
- **The Today API contract** is now the canonical source for principal cockpit data. New cockpit pages should consume `school / principal / stats / digest / attention / plan` from `/api/montree/admin/today` rather than calling `/admin/overview` separately.
- **Sidebar IA: 6 destinations, 14 sub-pages.** Today, Classrooms, People, Pulse, Settings, Ask Guru. Hubs delegate to existing sub-pages. Don't add a 7th sidebar item without strong justification.

---

## What's still open (carry-overs)

### Resend / hello@montree.xyz domain verification

`RESEND_FROM_EMAIL` is currently `onboarding@resend.dev` — Resend's test address that only delivers to the email registered on the Resend account itself. To make the principal invite emails actually reach principals:

1. Log in at https://resend.com (try `tredoux555@gmail.com` for "forgot password" if account credentials are unclear)
2. Domains → Add Domain → enter `montree.xyz`
3. Resend gives 3-4 DNS records (TXT, MX, CNAME for SPF/DKIM/DMARC)
4. Add DNS records to montree.xyz's DNS provider
5. Wait for Resend verification (minutes to hours)
6. Railway env vars → set `RESEND_FROM_EMAIL=Montree <hello@montree.xyz>`
7. Next email send uses the verified domain

The principal invite flow code is ready — the email send call is `sendPrincipalInviteEmail()` which uses `getFromEmail()` which reads `RESEND_FROM_EMAIL`. No code change needed once domain is verified.

### Inner-content polish on 8 V3 admin pages

Settings + Activity + Reports + Billing + Teachers + Students + Import + Classroom drill-down + Guru-Settings — outer gradients are gone but inner cards still use `bg-white/10` + `bg-emerald-700/X` button chrome. Mechanical sweep to canonical glass tokens (`rgba(8,20,12,0.55)` + emerald border). 30-45 min focused commit.

### parent-codes print/screen split

Page is light-themed because it's printable. Currently jarring when navigated to from dark sidebar. Needs a print-vs-screen mode split (light cards on screen → dark forest container; print mode preserves white). ~20 min.

### Translation pass on cockpit + invite copy

About 50 strings hardcoded English across:
- Today page hero, digest, attention list, quick actions
- People + Pulse hub card titles + subtitles
- Settings page (mostly using existing keys, but a few new strings)
- Sidebar nav labels (Today, Classrooms, People, Pulse, Settings, Ask Guru)
- Viewer banner ("You're a viewer", "Upgrade to add classrooms" CTAs)
- InvitePrincipalModal copy + email subject + email body

Run via `npm run i18n:fill-ui` (Haiku batch script) once we add keys to `lib/montree/i18n/en.ts`. ~$0.40 in Haiku costs.

### Voice-first principal onboarding rebuild

The 697-line three-step wizard at `/montree/principal/setup` is still the form-based flow. Vision: mirror what teachers got — big mic, "Tell me about your school," Sonnet extracts structure, streaming setup with ceremony, end on "Your school is alive." Half-day to full-day of work.

### Auth consolidation

Principal portal still hybrid: cookie (`montree-auth`) + localStorage (`montree_school` + `montree_principal`). Either getting cleared independently produces silent 401 loops. Move to cookie-only matches the teacher side. ~1-2 hours.

### Setup-stream resilience

`/api/montree/principal/setup-stream` does curriculum seed + global translations + classroom creation in one shot. If it 503s mid-stream, the school is half-built. Make it idempotent. ~1 hour.

### Stripe upgrade flow

Currently "Upgrade to add classrooms" links to `/pricing` (marketing page). The transition `personal_classroom` → `school` plan_type is manual. Self-serve Stripe checkout is its own session.

### Verify 503 diagnostic actually surfaces evidence

Next time the user hits a 503, check Railway logs for `[req] METHOD /pathname` lines around the timestamp. Presence/absence tells us whether 503 came from app or Railway edge. Action depends on result.

### Quick Guide production verification

Session 82 fix shipped. Worth eyeballing across DE/FR/JA locales on production to confirm guide bodies render in the right language.

---

## How to test the principal invite flow end-to-end

1. Sign in as a teacher (Whale Class teacher account, e.g.)
2. Top-right "..." → More menu → "Invite your principal"
3. Fill in name + email (use your own email so you actually receive it given current Resend test address)
4. Click "Send invitation"
5. Check your email — should arrive within a minute from `onboarding@resend.dev`
6. Click "Open Montree" in email
7. Should land on `/montree/admin` Today cockpit
8. Verify: gold viewer banner at top, all data visible, Add classroom button is gold "Upgrade" link

If email doesn't arrive: check Railway logs for the principal invite request, then check Resend dashboard for delivery status. Most common cause is `RESEND_FROM_EMAIL` not delivering to non-Resend-account emails.

---

## Files changed (entire session)

### New files
- `app/api/montree/admin/today/route.ts`
- `app/montree/admin/classrooms/page.tsx`
- `app/montree/admin/people/page.tsx`
- `app/montree/admin/pulse/page.tsx`
- `app/api/montree/invite-principal/route.ts`
- `components/montree/InvitePrincipalModal.tsx`

### Significantly modified
- `app/montree/admin/page.tsx` (rewritten as Today cockpit)
- `app/montree/admin/layout.tsx` (rewritten with sidebar)
- `app/montree/admin/settings/page.tsx` (rewritten with dark forest theme)
- `app/montree/admin/guru/page.tsx` (header + input themed)
- `lib/montree/email.ts` (new sendPrincipalInviteEmail function)
- `components/montree/DashboardHeader.tsx` (More menu wired to invite modal)
- `lib/montree/verify-request.ts` (request log)
- `start.sh` (pip timeout)
- `app/api/montree/progress/update/route.ts` (fire-and-forget bookkeeping)

### Theme cleanup (outer wrapper removed)
- `app/montree/admin/activity/page.tsx`
- `app/montree/admin/reports/page.tsx`
- `app/montree/admin/billing/page.tsx`
- `app/montree/admin/teachers/page.tsx`
- `app/montree/admin/students/page.tsx`
- `app/montree/admin/import/page.tsx`
- `app/montree/admin/classrooms/[classroomId]/page.tsx`
- `app/montree/admin/guru-settings/page.tsx`

### Session 82 ship (already committed locally, just pushed)
- `lib/montree/i18n/db-helpers.ts`
- `app/montree/dashboard/[childId]/page.tsx`
- `app/montree/dashboard/curriculum/page.tsx`
- `components/montree/child/QuickGuideModal.tsx`
- `components/montree/child/FullDetailsModal.tsx`
- `components/montree/curriculum/CurriculumWorkList.tsx`
- `components/montree/home/WorkDetailSheet.tsx`
- `components/montree/curriculum/types.ts`
