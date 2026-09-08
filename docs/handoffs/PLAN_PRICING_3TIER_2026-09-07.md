# PLAN — 3-TIER PRICING RESTRUCTURE (Basic / Lite / Full) — Sep 7 2026

Status: PLAN (Fable architect). Build agents: Opus. Replaces PLAN_LAUNCH_PRICING_JUL6.md entirely.
Scout map: docs/handoffs/SCOUT_PRICING_INFRA_2026-09-07.md. Do NOT re-litigate section 0.

## 0. DECISIONS (locked by Tredoux, Sep 7 2026)

| | BASIC | LITE | FULL |
|---|---|---|---|
| Price | **$12 / year / school** (one annual charge) | **$20 / month / school** (flat) | **$3 / active child / month, $30/mo minimum** |
| Stripe | `STRIPE_PRICE_BASIC_YEAR`, qty 1 | `STRIPE_PRICE_LITE_MONTH`, qty 1 | `STRIPE_PRICE_FULL_CHILD_MONTH`, qty = `max(10, activeChildren)` |
| AI model | **none** | **haiku** | **sonnet** |
| Monthly AI budget | $0 / hard_limit | **$8** / hard_limit | $9999 / warn |
| Guru | ✗ | ✓ Haiku | ✓ Sonnet |
| Astra (principal agent, voice) | ✗ | ✓ Haiku | ✓ Sonnet |
| AI weekly/parent reports | ✗ (deterministic tracker summaries only) | ✓ Haiku | ✓ Sonnet |
| Photo recognition (photo-identification, photo-onboarding, snap-identify, photo-insight, paper-scan) | ✗ | ✗ (upload + manual tagging) | ✓ Haiku pipeline + Sonnet fallback |
| Montages | ✗ | ✗ | ✓ |
| Parent messaging / appointments / video calls | ✗ | ✗ | ✓ |
| Org-level child onboarding | ✗ | ✗ | ✓ |
| CMS bridge | ✗ | ✗ | ✓ |
| Photo cap | **500 / school**, oldest auto-archived | unlimited | unlimited |
| Everything non-AI (tracker/tap grid, printables, Dark Phonics + Writing Shelf library, class documents/labels, parent codes + portal read of non-AI content) | ✓ | ✓ | ✓ |

- New signups land on **BASIC, card required, NO free trial**. Trial machinery retired (columns kept, never read for tier).
- **Founding 100** = FULL at $3/child for life → `founding_member=true` → Full entitlement; billing stays on the $3 per-child price (the promise IS that $3 never rises). Minimum floor still applies unless `billing_override_usd=0`.
- **Partner free-for-life** (`billing_override_usd = 0`) → FULL at $0, no checkout.
- Super-admin can force any school to any plan via `plan_override`, beating Stripe.
- Whale Class (`c6280fae-567c-45ed-ad4d-934eae79aabc`) → BASIC override now, LITE later (§ 9 SQL).

## 1. DATA MODEL + MIGRATION

Additive, idempotent, one transaction. **Safe to deploy code before running** — every read is 42703-safe (see §2 fallback).
Run in Supabase SQL editor; migration 349.

```sql
-- migrations/349_pricing_3tier.sql
BEGIN;

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS plan_source TEXT,
  ADD COLUMN IF NOT EXISTS plan_override TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS photo_cap_reached_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE montree_schools ADD CONSTRAINT montree_schools_plan_chk
    CHECK (plan IN ('basic','lite','full'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE montree_schools ADD CONSTRAINT montree_schools_plan_override_chk
    CHECK (plan_override IS NULL OR plan_override IN ('basic','lite','full'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE montree_schools ADD CONSTRAINT montree_schools_plan_source_chk
    CHECK (plan_source IS NULL OR plan_source IN ('stripe','override','founding','partner','legacy'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Photo cap: reversible soft-archive (storage objects are NEVER deleted).
ALTER TABLE montree_media
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_media_school_archived
  ON montree_media(school_id, archived_at, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_schools_plan ON montree_schools(plan);

-- Backfill existing paying/granted schools so nobody loses AI on deploy day.
UPDATE montree_schools s SET plan = 'full', plan_source = 'founding'
  WHERE s.founding_member = TRUE AND s.plan_override IS NULL;
UPDATE montree_schools s SET plan = 'full', plan_source = 'partner'
  WHERE s.billing_override_usd = 0 AND s.founding_member IS DISTINCT FROM TRUE
    AND s.plan_override IS NULL;
UPDATE montree_schools s SET plan = 'full', plan_source = 'legacy'
  WHERE s.plan_source IS NULL AND s.plan_override IS NULL
    AND EXISTS (SELECT 1 FROM montree_school_features f
                WHERE f.school_id = s.id AND f.feature_key = 'ai_tier_sonnet' AND f.enabled);
UPDATE montree_schools s SET plan = 'lite', plan_source = 'legacy'
  WHERE s.plan_source IS NULL AND s.plan_override IS NULL
    AND EXISTS (SELECT 1 FROM montree_school_features f
                WHERE f.school_id = s.id AND f.feature_key = 'ai_tier_haiku' AND f.enabled);
UPDATE montree_schools SET plan_source = 'legacy' WHERE plan_source IS NULL;

COMMIT;
```

## 2. RESOLVER + CAPABILITY MAP

**`lib/montree/plans/resolve-plan.ts`** — the ONE source of truth.

```ts
export type Plan = 'basic' | 'lite' | 'full';
export type PlanModel = 'none' | 'haiku' | 'sonnet';
export interface PlanInputs {
  lockedAt?: string | null;
  planColumn?: Plan | null;        // montree_schools.plan       (undefined if column missing)
  planOverride?: Plan | null;      // montree_schools.plan_override
  foundingMember?: boolean | null;
  billingOverrideUsd?: number | string | null;
  subscriptionStatus?: string | null;
  legacySonnetFlag?: boolean;      // ai_tier_sonnet — fallback only
  legacyHaikuFlag?: boolean;       // ai_tier_haiku  — fallback only
}
export interface ResolvedPlan {
  plan: Plan; model: PlanModel; source: 'locked'|'override'|'founding'|'partner'|'stripe'|'legacy'|'default';
  locked: boolean; aiBudgetUsd: number; photoCap: number | null;
}
export function resolvePlan(input: PlanInputs): ResolvedPlan   // pure, sync
export async function loadResolvedPlan(supabase, schoolId): Promise<ResolvedPlan>  // async, 42703-safe
```

Precedence (highest wins):
1. `lockedAt` set → `{plan:'basic', model:'none', locked:true, source:'locked'}` (abuse lock kills all AI spend).
2. `planOverride` non-null → that plan, `source:'override'` (super-admin beats Stripe, beats founding).
3. `foundingMember === true` → `full`, `source:'founding'`.
4. `billingOverrideUsd === 0` → `full`, `source:'partner'`.
5. `planColumn` non-null → that plan, `source:'stripe'`.
6. Legacy fallback (column missing / null): sonnetFlag → `full`; haikuFlag → `lite`; `subscriptionStatus==='active'` → `lite`; else `basic`. `source:'legacy'`.
7. Default → `basic`, `source:'default'`.

`loadResolvedPlan` SELECTs the new columns; on a Postgres 42703 it **retries with the legacy column set** and falls through to rule 6. This is what makes deploy-before-migration safe (unlike Jul 6). Never fail-closed to "no product" — worst case a school gets Basic (no AI spend), which is the cheap, safe direction.

**Compatibility wrappers** (keep the ~90 call sites byte-identical):
- `resolveReportModel(supabase, schoolId)` in `lib/montree/reports/resolve-model.ts` becomes `const r = await loadResolvedPlan(...)` → `{ tier: PLAN_TO_TIER[r.plan], model: r.model==='none'?null:MODEL[r.model] }` where `basic→'free', lite→'haiku', full→'sonnet'`.
- `deriveTier(TierInputs)` kept, reimplemented as `PLAN_TO_TIER[resolvePlan(mapLegacyInputs(x)).plan]` so super-admin/schools + mira/tool-executor keep compiling. Mark `@deprecated — use resolvePlan`.

**`lib/montree/plans/capabilities.ts`**

```ts
export type Capability = 'guru'|'astra'|'aiReports'|'photoRecognition'|'montages'
  |'parentMessaging'|'appointments'|'videoCalls'|'orgOnboarding'|'cmsBridge';
export const PLAN_CAPABILITIES: Record<Plan, Record<Capability, boolean> & {photoCap:number|null; aiBudgetUsd:number}> = {
  basic: { guru:false, astra:false, aiReports:false, photoRecognition:false, montages:false,
           parentMessaging:false, appointments:false, videoCalls:false, orgOnboarding:false,
           cmsBridge:false, photoCap:500, aiBudgetUsd:0 },
  lite:  { guru:true,  astra:true,  aiReports:true,  photoRecognition:false, montages:false,
           parentMessaging:false, appointments:false, videoCalls:false, orgOnboarding:false,
           cmsBridge:false, photoCap:null, aiBudgetUsd:8 },
  full:  { guru:true,  astra:true,  aiReports:true,  photoRecognition:true,  montages:true,
           parentMessaging:true,  appointments:true,  videoCalls:true,  orgOnboarding:true,
           cmsBridge:true,  photoCap:null, aiBudgetUsd:9999 },
};
export async function hasCapability(supabase, schoolId, cap: Capability): Promise<boolean>
```

