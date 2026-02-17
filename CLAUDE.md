# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 16.1.1 app with two systems:
- **Whale Class** (`/admin/*`) - Admin tools (card generators, description review, etc.)
- **Montree** (`/montree/*`) - Real SaaS multi-tenant Montessori school management

Production: `https://montree.xyz` (migrated from teacherpotato.xyz — old domain returns 405 on API calls)
Deploy: Railway auto-deploys on push to `main`
Git remote: `git@github.com:Tredoux555/whale-class.git` (SSH — Cowork VM key "Cowork VM Feb 15" added Feb 15, 2026; old "Cowork VM" Feb 11 key is stale)
Local path: `/Users/tredouxwillemse/Desktop/ACTIVE/whale`

---

## 🔥 NEXT SESSION PRIORITIES (Feb 18, 2026)

### Onboarding System — Phase 3-5 Integration (Priority #1)

**What:** Wire up the completed onboarding foundation (Phase 1-2) into actual pages so users see guided tutorials on first use.

**Status:** Foundation complete (8 files, 968 lines), integration not started. Opus audited and fixed 7 issues in Sonnet's code. Phase 3-5 integration code was pushed but NOT yet tested in production.

**Handoff:** `docs/HANDOFF_ONBOARDING_SYSTEM_FEB17.md` (comprehensive step-by-step guide)

**Estimated Effort:** 3-4 hours

**Steps:**
1. Run migration 131: `psql $DATABASE_URL -f migrations/131_onboarding_system.sql`
2. Test existing integration on live site (data-tutorial attributes + FeatureWrapper were added in previous session)
3. Verify all 4 user flows (Teacher, Principal, Homeschool Parent, Parent)
4. Fix any issues found during testing

**Plan File:** `.claude/plans/splendid-herding-tome.md`

---

### Story Vault Image Viewer (Priority #2)

**Handoff:** `docs/HANDOFF_VAULT_IMAGE_VIEWER_FEB16.md` — Ready for implementation, 2-4 hours

---

### Curriculum Inconsistency Resolution (Priority #3)

**What:** Static JSON files have 329 works but Brain DB and some creation flows only seed 220. Need to audit and align all curriculum data sources.

**Status:** Deep audit completed (Feb 17), inconsistencies documented. Static JSON is the authoritative source (329 works). `setup-stream` route already fixed to use static JSON exclusively.

**Key finding:** `principal/setup-stream` was querying Brain DB (220 works) instead of static JSON (329 works). Fixed to use `loadAllCurriculumWorks()` from static files.

**Remaining:** Verify all other curriculum creation flows also use static JSON as source of truth.

---

## CURRENT STATUS (Feb 17, 2026)

### ✅ DEPLOYED TODAY (Feb 17, 2026)

**Late Session Fixes (commit `f42529e`):**
- ✅ CurriculumWorkList: replaced emoji area icons (🧹👁️🔢📚🌍) with uniform AreaBadge colored circles (P/S/M/L/C)
- ✅ Principal setup overlay: replaced chaotic statusMessage animation with smooth curated 6-step progression (timer-based, CSS transitions, step indicators)
- ✅ Cleaned up stale `statusMessage` state — button now shows simple spinner during loading
- ✅ `setup-stream` route: fixed to use static JSON curriculum (329 works) instead of Brain DB (220 works)
- ✅ Admin panel: new classroom/student management pages, guru page, student search API
- ✅ Tutorial complete API endpoint + teacher tutorial flag migration (130)
- ✅ English Language Curriculum Guide DOCX created
- ✅ Zustand added to dependencies

**Teacher Login Code Fix (Complete):**
- ✅ Code deployed (commits `b4917e1`, `99a3d0b`, `68887b2`)
- Root cause: `principal/setup-stream` and `principal/setup` routes generated lowercase codes and never set `password_hash` (NULL). Auth route normalized to uppercase → case mismatch + NULL lookup = all 3 auth steps failed.
- Fix: All 5 teacher-creation routes now use uppercase charset + `legacySha256()` for `password_hash`
- Auth route Step 2 now case-insensitive (`.ilike()`), handles NULL password_hash, tries both cases in bcrypt fallback
- `onboarding/route.ts` also fixed: `hashPassword` (bcrypt) → `legacySha256` (SHA-256)
- Backward compatible: old teachers with lowercase login_code or bcrypt hashes still work via fallback paths

**My Classroom Cleanup:**
- ✅ Principals no longer get auto-created "My Classroom" during onboarding (`try/instant`)
- ✅ Overview API filters out empty "My Classroom" placeholders (name match + 0 teachers + 0 students)

**Handoff:** `docs/HANDOFF_LOGIN_CODE_FIX_FEB17.md`

---

### 🎓 Comprehensive Onboarding System — PHASE 1-2 COMPLETE (Feb 17, 2026)

Platform-wide onboarding system for guiding all user types through features on first use.

**Status:** Foundation complete (database + API + components), integration pending

| Phase | What | Status |
|-------|------|--------|
| 1 | Database (3 tables) + API (3 endpoints) | ✅ Complete |
| 2 | Components (OnboardingOverlay, FeatureWrapper) + State (Zustand) | ✅ Complete |
| 3-5 | Integration (data-tutorial attrs + page wrapping) | ❌ Not Started |

**What's Ready:**
- ✅ Migration 131 created (progress, settings, events tables)
- ✅ 3 API routes (settings toggle, progress tracking, skip module)
- ✅ Super-admin toggle UI (4 checkboxes for role-based enable/disable)
- ✅ OnboardingOverlay component (tutorial modal with SVG spotlight effect)
- ✅ FeatureWrapper component (contextual tour trigger)
- ✅ Zustand store with localStorage persistence
- ✅ Type-safe configs (role-specific onboarding flows)
- ✅ 968 lines of code written

