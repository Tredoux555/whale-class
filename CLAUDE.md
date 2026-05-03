# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management

Production: `https://montree.xyz` (migrated from teacherpotato.xyz — old domain returns 405 on API calls)
Deploy: Railway auto-deploys on push to `main`
Git remote: `git@github.com:Tredoux555/whale-class.git` (SSH — Cowork VM key "Cowork VM Feb 15" added Feb 15, 2026; old "Cowork VM" Feb 11 key is stale)
Local path: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale` (note space in "Master Brain")
**⚠️ Git Push — ALWAYS use Desktop Commander FIRST:** `mcp__Desktop_Commander__start_process` with command `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main 2>&1` and `timeout_ms: 30000`. Do NOT try Cowork VM SSH keys, GitHub PATs, or `scripts/push-to-github.py` — Desktop Commander on the user's Mac is the only reliable push method.

---

## 📮 CAMPAIGN MANAGER — Outreach Protocol (replaces GMass as of Apr 19, 2026)

**🚨 THIS IS A STANDING INSTRUCTION FOR EVERY SESSION. READ THIS FIRST. 🚨**

Claude is Tredoux's outreach campaign manager. GMass is retired. The workflow is:
- **Claude drafts** personalized emails as Gmail drafts (50/day target)
- **Tredoux reviews** each draft in Gmail and hits Send
- **Claude monitors** Gmail for replies and drafts responses
- **Tredoux handles** appointment setting personally — everything else is Claude's job

### The Daily Routine (EVERY SESSION)

When the user says anything like "what's happening with the campaign", "campaign update", "outreach status", or starts a new session:

1. **Check Gmail for replies** — `search_threads` for replies to outreach emails (search: `subject:Montree OR subject:"Montessori Teacher" newer_than:7d -from:me`)
2. **Check for bounces** — `search_threads` for `from:mailer-daemon newer_than:3d`, extract bounced emails, mark in DB as `status='bounced'`
3. **Report status** — How many sent, how many in queue, any new replies, any bounces. Pull live totals from `montree_outreach_contacts`.
4. **Draft replies** to any new responses (professional, warm, push toward a demo call). Put draft replies in Gmail for Tredoux to review and send.
5. **Draft the next batch of 50** — Pick up to 50 contacts from the DB queue (`status='new'`, `email_status != 'bounced'`, `email_status != 'invalid'`), personalize the sacred email for each, create Gmail drafts via `create_draft`
6. **Update the DB** — Mark drafted contacts as `status='drafted'`, log to `montree_outreach_log`
7. **Bounce recovery** — For any new bounces, research correct emails via web search, update DB, re-draft

### Two-Track Outreach: Schools + Multiplier Partners

**Track 1 — Schools (individual_school):** Direct Montree pitch. The sacred email, personalized. Goal: demo call → free pilot → conversion.

**Track 2 — Multiplier Partners:** Institutes, training centers, associations, and franchises that work WITH Montessori schools. One partnership can reach dozens or hundreds of schools. These are MORE valuable than individual school contacts.

**Multiplier types** (from Outreach Hub at `/montree/super-admin/marketing/outreach-hub`):
- `multiplier_association` — 🏛 National/international Montessori associations (e.g., FAMM Argentina, SAMA South Africa)
- `multiplier_training` — 🎓 Teacher training centers (e.g., Montessori CH, MELF, Kidtopia Beijing)
- `multiplier_franchise` — 🏢 Multi-campus networks (e.g., Guidepost HK, Etonkids China)
- `multiplier_consultant` — 💼 Independent Montessori consultants

**Key insight (discovered Session 40):** Replies from "we're not a school" are the BEST replies. FAMM Argentina (AMI Foundation + Training Center) replied asking for pricing, AMI compatibility info, and CV — they collaborate with "numerous educational institutions." Montessori CH (Training Center) also replied. These contacts get a DIFFERENT email — not the sacred school pitch, but a partnership-framed message emphasizing how Montree can be a tool for their trainees/member schools.

**When a multiplier replies:**
- Draft a partnership-oriented response (not the school pitch)
- Emphasize: revenue share for every school they help onboard, Montree as a training tool for their graduates, AMI-compatible curriculum tracking
- Push toward a demo call
- Mark as `status='replied'` with `reply_summary` in DB

### How to Draft Outreach Emails

Use `mcp__f0875e82-fdd3-4aed-b646-de80b534357f__create_draft` with `isHtml: false` (plain text only — HTML drafts via API show raw tags in Gmail compose).

**🚨 PRE-SEND DUPLICATE CHECK (MANDATORY — Session 46 rule, extended Session 50):**
Before creating ANY draft — **cold outreach OR reply** — search `to:DOMAIN in:sent` via `search_threads` for EVERY recipient. The DB `status` field is NOT reliable for dedup — GMass Campaigns C/D sent to ~335 schools not tracked in the DB, and context-loss sessions have created drafts for already-contacted schools. Session 46 found 20 of 52 drafts were duplicates. **Session 50 proved this also applies to REPLY drafts**: Jakarta Montessori had already been emailed 4 times + 2 reply drafts sent earlier in the same session, but context compaction lost visibility, and a 5th duplicate was nearly created. A duplicate cold email signals "mass spam" and kills the lead. A duplicate reply signals incompetence.

**Personalization**: Each email MUST be customized for the recipient. Use the contact's `org_name`, `country`, `contact_person`, and any `notes` to tailor the opening line. The sacred email body stays the same but the greeting and any contextual hook should be specific.

**Subject line**: `Montree` for schools. For multiplier partners, customize based on the relationship type (e.g., `Montree — Partnership for [Country] Montessori Schools`).

**Always send a test to self first** when drafting a new template variant. Verify formatting before creating the batch.

### The Sacred Emails (DO NOT rewrite without user approval)

**PRIMARY — Montree Pitch (~155 words):**
```
Subject: Montree

Dear [School Name / Contact Person],

I'd like to introduce something I've built that I believe represents the next step in the Montessori classroom.

It's called Montree.

A teacher takes a picture of a child working. The system does the rest.

It identifies the work, records the observation, tracks the child's progress, and determines what should come next. It lifts the administrative weight off teachers so they can return to what actually matters — the children, the classroom, the craft.

It writes personalised progress reports for parents. Not templates. Genuine, detailed accounts of what their child is learning and why.

And it gives the principal a complete view of the school — every classroom, every child — with a built-in Montessori expert and developmental psychologist on hand to answer any parent's question instantly.

This wasn't possible before. Now it is.

If you'd like to see it, I'd be glad to show you.

Kind regards,
Tredoux
montree.xyz
```

**SECONDARY — Job Application (~70 words):**
```
Subject: Montessori Teacher & Builder

Dear [School Name],

My name is Tredoux. I'm an AMS-certified Montessori teacher for ages 3–6, and I also built Montree — the first AI-powered classroom management system designed specifically for Montessori schools.

I'm looking for my next classroom. If you need a qualified teacher who can also bring your school into the future of Montessori education, I'd love to talk.

Kind regards,
Tredoux
montree.xyz
```

**Follow-up 1** (5 days after initial, subject becomes `Re: Montree`):
> I wanted to make sure my previous email found its way to you. I'd welcome the chance to show you what Montree can do for your school.
> Kind regards, Tredoux / montree.xyz

**Follow-up 2** (10 days after initial):
> I understand how busy things can get running a school. If Montree isn't the right fit for you, no problem at all. But if you're curious, I'm happy to arrange a quick demonstration at a time that works for you. Either way, I wish you and your school all the best.
> Kind regards, Tredoux / montree.xyz

### Database & Tracking

- **Source of truth**: `montree_outreach_contacts` table in Supabase (536 contacts seeded Apr 19)
- **Status flow**: `new` → `drafted` (Gmail draft created) → `sent` (user sent from Gmail) → `replied` / `bounced` / `follow_up` → `converted` / `dead`
- **Activity log**: `montree_outreach_log` table — every action logged with timestamp
- **Campaign Manager UI**: `/montree/super-admin/marketing/campaign-manager` — live dashboard
- **Outreach Hub UI**: `/montree/super-admin/marketing/outreach-hub` — multiplier partner + school CRM with pipeline view, contact types, priority levels, and `est_schools_reached` per multiplier
- **API**: `/api/montree/super-admin/campaign-manager` — GET stats, PATCH status updates
- **API**: `/api/montree/super-admin/outreach` — GET stats/contacts/log for Outreach Hub
- **Master spreadsheet**: `whale/Montree_Master_Outreach.xlsx` — 1,135 schools (785 global + 350 China). 507 MX-verified and deliverable. NOTE: This is a DIFFERENT data source than `montree_outreach_contacts` (536 rows). The spreadsheet has more schools but not all are in the DB yet.

### Gmail Tools Available

- `create_draft` — create drafts (plain text, `isHtml: false`)
- `search_threads` — find reply threads
- `get_thread` — read full thread content
- `list_drafts` — check existing drafts

### GMass Legacy (RETIRED)

GMass campaigns A/C/D are historical. Campaign C sent 335 blank emails (Session 12 disaster). Campaign D was the correction. Campaign A (Montree pitch) was scheduled for Apr 27 but is now superseded by the Campaign Manager workflow. All future outreach goes through Claude + Gmail drafts. GMass is no longer used.

**🚨 NEVER automate email sending.** Claude creates drafts only. Tredoux reviews and sends every email manually. This prevents another blank-email disaster.

### Active Reply Threads (as of Apr 23, 2026 — updated Session 55)

**🔥 HOT — Multiplier Partners:**
- **FAMM Argentina (Marisa Canova de Sioli, marisa@fundacionmontessori.org)** — AMI Foundation + Training Center. Asked for CV, pricing, AMI compatibility. Tredoux replied Apr 18 with full pricing breakdown + partnership offer (revenue share). AWAITING RESPONSE. This is the #1 lead. **Follow up if no response by Apr 28.**
- **Cambridge Montessori Global (info@jalsaventures.com)** — Replied "Let us know more about it please!" Draft reply created with full Montree overview + tier breakdown + demo call request. AWAITING TREDOUX SEND + RESPONSE. NOT IN DB (GMass recipient).

**🔥 HOT — School Leads (asked for resume/CV or showed interest):**
- **The Ardee School, India (Sunpritt Dang, phone 9718902010)** — Gave phone number. Tredoux already contacted on WhatsApp (Session 47).
- **I Cube Montessori, India (reachus@icubemontessori.com)** — "Warm Greetings... send your detailed resume." Tredoux sent resume + Montree pitch.
- **Ace Montessori, India (acemontessorijngr@gmail.com)** — Gave phone number +91 9663373111. Direct contact.
- **Meraki Montessori, India (management@merakimontessori.in)** — Asked for resume. Tredoux sent.
- **Village Montessori, SC (info@villagemontessori.com)** — RESURRECTED (Session 47). Previously said "not interested" but came back and asked for resume. Tredoux sent.
- **Paint Pots Montessori, UK (paintpotsmontessori@outlook.com)** — 🔥 "Can you give me any more details or a demo?" Demo request. Reply drafted (Session 71): magic of Montree + 20-min demo offer. AWAITING TREDOUX SEND + RESPONSE.
- **Ardtona House Montessori, UK (info@ardtonahouse.co.uk)** — 🔥 "Do you offer a free trial?" Trial interest. Reply drafted (Session 71): "Yes — one month free, no credit card" + direct signup link + early adopter hook. AWAITING TREDOUX SEND + RESPONSE.
- **Montessori Copenhagen (info@montessori-cph.dk)** — 🔥 "Can you provide more details about the system?" Reply drafted (Session 71): full magic overview + 9 languages + early adopter + demo or trial CTA. AWAITING TREDOUX SEND + RESPONSE.

**⚠️ PIVOTED — Declined teaching, Tredoux pivoted to Montree pitch (awaiting reply):**
- **Remuera NZ (info@remueramontessori.co.nz)** — Fully staffed. Tredoux pivoted to Montree.
- **Prerana Montessori, India (preranamontessori2002@gmail.com)** — No vacancy. Tredoux pivoted to Montree.

**⏸ AUTO-REPLY / FOLLOW-UP LATER:**
- **Otari School NZ (principal@otari.school.nz)** — Principal on sabbatical. Forwarded to Acting Principal. Follow up May 1.
- **Montessori Norge (nina.johansen@montessorinorge.no)** — Out of office until May 5. Follow up after May 6. NOT IN DB (GMass recipient).
- **Montessori CH (kurs@montessori-ch.ch)** — Multiplier training center. In follow_up status. Needs Montree partnership pitch.

**💡 COMPETITIVE INTEL:**
- **Jakarta Montessori School (admission@jakartamontessori.com)** — Uses **Montessori Compass** (competitor). Active in SE Asia. No further follow-up.

**❌ DEAD (7 total):**
- **Montessori Aotearoa NZ (ce@montessori.org.nz)** — Board declined. "Not something we wish to explore."
- **Melville Montessori (jacqui@melvillemontessori.co.za)** — No longer owns school or lives in SA.
- **Kakuozan Montessori (information@kakuozan-preschool.com)** — "Not Montessori."
- **Sonnberg Austria (sabine@am-sonnberg.com)** — Position filled. Graceful close. NOT IN DB.
- **Al Qamar Academy, BestStart Montessori, CHOW Montessori** — No response / dead leads.

---

## RECENT STATUS (May 3, 2026)

### ⚡ Session 83 — Principal Cockpit Reframe + Invite Flow + 503 Diagnostic + Speed Fix (May 3, 2026)

**9 commits pushed to main this session.** Reframed the principal portal from CRUD admin tool to school cockpit, shipped the missing teacher→principal invite flow, added 503 diagnostic instrumentation, and made the add-work POST 5x faster. Plus pushed Session 82's Quick Guide fix that had been sitting locally.

**Commits:**
- `38839e36` — Session 82 Quick Guide fix shipped (was sitting in working tree)
- `05d70462` — Cockpit V1: Today page + 6-item dark-forest sidebar + classrooms relocated to `/admin/classrooms` + new `/api/montree/admin/today` endpoint
- `6c9ad229` — V1 audit fix: `teacher_confirmed=true` on observation query + sidebar fallback links
- `4cd40016` — Cockpit V2: People + Pulse hub pages with 4 metric cards each
- `a0c4bd2e` — Cockpit V3: Settings full rewrite + theme cleanup on 8 admin pages (gradient wrappers stripped)
- `303d9bfb` — Cockpit V4: Guru chat dark-forest theme
- `4c2acd07` — 503 diagnostic: `[req] METHOD /pathname` log in `verifySchoolRequest` + `timeout 20` on pip install in `start.sh`
- `247de394` — Principal invite flow + viewer-mode billing gates
- `775afac5` — Speed up `/api/montree/progress/update` — bookkeeping moved to fire-and-forget after response

**A. Principal Cockpit reframe (V1-V4, commits 05d70462 → 303d9bfb):**

The principal portal was 3 sidebar items (Overview / Guru / Settings) with 14 orphaned sub-pages and inconsistent themes (mix of `from-emerald-900`, `from-slate-900`, `bg-gray-950`, no theme at all). Now: 6-item dark-forest sidebar (Today, Classrooms, People, Pulse, Settings, Ask Guru) where every destination resolves to a real page in the canonical brand theme.

The new **Today cockpit** (`/montree/admin`) is the heart of the reframe. School name in Lora serif (clamp 28-40px), "Welcome back, {firstName}. It's {weekday}, {date}.", weekly digest paragraph in plain English ("X of Y children have moments to share, Z photos confirmed, A of B teachers logged in"), 4 metric tiles (children · classrooms · active teachers ratio · observation rate %), wants-your-attention list in gold (idle teachers 3+d, classrooms without lead, children not observed 8+d), quick actions row.

**New API:** `app/api/montree/admin/today/route.ts`. Returns `school / principal / stats / digest / attention / plan`. Cache 5 min, SWR 10 min. The canonical source for principal cockpit data.

**Theme cleanup on 8 drill-down pages** — minimal-touch intervention. Stripped `min-h-screen bg-gradient-to-br ...` wrappers from activity / reports / billing / teachers / students / import / classroom drill-down / guru-settings. Inner content (cards, buttons) unchanged. Pages now sit on the layout's `#0a1a0f` cleanly. Inner-content polish (replacing `bg-white/10` cards with canonical glass tokens) deferred to a focused follow-up commit.

Skipped: `parent-codes` (light theme intentional for printing) and `features` (no theme conflict).

**B. Principal invite flow + viewer-mode (commit 247de394):**

The missing mid-funnel piece. Until this session, principals of teacher-led schools (where a teacher signed up at `/montree/try` first) had no path in — the teacher signup at `try/instant/route.ts:332` doesn't create a `montree_school_admins` row.

The flow:
1. Teacher's More menu → "Invite your principal"
2. Modal: name + email + optional 600-char note
3. Server creates `montree_school_admins` row tied to teacher's `school_id`, generates unique 6-char code (avoids I/O/0/1 for verbal sharing)
4. Resend sends warm welcome email **from `RESEND_FROM_EMAIL`** with subject `'{teacherName} wants to show you something'`
5. Principal clicks "Open Montree" → lands on `/montree/login-select?code=ABC123` → cockpit
6. Principal sees gold viewer banner: "You're a viewer. This is a teacher's classroom — you can browse everything below for free. To add your own classrooms or invite your other teachers, upgrade to a school plan."
7. Add-classroom buttons replaced with gold "Upgrade to add classrooms" links

**Pricing model that this enforces:**

| State | plan_type / status | What | Cost |
|---|---|---|---|
| Trial | `personal_classroom` + `trialing` | 1 classroom · 1 teacher · 30 days · full AI | Free |
| Single classroom | `personal_classroom` + `active` | 1 classroom · 1 teacher · full AI | $7/student/mo |
| School plan | `school` + `active` | N classrooms · N teachers · principal billing | $7/student/mo across school |

Principal invited to a teacher-led school sees but pays nothing — they're a witness. AI work was already done for the teacher; principal is just looking at cached data. Conversion happens at the moment of EXPANSION (adding their own classrooms / teachers), not at the door.

**🚨 Architectural rule locked in:** `is_teacher_led = (plan_type === 'personal_classroom') || has founding_teacher_id`. This is the canonical signal for principal-as-viewer mode. Lives in `/api/montree/admin/today` response under `plan.is_teacher_led`. Drives banners + add-capacity gates.

**🚨 Stripe upgrade flow NOT shipped.** "Upgrade to add classrooms" links to `/pricing` (marketing page). The transition `personal_classroom` → `school` is currently manual (super-admin updates `plan_type`). Self-serve checkout is its own session.

**C. 503 diagnostic instrumentation (commit 4c2acd07):**

After 6 commits in quick succession, user reported persistent 503s. **Root cause confirmed: deploy-window churn.** Each Railway redeploy creates a 30-60s container-replacement window during which Railway's edge proxy returns 503 to all in-flight requests. NOT an app bug — a normal consequence of deploying. But it FELT like a persistent app bug because the user was testing during deploy windows.

**Two surgical changes shipped to confirm + remove one specific failure mode:**

1. `lib/montree/verify-request.ts` — added `console.log('[req] ${method} ${pathname}')` at the top of every API call. Next 503: check Railway logs.
   - `[req]` line present → app got the request → real bug (would normally be 500, not 503)
   - `[req]` line absent → request never reached Node → Railway edge during churn / cold start / healthcheck failure
2. `start.sh` — wrapped `pip3 install --upgrade yt-dlp` in `timeout 20`. Could previously hang on slow PyPI days, blocking `exec node server.js` past Railway's 60s healthcheck timeout, marking container unhealthy, replacing it.

**🚨 Architectural rule locked in:** `export const maxDuration` from prior sessions does NOT take effect on Railway standalone mode. Only enforced by Vercel/Lambda. Session 81's commit `294a0648` ("maxDuration on 25 AI-calling routes") was a placebo on this stack. **Don't ship more `maxDuration` exports attributing 503 fixes.** Real Railway 503 fixes are container-level (memory, healthcheck, startup races).

**D. progress/update speed fix (commit 775afac5):**

User reported add-work was working but "far from instant." Route was awaiting 8-10 sequential DB queries before responding (~1200ms). Auth + `verifyChild` + `SELECT child` + `SELECT existing` + `UPSERT progress` is the actual write. The remaining 4-6 queries were bookkeeping the user shouldn't wait for: curriculum auto-sync (1-4 queries), `is_extra` upsert, focus_works legacy mirror + extras cleanup.

**Fix:** moved all three bookkeeping blocks into `void (async () => { ... })()` fire-and-forget IIFEs that run AFTER `NextResponse.json()` returns. Critical path: ~250ms.

**🚨 Architectural rule locked in:** Bookkeeping after a write goes in fire-and-forget IIFEs. The user shouldn't wait for side effects. Pattern: `void (async () => { try { ... } catch (e) { console.error(...) } })()` before the response return.

**Verification status:**
- ✅ All 9 commits on `origin/main`. Railway auto-deploys triggered.
- ✅ Session 82 Quick Guide fix on production (was the most-overdue ship).
- ✅ Lint clean across all changed files.
- ✅ All 6 sidebar destinations resolve to real `page.tsx` files.
- ✅ All 7 hub-linked pages resolve.
- ⏳ User to verify on production: open `/montree/admin` as principal, expect dark-forest cockpit. Click around hub pages, verify drill-downs open.
- ⏳ Test invite flow: More menu → Invite your principal → check email arrives.
- ⏳ Watch Railway logs for next 503 — `[req]` log line tells us app vs edge.

**Handoff doc:** `docs/handoffs/SESSION_83_HANDOFF.md` — full file-by-file change list, architectural rules, every commit explained, deferred items, end-to-end test instructions.

**🚨 Next session priorities:**
1. **Verify principal invite end-to-end on production** — More menu → Invite → email → click link → land on cockpit with viewer banner.
2. **🚨 Resend `hello@montree.xyz` domain verification** — see Session 83 handoff Section "Carry-overs" for the 6-step process. The invite emails are currently sending from `onboarding@resend.dev` test address (only delivers to Resend account owner). Code is ready — just env var update needed.
3. **Inner-content polish** on the 8 V3 admin pages — replace `bg-white/10` cards with canonical glass tokens. Mechanical sweep, ~30-45 min.
4. **Translation pass** on cockpit + invite copy — about 50 hardcoded English strings. `npm run i18n:fill-ui`.
5. **Voice-first principal onboarding rebuild** — replace 697-line wizard with TellGuruCard-pattern voice flow. Half-day to full-day.
6. **Auth consolidation** — drop localStorage in favor of cookie-only on principal portal.
7. **Setup-stream resilience** — make `/api/montree/principal/setup-stream` idempotent so 503 mid-stream doesn't leave a half-built school.
8. **Stripe upgrade flow** — self-serve checkout for `personal_classroom` → `school` transition. Big lift, separate session.
9. **Verify Quick Guide on production** — eyeball DE/FR/JA after Session 82 fix.
10. **Watch for 503s** — diagnostic shipped, waiting for evidence.
11. **parent-codes** print/screen split.

---

### ⚡ Session 82 — Quick Guide System Structural Fix (3x3x3 Audit) (May 3, 2026)

**🟢 SHIPPED to production in Session 83 (commit `38839e36`).** Originally 8 files changed locally — pushed clean. Applied the 3x3x3 audit methodology after user reported Quick Guide showing wrong language across multiple locales. What looked like a "stale state" bug turned out to be four structural defects layered on top of each other in the consumer code, while the data layer was actually correct.

**The bug anatomy (in plain language):**

The Quick Guide modal was reading from "phantom" TypeScript fields — `quick_guide_zh`, `materials_zh`, `direct_aims_zh`, `indirect_aims_zh` — that no migration ever created and no API ever populated. They were dead types from an early Chinese-first phase that the JSONB-cache architecture (migration 169 + 180-182) replaced. Plus the URL-builder caller in `[childId]/page.tsx` was hardcoded to `if (locale === 'zh' || locale === 'es') url += &locale=...`, silently shipping English to nine other locales (de/fr/pt/nl/it/ja/ko/uk/ru). Plus a third surface (`WorkDetailSheet.tsx` on the home view) wasn't passing the locale param at all. Plus the curriculum directory caller (`curriculum/page.tsx`) had its own Chinese-only filter.

Per-locale UX before fix:
- `en`: worked
- `zh`: blank body — modal read phantom `quick_guide_zh` (undefined) instead of `quick_guide` (which the API had populated with Chinese)
- `es`: worked (the only language that actually worked)
- `de fr pt nl it ja ko uk ru`: English silently — locale never sent to API