`hasCapability` = plan grant **OR** an explicit per-school ON override in `montree_school_features` for that capability's mapped feature key (table in §3). Super-admin hand-enables stay a superset — a per-school override can only ADD, never remove (removal is what `plan_override` is for). Reuses the 30s `isFeatureEnabled` cache; add a matching `invalidatePlanCache(schoolId)` called from `applyPlan` + super-admin PATCH.

**`lib/montree/plans/apply-plan.ts`** — `applyPlan(supabase, schoolId, plan, source, enabledBy)`: writes `montree_schools.plan/plan_source`, writes `monthly_ai_budget_usd` + `ai_budget_action` from the capability map, and keeps legacy `ai_tier_haiku/ai_tier_sonnet` flags in sync (basic→both off, lite→haiku, full→both) so any un-migrated reader still behaves. Replaces the bodies of `applyAiTier` and `setSchoolAiTier` — both become thin wrappers mapping `free|haiku|sonnet|premium` → plan, so the webhook hot path and super-admin path finally share one implementation.

## 3. GATING — capability → files

Repoint order: raw-flag readers first (they are the drift risk), then feature-key gates.

| Capability | Feature key(s) kept as override | Files / routes to change |
|---|---|---|
| **raw `ai_tier_sonnet` readers → `hasCapability('photoRecognition')`** | — | `app/api/montree/photo-identification/process/route.ts` (~288), `photo-identification/sonnet-review/route.ts`, `app/api/montree/guru/photo-insight/route.ts` (~491) |
| **raw flag readers → `loadResolvedPlan`** | — | `app/api/montree/cron/engagement/route.ts:162-163`, `app/api/montree/super-admin/schools/route.ts:214-234` (replace flag-set join with `plan` column read), `lib/montree/mira/tool-executor.ts` |
| guru | `guru_advisor` | `guru/route.ts` (school roles only — homeschool_parent block untouched), `guru/stream`, `guru/corrections`, `guru/generate-work-content`, `guru/teaching-instructions`, `admin/guru/chat`, `companion/route.ts`, `companion/weekly-work`, `companion/present.ts` |
| astra | `voice_astra`, `onboarding_copilot`, `live_copilot` | `admin/principal-agent/route.ts`, `admin/voice/{token,llm,agent}`, `onboarding-copilot/{ask,state}`, `lib/montree/onboarding-copilot/state-loader.ts`, `admin/parent-meetings/[meetingId]/copilot`, `admin/tracy/{scan-thread,draft-response}` |
| aiReports | `weekly_admin_docs`, `period_reports`, `work_rhythm`, `home_practice_cards` | `weekly-admin-docs/**`, `children/[childId]/weekly-admin`, `reports/period`, `work-rhythm`, `parent/home-practice`, `weekly-review/[childId]`, `reports/weekly-wrap`, `reports/language-semester/generate`, `reports/language-presentation/[childId]`, `children/[childId]/onboard`, `calendar/summary`, `evaluation/reports/_shared.ts` |
| photoRecognition | `photo_onboarding`, `photo_pipeline_v2`, `paper_scan`, `unified_photo_tagger` | `photo-identification/{process,sonnet-review}`, `photo-onboarding/{upload,[importId]/extract,[importId]/commit}`, `guru/{snap-identify,photo-insight,photo-enrich}`, `paper-scan/**`, `app/montree/dashboard/students/page.tsx:677,686` (client nav) |
| montages | — (`montage_enabled` column is dead per `lib/montree/montage/enqueue.ts`) | `app/api/montree/montage/route.ts`, `lib/montree/montage/enqueue.ts` (add plan gate at enqueue — one choke point) |
| parentMessaging | `parent_messaging` | `lib/montree/parent-messaging/access.ts` (2 sites), `messages/broadcast/route.ts:160`, `lib/montree/appointments/share-to-thread.ts`, `lib/montree/meeting-notes/share-to-thread.ts` |
| appointments | `appointments`, `school_events`, `school_calendar` | `appointments/route.ts` (x3), `appointments/parents`, `appointments/availability(+blackouts)`, `lib/montree/appointments/parent-access.ts`, `lib/montree/dark-phonics-live/app-auth.ts`, `admin/events`, `parent/calendar` |
| videoCalls | `agora_video_calls`, `video_recording` | `appointments/[id]/{whiteboard-token,recap,recording/start,agora-token,live-state}`, `parent/appointments`, `dashboard/parent-chats/[parentId]/instant-call` |
| orgOnboarding | `child_onboarding` | `child-onboarding/**`, `parent/intake/{route,upload}`, `app/montree/dashboard/students/page.tsx:694`, `app/api/montree/org/register-school/route.ts` |
| cmsBridge | `child_evaluation`, `child_evaluation_g1`, `english_program` | `lib/montree/evaluation/{route-helpers,montree-bridge,session-service}.ts`, `evaluation/bank`, `evaluation/child/[childId]/report` |

Gate contract unchanged: 402 with `{requires_upgrade:true, upgrade_url:'/montree/admin/billing', feature:'<capability>', error}` so `components/montree/UpgradeCard.tsx` keeps working. **Lite AI-budget exhaustion is a different response**: 200-with-`ai_paused:true` where a template fallback exists, otherwise 402 with `feature:'ai_budget'` and a distinct message ("Your AI allowance for this month is used up — it refreshes on the 1st."). Never present budget exhaustion as an upgrade failure on Full.

Budget wiring: `applyPlan` writes `monthly_ai_budget_usd = 8`, `ai_budget_action='hard_limit'` for Lite → the existing `checkAiBudget().blocked` path already pauses. Add the `checkAiBudget` guard to the Guru/Astra/report routes that don't yet call it (grep `checkAiBudget` — currently only 7 routes).

## 4. STRIPE FLOWS

Env: `STRIPE_PRICE_BASIC_YEAR`, `STRIPE_PRICE_LITE_MONTH`, `STRIPE_PRICE_FULL_CHILD_MONTH` (Railway). Keep `STRIPE_SECRET_KEY`. `STRIPE_PRICE_PER_STUDENT` / `STRIPE_PRICE_STARTER` retired after the last legacy sub migrates.

**Full quantity floor — confirmed correct.** Stripe has no native minimum-charge on a per-seat price. `quantity = Math.max(10, await countActiveStudents())` on a $3 unit price gives exactly $30 floor, prorates correctly on quantity change, and shows honestly on the invoice. Alternative (graduated tiered price with a flat first tier) is cleaner on the invoice but needs a new Stripe Price shape and breaks `sync-quantity`. **Use max(10, n).** Show the floor in the UI: "10 children minimum ($30)".

**Signup (recommended: Checkout, not SetupIntent).** `try/instant` creates the school as today but with `subscription_status='incomplete'`, `plan='basic'`, `plan_source='stripe'`, `trial_ends_at=NULL`, then returns `checkout_url` for the Basic annual price alongside the login code. The principal is logged in and the school is fully usable on Basic (zero AI spend → zero abuse risk) while a dismissible "Add your card to keep your school" banner shows until the webhook flips `subscription_status='active'`. SetupIntent is rejected: it stores a card but still needs a second invoice call to actually charge $12, i.e. more code for the same outcome.

**Checkout route** (`billing/checkout/route.ts`): body `{plan:'basic'|'lite'|'full'}`, anything else → `basic`. `founding_member` → force `full`. `billing_override_usd===0` → 400 (unchanged). Price by plan; `quantity` = 1 for basic/lite, `max(10, activeChildren)` for full. `subscription_data.metadata = {school_id, source, montree_plan: plan}`. Drop `trial_period_days` entirely. Keep `payment_method_collection:'always'`.

**Upgrade / downgrade** = `stripe.subscriptions.update(subId, {items:[{id: currentItemId, price: newPriceId, quantity: newQty}], proration_behavior:'create_prorations', metadata:{montree_plan}})` in a new `changeSchoolPlan(supabase, schoolId, plan)` in `billing.ts`; new route `app/api/montree/billing/change-plan/route.ts` (principal-only, same role fallback as checkout). Basic-year → Lite/Full-month: Stripe credits the unused annual portion automatically. Downgrade Full→Basic: `proration_behavior:'none'` + `billing_cycle_anchor` untouched so they keep what they paid for until period end; the webhook writes the new plan on the next `customer.subscription.updated`. **Do not apply a downgrade optimistically in the route** — always let the webhook be the writer, so Stripe and `montree_schools.plan` cannot diverge.