**What's Not Ready:**
- ❌ Migration 131 NOT run against Supabase (tables don't exist yet)
- ❌ data-tutorial attributes NOT added to pages (~20 files)
- ❌ FeatureWrapper NOT used on pages (no wrapping yet)
- ❌ State initialization NOT added to layouts
- ❌ Zero user-facing changes (foundation only)

**Estimated Time to Complete:** 3-4 hours for Phase 3-5 integration + testing

**Architecture:**
- 3 PostgreSQL tables: `montree_onboarding_progress` (step tracking), `montree_onboarding_settings` (role toggles), `montree_onboarding_events` (analytics)
- JWT auth via `verifySchoolRequest()` (existing pattern)
- Super-admin password protection on settings PATCH
- Zustand store with Set-based completedSteps tracking
- SVG mask for spotlight cutout effect
- Progressive disclosure (tours trigger on first visit per feature)

**Files Created (8 new):**
- `migrations/131_onboarding_system.sql` — 3 tables + 5 indexes
- `app/api/montree/onboarding/settings/route.ts` — Toggle GET/PATCH
- `app/api/montree/onboarding/progress/route.ts` — Progress GET/POST
- `app/api/montree/onboarding/skip/route.ts` — Skip module POST
- `lib/montree/onboarding/configs.ts` — Type-safe step definitions
- `components/montree/onboarding/OnboardingOverlay.tsx` — Tutorial modal
- `components/montree/onboarding/FeatureWrapper.tsx` — Page wrapper
- `hooks/useOnboarding.ts` — Zustand store (154 lines)

**Files Modified (2):**
- `app/montree/super-admin/page.tsx` — Added toggle UI section (+65 lines)
- `package.json` — Added zustand dependency

**Onboarding Flows Defined:**
- Teachers: 5 modules, ~15-20 steps (student mgmt, week view, curriculum, capture, guru)
- Principals: 3 modules, ~9 steps (classroom mgmt, teacher mgmt, overview)
- Homeschool Parents: Same as teachers, auto-derived with label swaps
- Parents: 2 modules, ~5 steps (dashboard overview, reports/photos)

**Next Steps:**
1. Run migration 131 against Supabase: `psql $DATABASE_URL -f migrations/131_onboarding_system.sql`
2. Audit foundation with Opus (comprehensive handoff written)
3. Decide: Continue with Phase 3-5 or iterate on foundation
4. If approved: Add data-tutorial attributes to ~20 pages (3-4 hours)

**Plan File:** `.claude/plans/splendid-herding-tome.md`
**Handoff:** `docs/HANDOFF_ONBOARDING_SYSTEM_FEB17.md`

**Key Design Decisions:**
- Zustand over Redux (simpler API, built-in persistence)
- Normalized tables over JSONB (easier analytics, better indexing)
- Singleton settings table (no env restarts needed)
- Step-level tracking (not just module completion)
- Client + server storage (offline support + DB backup)

---

### ✅ DEPLOYED PREVIOUSLY (Feb 16, 2026)

**Location Tracking:**
- ✅ Code deployed (commit 286ccc35)
- ✅ Migrations run (126, 127, 128)
- ✅ Super-admin panel shows flag emoji + city/country for all new signups
- IP geolocation via ip-api.com (45 req/min free tier)
- Captures: country, city, region, timezone, IP address

**Three-Issue Child Week Fix:**
- ✅ Code deployed (commit 333d884e)
- ✅ Migration 124 run (montree_child_extras table)
- Extras leak fixed (no more historical record pollution)
- Auto-mastery (setting focus #15 masters works 1-14 automatically)
- Area icon uniformity (shared AreaBadge component across 11 pages)

**Cleanup:**
- ✅ Deleted dead homeschool auth route
- ✅ Added audit docs + task list

**Handoffs:** `docs/AUDIT_LOCATION_TRACKING_FEB16.md`, `docs/SUGGESTED_TASKS_FEB16.md`, `docs/HANDOFF_THREE_ISSUE_FIX.md`

---

### 🏠 Montree Home — ALL 4 PHASES DEPLOYED (Feb 15, 2026)

Standalone Montessori homeschool product. Shared codebase with classroom version.

**Product:** Free activity tracking + paid Guru ($5/month per child). Parents self-register with code-based login, manage multiple children, track works across 5 areas using the same UI as teachers.

**Architecture:** Homeschool parents stored in `montree_teachers` table with `role='homeschool_parent'`. They get a school (`plan_type: 'homeschool'`), a classroom ("My Home"), seeded curriculum, and go through IDENTICAL onboarding as teachers. 30-day JWT/cookie TTL (vs 7 for teachers). Teacher auth reads role from DB and issues correct token.

**NO separate table.** No `montree_homeschool_parents`. No separate auth route. No separate dashboard. Same system, different role.

**4 Phases:**

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation — auth + DB migration + signup/login | ✅ Done (Feb 15) |
| 2 | Dashboard — role-based UI trimming, hide school features for parents | ✅ Done (Feb 15) |
| 3 | Guru — freemium gate + paywall + Stripe billing + homeschool prompt | ✅ Done (Feb 15) |
| 4 | Curriculum browser — browse works by area, age filtering, materials list | ✅ Done (Feb 15) |

**Pricing:** Free = full tracking. Paid = Guru access ($5/child/month). 3 free Guru prompts for new signups, then hard paywall.

**Plan file:** `.claude/plans/montree-home-v1.md`
**Handoff Phase 1:** `docs/HANDOFF_MONTREE_HOME_PHASE1.md`
**Handoff Phase 2:** `docs/HANDOFF_MONTREE_HOME_PHASE2.md`
**Handoff Phase 4:** `docs/HANDOFF_MONTREE_HOME_PHASE4.md`

**Phase 1 commits:** `9378007e` (initial), `cb5bfd24` (corrected — identical teacher flow)
**Phase 2 commit:** `fc1521ef` (dashboard trimming — 6 files, isHomeschoolParent helper, hide Invite Parent + Labels, child vs student labels, role in auth response)

**Phase 2 changes:** `isHomeschoolParent()` helper in `lib/montree/auth.ts`. Dashboard shows "children" vs "students". Child week view hides Invite Parent button+modal. Students page hides Labels button, swaps Student→Child. Onboarding uses "Enter My Home", "Add Your Children". CRITICAL: teacher auth route now returns `role` in teacher response object (was missing — would break session role detection on login).

**Phase 3 commit:** `c5e18ef2` (Guru freemium — 7 files: 3 modified, 4 new)

**Phase 3 changes:**
- `app/api/montree/guru/route.ts` — Freemium gate: checks `guru_prompts_used` before AI call, returns `guru_limit_reached` error when 3 free prompts used. Increments counter for free-tier homeschool parents. Also passes `isHomeschoolParent` flag to prompt builder.
- `app/api/montree/guru/status/route.ts` — NEW: Returns guru access level (`unlimited`/`paid`/`free_trial`), prompts used/remaining, `is_locked` flag. Teachers get unlimited. Homeschool parents get trial or paid based on Stripe subscription.
- `app/api/montree/guru/checkout/route.ts` — NEW: Creates Stripe Checkout session for Guru subscription. Gets/creates Stripe customer on `montree_teachers`, counts children for quantity billing ($5/month × N children).
- `app/api/montree/guru/webhook/route.ts` — NEW: Stripe webhook handler for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Updates `guru_plan`/`guru_subscription_status`/`guru_current_period_end` on teacher record.
- `app/montree/dashboard/guru/page.tsx` — Paywall modal overlay (upgrade CTA with features list), free trial prompts counter banner, checkout flow, role-aware quick questions and placeholder text, handles `?upgrade=success|cancel` URL params.
- `lib/montree/guru/prompt-builder.ts` — `HOMESCHOOL_ADDENDUM` injected into system prompt for homeschool parents: addresses as parent, replaces classroom language, suggests DIY materials, home environment tips, encourages.
- `migrations/127_guru_freemium.sql` — Adds `guru_plan`, `guru_prompts_used`, `guru_stripe_customer_id`, `guru_stripe_subscription_id`, `guru_subscription_status`, `guru_current_period_end` columns to `montree_teachers`. Indexes on Stripe IDs.

**Phase 3 env vars needed:**
- `STRIPE_PRICE_GURU_MONTHLY` — Stripe Price ID for the Guru monthly subscription
- `STRIPE_WEBHOOK_SECRET_GURU` — Stripe webhook signing secret for the Guru endpoint

**Migrations needed:** Run `migrations/126_homeschool_tables.sql` + `migrations/127_guru_freemium.sql` against Supabase before testing. ⚠️ NOT YET RUN.

**Deploy commit:** `d04eb483` (Feb 15, 2026 — pushed via GitHub REST API, all 30 files in single commit)

**Phase 4 commit:** `62ad6772` (curriculum browser — 2 files: 1 new, 1 modified), `cd9eb8c7` (audit fix)

**Phase 4 changes:**
- `app/montree/dashboard/curriculum/browse/page.tsx` — NEW: Read-only curriculum browser. Imports all 5 static JSON files directly (no API). 5 area tabs with AREA_CONFIG colors, search by name/description/materials, age range filter (Year 1/Year 2/Year 3), collapsible categories, expandable work cards with full details (materials, aims, prerequisites, levels with YouTube demo links). Role-aware labels for homeschool parents ("Materials You'll Need", "What Your Child Learns", "Hidden Benefits", "How They Self-Correct"). Prerequisite names resolved via cross-area lookup map.
- `app/montree/dashboard/curriculum/page.tsx` — Added "Browse Guide" button in header linking to `/montree/dashboard/curriculum/browse`.

**Dead file to delete:** `app/api/montree/auth/homeschool/route.ts` — created in initial push, no longer called. FUSE-locked, delete when possible.

**Resolved decisions:**
- Branding: Same as classroom (same Mercedes, different driver)
- Signup: Third option on existing try flow ("I'm a parent")
- Custom works: Yes, same WorkPickerModal UI
- Observations: Yes, full system, same as classroom
- Onboarding: IDENTICAL to teacher — school + classroom + add children from dashboard
- Login: Same page, same auth endpoint — teacher auth handles both roles
- **CRITICAL:** This is NOT a rebuild. Homeschool parents are teachers with `role='homeschool_parent'`. Same table, same classroom, same everything. Do NOT create separate systems, tables, or routes.

---

### Security Hardening — ALL 9 PHASES COMPLETE ✅

9-phase security hardening project COMPLETE. All phases done.

| Phase | Name | Status |
|-------|------|--------|
| 1 | API Auth (JWT for all routes) | ✅ Done |
| 1B | Parent session tokens | ✅ Done |
| 2 | bcrypt password migration (100% audited) | ✅ Done |
| 3 | Quick security wins (11 fixes across ~25 files) | ✅ Done + Audited |
| 4 | Secret rotation & env hardening (12 fixes across ~20 files) | ✅ Done + Audited |
| 5 | Password policy & rate limiting (23 files, 1123 insertions) | ✅ Done |
| 6 | Input sanitisation & CSP headers (17 files) | ✅ Done |
| 7 | Session management (timing-safe auth, HttpOnly cookies, CSRF) | ✅ Done |
| 8 | Logging & monitoring (6 fixes across ~15 files) | ✅ Done |
| 9 | Production security review (8 fixes across ~45 files) | ✅ Done |

**Handoff docs:**
- `docs/HANDOFF_SECURITY_PHASE4_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE6_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE7_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md`
- `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`

**Plan files:** `.claude/plans/phase5-plan-v3.md`, `.claude/plans/phase6-plan-v3.md`, `.claude/plans/phase7-plan-v3.md`, `.claude/plans/phase8-plan-v2.md`, `.claude/plans/phase9-plan-v1.md`

### ✅ POST-SECURITY ACTIONS — KEY ROTATION COMPLETE

**MESSAGE_ENCRYPTION_KEY rotation** — ✅ DONE (Feb 11, 2026). Old insecure default key rotated to a new random 32-char key. Script (`scripts/rotate-encryption-key.ts`) processed 1,619 messages: 1,381 re-encrypted (CBC→GCM), 238 plaintext skipped, 0 failures. Pagination bug fixed in script (Supabase 1000-row default limit). Key updated on Railway and in `.env.local`. Verified: 5/5 sample messages decrypt correctly.

**Frontend update** — ✅ DONE. Super-admin panel now sends password with audit POST and schools GET.

### Other Open Items

**Domain Migration** — ✅ DONE. `montree.xyz` is live. Old `teacherpotato.xyz` redirects to `www.teacherpotato.xyz` and returns 405 on API calls.

**Codebase Cleanup** — ✅ ALL PHASES COMPLETE:

| Phase | What | Status |
|-------|------|--------|
| 1 | Security fixes (secret + dead auth route) | ✅ Done |
| 2 | Consolidate 3 Supabase clients into one | ✅ Done |
| 3 | Delete dead code + dedup 27 game routes | ✅ Done |
| 4 | Split 3 oversized files (918, 1115, 1243 lines) | ✅ Done |
| 5 | Strip console.log statements (219 → 0) | ✅ Done |
| 6 | Fix `: any` type annotations (23 → 2 trivial) | ✅ Done |

---

### 🔧 Three-Issue Fix — ✅ CODE COMPLETE (Feb 12, 2026)

Three fixes to the child Week view. **Needs migration + push to deploy.**

| Issue | What | Status |
|-------|------|--------|
| 1 | Extras Leak — new `montree_child_extras` table, `is_extra` flag | ✅ Done |
| 2 | Auto-Mastery — batch-master API, fire-and-forget on focus set | ✅ Done |
| 3 | Area Icon Uniformity — shared `AreaBadge` component across 11 pages | ✅ Done |

**Deploy steps:**
1. Run `migrations/124_child_extras_table.sql` against Supabase
2. `git push origin main` — ⚠️ BLOCKED (see Git Push section below)

**Files created (3 new):**
- `migrations/124_child_extras_table.sql` — extras table + index
- `app/api/montree/progress/batch-master/route.ts` — batch mark works as mastered
- `components/montree/shared/AreaBadge.tsx` — shared colored-circle area icon

**Files modified (~19):**
- `lib/montree/types.ts` — extended AREA_CONFIG with decorative fields
- `app/api/montree/progress/route.ts` — fetches extras, adds `is_extra` flag
- `app/api/montree/progress/update/route.ts` — `remove_extra`, `is_extra`, focus cleanup
- `app/montree/dashboard/[childId]/page.tsx` — extras filter + wheelPickerWorks pass-through
- `hooks/useWorkOperations.ts` — removeExtra, addExtra, addWork, auto-mastery logic
- `components/montree/child/FocusWorksSection.tsx` — AreaBadge + is_extra interface
- `components/montree/child/WorkPickerModal.tsx` — is_extra interface
- `lib/montree/work-matching.ts` — is_extra interface
- 11 pages refactored for AreaBadge (progress, detail, gallery, summary, weekly-review, reports, print, milestones, AreaProgressGrid, students, curriculum)

**Bug fixed:** students/page.tsx had Practical Life and Language colors swapped.

**Handoff:** `docs/HANDOFF_THREE_ISSUE_FIX.md`

---

### 🎬 Promo Video Production — ✅ COMPLETE (Feb 13, 2026)

Produced optimized social media videos from raw screen recording (`Final Edit Montree Intro.mp4`).

**Outputs (all in `Promo Videos/`):**
- `Montree_Shorts_9x16.mp4` — 1080×1920, 57.9s, YouTube Shorts / Reels / TikTok
- `Montree_Social_Square.mp4` — 1080×1080, 57.9s, Instagram feed / Facebook / LinkedIn
- `Montree_Thumbnail.png` — 1280×720, YouTube thumbnail
- `YOUTUBE_SEO_UPLOAD_GUIDE.md` — Ready-to-paste title, description, tags, upload settings, social captions

**What was done:**
- Cropped source to preserve webcam face overlay (top 25px macOS bar removed, Chrome UI kept)
- Burned in captions from SRT file (Poppins Bold, white on dark teal box)
- Shorts: branded top bar (logo + hook) + bottom bar (features + CTA) + intro/outro cards
- Square: branded bottom bar + intro/outro cards
- All assets use Montree brand colors (dark teal #0D3330, emerald #4ADE80, Poppins font)
- SEO guide includes YouTube metadata + social media captions for all platforms

**Known issues:** Thumbnail face extraction slightly off (needs coordinate tuning in `build_thumbnail_v2.py`). Browser chrome visible in video (required to keep webcam face).

**Handoff:** `docs/HANDOFF_PROMO_VIDEO_PRODUCTION.md`

---

### 📱 Social Media Uploads & Group Posting — ✅ MOSTLY COMPLETE (Feb 14, 2026)

**Platform uploads:**

| Platform | Handle | What | Status |
|----------|--------|------|--------|
| Instagram | @montreexyz | Onboarding reel + Intro reel | ✅ Live |
| Facebook | facebook.com/montreexyz | Onboarding reel + Intro reel | ✅ Live |
| TikTok | @montreexyz | Onboarding video + Intro video | ✅ Live |
| LinkedIn | tredoux@montree.xyz account | Intro video + Onboarding video | ✅ Posted (Feb 14) |

**Tutorial video branding:** Created branded versions of tutorial screen recording with minimalist Montree overlays.
- `Promo Videos/Video 3 - Tutorial/Montree_Tutorial_Social_BRANDED.mp4` (70MB, 1080×1080)
- `Promo Videos/Video 3 - Tutorial/Montree_Tutorial_Youtube_BRANDED.mp4` (86MB, 1920×1080)

**Facebook group reel campaign — 17 groups posted (Feb 14, 2026):**
Shared intro reel (https://www.facebook.com/reel/1437788707724055) to 17 Montessori Facebook groups with standard caption + montree.xyz CTA + social links. Estimated combined reach: ~815K+ members.

Top groups: Montessori activities (157K), Montessori Works at home and in schools (121K), McDaniels International Montessori Virtual (~88K), Montessori Matters (78K), MONTESSORI TEACHING METHODOLOGY (72K), ...MONTESSORI... (61K), Montessori Teachers International (56K), Montessori at HOME (51K), Montessori Materials For School (43K), + 8 more.

**Groups posted today (Feb 14, late session):** Montessori Research Interest Group, McDaniels International Montessori (Virtual)

**Key workflow notes for group posting:**
- Do NOT use hashtags in caption (triggers autocomplete dropdown that dismisses dialog)
- Always verify caption with `cmd+Home` before clicking Post
- Use `find` tool to locate text inputs (Facebook DOM changes frequently)
- Groups only appear in Share list if membership is approved

**Bug fix:** `html2canvas` → `html2canvas-pro` in `components/montree/FeedbackButton.tsx` (Tailwind CSS v4 `lab()` color function compatibility)

**Status:** All visible groups in share list posted to (as of Feb 14 late session). 4 pending membership groups not yet accessible (Montessori at Home 3-6, Materials for Sale, AMI Montessori, Cool Things).

**LinkedIn session (Feb 14):**
- New account created with `tredoux@montree.xyz` (old account locked — China location mismatch)
- Profile fully set up: headline, about, experience, education, skills, contact info, organizations
- 25 connection requests sent (1 personalized to Morais Velemo Mabyeka, 24 quick connects)
- 2 videos posted (Intro + Onboarding) — user uploaded manually, assistant provided captions
- Video 3 (Tutorial, 70MB) deferred — user will edit down first
- Company page creation blocked (needs accepted connections first)
- Premium checkout failed (520 Cloudflare / NETWORK_ERROR — VPN + DevTools interference)
- Rate limits hit on messaging and group joins (~24hr cooldown)

**Pending:** Join new Montessori groups, monitor pending approvals, LinkedIn company page (needs connections), YouTube uploads, LinkedIn Premium (payment errors).

**Handoff:** `docs/HANDOFF_SOCIAL_MEDIA_GROUP_POSTING.md`, `docs/HANDOFF_SOCIAL_MEDIA_UPLOADS.md`, `docs/HANDOFF_LINKEDIN_SESSION_FEB14.md`

---

### 📱 Social Media Manager — ✅ COMPLETE (Feb 14, 2026)

Comprehensive Social Media Manager tool built for managing Montree's social media presence across Instagram, TikTok, Facebook, LinkedIn, and YouTube.

**Location:** `/montree/super-admin/social-manager`

**System Architecture:**

1. **Knowledge Base (Training Data)** — `lib/social-media-guru/knowledge/`
   - `instagram-strategy.md` (125 lines) — Algorithm priorities, posting times, content mix, hashtag strategy, Reel best practices
   - `caption-writing.md` (230 lines) — 3-part formula (Hook/Value/CTA), platform-specific strategies, tone guide, 4 ready-to-use templates
   - `hashtag-strategy.md` (267 lines) — Mix formula (5 large + 10 medium + 5 small), Montessori-specific hashtags, pre-built sets

2. **Social Media Guru (AI Advisor)** — `app/api/montree/social-guru/route.ts`
   - Claude Sonnet 4 API with 900+ lines of curated knowledge
   - Instant advice for captions, hashtags, posting times, platform strategies
   - System prompt includes Montree product details + brand voice guidelines

3. **Database Tables** — `migrations/125_social_media_tables.sql`
   - `social_content_library` — Store final videos/images with metadata
   - `social_accounts` — Encrypted credentials (AES-256-GCM) for each platform
   - `social_post_log` — Manual tracking of what was posted where

4. **User Interface (6 Pages)**
   - Main hub: `app/montree/super-admin/social-manager/page.tsx` (5 module cards, platform badges, quick stats)
   - **Social Media Guru:** `guru/page.tsx` — Chat interface with streaming Claude responses, conversation history
   - Placeholder pages (future build-out): `vault/page.tsx`, `credentials/page.tsx`, `tracker/page.tsx`, `calendar/page.tsx`

**Migration Status:** ✅ SQL migration run successfully — 3 tables + 5 indexes created

**Deploy Status:** ✅ Code committed (commit 549b589), awaiting `git push origin main` from local terminal

**Files created (13 new):**
- 3 knowledge base files (instagram-strategy.md, caption-writing.md, hashtag-strategy.md)
- 2 API files (context-builder.ts, social-guru/route.ts)
- 1 migration (125_social_media_tables.sql)
- 6 UI pages (page.tsx, guru/page.tsx, vault/page.tsx, credentials/page.tsx, tracker/page.tsx, calendar/page.tsx)
- 1 modified (super-admin page.tsx — added Social Manager button)

**Immediate Value:**
- Social Media Guru is **ready to use today** (fully functional AI advisor)
- Ask for captions, hashtags, posting times, platform strategies
- All advice grounded in 900+ lines of curated Montessori + social media knowledge

**Future Phases:**
1. Content Vault — Upload/manage videos with metadata, track which platforms posted to
2. Credentials Vault — AES-256-GCM encrypted password storage
3. Post Tracker — Manual logging with platform/URL/caption/hashtags
4. Content Calendar — Drag-and-drop monthly calendar for scheduling posts

**Handoff:** `docs/HANDOFF_SOCIAL_MEDIA_MANAGER.md`

---

### 🐛 FeedbackButton Fix — ✅ COMPLETE (Feb 14, 2026)

Fixed `components/montree/FeedbackButton.tsx` — completely broken on mobile (textarea unresponsive, screenshot capture corrupted DOM). 5 fix attempts, final one working.

**Root causes:**
1. `disabled={!selectedType}` on textarea — input disabled until feedback type selected
2. `html2canvas-pro` DOM corruption on mobile — leaves invisible elements blocking touch events
3. Race condition: useEffect cleanup wiped `selectedType` + `message` during screenshot capture

**Fix (attempts 4-5, commits `972d426` + `fec10bb`):**
- Removed `disabled` from textarea — always enabled, placeholder changes dynamically
- Close-reopen pattern: form closes before screenshot capture, reopens with fresh DOM after
- `pendingScreenshotRef` replaces `formKey` state — manages screenshot handoff during close/reopen cycle
- `savedTypeRef` + `savedMessageRef` preserve form state across close/reopen (fixes greyed-out send button)
- Removed `key={formKey}` force-remount — unnecessary with close/reopen pattern

**Prior fix:** `html2canvas` → `html2canvas-pro` (Tailwind CSS v4 `lab()` color function compatibility)

**Handoff:** `docs/HANDOFF_FEEDBACKBUTTON_FIX_FEB14.md`

---

### 🚀 Git Push — ✅ FULLY RESOLVED (Feb 15, 2026)

**Root cause found: Astrill VPN (TCP protocol)** was intercepting TLS handshakes to github.com:443. TCP-over-TCP meltdown killed larger transfers. Small requests sometimes squeezed through, which is why it seemed intermittent.

**Fix:** Turn off Astrill VPN → git push/pull → turn Astrill back on. Alternatively, try switching Astrill to UDP protocol (avoids TCP-over-TCP).

**whale-class repo** — pushed successfully via GitHub Desktop (22 files, "deploy: latest changes"). 26 stashed changes discarded (stale). Still the active Railway deployment repo.

**montree repo (clean alternative):**
- `github.com/Tredoux555/montree` (private)
- Clean copy at `/Users/tredouxwillemse/Desktop/ACTIVE/montree/` (68MB vs 600MB+ whale-class .git)
- Commit `87f0321` ("Initial commit: Montree platform") confirmed on GitHub
- Bulletproof `.gitignore` (blocks node_modules, .next, media, audio, videos, env files, large binaries)
- NOT yet used for Railway deployment — whale-class still active

**GitHub PAT:**
- User has a `cowork-permanent` PAT — **ASK USER FOR IT** if not provided. GitHub push protection blocks PATs in committed files.
- ⚠️ `.github-pat` file does NOT exist in Cowork mount — user must provide PAT in chat each session

**⚡ Cowork Push Workflow (NO SSH keys needed):**
```bash
# 1. User provides PAT in chat, set as variable
PAT="<ask-user-for-pat>"
# 2. Clone to /tmp (avoids FUSE locks on mounted workspace)
cd /tmp && rm -rf whale-push
git clone --depth=10 https://Tredoux555:${PAT}@github.com/Tredoux555/whale-class.git whale-push
# 3. Copy changed files from workspace to /tmp clone
cp /path/to/whale/changed-file.ts /tmp/whale-push/changed-file.ts
# 4. Commit and push (use HTTP/1.1 to avoid TLS issues in Cowork VM)
cd /tmp/whale-push && git add -A
git -c user.name="Tredoux" -c user.email="tredoux555@gmail.com" commit -m "message"
git -c http.version=HTTP/1.1 push origin main
```

**Mac git config (set during debugging, needs cleanup):**
```bash
# These should be cleaned up:
git config --global http.sslverify true        # currently false
git config --global --unset http.version       # currently HTTP/1.1
git config --global --unset http.timeout       # currently 300
git config --global --unset http.lowspeedlimit # currently 0
git config --global --unset http.lowspeedtime  # currently 0
```

**Mac local state:**
- `~/Desktop/ACTIVE/whale/` — Working whale-class repo (Railway deploys from this)
- `~/Desktop/ACTIVE/montree/` — Clean montree repo (future migration target)
- Can delete: `whale-clean/`, `whale-old/`, `whale-class-mirror.git/`, `~/Desktop/whale-backup-feb15/`

**GitHub SSH keys:**
- "My Mac" (Nov 2025) — user's MacBook
- "Cowork VM" (Feb 11) — ⚠️ stale, can delete
- "Cowork VM Feb 14" — previous session
- "Cowork VM Feb 15" — previous session
- Note: SSH keys are per-session in Cowork. Prefer PAT workflow above instead.

**Handoff:** `docs/HANDOFF_GIT_SSL_FIX_FEB15.md`, `docs/HANDOFF_GIT_PUSH_FIX_FEB15.md`

---

### 🐳 Dockerfile Build Fix — ✅ FIXED (Feb 15, 2026)

Railway builds failing with `supabaseUrl is required` / `supabaseKey is required` during `npm run build` inside Docker.

**Root cause:** Next.js 16.1.1 Turbopack evaluates server modules during page data collection at build time. Docker env vars weren't declared as `ARG` in the Dockerfile, so `process.env.*` was undefined during `RUN npm run build`. Railway injects env vars during Docker build, but they must be declared as `ARG` to be accessible.

**Phantom route:** Build error referenced `/api/classroom/[classroomId]/curriculum` — doesn't exist as a file. Turbopack generated it from `app/admin/schools/[slug]/classrooms/[id]/curriculum/page.tsx`.

**Fix (2 commits via GitHub web editor):**

| Commit | What | Result |
|--------|------|--------|
| `055438e` | Added 3 `NEXT_PUBLIC_*` ARGs | Partial — error changed to `supabaseKey is required` |
| `79ae195` | Added ALL 18 env vars as ARGs (client + server) | ⏳ Awaiting Railway build |

**18 ARGs declared:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_YOUTUBE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `STORY_JWT_SECRET`, `MESSAGE_ENCRYPTION_KEY`, `SUPER_ADMIN_PASSWORD`, `TEACHER_ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `VAULT_PASSWORD`, `VAULT_PASSWORD_HASH`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OPENAI_API_KEY`, `STRIPE_PRICE_GURU_MONTHLY`, `STRIPE_WEBHOOK_SECRET_GURU`

**Method:** Both commits pushed via GitHub web editor (Chrome browser automation). Cowork VM `.git/index.lock` is FUSE-locked.

**IMPORTANT PATTERN:** For Next.js Docker deployments, ALL env vars referenced by ANY server module must be declared as Docker ARGs before `RUN npm run build` — even "lazy" patterns like `getSupabase()` get triggered by Turbopack's build-time page data collection.

**Handoff:** `docs/HANDOFF_DOCKERFILE_BUILD_FIX_FEB15.md`

---

### 📧 Email Setup — ✅ COMPLETE (Feb 14, 2026)

Created new email forwarding address `tredoux@montree.xyz` for LinkedIn account registration.

**Context:** User's LinkedIn account was locked due to location mismatch (set as China, user is South African). The existing `hello@montree.xyz` email was already used for the old account, so a new email address was needed.

**Email Configuration:**

```
Service:     Cloudflare Email Routing (free)
Address:     tredoux@montree.xyz
Action:      Send to an email
Destination: tredoux555@gmail.com
Status:      Active (enabled)
```

**How It Works:**
1. Email sent to `tredoux@montree.xyz`
2. Cloudflare Email Routing receives it (via MX records)
3. Forwards to `tredoux555@gmail.com`
4. User receives in Gmail inbox

**LinkedIn Setup Steps:**
1. Go to LinkedIn signup
2. Use email: `tredoux@montree.xyz`
3. Set location: South Africa (correct location)
4. Verify email via Gmail inbox
5. Complete profile setup

**Cloudflare Access:**
- Dashboard: https://dash.cloudflare.com/c34a0012899443b32a0de1ffd5dc6af3/montree.xyz/email/routing/routes
- Account: tredoux555@gmail.com
- Domain: montree.xyz

**Technical Notes:**
- MX records already configured (route1/2/3.mx.cloudflare.net)
- Unlimited custom addresses on free plan
- 1000 emails/day limit
- Receive-only forwarding (sending requires SMTP setup)

**Handoff:** `docs/HANDOFF_EMAIL_SETUP.md`

---

### 📊 Child Progress Portfolio — ✅ COMPLETE (Feb 11, 2026)

Rebuilt the Progress tab (`/montree/dashboard/[childId]/progress`) from a simple bar chart into a full portfolio view.

**What it shows:**
- Hero stats: 3 big numbers (Mastered / Practicing / Presented)
- 5 area progress bars — tappable to filter timeline (emerald/amber/indigo/rose/violet)
- Recent photos strip — horizontal scroll with lightbox viewer
- Timeline grouped by month — mastery ⭐, practicing 🔄, presented 📋, notes 📝, observations 👁

**Data sources (3 parallel fetches):**
- `/api/montree/progress/summary?child_id=X` → area bars + overall %
- `/api/montree/media?child_id=X&limit=20` → photo strip
- `/api/montree/progress?child_id=X&include_observations=true` → hero stats + timeline

**API enhancement:** Progress route now accepts `include_observations=true` query param → fetches from `montree_behavioral_observations` table.

**Files:** `app/montree/dashboard/[childId]/progress/page.tsx` (rewritten, 413 lines), `app/api/montree/progress/route.ts` (enhanced)

**Handoff:** `docs/HANDOFF_PROGRESS_DASHBOARD.md`

**Also in this session:**
- Position picker added to AddWorkModal (`84dab04`) — teachers can choose where to insert new works in sequence
- Camera capture fix (`6d86791`) — Permissions-Policy unblocked + facingMode fix
- Checkbox persistence fix (`0cefeeb`) — localStorage via useEffect

---

### 🚀 Marketing Hub — ✅ COMPLETE (Feb 11, 2026)

13 marketing tools added to super-admin panel under `/montree/super-admin/marketing/*`.

**Status:** All 18 new files created, committed. Needs `git push origin main` — ⚠️ BLOCKED (see Git Push section).

**Handoff:** `docs/HANDOFF_MARKETING_HUB.md`

**What was built (18 new files + 1 edit):**
- `app/montree/super-admin/marketing/layout.tsx` — auth wrapper (password gate, 15-min timeout, reuses `/api/montree/super-admin/auth`)
- `app/montree/super-admin/marketing/page.tsx` — hub with 13 clickable cards in 5 sections
- 8 JSX sub-pages (launch-hq, objections, warroom, content, studio, prospects, outreach, growth) — all have `// @ts-nocheck`, back buttons, `'use client'`
- 4 iframe sub-pages (landing, links, pitch, playbook) serving HTML from `public/`
- 4 HTML files copied to `public/` (montree-landing.html, montree-links.html, montree-pitch-v2.html, montree-playbook.html)
- 1 edit to `app/montree/super-admin/page.tsx` (added 🚀 Marketing Hub card in header)

**Source files still in project root** (not committed — can be deleted after verifying): 8 JSX + 4 HTML (`montree-*.jsx`, `montree-*.html`). Also `montree-mission-control.jsx`, `montree-demo.jsx`, `montree-pitch.html` — not part of marketing hub.

**Key decisions:**
- Auth via `layout.tsx` client wrapper (one gate for all pages, no per-page duplication)
- No middleware changes needed (`/montree/*` already in publicPaths)
- No new API routes (reuses `/api/montree/super-admin/auth`)
- JSX content kept 100% as-is — zero modifications to marketing copy
- `// @ts-nocheck` added to all 8 JSX-converted pages (original files were untyped JS)

---

### Recent Changes (Progress Dashboard + Feature Fixes, Feb 11)

**Child Progress Portfolio — `ba7b47d` (rewrite of progress/page.tsx + API enhancement):**
- Rebuilt `/montree/dashboard/[childId]/progress` from basic bars to full portfolio view
- 4 sections: hero stats (mastered/practicing/presented), 5 tappable area progress bars, recent photos strip with lightbox, timeline grouped by month
- Timeline shows mastery events, practicing, presentations, teacher notes, and behavioral observations
- Area bars filter the timeline when tapped
- Enhanced `/api/montree/progress/route.ts` — added `include_observations=true` query param (fetches `montree_behavioral_observations`)
- 3 parallel API fetches on mount: summary, media, progress+observations
- 3 rounds of planning: `.claude/plans/progress-dashboard-v1.md` → `v2.md` → `v3-FINAL.md`

**Position Picker in AddWorkModal — `84dab04`:**
- `components/montree/AddWorkModal.tsx` — full-screen position picker overlay for choosing where to insert new works
- Options: Beginning / After #N [work name] / End of list
- Sends `after_sequence` to curriculum POST API (already supported server-side)
- `app/montree/dashboard/curriculum/page.tsx` — passes `areaWorks={byArea}` to AddWorkModal

**Bug Fixes:**
- `6d86791` — Camera capture: unblocked Permissions-Policy in next.config.ts + fixed facingMode for mobile
- `0cefeeb` — Checkbox persistence: marketing hub checkboxes now use useEffect for localStorage read

**Commits need push:** `git push origin main` from local terminal (2 commits ahead of remote).

---

### Previous Changes (Marketing Hub + Encryption Rotation, Feb 11)

**Marketing Hub — 18 new files, 8,190 insertions:**
- Created `app/montree/super-admin/marketing/layout.tsx` — client-side auth wrapper (password gate, 15-min timeout, activity tracking). Reuses `/api/montree/super-admin/auth` endpoint.
- Created `app/montree/super-admin/marketing/page.tsx` — hub with 13 tool cards in 5 sections (Launch, Content, Outreach, Web Pages, Reference)
- Created 8 JSX sub-pages from source files in project root: launch-hq, objections, warroom, content, studio, prospects, outreach, growth. Each has `// @ts-nocheck` (line 1), `'use client'`, `import Link`, back button injected after first div.
- Created 4 iframe sub-pages: landing, links, pitch, playbook. Each embeds HTML from `public/`.
- Copied 4 HTML files to `public/`: montree-landing.html, montree-links.html, montree-pitch-v2.html, montree-playbook.html
- Added 🚀 Marketing Hub card (purple, `bg-purple-600`) to super-admin header buttons
- Committed as `8886849`. **Needs `git push origin main`** (VM SSH key not available this session).

**Encryption Key Rotation — COMPLETE:**
- Fixed pagination bug in `scripts/rotate-encryption-key.ts` (Supabase 1000-row default limit → added `.range()` pagination loop)
- Generated new 32-char random key, ran dry-run (1,619 messages found across 2 pages)
- Ran live: 1,381 re-encrypted (CBC→GCM), 238 plaintext skipped, 654 already GCM skipped, 0 failures
- Updated `MESSAGE_ENCRYPTION_KEY` on Railway and in `.env.local`
- Verified: 5/5 sample messages decrypt correctly with new key
- Updated CLAUDE.md status sections

**Build note:** Full `npm run build` couldn't run (`.next` directory FUSE-locked in Cowork VM). Used `npx tsc --noEmit` instead — 0 errors in marketing files after adding `// @ts-nocheck`.

---

### Previous Changes (Tech Debt Cleanup — 4 Tasks Complete, Feb 11)

**Tech Debt Project — ALL 4 TASKS COMPLETE:**

| Task | What | Status |
|------|------|--------|
| 1 | Dead code removal (Home product + unused routes) | ✅ Done |
| 2 | Whale API auth (43 routes protected via middleware) | ✅ Done |
| 3 | API route consolidation (story send 4→1, curriculum CRUD) | ✅ Done |
| 4 | Auth restructure (localStorage JWT → httpOnly cookies) | ✅ Done |

**Task 1 — Dead Code Removal (35 files, 6,226 lines deleted):**
- Deleted entire Home product: `app/home/`, `app/api/home/`, `lib/home/`, `components/home/`, `lib/curriculum/data/home-curriculum.json`
- Deleted `app/api/whale/themes/route.ts` (dead), `app/admin/montree-home/` (orphaned)
- Removed FamiliesTab from super-admin panel
- Removed Home references from middleware

**Task 2 — Whale API Auth (middleware-level protection):**
- Added admin JWT check (`admin-token` cookie) in middleware for all `/api/whale/*` routes
- Excludes `/api/whale/parent/*` and `/api/whale/teacher/*` (have own auth)
- Added `/api/whale/:path*` to middleware matcher (was excluded by regex)

**Task 3 — API Route Consolidation:**
- Story send: 4 routes (send-message, send-audio, send-image, send-video) → 1 unified `/api/story/admin/send`
- Extracted shared helpers to `lib/story/story-admin-auth.ts`
- Curriculum: Merged update/delete into main route as PATCH/DELETE methods
- Deleted 6 route files total

**Task 4 — Auth Restructure (localStorage → httpOnly cookies):**
- Server: Login routes (teacher, principal, try/instant) now set `montree-auth` httpOnly cookie
- Server: `verifySchoolRequest()` checks cookie first, then Bearer header. x-school-id fallback REMOVED
- Server: New `/api/montree/auth/logout` route clears the cookie
- Server: try/instant now creates JWT token (was missing — `setToken(responseData.token)` was setting `undefined`)
- Client: `montreeApi()` no longer sends Authorization header (cookie auto-sent by browser)
- Client: `setToken()` is now a no-op, `clearToken()` calls logout API
- Client: Login pages no longer call `setToken()`
- Weekly-planning routes updated to use `getSchoolIdFromRequest()` for cookie auth

**Key files created:** `app/api/montree/auth/logout/route.ts`, `lib/story/story-admin-auth.ts`
**Key files modified:** `middleware.ts`, `lib/montree/server-auth.ts`, `lib/montree/verify-request.ts`, `lib/montree/api.ts`

### Previous Changes (Codebase Cleanup Completion + SSH Setup, Feb 11)

**Codebase Cleanup Phase 5 (Final):**
- Stripped 46 remaining `console.log`/debug `console.warn` statements across 35 files
- Preserved all `console.error` (catch blocks) and security-tagged `console.warn` ([CSRF], [PARENT-AUTH], [SECURITY])
- Phases 2–4 and 6 were already completed in previous sessions

**SSH & Git Setup:**
- SSH key "Cowork VM" (ed25519) added to GitHub account for direct pushing from Cowork sessions
- Git remote switched from HTTPS to SSH: `git@github.com:Tredoux555/whale-class.git`
- Future sessions can `git push origin main` directly — no manual terminal needed

**MESSAGE_ENCRYPTION_KEY Rotation — REVERTED, Script Fixed:**
- Attempted rotation changed key on Railway to a new random value
- **BROKE 1,605 Story messages** — they displayed as raw `gcm:...` text in the Story admin dashboard
- Root cause: rotation script targeted `montree_messages` (doesn't exist) — actual table is `story_message_history.message_content`
- **Key reverted** to `change-this-to-32-char-key-12345` on Railway — messages readable again
- **Script fixed** (`scripts/rotate-encryption-key.ts`) — now targets correct table/column, handles both CBC and GCM formats
- **LESSON**: Always verify which table stores encrypted data before rotating keys. The `montree_messages` table was a placeholder that was never created.

**Post-Phase 9 Audit & Fixes:**
- **CRITICAL CSP FIX**: `script-src 'self'` in `next.config.ts` was blocking ALL inline JavaScript. Next.js requires inline scripts for hydration. Changed to `script-src 'self' 'unsafe-inline'`. Also added Google Fonts to `style-src` and `font-src`. This was breaking the ENTIRE site since Phase 6.
- **3 audit rounds** caught ~20 additional files with `error.message` leaks (total now ~65 files sanitized)
- **Super-admin panel frontend**: `hooks/useAdminData.ts` sends password header with schools GET; `page.tsx` sends password in audit POST body
- **Migration 123 applied**: Renamed `login_time` → `login_at` in `story_login_logs` and `story_admin_login_logs` (Phase 3 code change was never applied to DB). Created `montree_super_admin_audit` table (migration 099 never ran — all audit logging was silently failing). Ensured `montree_rate_limit_logs` exists.
- **Rate limiting added** to schools PATCH (10/15min) and DELETE (5/15min)
- **Duplicate `getSupabase()` deduped** in audit GET handler

**Files created:** `docs/HANDOFF_POST_PHASE9_AUDIT.md`, `migrations/123_fix_story_columns_and_audit_table.sql`

### Previous Changes (Phase 9 — Production Security Review, Feb 11)

**Phase 9 — Production Security Review (8 fixes across ~45 files):**
- Fix 1 (CRITICAL): Created `lib/verify-super-admin.ts` — shared timing-safe `verifySuperAdminPassword()` helper using `timingSafeEqual()` with fixed 256-byte buffers. Replaced 9 plaintext `!==` comparisons across 6 super-admin route files.
- Fix 2 (CRITICAL): Secured `audit/route.ts` — both GET and POST were completely unauthenticated. Added `verifySuperAdminPassword()` + rate limiting + query limit cap (500).
- Fix 3 (CRITICAL): Secured `schools/route.ts` GET — was returning all school data publicly. Added auth (header or query param).
- Fix 4 (CRITICAL): Upgraded `lib/message-encryption.ts` from AES-256-CBC to AES-256-GCM. New format: `gcm:<iv>:<authTag>:<encrypted>`. Backward compatible (auto-detects by prefix). Created `scripts/rotate-encryption-key.ts` migration script.
- Fix 5 (HIGH): Added input length validation — messages (5000/500/200 chars), curriculum generate-description (255/50 chars).
- Fix 6 (HIGH): Added 8 missing env vars to `.env.example`. Converted Stripe PRICE_IDS from hardcoded fallbacks to lazy-throw pattern via Proxy.
- Fix 7 (HIGH): Sanitized ~43 API files — removed `error.message`/`error.details`/`error.hint`/`JSON.stringify(error)` from client responses. All now return generic messages.
- Fix 8 (MEDIUM): Added `checkRateLimit()` to 5 super-admin endpoints (audit, schools, npo-applications, reduced-rate-applications, reset-password).

**Files created:** `lib/verify-super-admin.ts`, `scripts/rotate-encryption-key.ts`, `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md`

### Previous Changes (Phase 8 — Logging & Monitoring, Feb 11)

**Phase 8 — Logging & Monitoring (6 fixes across ~15 files):**
- Fix 1: Added `login_success` audit logging to 5 auth endpoints (teacher, parent, admin, home, super-admin login-as)
- Fix 2: Added `logout` audit logging to 2 endpoints (admin, parent — both required rewrite for `NextRequest` param)
- Fix 3: Added destructive operation logging — `school_delete`, `child_delete`, `account_created` (all log BEFORE cascade)
- Fix 4a: Created `lib/api-error.ts` — safe error logging utility
- Fix 4b: Sanitized error responses — removed `error.message`/`error.details` leaks from leads, children, schools routes
- Fix 4b (bug fix): Removed undefined `fallbackPassword` variable in `leads/route.ts` (would throw ReferenceError at runtime)
- Fix 4b (bug fix): Removed partial password logging (`superAdminPassword.substring(0, 2)`) in leads route
- Fix 5: Added CSRF block logging (`console.warn('[CSRF]')`) in middleware
- Fix 6: Extended audit logger `requires_review` for new action types: `school_delete`, `child_delete`, `login_as`, `account_created`
- Hash migration logging: Home family login now logs `password_hash_upgraded` when SHA256→bcrypt migration occurs

### Previous Changes (Security Hardening + Cleanup, Feb 10)

**ElevenLabs Cleanup (subscription cancelled):**
- Deleted 4 scripts: `generate-elevenlabs-audio.js`, `regenerate-audio.js`, `regenerate-audio-charlotte.js`, `regenerate-all-audio-charlotte.js`
- Removed `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from `.env.local`, `.env.example`, CLAUDE.md, Railway
- Pre-generated audio files in `/public/audio-new/` remain — still used by sound games
- Reference docs in `/docs/` and `/public/audio-new/` left as historical context

**Phase 4 — Secret Rotation & Env Hardening (12 fixes across ~20 files):**
- Fix 1: Removed hardcoded ElevenLabs API key from 4 scripts → `process.env.ELEVENLABS_API_KEY`
- Fix 2: Removed hardcoded Supabase service role key from `scripts/upload-to-supabase.js`
- Fix 3: Removed hardcoded `870602` from `hooks/useLeadOperations.ts` (3 instances) → uses `password` prop
- Fix 4: Removed Story auth plaintext fallback (`USER_PASSWORDS`) — bcrypt-only now
- Fix 5: Removed insecure fallback defaults from `lib/auth-multi.ts`, `lib/montree/super-admin-security.ts`, `lib/message-encryption.ts` — all now throw if env vars missing
- Fix 6: Removed `'change-this-in-env'` fallback from 3 vault routes (upload, download, save-from-message)
- Fix 7: Moved vault password hash to `process.env.VAULT_PASSWORD_HASH`
- Fix 8: Added security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) in `next.config.ts`
- Fix 9: Created `.env.example` with all required env vars documented
- Fix 10: Updated CLAUDE.md env vars section (added 11 missing vars)
- Fix 11: Updated `.env.local` with `VAULT_PASSWORD_HASH` and `ELEVENLABS_API_KEY`
- ElevenLabs scripts deleted (subscription cancelled) — pre-generated audio files in `/public/audio-new/` still in use

**Phase 4 Post-Audit Fixes (3 issues found, all resolved):**
- Audit fix 1 (CRITICAL): `deleteSchool()` regression — API route now accepts password from header OR query param
- Audit fix 2: `MESSAGE_ENCRYPTION_KEY` was 31 chars (quotes stripped by dotenv) → set to old default `change-this-to-32-char-key-12345` for backward compat with existing encrypted messages
- Audit fix 3: `.env.example` updated — added "no quotes!" note for MESSAGE_ENCRYPTION_KEY

**Phase 4 Build Fix:**
- Railway build crashed because `lib/auth-multi.ts` and `lib/montree/super-admin-security.ts` threw at module-load time (env vars aren't available during Next.js build)
- Fix: moved env var checks into lazy getter functions (`getSecretKey()`, `getEncryptionKey()`) — checks now run at runtime, not import time
- `lib/message-encryption.ts` was already correct (used `getKey()` from the start)
- **IMPORTANT PATTERN**: Never validate `process.env.*` at the top level of a module — always inside a function

**Railway env vars set during Phase 4 deployment:**
- `VAULT_PASSWORD_HASH` ✅
- `MESSAGE_ENCRYPTION_KEY=change-this-to-32-char-key-12345` ✅
- `TEACHER_ADMIN_PASSWORD` ✅ (was missing from Railway)
- **Phase 9**: Encryption upgraded to GCM + rotation script created (`scripts/rotate-encryption-key.ts`). **✅ Key rotation DONE** (Feb 11) — 1,381 messages re-encrypted, pagination bug fixed in script, new key deployed to Railway.

**Phase 3 — Quick Security Wins (11 fixes):**
- Fix 1: `login_time` → `login_at` across 11 files (column rename)
- Fix 2: Session token stored on Story user login (`story_login_logs.session_token`)
- Fix 3: Created `app/api/story/heartbeat/route.ts` (was missing, client already called it)
- Fix 4: Rewrote online-users to dual-query `story_online_sessions` + `story_login_logs`
- Fix 5: System-controls auth upgraded from `token.length > 10` to JWT verification
- Fix 6: Hardcoded `870602` moved to `process.env.SUPER_ADMIN_PASSWORD` (13 files)
- Fix 7: Admin token TTL 30d → 7d + cookie maxAge aligned
- Fix 8: Vault refs in system-controls fixed (table→`vault_files`, bucket→`vault-secure`, column→`file_url`)
- Audit fix: Empty password bypass in Whale Class login (rewrote credential loading)
- Audit fix: Added `TEACHER_ADMIN_PASSWORD` env var
- Audit fix: `OnlineUser.lastLogin` → `lastSeen` type alignment

### Previous Changes (Session 155, Feb 8)

**Montree Home — Code-Based Auth:**
- `app/home/page.tsx` — Added name input, sends name to API
- `app/home/register/page.tsx` — Full rewrite: working code-based registration (was redirect stub)
- `app/home/login/page.tsx` — Full rewrite: 6-digit code entry with auto-advance (was email/password)
- `app/api/home/auth/try/route.ts` — Accept name, added debug error output
- `app/api/home/auth/login/route.ts` — Converted from bcrypt to SHA256 code lookup
- `app/api/home/auth/register/route.ts` — Replaced with 410 stub

**Montree Classroom — Name Collection:**
- `app/montree/try/page.tsx` — Added 'details' step (name + school name between role pick and creation)
- `app/api/montree/try/instant/route.ts` — Accept name + schoolName, use in all DB inserts + leads

**Super-Admin:**
- `components/montree/super-admin/FamiliesTab.tsx` — Shows join_code instead of email

**Previous Sessions (152, Feb 7):**
- `lib/auth.ts`: Removed hardcoded fallback secret
- Deleted dead auth route
- Teaching Tools section on curriculum page
- Language Making Guide download button (43 works, all 5 categories)

---

## Database

### Supabase
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database
- Service role key used everywhere (bypasses RLS)

### Key Tables
- `montree_schools`, `montree_classrooms`, `montree_children`, `montree_teachers`
- `montree_works`, `montree_child_work_progress`
- `montree_parent_invites` — 6-char invite codes for parent access
- `montree_report_media` — junction table linking reports to selected photos
- `montree_media_children` — links group photos to multiple children
- `montree_guru_interactions`, `montree_child_mental_profiles`, `montree_behavioral_observations`
- `montree_child_extras` — explicitly-added extra works per child (UNIQUE child_id+work_name)
- `montree_super_admin_audit` — central security audit log (all auth events, destructive ops)
- `montree_rate_limit_logs` — DB-backed rate limiting (survives container restarts)
- `story_users`, `story_admin_users` — Story system auth (bcrypt hashes)
- `story_login_logs`, `story_admin_login_logs` — Story login tracking (column: `login_at`)

### Whale Class Data
- Classroom ID: `945c846d-fb33-4370-8a95-a29b7767af54`
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
OPENAI_API_KEY=...            # DALL-E image generation
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
| `/montree/dashboard` | Class list |
| `/montree/dashboard/[childId]` | Child week view (1,115 lines — needs splitting) |
| `/montree/dashboard/[childId]/progress` | Progress portfolio (hero stats, area bars, photos, timeline) |
| `/montree/dashboard/curriculum` | 5 area cards + Teaching Tools section |
| `/montree/dashboard/card-generator` | 3-Part Cards tool |
| `/montree/dashboard/vocabulary-flashcards` | Vocab Flashcards tool |
| `/montree/dashboard/capture` | Photo/video capture |
| `/montree/dashboard/guru` | AI teacher advisor |
| `/montree/dashboard/games/*` | 27+ educational games |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter invite code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/photos` | Child's photos |
| `/montree/parent/milestones` | Progress timeline |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Admin tools hub |
| `/admin/card-generator` | 3-Part Cards (admin version) |
| `/admin/vocabulary-flashcards` | Vocab Flashcards (admin version) |
| `/admin/description-review` | Work description editor |
| `/montree/super-admin` | Super admin panel (1,243 lines — needs splitting) |

---

## Authentication

7 auth systems. Teacher/principal tokens now use httpOnly cookies (migrated from localStorage in tech debt Task 4).

| System | How | Used By |
|--------|-----|---------|
| Teacher login | 6-char code (SHA256 hash) or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/auth/teacher` |
| Principal login | Code or email+bcrypt → httpOnly cookie (`montree-auth`) | `/api/montree/principal/login` |
| Parent access | Invite code → cookie (`montree_parent_session`) | `/api/montree/parent/auth/access-code` |
| Admin JWT | `jose` library, `ADMIN_SECRET` env var, httpOnly cookie (`admin-token`) | `lib/auth.ts` |
| Super admin | Password from env var (timing-safe compare) | `/api/montree/super-admin/login-as` |
| Story auth | Separate system | `lib/story-auth.ts` |
| Multi-auth | Another separate system | `lib/auth-multi.ts` |

**Montree auth flow:** Login routes issue JWT → set `montree-auth` httpOnly cookie → `verifySchoolRequest()` reads cookie (or Bearer header as fallback) → extracts userId, schoolId, classroomId, role. Logout via `/api/montree/auth/logout` (clears cookie). Client-side `montreeApi()` relies on cookie auto-sending (no Authorization header needed).

**Key auth files:** `lib/montree/server-auth.ts` (JWT create/verify + cookie helpers), `lib/montree/verify-request.ts` (route-level auth check), `lib/montree/api.ts` (client-side wrapper)

---

## Supabase Client (Consolidated)

Single client: `lib/supabase-client.ts` — singleton pattern with retry logic for Cloudflare timeouts.
- `getSupabase()` — service role (server-side, bypasses RLS)
- `createSupabaseClient()` — anon key (browser-side)
- Aliases: `createSupabaseAdmin`, `createAdminClient`, `createServerClient` (backward compat)
- Also exports: `getPublicUrl()`, `getSupabaseUrl()`, storage bucket constants

---

## Curriculum System

### Master Data (JSON files)
5 area files in `lib/curriculum/data/`:
- `language.json` (43 works)
- `practical_life.json`
- `sensorial.json`
- `mathematics.json`
- `cultural.json`

### Teaching Guides
- `public/guides/Montessori_Language_Making_Guide.docx` — 43 works, all 5 categories
- `public/guides/Montessori-English-Materials-List.pdf` — 337 pics, 1011 cards, 115 objects
- `public/guides/Montessori-English-Materials-List.docx` — Editable version

---

## Known Technical Debt

### Cleanup Plan — ✅ ALL COMPLETE
- ~~3 Supabase client files~~ → consolidated to `lib/supabase-client.ts`
- ~~6 debug API endpoints~~ → deleted
- ~~27 duplicate game routes~~ → deduplicated
- ~~3 files over 900 lines~~ → split into components + hooks
- ~~469 console.log statements~~ → stripped (0 remaining, security console.warn preserved)
- ~~23 `: any` types~~ → fixed (2 trivial remain: settings page + test script)

### Immediate Next Steps
- **Guru knowledge update** — 3 new books to add to the Guru's knowledge base (user will provide)
- **Search bar** — Add search functionality (scope TBD)
- **Run migrations** — `migrations/126_homeschool_tables.sql` + `migrations/127_guru_freemium.sql` not yet run against Supabase

### Deferred (Future Sessions)
- Centralized logging service
- PWA manifest not linked
- Email sending not tested
- DB only has 18/43 language works (needs reseed)
- Clean up x-school-id headers from ~11 frontend files (harmless, cookie-auth checked first)
- Clean up stale GitHub SSH keys ("Cowork VM" Feb 11)
- Delete old Mac repos: `whale-clean/`, `whale-old/`, `whale-class-mirror.git/`, `~/Desktop/whale-backup-feb15/`

### Known Security Debt (Explicitly Deferred in Phase 9)
- Parent invite codes stored as plaintext — low priority
- CSP `script-src 'unsafe-inline'` + `style-src 'unsafe-inline'` — required by Next.js, nonce-based approach would be more secure
- `ignoreBuildErrors: true` in next.config.ts — pre-existing
- Audit table naming (`montree_super_admin_audit` logs all events, not just super-admin)

---

## Guru System (AI Teacher Advisor)

AI advisor for child development questions. Uses Anthropic API.

Key files:
- `lib/montree/guru/context-builder.ts` — builds child context
- `lib/montree/guru/knowledge-retrieval.ts` — Montessori knowledge
- `app/api/montree/guru/route.ts` — main endpoint

Tables: `montree_guru_interactions`, `montree_child_mental_profiles`, `montree_behavioral_observations`, `montree_child_patterns`

---

## Report & Photo System

Photo selection flow:
```
Teacher Preview → Select Photos → Saved to montree_report_media junction table
Publish → send/route.ts queries junction table → Creates final report
Parent View → parent/report/[id]/route.ts queries junction table
```

Both routes query junction table first, fall back to date-range query for backwards compatibility.

Description matching uses area-constrained whole-word matching. Custom works (`work_key` starts with `custom_`) don't auto-match.

---

## Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.

---

## Key Handoff Docs

| Doc | What |
|-----|------|
| `docs/HANDOFF_LOGIN_CODE_FIX_FEB17.md` | **CURRENT** — Complete login code fix (setup routes + case-insensitive auth) |
| `docs/HANDOFF_DOCKERFILE_BUILD_FIX_FEB15.md` | Docker ARG fix for Next.js build-time env vars |
| `docs/HANDOFF_GIT_SSL_FIX_FEB15.md` | Astrill VPN root cause, clean montree repo, git workflow fix |
| `docs/HANDOFF_DEPLOY_MONTREE_HOME_FEB15.md` | Montree Home deploy: repo cleanup, REST API push, LibreSSL fix |
| `docs/HANDOFF_MONTREE_HOME_PHASE4.md` | Montree Home Phase 4: Curriculum browser (all 4 phases complete) |
| `docs/HANDOFF_FEEDBACKBUTTON_FIX_FEB14.md` | FeedbackButton mobile fix (4 attempts, close-reopen pattern) |
| `docs/HANDOFF_LINKEDIN_SESSION_FEB14.md` | LinkedIn profile, videos, connections, git push (now resolved via API) |
| `docs/HANDOFF_SOCIAL_MEDIA_MANAGER.md` | Social Media Manager tool (AI Guru, knowledge base, 6 pages) |
| `docs/HANDOFF_THREE_ISSUE_FIX.md` | Extras leak fix, auto-mastery, area icon uniformity |
| `docs/HANDOFF_PROGRESS_DASHBOARD.md` | Progress portfolio, position picker, bug fixes |
| `docs/HANDOFF_POST_PHASE9_AUDIT.md` | Post-Phase 9 audit, CSP fix, frontend fixes, DB migration |
| `docs/HANDOFF_SECURITY_PHASE9_COMPLETE.md` | Security Phase 9 complete (FINAL), production security review |
| `docs/HANDOFF_SECURITY_PHASE8_COMPLETE.md` | Security Phase 8 complete, logging & monitoring |
| `docs/HANDOFF_SECURITY_PHASE7_COMPLETE.md` | Security Phase 7 complete, session management improvements |
| `docs/HANDOFF_SECURITY_PHASE6_COMPLETE.md` | Security Phase 6 complete, input sanitisation & CSP |
| `docs/HANDOFF_SECURITY_PHASE4_COMPLETE.md` | Security Phase 4 complete, all fixes listed |
| `.claude/plans/phase9-plan-v1.md` | Phase 9 execution plan (final production review) |
| `.claude/plans/phase8-plan-v2.md` | Phase 8 execution plan (2 rounds of audit refinement) |
| `.claude/plans/phase7-plan-v3.md` | Phase 7 execution plan (3 rounds of audit refinement) |
| `.claude/plans/phase4-plan-v3.md` | Phase 4 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SECURITY_PHASE3_COMPLETE.md` | Security Phase 3 complete, all fixes listed |
| `.claude/plans/phase3-plan-v3.md` | Phase 3 execution plan (3 rounds of audit refinement) |
| `docs/HANDOFF_SESSION_152_CLEANUP_PLAN.md` | Codebase cleanup plan (5 remaining phases) |
| `docs/HANDOFF_SESSION_151_LANGUAGE_MAKING_GUIDE.md` | Language guide + API download route |

