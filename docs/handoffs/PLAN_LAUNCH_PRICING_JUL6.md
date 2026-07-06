# LAUNCH PRICING PLAN — Jul 6, 2026

**Status: PLAN (Fable). Build agents: Opus. Sacred rule: review thinking → build → review build.**

## The locked business model (do NOT re-litigate — Tredoux confirmed Jul 6)

| | Trial | Starter | Premium | Founding 100 |
|---|---|---|---|---|
| Price | Free, **7 days** | **$3**/student/mo | **$7**/student/mo | 1 month Premium free → **Premium at $3/mo for life** |
| Reports (weekly wrap, teacher, parent) | Sonnet | Haiku | Sonnet | Sonnet |
| Photo ID base pipeline | Haiku | Haiku | Haiku | Haiku |
| Photo Sonnet fallback / Ask Sonnet | YES | **NEVER** | YES | YES |
| Guru chat | Sonnet | **Haiku** | Sonnet | Sonnet |
| Astra (principal agent) | Sonnet | **Haiku** | Sonnet | Sonnet |
| After trial | Must choose Starter or Premium (they've tasted Premium) | — | — | Locked forever; in exchange: validation, feedback, testimonials. Enrolled in batches of 10-15. |

- Stripe already has $3 and $7 prices. Keep them. `STRIPE_PRICE_PER_STUDENT` env = the $7 price (existing). NEW env `STRIPE_PRICE_STARTER` = the $3 price ID (Tredoux sets in Railway).
- Founding 100: Tredoux admits from super-admin, **generates a signup link there**, applicants **apply by email** (mailto on the homepage). No self-serve waitlist form anymore.
- Ambassadors/agents: **no more public recruitment.** Nav link gone, become-an-agent page becomes a redirect. Internal agent infra stays dormant (do not rip out payouts/dashboard).
- Abuse: super-admin can **lock** a school → login refused + all AI resolves free; locked screen lets them message Tredoux → lands in super-admin Feedback tab.

## 🚨 DEPLOY-ORDER HAZARD (read this)

`resolve-model.ts` will select new columns (`trial_ends_at`, `locked_at`). Its fail-closed catch returns `free` — if the column doesn't exist yet, **EVERY school 402s**. Therefore: **migration 286 MUST be run in Supabase BEFORE the git push.** Sequence: build → hand SQL to Tredoux in chat → he runs it → verify → push.
`trial_ends_at` already exists (signup writes it). New columns: `locked_at`, `locked_reason`, `founding_member` on `montree_schools`; `signup_code`, `code_generated_at`, `redeemed_by_school_id`, `redeemed_at` on `montree_founding_waitlist`.

---

## WORKSTREAM 1 — Tier / model / billing backend (Opus agent A)

### 1.1 `lib/montree/reports/resolve-model.ts`
- Widen the school query to `subscription_status, trial_ends_at, locked_at`.
- Resolution order becomes:
  1. `locked_at` set → `{ tier:'free', model:null }` (kills AI spend for locked schools).
  2. `ai_tier_sonnet` flag → sonnet (unchanged).
  3. `ai_tier_haiku` flag → haiku (unchanged).
  4. `subscription_status === 'trialing'`:
     - `trial_ends_at` in the future (or null) → **sonnet** (Premium trial — CHANGED from haiku floor).
     - `trial_ends_at` past → **free** (trial over; every AI route 402s with the existing UpgradeCard UX — this IS the "make a call" moment).
  5. `subscription_status === 'active'` → haiku floor (unchanged safety net; webhook normally sets explicit flags).
  6. else → free.
- Keep fail-closed catch. Update doc comment with this table.

### 1.2 `lib/montree/billing.ts`
- Constants: add `STARTER_PRICE_USD = 3` / `STARTER_PRICE_CENTS = 300`. Keep `PRICE_PER_STUDENT_USD = 7` (= Premium).
- `setSchoolAiTier`: add `'haiku'` target → `ai_tier_haiku=true, ai_tier_sonnet=false`, budget $50/soft_limit. (Type `AiTierTarget` widens to `'premium'|'haiku'|'free'`.)
- `handleSubscriptionUpsert`: determine target tier:
  1. `subscription.metadata.montree_plan === 'starter'` → `'haiku'`; `'premium'` → `'premium'`.
  2. No metadata (legacy): if item price unit_amount === 300 AND school is NOT `founding_member` → `'haiku'`; else fall back to `tierForSubscriptionStatus` (trialing/active → premium) — legacy behavior preserved.
  3. `trialing` status → always `'premium'` (trial is the Premium experience).
- `handleSubscriptionDeleted` unchanged (→ free).
- Do NOT change `effectivePricePerStudentUsd` default ($7 = Premium). Starter pricing flows through the Starter Stripe price at checkout; Alipay/manual Starter schools are handled via the existing `billing_override_usd=3` (document this in a comment).

### 1.3 `app/api/montree/billing/checkout/route.ts`
- Accept `plan: 'starter' | 'premium'` in body (default `'premium'`).
- Price resolution: `founding_member` school → force premium plan + existing override machinery (override is already $3 for founding). Else starter → `process.env.STRIPE_PRICE_STARTER` (503 with clear message if unset); premium → existing resolution.
- Set `subscription_data: { metadata: { montree_plan: <plan> } }` on the Checkout Session (founding → `'premium'`).

### 1.4 `app/montree/admin/billing/page.tsx`
- Plan chooser: when school has no active subscription (trialing/expired/canceled), render TWO plan cards — Starter $3 (Haiku all the way through; photo recognition never escalates to Sonnet) and Premium $7 (featured: Sonnet reports, Sonnet photo fallback, Sonnet Guru). Each CTA POSTs checkout with its `plan`.
- Trial countdown line: "Your Premium trial ends in N days — choose your plan." (compute from `trial_ends_at`, already in billing status response or add it).
- Founding schools (`founding_member` — expose via billing/status route): single card "Founding 100 — Premium locked at $3/student for life" → checkout (plan forced server-side).
- Keep the page hardcoded-English-plus-existing-i18n as it is today — do not break existing keys.

### 1.5 Guru school-tier wiring — `app/api/montree/guru/route.ts`
- For `role === 'teacher' | 'principal'` (school context): call `resolveReportModel(supabase, schoolId)`:
  - `'sonnet'` → `guruTier = 'sonnet'`; `'haiku'` → `guruTier = 'haiku'` (force — ignore per-teacher `guru_tier` for school roles).
  - `'free'` → 402 `{ requires_upgrade:true, upgrade_url:'/montree/admin/billing', feature:'guru' }`.
- `homeschool_parent` role: UNTOUCHED (their personal guru_tier/freemium Stripe system stays).
- Keep hybrid smart-routing (Sonnet tier still routes easy categories to Haiku — cost saver).
- `app/api/montree/guru/stream/route.ts`: check if it has live callers (grep). If live → same gating. If dead → add a comment marking it legacy, minimal same gating anyway (cheap).

### 1.6 Astra + admin chat models
- `app/api/montree/admin/principal-agent/route.ts`: replace `const model = AI_MODEL` with `aiTier.tier === 'sonnet' ? AI_MODEL : HAIKU_MODEL` (it already 402s on free).
- `app/api/montree/admin/guru/chat/route.ts`: replace hardcoded dated Sonnet with resolveReportModel-driven choice (sonnet → AI_MODEL, haiku → HAIKU_MODEL, free → 402).
- Do NOT touch super-admin guru (internal tool).

### 1.7 Photo pipeline Premium gate — derive from tier, not raw flag
- `app/api/montree/photo-identification/process/route.ts`: `sonnetTierEnabled` ← `(await resolveReportModel(supabase, schoolId)).tier === 'sonnet'` (replaces raw `isFeatureEnabled('ai_tier_sonnet')`). This gives Premium TRIALS the Sonnet fallback (today they'd miss it). Keep the variable name.
- `app/api/montree/photo-identification/sonnet-review/route.ts`: same derivation for the 402 gate.
- 🚨 Do NOT touch temperature pins, HAIKU_TRUST_CONFIDENCE (0.85), AUTO_SONNET threshold (0.70), or Gate A rules.

## WORKSTREAM 2 — Abuse lock + signup hardening + founding codes (Opus agent B)

### 2.1 Migration `migrations/286_school_lock_and_founding.sql` (idempotent)
- `montree_schools`: `locked_at TIMESTAMPTZ`, `locked_reason TEXT`, `founding_member BOOLEAN DEFAULT FALSE`.
- `montree_founding_waitlist`: `signup_code TEXT UNIQUE`, `code_generated_at TIMESTAMPTZ`, `redeemed_by_school_id UUID`, `redeemed_at TIMESTAMPTZ`.
- Partial index on `montree_founding_waitlist(signup_code) WHERE signup_code IS NOT NULL` (the UNIQUE covers it — one or the other).

### 2.2 Lock enforcement
- `app/api/montree/auth/unified/route.ts`: after principal/teacher credential match, fetch school `locked_at, name`; if locked → 403 `{ locked:true, school_name, redirectTo:'/montree/locked?school=<id>' }`. (Agent login + parent login: also refuse — parents of a locked school shouldn't see reports either; keep it simple: any role of a locked school gets the same 403.)
- `app/montree/login-select/page.tsx`: handle the 403 `locked` response → `router.replace(redirectTo)`.
- `app/api/montree/auth/me/route.ts`: include `locked: true` when school locked → existing layout consumers can bounce; add redirect handling in the admin layout + teacher dashboard where `/auth/me` is already consumed (light touch — if `locked`, `window.location.href = '/montree/locked?school=<id>'`).
- NEW public page `app/montree/locked/page.tsx` (dark forest, mobile-first): "This account has been locked." + reason-agnostic copy + form (your name, email, message) → POST `/api/montree/feedback` with `school_id` (from query), `user_type:'principal'`, `feedback_type:'appeal'`, message. Success state: "Message sent — Tredoux will get back to you."
- `app/api/montree/feedback/route.ts`: add `'appeal'` to VALID_FEEDBACK_TYPES. `components/montree/super-admin/FeedbackTab.tsx`: 🚫 emoji + red pill for `appeal`.
- Super-admin: `app/api/montree/super-admin/schools/route.ts` PATCH accepts `locked: boolean` + `locked_reason` (sets `locked_at = NOW()` / clears both). Audit-log it. `SchoolsTab.tsx`: 🚫/🔓 button per row (confirm + reason prompt), red LOCKED chip on locked rows. GET returns `locked_at`.
- NOTE: resolve-model kills AI for locked schools (Workstream 1 owns that file — do not touch it here).

### 2.3 Signup hardening — `app/api/montree/try/instant/route.ts`
- `checkRateLimit(supabase, ip, '/api/montree/try/instant', 5, 60)` — 5 school creations per hour per IP. Fail-OPEN (comment why: limiter outage must not brick signups; abuse backstop = lock flag).
- Honeypot: accept `website` field; if non-empty → fake success (mirror founding/join pattern). `app/montree/try/page.tsx`: hidden `website` input.

### 2.4 Founding codes
- `app/api/montree/super-admin/founding/route.ts`: PATCH action `generate_code` — only for `status='admitted'` rows; generate `FND-` + 6 chars (alphabet excl. I/O/0/1); idempotent (re-click returns existing code, does NOT rotate). GET includes signup_code/redeemed fields.
- `components/montree/super-admin/FoundingTab.tsx`: admitted rows get "🔗 Generate link" → shows copyable `https://montree.xyz/montree/try?founding=FND-XXXXXX`; redeemed rows show ✓ redeemed + school id/date.
- `app/api/montree/try/instant/route.ts`: accept `founding_code`; validate row (`signup_code` match, `status='admitted'`, `redeemed_at IS NULL`) BEFORE any writes (mirror the referral-code pattern); on school create: `founding_member=true`, `billing_override_usd=3`, `billing_override_note='Founding 100 — Premium at $3 for life'`, `trial_ends_at = now + 30 days`; then mark waitlist row redeemed (atomic conditional update `.is('redeemed_at', null)`). Invalid/redeemed code → 400 with friendly message.
- `app/montree/try/page.tsx`: read `?founding=` (same pattern as `?ref=`), gold banner "Founding 100 — one month of Premium free, then Premium locked at $3/student for life", pass `founding_code` in POST body.
- After the free month: `trial_ends_at` passes → resolver would say `free` → but founding schools should sail into checkout at $3 with Premium. Billing page (W1) shows the founding card; when they subscribe, webhook metadata `montree_plan='premium'` + override price $3 keeps them Premium. Acceptable: if a founding school ignores checkout after 30 days they 402 like anyone — Tredoux nudges them.

## WORKSTREAM 3 — Public marketing (Opus agent C)

### 3.1 Landing `app/montree/page.tsx`
- Nav: REMOVE the `landing.nav.forTeachers` → become-an-agent link entirely. ADD `Pricing` → `/pricing` using new key `landing.nav.pricing` (visible on mobile — NOT secondary class; pricing is the #2 question after "what is it").
- Hero: prominent gold M. The hero media slot (video is disabled via SHOW_HERO_VIDEO=false — leave the flag/code alone) currently renders nothing; render a large `m-mark.png` (the transparent gold M) inside a soft gold radial glow, subtle breathing animation (CSS keyframes on opacity/box-shadow only — NO scaling blob; respect `prefers-reduced-motion`). Mobile: smaller centered M above the title. Use `<img>` with explicit width/height (CLS).
- NEW pricing section `id="pricing"` between the editorial blocks and the explainer teaser: heading + one-line "Every school starts with 7 days of Premium, free." + two compact cards (Starter $3 / Premium $7 — Premium visually featured with gold border) + 3 bullets each + CTA row: "See full pricing →" (/pricing) + "Try it" (login-select?signup=true). Mobile: cards stack.
- Closing copy: update `landing.closing.body` value → "Starter $3 · Premium $7 per student a month. Every school starts with 7 days of Premium, free. No contracts, cancel anytime." Update `landing.hero.fineprint` value to match (it's currently unrendered; ALSO render it under the hero CTA using the existing `.m-hero-fineprint` class — cheap trust signal).
- i18n: new keys `landing.nav.pricing` + `landing.pricing.*` (title, tagline, starterName, starterPrice, starterB1..B3, premiumName, premiumPrice, premiumB1..B3, trialLine, seeFull, cta). EN + ZH real translations; the other 10 locales get careful in-language values for the SHORT formulaic strings (prices/names) and English fallback where prose is long. Parity 12/12 MUST hold (pre-commit hook enforces).
- Do NOT remove the `landing.nav.forTeachers` key from locale files (orphan it — parity stays intact, less churn).

### 3.2 `components/montree/FoundingHundred.tsx` rewrite
- KEEP: counter (admitted-driven), section placement, dark-card aesthetic, `.fh-*` styles.
- REPLACE the form with an email-apply CTA: `mailto:tredoux555@gmail.com?subject=Founding 100 Application — [Your school]&body=School name:%0ACountry:%0ANumber of students:%0AWhy you want in:` styled as the primary gold pill: "Apply by email".
- New copy (hardcoded English by design, keep that): eyebrow "Founding 100" · headline "One month of Premium, free. Then Premium locked at $3 per student — for life." · body: applications reviewed personally; schools enrolled in batches of 10-15; in exchange founding schools help validate Montree — feedback and a testimonial. Counter line: "X of 100 founding places remaining". When full: "The Founding 100 is full." + email CTA for the general list.
- The old `/api/montree/founding/join` route stays on disk (hide-don't-delete), no longer called.

### 3.3 `app/pricing/page.tsx` FULL REWRITE — dark forest brand
- Rebuild using the `.m-*` dark-forest tokens (bg `#06140e`/`#0a1a0f`, emerald `#34d399`, gold `#E8C96A`, Lora headings, plain `<style>` tag like the landing page — NO styled-jsx). Mobile-first.
- Structure: mini-nav (M logo + Montree wordmark → /montree, Log in) → hero ("Simple pricing." + "Every school starts with 7 days of Premium, free — no card. After the week, pick your plan.") → TWO pricing cards side-by-side (stack on mobile): **Starter $3** (per active student / month; The full Montree system; AI reports on our fast model; photo recognition — never escalates; Guru on the fast model) / **Premium $7** (featured, gold border: Claude Sonnet reports parents keep; Sonnet photo fallback when a photo is hard; Sonnet Guru + Astra; everything in Starter) → student slider (5–60) showing BOTH monthly totals live → Founding 100 strip (1 month Premium free → Premium at $3 for life · Apply by email CTA, same mailto) → FAQ (rewrite: 7-day trial, no card upfront; what happens after the trial; Starter vs Premium difference; what is Sonnet; what is the Founding 100 — new terms; billing per active student across the school; cancel anytime) → closing CTA → footer.
- REMOVE all "$7 Bloom", "first month free", "card on file at signup", "6 months free" copy. Hardcoded English (as today).

### 3.4 Agent surfaces off the public web
- `app/montree/become-an-agent/page.tsx` → replace with server `redirect('/montree')` (keep file; comment explains removal of the ambassador programme, Jul 2026).
- `app/montree/for-teachers/page.tsx` → redirect target changes to `/montree`.

## Verification / ship sequence
1. Each build agent: ESLint `--max-warnings=0` on every touched file.
2. Fresh-eyes review agents (one per workstream) — audit against THIS plan + the locked model table. Fix cycle until clean.
3. i18n strict parity check passes (pre-commit hook).
4. Hand migration 286 SQL to Tredoux in chat → he runs in Supabase → confirm.
5. Tredoux sets `STRIPE_PRICE_STARTER` env in Railway (the $3 price ID).
6. Commit + push via Desktop Commander (`cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main` — NOTE: commit from the montree checkout; push per standing rule).
7. Runtime audit: landing, /pricing, /montree/try?founding=TEST, locked flow, tier resolution.

## 🚨 PLAN AMENDMENTS (post-audit — these OVERRIDE anything above that conflicts)

**A1 (was C1) — trial_ends_at reliability.** W1.1 rule 4 becomes three-way: `trialing` + `trial_ends_at` in future → **sonnet**; `trialing` + past → **free**; `trialing` + **NULL → haiku** (legacy floor — never free-Sonnet-forever, never brick a legit school). ADDITIONALLY: agent A must read `app/api/montree/principal/register/route.ts` (and any super-admin school-register path) — any path that sets `subscription_status='trialing'` without `trial_ends_at` must be fixed to write `trial_ends_at = now + DEFAULTS.TRIAL_DAYS`.

**A2 (was C2) — Guru gating keys on `auth.role`, NEVER the body `role`.** `const isSchoolRole = auth.role === 'teacher' || auth.role === 'principal'`. Apply resolveReportModel force + 402 ONLY when isSchoolRole. The homeschool_parent freemium block (guru/route.ts ~369-419) stays byte-identical.

**A3 (was C3) — Guru 402 client handling.** `components/montree/guru/GuruChatThread.tsx` `!res.ok` branch must handle `data.requires_upgrade === true` → render an upgrade affordance (link to /montree/admin/billing with warm copy), not a raw error bubble.

**A4 (was H1) — third raw flag reader.** W1.7 also swaps `app/api/montree/guru/photo-insight/route.ts:~491` `isFeatureEnabled('ai_tier_sonnet')` → `resolveReportModel().tier === 'sonnet'`.

**A5 (was H2) — admin/guru/chat is a full scoped change:** add imports from `@/lib/ai/anthropic`, resolveReportModel call after the principal gate, 402 on free, and replace the stale `MODEL` const at EVERY `client.messages.create` site in the file (grep first — tool loop has multiple).

**A6 (was H3) — founding beats referral.** In try/instant, if `founding_code` is valid, IGNORE `referral_code` entirely (founding schools are never agent-attributed). If founding_code invalid → 400 (do not silently fall through to referral).

**A7 (was H4) — feedback route specifics.** The types whitelist is an inline `validTypes` array (grep exact name) — add `'appeal'`. UUID-validate `school_id` before insert. Appeals are unauthenticated by design (locked users can't log in) — comment this.

**A8 (was M1) — become-an-agent rewrite.** It's a `'use client'` file; replace ENTIRE contents with a 3-line server component mirroring for-teachers/page.tsx: `import { redirect } from 'next/navigation'; export default function BecomeAnAgentGone() { redirect('/montree'); }` + comment.

**A9 (was M2/M3) — webhook specifics.** `handleSubscriptionUpsert`: (a) add `founding_member` to the school SELECT (~billing.ts:1032), (b) NEW code reads `subscription.metadata?.montree_plan` and branches tier BEFORE the tierForSubscriptionStatus fallback. Stripe copies `subscription_data.metadata` onto the subscription — correct mechanism.

**A10 (was M4) — hero M mark.** Add a NEW element (`.m-hero-brandmark`) OUTSIDE the `{SHOW_HERO_VIDEO && …}` conditional with its own CSS (breathing = opacity/box-shadow keyframes only, `prefers-reduced-motion` guard, explicit width/height attrs). Leave the video block + its CSS untouched. Verify split-hero flex still lays out with the M in place of the absent video.

**A11 (was L2) — migration:** UNIQUE constraint only on `signup_code`; no redundant partial index.

## Known consequences to tell Tredoux
- Existing schools with `subscription_status='trialing'` whose `trial_ends_at` already passed will start 402-ing on AI (upgrade card) the moment this deploys. That's the intended decision point, but any school he cares about should get flags or a fresh trial date first.
- Photo Sonnet fallback now reaches Premium TRIAL schools (it didn't before) — slightly higher trial COGS, intended (they must taste Premium).
- Alipay/manual-invoice Starter schools bill via `billing_override_usd=3` set by super-admin (unchanged machinery).