**Webhook** (`handleSubscriptionUpsert`): map price id → plan first (`stripe_price_id_active` vs the three env price ids), then `subscription.metadata.montree_plan` as tiebreak, then legacy unit-amount heuristic (700/300 → full/lite) for old subs. Write `plan`, `plan_source='stripe'`, `stripe_price_id`. Never overwrite `plan` when `plan_override` is set or `founding_member=true` (SELECT both, skip the write, log). `canceled|unpaid|incomplete_expired` → `plan='basic'` (product keeps working, AI stops — much softer than today's total 402). Grace states (`past_due|incomplete|paused`) → leave unchanged.

## 5. PHOTO CAP (Basic only, 500)

**Recommendation: accept + archive oldest. Never 402 a teacher mid-upload.**
- `lib/montree/plans/photo-cap.ts` → `enforcePhotoCap(supabase, schoolId)`: if `resolvePlan().photoCap === null` return immediately (fail-open for Lite/Full). Else count `montree_media WHERE school_id=? AND archived_at IS NULL`; if `count > cap`, archive the oldest `count - cap` by `captured_at ASC` (`UPDATE ... SET archived_at = NOW()`), set `photo_cap_reached_at = NOW()` on the school (first time only).
- Called fire-and-forget at the end of `app/api/montree/media/upload/route.ts` after the `montree_media` insert (the ONE choke point — every other writer inserts derived rows, not new uploads). Errors are logged, never surfaced.
- Every teacher/parent-facing photo list adds `.is('archived_at', null)`. Grep `from('montree_media')` — 30+ call sites; scope: any query that feeds a list/gallery/report. Reports and AI pipelines also filter (archived photos must not be re-processed).
- **Reversible**: storage objects untouched. On upgrade `applyPlan` runs `UPDATE montree_media SET archived_at = NULL WHERE school_id = ?` when the new plan's `photoCap` is null, and clears `photo_cap_reached_at`.
- UI: Basic billing page shows "412 / 500 photos". Above cap: "Your oldest photos are archived — upgrade to Lite to bring them all back."

## 6. UI SURFACES + CARD COPY

**`/pricing` (`app/pricing/page.tsx`, full rewrite, hardcoded English by precedent).** Three cards, Lite featured. Replace the 5-60 student slider with a small "How much is Full for us?" calculator: children × $3, floored at $30. FAQ rewritten: no trial, what Basic gives you, why Lite has a monthly AI allowance, how the Full minimum works, cancel anytime.

Card copy (use verbatim, all three surfaces):

> **Basic — $12 a year**
> Everything a classroom needs, without the AI.
> · The full tracker, tap grid and printables
> · Dark Phonics and the Writing Shelf library
> · Class documents, labels and parent codes
> · Up to 500 photos per school
> One payment a year. That's it.

> **Lite — $20 a month**  *(featured badge: "Most schools start here")*
> Add Guru and Astra, and let Montree write your reports.
> · Guru answers your questions, all day
> · Astra sits with the principal
> · Weekly and parent reports, written for you
> · Unlimited photos — you tag them yourself
> A monthly AI allowance is included. Everything in Basic.

> **Full — $3 per child a month**
> The whole thing. Montree does the seeing and the writing.
> · Take a photo — Montree knows the work
> · Deeper reports parents keep
> · Montages, parent messaging, appointments and calls
> · Onboarding across your whole organisation
> Minimum $30 a month (10 children). Everything in Lite.

**Landing (`app/montree/page.tsx` `id="pricing"`)** — three `.m-price-card`s driven by new i18n keys, 12-locale parity (pre-commit hook enforces): `landing.pricing.{label,title,line,basicName,basicPrice,basicPer,basicB1..B4,liteBadge,liteName,litePrice,litePer,liteB1..B4,fullName,fullPrice,fullPer,fullB1..B4,fullFloor,cta,seeFull}`. Delete-by-orphaning the `starter*`/`premium*`/`trialLine` keys (leave them in locale files; parity stays intact). Update `landing.hero.fineprint` + `landing.closing.body` values: "Basic $12 a year · Lite $20 a month · Full $3 per child. No contracts, cancel anytime."

**Admin billing (`app/montree/admin/billing/page.tsx`)** — current plan pill; three plan cards with the CTA reading Upgrade / Downgrade / Current plan against the resolved plan; POST `/api/montree/billing/change-plan` when a Stripe sub exists, `/checkout` when it doesn't. Basic: photo usage bar (`n / 500`). Lite: AI-allowance bar from `checkAiBudget` (`$3.10 of $8 used — refreshes Oct 1`). Founding card copy → "Founding 100 — Full at $3 per child, for life." Partner card → "Foundation Partner — Full, free for life." Remove the trial countdown line and `trial_days_remaining` usage.

**Super-admin `SchoolsTab.tsx`** — replace the free/haiku/sonnet button row with Basic/Lite/Full; PATCH `{schoolId, plan}` (new field alongside the deprecated `ai_tier`). Pill shows the RESOLVED plan with source: `FULL·founding`, `BASIC·override`, `LITE·stripe`. Setting a plan here writes `plan_override` (source `override`); a "Clear override" ✕ nulls it and falls back to Stripe. Keep the lock button. Retire the `subscription_tier` trial/free/paid row or relabel it "billing status" — it is not the plan.

**`UpgradeCard.tsx`** — no structural change; add `upgrade.feature.<capability>.{title,body}` keys for the 10 capabilities plus `upgrade.feature.ai_budget.*`, each naming the plan that unlocks it ("Guru comes with Lite, $20 a month.").

## 7. RETIREMENTS (grep-verified)

- `STARTER_PRICE_USD` / `STARTER_PRICE_CENTS` — `lib/montree/billing.ts:103-104`, read at `:1172`. Delete both + the legacy 300¢ heuristic.
- `'starter'|'premium'` plan union — `lib/montree/billing.ts:397,407,413,437,443-450,1145,1163`; `app/api/montree/billing/checkout/route.ts:76-81,138-139`; `app/montree/admin/billing/page.tsx:116-118,322`.
- `STRIPE_PRICE_STARTER` env — `billing.ts:444` (and Railway, after the last legacy sub moves).
- Trial: `trial_period_days` block in `createSchoolCheckoutSession`; `DEFAULTS.TRIAL_DAYS` writes in `app/api/montree/principal/register/route.ts:84-100`, `app/api/montree/try/instant/route.ts:676-703` (+ the founding 30-day override at `:226,237,664`), `app/api/montree/teacher/register/route.ts`, `app/api/montree/onboarding/route.ts`; countdown UI `app/montree/admin/billing/page.tsx:269-272,303-306,380-383`; `app/montree/try/page.tsx:38`; `app/api/montree/super-admin/trial-drip/route.ts` (disable the drip, keep the file); `landing.pricing.trialLine` + `landing.hero.fineprint` copy. **Keep the `trial_ends_at`/`subscription_status='trialing'` columns** — never read for tier again.
- Founding "1 month free" copy — `app/api/montree/try/instant/route.ts:203,226,664`, `components/montree/FoundingHundred.tsx`, `app/montree/admin/billing/page.tsx:378-383`, `app/montree/super-admin/page.tsx:201`.
- `app/lyf-coach/page.tsx` 7-day trial copy is a DIFFERENT product — do not touch.

## 8. BUILD SPLIT (3 parallel Opus packages, no file overlap)

**WP-A — Plan core + Stripe (owns `lib/montree/plans/*`, `lib/montree/billing.ts`, `lib/montree/billing/apply-ai-tier.ts`, `lib/montree/reports/resolve-model.ts`, `app/api/montree/billing/**`, `migrations/349_pricing_3tier.sql`, `tests/plans/*`).** Deliver §1, §2, §4, plus the `applyPlan` rewrite and the vitest suites. Ship first — B and C import from it. Must land the compat wrappers before anything else changes.

**WP-B — Gating + photo cap (owns `app/api/montree/**` except `billing/**`, `lib/montree/{parent-messaging,appointments,meeting-notes,evaluation,montage,mira,onboarding-copilot}/*`, `lib/montree/plans/photo-cap.ts`, `app/montree/dashboard/students/page.tsx`).** Deliver §3 and §5 against WP-A's exported signatures (agree the signature up front; do not wait for the implementation). Repoint the four raw-flag readers FIRST — they are the drift bug.

**WP-C — Surfaces + retirements (owns `app/pricing/page.tsx`, `app/montree/page.tsx`, `app/montree/admin/billing/page.tsx`, `app/montree/try/page.tsx`, `components/montree/super-admin/SchoolsTab.tsx`, `components/montree/UpgradeCard.tsx`, `components/montree/FoundingHundred.tsx`, `lib/montree/i18n/*`).** Deliver §6 and the copy half of §7. Needs from WP-A only the shape of `/api/montree/billing/status` (plan, plan_source, photo count, budget) — agree that JSON first.

Sequence: agree interfaces → A/B/C in parallel → A merges → B → C → fresh-eyes review agent per package → Tredoux runs migration 349 → set the three Railway env vars → push → runtime audit.

## 9. VERIFICATION

vitest, `tests/plans/resolve-plan.test.ts`:
- locked beats everything (locked + founding + plan='full' → basic/none/locked).
- override beats founding beats partner beats stripe beats legacy beats default.
- each plan → correct model, budget, photoCap.
- legacy fallback: sonnet flag → full; haiku flag → lite; active + no flags → lite; nothing → basic.
- `deriveTier` compat: basic→'free', lite→'haiku', full→'sonnet' for all 3 plans and for every legacy input the old tests covered.
- `loadResolvedPlan` with a mocked 42703 error → falls back to legacy, never throws, never returns "no product".

`tests/plans/capabilities.test.ts`: capability matrix matches §0 exactly; `hasCapability` returns true when the plan denies but a per-school override is ON; returns false when both deny; a per-school override can never turn a plan-granted capability OFF.

`tests/plans/photo-cap.test.ts`: cap null → no-op; 501 photos on Basic → exactly 1 archived, oldest by `captured_at`; upgrade clears `archived_at` for the whole school.

Runtime (Tredoux, after deploy): Whale on Basic → Guru returns 402 with the upgrade card, tracker + printables work, photo upload succeeds. Whale flipped to Lite via SQL → Guru answers on Haiku, photo recognition still 402s. A Full school → photo recognition, montage and appointments all work. Checkout each of the three prices in Stripe test mode; confirm a Full school with 4 children invoices $30, with 15 children invoices $45. Super-admin plan pill matches what the school actually experiences.

**Whale Class — run in Supabase AFTER migration 349:**
```sql
-- Basic now
UPDATE montree_schools
SET plan = 'basic', plan_override = 'basic', plan_source = 'override',
    monthly_ai_budget_usd = 0, ai_budget_action = 'hard_limit'
WHERE id = 'c6280fae-567c-45ed-ad4d-934eae79aabc';
UPDATE montree_school_features SET enabled = FALSE
WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND feature_key IN ('ai_tier_haiku','ai_tier_sonnet');

-- Lite later (one statement, run when ready)
UPDATE montree_schools
SET plan = 'lite', plan_override = 'lite', plan_source = 'override',
    monthly_ai_budget_usd = 8, ai_budget_action = 'hard_limit'
WHERE id = 'c6280fae-567c-45ed-ad4d-934eae79aabc';
UPDATE montree_school_features SET enabled = (feature_key = 'ai_tier_haiku')
WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND feature_key IN ('ai_tier_haiku','ai_tier_sonnet');
```

## 10. RISKS / LANDMINES

1. **Deploy-order.** Unlike Jul 6, code is safe to deploy before the migration — but ONLY if `loadResolvedPlan` catches 42703 and retries. Review that catch personally; it is the single most important line in this plan.
2. **Existing schools losing AI.** Every school not covered by the §1 backfill lands on Basic and stops getting AI the moment this ships. Run the backfill SELECTs and eyeball the result BEFORE the UPDATEs.
3. **Two grant mechanics.** `applyAiTier` and `setSchoolAiTier` currently diverge by design. Collapsing them into `applyPlan` touches the hot webhook path — keep the webhook copy best-effort (log, never throw) exactly as it is today.
4. **Feature-flag overrides can't remove.** A school hand-granted `appointments` before this ships keeps appointments on Basic. That is intended (grandfathering), but Tredoux should audit `montree_school_features` for surprise grants.
5. **Full minimum + `sync-quantity`.** `sync-quantity` must apply the same `max(10, n)` floor or the next sync silently drops a Full school below $30.
6. **Basic schools still cost money.** Photo storage, media proxy, egress. 500 photos is the lever; if $12/yr stops covering it, the cap is the number to move, not the price.
7. **Annual → monthly proration** produces odd first invoices (Stripe credits unused Basic year). Expect a support question; the Stripe portal explains it better than we can.
8. **Locked schools** resolve Basic, not "nothing" — they still can't log in (auth/unified 403 unchanged), so the softer AI resolution is invisible. Verify auth lock still fires.

---

# WP-A BUILD NOTES (built Sep 7 2026)

**Status: BUILT, not committed, not deployed. Migration 349 NOT yet run.**
Gates: `tests/plans-resolve.test.ts` + `tests/plans-capabilities.test.ts` = **79/79 green**;
full suite **1447/1447 green** (no regressions); `eslint` on every touched file = **0 errors,
0 warnings**; scoped `tsc -p tsconfig.plans.tmp.json` = **0 new errors** (9 pre-existing
Stripe-SDK-drift errors remain in `billing.ts` / `billing/webhook`: `apiVersion`,
`subscription.current_period_start/end`, `'alipay'` payment-method type, and the
`billing_override_usd >= 0` string|number compare — all on lines this work did not touch).

## A1. Director decisions applied (binding, from the build brief)

1. **Photo cap is GRANDFATHERED.** New column `montree_schools.plan_changed_at`, stamped by
   every writer of `plan`/`plan_override`, backfilled to `NOW()` in the migration. WP-B counts
   `montree_media.created_at >= plan_changed_at` — a school that drops to Basic keeps its
   existing library and only its NEW photos count toward 500. Exposed as
   `ResolvedPlan.planChangedAt` (null = unknown/pre-migration → count the whole library).
2. **Founding schools ARE subject to the $30/month minimum** — `fullPlanQuantity` is applied to
   them exactly like everyone else. No separate founder price.
3. **Legacy $7 subscriptions untouched.** `STRIPE_PRICE_PER_STUDENT` stays readable and
   `planForPriceId()` maps it to `'full'`; it is never offered in checkout again.
4. Tier names in code are `'basic' | 'lite' | 'full'` throughout.

## A2. THE IMPORT SIGNATURES — what WP-B and WP-C build against

```ts
// ── types (lib/montree/plans/types.ts) — pure, zero app imports ──────────
import type { Plan, PlanModel, PlanSource, Capability, PlanInputs, ResolvedPlan }
  from '@/lib/montree/plans/types';
import {
  ALL_PLANS, ALL_CAPABILITIES, toPlan, fullPlanQuantity, PLAN_ECONOMICS,
  BASIC_PRICE_USD_PER_YEAR,        // 12
  LITE_PRICE_USD_PER_MONTH,        // 20
  FULL_PRICE_USD_PER_CHILD_MONTH,  // 3
  FULL_MIN_CHILDREN,               // 10
  FULL_MIN_USD_PER_MONTH,          // 30
  BASIC_PHOTO_CAP,                 // 500
} from '@/lib/montree/plans/types';

type Plan  = 'basic' | 'lite' | 'full';
type PlanModel = 'none' | 'haiku' | 'sonnet';
type PlanSource = 'locked'|'override'|'founding'|'partner'|'stripe'|'legacy'|'default';
type Capability = 'guru'|'astra'|'aiReports'|'photoRecognition'|'montages'
  |'parentMessaging'|'appointments'|'videoCalls'|'orgOnboarding'|'cmsBridge';

interface ResolvedPlan {
  plan: Plan; model: PlanModel; source: PlanSource; locked: boolean;
  aiBudgetUsd: number; photoCap: number | null; planChangedAt: string | null;
}

toPlan(value: unknown): Plan | null          // narrows an untrusted string
fullPlanQuantity(activeChildren: number): number   // THE $30 floor, max(10, n)

// ── resolver (lib/montree/plans/resolve-plan.ts) ────────────────────────
resolvePlan(input: PlanInputs): ResolvedPlan                     // pure, sync
loadResolvedPlan(supabase: any, schoolId: string): Promise<ResolvedPlan>  // 42703-safe

// ── capabilities (lib/montree/plans/capabilities.ts) ────────────────────
hasCapability(supabase: any, schoolId: string, cap: Capability): Promise<boolean>  // ← WP-B's gate
loadCapabilities(supabase: any, schoolId: string): Promise<Record<Capability, boolean>>
planGrants(plan: Plan, cap: Capability): boolean                 // pure
invalidatePlanCache(schoolId?: string): void
PLAN_CAPABILITIES: Record<Plan, PlanCapabilities>                // + photoCap, aiBudgetUsd
CAPABILITY_FEATURE_KEYS: Record<Capability, readonly FeatureKey[]>

// ── grant (lib/montree/plans/apply-plan.ts) ─────────────────────────────
applyPlan(supabase, schoolId, plan: Plan, source: PlanSource,
          enabledBy?: string,
          options?: { overrideColumn?: Plan | null; unarchivePhotos?: boolean })
  : Promise<{ ok: boolean; plan: Plan; error?: string; migrationPending?: boolean }>

// A barrel exists: import { ... } from '@/lib/montree/plans'
```

**`hasCapability` semantics (the contract WP-B must not weaken):** returns true when the
resolved plan grants the capability **OR** an EXPLICIT `montree_school_features` row exists
with `enabled = true` for one of that capability's mapped keys. It deliberately does **not**
call `isFeatureEnabled()` — that falls back to `montree_feature_definitions.default_enabled`,
and several mapped keys ship default ON (`photo_onboarding`, `child_onboarding`,
`onboarding_copilot`), which would hand every Basic school a Full entitlement. An override can
only ADD; removal is `plan_override` / `locked_at`.

**`applyPlan` writes, in one call:** `plan` + `plan_source` + `plan_changed_at`
(+ `plan_override` only when `overrideColumn` is passed — super-admin's picker should pass it;
the "Clear override" ✕ passes `null`) · `monthly_ai_budget_usd` + `ai_budget_action` from
`PLAN_ECONOMICS` · the legacy `ai_tier_haiku`/`ai_tier_sonnet` flags kept in lockstep
(basic→both off, lite→haiku only, full→both) · un-archives every photo when the target plan is
uncapped and clears `photo_cap_reached_at` · invalidates the budget, feature and plan caches.
It is **best-effort and never throws** (it runs inside the Stripe webhook).

## A3. Env vars Tredoux must set in Railway (before checkout works)

| Env | What | Notes |
|---|---|---|
| `STRIPE_PRICE_BASIC_YEAR` | $12/year/school Price ID | quantity always 1 |
| `STRIPE_PRICE_LITE_MONTH` | $20/month/school Price ID | quantity always 1 |
| `STRIPE_PRICE_FULL_CHILD_MONTH` | $3/child/month Price ID | quantity = `max(10, children)` |
| `STRIPE_PRICE_PER_STUDENT` | **keep** — legacy $7 Premium | read-only, maps to `full` |
| `STRIPE_PRICE_STARTER` | **retired** — safe to delete | no longer read anywhere |

A missing plan Price returns `{ok:false, configured:false}` → the route answers **503** with a
message naming the exact env var. Nothing 500s.

## A4. API shapes WP-C builds against

**`GET /api/montree/billing/status`** gained a top-level `plan` block (everything else in the
response is unchanged):

```jsonc
"plan": {
  "plan": "basic",            // resolved
  "source": "stripe",         // locked|override|founding|partner|stripe|legacy|default
  "model": "none",            // none|haiku|sonnet
  "locked": false,
  "ai_budget_usd": 0,
  "photo_cap": 500,           // null = unlimited
  "photos_used": 412,         // null when uncapped; GRANDFATHERED count
  "plan_changed_at": "2026-09-07T…",
  "prices": { "basic_usd_per_year": 12, "lite_usd_per_month": 20,
              "full_usd_per_child_month": 3, "full_min_children": 10,
              "full_min_usd_per_month": 30 },
  "full_quote_quantity": 10,       // what Full would bill today, floor included
  "full_quote_usd_per_month": 30
}
```

**`POST /api/montree/billing/checkout`** — body `{plan: 'basic'|'lite'|'full'}` (anything else,
including the retired `starter`/`premium`, coerces to `basic`). Founding → forced `full`.
`billing_override_usd === 0` → 400. Response now also carries `plan`. When a Stripe
subscription already exists it returns `{already_subscribed:true, change_plan_endpoint:'…',
portal_endpoint:'…'}`.

**`POST /api/montree/billing/change-plan`** (NEW, principal-only with the same
`montree_school_admins` fallback as checkout) — body `{plan}`. Returns
`{ok, plan, quantity, direction:'upgrade'|'downgrade'|'same', plan_pending:true}`.
`409 {needs_checkout:true}` when there is no Stripe subscription yet. Founding → 400; $0
partner → 400. **It deliberately does not write `montree_schools.plan` — the webhook is the
only writer**, so the UI should re-fetch status shortly after, not assume the new plan.

**`POST /api/montree/try/instant`** — all three role branches (principal / teacher /
homeschool_parent) now return an optional **`checkoutUrl`** (camelCase) alongside `code` and
`token`: a Stripe Checkout session for the $12/year Basic price. It is **absent** when a
founding/partner code was redeemed, when Stripe is unconfigured, or if session creation failed
— a missing `checkoutUrl` is a soft state, never an error. WP-C renders the dismissible "add
your card" banner from it until `subscription_status` flips to `active`.

## A5. Deviations from the plan, and why

1. **`PLAN_ECONOMICS` lives in `types.ts`, not `capabilities.ts`.** `capabilities.ts` imports
   `loadResolvedPlan`, so `resolve-plan.ts` importing `PLAN_CAPABILITIES` back would be a real
   ESM import cycle. The budget/photo-cap numbers therefore live in `types.ts` and
   `PLAN_CAPABILITIES` spreads them in — still exactly one source of truth, pinned by a test.
2. **`photo_pipeline_v2` and `unified_photo_tagger` are EXCLUDED from
   `CAPABILITY_FEATURE_KEYS.photoRecognition`** (plan §3 listed them). They are behavioural
   flags — which pipeline, which tagger UI — and schools carry explicit rows for them for
   rollback reasons; honouring either as an entitlement override would silently grant Full's
   photo recognition to Basic schools. The entitlement-shaped keys (`photo_onboarding`,
   `paper_scan`) remain. Pinned by a test.
3. **Lite's $8 budget is `hard_limit`, not `soft_limit`.** Plan §0 says "$8 / hard_limit"; the
   old `applyAiTier` used `soft_limit` for haiku. Followed the plan.
4. **`applyAiTier` infers `plan_source` from its `enabledBy` label** (`*partner*`→partner,
   `*founding*`→founding, `*stripe*`/`*webhook*`→stripe, else override) so the existing
   founding/partner redemption paths record the right source without touching their call sites.
   It never writes `plan_override` — those are grants, not super-admin forces. The super-admin
   plan picker (WP-C) should call `applyPlan(..., 'override', ..., { overrideColumn: plan })`
   directly.
5. **`syncSubscriptionQuantity` got two extra guards** beyond the plan's floor requirement:
   Basic/Lite sync to quantity **1** (they are flat per school — headcount must never touch
   them), and the override-Price *swap* is now skipped for any subscription already on a plan
   Price. Without the second guard, a Basic subscription ($1200/yr) reads as a "price mismatch"
   against `effectivePricePerStudentCents` ($700) and gets swapped onto the per-student Price on
   the next sync. The stored monthly estimate now uses Stripe's actual unit amount for plan
   subscriptions. Legacy per-student subscriptions behave exactly as before.
6. **The webhook writes `stripe_price_id`** (non-fatal, warns pre-349) so sync-quantity and the
   billing page can read the plan back without a Stripe round-trip.
7. **`foundingTrialEndsAtIso` in try/instant was left in place** — vestigial. Removing it would
   skip founding redemption entirely (`if (founding && foundingTrialEndsAtIso)`); nothing reads
   `trial_ends_at` for entitlement any more, and founding schools are Full because
   `founding_member = true`. Retiring it belongs to WP-C's copy pass.

## A6. Files created / modified

**Created:** `migrations/349_pricing_3tier.sql` · `migrations/349_pricing_3tier_ROLLBACK.sql` ·
`lib/montree/plans/{types,resolve-plan,capabilities,apply-plan,index}.ts` ·
`app/api/montree/billing/change-plan/route.ts` ·
`tests/plans-resolve.test.ts` · `tests/plans-capabilities.test.ts` ·
`tsconfig.plans.tmp.json` (scratch — delete when convenient, it is a `*.tmp.*` so tsconfig
already excludes it).

**Modified:** `lib/montree/reports/resolve-model.ts` (now a thin wrapper; adds `PLAN_TO_TIER`,
`TIER_TO_PLAN`; `deriveTier` deprecated but compiling — **behaviour change: the trialing
three-way is gone, `trialing` no longer grants Sonnet**) · `lib/montree/billing/apply-ai-tier.ts`
(wrapper over `applyPlan`) · `lib/montree/billing.ts` (three plan Prices + `planPriceId` +
`planForPriceId`, `STARTER_PRICE_*` deleted, checkout rewritten and de-trialed, new
`changeSchoolPlan`, `setSchoolAiTier` now a wrapper, webhook maps Price→plan and skips the write
on `plan_override`/`founding_member`, sync-quantity floor) ·
`app/api/montree/billing/{checkout,status}/route.ts` ·
`app/api/montree/try/instant/route.ts` (Basic + `subscription_status:'incomplete'` +
`trial_ends_at: null`, non-fatal plan stamp, `checkoutUrl` on all three branches;
`DEFAULTS.TRIAL_DAYS` import removed).

## A7. Handover warnings

- **Deploy-before-migration is safe, but review `isUndefinedColumn` in
  `resolve-plan.ts` personally** — it is the single line that makes it true (plan §10 risk 1).
  A test mocks a real 42703 and asserts the legacy fallback.
- **Run the §1 backfill SELECTs and eyeball them before the UPDATEs.** Every school not covered
  lands on Basic and loses AI the moment this ships (plan §10 risk 2).
- `AiTierTarget` and `tierForSubscriptionStatus` are still exported from `billing.ts` for the
  two external callers (`record-incoming-wire`, `cron/dunning-alipay`); `tierForSubscriptionStatus`
  is now unused internally and can be retired once those move to `applyPlan`.
- WP-B: the 402 gate contract is unchanged — `{requires_upgrade:true,
  upgrade_url:'/montree/admin/billing', feature:'<capability>', error}`. Budget exhaustion on
  Lite is a **different** response (`feature:'ai_budget'`), not an upgrade failure.


---

# WP-B BUILD NOTES (built Sep 7 2026)

**Status: BUILT, not committed, not deployed.** Gates: `tests/plans-gating.test.ts` = **26/26
green**; full suite **1473/1473 green** (1447 before WP-B, +26 — no regressions); `eslint` across
all 75 touched files = **0 NEW errors, 0 NEW warnings** (one pre-existing `@ts-nocheck` error in
`photo-audit/tell-ai/route.ts`, untouched by this work); scoped `tsc` over all 75 files = **71
errors, 0 of them new** — mechanically verified: zero errors fall within ±3 lines of any WP-B diff
hunk, and every WP-B module (`plans/gate.ts`, `plans/photo-cap.ts`, `montage/enqueue.ts`,
`mira/tool-executor.ts`, `super-admin/schools`, the evaluation bridge, the two parent access
guards) is completely clean. The 71 are the known Supabase-typegen / Stripe-SDK drift cluster
(`admin/guru-executor` 18, `language-presentation` 9, `guru/context-builder` 8, `billing.ts` 8 =
WP-A's documented set, etc.).

**No WP-A file was modified.** `applyPlan`'s `unarchivePhotos` default (`econ.photoCap === null`)
already fires on every upgrade path — `billing.ts:1163` (`setSchoolAiTier`), `billing.ts:1287`
(the webhook) and the new super-admin `plan` PATCH all reach `applyPlan`, so nothing needed wiring.

## B1. The gate — one helper, one contract

**`lib/montree/plans/gate.ts` (NEW).** Every gated route calls
`requireCapability(supabase, schoolId, cap)` → `null` when allowed, or the 402 to return.
Body: `{ success:false, error, requires_upgrade:true, upgrade_url:'/montree/admin/billing',
feature:'<capability>', capability:'<capability>' }`. `feature` is kept verbatim for
`UpgradeCard.tsx` and the ~8 client surfaces that already read it; `capability` is the new explicit
name WP-C's copy keys hang off. Default message names the unlocking plan ("Montages comes with
Full."). Copy is hardcoded English — **WP-C owns the i18n**; the keys it needs are
`upgrade.feature.<capability>.*` for the 10 capabilities plus `upgrade.feature.ai_budget.*`.

`planBudgetExhaustedResponse()` is the **separate** shape: **429**, `ai_budget_exhausted:true`,
**no `requires_upgrade`**, message "Your AI allowance for this month is used up — it resets on the
1st." Verified against the two client readers: `GuruChatThread.tsx:299` renders UpgradeCard only on
`402 && requires_upgrade`, and `dashboard/weekly-wrap/page.tsx:253` on `402 || requires_upgrade` —
a 429 falls to each one's plain-error path and shows the sentence. Wired into the four routes that
had a `budgetStatus.blocked` early return: `guru/route.ts`, `children/[childId]/activity-summary`,
`reports/language-semester/generate`, `reports/weekly-wrap`.

## B2. Files touched, grouped by capability

**photoRecognition (FULL only)** — the gate Lite must not pass:
`photo-identification/process/route.ts` (see B3 — a graceful skip, not a 402) ·
`photo-identification/sonnet-review` · `guru/snap-identify` · `guru/photo-insight` ·
`guru/photo-enrich` · `photo-onboarding/{upload,[importId]/extract,[importId]/commit}` ·
`paper-scan/{upload,[scanId]/extract}`.

**montages (FULL only)** — gated at the ONE choke point, `lib/montree/montage/enqueue.ts`. New
exported `hasMontageCapability()` wraps `hasCapability` in a try/catch so a plan-lookup failure can
never throw out of a module whose whole contract is "a montage problem never touches report
delivery". `maybeEnqueueMontageJobs` and `requeueMontageJob` **silently return** (they have no user
watching); `enqueueScopedMontage` returns the typed refusal `reason:'plan_not_included'`, which
`app/api/montree/montage/route.ts` maps onto `planGateResponse('montages')`.

**parentMessaging (FULL only)** — `lib/montree/parent-messaging/access.ts` (both
`resolveMessagingParent` and `isParentMessagingOn`), `lib/montree/appointments/share-to-thread.ts`,
`lib/montree/meeting-notes/share-to-thread.ts`.

**appointments (FULL only)** — `lib/montree/appointments/parent-access.ts`,
`appointments/route.ts` ×3, `appointments/parents`, `appointments/availability` ×2,
`appointments/availability/blackouts`, `admin/events` ×2, `parent/calendar`,
`lib/montree/events/parent-access.ts`.

**videoCalls (FULL only)** — `appointments/route.ts` (agora + video_calls),
`appointments/[id]/agora-token`, `appointments/[id]/recording/start` ×2,
`dashboard/parent-chats/[parentId]/instant-call`, `parent/appointments` ×4.

**orgOnboarding (FULL only)** — `child-onboarding/{route,[intakeId],document,print-data}`,
`parent/intake/{route,upload}`.

**cmsBridge (FULL only)** — new `hasEvaluationCapability()` in
`lib/montree/evaluation/montree-bridge.ts` (2-arg, matching the module's existing `isFeatureEnabled`
seam), consumed by `lib/montree/evaluation/route-helpers.ts` and
`app/api/montree/evaluation/reports/_shared.ts`.

**guru / astra / aiReports** — already correctly denied on Basic: WP-A's `resolveReportModel`
returns `tier:'free'` for Basic, and 25 routes already 402 on that. Those 25 payloads gained the
new `capability` field (guru/companion → `guru`; the eight `admin/*` AI surfaces → `astra`;
reports / weekly-review / tell-ai / onboard / draft-reply / transcribe → `aiReports`;
snap-identify + sonnet-review → `photoRecognition`). No new gate was added on top of a working
tier gate — a second check would only be a second thing to drift.

**Raw-flag readers repointed** (the drift risk, done first):
`cron/engagement/route.ts` (the `ai_tier_sonnet||ai_tier_haiku` pair → `loadResolvedPlan(...).plan
!== 'basic'` — a founding/partner/override school no longer gets a trial-lifecycle nudge) ·
`super-admin/schools/route.ts` (`deriveTier` → pure `resolvePlan`, and the row now also carries
`plan`, `plan_source`, `plan_override` for WP-C's pill; `ai_tier` kept in the legacy vocabulary) ·
`lib/montree/mira/tool-executor.ts` (hand-assembled flag pair → `loadResolvedPlan`; the tool result
gained a `plan` field beside `ai_tier`). The other three the plan listed
(`photo-identification/{process,sonnet-review}`, `guru/photo-insight`) were **already** on the
resolved tier — verified by grep, nothing to repoint.

**Super-admin PATCH gained `plan`** (`app/api/montree/super-admin/schools/route.ts`) — the field
WP-C's SchoolsTab picker should send. `'basic'|'lite'|'full'` → `applyPlan(..., 'override', ...,
{ overrideColumn: plan })`; `null` → clears `plan_override` only (the `plan` column is left for the
next webhook, so clearing can never strand a school on a plan nobody chose). `ai_tier` still works
and is marked deprecated in-file.

## B3. Photo recognition is a SKIP, not a 402, at the pipeline entry

`photo-identification/process` is triggered fire-and-forget by the upload path. A 402 there would
surface as a scary client error on a photo that saved perfectly, so the gate returns
`{ success:true, skipped:true, outcome:'skipped_plan', capability:'photoRecognition' }` — the same
shape as the pre-existing `skipped_event_photo` branch, placed immediately after it and above the
idempotency check.

**`identification_status` is deliberately left NULL.** Writing a terminal state would have been
free (`'skipped'` is already in the migration-210 CHECK constraint, so no migration needed) but it
would **strand the photo**: a school that upgrades to Full later would never have its backlog
processed, because the idempotency branch treats `'skipped'` as done. Leaving it null means the
existing sweep re-offers the photo and the gate answers from a 30s-cached plan read until they
upgrade. No new `identification_status` value was introduced and **no migration was added** —
adding one would have meant editing the CHECK constraint, which is WP-A/Tredoux territory.

## B4. Photo cap

**`lib/montree/plans/photo-cap.ts` (NEW).** `enforcePhotoCap(supabase, schoolId)` — returns
immediately with **no query** when `photoCap === null` (Lite/Full). Otherwise counts un-archived
rows **at/after `plan_changed_at`** (the grandfather line from WP-A note A1; null → the whole
library counts, which is safe because at that point nothing has been archived), and archives the
overshoot oldest-first by `captured_at ASC` in batches of 200. Stamps
`photo_cap_reached_at` once (guarded `.is(..., null)`). Every failure is logged and swallowed.

Called **fire-and-forget** from `app/api/montree/media/upload/route.ts`, placed right after the
`montree_media` insert and **before** the group-link branch, so both return paths are covered.
Grep-verified this is the only new-photo insert on the Basic path (`guru/snap-identify` also
inserts, but it is Full-only and Full is uncapped).

**`.is('archived_at', null)` added to the teacher/parent-facing read sites** (11 queries across 9
files): `media/route.ts` ×3 (child gallery direct + group + school-wide list) · `parent/photos` ·
`parent/dashboard` (photo strip) · `albums/route.ts` ×2 · `audit/photos` (Wrap Up) ·
`reports/available-photos` (the report picker) · `present/album` ·
`lib/montree/montage-tracker/media.ts` (the montage picker base query).

**Left unfiltered, deliberately:** single-photo-by-id lookups (`media/children`, `media/crop`,
`super-admin/photo-debug`, the `montree_media` update/delete paths in `media/route.ts`) — a direct
link to an archived photo must still resolve, and archiving is reversible · the AI pipelines
(`photo-identification/*`, `guru/photo-*`, `paper-scan/*`) — they are Full-only, where nothing is
ever archived · analytics/count surfaces (`admin/activity`, `dashboard/class-progress`,
`intelligence/daily-brief`, `cron/*`, `mira/*`, `tracy/*`, `work-rhythm`,
`weekly-admin/compute-expected-works`, `reports/period-aggregator`) — these count history, and
hiding archived rows would silently rewrite a school's past numbers. ~55 of the ~85
`from('montree_media')` sites are therefore untouched by design. **If a Basic school ever reports
"my old photos vanished from X", X is in that list and is the next filter to add.**

## B5. Routes in §3 deliberately NOT gated, and why

- **`app/api/montree/paper-scan/{route,sheet/print,layouts/*,[scanId],extraction/*}`** — reads and
  the printable record sheet. Printables are a Basic entitlement (§0); only the two AI-spending
  entry points (`upload`, `[scanId]/extract`) are gated.
- **`messages/broadcast/route.ts:160`** — the plan listed it under parentMessaging, but the flag
  there is `principal_newsletter` (an outbound-email opt-in), not messaging. Left alone.
- **`app/api/montree/org/register-school/route.ts`** — listed under orgOnboarding; it contains no
  feature gate and is org-provisioning, not child intake. Left alone; flagging for the auditor.
- **`lib/montree/onboarding-copilot/state-loader.ts`** and the `onboarding-copilot/{ask,state}`
  routes — Astra's onboarding surface. `ask` is deliberately Haiku-for-all-tiers ("onboarding never
  402s", Jul 16 rule) and it already has its own budget gate. Gating it would 402 a principal
  mid-signup on the plan they just bought. Left alone by judgement; if the director disagrees this
  is a two-line change.
- **`app/montree/dashboard/students/page.tsx` client nav** (photo-onboarding / child-onboarding
  buttons) and **`app/montree/dashboard/photo-audit/page.tsx:2936`** (`sonnetTierEnabled=
  {isEnabled('ai_tier_sonnet')}`) — **left for WP-C.** Both need a plan-aware CLIENT source and WP-C
  is already fetching `/api/montree/billing/status` (which carries `plan`); plumbing a second
  capability context from here would collide with its work. Neither is a hole: every destination
  route now denies server-side, and `applyPlan` keeps `ai_tier_sonnet` in lockstep with the plan
  (basic→off, lite→haiku only, full→both), so the Ask-Sonnet button is already correct.

## B6. Semantics worth knowing before "fixing" something

1. **Parent-facing denials stay 404, not 402.** `parent-messaging/access.ts`,
   `appointments/parent-access.ts`, `events/parent-access.ts`, `parent/calendar` — a PARENT must
   never be shown their school's billing state. The surface simply does not exist. Only
   teacher/principal routes speak in upgrade cards.
2. **The evaluation surface stays on its friendly 503 `featureOff()` shape**, not a 402 — it has
   never spoken in upgrade cards and changing that would break its client contract.
3. **`isFeatureEnabled` → `hasCapability` is a semantic change, on purpose.** `isFeatureEnabled`
   falls back to `montree_feature_definitions.default_enabled`; `hasCapability` requires an
   EXPLICIT `montree_school_features` row. So a school that had `appointments` /
   `child_onboarding` / `photo_onboarding` purely by DEFINITION DEFAULT loses it on Basic/Lite —
   which is the point — while a school with a real hand-granted row keeps it (grandfathering).
   **Tredoux should eyeball `montree_school_features` for surprise grants before deploy** (plan §10
   risk 4). 11 dead `isFeatureEnabled` imports were removed as a result.
4. **`school_events` and `school_calendar` map to the `appointments` capability**, per §3's
   grouping. Consequence: a school with only an explicit `school_events` row also passes the
   `appointments` gate. Accepted; if events should be independently grantable it needs its own
   capability, which is a WP-A change.
5. **`video_calls`** (distinct from `agora_video_calls`) is read in two places and was repointed to
   the `videoCalls` capability, but it is **not** in WP-A's `CAPABILITY_FEATURE_KEYS.videoCalls`, so
   an explicit `video_calls` row alone will NOT grandfather calls onto Basic. Correct per §0;
   noting it because it is the one asymmetry.

## B7. Handover to WP-C / the auditor

- **i18n owed:** `upgrade.feature.<capability>.{title,body}` × 10 + `upgrade.feature.ai_budget.*`,
  12 locales. Every gate ships hardcoded English in the JSON `error` until then.
- **Client gates owed:** the students-page nav buttons and the photo-audit Sonnet button (B5).
- **Super-admin:** the route now accepts `{schoolId, plan}` and returns `plan`/`plan_source`/
  `plan_override` per school — SchoolsTab's Basic/Lite/Full picker and the `PLAN·source` pill can be
  built straight against it, including the "Clear override" ✕ (send `plan: null`).
- **Runtime checks after deploy:** Whale on Basic → Guru 402s with `capability:'guru'`, tracker +
  printables work, photo upload SUCCEEDS and the photo appears untagged · flip Whale to Lite → Guru
  answers on Haiku, a fresh photo still comes back untagged (`outcome:'skipped_plan'` in the
  Railway log) · a Full school → recognition, montage, appointments all work · spend a Lite school
  past $8 → the 429 sentence, not an upgrade card · a Basic school past 500 post-plan-change photos
  → the upload succeeds and the oldest post-change photos gain `archived_at`.

---

# WP-C BUILD NOTES (built Sep 7 2026)

**Status: BUILT, not committed, not deployed.** Gates: `npm run i18n:check` → **12/12,
100% parity** · ESLint on all 8 touched files → **0 errors** (8 pre-existing warnings,
none new, all in `try/page.tsx` and `montree/page.tsx` on lines this work did not touch)
· scoped `tsc -p tsconfig.wpc.tmp.json` (632 files, `@/*`→`./*`) → **0 errors** · dev
server `/pricing` **200** and `/montree` **200**, both rendering Basic / Lite / Full
(landing also renders the "Most schools start here" badge and the $30 floor line).

## C1. Files touched

**Pages / components**
- `app/pricing/page.tsx` — full rewrite. Three cards (Full featured), hero with no trial
  copy, a Full-only calculator applying the same `max(10, n) × $3` floor `billing.ts`
  uses (with a "Minimum $30 a month" line that appears only below the floor), a Founding
  100 strip, a 9-question FAQ rebuilt for the new model, CTAs pointed at `/montree/try`.
  Hardcoded English, plain `<style>` tag — both unchanged conventions.
- `app/montree/page.tsx` — pricing section rebuilt as three i18n-driven cards; the
  `landing.pricing.line` tagline replaces `trialLine`; `.m-pricing-cards` is now a
  3-column grid that stacks at 880px (a tablet would otherwise crush a price onto two
  lines); new `.m-price-card-floor` rule for Full's $30 minimum; stale Starter/Premium
  comment corrected.
- `app/montree/admin/billing/page.tsx` — reads the WP-A `plan` block; resolved-plan pill
  with its source ("Founding member" / "Foundation Partner" / "Set by Montree"); a
  three-card chooser whose CTA reads Upgrade / Move to / **Current plan** against the
  resolved plan; Basic photo-usage bar (`n / 500` + the archive explanation); Lite AI
  allowance line; an "Add your card" banner when `subscription_status === 'incomplete'`;
  Founding and Partner cards rewritten to the new promises. Trial countdown tile, trial
  lines and the Starter/Premium chooser are gone.
- `app/montree/admin/page.tsx` — `<TrialExpiringBanner />` unmounted (import commented,
  component file left on disk).
- `app/montree/try/page.tsx` — `checkoutUrl` typed and surfaced; founding / partner
  banner copy rewritten off "one month of Premium free".
- `components/montree/super-admin/SchoolsTab.tsx` + `types.ts` — the Free/Haiku/Sonnet
  row is now Basic/Lite/Full writing `plan_override`, plus a ✕ that clears it; above the
  buttons sits the RESOLVED plan and its source (`FULL · founding`). Column header is
  now "Plan · AI".
- `components/montree/UpgradeCard.tsx` — optional `capability` prop (wins over `feature`
  when both arrive) and `extractUpgradeFromResponse` now returns `capability`. Fully
  backwards compatible: an old 402 body with only `feature` renders exactly as before.

**i18n** — `scripts/pricing-3tier-i18n.mjs` (idempotent, kept in repo) wrote all 12
locale files: **46 new keys** (24 `landing.pricing.*` + 22 `upgrade.feature.<capability>.*`
covering all ten capabilities plus `ai_budget`) and **9 rewritten values**
(`landing.hero.fineprint`, `landing.closing.body`, `landing.pricing.trialLine`,
`register.trialDuration`, `trialBanner.ctaText`, `billing.notConfiguredPricing`,
`upgrade.title`, `upgrade.body`, `upgrade.cta`). **All 12 locales are hand-authored, not
English copies** — en/zh written first, the other ten translated in full.

## C2. Retirements done

Trial and Starter/Premium copy removed from: the pricing page, the landing pricing
section, the admin billing page (countdown + chooser + founding/partner cards), the admin
dashboard (banner unmounted), the try funnel (founding banner), and the nine i18n values
above in every locale. `app/lyf-coach/**` was not touched (different product, per §7).
The `landing.pricing.starter*` / `premium*` / `perStudent` keys are **orphaned, not
deleted** — parity stays intact, exactly as §6 asks.

## C3. Deviations, and why

1. **Post-signup does NOT hard-redirect to Stripe.** The brief asked for a redirect when
   `checkoutUrl` is present. `/montree/try`'s "Take me in" is the only thing that hands
   the principal their login code and then runs the setup ceremony
   (`/montree/principal/setup`); Stripe's `success_url` is `/montree/admin/billing`, so a
   redirect would drop a brand-new principal into billing with an unbuilt school and a
   code they had one screen to memorise. Instead the code screen carries an explicit
   "Add your card — Basic, $12 a year →" link straight to `checkoutUrl`, and the billing
   page shows the same offer as a banner for as long as `subscription_status` is
   `incomplete`. If the director wants the hard redirect, it is one line in
   `handleTakeMeIn`.
2. **No Lite AI-allowance BAR.** `GET /billing/status` exposes `ai_budget_usd` (the
   allowance) but not the spend so far, so the page states the allowance and when it
   refreshes rather than drawing a bar off a number it does not have. Add the bar the
   moment status carries the month's spend.
3. **The super-admin schools ROUTE was already done by WP-B** (it now imports
   `resolvePlan`/`applyPlan`/`toPlan` and returns `plan`/`plan_source`/`plan_override`,
   and its PATCH accepts `plan` with `null` clearing the override). WP-C therefore built
   only the client half against that contract and did not touch the route.
4. **`billing.pricingTagline` is now orphaned** — the billing header states all three
   plan prices instead of a single per-student rate. The key and its 12 translations are
   left in place.

## C4. Left for the auditor / next session

- `app/montree/home/page.tsx` (homeschool-parent signup) also calls `try/instant` and
  does not yet surface `checkoutUrl`. Deliberate: a home space is not a school, and the
  founder has not ruled on whether it should be charged at all.
- `app/montree/super-admin/marketing/growth/page.tsx:123` still lists "free trial" as a
  Montree advantage inside an SEO content OUTLINE (prompt text for a generator, not a
  user-facing claim). Left alone rather than editing marketing strategy copy.
- The ~19 legacy `upgrade.feature.<old_feature>.body` values still quote "$7 per active
  student per month". They are only reachable from routes that still send the OLD feature
  names; every route WP-B repointed sends a capability and gets the new copy. Worth a
  sweep once WP-B's gating has fully landed.
- `tsconfig.wpc.tmp.json` was deleted after the check. `scripts/pricing-3tier-i18n.mjs`
  is kept (idempotent, re-runnable if a locale drifts).
- The landing Lite card carries the badge, so its header sits ~24px lower than Basic's
  and Full's. Cosmetic, intentional (the badge is a static flow element by house rule),
  flagged in case the founder wants the three headers flush.


## AUDIT 2026-09-07

Post-WP-C audit pass over the 3-tier restructure. Two findings from the initial
pass, both now resolved; one LOW noted for the record.

### Findings

1. **HIGH — deleted-subscription handler could clobber founding/override plans.**
   `lib/montree/billing.ts` `handleSubscriptionDeleted` used to flip every
   canceled subscription's `plan` column to `'basic'` unconditionally — the same
   footgun `handleSubscriptionUpsert` already guarded against. A founding-member
   or `plan_override` school whose Stripe subscription was canceled (e.g. a
   stale/duplicate subscription object, or a manual Stripe-side cancel) would
   have its `plan` column silently overwritten even though `resolvePlan`'s
   precedence rules (override/founding beat Stripe) meant the *effective*
   entitlement was still correct — the column itself would just lie to
   anything reading it directly (super-admin display, exports).
   **Status: FIXED.** The handler now reads `founding_member` + `plan_override`
   before writing, and skips `setSchoolAiTier(..., 'free', ...)` (which maps to
   plan='basic') when either is set — mirroring `handleSubscriptionUpsert`
   exactly, log line included (`'... plan flip SKIPPED (would have been basic)'`).
   Verified by direct read of `lib/montree/billing.ts` during this audit pass —
   no further change was needed.

2. **HIGH — UpgradeCard capability wiring incomplete at 13 call sites.**
   `components/montree/UpgradeCard.tsx` accepts an optional `capability` prop
   (added by WP-C) and `extractUpgradeFromResponse` returns
   `{feature, capability, upgradeUrl, error}`, but 13 call sites across the app
   were still storing only `{feature, upgradeUrl}` in local state and rendering
   `<UpgradeCard feature={...}>` without `capability`. Because `UpgradeCard`
   falls back to the legacy `upgrade.feature.<feature>.*` copy when no
   `capability` is present, a Basic or Lite school hitting an AI gate on these
   screens would see the old "$7 per active student per month" Premium-era
   copy instead of the correct per-capability 3-tier upgrade message.
   **Status: FIXED.** All 13 files updated — local upgrade-state types now
   carry `capability?: string`, every `setUpgrade(...)` / `setGuideUpgrade(...)`
   / `setUpgradeFeature(...)` call site captures `capability` from the parsed
   402 body, and every `<UpgradeCard>` render passes `capability={...}`.
   Files fixed:
   - `app/montree/admin/conversations/page.tsx`
   - `app/montree/admin/communication/threads/[threadId]/page.tsx`
   - `app/montree/admin/child/[childId]/page.tsx` (two call sites — briefing
     fetch and parent-question POST — both share one `upgrade` state)
   - `app/montree/admin/meeting-notes/page.tsx`
   - `app/montree/dashboard/[childId]/weekly-review/page.tsx` (two call sites)
   - `app/montree/dashboard/[childId]/language-presentation/page.tsx`
   - `app/montree/dashboard/conversations/page.tsx`
   - `app/montree/dashboard/language-semester/page.tsx` (two call sites)
   - `components/montree/guru/GuruChatThread.tsx` (manual 402-body parse, not
     `extractUpgradeFromResponse` — `data.capability` now read alongside
     `data.feature` / `data.upgrade_url`)
   - `components/montree/guru/TeachingInstructions.tsx`
   - `components/montree/guru/TeachGuruWorkModal.tsx`
   - `components/montree/photo-audit/ThisIsSheet.tsx` (`guideUpgrade` state)
   - `components/montree/reports/WeeklyWrapTab.tsx`
   A follow-up repo-wide grep for `<UpgradeCard` found no remaining render site
   missing `capability` (only the component's own definition and doc/handoff
   markdown mentions matched otherwise).

3. **LOW — migration 349 founding/partner backfill re-stamps `plan_source` on
   a re-run.** The one-time backfill in `migrations/349_pricing_3tier.sql` that
   sets `plan='full'`, `plan_source='founding'` (or `'partner'`) for
   `founding_member = true` rows is not idempotent against a manual re-run:
   because it's an unconditional `UPDATE ... WHERE founding_member = true`
   rather than a `WHERE plan_source IS DISTINCT FROM 'founding'` guard, running
   the migration file a second time (e.g. by hand, against a schema where it
   was already applied) re-writes `plan_source` even if a super-admin had since
   set an explicit `plan_override` for one of those schools via the app — the
   backfill does not check `plan_override` before writing. In normal operation
   this never fires twice (migrations run once via the tracked migration
   runner), so it is not a live bug — noted for the record only. No code
   change made; flagging so a future hand migration or backfill re-run doesn't
   silently overwrite a super-admin's override.

### Final gate counts (this audit pass)

- `npx vitest run` — **1473 passed**, 0 failed (77 test files).
- `npx eslint` on every file touched in this pass (the 13 UpgradeCard call
  sites + `lib/montree/billing.ts`) — **0 errors**, 75 pre-existing warnings
  (all `@typescript-eslint/no-explicit-any`, `no-unused-vars`,
  `no-img-element`, `no-unescaped-entities`, `react-hooks/exhaustive-deps` —
  none introduced by this pass, none touching the edited lines).
- `npm run i18n:check` — **12/12 locales** at 100% key parity with `en`
  (6167 English reference keys; all locales carry 6174, the surplus being
  pre-existing orphaned keys per §C2 above, not a gap).