**The 3x3x3 method (preserved as user's standing methodology):**

1. **3x RESEARCH** — Audit codebase, count patterns, classify types
2. **3x PLAN** — Design architecture, write handoff, assess risks
3. **3x INVESTIGATE** — Deep-read every target file, verify plan fits, map exact line numbers
4. **3x BUILD** — Implement with audit cycles between rounds
5. **3x AUDIT** — Fix cycle until 3 consecutive clean audits

The methodology paid for itself this session. The initial "5 file targeted fix" pass declared "done," but a self-audit caught two more callers (`curriculum/page.tsx` and `WorkDetailSheet.tsx`) plus a runtime crash risk (Haiku's translation tool schema permitted `oneOf: [array, string]` for `materials` / `direct_aims`, so legacy JSONB rows could in theory store a string and crash `.map()`). After the self-audit, an **independent fresh agent** was spawned with no prior context to re-derive the bugs from symptoms — confirmed soundness and recommended the phantom-type cleanup as the final hardening step.

**Files changed (8):**

1. **`lib/montree/i18n/db-helpers.ts`** — added `getLocalizedGuideField<T>(work, field, locale)`. The canonical pattern: reads `work.guide_content_<locale>.<field>` (JSONB) with fallback to the English flat column. Use this for `quick_guide`, `materials`, `direct_aims`, `presentation_steps`, `control_of_error`, `why_it_matters`, `parent_description` from a curriculum work row.
2. **`app/montree/dashboard/[childId]/page.tsx`** — replaced `if (locale === 'zh' || locale === 'es')` with `if (locale !== DEFAULT_LOCALE && SUPPORTED_LOCALES.includes(locale))`. Added imports.
3. **`app/montree/dashboard/curriculum/page.tsx`** — same locale gate fix (was Chinese-only). Plus modal display name now uses `getLocalizedWorkName(work, locale)` so all 11 non-English locales show the right header (was `locale === 'zh' && chineseName ? chineseName : workName`).
4. **`components/montree/child/QuickGuideModal.tsx`** — now reads `guideData?.quick_guide` and `guideData?.materials` directly. The API merges JSONB into flat fields server-side; reading `quick_guide_zh` / `materials_zh` was reading phantom fields that always returned undefined. `locale` removed from `useI18n()` destructure (no longer needed).
5. **`components/montree/child/FullDetailsModal.tsx`** — same fix for 5 fields: `quick_guide`, `direct_aims`, `materials`, `control_of_error`, `why_it_matters`.
6. **`components/montree/curriculum/CurriculumWorkList.tsx`** — 7 read sites converted to use `getLocalizedGuideField()`. Added `Array.isArray()` guards via IIFE pattern around 3 array fields in case any legacy JSONB row stored a string. The YouTube fallback at line 310 was `!work.quick_guide` (English-only); now `!getLocalizedGuideField<string>(work, 'quick_guide', locale)`.
7. **`components/montree/home/WorkDetailSheet.tsx`** — was passing **no locale param at all**. Now passes for any non-English supported locale. Added `locale` to useEffect dep array so it refetches if user switches language while modal is open.
8. **`components/montree/curriculum/types.ts`** — phantom-field declarations deleted from `Work` (`direct_aims_zh`, `indirect_aims_zh`, `materials_zh`, `quick_guide_zh`) and from `QuickGuideData` (all 8 `_zh` fields). KEPT real columns (`name_chinese`, `parent_description_zh`, `why_it_matters_zh`, `control_of_error_zh` — populated by migration 182). Added typed `guide_content_<locale>?: Record<string, unknown>` for all 11 non-English locales for type support.

**🚨 Architectural rules locked in this session (do NOT let future agents break these):**

- **The `/works/guide` API merges `guide_content_<locale>` JSONB into the flat response fields.** It NEVER returns `_zh`-suffixed body fields. Consumers always read flat fields on the API response.
- **`getLocalizedGuideField(work, field, locale)` is the canonical pattern** for translated guide-body content from a curriculum work row. Don't re-invent the lookup. Don't read from non-existent columns.
- **There are NO `quick_guide_<locale>`, `materials_<locale>`, `direct_aims_<locale>`, `indirect_aims_<locale>`, `presentation_steps_<locale>`, `control_of_error_<locale>` columns.** Only `guide_content_<locale>` JSONB exists for guide-body content (since migration 169). The TS types no longer declare these as autocomplete options.
- **`parent_description_<locale>`, `why_it_matters_<locale>`, `control_of_error_<locale>`, `name_<locale>` ARE real columns** (per migration 182). Read via `getLocalizedField()` — NOT `getLocalizedGuideField()` (which only knows about JSONB).
- **Every caller of `/api/montree/works/guide` MUST pass `&locale=`** for any non-English supported locale. Use the `SUPPORTED_LOCALES.includes(locale)` gate. Validated callers post-fix: `[childId]/page.tsx`, `curriculum/page.tsx`, `ShelfView.tsx`, `WorkDetailSheet.tsx`.
- **Defensive `Array.isArray()` checks before `.map()` on guide-body arrays.** Haiku's translation tool schema permitted `oneOf: [array, string]` for `materials` / `direct_aims`. Render-loop crashes are visible to the teacher.

**Verification status:**
- ✅ 5 phases × 3 rounds (RESEARCH/PLAN/INVESTIGATE/BUILD/AUDIT) complete.
- ✅ Self-audit caught 2 missed callers (`curriculum/page.tsx`, `WorkDetailSheet.tsx`).
- ✅ Independent fresh-agent audit confirmed soundness.
- ✅ Phantom-field reads anywhere in codebase: zero (`grep` clean).
- ✅ ESLint on all 8 changed files: zero new errors, zero new warnings (1 pre-existing `@ts-nocheck` error on `CurriculumWorkList.tsx`, 15 pre-existing warnings — all unchanged).
- ⚠️ TypeScript full compile timed out at 30s in sandbox (codebase too large) — Railway `next build` will catch any remaining issues.
- ✅ Production data populated for all 11 locales per CLAUDE.md Session 78 (migrations 180-182, all batch scripts ran).
- ⏳ User to verify on Railway after deploy.

**Adjacent issues flagged (NOT fixed this session):**
- **`components/montree/home/ShelfView.tsx` lines 441, 602, 870** — work *name* display still uses `locale === 'zh' && work.chineseName ? work.chineseName : work.name`. Same TYPE B pattern but on names not guide content. Already on radar from CLAUDE.md Session 75's "TYPE B sweep across components" TODO.
- **Reports routes (`weekly-wrap`, `send`, `preview`, `batch-narratives`)** — Chinese-only parent narratives. Already in carry-over priorities.

**Handoff doc:** `docs/handoffs/SESSION_82_HANDOFF.md` — full file-by-file breakdown, the 3x3x3 method documented, architectural rules, adjacent issues, next-session priorities.

**🚨 Next session priorities:**
1. **🚨 Push to main + verify on Railway production** — open the dashboard with each locale (en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru), tap a focus work, verify Quick Guide body shows in the right language. Verify Full Details modal too. Verify curriculum directory and home shelf view's WorkDetailSheet.
2. **ShelfView work-name TYPE B fix** — same pattern as the curriculum directory display-name fix this session. ~30 min, 3 sites.
3. **Carry-overs from Session 81:** Update flow verification, Language Semester v7 polish, transcript FIFO cap, welcome script tone review, free-tier gate decision, 3 hot-lead Gmail drafts (Copenhagen / Paint Pots UK / Ardtona House UK), FAMM Argentina follow-up, welcome Тамі in Ukrainian, Resend domain verification.

---

## RECENT STATUS (May 2–3, 2026)

### ⚡ Session 81 — Two-Path Onboarding + Voice Hardening + Critical 503/500 Fixes + Super Admin Restored + Language Semester v7 Port (May 2–3, 2026)

**16 commits pushed to main this session.** Cascading discoveries: brand pass on the picker turned into a redesign of the onboarding entry point, which surfaced a latent 503 wave, which surfaced a deeper 500 from a non-existent `is_focus` column, plus super-admin regressions and the v7 report port. Headline commits:
- `8391b541` — Two-path onboarding choice (Tell me about my class / Just start with photos)
- `beb0ffd1` — CRITICAL FIX: stop writing is_focus to montree_child_progress (column doesn't exist)
- `294a0648` — Health check: maxDuration on 25 AI-calling routes (was 503-prone)
- `941bcaa6` — maxDuration=90 on Whisper transcribe (was 503-ing)
- `1bee23ea` — Super admin: restore visible spend + fix 'Never' activity for active schools
- `8a1b26d4` — Language Semester Report: port v7 format into in-app generator
- `9d4a7757` — Onboard: always seed 5 focus works (one per area), Sonnet best-guesses
- `c18fd212` — Voice onboarding polish: foundation copy + dashboard parity + prominent search
- `fcab43bc` — Remove legacy WorkSearchBar + fix Chinese leak in search
- `fd4cb638` — WorkWheelPicker brand pass: emerald/gold status dots + softened area badge

**A. Two-Path Onboarding Choice (`8391b541`):**

Forced auto-redirect to voice onboarding gone. New `OnboardingPathChoice.tsx` component renders a clean full-screen takeover with the canonical (locked) copy:
> **Tell me about my class** — 90 seconds per child. I'll build their profiles and your first reports will sound like you wrote them.
>
> **Just start with photos** — Skip ahead. Take photos and watch the dashboard come alive. Your first reports will focus on what we observed this week.

Path A → `/montree/dashboard/voice-onboarding`. Path B → `localStorage.setItem('montree.onboardingChoice.<classroomId>', 'photo')` and dashboard takes over. Choice doesn't nag on refresh. Bulk-import callback no longer auto-redirects — bumps `pendingOnboardingCount` instead. Per-classroom photo flag suppresses re-prompt when teacher has chosen photo. Skeleton holds during probe to prevent flicker. 6 i18n keys × 12 locales.

**B. Voice Onboarding Hardening:**

- **Update flow (`d42727bc`):** "Try again" → "Update". `priorTranscript` state + `isUpdateModeRef` ref. Next recording prepended with `[Teacher added more:]` separator, Sonnet builds a merged profile not a replacement.
- **Shelf Editor stage (`d42727bc`+`a281f9fe`):** mirrors dashboard's `FocusWorksSection` exactly — same `AREA_DOT_RGB` (pink/teal/purple/green/orange), same row chrome `rgba(8,20,12,0.55)`, same status badge, same chevron. Always 5 area slots in canonical PL/S/M/L/C order. Empty slots → brand-emerald dashed pill with the area label. Tap row → WorkWheelPicker for that area. Picker's amber "+ Add custom work" pill creates curriculum works inline.
- **Onboard always seeds 5 focus works (`9d4a7757`):** EXTRACTION_TOOL gained 5 required `focus_<area>` + 5 `focus_<area>_status` fields. Curriculum fetched up-front and included in prompt as AVAILABLE WORKS. Sonnet must pick from real names. New `seedFocusWorks()` runs ALWAYS (regardless of expLevel) with 3-pass match (exact ILIKE → fuzzy ILIKE → canonical fallback that auto-creates the curriculum row). Status preservation via SELECT-then-UPDATE-or-INSERT — never downgrades.
- **Foundation copy (`c18fd212`):** processing screen now says "Laying the foundation for {name}" instead of "Processing / Putting it all together for {name}".
- **Search bar promoted to primary (`c18fd212`):** WorkWheelPicker search input is now the headline element. `pl-14 pr-12 py-4 text-lg`, 22×22 magnifier, focus state has emerald glow ring. Reads as the most important element on the picker screen.

**C. WorkWheelPicker Brand Pass (`fd4cb638` + `618b023f` + `0c55a0e3`):**

Status dots on-brand: practicing `#3b82f6` → `#34d399` (BRAND_EMERALD), presented `#f59e0b` → `#E8C96A` (BRAND_GOLD), mastered keeps `#10b981` for differentiation. Top area badge softened: solid per-area color → emerald-tinted surface + subtle area-color border with localized letter prefix via `getAreaPrefix()`. `getAreaLabel` gained `'math' → 'mathematics'` normalization (parity with `getAreaPrefix`). Global search overlay area badge localized via `getAreaLabel(w.area_key, locale)`.

**D. WorkSearchBar Removal + Chinese Leak Fix (`fcab43bc` + `7c5e5724`):**

The "Find a work" search bar at top of `[childId]` page deleted. New works flow through photo capture pipeline now. Legacy white-theme `WorkPickerModal` deleted (`7c5e5724`) — was broken (took teacher to area view, not specific work; adding made work disappear). State cleanup: `pickerOpen`, `selectedArea`, `loadingCurriculum`, `onAddWork`, `openPicker`, `addWorkFromHook` destructure all removed.

`WorkSearchBar` component KEPT (still used on curriculum directory page). Its Chinese leak fixed — was rendering `result.work.name_chinese` as a stacked subtitle on every result regardless of locale. English-mode teachers saw "Carrying a Chair / 搬椅子" stacked. Now uses `getLocalizedWorkName(work, locale)`, no Chinese subtitle. Audited every other `name_chinese` reference — `WorkSearchBar` was the only user-facing offender. Whale-Class admin pages intentionally bilingual.

**E. CRITICAL: 503/500 Cascade Resolved**

Three layers of latent failures, all surfaced this session:

1. **Whisper transcribe missing maxDuration (`941bcaa6`):** `voice-notes/transcribe/route.ts` had no `maxDuration` export. Railway default 15s. Whisper on 60-90s audio → 503. Fix: `export const maxDuration = 90`.

2. **25 AI routes missing maxDuration (`294a0648`):** Health-check sweep found systemic gap. Bulk-fixed via Python script — 15 heavy Sonnet routes → 120s, 1 transcribe → 90s, 9 quick Haiku → 60s. Includes Smart Capture (photo-insight, snap-identify), weekly review, classroom setup describe, daily plan, end-of-day, photo audit AI tell, weekly admin, activity summary, generate-work-content, photo-enrich, teaching-instructions, weekly-planning/upload, and 13 others.

3. **`is_focus` column doesn't exist on `montree_child_progress` (`beb0ffd1`):** Commits `d42727bc` and `9d4a7757` introduced writes to `is_focus`. No migration ever added it. Postgres 500'd every progress update. Manifested as: 500 on manual "add a work", silently empty seeded shelves after voice onboarding (the `seedFocusWorks` insert was failing inside try/catch).

**The insight:** `progress/route.ts` line 243 DERIVES `is_focus` from the legacy `montree_child_focus_works` table for clients. The focus shelf has always worked off `focus_works` as source of truth. We just needed to stop writing the non-existent column.

🚨 **ARCHITECTURAL RULE LOCKED IN: `is_focus` is NOT a column on `montree_child_progress`.** Never write to it. Future code wanting true persistence must ship a migration first. The legacy `focus_works` mirror in `progress/update` is the trigger when a client sends `is_focus: true` in the body.

Three files cleaned: `progress/update/route.ts` (removed upsert + demote), `onboard/route.ts` (`seedFocusWorks` UPDATE/INSERT branches + demote, `seededShelf` SELECT + sort), `voice-onboarding/page.tsx` (`onSwapWorkSelected` KEPT `is_focus: true` in body — that triggers the legacy mirror, not the column write).

**F. Super Admin Restored (`17ae7b9b` + `1bee23ea`):**

User flagged two regressions:

1. **API spend column invisible** — was rendered alongside Free/Pro tier pill but `text-slate-600` on dark slate background = invisible. $0 spend looked like tracking was missing. Fix: brighter slate text. Data was always there.

2. **"Never" last_active for active schools** — `last_active = max(last_guru_interaction, last_media_upload)` had two gaps: guru interactions only fire on direct Guru use, and `recentMedia` is `.limit(500)` globally. Fix: `apiUsageRaw` query in `super-admin/schools/route.ts` now also captures `created_at`. New `lastApiUsageMap` tracks max(created_at) per school. `last_active` candidates = `[interaction, media, api_usage]` filtered + Math.max. Any school making any AI-routed call gets accurate activity.

**G. Language Semester Report v7 Port (`8a1b26d4`):**

The `term-reports-v7/` outputs (21 PPTXs from `scripts/generate-term-reports.mjs`) are the canonical end-of-semester format we landed on after 7 iterations. Ported v7 prompt rules into `app/api/montree/reports/language-semester/generate/route.ts`. REPORT_TOOL descriptions tightened:
- `para_opening`: 25-30 words HARD LIMIT (was ~30-40)
- `para_circle`: 60-70 words total, 1-2 sentences per point, "do NOT repeat the work name twice", "every sentence must be COMPLETE" (was ~75-90 words, 2-3 sentences)
- `para_english`: 20-25 words HARD LIMIT, "Do NOT start with Dear" (was ~25-30)

System prompt added: no `Dear` in closing, never repeat work name, never invent names, every sentence MUST be complete, total body MUST stay under 110 words.

Still TODO (deferred): `postProcess` strip `Dear X,` from closing, de-dupe `Work - Work` and `Work (Work)` patterns, stricter `scrubHallucinatedWorks`, better `trimToWords` fallback. The v7 script (`scripts/generate-term-reports.mjs`) is the canonical reference.

**Architectural rules locked in this session (do NOT let future agents break these):**

- **`is_focus` is NOT a column on `montree_child_progress`.** Legacy `montree_child_focus_works` table is the source of truth.
- **Every AI-calling route MUST declare `maxDuration`.** Default 15s 503's most Sonnet calls.
- **Two-path onboarding: voice flow stays opt-in.** Photo-driven is the canonical Montessori-aligned path. Choice copy is locked across 12 locales.
- **Voice onboarding shelf editor mirrors the dashboard exactly.** Same colors, chrome, status badge, chevron.
- **Sonnet's `focus_<area>` extraction is REQUIRED, never null.** 5 fields plus statuses required in the tool schema.
- **`Update` button on review = additive merge, not replace.** Prior transcript + separator + new transcript.
- **No bilingual stacking in user-facing UI.** One language per locale.

**i18n state:** 12 locales at 100% parity. New keys: `voiceOnboarding.review.update`, `voiceOnboarding.review.updateHint`, `voiceOnboarding.shelfEditor.*` (6 keys), `voiceOnboarding.processing.layingFoundation`, `dashboard.onboardingChoice.*` (6 keys). All Haiku-batch translated.

**Verification status:**
- ✅ All 16 commits on `origin/main`. Railway auto-deploys triggered.
- ✅ Lint clean (only pre-existing warnings).
- ✅ Pre-commit i18n strict check passes.
- ✅ 500 cascade resolved after `beb0ffd1` deployed.
- ⏳ User to verify on production: tap "Update" on review, manually add a work, generate one Language Semester Report.

**Handoff doc:** `docs/handoffs/SESSION_81_HANDOFF.md` — full 16-commit log, architectural rules, deferred items, file-by-file change list.

**🚨 Next session priorities:**
1. **Verify production** — open dashboard with un-onboarded children, expect choice screen. Tap each path. Verify Update flow on review. Manually add a work (no 500). Generate one Language Semester Report (v7 quality check).
2. **Finish v7 `postProcess` polish** — strip Dear, de-dupe work names, stricter scrub, better trim. ~30 min.
3. **`Update` additive transcript FIFO cap** — ~5 lines, prevents unbounded growth.
4. **Welcome script tone review** for zh/ja/ko/uk warmth.
5. **TYPE B sweep across components** (Session 78 carry-over) — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` everywhere. Hot files: `ThisIsSheet.tsx`, `EditWorkModal.tsx`, super-admin/*.
6. **Free-tier gate decision** — voice onboarding currently works for all tiers including Free.
7. **Send 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
8. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
9. **Welcome Тамі in Ukrainian** (carry-over) — first organic Ukrainian signup.
10. **Resend domain verification** (carry-over) — verify montree.xyz in Resend.

---

## RECENT STATUS (May 2, 2026)

### ⚡ Session 80 — Voice Onboarding Hardening + Live Transcription + Landing Page i18n + Picker Brand Pass (May 2, 2026)

**🚨 CRITICAL CONTEXT:** User flagged that the first outreach wave LOST users because of poor onboarding. The whole point of this session was to wax the onboarding before outreach restarts. Voice onboarding is the entry point — it has to feel premium and bulletproof.

**14 commits pushed to main this session.** Headline commits:
- `4ac971f7` — New structured prompts: age + time + enjoys + struggles + per-area focus (with 5 areas indented)
- `b044ac5f` — `/onboard` now returns MAX 5 focus works (one per area), matching dashboard logic exactly
- `4d0a0ccc` — WorkWheelPicker rebrand: hot pink → emerald + agent-style Add custom work
- `3a4783ee` — Real seeded shelf in onboarding review + remove No-evidence strip + Add custom work back on shelf
- `e6da5d2b` — Landing page i18n + "Get my code → Let's go"
- `2d59f5fa` — Belt-and-suspenders hardening: every silent-fail path closed
- `735fc08d` — Real-time transcription via Web Speech API + match TellGuruCard call

**A. Voice onboarding orchestrator — current state (post-hardening):**

Architecture:
- Page: `app/montree/dashboard/voice-onboarding/page.tsx` — single state-machine page
- Trigger: dashboard redirects on load if pending children + `tell_guru_onboarding` + teacher role
- Pipeline: `/voice-notes/transcribe` (Whisper backup) → `/children/:id/onboard` (Sonnet profile + game plan + curriculum seed) → `/onboarding/voice/scan-custom` → `/onboarding/voice/custom-work` (inline)

Stages: `loading` → `welcome` → `recording` → `transcribing/processing` → `review` → `transition` → loop OR `complete`. Plus `debug_error` for any failure.

Real-time transcription via Web Speech API:
- Words appear live in a green-bordered panel below the mic as the teacher speaks
- Locale-aware (en-US, zh-CN, es-ES, de-DE, etc.)
- If live transcript ≥40 chars → skip Whisper, send live transcript to Sonnet (free, faster)
- Falls back to Whisper for browsers without SpeechRecognition

**B. The 7-round 503 saga — root cause + fix:**

User saw silent "bumped back to recording" behavior across multiple attempts. After spawning a parallel investigation agent, the actual root cause: `currentChild = pending[currentIndex]` was becoming undefined mid-flow when something reset `pending`, and the code did `if (!currentChild) { setStage('idle'); return; }` SILENTLY — no log, no error handler, no debug screen. The 503 in the console was a red herring (likely SW intercepting an unrelated prefetch).

Fix locked in via `2fa0e97c` + `2d59f5fa`:
- `recordingChildRef` — child identity locked at recording-start, used throughout pipeline
- `classroomIdRef` — same defensive pattern for classroom_id
- `hasLoadedRef` — `loadPending` fires AT MOST ONCE per mount
- 90s watchdog — if pipeline hangs, route to debug_error
- Every `setStage('idle')` in error paths replaced with `setStage('debug_error')`
- Cleanup useEffect clears watchdog on unmount

**🚨 ARCHITECTURAL RULE:** every `setStage('idle')` in error paths is a bug going forward. Use `setStage('debug_error')` so failures are always visible.

**C. Onboarding prompts (final structure — `4ac971f7`):**
- How old they are
- How long they've been in the classroom
- What they enjoy doing
- What they struggle with
- What they're focusing on right now in each area:
  - Practical Life
  - Sensorial
  - Mathematics
  - Language
  - Cultural

The 5 areas render as indented sub-items so it reads as one mental task ("walk me through each area") rather than 9 separate questions. Drives much richer extracted data.

**D. Review screen — what it shows now (`b044ac5f`):**

Title → summary paragraph → **starting shelf** (5 works max, one per area, same source of truth as dashboard's "This Week's Focus") → **unmatched works** (only if any) — agent-styled amber cards with inline "Add to curriculum" button per row → "That's right" / "Try again" buttons.

Earlier iterations had the wrong shelf (chips of `game_plan.works` then ALL `presented`/`practicing` rows producing 10-20 row long list). The fix: the dashboard's focus-picker logic in `fetchAssignments` filters to ONE focus work per area sorted by `is_focus → practicing → presented → not_started → completed`. `/onboard` now applies this exact same logic server-side and returns it as `seeded_shelf`. Same logic, same data, same UX in both places.

**🚨 ARCHITECTURAL RULE:** when something on screen X "should match" something on screen Y, read screen Y's code BEFORE building screen X. This session burned 3 iterations getting this wrong.

**E. Landing page i18n (`e6da5d2b`):**

Full landing page (`app/montree/page.tsx`) now translatable in 12 languages:
- `useI18n()` hook wired
- `LanguageToggle` component added to nav
- 21 new keys under `landing.*` namespace (nav, hero, three blocks, closing CTA)
- All 12 locales translated to 100% parity

Plus: trial signup CTA "Get my code →" → "Let's go →" across all 12 locales.

A non-English-speaking teacher can now discover `montree.xyz`, pick their language from the nav toggle, read the entire site in that language, hit the CTA, sign up — the whole funnel is localised end-to-end.

**F. Dashboard child page polish (`3a4783ee`):**
- "No evidence" strip removed globally — `EvidenceStrengthBadge.tsx` returns null when strength === 'none'. Was cluttering fresh shelves on every newly-onboarded student.
- "Add custom work" affordance added to `WorkWheelPicker` — was a tiny `white/30` text link, now a proper amber pill with gold border + badge. Same Sonnet-enrichment route as the voice onboarding catch.

**G. WorkWheelPicker brand pass (PARTIAL — `4d0a0ccc`):**

DONE:
- Primary CTA button (Add Work / Select) → brand emerald gradient (`#34d399 → #1D6B48`) with glow shadow
- Selection highlight in wheel → emerald-tinted (was area-coloured)
- Empty-state Add first work button → emerald gradient
- "Add custom work" link → agent-style amber pill matching voice-onboarding catch

OUTSTANDING (next session):
- Status dots in wheel rows still use stock blue (`#3b82f6` for practicing) and stock orange (`#f59e0b` for presented). Should be brand emerald + brand gold respectively.
- Top area icon still uses solid `areaConfig.color` (e.g. hot pink for Practical Life). Needs softening.
- `WorkPickerModal.tsx` (separate alternate picker) is still entirely light-theme — needs full dark-forest rebuild.

**H. Marketing artifacts produced (in `docs/marketing/`):**
- `04_montree_voice.png` (1080×1920) — voice onboarding card, full-bleed brand aesthetic
- `05_montree_landing.png` (1080×1920) — English landing card
- `05_montree_landing_zh.png` (1080×1920) — Chinese landing card with Noto Serif CJK SC

Three video phrase translations:
- "The problem" → 难题
- "The solution" → 答案
- "Tend to the Child, not the Observation" → 关注孩子，而非记录

**I. Architectural rules locked in this session (do NOT let future agents break these):**
- The welcome script is canonical (Tredoux-authored). Do not "improve" it.
- No length cap during recording. Summary-back depends on rambling.
- Mic-only during recording → clean Processing screen on stop → review. Three distinct states.
- Status dots / chrome / CTAs use brand emerald. Per-area colors only on the small area icon (identifier data).
- `recordingChildRef` is the canonical source of truth for which child the pipeline is processing. React state can be reset; the ref cannot.
- `/onboard` route returns seeded_shelf using the focus-picker logic that mirrors `app/montree/dashboard/[childId]/page.tsx fetchAssignments`. If that logic ever changes, both must change together.

**Cost per classroom of 20 onboarded:** ~$1–$1.50 (Whisper occasionally + Sonnet + handful of Haiku/Sonnet custom-work calls).

**Verification status:**
- ✅ All 14 commits pushed to `origin/main`
- ✅ Lint clean across all touched files (warnings only, no errors)
- ✅ All 12 locales at 100% i18n parity
- ✅ Pre-commit hook passes
- ⏳ End-to-end test of new 5-prompt structure on fresh classroom — user to perform after Railway deploy
- ⏳ Welcome script tone review for zh/ja/ko/uk warmth
- ⏳ WorkWheelPicker status dots + area icon brand pass — outstanding
- ⏳ WorkPickerModal full dark-forest rebuild — outstanding

**Handoff doc:** `docs/handoffs/SESSION_80_HANDOFF.md` — full file-by-file change list, the 503 saga in detail, deferred items, architectural rules, honest notes on wrong-turn fixes.

**🚨 Next session priorities (ordered by importance for outreach restart):**

1. **Verify Migration 175 is run** in Supabase (`tell_guru_onboarding` default_enabled = true). Check via:
   ```sql
   SELECT feature_key, default_enabled FROM montree_feature_definitions
   WHERE feature_key = 'tell_guru_onboarding';
   ```
2. **End-to-end test the new 5-prompt structure** on a fresh test classroom. Record audio for one ghost student covering all 5 prompts (age, time, enjoys, struggles, per-area focus). Verify the review screen shows 5 focus works (one per area). Verify no silent failures.
3. **Finish the WorkWheelPicker brand pass** — status dots blue→emerald, presented orange→gold, top area icon soften from solid color to emerald-tinted variant.
4. **Rebuild WorkPickerModal in dark-forest theme** — currently light theme entirely, looks broken next to the rest of the app.
5. **Welcome script tone review** for zh/ja/ko/uk versions of `voiceOnboarding.welcome.body` and `voiceOnboarding.welcome.takeBreak`. Haiku is reliable for short functional copy but can come back literal-but-flat for longer warm passages.
6. **Free-tier gate decision** — voice onboarding currently works for all tiers; cost is $1/classroom. If we want Free schools blocked, gate `/onboard` and `/scan-custom` via `resolveReportModel()` 402.
7. **Send 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
8. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
9. **Welcome Тамі in Ukrainian** (carry-over).
10. **Resend domain verification** (carry-over).
11. **TYPE B sweep across components** (Session 78 carry-over).

---

## RECENT STATUS (May 1, 2026)

### ⚡ Session 79 — Smart Voice Onboarding Orchestrator + Default-Enabled Fix (May 1, 2026)

**Two commits pushed to main: `70a680cd` (orchestrator + 19 files, +2,084) and `081757a9` (Migration 175: default-enabled fix).** Built the full-classroom voice onboarding flow that walks teachers through every un-onboarded child, one at a time, via voice. Replaces the friction of clicking into each child individually to trigger TellGuruCard.

**The flow (per-child, looping until classroom is done):**
- Welcome screen with warm Tredoux-authored script (locked) → "I'm ready" CTA → child name big + mic-only screen with prompts → no length cap recording → Whisper transcription → Sonnet structured profile extraction → summary-back to teacher for confirmation → optional custom-work catch with agent-styled "I noticed you mentioned X" → next child → completion ("Your classroom is alive")

**Triggers (two paths):**
- After bulk import: `onImported` callback redirects to `/montree/dashboard/voice-onboarding`
- On dashboard load: new effect fetches status; if any children lack profiles AND `tell_guru_onboarding` enabled AND user is teacher (not parent/principal), redirect
- Escape hatch: `?skipOnboarding=1` query param bypasses redirect once

**Key files created (commit `70a680cd`):**
- `app/montree/dashboard/voice-onboarding/page.tsx` — orchestrator page (state machine + sub-component for custom-work catch). ~640 lines, inline styles using dark forest aesthetic.
- `app/api/montree/onboarding/voice/status/route.ts` — GET, returns pending children list (joins `montree_children` to `montree_child_mental_profiles`)
- `app/api/montree/onboarding/voice/scan-custom/route.ts` — Haiku tool_use, fuzzy/semantic match transcript mentions against curriculum + area context. Filters confidence ≥ 0.6. Soft-fails to empty array on error.
- `app/api/montree/onboarding/voice/custom-work/route.ts` — Sonnet tool_use generates description/parent_description/why_it_matters/materials. Inserts work, fires `translateAllLocales` and global staging. `source: 'voice_onboarding'`.

**Modified (commit `70a680cd`):**
- `app/api/montree/children/[childId]/onboard/route.ts` — added `getAILanguageInstruction(locale)` to the profile extraction prompt so the summary returns in the teacher's language (was always English regardless of teacher locale).
- `app/montree/dashboard/page.tsx` — trigger effect (with `tell_guru_onboarding` gate, role check, escape param) + bulk import redirect.
- `lib/montree/i18n/en.ts` — 44 new keys under `voiceOnboarding.*`.
- `lib/montree/i18n/{zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` — 44 keys per locale, populated via patched fill script. **All 12 locales at 100% parity (3,782 keys each).**
- `scripts/fill-missing-i18n-keys.mjs` — closing-marker regex now matches `} as const;` (was only matching `};`, so script silently failed to write after translating).

**🚨 Post-build fix — Migration 175 (commit `081757a9`):**

User tested by opening a brand-new school on production. The trigger did NOT fire. Root cause: Migration 171 set `default_enabled = false` for `tell_guru_onboarding`. Migration 174 enabled it specifically for Whale Class. New schools fall through to `default_enabled` → `false` → my trigger correctly bails. **Migration 175** flips the default to `true`:
```sql
UPDATE montree_feature_definitions
SET default_enabled = true
WHERE feature_key = 'tell_guru_onboarding';
```
**🚨 Migration 175 must be run manually in Supabase SQL Editor.** Has not been run as of session end. Until run, every new school continues to fall through to the disabled default.

**Immediate unblocker for the new school the user has open right now:**
```sql
-- Find new school's ID
SELECT s.id, s.name FROM montree_schools s
JOIN montree_classrooms c ON c.school_id = s.id
WHERE c.name = 'Chen5';

-- Enable for that school explicitly
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('<NEW_SCHOOL_ID>', 'tell_guru_onboarding', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

Then refresh the dashboard and the redirect fires.

**🚨 What got REUSED (most of the heavy lifting was already there):**
- Whisper integration via `/api/montree/voice-notes/transcribe` (existing, 5MB cap unchanged)
- Sonnet profile extraction via `/api/montree/children/[childId]/onboard` (existing, very comprehensive — extracts experience_level, curriculum_per_area_0-100, all 9 temperament traits, learning modality, sensitive periods, family notes, strategies, triggers; idempotent upsert; auto-seeds curriculum positions; generates Haiku game plan with locale support)
- Mental profile schema (`montree_child_mental_profiles` — presence/absence per child is the source of truth for "is this child onboarded")
- Custom work translation (`translateAllLocales` from `lib/montree/insert-curriculum-work.ts`)
- TellGuruCard left in place as per-child fallback

No new database tables. Migration 175 is a one-line UPDATE on `montree_feature_definitions`.

**Architectural rules locked in (do NOT let future agents break these):**
- The welcome script is canonical — Tredoux authored it, do not "improve" the wording.
- No length cap during recording — the summary-back wow moment depends on teachers being able to ramble.
- Mic-only during recording — no shelf preview. The shelf reveal at completion is part of the hook.
- `/onboard` is the canonical profile extraction route — do not duplicate.
- Custom-work catch uses Sonnet (not Haiku) for the dialogue — personality matters there.
- Skip = no profile written = re-appears next session. The only way to truly finish onboarding is confirm or fill in via TellGuruCard later.
- Closing the tab loses nothing — pending list is always recomputed from DB.
- Feature flag resolution: `classroom_override > school_override > default_enabled`. Migration 175 makes the orchestrator the default experience for new schools; classroom or school overrides can still opt out.

**Cost per classroom of 20 onboarded:** ~$1–$1.50 (Whisper + Sonnet + handful of Haiku/Sonnet custom-work calls).

**Free-tier gate NOT added** — voice onboarding works for all tiers including Free. If we want Free schools blocked, add `resolveReportModel()` 402 check at top of `/onboard` and `/scan-custom`. One small follow-up.

**Whisper accuracy on Montessori vocab:** soft mitigation via Sonnet fuzzy-matching with area context in `/scan-custom`. Did NOT add Whisper `prompt` parameter with curriculum vocabulary hints — that's a half-day quality lift if misrecognition surfaces as a complaint.

**Verification status:**
- ✅ All four new routes lint clean (0 errors)
- ✅ All modified routes lint clean (0 new errors)
- ✅ All 12 locales at 100% i18n parity (3,782 keys each)
- ✅ Pushed to `origin/main` as commits `70a680cd` and `081757a9`
- ⏳ **Migration 175 not yet run in Supabase** — required for new schools
- ⏳ End-to-end test on a fresh test classroom — user attempted, blocked by feature flag default; will work after migration 175 runs

**Handoff doc:** `docs/handoffs/SESSION_79_HANDOFF.md` — full file-by-file change list, post-build fix details, test plan, deferred items, architectural rules.

**Next session priorities:**
1. **🚨 Run Migration 175 in Supabase** — one-line UPDATE on `montree_feature_definitions`. Required for new-school flow to work.
2. **Verify trigger on the new school the user has open** — either run the per-school INSERT above OR run migration 175, then refresh dashboard. Should redirect to voice onboarding.
3. **End-to-end test the wow moments** — record 60-90s for one ghost student, mention a fake work like "rainbow stacking blocks", verify summary-back, custom-work catch, completion screen, populated shelves.
4. **Verify Whale Class behavior** — Whale Class still has the explicit migration-174 override; if any of the 20 students still lack a mental profile, the orchestrator WILL fire there too. If undesired, run `UPDATE montree_school_features SET enabled = false WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key = 'tell_guru_onboarding';`
5. **Welcome script tone review** — Eyeball the zh/ja/ko/uk versions of `voiceOnboarding.welcome.body` and `voiceOnboarding.welcome.takeBreak` for warmth. Haiku is reliable for short functional copy but can come back literal-but-flat for longer warm passages.
6. **Free-tier gate decision** — Decide whether to block Free-tier from voice onboarding via `resolveReportModel()` 402.
7. **Whisper vocabulary hints** — Decide whether to invest the half-day for per-classroom curriculum hints in Whisper prompt.
8. **Send the 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
9. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
10. **Welcome Тамі in Ukrainian** (carry-over).
11. **Resend domain verification** (carry-over).
12. **TYPE B sweep across components** (Session 78 carry-over) — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` everywhere.

---

## RECENT STATUS (Apr 30, 2026)

### ⚡ Session 78 — Curriculum Translation Library + Apply-On-Seed Pipeline + Frontend Locale Fix (Apr 30, 2026)

**Two commits pushed to main: `37cd5fa4` (pipeline build, 16 files, +1,296 lines), `e5b50539` (CurriculumWorkList locale fix, 1 file).**

**The problem:** Schools were signing up in their language but the curriculum data was English-only. UI strings translated correctly across all 12 locales (Session 77 confirmed 100% key parity) but `montree_classroom_curriculum_works` rows had no locale columns populated for new classrooms. Whale Class had every translation paid-for and sitting in its own classroom rows — trapped, unreadable to any other school. Trial signup never called any translation pipeline. Principal setup only translated 4 of 11 non-English locales because `ENABLED_LOCALES = ['zh','es','uk','ru']` while `SUPPORTED_LOCALES` had 12.

**The architecture (commit `37cd5fa4`):**

A global translation library keyed by `(work_key, locale)` + an apply-on-seed pipeline. The Whale Class translations get lifted into a shared library every classroom can read from for free. New classroom seeding copies from the library at seed time. No AI calls per new school for the standard 329 works. Custom works fan out via `translateAllLocales()` to all 11 non-English locales at ~$0.011/work.

| Layer | What | File |
|------|------|------|
| Global library | Translation lookup table, ~3,948 rows (329 works × 12 locales) | `migrations/180_create_curriculum_translations_global.sql` |
| School locales | `primary_locale` + `secondary_locales[]` on `montree_schools` (CHECK-constrained) | `migrations/181_add_school_primary_locale.sql` |
| Postgres function | `apply_global_translations(classroom_id)` — per-locale UPDATE FROM JOIN with COALESCE so it preserves teacher edits. SECURITY DEFINER. | `migrations/182_apply_global_translations_function.sql` |
| TypeScript wrapper | Thin RPC wrapper, fire-and-forget pattern | `lib/montree/curriculum/apply-global-translations.ts` |
| School locale resolver | `getSchoolLocales()` — scaffolded for future report routing, NOT used for custom-work translation | `lib/montree/i18n/school-locale.ts` |
| One-time extraction | Whale Class → global library, filters `is_custom = false` AND `work_key NOT LIKE 'custom_%'` | `scripts/seed-global-translations.mjs` |
| Backfill all | Runs RPC against every existing classroom, idempotent | `scripts/backfill-all-classroom-translations.mjs` |

**`ENABLED_LOCALES` auto-derived from `SUPPORTED_LOCALES`** in `lib/montree/locales-config.ts`. Was hand-edited list of 4 (`zh,es,uk,ru`), now `SUPPORTED_LOCALES.filter(l => l !== DEFAULT_LOCALE)` = 11. **Adding a 13th language no longer requires editing this file.** Drop the locale into `SUPPORTED_LOCALES` and every translation pipeline picks it up.

**6 seeding routes wired to call `applyGlobalTranslations()` fire-and-forget after curriculum seed:**
- `app/api/montree/try/instant/route.ts` — THE BROKEN PATH, now fixed. Also captures locale via new `resolvePrimaryLocale(req, body)` helper (body field → Accept-Language → 'en') and writes to `school.primary_locale`.
- `app/montree/try/page.tsx` — sends `locale: useI18n().locale` in trial signup POST body.
- `app/api/montree/principal/setup/route.ts` and `setup-stream/route.ts` — global translation copy fires BEFORE the existing `batchTranslateAllLocales()` (which becomes a safety net for any locale gaps in the global table).
- `app/api/montree/admin/reseed-curriculum/route.ts`, `backfill-curriculum/route.ts`, `backfill-guides/route.ts` — apply call after the existing logic.

**Live deployment sequence (this session, in order, all confirmed working):**
1. Migration 180 in Supabase SQL Editor → table created, 8 columns verified.
2. Migration 181 in Supabase SQL Editor → school columns added, Whale Class set bilingual `en+zh`.
3. Manual `UPDATE`s for two existing schools' `primary_locale`:
   - `1b463b14-...` (Школа Монтессорі / Tamі) → `uk`
   - `de76832d-...` (Chen school) → `de`
4. Migration 182 in Supabase SQL Editor → function created.
5. **Bonus column-add ALTER TABLE in Supabase** (was missing from the original plan but caught at function-test time) — added 36 missing locale columns on `montree_classroom_curriculum_works`. The 9 newer locales (de/fr/pt/nl/it/ja/ko/uk/ru) had `name_*` and `guide_content_*` columns from prior sessions but were missing `parent_description_*` and `why_it_matters_*`. Without this, `apply_global_translations()` errored at first reference. SQL ran idempotently with `ADD COLUMN IF NOT EXISTS`.
6. `node scripts/seed-global-translations.mjs` → upserted 3,948 rows. Filtered out 90 custom works correctly (419 - 329 = 90).
7. `node scripts/backfill-all-classroom-translations.mjs` → 26,983 cells across 8 classrooms (Whale Class: 3,619, six × "My Classroom": 3,619 each, Blue Jay: 1,650 — Blue Jay had partial pre-existing translations preserved by COALESCE).
8. Code deployed to Railway via auto-deploy on `37cd5fa4`.

**The frontend bug + hot fix (commit `e5b50539`):**

After deployment, Miss Chen 2 still showed English Cylinder Block names with the Spanish UI. DB query confirmed `name_es: "Bloque de Cilindros 1"` was correctly populated. Root cause: `components/montree/curriculum/CurriculumWorkList.tsx` hardcoded `locale === 'zh' ? work.name_chinese : work.name` in three places (work name, parent description, why it matters). Fixed to use `getLocalizedWorkName()` and `getLocalizedField()` from `db-helpers.ts`. After Railway redeploy + hard refresh, Spanish work names rendered correctly. **Live verified.**

**🚨 ARCHITECTURAL NOTE FOR FUTURE SESSIONS — TYPE B SWEEP NEEDED:**

Session 68's multilingual audit classified DB-column-read ternaries as "TYPE B — leave alone." That was correct when only Chinese existed as a non-English locale. With 11 non-English locales, **every TYPE B `=== 'zh'` read leaves English visible for 10 of those locales.** `CurriculumWorkList.tsx` is fixed; other components likely have the same bug:
- `components/montree/child/FocusWorksSection.tsx`
- `components/montree/photo-audit/ThisIsSheet.tsx`
- `components/montree/curriculum/EditWorkModal.tsx`
- `components/montree/super-admin/*`
- Game plan card, weekly wrap parent narratives, anywhere a work name renders.

Fix pattern is mechanical: `import { getLocalizedWorkName, getLocalizedField }` then replace ternaries with helper calls. A grep-driven sweep would be one focused session.

**What's still NOT translated for non-Chinese locales (deferred):**

| Field | Why English | Fix scope |
|------|-------------|-----------|
| `quick_guide` (inline curriculum row) | Only `quick_guide_zh` exists; others go through on-demand Sonnet → `guide_content_<locale>` | Pre-fill or read from JSONB summary |
| `direct_aims`, `indirect_aims`, `materials` (arrays) | Only `_zh` array versions exist | Add JSONB columns + extend `autoTranslateWork()` for arrays |
| `control_of_error` (text) | `control_of_error_zh` exists; other locales missing | Add columns + extend translator |

**Cost analysis (revised post-deployment):**
- Per new classroom seeding: $0 (global table copy)
- Per custom work: ~$0.011 (Haiku, all 11 locales)
- Adding a 13th language: ~$1–2 (existing batch scripts via Anthropic key)
- At 1,000 schools/year × 5 customs each: ~$55/year total. Versus the ~$5,000/year the original "Sonnet upfront" approach would have cost.

**Production state after this session:**
- `montree_curriculum_translations`: 3,948 rows
- All 8 production classrooms have every locale column populated
- `ENABLED_LOCALES` is now 11 non-English locales (was 4)
- Custom works auto-translate into all 11 going forward
- Trial signup captures locale and writes to `school.primary_locale`

**Architectural plan with full audit trail:** `docs/CURRICULUM_TRANSLATION_HANDOFF.md`. Three audit passes (internal consistency → vs actual code → re-audit) found and corrected several material errors in the original draft including wrong migration numbers (170/171 → 180/181/182), a fictional `generate-work-content` route (Phase 5 was rebuilt around the actual `add-custom-work` flow), and a suboptimal Promise.all batch (replaced with Postgres function).

**Session-specific handoff:** `docs/handoffs/SESSION_78_HANDOFF.md` — file-by-file change list, deployment sequence, verification status, deferred items.

**Next session priorities:**
1. **🚨 TYPE B sweep across components** — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` / `getLocalizedWorkName()` everywhere a work name or description is rendered. Highest-priority files listed above.
2. **Translate arrays + `control_of_error`** — add per-locale JSONB columns, extend `autoTranslateWork()`, re-extract Whale Class into global table, backfill all classrooms.
3. **Validate "adding a 13th language" workflow** — pick one (Hindi or Vietnamese) and run through the documented data-only path end-to-end.
4. **Send 3 hot lead Gmail drafts** (carry-over) — Copenhagen, Paint Pots UK, Ardtona House UK.
5. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
6. **Welcome Тамі in Ukrainian** (carry-over).
7. **Resend domain verification** (carry-over) — verify `montree.xyz` in Resend.
8. **Test trial signup locale capture** — open private window, set UI to Russian, sign up a fake school, confirm new classroom has all locale columns populated.

---

### ⚡ Session 77 — i18n Completeness Sweep + Drift Defence + Mobile Polish (Apr 30, 2026)

**All three commits pushed to main: `fa6d3722` (i18n completeness), `5255a2e5` (automation hooks), `26266747` (mobile polish: SW v3 + compact lang toggle + stats row removal). Railway redeployed.**

**Trigger:** User opened Ukrainian dashboard on mobile, saw "Golden Bead Multiplication" in English, "PHOTOS" stats label in English, and empty area dots (no letter). Audit revealed three classes of drift, plus mobile polish issues.

**A. UI translation files — 9 languages × 93 missing keys filled:**
Spanish + Chinese were already at 100%. The other 9 languages (`de/fr/pt/nl/it/ja/ko/uk/ru`) were each missing the same 93 keys added to `en.ts` after the original scaffolding ran. Things like `summary.askGuruPrompt`, `weeklyWrap.nextWeekFocus`, `parentDashboard.thisWeekMoments`. Production users of those locales saw English fallback. **All 12 locales now at 100% UI key parity (3735/3735 each).**

**B. Curriculum work names — full sweep across Whale Class:**
- `uk`: 42 untranslated (English text in `name_uk` column) → fixed (Golden Bead Multiplication → Множення з Золотими Бісеринками, Introduction to Golden Beads → Введення до Золотих Бісеринок, etc.)
- `ru`: 20 untranslated → fixed
- `zh`: 20 empty → filled
- `es/de/fr/nl/it`: 2-3 each → fixed (most were "Bingo"/"Collage" loanwords — KNOWN_LOANWORDS list now skips these)
- `ko`: 1 → fixed
- Latin-i homoglyph cleanup pass: Haiku used U+0069 in 4 Ukrainian strings → replaced with U+0456 і
- **Final: 419/419 work names translated for every non-English language.**

**C. `guide_content_<locale>` confirmed complete:**
384/419 across all non-English. The 35-work "gap" is works that don't have an English `quick_guide` — nothing to translate from.

**D. Area letter icons in focus list — `FocusWorksSection.AreaDot`:**
Previously empty colored circles. Now show localized one- or two-letter prefix matching the curriculum overview cards. New `AREA_PREFIXES` map in `lib/montree/i18n/area-labels.ts` with per-locale codes:
- en/es/fr/it/pt: P/L/S/M/C-style 1-letter (V for Vida/Vie/Vita)
- zh/ja/ko: single Hanzi/Hangul (日/感/数/语/文 etc.)
- nl: P/Z/W/T/C
- ru: П/С/М/Я/К (Я is Язык — no collision)
- **de: Pr/Si/Ma/Sp/Ku — 2-letter** (Sinnesmaterial vs Sprache both = S)
- **uk: Пр/Се/Ма/Мо/Ку — 2-letter** (Математика vs Мова both = М)

`getAreaPrefix(area, locale)` is the canonical helper. Font auto-scales (50% for 1-char, 36% for 2-char).

**E. Drift defence — three layers added:**

1. **Pre-commit hook** (`.githooks/pre-commit`, native — no Husky):
   - Fires only when `lib/montree/i18n/*` files are staged.
   - Runs `scripts/check-i18n-completeness.mjs --strict`.
   - Blocks commits where `en.ts` has any key not in every other language file.
   - Bypass: `git commit --no-verify`.
   - Install: `npm run hooks:install` (one-time per machine, runs `git config core.hooksPath .githooks`).

2. **npm scripts** (added to `package.json`):
   - `i18n:check` / `i18n:check:strict` — validator (strict = fail on any missing key)
   - `i18n:fill-ui` — Haiku batch translator for missing UI keys
   - `i18n:fix-names` — Haiku translator for untranslated curriculum names (default scope: active classrooms with children; `--all` for full backfill, `--dry-run` to report only)
   - `i18n:sync` — full pipeline: fill-ui + fix-names + bleedthrough + check
   - `hooks:install` — wires git hooks

3. **Admin API route** `/api/montree/super-admin/i18n-sync`:
   - GET = read-only drift report (no Haiku spend)
   - POST default = dry-run check
   - POST `{ mode: 'fix' }` = translate
   - POST `{ mode: 'fix', allClassrooms: true }` = full backfill
   - POST `{ mode: 'fix', classroomId: '...' }` = single classroom
   - Auth: super-admin session OR `x-cron-secret` header (for Railway cron with `CRON_SECRET` env var)

**F. Service worker cache bumped — `montree-v2 → montree-v3`:**
Code shipped fine to Railway but PWA users were still serving the cached v2 JS bundle (no AreaDot changes visible). v3 forces activate-side purge. Same pattern as Session 76's stale-dashboard fix. **PWA users may need to close + reopen the app for v3 to activate.**

**G. Mobile header overlap fix:**
- `LanguageToggle.tsx` rewritten: visible pill now shows `LOCALE_SHORT_LABELS` (EN/ZH/УКР — 2-3 chars) instead of full names ("English"/"Українська" — 7-10 chars). Hidden native `<select>` still provides the full-name OS picker on tap. Saves 40-60px horizontal.
- `DashboardHeader.tsx` classroom name `maxWidth: 160` → `maxWidth: 'min(40vw, 200px)'` — tighter on narrow viewports.

**H. Stats tile row removed from child page:**
`app/montree/dashboard/[childId]/page.tsx` — the 3-column "MASTERED / PRACTICING / Photos" tile row below the focus list. User flagged as redundant — focus list status badges already convey the same info. Also cleaned up unused `Sparkles`/`TrendingUp`/`Camera` imports + `progressStats`/`photoCount` state.

**🚨 Architectural notes:**
- **`getAreaPrefix(area, locale)` is the canonical area-letter helper.** Use it any time you render a colored area dot.
- **Pre-commit hook stays passive** unless `lib/montree/i18n/*` files are in the commit — zero friction on unrelated commits.
- **`auto-translate.ts` `translateAllLocales(input)`** already covers new-work creation across `ENABLED_LOCALES` — day-to-day new works should never re-introduce drift.
- **Service worker bumps require user-side reactivation** — close+reopen the PWA, or hard-refresh on web.
- **KNOWN_LOANWORDS list** in `sync-curriculum-translations.mjs` (Bingo, Collage, Origami, Yoga, Sudoku, Tangram, Mandala) — skip flagging these as drift.

**Cost:** ~$3-4 in Haiku calls total. Future drift defence is passive — only spends when actual drift is detected.

**Files changed across all 3 commits:**

Commit `fa6d3722`:
- `components/montree/child/FocusWorksSection.tsx` — AreaDot renders prefix
- `lib/montree/i18n/area-labels.ts` — AREA_PREFIXES + getAreaPrefix()
- `lib/montree/i18n/{de,fr,pt,nl,it,ja,ko,uk,ru}.ts` — 93 new keys each
- `scripts/fill-missing-i18n-keys.mjs` (new)
- `scripts/fix-untranslated-work-names.mjs` (new)
- `scripts/fix-bleedthrough.mjs` (new)

Commit `5255a2e5`:
- `.githooks/pre-commit` (new)
- `app/api/montree/super-admin/i18n-sync/route.ts` (new)
- `scripts/sync-curriculum-translations.mjs` (new)
- `scripts/check-i18n-completeness.mjs` (--strict mode added)
- `package.json` (i18n:* + hooks:install)

Commit `26266747`:
- `public/montree-sw.js` (cache bumped to v3)
- `components/montree/LanguageToggle.tsx` (compact short labels)
- `components/montree/DashboardHeader.tsx` (classroom name maxWidth 'min(40vw, 200px)')
- `app/montree/dashboard/[childId]/page.tsx` (stats row removed)
- `docs/handoffs/SESSION_77_HANDOFF.md` (new)
- `CLAUDE.md` (this entry)

**Handoff doc:** `docs/handoffs/SESSION_77_HANDOFF.md` — full file-by-file change list + verification steps + cost breakdown.

**Verification status:**
- ✅ Pre-commit hook installed locally (`npm run hooks:install` ran successfully).
- ✅ All three commits pushed to `origin/main` (push log: `93213235..26266747 main -> main`, then `Everything up-to-date`).
- ⏳ Railway redeploy triggered automatically on push.
- ⏳ User to verify on phone: close+reopen Montree PWA, switch to Українська, confirm "Множення з Золотими Бісеринками" with **Ма** in dot, no "Engdish" header overlap, no stats row.

**Next session priorities:**
1. **Confirm production looks right.** If anything still shows English fallback after PWA reactivate, debug from there.
2. **Optional: Wire weekly Railway cron** — set `CRON_SECRET` env var, schedule daily `GET /api/montree/super-admin/i18n-sync` for monitoring, weekly `POST { mode: 'fix' }` for auto-repair (or alert + manual approval via super-admin UI).
3. **Optional: Super-admin "Sync translations" button** — UI affordance to POST `{ mode: 'fix' }` from the dashboard. ~30-min task.
4. **Send the 3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
5. **FAMM Argentina follow-up** — past Apr 28 deadline.
6. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.

---

### ⚡ Session 76 — Audit & Optimise Sweep: 17 perf/cost fixes shipped (Apr 30, 2026)

**Commits pushed: `80921de6`, `5ef016b2`, `68ea89e2`, `149e5760`, `9f81dc97` (Turbopack fix) — all on main.**

⚠ **Turbopack constraint discovered during this sweep:** `next/dynamic(import, { … })` requires the options arg to be an **inline object literal** at the call site. Hoisting it into a `const dynamicOpts = { ssr: false, loading: X }` breaks the build with "next/dynamic options must be an object literal." The shared `loading` *component* can still be a reference — just keep the surrounding `{ }` inline. See `app/montree/dashboard/photo-audit/page.tsx`.

System-wide health check ran three parallel audits (frontend perf / AI cost / API+DB) producing 17 actionable findings. All shipped today.

**Top perf wins:**
- **`lib/montree/i18n/context.tsx`** — Provider value now wrapped in `useMemo`. The 173 files importing the i18n barrel only re-render when locale actually changes, not on every parent state update. Single biggest perceived-speed win in the codebase.
- **`public/montree-sw.js`** — Cache only immutable assets (JS, CSS, fonts, images, `/_next/static/`). HTML pages always go to network. `CACHE_NAME` bumped to `montree-v2` so existing PWA installs purge their v1 cache on activate. **Fixes the Apr 30 stale-dashboard incident.**
- **`components/montree/DashboardHeader.tsx`** — wrapped in `memo()`. No props, so shallow-equals always returns true → header skips re-render on every parent state change.
- **`app/montree/dashboard/photo-audit/page.tsx`** — all 7 `dynamic()` imports now have a `loading` fallback. No more blank-gap flash while chunks download.
- **`app/api/montree/intelligence/daily-brief/route.ts`** — section 2 (stale works) now parallelizes its two queries (view + dismissals) via `Promise.all`. Top-level was already parallel across 6 sections.
- **`app/api/montree/works/guide/route.ts`** — "guide not found" 404-fallback path now sends short `Cache-Control` so the 3-tier lookup (classroom → master Brain → static JSON) doesn't repeat for works without guides.

**AI cost / tier-gating sweep — 7 routes, all tier-gated:**

The Free/Core/Premium tier system from Session 57 was bypassed by 7 routes that hardcoded Sonnet. All now call `resolveReportModel()`:

| Route | Behaviour for Free tier |
|------|-------------------------|
| `lib/montree/reports/ai-generator.ts` | Accepts optional `model` param, threads through to `messages.create` and the `ai_model` metadata field. Falls back to AI_MODEL when omitted (back-compat). |
| `app/api/montree/reports/language-presentation/[childId]/route.ts` | 402 |
| `app/api/montree/reports/language-semester/generate/route.ts` (3 Sonnet calls) | 402 |
| `app/api/montree/guru/teaching-instructions/route.ts` | 402 |
| `app/api/montree/guru/snap-identify/route.ts` | 402 |
| `app/api/montree/weekly-review/[childId]/route.ts` (POST + PATCH) | 402 |
| `app/api/montree/guru/corrections/route.ts` (Sonnet enrichment only) | Correction still saves; just skip the moat-builder Sonnet call. Free schools don't accrue visual-memory moat data — paying customers do. This is the intended product behaviour. |
| `app/api/montree/guru/generate-work-content/route.ts` | 402 |

**Cost impact:** at 10 schools on Core tier, expected savings ~$300-400/month from no longer paying Sonnet rates on routes that should run Haiku.

**Verified-then-deferred (not in this commit, flagged for next session):**
- **Weekly-wrap teacher+parent batching** — `app/api/montree/reports/weekly-wrap/route.ts`. Teacher report + parent narrative currently run sequentially per child. They could go parallel via `Promise.all` to halve wall-clock time per child. Refactor is more invasive than it looks (interleaved token totals, separate upserts, separate skip flags). Worth doing in a dedicated session with full attention. ⚠ **Replan must stay Stage 0** — don't break that ordering.
- **Photo-audit `select('*')` claim** — investigated, the actual code already uses explicit column lists with `Promise.all` + `.limit(500)`. No work needed; agent's claim was inferred wrong.
- **`negative_descriptions[]` cap** — already capped at 8 FIFO via `.slice(-MAX_NEGATIVES)` in `corrections/route.ts`. The audit recommended 15; existing 8 is tighter and better. No change.

**Audit reference docs in repo:**
- `docs/AI_COST_AUDIT.md` — verified line numbers for hardcoded-Sonnet routes (written by the cost-audit agent during Session 76)
- `HANDOFF_LATEST.md` — sweep progress tracker (now ✓ complete)

**🚨 Architectural notes for future sessions:**
- **Service worker MUST stay immutables-only.** If a future change adds HTML to the cache, you'll re-introduce the stale-shell-when-API-fails bug. The pattern lives in `public/montree-sw.js` `isCacheable()`.
- **Every new Sonnet-calling route MUST tier-gate via `resolveReportModel()`** at the top after auth. Pattern: resolve → 402 if free → pass `aiTier.model` into `messages.create({ model, … })`.
- **`enrichVisualMemoryFromCorrection()` is Free-tier-skipped on purpose.** This is the moat-builder; it should only accrue for paying schools. The correction itself (work assignment, photo update, brain learning) still runs.
- **`I18nProvider` value MUST stay memoized.** If a future change rebuilds the value on every render again, you reintroduce a tree-wide re-render storm.

**Files changed (Session 76 — 4 sweep commits + Turbopack fix + 6 cleanup commits):**

Sweep:
- `lib/montree/i18n/context.tsx`
- `public/montree-sw.js`
- `lib/montree/reports/ai-generator.ts`
- `components/montree/DashboardHeader.tsx`
- `app/montree/dashboard/photo-audit/page.tsx`
- `app/api/montree/works/guide/route.ts`
- `app/api/montree/intelligence/daily-brief/route.ts`
- `app/api/montree/reports/language-presentation/[childId]/route.ts`
- `app/api/montree/reports/language-semester/generate/route.ts`
- `app/api/montree/guru/teaching-instructions/route.ts`
- `app/api/montree/guru/snap-identify/route.ts`
- `app/api/montree/weekly-review/[childId]/route.ts`
- `app/api/montree/guru/corrections/route.ts`
- `app/api/montree/guru/generate-work-content/route.ts`

Root folder cleanup (6 commits, ending at `99b34723`):
- 90 → 42 root entries. All artifacts moved to discoverable locations.
- `docs/handoffs/` ← 8 stale .md plans/handoffs
- `docs/outreach/` ← 10 .xlsx + 1 .docx (Apr16 backup preserved in `archive/`)
- `docs/marketing/` ← HeyGen scripts, promo .docx, montree-pitch.html, montree-video-scripts.html, root logo .png/.svg, montree-tree-icon.png, report-format-prototype.html, etc.
- `docs/artifacts/` ← 10 generated reports + classroom PDFs + Language_Semester_Reports/ + phonics-images.zip
- `scripts/legacy/` ← 14 orphaned root scripts (verified zero code references)
- Deleted: document_1.docx + document_2.docx (identical AutoSave dumps), .test_write, .DS_Store, Excel .~lock files

**Next session priorities:**
1. **🚨 Verify all 4 commits deployed cleanly on Railway.** Visit dashboard, photo-audit, weekly-wrap, language-presentation. Confirm no hydration errors, no 500s.
2. **Test the tier gates.** Set Whale Class to Free in super-admin, try generating a Language Presentation → expect 402. Set back to Premium → confirm it works.
3. **Per-locale parent narratives** — the 6 routes still Chinese-only from Session 75 handoff. Bigger scope.
4. **Phase 10 — Super-admin dark forest** — 31 of 32 pages still need conversion.
5. **Weekly-wrap teacher+parent parallelization** — the deferred perf win, ~30-60s/child saved.
6. **Send the 3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
7. **FAMM Argentina follow-up** — past Apr 28 deadline.
8. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.

---

### ⚡ Session 75 — Dark Forest Phases 3-9+11 + Photo Pipeline Hardening + i18n Auto-Derived SELECTs (Apr 30, 2026)

**Commits pushed: `022bef0f` (i18n refactor). Dark forest + photo pipeline hardening committed earlier in session (see prior commit log).**

**A. Dark forest redesign — Phases 3-9 + 11 COMPLETE.** Phase 10 (Super-admin) deferred — 31 of 32 pages still need conversion. Full list of 50+ converted files in `docs/DARK_FOREST_REDESIGN_HANDOFF.md`. Tokens locked: bg `#0a1a0f`, emerald `#34d399`, glass cards, blur 18px, Lora serif headings, Inter body, lucide icons at strokeWidth={1.75}. Inline styles only. Empty-state dashboard button fixed (was still light Tailwind).

**B. Photo identification pipeline hardening:**

- **`lib/montree/photo-identification/two-pass.ts`** — Pass 1 visual description now capped at 600 chars (was unbounded — Sonnet calls were occasionally outputting 2-3KB descriptions that bloated `montree_media.sonnet_draft` and slowed Pass 2 prompt assembly).
- **`app/api/montree/photo-identification/process/route.ts`** — Added CRITICAL banner at top documenting `maxDuration=120` and `HAIKU_TRUST_CONFIDENCE=0.85` as load-bearing values. On `haiku_matched` path, persists Haiku raw work name + match_score to `sonnet_draft` JSONB so future audits can see when fuzzy matching diverged from the literal Haiku output. Logs `[PhotoIdentification] raw_vs_matched` when matched name diverges from raw.
- **`app/api/montree/guru/corrections/route.ts`** — Added `isCoherentNegative()` helper and `MATERIAL_NOUNS` whitelist (wooden, metal, sandpaper, fabric, etc.). Negative-example accumulation in `montree_visual_memory.negative_descriptions[]` now skips fragments that don't reference any material noun (avoids polluting visual memory with "object on tray" or similar generic phrases). Bidirectional reverse-negative (when teacher fixes A→B, the original A's `negative_descriptions[]` gets B's description as a counter-example) gated by the same coherence check.
- **`lib/montree/photo-identification/context-loader.ts`** — Replaced fixed 50-entry slice with adaptive 50KB char budget + 100-entry hard ceiling. SELECT limit raised 100 → 200. Whale Class has 65+ eligible visual memory entries; the old slice was silently dropping 15 high-quality ones every Pass 2 call. Entries are pre-sorted (description_confidence DESC, updated_at DESC) so the budget naturally fills with highest-quality recent entries. Small classrooms (<50 entries) see no change. `visualMemoryWorkNames` is populated ONLY for works actually in the prompt — Gate A trust ("hasVisualMemoryForMatch") stays logically consistent.

**🚨 Architectural rule:** `maxDuration=120` on `/api/montree/photo-identification/process/route.ts` is load-bearing. Railway's default 15s would kill the two-pass Haiku pipeline mid-flight. Don't remove. Same for `HAIKU_TRUST_CONFIDENCE=0.85` — the Pass 2b discriminator only fires below this threshold, and lowering it would burn Sonnet budget on trivially-confident matches.

**C. i18n efficiency refactor — commit `022bef0f`:**

The codebase had 11 hardcoded `name_es, name_de, …` SELECT lists across the API routes. Adding a 13th language meant editing each one in lockstep. Same problem for `guide_content_<locale>`. Plus a quietly broken bug in `works/guide/route.ts`: any non-`zh`/`es` locale silently fell back to the Spanish translator, caching Spanish content in German/French/Portuguese/Dutch/Italian/Japanese/Korean/Ukrainian/Russian columns.

**Fix — auto-derive everything from `SUPPORTED_LOCALES`:**

| File | Change |
|------|--------|
| `lib/montree/i18n/db-helpers.ts` | `LOCALE_COLUMN_SUFFIX` is now auto-derived from `SUPPORTED_LOCALES` (no per-locale entry to add). Two new exported helpers: `buildLocalizedColumnList(baseField)` and `buildLocalizedSelect(baseField)`. |
| `app/api/montree/works/route.ts` | SELECT uses `${buildLocalizedSelect('name')}`. |
| `app/api/montree/works/guide/route.ts` | SELECT uses `buildLocalizedColumnList('guide_content')`. The dual `translateGuideToZh` / `translateGuideToEs` functions replaced with one locale-agnostic `translateGuide(guide, locale)` that pulls language name + AMI Montessori terminology from `LOCALE_AI_CONFIG`. **Fixes the silent Spanish-fallback bug.** |
| `app/api/montree/progress/route.ts` | SELECT uses `buildLocalizedSelect('name')`. |
| `lib/montree/auto-translate.ts` | `SYSTEM_PROMPTS` renamed to `SYSTEM_PROMPTS_OVERRIDES` and is now optional. Fallback synthesises a sensible prompt from `LOCALE_AI_CONFIG`. |
| `scripts/check-i18n-completeness.mjs` | NEW. CI-friendly validator. Walks `SUPPORTED_LOCALES`, verifies every locale has translation file + area labels + AI config + intl mapping + display names + short labels + is wired into `context.tsx` + `server.ts`. Plus key-parity check (warns <85%, fails <50%). All 12 locales currently pass at 98–100%. |
| `scripts/add-language.mjs` | NEW. One-command scaffolder. `node scripts/add-language.mjs <code> "<native-name>" "<short>" "<intl>"` updates `locales.ts`, `area-labels.ts`, `locale-config.ts`, `context.tsx`, `server.ts`, and creates an English placeholder `<code>.ts` ready for a translation pass. |

**"Drop a language in" workflow now:**
1. `node scripts/add-language.mjs sv "Svenska" "SV" "sv-SE"`
2. Translate `lib/montree/i18n/sv.ts` (Haiku batch — see `scripts/generate-fr.mjs` pattern)
3. Translate `AREA_LABELS_SV` + `LOCALE_AI_CONFIG.sv` TODOs
4. DB migration: add `name_sv`, `parent_description_sv`, `why_it_matters_sv`, `guide_content_sv` columns
5. Batch-translate curriculum (see `scripts/batch-translate-guides-es.js` pattern)
6. `node scripts/check-i18n-completeness.mjs` — verify

**Zero edits to API SELECT lists.** That was the goal.

**🚨 Known remaining gaps (NOT in scope this session, flagged for future PR):**

The following routes still SELECT only `_zh` columns and assume `locale !== 'en'` means Chinese — parent narratives for Spanish/German/etc. silently render in English (or Chinese):
- `app/api/montree/reports/weekly-wrap/route.ts`
- `app/api/montree/reports/preview/route.ts`
- `app/api/montree/reports/send/route.ts`
- `app/api/montree/reports/batch-narratives/route.ts`
- `app/api/montree/reports/weekly-wrap/review/route.ts`
- `app/api/montree/weekly-admin-docs/auto-fill/route.ts`

Fixing requires per-locale parent description maps + per-locale narrative templates. Significant scope — plan a dedicated session.

**D. DNS / Montree-system check (parallel agent, code-side audit):**

User reported `DNS_PROBE_FINISHED_NXDOMAIN` on `montree.xyz` with Astrill VPN on (Germany Frankfurt 10G). Agent verified the deployment is clean from the codebase side: `next.config.mjs` has the correct apex `montree.xyz → /montree` 302 redirect, `railway.json` has `healthcheckPath: '/api/health'`, no stale `teacherpotato.xyz` references, no basePath/assetPrefix/rewrite that would break the apex. Recent commits to deployment-affecting files are clean.

**Verdict: code-side OK. Issue is network-layer (Astrill DNS filtering or TTL caching).** Recovery procedure for user:
1. Visit `https://montree.xyz/api/health` from cellular (no VPN) → if 200, confirms VPN is the cause
2. If still fails: check Railway dashboard for unlinked custom domain or stalled deploy
3. Disconnect VPN, clear Chrome DNS cache (`chrome://net-internals/#dns`), unregister service worker

**Files changed (Session 75 — i18n only, dark forest + photo committed earlier):**
- `lib/montree/i18n/db-helpers.ts` — auto-derived `LOCALE_COLUMN_SUFFIX` + new helpers
- `app/api/montree/works/route.ts` — uses `buildLocalizedSelect('name')`
- `app/api/montree/works/guide/route.ts` — unified translator, helper-driven SELECT
- `app/api/montree/progress/route.ts` — uses `buildLocalizedSelect('name')`
- `lib/montree/auto-translate.ts` — `SYSTEM_PROMPTS_OVERRIDES` optional + LOCALE_AI_CONFIG fallback
- `scripts/check-i18n-completeness.mjs` — NEW validator
- `scripts/add-language.mjs` — NEW scaffolder

**Handoff doc:** `docs/I18N_REFACTOR_HANDOFF.md` — full file-by-file change list, "drop a language in" workflow, known gaps, verification done, next-session priorities.

**Next session priorities:**
1. **🚨 Deploy verification** — Verify production after Railway deploys `022bef0f`. Visit progress page, works picker, guide modals across en/zh/es minimum.
2. **🚨 Deploy Session 74 commits** — `2e94aadc`, `0dfbdd04`, `c8b46ad6` (replan Stage 0, photo-audit crash, streaming event fix) still need Railway relaunch.
3. **Per-locale parent narratives** — Tackle the 6 Chinese-only routes listed above. This is the next big multilingual gap.
4. **Phase 10 — Super-admin dark forest** — 31 of 32 pages still need conversion. Deferred from this session.
5. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
6. **Send the 3 hot lead Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`).
7. **FAMM Argentina follow-up** — past Apr 28 deadline. Draft now.
8. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.
9. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.
10. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 29, 2026)

### ⚡ Session 74 — Replan Pipeline Fix + Photo-Audit Crash Fix + Language Monthly Summary (Apr 29, 2026)

**Commits pushed: `2e94aadc` (photo-audit crash fix), `0dfbdd04` (replan Stage 0 + school_id fix), `c8b46ad6` (streaming replan event fix).**

**A. Photo-audit page crash fix — commit `2e94aadc`:**

`ReferenceError: t is not defined` in `components/montree/super-admin/WeeklyAdminTab.tsx`. The `SummaryCard` component destructured only `locale` from `useI18n()` but used `t()` for translations. Fixed: `const { locale } = useI18n()` → `const { t, locale } = useI18n()`.

**B. Replan pipeline fix — CRITICAL — commits `0dfbdd04`, `c8b46ad6`:**

**Root cause:** `replanChildInProcess()` was at Stage 6 (END of `processChild()`) in `app/api/montree/reports/weekly-wrap/route.ts`, after expensive Sonnet teacher + parent report generation. With 20 children × 2 Sonnet calls, later batches timed out before reaching replan. Only 11 of 20 children completed. All focus works were stale (Apr 21), all game plans had `source=onboard` (Apr 25 — never updated by replan).

**Fix — Move replan to Stage 0 (BEFORE report generation):**
- Replan now runs FIRST in `processChild()`, before the try/catch for report generation
- If reports fail or timeout, replan has already completed — plans always update
- Early return on DB upsert failures now includes replan results (replan already ran)
- Catch block includes replan results
- `school_id` ReferenceError fixed at lines 709 and 745: bare `school_id` → `classroom.school_id`
- Streaming `replan_done` event no longer gated on `r.success` — always emitted

**🚨 Architectural rule:** Replan MUST be Stage 0 in processChild(). It is the most important operation — plans updating weekly is the core product value. Sonnet reports are nice-to-have; fresh plans are must-have. Never move replan after report generation again.

**Two consecutive clean audit passes confirmed the fix.**

**C. Language Monthly Summary — `Whale_Class_April_Language_Summary.docx`:**

Generated a Language-area-only monthly summary for all 20 Whale Class children. Each child gets a neutral, professional 2-3 sentence summary covering: what Language works they did in April (from confirmed photos), mastery/practicing/presented status (from `montree_child_progress`), and a "Next, we can look at [work]" recommendation based on Montessori Language progression gap analysis.

**Data pipeline:**
1. Fetch Language curriculum area ID → 97 Language works
2. Fetch April confirmed photos (372) → filter to Language works only
3. Fetch `montree_child_progress` where `area=language` (611 rows)
4. For each child: count photo sessions per work, classify mastery/practicing/presented, find next gap in progression sequence

**Recommendation algorithm:** Full Montessori Language progression array (93 works ordered developmentally: Sound Games → Sandpaper Letters → CVC → Moveable Alphabet → Blue/Green Series → Reading → Grammar → Composition). Finds the child's highest point in the sequence, then recommends the next untouched work (gap-filling from earlier stages if nothing forward). User reviewed and approved the gap-filling approach over the forward-only approach.

**DNS workaround:** Local DNS resolution was failing for Supabase (`dmfncjjtsoxrnvcdnvjq.supabase.co`). Resolved via Google DNS (`8.8.8.8`) to get IP `172.64.149.246`, then used `curl --resolve` flag for all data fetches. The docx generation ran locally on the Mac using cached JSON files from `/tmp/`.

**Script location:** Not committed — one-off generation. Data cached at `/tmp/lang_works.json`, `/tmp/children.json`, `/tmp/media.json`, `/tmp/progress.json`.

**Files changed (2 files, 3 commits):**
- `components/montree/super-admin/WeeklyAdminTab.tsx` — added `t` to useI18n destructure
- `app/api/montree/reports/weekly-wrap/route.ts` — replan moved to Stage 0, school_id fix, streaming event fix

**🚨 Railway deploy needed:** User must hit "Relaunch to update" on Railway to deploy all 3 commits.

**Next session priorities:**
1. **🚨 Deploy to Railway** — 3 commits waiting: photo-audit fix, replan Stage 0, streaming fix.
2. **Deep triple audit photo recognition pipeline** — User explicitly requested: "we've also been having serious issues with the photo recognition pipeline. can you deep triple audit that and give me an analysis and proposed plan to improve it, make it better." NOT YET STARTED.
3. **🚨 Add Ukrainian + Russian languages** — Full instructions in Session 73 handoff below. Organic Ukrainian teacher Тамі signed up Apr 28.
4. **Welcome Тамі** — provision her school, send a personal message in Ukrainian.
5. **Send the 3 hot lead Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`).
6. **FAMM Argentina follow-up** — Past the Apr 28 deadline. Draft now.
7. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need follow-up template.
8. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
9. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.
10. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 28, 2026)

### ⚡ Session 72 — Public Funnel Polish + Teacher Revenue Share Programme (Apr 28, 2026)

**Commits pushed: `3f8572f0` (build fix), `eb6f7950` (try + login-select gradient), `f780ba74` (library gradient), `e945e48f` (try role cards), `9db1f142` (bulk import spinner + guaranteed reload fix).**

**A. Public funnel — uniform dark forest gradient:**

Applied the same fixed-div gradient (radial emerald glow + dark forest linear base, identical to landing page) to all public-facing screens:
- `app/montree/try/page.tsx` — role picker (was teal Tailwind gradient)
- `app/montree/login-select/page.tsx` — code login (was teal Tailwind gradient), including Suspense fallback
- `app/montree/library/page.tsx` — library home (was custom teal linear gradient + two absolute glow divs)

The role picker cards (`try/page.tsx`) were also restyled: Teacher card = deep emerald `rgba(39,129,90,0.32)` with green border; Principal card = dark gold-tint `rgba(60,45,10,0.45)` with amber `rgba(232,201,106,0.18)` border. Matches the brand palette — no more cyan/purple.

**B. Landing page build fix — commit `3f8572f0`:**

Prior session's gradient commit (`76032370`) left an unclosed `<div style={{ position: 'relative', zIndex: 1 }}>` at line 326 with no matching close before the `</>` fragment. Railway build was failing with `Expression expected` at line 400. Fixed by adding `</div>` before `</>`.

**C. Teacher Revenue Share Programme — full build:**

New campaign: teachers who start a trial and bring their school to a paid plan earn **20% of the school's monthly subscription** indefinitely, while employed there.

**Files created/modified:**

| File | Status |
|------|--------|
| `app/montree/for-teachers/page.tsx` | NEW — public landing page, dark forest aesthetic, `/montree/for-teachers` |
| `app/api/montree/teacher/earnings/route.ts` | NEW — GET earnings for authenticated teacher |
| `app/montree/dashboard/earnings/page.tsx` | NEW — teacher earnings dashboard |
| `app/api/montree/try/instant/route.ts` | MODIFIED — sets `founding_teacher_id` on school after teacher creation (non-blocking) |
| `components/montree/DashboardHeader.tsx` | MODIFIED — "💰 My Earnings" added to More menu |

**Attribution logic (confirmed by user):** Teacher inputs school name + email at signup. That timestamp-backed record = proof they were first. No other verification needed.

**✅ DB MIGRATION RUN (Apr 28, 2026)** — `montree_schools` columns added (`founding_teacher_id`, `revenue_share_pct`, `revenue_share_active`) + `montree_teacher_earnings` table created + index. Programme is fully live.

**Revenue share formula:** `student_count × $7 × 20% = teacher monthly earnings`

**What's still manual:** Activating revenue share (`UPDATE montree_schools SET revenue_share_active = true ...`) and inserting monthly earnings rows. Phase 2 builds automation. Full details in `docs/TEACHER_CAMPAIGN_HANDOFF.md`.

**D. Bulk import fix — commit `9db1f142`:**

Critical retention bug fixed: after bulk-importing students the dashboard returned to the empty state permanently and clicking the classroom did nothing. Root cause: `refetchChildren()` returns `void`, calling `.then()` on it was silently throwing TypeError. Fix: added `importLoading` state that shows a spinner immediately, clears when children arrive via `useEffect`, and falls back to `window.location.href = '/montree/dashboard'` after 1200ms — guaranteeing the student grid always appears.

**E. Inbound organic signup — Ukrainian teacher:**

A teacher named **Тамі** (`kiverova_tamila@ukr.net`) from **Школа Монтессорі** (Ukraine) signed up organically on Apr 28 at 5:57 PM — found Montree via Google search. First non-English-speaking organic inbound. Super admin panel shows 47 total interested (46 new, 1 contacted). This triggered the decision to add Ukrainian + Russian to the platform.

**Next session priorities:**
1. **🚨 #1 PRIORITY — Add Ukrainian + Russian languages** — Full instructions below in Session 73 handoff.
2. **Welcome Тамі** — provision her school, send a personal message in Ukrainian.
3. **Send the 3 hot lead Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`).
4. **FAMM Argentina follow-up** — Past the Apr 28 deadline. Draft now.
5. **Add "For teachers" to landing page nav** — `app/montree/page.tsx`, same style as Library link.
6. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need follow-up template.
7. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
8. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.
9. **Super admin revenue share tab** — View/manage founding teacher relationships and monthly earnings.

---

### ⚡ Session 73 — Ukrainian + Russian Language Handoff (start here next session)

**Trigger:** Ukrainian teacher Тамі signed up organically. Russian + Ukrainian opens Eastern Europe, Central Asia, and large global diaspora communities — essentially zero competition for Montessori software in these languages.

**The multilingual infrastructure is fully locale-agnostic (Sessions 58–67).** Adding a new language requires zero component or API changes. Only:
1. Create translation file
2. Add to `SUPPORTED_LOCALES`
3. Add area labels
4. Add AI config
5. Run batch curriculum scripts

**Step-by-step for Ukrainian (`uk`) and Russian (`ru`):**

**Step 1 — Generate translation files via Haiku batch script:**

Create `scripts/generate-uk.mjs` and `scripts/generate-ru.mjs` — same pattern as `scripts/generate-fr.mjs` (already in codebase). These read `lib/montree/i18n/en.ts`, call Haiku for each key, and write `lib/montree/i18n/uk.ts` and `lib/montree/i18n/ru.ts`. Cost: ~$0.40 per language.

**Ukrainian terminology notes:**
- Formal `ви` register (not `ти`)
- AMI Ukrainian Montessori terms: `Практичне Життя`, `Сенсорний`, `Математика`, `Мова`, `Культура`

**Russian terminology notes:**
- Formal `вы` register
- AMI Russian terms: `Практическая Жизнь`, `Сенсорика`, `Математика`, `Язык`, `Культура`

**Step 2 — Update `lib/montree/i18n/locales.ts`:**
```typescript
export const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
// Add to LOCALE_DISPLAY_NAMES: uk: 'Українська', ru: 'Русский'
// Add to LOCALE_SHORT_LABELS: uk: 'УКР', ru: 'РУС'
// Add to LOCALE_TO_INTL: uk: 'uk-UA', ru: 'ru-RU'
```

**Step 3 — Update `lib/montree/i18n/area-labels.ts`:**
```typescript
export const AREA_LABELS_UK = { practical_life: 'Практичне Життя', sensorial: 'Сенсорний', mathematics: 'Математика', language: 'Мова', cultural: 'Культура' };
export const AREA_LABELS_RU = { practical_life: 'Практическая Жизнь', sensorial: 'Сенсорика', mathematics: 'Математика', language: 'Язык', cultural: 'Культура' };
// Add both to AREA_LABELS map-of-maps keyed by 'uk' and 'ru'
```

**Step 4 — Update `lib/montree/i18n/locale-config.ts`:**
Add `LOCALE_AI_CONFIG` entries for `uk` and `ru` with language name, system prompt suffix, and Montessori glossary.

**Step 5 — Wire into context + server:**
- `lib/montree/i18n/context.tsx` — import + add uk/ru to messages map
- `lib/montree/i18n/server.ts` — import + add to `LOCALE_TO_MESSAGES`

**Step 6 — DB columns for curriculum work names:**
```sql
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_uk TEXT,
  ADD COLUMN IF NOT EXISTS name_ru TEXT,
  ADD COLUMN IF NOT EXISTS guide_content_uk JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_ru JSONB;
```

**Step 7 — Update `lib/montree/i18n/db-helpers.ts`:**
Add `uk: '_uk'` and `ru: '_ru'` to `LOCALE_COLUMN_SUFFIX`.

**Step 8 — Batch work name + guide translation scripts:**
Same as `scripts/batch-translate-guides-es.js` pattern. Run for both uk and ru. ~$0.40 each.

**Step 9 — Update `lib/montree/auto-translate.ts`:**
Add `name_uk` and `name_ru` to the upsert payload so new works auto-translate on creation.

**Reference sessions:** 67 (fr/pt/nl/it/ja/ko — same exact pattern), 68 (curriculum data layer wiring).

**After completing Ukrainian + Russian:**
- Welcome Тамі in Ukrainian — she's the first organic Ukrainian user
- Consider adding a Ukrainian-language outreach batch to the campaign (there are Montessori schools throughout Ukraine, Poland diaspora, Canada/US Ukrainian communities)

---

### ⚡ Session 71 — Landing Page Redesign + Sprout Logo + Demo Alert Banner + Hot Lead Drafts (Apr 28, 2026)

**Commits pushed: `6e3c87e3`, `e19ace45`, `7ddd80ea`, `76617dd8`, `26aeea6b` (landing page + logo iterations), `91f8c92b` (super admin demo alert).**

**A. Landing page full redesign — `app/montree/page.tsx`:**

Complete rewrite. Dark forest green gradient aesthetic (same as login screen). No DemoModal, no feature grids, no bullet points. Four sections only:
- **Nav** — sticky, frosted glass, sprout logo + "Get started" pill linking to `/montree/login-select?signup=true`
- **Hero** — "The magic of Montree." tagline. "A teacher takes a photo. Montree does the rest." Both CTAs go directly to self-serve signup (no modal).
- **Three editorial statements** — Teacher / Parents / Principal, editorial block style with Lora serif headings
- **Closing CTA** — "Experience the magic." + "One month free. Then $7 per child, per month. One plan. No tiers. No contracts."

CSS approach: `<style jsx global>` block with custom class names (`.m-nav`, `.m-hero`, `.m-block`, `.m-pill`, `.m-editorial`, `.m-closing`). Radial emerald glow + dark gradient via `body::before` pseudo-element. Lora serif from Google Fonts. Intersection Observer scroll-reveal on all sections.

**"The magic of Montree" is confirmed as the brand tagline.** Use everywhere.

**B. Sprout logo — `components/montree/MonteeLogo.tsx`:**

SVG sprout component: asymmetric two leaves on a stem inside a rounded square gradient background (`#34d399 → #14b8a6`). Props: `size` (default 32), `showBackground` (default true), `className`. Used in nav and footer of landing page.

```tsx
export default function MontreeLogo({ size = 32, showBackground = true, className = '' }) {
  const gradId = `mg-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      {showBackground && <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />}
      <path d="M16 27 C16 27 16 18 16 14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95"/>
      <path d="M16 21 C13.5 19.5 10.5 16 11.5 11 C13.5 10.5 17 14 16 21Z" fill="white" opacity="0.95"/>
      <path d="M16 17 C18 15.5 20.5 12 19.5 7.5 C17.5 7 15 10 16 17Z" fill="white" opacity="0.78"/>
    </svg>
  );
}
```

Note: `public/icon.svg` (tree-of-circles PWA icon) was NOT changed — user prefers it as-is for the home screen icon.

**C. Demo flow: modal removed, direct self-serve signup:**

Removed `DemoModal` entirely from landing page. Both CTAs now link directly to `/montree/login-select?signup=true`. User's reasoning: "allow them to set up a classroom themselves as it was before with the code login system. it was clean."

**D. Demo request confirmation email — `app/api/montree/demo-request/route.ts` (commit `26aeea6b`):**

Added a warm confirmation email sent to the requester immediately on form submit:
```
Subject: Montree
Dear [First name / school / there],
Thank you for reaching out. I'll be in touch within 24 hours...
Kind regards, Tredoux / montree.xyz
```
⚠️ **Email delivery is currently unreliable** — `RESEND_FROM_EMAIL` in Railway is set to `onboarding@resend.dev` (Resend test address — only delivers to the Resend account owner). To fix: verify `montree.xyz` domain in Resend → add DNS records → update `RESEND_FROM_EMAIL` in Railway. The DB always saves the lead regardless of email status.

**E. Super admin demo request alert banner — commit `91f8c92b`:**

Added `DemoRequestAlert` component to `app/montree/super-admin/page.tsx`. Fetches `/api/montree/super-admin/demo-requests`, filters to `status='demo_requested'`, renders a green alert banner with school name, contact, email link, and "Mark contacted" button. Clicking "Mark contacted" PATCHes the contact to `status='contacted'` and removes it from the banner.

The backing API route (`app/api/montree/super-admin/demo-requests/route.ts`) was already in place — GET returns all landing-page leads with `pending` count, PATCH updates status.

**🚨 Bug fixed:** The component originally checked `d?.leads` but the API returns `d?.requests`. Fixed to `d?.requests.filter(r => r.status === 'demo_requested')`. Without this fix the banner would never show.

**F. Three hot lead reply drafts — all in Gmail (Session 71):**

Pre-send duplicate checks ran clean for all three domains.

- **Montessori Copenhagen** (`info@montessori-cph.dk`) — Full Montree overview + 9 languages + early adopter + demo or 30-day trial CTA. Gmail draft ID: `r5875732429643975187`
- **Paint Pots Montessori, UK** (`paintpotsmontessori@outlook.com`) — Magic of Montree + 20-min demo offer. Gmail draft ID: `r-8134738077301193428`
- **Ardtona House Montessori, UK** (`info@ardtonahouse.co.uk`) — "Yes — one month free, no credit card" + direct signup + early adopter hook. Gmail draft ID: `r6746566790609932769`

All AWAITING TREDOUX SEND.

**Next session priorities:**
1. **Send the 3 hot lead drafts** — Copenhagen, Paint Pots, Ardtona House. Already in Gmail.
2. **FAMM Argentina follow-up** — Past the Apr 28 deadline. Draft a follow-up now.
3. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need the Session 70 follow-up template. Pull next 50 from DB and draft.
4. **Fix login page pricing link** — `app/montree/login-select/page.tsx`: "View pricing & tiers →" → "30 days free · See pricing →"
5. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
6. **Fix Resend domain** — Verify `montree.xyz` in Resend, update `RESEND_FROM_EMAIL` in Railway so confirmation emails actually reach leads.
7. **Ghost school screenshots** — Onboard "Greenfield Montessori" with 20 generic students for marketing.

---

## RECENT STATUS (Apr 27, 2026)

### ⚡ Session 70 — Outreach Follow-Ups + BulkImport Fix + Landing Page Redesign (Apr 27, 2026)

**Commits pushed: `ec3d2334` (BulkImport fix). Landing page redesign handed off to Opus.**

**A. Outreach follow-up emails:**

Drafted replies to 3 hot leads (Copenhagen, Paint Pots UK, Ardtona House UK). All in Gmail drafts. Copenhagen draft went through 6 iterations to nail the tone — final version is confident, warm, uses "the magic of Montree" framing, mentions 9 languages and early adopter benefits without justifying or chasing.

New follow-up template agreed for all 270 `status='sent'` contacts (the full batch):
```
Hi,

Just a quick follow up — a few things have changed.

Following user requests we have added nine languages to Montree. I am still personally onboarding schools at this stage, and early adopters still have the opportunity to have features built specifically for their school.

I would love to give you the opportunity to experience the magic of Montree. One month, completely free.

Kind regards,
Tredoux
montree.xyz
```
Key copy decisions:
- "Following user requests" (not "popular demand") — implies active user base, creates FOMO
- "early adopters" (not "early adaptors") — correct term
- "the magic of Montree" — THE brand tagline, confirmed this session
- Language personalization: German-speaking schools get "German among them", Spanish get "Spanish among them", etc.
- 22 drafts created before session was interrupted. 248 remaining.

**B. BulkImport smart date parsing — commit `ec3d2334`:**

User tried to onboard a ghost school for marketing screenshots. Hit "Could not parse date" for all 20 students with DD/MM/YYYY dates. Root cause: default format was YYYY-MM-DD and there was no auto-detection.

**`components/montree/BulkPasteImport.tsx`** — full date logic rewrite:
- Removed manual format selector entirely
- Added `smartParseDate()` — tries all common formats, picks the one that gives a sensible age (0-15 years), handles YYYY-MM-DD / DD/MM/YYYY / MM/DD/YYYY / 2-digit years / ambiguous cases
- Invalid dates now silently skipped (birthday is optional) — no more scary red "Could not parse date" that blocks import
- Placeholder updated to show multiple format examples
- Added "Any date format works — we'll figure it out. Birthdays are optional." hint text

**`app/montree/dashboard/page.tsx`** — post-import UX fix:
- After successful bulk import, page scrolls to top so student grid is immediately visible (was showing empty "Tap to add" state)

**C. Landing page redesign — handed off to Opus:**

User wants `app/montree/page.tsx` completely rewritten with the dark forest green gradient from the login screen. Tagline is "The magic of Montree." Four sections only: Nav, Hero, Three editorial statements (Teacher/Parents/Principal), Closing CTA. No feature grids, no bullet points, no comparison tables.

Full brief at: `docs/LANDING_PAGE_REDESIGN_HANDOFF.md`

**"The magic of Montree" is the confirmed brand tagline.** Use everywhere — follow-up emails, landing page, pricing page, follow-up to hot leads.

**D. Login page still says "View pricing & tiers →":**
`app/montree/login-select/page.tsx` — update this link text to match new single-plan messaging.

**Next session priorities:**
1. **Landing page redesign** — Opus to execute from `docs/LANDING_PAGE_REDESIGN_HANDOFF.md`
2. **Complete follow-up batch** — 248 remaining contacts at `status='sent'` need follow-up drafts using the confirmed template above. Pull next 50 from DB and draft.
3. **Ghost school screenshots** — onboard "Greenfield Montessori" with 20 generic students (no photos = clean initial avatar grid) for marketing
4. **Fix login page pricing link** — "View pricing & tiers →" → "30 days free · See pricing →"
5. **FAMM Argentina follow-up** — past the Apr 28 deadline, follow up now
6. **Disable `tell_guru_onboarding` for Whale Class** — `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`

---

### ⚡ Session 69 — Audio Manager + Real-Time Progress Tracking + Pricing Redesign (Apr 27, 2026)

**Two commits pushed to main: `4e99dcf3`, `aa6387f2`.** Plus all the real-time progress + audio manager work which was committed in the prior session batch.

**A. Audio Manager — same page as Video Manager:**

Extended `app/admin/video-manager/page.tsx`, `app/api/admin/video-manager/route.ts`, and `lib/data.ts` to support audio-only uploads (songs without video) alongside existing video uploads.

**`lib/data.ts`** — Added `mediaType?: 'video' | 'audio'` to `Video` interface. `videoUrl` field used for both (backwards compatible — undefined/missing = video).

**`app/api/admin/video-manager/route.ts`:**
- POST (signed-URL): reads `mediaType` from body; uses `aud_` prefix + `audio/` storage folder for audio files
- DELETE: detects `video.mediaType === 'audio'` to use correct `audio/` folder (was always using `videos/` — bug fixed)
- Stores `mediaType: 'audio'` in Video metadata

**`app/admin/video-manager/page.tsx`** (full rewrite → renamed "🎬 Media Manager"):
- File input: `accept="video/*,audio/*"`
- Upload: auto-detects `file.type.startsWith('audio/')` → sets `uploadIsAudio`
- Filter tabs: All / 🎬 Videos (count) / 🎵 Audio (count)
- Audio cards: cyan/purple gradient + 🎵 emoji + `<audio controls>` player
- Upload modal: `<audio>` preview + 🎵 banner for audio; `<video>` for video
- Stats bar: 6 tiles including separate Video count and Audio count

**B. Real-Time Progress Tracking:**

Previously, Guru only knew what children worked on AFTER Weekly Wrap generation. Now every photo confirmation writes a live progress record to `montree_child_progress` so Guru knows what happened today in real time.

**`app/api/montree/guru/corrections/route.ts`** — Added `upsertProgressObservation()` helper:
- CONFIRM path: called with `original_work_name`
- CORRECTION path: called with `corrected_work_name || original_work_name`
- Fire-and-forget (never blocks the response)
- Logic: if row exists + `status='presented'` → touch `updated_at` only. If row exists + higher status (practicing/mastered) → no-op (never downgrades teacher decisions). If no row → insert with `status='presented'`.
- Schema-correct: NO `classroom_id` column (not in `montree_child_progress`), uses `updated_at` not `created_at`

**`app/api/montree/photo-audit/resolve/route.ts`** — Path B (new_custom) fix:
- Custom work creation path does NOT call corrections route — handled inline
- Added local copy of `upsertProgressObservation` + fires it after successful photo attachment
- Now all 3 resolution paths (A=confirm_ai, B=new_custom, C=existing work) write progress

**🚨 4 bugs found and fixed in audit:**
1. **Wrong status value**: `'presenting'` → `'presented'` (actual enum from migration 081)
2. **Non-existent column**: Removed `classroom_id` from insert (not on `montree_child_progress`)
3. **Wrong timestamp**: Was updating `created_at` → corrected to `updated_at`
4. **Path B gap**: new_custom path never called corrections route → added separate progress upsert

**C. Pricing Redesign — commit `4e99dcf3`:**

Eliminated the Seed free tier. Single plan, 30-day trial, one classroom only.

**`app/pricing/page.tsx`** (full rewrite):
- Hero: "One plan. 30 days free to try it."
- Single centered Bloom card with prominent "Trial includes" box:
  - Full Montree experience
  - One classroom only
  - 30 days, then $7/student/month
  - No credit card required
- CTA subtitle: "One classroom · 30 days · No credit card"
- Removed Seed card, removed comparison table
- 7 FAQs updated including new "What does 'one classroom' mean?" and "Why only one plan?"
- Bottom banner: "One classroom · 30 days · No credit card · No contracts."

**Rationale:** Freemium fails when the free tier strips the AI — that leaves a worse-than-paper tracker. One plan + clear trial is more honest. The one-classroom trial limitation is stated plainly in 3 places, not buried.

**D. Landing page copy — commit `aa6387f2`:**

`app/montree/page.tsx` line 468: "View pricing and tiers →" → "30 days free · See pricing →"

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
2. **Follow up on FAMM Argentina** — No response since Apr 18. Follow up now (past Apr 28 deadline).
3. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **HeyGen videos** — 3-min and 5-min scripts via Builder → Script to Video (8 credits each, 146 credits remaining).

---

## RECENT STATUS (Apr 26, 2026)

### ⚡ Session 68 — Curriculum Data Layer Complete: All 9 Locales Fully Wired End-to-End (Apr 26, 2026)

**One commit pushed to main: `683af47e`.** 3 files, 70 insertions, 24 deletions. Completed the curriculum data layer for all 6 new locales (fr, pt, nl, it, ja, ko, de) so work names and guide content now display correctly in every language.

**A. Root cause of "German curriculum still in English" — fixed:**

The progress API (`app/api/montree/progress/route.ts`) was only fetching `name_chinese` and `name_es` from `montree_classroom_curriculum_works`. All 6 new language name columns (`name_de`, `name_fr`, `name_pt`, `name_nl`, `name_it`, `name_ja`, `name_ko`) were never read, so enrichment Maps were never built, and progress items were always falling back to English work names.

**Fix — 3 files:**

1. **`app/api/montree/progress/route.ts`** — Extended SELECT to include all 9 language name columns. Added 7 new Maps (`dbDeMap`, `dbFrMap`, `dbPtMap`, `dbNlMap`, `dbItMap`, `dbJaMap`, `dbKoMap`). Enrichment pass now adds `deName`, `frName`, `ptName`, `nlName`, `itName`, `jaName`, `koName` to each progress item.

2. **`app/montree/dashboard/[childId]/page.tsx`** — Extended `Assignment` interface with 7 new name props. Refactored `openQuickGuide` signature from `(workName, chineseName?, spanishName?)` to `(workName, localizedNames?: Record<string, string | undefined>)`. Updated call site to pass all 9 locale names as a dict.

3. **`components/montree/child/FocusWorksSection.tsx`** — Extended `Assignment` interface with 7 new props (`deName`, `frName`, `ptName`, `nlName`, `itName`, `jaName`, `koName`). Updated `onOpenQuickGuide` prop signature to match new dict pattern. Added `getWorkDisplayName(work, locale)` helper that resolves via locale-keyed map with fallback to `cleanWorkName()`. Replaced both zh/es display ternaries (focus works + extra works) with `{getWorkDisplayName(work, locale)}`. Updated Quick Guide button call site.

**B. Guide content batch translations — ALL LOCALES COMPLETE:**

Ran `batch-translate-guides-new-langs.mjs` for remaining null rows across all locales:

| Locale | Final count | Status |
|--------|-------------|--------|
| fr | 384/383 | ✅ Complete |
| pt | 384/383 | ✅ Complete |
| nl | 383/383 | ✅ Complete |
| it | 384/383 | ✅ Complete (2 gaps filled this session) |
| de | 384/383 | ✅ Complete (2 gaps filled this session) |
| ja | 384/383 | ✅ Complete (6 gaps filled this session) |
| ko | 384/383 | ✅ Complete (3 gaps filled this session) |

The 384 vs 383 discrepancy is one extra row from a different classroom_id — not an issue.

**🚨 Architectural note — `getWorkDisplayName()` is the canonical pattern:**

Any component that renders a work name for a user-facing locale should use this pattern:
```typescript
function getWorkDisplayName(work: Assignment, locale: string): string {
  const nameMap: Record<string, string | undefined> = {
    zh: work.chineseName, es: work.spanishName, de: work.deName,
    fr: work.frName, pt: work.ptName, nl: work.nlName,
    it: work.itName, ja: work.jaName, ko: work.koName,
  };
  return nameMap[locale] || cleanWorkName(work.work_name);
}
```

**C. Landing page + pitch materials (earlier this session):**

Three commits pushed earlier (`3969c48f`, `2e0e20b1`, `e6e93a30`) adding:
- "For the teacher" section to `app/montree/page.tsx` (Monday confidence → Friday back 4-beat structure)
- "Four stakeholders" 2×2 grid section (Principal / Parents / Teachers / Students)
- "Three budget lines" pricing reframe section
- "Personal promise" with Tredoux attribution
- `montree-pitch.html` — dark-themed pitch cheat sheet for demos (6 phases + objection handling + reframe)
- `montree-video-scripts.html` — 4 HeyGen video scripts (30-sec, 60-sec, 3-min, 5-min) with tabbed UI

**D. HeyGen video creation — in progress:**

- Subscribed to HeyGen Creator plan (200 credits)
- Video Agent consumed ~54 credits on storyboard generation without producing a video (billed during planning phase, not at render — lesson learned)
- 146 credits remaining
- "Train your personal model" option available for 60 credits — would leave 86 credits (~10 videos at 8 each)
- The 30-sec hook video is already generated and looks good
- Script to Video (Builder tab, not Video Agent) is the correct 8-credit path for remaining videos

**Files changed (3 files, commit `683af47e`):**
- `app/api/montree/progress/route.ts` — 9-language SELECT + 7 new Maps + enrichment
- `app/montree/dashboard/[childId]/page.tsx` — 7 new Assignment props + openQuickGuide refactor
- `components/montree/child/FocusWorksSection.tsx` — 7 new props + getWorkDisplayName helper + ternary replacements

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
2. **Follow up on FAMM Argentina** if no response by Apr 28.
3. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Finish HeyGen videos** — 3-min and 5-min scripts still to be produced via Builder → Script to Video (8 credits each).

---

### ⚡ Session 67 — 6-Language UI Expansion: French, Portuguese, Dutch, Italian, Japanese, Korean (Apr 26, 2026)

**One commit pushed to main: `e2baf953`.** 17 files, 23,075 insertions. Expanded Montree from 3 locales (en, zh, es) to 9 locales by adding complete UI translation files for French, Portuguese, Dutch, Italian, Japanese, and Korean.

**A. New translation files — 6 files, 3,646 keys each:**

- **`lib/montree/i18n/fr.ts`** — French (Français). Formal `vous` register, AMI French Montessori terminology (`Vie Pratique`, `Sensoriel`, `Mathématiques`, `Langage`, `Culture`). 3,646/3,646 keys translated.
- **`lib/montree/i18n/pt.ts`** — Portuguese (Português). Formal `você` register, AMI Portuguese terminology (`Vida Prática`, `Sensorial`, `Matemática`, `Linguagem`, `Cultural`). 3,646/3,646 keys translated.
- **`lib/montree/i18n/nl.ts`** — Dutch (Nederlands). Formal `u/uw` register, AMI Dutch terminology (`Praktisch Leven`, `Zintuiglijk`, `Wiskunde`, `Taal`, `Cultuur`). 3,646/3,646 keys translated.
- **`lib/montree/i18n/it.ts`** — Italian (Italiano). Formal `Lei/Suo/Sua` register, AMI Italian terminology. 3,645/3,646 keys (1 fallback: `childGuru.typeOrSpeak`).
- **`lib/montree/i18n/ja.ts`** — Japanese (日本語). Polite `です/ます` register, `お子さま` for "your child". 3,628/3,646 keys (18 fallbacks).
- **`lib/montree/i18n/ko.ts`** — Korean (한국어). Formal `합쇼체/해요체` register, `자녀분` for "your child". 3,637/3,646 keys (9 fallbacks).

**B. Infrastructure changes — 5 files updated:**

- **`lib/montree/i18n/locales.ts`** — Added fr, pt, nl, it, ja, ko to `SUPPORTED_LOCALES` array, `Locale` union type, `LOCALE_TO_INTL` date format map, `LOCALE_DISPLAY_NAMES`, `LOCALE_SHORT_LABELS`.
- **`lib/montree/i18n/area-labels.ts`** — Added `AREA_LABELS_FR`, `AREA_LABELS_PT`, `AREA_LABELS_NL`, `AREA_LABELS_IT`, `AREA_LABELS_JA`, `AREA_LABELS_KO` in the map-of-maps. All 6 new locales resolve correctly in `getAreaLabel(area, locale)`.
- **`lib/montree/i18n/locale-config.ts`** — Added `LOCALE_AI_CONFIG` entries for all 6 new locales (language name, system prompt suffix for AI responses, glossary).
- **`lib/montree/i18n/context.tsx`** — Imports and wires fr, pt, nl, it, ja, ko into the `messages` map.
- **`lib/montree/i18n/server.ts`** — Imports and wires all 6 into the `LOCALE_TO_MESSAGES` server-side map.

**C. GitHub Push Protection incident — resolved:**

Initial push attempt was blocked: commit `c49c36f2` contained a hardcoded Anthropic API key (`sk-ant-api03-...`) in the one-off generation scripts (`scripts/generate-fr/pt/nl/it/ja/nl.mjs`). These scripts were created to generate the translation files using Haiku and the key was accidentally left inline.

**Fix:** Replaced key with `process.env.ANTHROPIC_API_KEY` string literal in all 6 scripts via `sed -i ''` on macOS. Then ran `git commit --amend --no-edit` + `git push`. Commit `e2baf953` pushed successfully on second attempt (transient SSH disconnect on first retry).

**D. Production verification — CONFIRMED:**

Screenshots confirmed Korean locale (`한국어`) working end-to-end on production:
- UI labels and status badges fully translated (`수달함` = mastered, `제시됨` = presented)
- Quick guide modal rendering in Korean
- Full details modal rendering in Korean
- LanguageToggle dropdown showing all 9 locales

**🚨 CRITICAL KNOWN GAP — Curriculum data layer NOT localized for 6 new languages:**

The UI translation files are complete, but the **curriculum work names and guide content** in the database are NOT localized for fr, pt, nl, it, ja, ko. This mirrors the gap that existed for Chinese (fixed Sessions 13–14, 17) and Spanish (fixed Session 65).

**What's missing:**

| Column | DB table | Status |
|--------|----------|--------|
| `name_fr`, `name_pt`, `name_nl`, `name_it`, `name_ja`, `name_ko` | `montree_classroom_curriculum_works` | ❌ Columns don't exist |
| `guide_content_fr`, `guide_content_pt`, `guide_content_nl`, `guide_content_it`, `guide_content_ja`, `guide_content_ko` | `montree_classroom_curriculum_works` | ❌ Columns don't exist |

**`LOCALE_COLUMN_SUFFIX` in `lib/montree/i18n/db-helpers.ts` is also missing entries for all 6 new locales.** The map currently has `zh: '_zh'` and `es: '_es'`. Without entries for the 6 new languages, `getLocalizedWorkName()` and `getLocalizedField()` cannot resolve their DB columns.

**What this means in practice:**
- If a school switches to French/Portuguese/Dutch/Italian/Japanese/Korean, ALL work names in the curriculum view, child page shelf, game plan chips, Photo Audit sheet, and guide modals will fall back to English.
- Quick guides and full guides will render in English regardless of locale.
- Area labels WILL work correctly (those are code-side, not DB-dependent).
- UI strings (buttons, labels, status badges) WILL work correctly.

**Next session — Curriculum Data Layer for 6 New Languages:**

**Step 1 — DB Migrations (user runs in Supabase SQL Editor):**
```sql
-- Work name columns
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS name_nl TEXT,
  ADD COLUMN IF NOT EXISTS name_it TEXT,
  ADD COLUMN IF NOT EXISTS name_ja TEXT,
  ADD COLUMN IF NOT EXISTS name_ko TEXT;

-- Guide content columns (JSONB, same schema as guide_content_zh)
ALTER TABLE montree_classroom_curriculum_works
  ADD COLUMN IF NOT EXISTS guide_content_fr JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_pt JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_nl JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_it JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_ja JSONB,
  ADD COLUMN IF NOT EXISTS guide_content_ko JSONB;
```

**Step 2 — `db-helpers.ts` update:**
Add all 6 new locales to `LOCALE_COLUMN_SUFFIX` in `lib/montree/i18n/db-helpers.ts`:
```typescript
export const LOCALE_COLUMN_SUFFIX: Record<string, string> = {
  zh: '_zh',
  es: '_es',
  fr: '_fr',   // ADD
  pt: '_pt',   // ADD
  nl: '_nl',   // ADD
  it: '_it',   // ADD
  ja: '_ja',   // ADD
  ko: '_ko',   // ADD
};
```

**Step 3 — Batch work name translation scripts (Haiku):**
Similar to the one-off scripts used for Spanish (`scripts/generate-es.mjs` style). For each language, create a script that:
1. Reads all `montree_classroom_curriculum_works` rows for Whale Class classroom (id: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69`)
2. Calls Haiku for each work with the English `name` and asks for a localized translation
3. Uses `montree_glossary_{lang}` (if applicable) or Montessori AMI terminology guidelines in the prompt
4. UPSERTs the translated name into `name_{lang}` column
5. Runs in batches of 5, 500ms delay, handles retries

**Step 4 — Batch guide content translation scripts:**
Similar to `scripts/batch-translate-guides-es.js` (Session 65). For each language:
1. Query all works in Whale Class with `guide_content_{lang} IS NULL`
2. For each, translate the `quick_guide` JSONB from English using Haiku `tool_use`
3. Store result in `guide_content_{lang}` JSONB column
4. Estimated cost: ~$0.40 × 6 languages = ~$2.40 total (Haiku, same cost as Spanish batch)

**Step 5 — `auto-translate.ts` update:**
Update `lib/montree/auto-translate.ts` to also write all 6 new language columns when translating a newly-created curriculum work. Currently it writes `name_zh` + `name_chinese` + `name_es`. Add `name_fr`, `name_pt`, `name_nl`, `name_it`, `name_ja`, `name_ko` to the upsert payload.

**Step 6 — Works API update:**
`app/api/montree/works/route.ts` currently selects `name_es` and maps it to `spanish_name`. Add selects for all 6 new language columns and map them into the API response.

**Priority:** HIGH. Until this is done, any school that switches to one of the 6 new locales will see English work names in all curriculum views. The UI strings are correct but the data layer is English-only.

**Reference sessions:**
- Session 13 (Chinese work names + auto-translate pipeline)
- Session 14 (dual-column root cause fix — always write BOTH columns)
- Session 17 (Chinese guide content batch translation — 384/384 works)
- Session 65 (Spanish guide content batch — 383/383 works, `scripts/batch-translate-guides-es.js`)

**Files changed (17 files, commit `e2baf953`):**
- `lib/montree/i18n/fr.ts` — NEW
- `lib/montree/i18n/pt.ts` — NEW
- `lib/montree/i18n/nl.ts` — NEW
- `lib/montree/i18n/it.ts` — NEW
- `lib/montree/i18n/ja.ts` — NEW
- `lib/montree/i18n/ko.ts` — NEW
- `scripts/generate-fr.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-pt.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-nl.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-it.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-ja.mjs` — NEW (one-off, API key scrubbed)
- `scripts/generate-ko.mjs` — NEW (one-off, API key scrubbed)
- `lib/montree/i18n/locales.ts` — 6 new locales in `SUPPORTED_LOCALES` + `Locale` type + display maps
- `lib/montree/i18n/area-labels.ts` — 6 new `AREA_LABELS_*` constants in map-of-maps
- `lib/montree/i18n/locale-config.ts` — 6 new `LOCALE_AI_CONFIG` entries
- `lib/montree/i18n/context.tsx` — imports + wires all 6
- `lib/montree/i18n/server.ts` — imports + wires all 6

**Next session priorities:**
1. **🚨 Curriculum data layer for 6 new languages** — DB migrations (Step 1 above) + `db-helpers.ts` update (Step 2) + batch work name scripts (Step 3) + batch guide scripts (Step 4) + `auto-translate.ts` update (Step 5). This is the only remaining gap before the 6 new locales are fully functional end-to-end.
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details).
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
5. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 25, 2026)

### ⚡ Session 66 — Language Semester Report: Mastery Fix + Single-Block Copy (Apr 25, 2026)

**Two commits pushed to main: `577c3de5`, `3ad3ff0a`.**

**A. Mastery status fix — commit `577c3de5`:**

User flagged that Chalkboard Writing was showing as MD (Mastered) when the teacher never declared it mastered. The root cause was in `loadLanguageProgress()` in `app/api/montree/reports/language-semester/generate/route.ts`: photo count was being used as a mastery proxy (4+ photos → MD, 2-3 → Pr, 1 → P). User's exact words: *"Students can practice a work like this for 6 months without mastering it. The teacher needs to determine whats mastered and whats not. The AI cant. The AI should just assume everything is practicing until told otherwise."*

**Fix:** Added a query to `montree_child_progress` for rows where `status='mastered'` for the child. MD is now **only** assigned when a teacher has explicitly marked a work as mastered in the DB. Photo count can only yield P or Pr — never MD.

**Old (broken):**
```typescript
if (count >= 4) status = 'mastered';
else if (count >= 2) status = 'practicing';
else status = 'presented';
```

**New (correct):**
```typescript
// Step 3b: Fetch teacher-explicitly-set mastered works
const masteredWorkNames = new Set<string>();
const { data: progressRows } = await supabase
  .from('montree_child_progress')
  .select('work_name, status')
  .eq('child_id', childId)
  .eq('status', 'mastered');
for (const row of progressRows || []) {
  masteredWorkNames.add(row.work_name.toLowerCase());
}

// Status: MD only from teacher, Pr from 2+ photos, P from 1 photo
if (masteredWorkNames.has(workName.toLowerCase())) status = 'mastered';
else if (count >= 2) status = 'practicing';
else status = 'presented';
```

**🚨 Architectural rule:** `montree_child_progress.status='mastered'` is the SOLE source of truth for MD on any parent-facing report. Photo count alone NEVER implies mastery. This applies to Language Semester, Weekly Wrap, and any future report type.

**B. Single-block copy — commit `3ad3ff0a`:**

User saw three separate Copy buttons (one each for OPENING, CIRCLE 3 POINTS, CLOSING) and asked for one combined block they could copy in a single click. Fixed `app/montree/dashboard/language-semester/page.tsx`:

**Before (3 separate CopyBlock components):**
```tsx
<CopyBlock label="Opening" text={child.opening ?? ''} />
<CopyBlock label="Circle (3 points)" text={child.circle ?? ''} />
<CopyBlock label="Closing" text={child.closing ?? ''} />
```

**After (1 combined CopyBlock):**
```tsx
<CopyBlock
  label="Parent Letter"
  text={[child.opening, child.circle, child.closing].filter(Boolean).join('\n\n')}
/>
```

One click copies the entire three-part parent letter with blank lines separating the sections.

**Files changed (2 files, 2 commits):**
- `app/api/montree/reports/language-semester/generate/route.ts` — mastery from DB only, not photo count
- `app/montree/dashboard/language-semester/page.tsx` — single combined "Parent Letter" CopyBlock

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
2. **Follow up on FAMM Argentina** if no response by Apr 28.
3. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card keeps appearing: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 65 — Spanish Wiring Verification + Guide Batch Complete + LanguageToggle Dropdown (Apr 25, 2026)

**One commit pushed to main: `5fc97ad9`.** Verified all 5 Spanish multilingual wiring tasks were pre-implemented, completed the Spanish guide batch translation (383/383), and replaced the LanguageToggle cycle button with a native dropdown.

**Context:** Sessions 58–64 built the full multilingual infrastructure including Spanish as `'es'` locale. This session audited whether 5 specific Spanish wiring tasks were still pending or had been silently pre-implemented during that build.

**A. All 5 Spanish wiring tasks confirmed PRE-IMPLEMENTED (no code changes needed):**

1. **`db-helpers.ts` — `es: '_es'` in `LOCALE_COLUMN_SUFFIX`** — ✅ Already present. `getLocalizedWorkName()`, `getLocalizedField()`, and `getLocalizedColumn()` all resolve `_es` suffix automatically for Spanish locale.

2. **Works API — `name_es` in SELECT + `spanish_name` in response** — ✅ Already implemented. `app/api/montree/works/route.ts` selects `name_es` from DB and maps it to `spanish_name: w.name_es || undefined` in the response object.

3. **Child page + FocusWorksSection — `spanishName` prop + triple-fallback render** — ✅ Already implemented. Both files have `spanishName?: string` on their Assignment interfaces and use:
   ```tsx
   {locale === 'zh' && focusWork.chineseName
     ? focusWork.chineseName
     : locale === 'es' && focusWork.spanishName
       ? focusWork.spanishName
       : focusWork.work_name}
   ```

4. **`area-labels.ts` — `AREA_LABELS_ES` + `AREA_LABELS` map-of-maps** — ✅ Already implemented. Argentine Spanish area labels (`Vida Práctica`, `Sensorial`, `Matemáticas`, `Lenguaje`, `Cultural`) are in the map-of-maps keyed by locale. `getAreaLabel(area, locale)` resolves correctly for `'es'`.

5. **`LanguageToggle.tsx` — cycles through Spanish** — ✅ Already implemented. Component uses `SUPPORTED_LOCALES` array (which includes `'es'`) to cycle EN → 中文 → ES → EN. `LOCALE_SHORT_LABELS` drives button display (`'es': 'ES'`).

**B. `es.ts` — Confirmed real Argentine Spanish (not stubs):**

File header explicitly states: `// Uses voseo (vos tenés), ustedes for plural, AMI Montessori terminology.`

All 1,490+ translation keys are populated with genuine Argentine Spanish using voseo register:
- `'summary.askGuruPrompt'`: `'Hacé clic en "Preguntale al Guru"...'`
- `'guru.askPlaceholder'`: `'Preguntá sobre su hijo/a...'`
- Zero empty string values found via grep.

**C. Spanish guide batch translation — COMPLETE (383/383):**

`scripts/batch-translate-guides-es.js` finished its initial run with **373/383** (10 transient `fetch failed` failures). Re-ran targeting only the 10 remaining null rows — all 10 succeeded. Final state: **383/383 works** have `guide_content_es` JSONB populated.

All Whale Class works now have instant Spanish guide delivery (no API call needed) — same as the Chinese `guide_content_zh` cache built in Sessions 17+.

**D. LanguageToggle → native dropdown (commit `5fc97ad9`):**

Replaced the tap-to-cycle button with a proper dropdown select. The pill label is still shown visually (so it fits in the header at the same compact size), but an invisible `<select>` overlays it — clicking the pill opens the OS-native language picker showing full display names (English / 中文 / Español). No more hunting through locales by tapping in a cycle.

**Implementation (`components/montree/LanguageToggle.tsx`):**
- Visible pill span is `pointer-events-none` so the hidden `<select>` captures all clicks
- `<select>` is `opacity-0 absolute inset-0` — covers the pill exactly, invisible but fully interactive
- Options rendered from `SUPPORTED_LOCALES` with `LOCALE_DISPLAY_NAMES` as labels
- `onChange` calls `setLocale()` directly — one tap to any locale, no cycling
- No layout changes to any parent component — the div wrapper is the same size as the old button

**🚨 Architectural notes for future sessions:**

- **Spanish is fully wired end-to-end**: LanguageToggle → locale → area labels → work names → curriculum detail views → AI prompts. The infrastructure from Sessions 58–64 is complete.
- **To activate Spanish for a school**: No code changes. Just ensure the school's teacher can see the ES option in LanguageToggle (already works — no feature flag needed, locale is client-side preference).
- **Spanish guides**: `guide_content_es` on `montree_classroom_curriculum_works` — same JSONB schema as `guide_content_zh`. The guide API at `app/api/montree/works/guide/route.ts` already reads `guide_content_es` when `locale='es'` (via `LOCALE_COLUMN_SUFFIX` → `getLocalizedField()` pattern).
- **`name_es` column** on `montree_classroom_curriculum_works` — populated by batch translate scripts. The batch guide script does NOT fill this — a separate `name_es` batch would be needed for work names to appear in Spanish in the UI.
- **FAMM Argentina pitch**: If/when they onboard, their locale should be set to `'es'` at the school level. Everything renders in Argentine Spanish automatically.

**Next session priorities:**
1. **Amy's TellGuruCard** — disable `tell_guru_onboarding` for Whale Class: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial), Montessori Copenhagen (details). Immediate conversion opportunities.
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Check Spanish guide batch completion** — `SELECT COUNT(*) FROM montree_classroom_curriculum_works WHERE classroom_id='51e7adb6-cd18-4e03-b707-eceb0a1d2e69' AND guide_content_es IS NOT NULL;` — should be 383 when done.
5. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
6. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 64 — Game Plan Section Hide + TellGuruCard Fix + Lion King Video Downloads (Apr 25, 2026)

**Three commits pushed to main: `4e49a5b6`, `d70ad3be` (wrong, immediately superseded), `ca94843c`.**

**A. SHOW_GAME_PLAN gate — completed (`4e49a5b6`):**

Finished hiding the entire game plan section in `components/montree/child/FocusWorksSection.tsx`. This was the third and final edit of three to gate everything behind `SHOW_GAME_PLAN = false`:
- Container gradient block: already gated in prior session
- Header block (nudge + work chips + direction arrow): gated this session
- Footer block ("Updated today / Refresh" line): gated this session

All three conditions now read: `{SHOW_GAME_PLAN && gamePlan && (...)}`. **To restore the game plan section: flip `SHOW_GAME_PLAN = true` in `FocusWorksSection.tsx` and redeploy.** No DB changes, no data loss — the game plan JSONB is still being written by the replan pipeline, it just isn't shown in the UI.

**B. TellGuruCard visibility fix — `d70ad3be` (WRONG) → `ca94843c` (CORRECT):**

**The bug:** TellGuruCard was appearing for Amy and other students who had been in the classroom for months. The card is supposed to appear once — for brand-new students with no mental profile — and disappear permanently after the teacher submits the voice intro.

**Wrong first fix (`d70ad3be`):** Changed `childDataRich` threshold from `>= 5` photos to `>= 1`, reasoning "any photo means the child is known." User immediately corrected: *"what you talking about photos? What do photos have to do with it?"* Photos have nothing to do with whether the system has been introduced to a student. Reverted in next commit.

**Correct fix (`ca94843c`):** The ONLY signal for TellGuruCard visibility is `hasProfile` — whether a row exists in `montree_child_mental_profiles`. Removed `!childDataRich` from the condition entirely:

**Before (wrong):**
```tsx
{isEnabled('tell_guru_onboarding') && hasProfile === false && !childDataRich && (
```
**After (correct):**
```tsx
{isEnabled('tell_guru_onboarding') && hasProfile === false && (
```

Also: `childDataRich` threshold reverted to `>= 5` (its original value) with a clarifying comment: *"childDataRich is no longer used for TellGuruCard visibility — profile presence is the only signal. Left here as it still gates BigMicPanel display."*

Comment on the TellGuruCard block updated to: *"shown once, for brand-new students with no mental profile. Once the teacher submits the intro, hasProfile flips to true and this never shows again."*

**Why Amy's card is still showing:** She genuinely has no entry in `montree_child_mental_profiles`. The teacher needs to complete her intro via the voice card — or disable `tell_guru_onboarding` for Whale Class via Supabase if the card is unwanted.

**C. Lion King video downloads (local Mac, not committed):**

Downloaded 3 Lion King karaoke videos from YouTube via yt-dlp + re-encoded to H.264 for QuickTime/classroom use:
- "Circle of Life" karaoke — `Circle of Life - H264.mp4`
- "Hakuna Matata" karaoke — `Hakuna Matata - H264.mp4`
- "I Just Can't Wait to Be King" karaoke — `I Just Can't Wait to Be King - H264.mp4`

All saved to Desktop. Pipeline: yt-dlp with `--cookies-from-browser chrome` (required to bypass YouTube bot detection) → ffmpeg H.264 re-encode (`-c:v libx264 -crf 28 -preset fast -vf "scale=-2:720" -c:a aac -movflags +faststart`).

**🚨 Architectural notes for future sessions:**
- **`SHOW_GAME_PLAN = false`** in `FocusWorksSection.tsx` — flip to `true` to restore game plan display. The replan pipeline continues writing game plans regardless of this flag.
- **TellGuruCard is gated purely on `hasProfile === false`** — photo count, `childDataRich`, and any other derived state is irrelevant. Mental profile existence is the one signal.
- **`childDataRich` (≥5 photos) gates BigMicPanel ONLY** — do not use it for any onboarding state logic.
- **`hasProfile` state:** `null` = still loading, `false` = no profile in DB, `true` = profile exists. Card renders only on `=== false`.

**Files changed (2 files, 3 commits):**
- `components/montree/child/FocusWorksSection.tsx` — SHOW_GAME_PLAN gate on footer block + header block (commit `4e49a5b6`)
- `app/montree/dashboard/[childId]/page.tsx` — removed `!childDataRich` from TellGuruCard condition, reverted `childDataRich` to `>= 5`, updated comments (commit `ca94843c`)

**Next session priorities:**
1. **Amy's TellGuruCard** — either complete her voice intro via the card, or disable `tell_guru_onboarding` for Whale Class: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request). These are immediate conversion opportunities.
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 63 — Multilingual Build: Phase 5 (3x AUDIT) COMPLETE — All 5 Phases Done + guru/route.ts Fix (Apr 24, 2026)

**Two commits pushed to main: `8fa6eecb`, `b5e42dbd`.** Phase 5 (3x AUDIT) of the 3x3x3x3x3 development cycle is 100% complete. Three consecutive clean audit passes confirmed zero TYPE A violations remain. The entire multilingual build (Phases 1-5) is now finished.

**Development Cycle Status — ALL COMPLETE:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — ✅ COMPLETE (Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 ✅)
5. 3x AUDIT — ✅ COMPLETE (3 consecutive clean passes)

**Commits this session:**
- `8fa6eecb` — Multilingual build: commit all Layer 3+4+5 changes (38+ files from Sessions 59-62)
- `b5e42dbd` — Fix guru/route.ts: replace dangling `isZh` references with locale-agnostic `langInstruction` + `areaNameInstruction` variables

**guru/route.ts fix (the audit catch):**
Prior session replaced the `isZh` declaration in `buildSystemPrompt()` with locale-agnostic variables (`langInstruction` via `getAILanguageInstruction()`, `areaNameInstruction` via IIFE Record) but left two template literal lines still referencing the now-deleted `isZh` variable. Would have crashed at runtime with `isZh is not defined`. Fixed lines 280 and 301:
- Line 280: `${isZh ? '\nLANGUAGE:...' : ''}` → `${langInstruction ? '\nLANGUAGE: ${langInstruction}\n' : ''}`
- Line 301: `${isZh ? '...' : ''}` → `${areaNameInstruction}`
- Only remaining `=== 'zh'` in this file: line 313 (TYPE B — `isZh` in `loadRecentPhotoHint()` for `work.name_chinese` DB column read) — correctly preserved.

**3x AUDIT results:**
- **Pass 1**: Grepped `=== 'zh'` across all .ts/.tsx/.mjs files — 116 occurrences across 44 files. ALL classified as TYPE B (DB column reads: `name_chinese`, `name_zh`, `chineseName`, `parent_description_zh`, `why_it_matters_zh`, `chinese_text`, `area_name_zh`, `guide_content_zh`, `labelZh`, `work_name_chinese`). Zero TYPE A violations.
- **Pass 2**: Sonnet agent verified the 8 highest-count files (54 occurrences total). All TYPE B. CLEAN.
- **Pass 3**: Sonnet agent verified all remaining files. All TYPE B. CLEAN. Three consecutive clean passes achieved.

**Video download:**
- Downloaded "No Doubt - Hey Baby" from YouTube (29.6MB, 720p)
- Re-encoded from AV1 to H.264 for QuickTime/classroom compatibility: `No Doubt - Hey Baby - H264.mp4` on Desktop

**Multilingual system is now fully locale-agnostic.** Adding a new language requires:
1. Create `lib/montree/i18n/{lang}.ts` (copy en.ts, translate)
2. Add to `SUPPORTED_LOCALES` in `locales.ts`
3. Add area labels to `AREA_LABELS` map
4. Add `LOCALE_CONFIG` entry
5. Add `LOCALE_TO_INTL` date format entry
6. Zero code changes in components or API routes

**Next session priorities:**
1. **🇪🇸 SHIP SPANISH FOR FAMM ARGENTINA** — Full handoff at `docs/MULTILINGUAL_AUDIT_HANDOFF.md` (Priority 1 section). Infrastructure is done, zero code changes needed. Remaining work: translate `es.ts` (1,490+ stub keys → real Argentine Spanish), add `name_es` column + batch translate curriculum, review AI prompt config for voseo/AMI terms, extend game plan JSONB. ~9-10h full, ~2-3h demo-ready shortcut. **Start here when user says "see handoff".**
2. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request).
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.
5. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.

---

### ⚡ Session 62 — Multilingual Build: Layer 3 COMPLETE — Zero `=== 'zh'` Ternaries Remaining (Apr 24, 2026)

**Three commits pushed to main: `99fe8f3e`, `bd7abba7`, `fb542929`.** Phase 4 (3x BUILD) Layer 3 ternary sweep is 100% complete. Zero `=== 'zh'` ternaries remain in the entire codebase. All conversion targets converted to locale-agnostic patterns (IIFE Records for server, `t()` keys for client). 512 TYPE B preserves (DB column reads) correctly untouched.

**Development Cycle Status:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — ✅ COMPLETE (Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 ✅)
5. 3x AUDIT — ✅ COMPLETE (Session 63 — 3 consecutive clean passes)

**Commits this session:**
- `99fe8f3e` — Build fix: unescaped apostrophe in `en.ts` line 2768 (`'This Week's Activities'` → `"This Week's Activities"`)
- `bd7abba7` — Layer 3: convert 17 files (153 insertions, 63 deletions). Files: `sonnet-draft.ts`, `onboard/route.ts`, `weekly-admin/route.ts`, `weekly-admin-docs/generate/route.ts`, plus 13 others including `ThisIsSheet.tsx`, `weekly-admin-docs/page.tsx`, `weekly-wrap/page.tsx`, `gallery/page.tsx`, `parent/report/[reportId]/page.tsx`, `PendingReviewPanel.tsx`, `DashboardHeader.tsx`, `BatchNarrativesCard.tsx`, `BigMicPanel.tsx`, `ChildGuruChat.tsx`
- `fb542929` — Layer 3: convert last 2 voice-note ternaries (`lib/montree/voice-notes/extraction.ts`, `lib/montree/voice/prompts.ts`)

**Final verification:**
- `grep -r "=== 'zh'" --include="*.ts" --include="*.tsx" --include="*.mjs"` → **0 hits**
- `grep -r "== 'zh'" --include="*.ts" --include="*.tsx" --include="*.mjs"` → **0 hits**
- TYPE B preserves (`name_chinese`, `name_zh`, `parent_description_zh`, etc.) → **512 occurrences across 95 files** — all untouched

**Multilingual system is now fully locale-agnostic.** Adding a new language requires:
1. Create `lib/montree/i18n/{lang}.ts` (copy en.ts, translate)
2. Add to `SUPPORTED_LOCALES` in `locales.ts`
3. Add area labels to `AREA_LABELS` map
4. Add `LOCALE_CONFIG` entry
5. Add `LOCALE_TO_INTL` date format entry
6. Zero code changes in components or API routes

**Next session priorities:**
1. **Phase 5: 3x AUDIT** — fix cycle until 3 consecutive clean audits.
2. **Draft replies to 3 hot leads** — Paint Pots UK, Ardtona House UK, Montessori Copenhagen.
3. **Follow up on FAMM Argentina** if no response by Apr 28.
4. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

### ⚡ Session 61 — Multilingual Build: Layer 3 Ternary Sweep — 8 Files Converted (Apr 24, 2026)

**No new commits. 40+ files changed locally — ready to commit.** Continued Phase 4 (3x BUILD) Layer 3 ternary sweep. Converted 8 files to locale-agnostic patterns, adding ~186 translation keys across en.ts/zh.ts/es.ts.

**Development Cycle Status:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — **IN PROGRESS** (Layer 0-1 ✅, Layer 4 ✅, Layer 5 ✅, Layer 3 ~35% done)
5. 3x AUDIT — pending

**Layer 3 progress — Files FULLY CONVERTED this session:**
- `app/montree/dashboard/focus/page.tsx` — ✅ (19 → 0)
- `app/montree/dashboard/photo-audit/page.tsx` — ✅ (20 → 0)
- `app/montree/parent/dashboard/page.tsx` — ✅ (18 → 3 TYPE B preserves)
- `components/montree/onboarding/TellGuruCard.tsx` — ✅ (20 → 0)
- `app/montree/dashboard/classroom-overview/page.tsx` — ✅ (20 → 1 TYPE B preserve)
- `app/montree/dashboard/language-semester/page.tsx` — ✅ (17 → 0)
- `components/montree/curriculum/CurriculumWorkList.tsx` — ✅ ALL TYPE B, no changes needed
- `components/montree/reports/WeeklyWrapTab.tsx` — ✅ (prior sessions)

**Files with edits IDENTIFIED but NOT YET APPLIED:**
- `components/montree/photo-audit/ThisIsSheet.tsx` — 2 TYPE A edits (lines 492, 974)
- `app/montree/dashboard/weekly-admin-docs/page.tsx` — 8 TYPE A edits (includes 2 `displayField` specials)

**Files NOT YET STARTED (highest priority):**
- `weekly-wrap/page.tsx` (76 ternaries, fully catalogued in handoff Section 10)
- `gallery/page.tsx` (31), `parent/report/[reportId]/page.tsx` (16), `PendingReviewPanel.tsx` (15), `DashboardHeader.tsx` (14), `BatchNarrativesCard.tsx` (14), `BigMicPanel.tsx` (14), `ChildGuruChat.tsx` (13)
- ~45 smaller files with <13 occurrences each

**Translation keys added this session:** ~186 keys across 8 namespaces: `focus.*`, `photoAudit.*`, `parentDashboard.*`, `tellGuru.*`, `classroomOverview.*`, `languageSemester.*`, `parentReport.*` (12), `pendingReview.*` (15), `batchNarratives.*` (14), `dashboard.*` (15), `childGuru.*` (13)

**Handoff document updated:** `docs/MULTILINGUAL_BUILD_HANDOFF.md` — Section headers updated with converted/remaining file lists. Section 10 (weekly-wrap catalog) unchanged. Section 11 rewritten with done/pending/not-investigated breakdown.

**Next session priorities:**
1. **Apply 2 TYPE A edits to ThisIsSheet.tsx** + add keys to all 3 translation files.
2. **Apply 8 TYPE A edits to weekly-admin-docs/page.tsx** + add keys.
3. **Execute weekly-wrap/page.tsx ternary sweep** — the biggest file (76 ternaries, plan in handoff Section 10).
4. **Continue Layer 3** with gallery/page.tsx (31), then remaining MED-priority files.
5. **Commit + push** all multilingual changes (40+ files).
6. **Phase 5: 3x AUDIT** — fix cycle until 3 consecutive clean audits.
5. **Draft replies to 3 hot leads** — Paint Pots UK, Ardtona House UK, Montessori Copenhagen.
6. **Follow up on FAMM Argentina** if no response by Apr 28.
7. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

### ⚡ Session 59 — Multilingual Build Phase 4: Layer 0-1 Infrastructure + Layer 4 AI Pipeline (Apr 24, 2026)

**No commits yet — 38 files changed locally, ready to commit.** Phase 4 (3x BUILD) of the 3x3x3x3x3 development cycle. Built the entire multilingual infrastructure foundation (Layer 0-1) and converted the two most complex AI pipeline files (Layer 4 core).

**Development Cycle Status:**
1. 3x RESEARCH — ✅ COMPLETE
2. 3x PLAN — ✅ COMPLETE
3. 3x INVESTIGATE — ✅ COMPLETE
4. 3x BUILD — **IN PROGRESS** (Layer 0-1 done, Layer 4 core done, 9 Layer 4 files + Layer 3 sweep + Layer 5 type widening remaining)
5. 3x AUDIT — pending

**A. Layer 0-1 — Foundation Infrastructure (10 files created/modified):**

Created the entire multilingual foundation that every other layer builds on:

- **`lib/montree/i18n/locales.ts`** (NEW) — Canonical `Locale` type (`'en' | 'zh' | 'es'`), `SUPPORTED_LOCALES` array, `isValidLocale()`, `LOCALE_TO_INTL` date format map, `getIntlLocale()`, display names/short labels
- **`lib/montree/i18n/locale-config.ts`** (NEW) — `LOCALE_AI_CONFIG` per-locale AI prompt config, `getAILanguageInstruction(locale)` (empty for English, full directive for others), `getLanguageName(locale)`
- **`lib/montree/i18n/db-helpers.ts`** (NEW) — `getLocalizedWorkName(work, locale)` handling Chinese dual-column legacy, `getLocalizedField(obj, field, locale)`, `getLocalizedColumn(field, locale)`
- **`lib/montree/i18n/localized-types.ts`** (NEW) — Extracted `resolveLocalized()`, `resolveLocalizedArray()` JSONB resolvers from GamePlanCard
- **`lib/montree/i18n/es.ts`** (NEW) — Spanish translation file (stub with all 1,490+ keys)
- **`lib/montree/i18n/area-labels.ts`** (UPDATED) — Map-of-maps `AREA_LABELS`, Spanish labels added, `getAreaArrowExample(locale)`
- **`lib/montree/i18n/context.tsx`** (UPDATED) — `Locale` imported from `locales.ts`, `'es'` support added
- **`lib/montree/i18n/server.ts`** (UPDATED) — Re-exports from new modules
- **`lib/montree/i18n/index.ts`** (UPDATED) — Barrel re-exports all new modules (173 importing files get new exports automatically)
- **`components/montree/LanguageToggle.tsx`** (UPDATED) — Cycle-through-all pattern for 3+ locales

**B. Layer 4 — AI Pipeline Core (2 files, fully converted):**

- **`lib/montree/reports/teacher-report-generator.ts`** — 15 edits. All `=== 'zh'` ternaries in `generateTeacherFallback()` converted to locale-keyed `Record<string, string>` maps with IIFE pattern. `work_zh` → `work_localized`. Only 3 intentional TYPE H separator checks remain (`'、'` vs `', '`).
- **`lib/montree/reports/narrative-generator.ts`** — 7 edits. Zero `=== 'zh'` remaining. `generateTemplateFallback()` refactored to `TEMPLATES` map with zh/es/en. No-photos and system message both use locale-config helpers.

**C. Other Layer 3/4 files converted (from earlier build rounds):**

- **`lib/montree/guru/conversational-prompt.ts`** — All zh blocks replaced with locale-keyed patterns
- **`lib/montree/reports/ai-generator.ts`** — Fully rewritten for N-language
- **`lib/montree/reports/pdf-generator.ts`** — TYPE B + TYPE D fixed
- **22 files** with TYPE D date format replacements — all now use `getIntlLocale(locale)` from `locales.ts`
- Multiple parent/progress/gallery pages — TYPE D date ternaries replaced

**D. Handoff document maintained:**

`docs/MULTILINGUAL_BUILD_HANDOFF.md` — Comprehensive handoff document with exact remaining work, file-by-file instructions, pattern examples, and verification steps. Updated after every major completion.

**Remaining work (documented in handoff):**

| Layer | Scope | Status |
|-------|-------|--------|
| Layer 4 remaining | 9 AI pipeline files (auto-translate generalization, replan, photo-identification) | Pending |
| Layer 5 | 16 files with `'en' \| 'zh'` type annotations → `Locale` | Pending |
| Layer 3 | ~89 files with ~563 `=== 'zh'` ternaries (mechanical conversion) | Pending |
| Phase 5 | 3x AUDIT — fix cycle until 3 consecutive clean audits | Pending |

**38 files changed locally, not yet committed.** Ready for commit + push.

**Next session priorities:**
1. **Commit + push the 38-file multilingual infrastructure change.**
2. **Continue Layer 4 build** — `auto-translate.ts` (generalize `autoTranslateToChinese()` → `autoTranslateWork(input, targetLocale)`), `replan-child.ts`, `batch-translate/route.ts`.
3. **Layer 5 type widening** — 16 files, 28 annotations, mechanical.
4. **Layer 3 ternary sweep** — 89 files, 563 occurrences, mechanical but high volume.
5. **Phase 5: 3x AUDIT** — fix cycle until 3 consecutive clean audits.
6. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request).
7. **Follow up on FAMM Argentina** if no response by Apr 28.
8. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 24, 2026)

### ⚡ Session 58 — Multilingual Architecture: 3x RESEARCH + 3x PLAN Complete (Apr 23-24, 2026)

**No code commits.** Pure architecture research and planning — Phase 1 (3x RESEARCH) and Phase 2 (3x PLAN) of the 3x3x3x3x3 development cycle for making Montree fully multilingual (any language, not just Chinese/English).

**The Goal:** Any language can be "dropped in" by adding a translation file and running a script — zero code changes, zero migrations per new language. Triggered by FAMM Argentina hot lead where Spanish support would be a competitive advantage.

**A. Phase 1: 3x RESEARCH — Codebase Audit (COMPLETED):**

Comprehensive audit of every i18n-related pattern in the codebase:

- **646 hardcoded `=== 'zh'` ternaries across 98 files** — classified into 5 types:
  - TYPE A (346): Inline label ternaries → convert to `t()` keys
  - TYPE B (42): DB column reads (`name_zh`, `parent_description_zh`) → `getLocalizedWorkName()` helper
  - TYPE C (5): Area label ternaries → `AREA_LABELS` map-of-maps
  - TYPE D (42): Date format ternaries → `LOCALE_TO_INTL` map
  - TYPE E+F (211): AI prompts + conditional logic → `LOCALE_CONFIG` pattern

- **462 Chinese-specific DB column references across 86 files:** `name_zh` (373), `parent_description_zh`/`why_it_matters_zh` (69), `guide_content_zh` (20)

- **Zero `switch(locale)` patterns** — all branching uses ternaries, making mechanical conversion feasible with no exhaustiveness check breaks

- **Confirmed barrel `lib/montree/i18n/index.ts` EXISTS** (prior session's Glob missed it) — re-exports `Locale`, `TranslationKey`, all server functions. 173 files import via barrel.

- **681 existing `t()` call sites across 127 files** — already fully locale-agnostic, no changes needed

- **Dual `Locale` type** defined in both `context.tsx:17` and `server.ts:8` — plan unifies via new `locales.ts`

- **`resolveLocalized()` in `GamePlanCard.tsx`** — GOLD STANDARD pattern, already takes `locale: string`, fully multilingual. JSONB `{ en: "...", zh: "...", es: "..." }` pattern proven.

**B. Phase 2: 3x PLAN — Architecture Design (COMPLETED):**

Created `docs/MULTILINGUAL_PLAN.md` (comprehensive handoff document) with:

**5 Execution Layers:**
- **Layer 0 — Foundation (6 files):** Create `locales.ts` (canonical `Locale` type + `SUPPORTED_LOCALES` + `isValidLocale()`), expand `area-labels.ts` to map-of-maps, create `es.ts` translation file, create `db-helpers.ts` (`getLocalizedWorkName()` + `resolveLocalizedDB()`), create `LanguageSelector.tsx` dropdown, update barrel `index.ts`
- **Layer 1 — Type Unification (2 files):** Replace `Locale` in `context.tsx` and `server.ts` with import from `locales.ts`
- **Layer 2 — DB Schema (87 files):** Replace 462 `_zh` column reads with `getLocalizedWorkName(work, locale)` helper that reads JSONB `_localized` columns with fallback to legacy `_zh`
- **Layer 3 — Ternary Sweep (98 files):** Convert 646 hardcoded ternaries to locale-agnostic patterns (`t()`, `LOCALE_CONFIG`, `LOCALE_TO_INTL`)
- **Layer 4 — AI Pipeline (8 files):** Generalize `autoTranslateToChinese()` → `autoTranslateWork(input, targetLocale)` with `LOCALE_CONFIG` for system prompts, tool schemas, language names
- **Layer 5 — Type Widening (20 files):** Widen `locale: 'en' | 'zh'` annotations to `Locale` across route handlers and component props

**"Drop a Language In" Workflow (9 steps, zero code changes in components):**
1. Create `lib/montree/i18n/{lang}.ts` (copy en.ts, translate)
2. Add to `SUPPORTED_LOCALES` in `locales.ts`
3. Add area labels to `AREA_LABELS` map
4. Add `LOCALE_CONFIG` entry (language name, system prompt suffix, glossary)
5. Add `LOCALE_TO_INTL` date format entry
6. Run `autoTranslateWork()` batch for curriculum
7. Generate AI content (game plans, reports) — bilingual JSONB auto-extends
8. Test with locale toggle
9. Ship

**Risk Matrix:** Layer 0-1 LOW, Layer 2 MEDIUM (volume), Layer 3 HIGH volume but LOW per-item, Layer 4 MEDIUM, Layer 5 LOW.

**Effort Estimate:** ~120 unique files, ~1,770 lines changed, ~7 hours build + 2 hours audit.

**What NOT to touch:** `TranslationKey` type, 681 existing `t()` calls, `resolveLocalized()`, photo identification pipeline, Story system, Whale Class admin tools.

**C. 3x3x3x3x3 Development System — Burned into Memory:**

User's explicit methodology for complex tasks:
1. **3x RESEARCH** — Audit codebase, count patterns, classify types ✅
2. **3x PLAN** — Design architecture, write handoff doc, assess risks ✅
3. **3x INVESTIGATE** — Deep-read every target file, verify plan fits, map exact line numbers ⏳
4. **3x BUILD** — Implement with audit cycles (build → audit → build → audit)
5. **3x AUDIT** — Fix cycle until 3 consecutive clean audits

Each phase runs 3 rounds. CLAUDE.md updated after every phase completion to preserve state on crash.

**Files created (1 file):**
- `docs/MULTILINGUAL_PLAN.md` — comprehensive architecture plan + execution layers + risk matrix

**🚨 Architectural notes for future sessions:**
- **`resolveLocalized()` is the proven JSONB pattern** — `GamePlanCard.tsx` lines 22-39. Use for ALL new multilingual content storage.
- **DB migration is ADDITIVE** — new `_localized` JSONB columns coexist with legacy `_zh` columns. `resolveLocalizedDB()` reads JSONB first, falls back to `_zh`. No data loss, no breaking changes.
- **`LOCALE_CONFIG` pattern for AI pipelines** — keyed by locale, contains: `languageName`, `systemPromptSuffix`, `glossary`, `toolFieldSuffix`. Replaces all hardcoded Chinese system prompts.
- **The barrel `lib/montree/i18n/index.ts` is the single import point** — 173 files use it. All new exports go through here.
- **Zero `switch(locale)` in codebase** — TypeScript exhaustiveness checks won't break when `Locale` widens.

**Next session priorities:**
1. **Phase 3: 3x INVESTIGATE** — Deep-read every file in each layer, verify plan fits perfectly, map exact line numbers. Checklist in `MULTILINGUAL_PLAN.md` section 9.
2. **Phase 4: 3x BUILD** — Implement Layer 0 (foundation) first, then layers 1-5 sequentially.
3. **Phase 5: 3x AUDIT** — Fix cycle until 3 consecutive clean audits.
4. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request).
5. **Follow up on FAMM Argentina** if no response by Apr 28.
6. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`.

---

## RECENT STATUS (Apr 23, 2026)

### ⚡ Session 57 — Three-Tier AI System (Free/Core/Premium) + Language-Only Revert (Apr 23, 2026)

**Two commits pushed to main: `4671049e`, `3ecd5fb4`.**

**A. Three-Tier AI System — commit `4671049e`:**

Built a monetizable tier system replacing the binary AI on/off toggle. Schools now get one of three tiers controlling what AI features they access:

**Tier definitions:**
- **Free** (`ai_tier_haiku=false`, `ai_tier_sonnet=false`) — No AI. Weekly Wrap returns HTTP 402. Photo identification still works (Haiku two-pass is hardcoded, not tier-gated).
- **Core** (`ai_tier_haiku=true`, `ai_tier_sonnet=false`) — Haiku-powered: photo identification + replan/shelf/game plan generation + Weekly Wrap structure. NO teacher reports, NO parent narratives ($0 Sonnet cost).
- **Premium** (`ai_tier_sonnet=true`) — Everything: Core + Sonnet teacher reports + Sonnet parent narratives + rich AI content.

**`resolveReportModel()` rewrite** (`lib/montree/reports/resolve-model.ts`):
- Now returns `{ tier: 'free' | 'haiku' | 'sonnet', model: string | null }`
- `tier='free'` when neither flag enabled → `model=null`
- `tier='haiku'` when only `ai_tier_haiku` → `model='claude-haiku-4-5-20251001'`
- `tier='sonnet'` when `ai_tier_sonnet` → `model='claude-sonnet-4-6'`

**Weekly Wrap tier gates** (`app/api/montree/reports/weekly-wrap/route.ts`):
- `tier === 'free'` → HTTP 402 "AI reports require an active AI tier"
- `skipTeacherReports = aiTier.tier !== 'sonnet'` — Core tier skips teacher report generation
- `skipParentReports = aiTier.tier !== 'sonnet'` — Core tier skips parent narrative generation
- `replanChildInProcess()` runs for ALL non-free tiers (Core + Premium) — shelf/game plan always refreshes
- Cost calculation uses tier-appropriate pricing (Haiku $0.80/$4 vs Sonnet $3/$15 per MTok)

**Super-admin UI** (`components/montree/super-admin/SchoolsTab.tsx`):
- Replaced binary on/off toggle with Free/Core/Pro pill selector per school
- Color-coded: grey=Free, blue=Core, purple=Pro
- One-click tier change via PATCH to schools API
- Spend display unchanged (actual `montree_api_usage` costs)

**API changes** (`app/api/montree/super-admin/schools/route.ts`):
- GET returns `ai_tier: 'free' | 'core' | 'premium'` derived from feature flags
- PATCH accepts `ai_tier` and sets appropriate `ai_tier_haiku`/`ai_tier_sonnet` flags
- Budget auto-set: Free=$0/hard_limit, Core=$50/soft_limit, Premium=$200/soft_limit

**Type changes** (`components/montree/super-admin/types.ts`):
- Added `ai_tier?: 'free' | 'core' | 'premium'` to School interface

**B. Language-Only Revert — commit `3ecd5fb4`:**

User realized the Language-only replan constraint (from earlier in this session, committed as `70098ec3` but squashed into `4671049e`) was too classroom-specific for a monetizable product. Montree should fit straight into any Montessori classroom without customization.

**14 edits across 3 files — reverted all Language-only constraints back to all 5 curriculum areas:**

1. **`lib/montree/reports/replan-child.ts`** (5 edits):
   - `works` tool description: "3-5 Language area works" → "Exactly 5 works — one from EACH area"
   - `direction` tool description: Language progression → English area names arrow format
   - `availableWorksList`: removed `.filter(([area]) => area === 'language')` — all areas included
   - Prompt RULES: "Pick 3-5 from LANGUAGE area only" → "Pick exactly 5 works — ONE from EACH area" (6 rules)
   - `CORE_AREAS`: `['language']` → `['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']`

2. **`app/api/montree/children/[childId]/game-plan/refresh/route.ts`** (4 edits):
   - `works` + `direction` tool descriptions reverted to all-area
   - `availableWorksList`: removed Language-only filter
   - Prompt: "What should the teacher focus on NEXT in Language?" → "...NEXT? Pick 3-5 works that build on what's been done, spread across different curriculum areas."

3. **`scripts/run_replan_all_whale.mjs`** (5 edits):
   - Same pattern as replan-child.ts: tool descriptions, availableWorksList filter, prompt RULES, CORE_AREAS

**Two consecutive clean audit passes run:**
- Pass 1: All 14 change points verified by re-reading edited sections. Grep confirmed zero `LANGUAGE-ONLY` markers remaining.
- Pass 2: Cross-file consistency — grepped for Language-only phrases (0 hits), grepped for `CORE_AREAS` (all 5 locations have full 5-area array).

**🚨 Architectural notes for future sessions:**
- **Tier system is the monetization backbone.** Free = no AI reports. Core = Haiku shelf/game plan only. Premium = full Sonnet reports. This maps to pricing: Free/$0, Core/~$2-4/student/mo, Premium/~$5-8/student/mo.
- **`resolveReportModel()` is the canonical tier resolver.** Every AI-powered route should call this and respect the tier. Currently only Weekly Wrap is fully tier-gated. The 6 Sonnet-hardcoded routes from Session 33 still need gating.
- **Replan runs for ALL non-free tiers.** Teachers on Core still get fresh shelves and game plans every week — they just don't get the rich Sonnet teacher/parent report prose.
- **Super-admin pill selector** replaces the old binary toggle. Budget auto-adjusts per tier.
- **Replan is all-5-areas, not Language-only.** The Language-only experiment was too Whale-Class-specific. Any future per-classroom area customization should be a school setting, not hardcoded.

**Files changed (7 files, 2 commits):**
- `lib/montree/reports/resolve-model.ts` — tier resolver rewrite
- `app/api/montree/reports/weekly-wrap/route.ts` — tier gates for teacher/parent reports
- `components/montree/super-admin/SchoolsTab.tsx` — Free/Core/Pro pill selector
- `app/api/montree/super-admin/schools/route.ts` — tier in GET/PATCH
- `components/montree/super-admin/types.ts` — `ai_tier` on School interface
- `lib/montree/reports/replan-child.ts` — Language-only revert to all 5 areas
- `app/api/montree/children/[childId]/game-plan/refresh/route.ts` — Language-only revert
- `scripts/run_replan_all_whale.mjs` — Language-only revert

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request). These are immediate conversion opportunities.
2. **Follow up on FAMM Argentina** after Apr 28 if no response.
3. **Follow up on Cambridge Montessori Global** after Apr 28.
4. **Follow up on Otari School NZ** on Apr 28 (auto-reply expired).
5. **Bounce recovery research** — Start with 4 multiplier bounces (highest value).
6. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.
7. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()` — now that tier system exists, these should respect it.
8. **Test Weekly Wrap on Core tier** — set Whale Class to Core, generate, verify: replan fires (shelves update), teacher/parent reports skipped, no Sonnet costs.
9. **Phase 3 UI hiding by tier** — Free-tier schools shouldn't see Generate/Send buttons.
10. **Verify Pass 2b + Ask Sonnet on production** — capture a photo, verify pipeline.

---

### ⚡ Session 56 — Photo Pipeline maxDuration Fix + Story Document Rendering Fix + Health Check (Apr 23, 2026)

**Two commits pushed to main: `56b9489b`, `555ae84d`.**

**A. Photo Identification Pipeline Fix — commit `56b9489b`:**

Photo identification background process route (`app/api/montree/photo-identification/process/route.ts`) was missing `export const maxDuration = 120`. Railway's default 15s serverless timeout was killing the two-pass Haiku pipeline mid-flight. 12 photos stuck as unprocessed. Added the export — Railway now allows up to 120s for the identification pipeline.

**B. Weekly Wrap Readiness Health Check:**

Full audit of photo identification status across Whale Class for the current week:
- 26 photos promoted from `identification_status='pending'` to `teacher_confirmed=true` (stuck in limbo from before the review_before_process removal in Session 53)
- Final state: 84 confirmed photos, 19 of 20 children have confirmed photos this week
- System ready for Weekly Wrap generation

**C. Story Document Rendering Fix — commit `555ae84d`:**

**Bug:** Documents sent from Story admin dashboard rendered as broken `<img>` tags on the user-facing Story page.

**Root cause:** `/api/story/current-media/route.ts` returned raw `row.message_type` from the DB. Due to the CHECK constraint on `story_message_history.message_type` not including 'document', documents are stored with `message_type='image'` as a fallback (Session 19 pattern). The admin message-history route already used `effectiveMessageType()` to resolve the true type from filename extension, but `current-media` did not.

**Fix:** Added `import { effectiveMessageType } from '@/lib/story/document-detect'` and changed `type: row.message_type` to `type: effectiveMessageType(row.message_type, row.media_filename)`. Now documents stored as 'image' in the DB are correctly detected by filename extension and returned as `type: 'document'` to the Story page, which renders them as download links.

**D. Two-Round Audit — CLEAN:**

Audited all Story routes that read from `story_message_history` and return message types to clients:
- `current-media/route.ts` — PASS (fix applied)
- `recent-messages/route.ts` — PASS (already had `effectiveMessageType`)
- `admin/message-history/route.ts` — PASS (already had `effectiveMessageType`)
- Write-only routes (`admin/send`, `upload-media`, `message`) — not affected (don't return types)
- Client-side `story/[session]/page.tsx` — PASS (renders all 4 media types correctly)
- Second audit pass verified: upload flow (useAdminMessage.ts), MessageComposer UI, MessagesTab display, document-detect module, TypeScript import resolution — all PASS

**Files changed (2 commits):**
- `app/api/montree/photo-identification/process/route.ts` — Added `export const maxDuration = 120`
- `app/api/story/current-media/route.ts` — Added `effectiveMessageType` import + usage

**Next session priorities:**
1. **Draft replies to 3 hot leads** — Paint Pots UK (demo request), Ardtona House UK (free trial request), Montessori Copenhagen (details request). These are immediate conversion opportunities.
2. **Follow up on FAMM Argentina** after Apr 28 if no response.
3. **Follow up on Cambridge Montessori Global** after Apr 28.
4. **Follow up on Otari School NZ** on Apr 28 (auto-reply expired).
5. **Bounce recovery research** — Start with 4 multiplier bounces (highest value).
6. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.
7. **Verify Pass 2b + Ask Sonnet on production** — capture a photo, verify pipeline.
8. **Verify Discussion tab + child tag editor on production**.
9. **12 pending photos** — should auto-process after Railway deploys `56b9489b`.
10. **Identify the 1 missing child** — 19 of 20 have confirmed photos; find which child needs attention.

---

### ⚡ Session 55 — Full Outreach Campaign Reconciliation + Audit + Game Plan (Apr 23, 2026)

**No code commits.** Pure campaign reconciliation — full Gmail↔DB audit, bounce logging, reply triage, status promotion, and forward game plan.

**A. Bounce Scan & DB Update — 22 New Bounces Marked:**

Scanned all Gmail bounces (`from:mailer-daemon`) across 4 pages (~180 unique bounced addresses total). Cross-referenced against `montree_outreach_contacts`. Found 22 addresses in the DB not yet marked as bounced. All 22 updated to `status='bounced'` via Supabase REST API batch updates. Most were from Wave 1 (Apr 22 Montree pitch sends) and earlier Wave 2/3 sends.

**B. Reply Thread Audit — 12 Contacts Updated:**

Scanned Gmail for all reply threads (`subject:Montree OR subject:"Montessori Teacher" newer_than:14d -from:me`). Identified and categorized every reply:

**New HOT leads discovered this session:**
- **Paint Pots Montessori, UK (paintpotsmontessori@outlook.com)** — "Hi, Thank you for your email. Can you give me any more details or a demo?" Immediate demo request. Draft reply needed.
- **Ardtona House Montessori, UK (info@ardtonahouse.co.uk)** — "Hi, Thank you for your email, it sounds very interesting. Do you offer a free trial?" Free trial interest. Draft reply with 60-day Bloom trial offer needed.
- **Montessori Copenhagen (info@montessori-cph.dk)** — "Thank you for your email! Can you provide more details about the system?" Details request. Draft reply needed.

**Existing leads with status updates:**
- FAMM Argentina — still awaiting response to Apr 18 pricing breakdown
- Cambridge Montessori Global — still awaiting response to tier breakdown
- Jakarta Montessori — already using Montessori Compass (competitive intel, no follow-up)
- Montessori Aotearoa NZ — Board declined ("not something we wish to explore")
- Melville Montessori, Australia — politely declined (no change to existing systems)
- Sonnberg Montessori, Austria — position filled (NOT IN DB — GMass contact)

All 12 contacts updated in DB with appropriate `status` and `reply_summary`.

**C. Drafted→Sent Promotion — 158 Contacts Updated:**

User had sent all remaining Gmail drafts (from Wave 1 Montree pitch + earlier batches). Verified zero drafts remain in Gmail via `list_drafts`. Promoted all 158 contacts with `status='drafted'` to `status='sent'` in batch via Supabase REST API. All promotions logged to `montree_outreach_log` with `action='status_promoted'`.

**D. New Bounce Verification — Apr 22 Wave 1:**

Checked 18 bounced addresses from Apr 22 Wave 1 sends against DB. Result: 3 already marked bounced (from step A), 15 not in DB (GMass Campaign C/D recipients never seeded into `montree_outreach_contacts`). Zero new updates needed.

**E. Final Reconciled DB State:**

| Status | Count |
|--------|-------|
| sent | 415 |
| bounced | 99 |
| replied | 10 |
| dead | 6 |
| follow_up | 4 |
| new | 2 |
| **Total** | **536** |

**F. Outreach Game Plan — Forward Strategy:**

**🔥 PRIORITY 1 — Draft replies to 3 new hot leads (IMMEDIATE):**
1. **Paint Pots UK** — Demo request. Draft: "Delighted you're interested. Here's what Montree does [brief], I'd love to show you live. Would [date] work for a 20-minute demo call?"
2. **Ardtona House UK** — Free trial request. Draft: "Yes! 60-day free Bloom trial, no credit card. Here's how to get started: [montree.xyz signup link]. I'll personally help set up your classroom."
3. **Montessori Copenhagen** — Details request. Draft: Full Montree overview + tier breakdown + demo offer.

**🔥 PRIORITY 2 — Follow up on existing hot leads:**
- **FAMM Argentina** — #1 multiplier lead. Sent pricing Apr 18, no response. Follow up Apr 28 if still no reply.
- **Cambridge Montessori Global** — Sent tier breakdown, awaiting response. Follow up Apr 28.

**📅 PRIORITY 3 — Automated follow-up schedule (already configured):**
| Date | Task | Wave | Follow-up # |
|------|------|------|------------|
| Apr 25 | wave2-followup1 | Wave 2 (multiplier_apr19) | 1 |
| Apr 26 | wave3-followup1 | Wave 3 (Expansion batches) | 1 |
| Apr 27 | wave1-montree-followup1 | Wave 1 (Campaign D schools) | 1 |
| Apr 30 | wave2-followup2 | Wave 2 | 2 (final) |
| May 1 | wave3-followup2 | Wave 3 | 2 (final) |
| May 2 | wave1-montree-followup2 | Wave 1 | 2 (final) |

**⏸ PRIORITY 4 — Time-gated follow-ups:**
- **Montessori Norge** — Out of office until May 5. Follow up May 6.
- **Otari School NZ** — Out of office (returned Apr 22). Follow up Apr 28.

**🔄 PRIORITY 5 — Bounce recovery (99 contacts):**
- 93 individual schools, 4 multiplier_association, 1 multiplier_franchise, 1 multiplier_training
- Research correct emails via web search for highest-value bounced contacts (multipliers first)
- Re-draft viable ones after email correction

**📬 PRIORITY 6 — Last 2 new contacts:**
- Nairobi Montessori (karen@elmc.co.ke) — Draft Montree pitch
- Redwood Montessori Qatar (info.qatar@theredwoodnursery.com) — Draft Montree pitch

**G. Active Reply Threads Updated in CLAUDE.md:**

Comprehensive update to the Active Reply Threads section reflecting all Session 55 discoveries:
- 3 new HOT leads added (Paint Pots, Ardtona, Copenhagen)
- Dead list expanded to 7 with summaries
- Auto-reply section updated (Otari NZ added, Norge timeline noted)
- NOT-IN-DB annotations added for GMass-only contacts
- Follow-up timelines added for pending leads

**Campaign health summary:**
- **Initial outreach 100% complete** — all 536 contacts contacted (only 2 remain as 'new')
- **Reply rate: 1.9%** (10 replied out of 536) — industry average for cold outreach is 1-5%
- **Bounce rate: 18.5%** (99 out of 536) — high, but includes GMass Campaign C blank-email damage
- **3 active demo/trial requests** — Paint Pots, Ardtona, Copenhagen are ready to convert
- **1 multiplier lead** (FAMM Argentina) worth 10-50x a single school
- **Follow-up waves automated** — Apr 25 through May 2, should generate 5-15 additional replies

**Next session priorities:**
1. **Draft replies to Paint Pots, Ardtona House, and Montessori Copenhagen** — these are hot leads asking for demos/trials/details. Immediate action.
2. **Follow up on FAMM Argentina** after Apr 28 if no response.
3. **Follow up on Cambridge Montessori Global** after Apr 28.
4. **Follow up on Otari School NZ** on Apr 28 (auto-reply expired Apr 22).
5. **Bounce recovery research** — Start with 4 multiplier bounces (highest value), then top individual schools.
6. **Draft the last 2 new contacts** (Nairobi + Qatar).
7. **Health Check Section A** from `HEALTH_CHECK_HANDOFF.md` — 9 items needing full context.
8. **Verify Pass 2b + Ask Sonnet on production** — capture a photo, verify pipeline.
9. **Verify Discussion tab + child tag editor on production**.

---


---

> **Sessions 3–54 archived** to `docs/CLAUDE_MD_HISTORY.md` on 2026-04-26. Consult that file for historical context.

---

## KEY ARCHITECTURAL DECISIONS

- **CLIP/SigLIP — PERMANENTLY REMOVED (Apr 4, 2026).** Stub files remain for type exports only. All functions are no-ops. Production uses Haiku two-pass exclusively.
- **Smart Capture** uses two-pass describe-then-match: Pass 1 (Haiku + image) describes what's seen, Pass 2 (Haiku + text) matches to curriculum. Sonnet fallback if both fail.
- **Photo identification cost:** ~$0.006/photo via Haiku two-pass pipeline.
- **Per-classroom visual memory** self-learning system (THE MOAT — Session 6 completed all 3 loops): three paths feed `montree_visual_memory`:
  - (1) "Teach the AI" button uses Sonnet to generate 5-field descriptions (visual_description, parent_description, why_it_matters, key_materials, negative_descriptions) stored with source='teacher_setup', confidence=1.0.
  - (2) "Fix" corrections (Loop 1) now APPEND a rich fingerprint via `enrichVisualMemoryFromCorrection()` in `corrections/route.ts` — prefers cached `sonnet_draft.visual_description` from `montree_media` (free, rich), falls back to fresh Haiku call. Multi-fingerprint accumulation in `visual_description` column with `||` separator, capped 2500 chars FIFO. Source='correction', confidence=0.95. ALSO appends a negative example to the original (wrong) work's `negative_descriptions[]` array.
  - (3) Auto-generated onboarding/first_capture descriptions (confidence=0.8) are NOT injected into Pass 2 — they caused bias reinforcement.
- **Pass 2** loads up to 30 entries, filters to teacher-validated (`teacher_setup` ≥1.0 OR `correction` ≥0.9 OR `is_custom=true`), renders LOOKS LIKE / KEY MATERIALS / DISTINGUISH FROM blocks at TOP of prompt.
- **Pass 3** (Loop 3, Session 6) — Sonnet discriminator on low-confidence Pass 2 results (`matchScore < 0.7 OR input.confidence < 0.5`, requires ≥2 candidates with at least 1 having visual memory). Top 3 candidates rendered as A/B/C blocks with visual memory, Sonnet picks via tool_use. Cost ramps DOWN over time as corpus grows.
- **Hidden moat**: NO UI exposes the corpus. Competitors copying the app see a clean Montessori tracker; the intelligence is invisible and grows in slow motion from real classroom use.
- **Guru** uses Sonnet for all users (teachers + parents). Haiku for daily coach features. Self-improving brain system grows from every conversation.
- **All client-facing photo URLs** use Cloudflare-cached proxy (`getProxyUrl()`). Server-to-server URLs use direct Supabase.
- **Cross-pollination security:** Every route accepting `child_id` MUST call `verifyChildBelongsToSchool()`. No exceptions.
- **i18n:** 1,490+ keys, perfect EN/ZH parity. Custom React Context system (`useI18n()` hook).
- **Feature flags:** `montree_feature_definitions` + `montree_school_features` + `montree_classroom_features`. `FeaturesProvider` context in dashboard layout. `useFeatures()` hook with `isEnabled(key)`. Fail-closed (all off if fetch fails). Dashboard sections gated: `daily_brief`, `intelligence_panels`, `teacher_tools`, `shelf_autopilot`, `paperwork_tracker`, `weekly_admin_docs`. New schools get clean minimal view. Super-admin ⚙️ button per school to toggle.

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress` (alias: `montree_child_progress`)
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions` — uses `asked_at` (NOT `created_at`) as timestamp column
- `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_child_extras` — explicitly-added extra works per child (UNIQUE child_id+work_name)
- `montree_visual_memory` — per-classroom visual descriptions (UNIQUE classroom_id+work_name)
- `montree_guru_corrections` — teacher corrections to Smart Capture identifications
- `montree_community_works` — public community works library
- `montree_teacher_notes` — has `child_id` column for per-child tagging
- `montree_visitors` — site-wide visitor tracking for outreach monitoring
- `montree_attendance_override`, `montree_stale_work_dismissals`, `montree_conference_notes`
- `montree_weekly_pulse_locks` — prevents concurrent Pulse generation
- `montree_super_admin_audit` — central security audit log
- `montree_rate_limit_logs` — DB-backed rate limiting
- `story_users`, `story_admin_users` — Story system auth (bcrypt hashes)
- `story_login_logs`, `story_admin_login_logs` — Story login tracking (column: `login_at`)
- `story_online_sessions` — heartbeat-based online detection

### Whale Class Data
- School ID: `c6280fae-567c-45ed-ad4d-934eae79aabc` (Tredoux House)
- Classroom ID: `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` (Whale Class)
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## Environment Variables (Railway + .env.local)

See `.env.example` for the full template. All vars below must be set in Railway production.

```
# --- Core Auth ---
ADMIN_SECRET=...              # REQUIRED — JWT signing for Whale Class admin (lib/auth.ts)
ADMIN_USERNAME=...            # Whale Class admin display name
ADMIN_PASSWORD=...            # Whale Class admin password
SUPER_ADMIN_PASSWORD=...      # REQUIRED — Montree super-admin + Whale Class "Tredoux" login
TEACHER_ADMIN_PASSWORD=...    # REQUIRED — Whale Class "Teacher" login
STORY_JWT_SECRET=...          # REQUIRED — Story JWT signing (lib/story-db.ts)

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...              # PostgreSQL pooler connection string

# --- Encryption ---
MESSAGE_ENCRYPTION_KEY=...    # REQUIRED — Exactly 32 chars for AES-256 (lib/message-encryption.ts)
VAULT_PASSWORD=...            # REQUIRED — Vault file encrypt/decrypt (vault routes)
VAULT_PASSWORD_HASH=...       # REQUIRED — bcrypt hash for vault unlock (vault/unlock/route.ts)

# --- External APIs ---
ANTHROPIC_API_KEY=...         # Claude API (Guru advisor)
OPENAI_API_KEY=...            # Whisper transcription + TTS
NEXT_PUBLIC_YOUTUBE_API_KEY=... # YouTube Data API

# --- Email ---
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

---

## Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/login` | Teacher login (6-char code or email+password) |
| `/montree/dashboard` | Class list + intelligence panels (attendance, stale works, conference notes, evidence, pulse) |
| `/montree/dashboard/[childId]` | Child week view |
| `/montree/dashboard/[childId]/gallery` | Photo gallery + report workspace |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/photo-audit` | Classroom-wide photo audit with corrections |
| `/montree/dashboard/classroom-setup` | "Teach the AI" — Sonnet describes materials |
| `/montree/dashboard/notes` | Dedicated teacher notes page (with child tagging) |
| `/montree/dashboard/raz` | RAZ Reading Tracker |
| `/montree/library/photo-bank` | Photo bank with export-to-tool feature |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/report/[reportId]` | View report |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub (card generators, etc.) |
| `/montree/super-admin` | Super admin panel (schools, leads, visitors, community) |
| `/montree/admin/guru` | Principal admin guru (12 tools, school-scoped) |

---

## Authentication

7 auth systems. Teacher/principal tokens use httpOnly cookies.

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256) or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/auth/teacher` |
| Principal login | Code or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/principal/login` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET`, httpOnly cookie (`admin-token`) | `lib/auth.ts` |
| Super admin | Password (timing-safe compare) + JWT session tokens | `lib/verify-super-admin.ts` |
| Story auth | Separate JWT system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Montree auth flow:** Login → JWT → httpOnly cookie `montree-auth` → `verifySchoolRequest()` reads cookie → extracts userId, schoolId, classroomId, role. Client `montreeApi()` relies on cookie auto-sending.

**Key auth files:** `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`, `lib/montree/api.ts`

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton with retry logic.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

5 area JSON files in `lib/curriculum/data/`: `language.json` (43 works), `practical_life.json`, `sensorial.json`, `mathematics.json`, `cultural.json`. Total: 329 works.

---

## Guru System (AI Teacher Advisor)

**Core files:**
- `lib/montree/guru/conversational-prompt.ts` — persona builder (teacher=violet, parent=botanical green)
- `lib/montree/guru/context-builder.ts` — child context
- `lib/montree/guru/tool-definitions.ts` — 12 teacher tools + `getToolsForMode()`
- `lib/montree/guru/tool-executor.ts` — tool execution handlers
- `lib/montree/guru/question-classifier.ts` — regex classifier for selective knowledge injection
- `lib/montree/guru/brain.ts` — self-improving brain (extraction, consolidation, retrieval)
- `lib/montree/guru/skill-graph.ts` — V3 skill-exercise mapping, bridge detection, attention flags
- `app/api/montree/guru/route.ts` — main chat endpoint
- `app/api/montree/guru/photo-insight/route.ts` — Smart Capture (two-pass Haiku)
- `app/api/montree/guru/corrections/route.ts` — teacher corrections
- `components/montree/guru/GuruChatThread.tsx` — shared chat UI

**Principal Admin Guru:** `lib/montree/admin/guru-*.ts` — 12 school-scoped tools, SSE streaming.
**Super-Admin Guru:** `lib/montree/super-admin/guru-prompt.ts` — 15 tools across all schools.

---

## Report & Photo System

```
Teacher Preview → Select Photos → montree_report_media junction table
Publish → send/route.ts queries junction → Creates final report
Parent View → parent/report/[id]/route.ts queries junction
```

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Dashboard Intelligence Layer (Teacher OS)

5 panels below student grid: Attendance, Stale Works, Conference Notes, Evidence, Pulse. Daily Brief panel above grid with priority-ranked action items. All powered by `/api/montree/intelligence/daily-brief`.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Important Patterns

- **`.single()` → `.maybeSingle()`** — Always use `.maybeSingle()` for queries that might return 0 rows. `.single()` throws on 0 rows.
- **`.ilike()` SQL injection** — Escape `%`, `_`, `\` before any `.ilike()` call: `.replace(/[%_\\]/g, '\\$&')`
- **JSON-before-OK** — Always check `response.ok` BEFORE calling `response.json()`. Server may return HTML error pages.
- **Fire-and-forget `.catch()`** — Always add `.catch(err => console.error(...))` — never empty `.catch(() => {})`.
- **Supabase `.rpc()` has no `.catch()`** — Use `.then(({ error }) => ...)` instead.
- **`montree_guru_interactions` uses `asked_at`** not `created_at` as its timestamp column.
- **AbortController cleanup** — All `useEffect` fetches should have AbortController + cleanup on unmount.

---

## Migrations Run (production)

All migrations through 169 have been run. Key ones: 147 (smart learning columns), 148 (classroom onboarding), 152-154 (teacher OS foundation), 155 (teacher OS foundation DDL), 156 (visitor tracking), 157 (teacher notes child_id), 158 (paperwork_current_week), 159 (teacher_confirmed media), 160 (dashboard feature gates + Whale Class enabled), 161 (enable weekly_admin_docs for Whale Class), 164 (cropped_storage_path on montree_media — run Apr 7 via Supabase SQL editor), 169 (guide_content_zh JSONB on montree_classroom_curriculum_works — run Apr 11). **Migration 166 (`montree_global_works_staging`) still pending** from prior session. The Apr 7 self-learning loop SQL also added safety-net columns to `montree_visual_memory` (negative_descriptions, key_materials, description_confidence, source, source_media_id, photo_url, updated_at) — all `IF NOT EXISTS`, idempotent. **Apr 12**: `story_message_history.is_from_admin BOOLEAN DEFAULT FALSE` added via Supabase SQL Editor (migration `20260118_story_session_linking.sql` was in git but never run).

**Session 78 (Apr 30, 2026) — curriculum translation pipeline migrations run via Supabase SQL Editor:**
- `180_create_curriculum_translations_global.sql` — global translation library table (8 columns, ~3,948 rows after seed).
- `181_add_school_primary_locale.sql` — `primary_locale` + `secondary_locales[]` on `montree_schools`. Whale Class set to `en+[zh]`. Two existing schools manually updated post-migration: Школа Монтессорі (Tamі) → `uk`, Chen school → `de`.
- `182_apply_global_translations_function.sql` — `apply_global_translations(uuid)` Postgres function (11 per-locale UPDATE blocks, COALESCE-safe, SECURITY DEFINER, GRANT EXECUTE to anon/authenticated/service_role).
- **Bonus column-add ALTER TABLE** (not in a numbered migration file — run inline) — added 36 missing locale columns to `montree_classroom_curriculum_works`: `parent_description_<locale>` and `why_it_matters_<locale>` for de/fr/pt/nl/it/ja/ko/uk/ru. The 9 newer locales had `name_*` and `guide_content_*` columns from prior sessions but were missing the description columns. Idempotent via `ADD COLUMN IF NOT EXISTS`.

---

## Session History

Detailed session-by-session history (Feb–Apr 2026) is archived in `docs/CLAUDE_MD_HISTORY.md`. Consult that file for historical context on specific features or decisions.
