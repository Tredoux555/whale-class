# SCOUT: Montree Pricing/Tier Infra Map — 2026-09-07

Read-only scout for a 3-tier pricing redesign. All paths relative to repo root.

## 1. Tier resolution — lib/montree/reports/resolve-model.ts (NOT lib/montree/billing/resolve-model.ts — that file does not exist)

- `deriveTier(input: TierInputs): ReportTier` (lines 72-115) — pure, sync, single source of truth.
- `resolveReportModel(supabase, schoolId)` (127-159) — async wrapper; SELECTs `montree_schools.subscription_status, trial_ends_at, locked_at`, calls `isFeatureEnabled` twice for `ai_tier_sonnet`/`ai_tier_haiku`, then `deriveTier`. Fail-closed (catch → `{tier:'free', model:null}`).
- Tiers: `'free' | 'haiku' | 'sonnet'`. `tierToModel`: sonnet→`AI_MODEL`, haiku→`HAIKU_MODEL`, free→`null`.
- Columns/flags read, in precedence order (highest wins):
  1. `montree_schools.locked_at` set → free (abuse lock).
  2. `montree_school_features.ai_tier_sonnet` (via feature def fallback) → sonnet.
  3. `montree_school_features.ai_tier_haiku` → haiku.
  4. `montree_schools.subscription_status === 'trialing'`, three-way on `trial_ends_at`:
     - future → sonnet ("taste Premium")
     - past → free (the 402/UpgradeCard decision moment)
     - NULL → haiku (legacy safety floor, plan amendment A1)
  5. `subscription_status === 'active'` → haiku (safety net if webhook race left flags unset).
  6. else → free.
- `founding_member` and `billing_override_usd` are NOT read here directly — they only affect billing $ amount and which flags get set upstream (checkout/webhook/founding grant paths); resolve-model only ever reads the two `ai_tier_*` flags + subscription_status/trial_ends_at/locked_at.
- `monthly_ai_budget_usd` is NOT read by resolve-model; it's a separate spend-cap system (lib/montree/api-usage.ts, `clearBudgetCache`) written by `setSchoolAiTier`/`applyAiTier` alongside the flags but consulted elsewhere for hard/soft budget limiting, not tier resolution.
- `isFeatureEnabled` (lib/montree/features/server.ts:49-91): checks `montree_school_features` (school_id, feature_key) override first, else falls back to `montree_feature_definitions.default_enabled`. Fail-closed=false. 30s process-local cache (`invalidateFeatureCache`).

## 2. Feature gating call sites — isFeatureEnabled(...) grouped by product area

**Photo identification / onboarding**
- `PHOTO_ONBOARDING_FEATURE_KEY` — app/api/montree/photo-onboarding/{upload,[importId]/extract,[importId]/commit}/route.ts
- `PHOTO_PIPELINE_V2_KEY` — app/api/montree/photo-identification/process/route.ts:288
- Sonnet fallback tier check (raw `ai_tier_sonnet`, plan says should derive from resolveReportModel instead) — app/api/montree/photo-identification/process/route.ts, sonnet-review/route.ts, guru/photo-insight/route.ts
- `photo_onboarding` (dashboard nav) — app/montree/dashboard/students/page.tsx:686,677 client-side `isFeatureEnabled('photo_onboarding')`

**Guru / Astra (AI advisor, principal agent)**
- resolveReportModel + `ai_tier_sonnet`/`ai_tier_haiku` drive model choice in: app/api/montree/guru/route.ts, guru/stream/route.ts, guru/corrections/route.ts, guru/generate-work-content/route.ts, guru/teaching-instructions/route.ts, admin/guru/chat/route.ts, admin/principal-agent/route.ts, admin/tracy/{scan-thread,draft-response}/route.ts, companion/route.ts, companion/weekly-work/route.ts, companion/present.ts, mira/tool-executor.ts
- `voice_astra` — app/api/montree/admin/voice/{token,llm,agent}/route.ts
- `onboarding_copilot` — app/api/montree/onboarding-copilot/{ask,state}/route.ts, lib/montree/onboarding-copilot/state-loader.ts (`tell_guru_onboarding` too)
- `live_copilot` — app/api/montree/admin/parent-meetings/[meetingId]/copilot/route.ts

**Weekly / parent reports & admin docs**
- `weekly_admin_docs` — app/api/montree/weekly-admin-docs/** (auto-fill, notes, monthly-*, generate), children/[childId]/weekly-admin/route.ts
- `WORK_RHYTHM_FEATURE_KEY` — app/api/montree/work-rhythm/route.ts
- `FEATURE_KEY` = `period_reports` (weekly/monthly one-pager) — app/api/montree/reports/period/route.ts
- `home_practice_cards` — app/api/montree/parent/home-practice/route.ts
- resolveReportModel drives model for weekly-review/[childId], reports/weekly-wrap, reports/language-semester/generate, reports/language-presentation/[childId], children/[childId]/onboard, calendar/summary, evaluation/reports/_shared.ts

**Montage / paper-scan / phonics-live**
- `PAPER_SCAN_FEATURE_KEY` — app/api/montree/paper-scan/** (extract, layouts, sheet/print, upload)
- Dark Phonics Live `FEATURE_KEY` (per-file const) — app/api/montree/dark-phonics-live/{auth/token,classes,book,credits,credits/admin,credits/grant}/route.ts

**Parent messaging / portal / appointments**
- `parent_messaging` — lib/montree/parent-messaging/access.ts (2 call sites)
- `appointments` — app/api/montree/appointments/route.ts (x3), .../parents, .../availability(+blackouts), lib/montree/appointments/parent-access.ts, lib/montree/dark-phonics-live/app-auth.ts
- `video_calls` / `agora_video_calls` / `video_recording` — appointments/route.ts, appointments/[id]/{whiteboard-token,recap,recording/start,agora-token,live-state}/route.ts, parent/appointments/route.ts, dashboard/parent-chats/[parentId]/instant-call/route.ts
- `school_events` — app/api/montree/admin/events/route.ts, lib/montree/events/parent-access.ts
- `school_calendar` — app/api/montree/parent/calendar/route.ts
- broadcast messaging flag check — app/api/montree/messages/broadcast/route.ts:160
- appointments/meeting-notes "share to thread" messaging gate — lib/montree/appointments/share-to-thread.ts, lib/montree/meeting-notes/share-to-thread.ts

**Child onboarding / evaluation**
- `CHILD_ONBOARDING_FEATURE_KEY` — app/api/montree/child-onboarding/** (route, [intakeId], document, print-data), parent/intake/{route,upload}/route.ts
- `child_onboarding` dashboard nav — app/montree/dashboard/students/page.tsx:694
- `CHILD_EVALUATION_KEY` / `ENGLISH_MEDIUM_LITERACY_FEATURE_KEY` / `FEATURE_KEY_G1` — lib/montree/evaluation/route-helpers.ts, montree-bridge.ts, session-service.ts, app/api/montree/evaluation/{bank,child/[childId]/report}/route.ts

**CMS / self-serve / super-admin**
- `SELF_SERVE_KEY = 'feature_self_serve'` — app/api/montree/school-features/route.ts (GET+POST); note this route explicitly documents `ai_tier_*` as "AI billing tier" flags, distinct from ordinary features.
- `ai_tier_sonnet`/`ai_tier_haiku` raw reads for engagement cron — app/api/montree/cron/engagement/route.ts:162-163
- super-admin schools tier badge/pill logic — app/api/montree/super-admin/schools/route.ts (uses deriveTier per the resolve-model.ts comment, was previously drifted)

## 3. Billing constants + Stripe — lib/montree/billing.ts, lib/montree/billing/apply-ai-tier.ts, app/api/montree/billing/**

- `PRICE_PER_STUDENT_USD=7` / `PRICE_PER_STUDENT_CENTS=700` (billing.ts:93-95) — platform default = Premium.
- `STARTER_PRICE_USD=3` / `STARTER_PRICE_CENTS=300` (billing.ts:103-105) — Starter; billed via separate Stripe Price (`STRIPE_PRICE_STARTER` env), NOT via the override machinery.
- `effectivePricePerStudentUsd/Cents(school)` (115-130) — resolves `montree_schools.billing_override_usd` if set (>=0), else `PRICE_PER_STUDENT_USD`. Canonical price accessor — never read constants directly.
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PER_STUDENT` (the $7 Premium price id), `STRIPE_PRICE_STARTER` (the $3 Starter price id, 503s checkout if unset when plan='starter').
- `SchoolBillingRow` fields (135-160): billing_override_usd, billing_override_note, payment_method, billing_cadence, next_invoice_due_at, manual_invoice_details, subscription_status, trial_ends_at, current_period_end, billing_quantity, monthly_charge_estimate_cents.
- `countActiveStudents(supabase, schoolId)` (180-190) — `montree_children` count where `is_active=true` → Stripe subscription quantity.
- `createSchoolCheckoutSession(supabase, schoolId, {plan})` (405-548): `plan: 'starter'|'premium'` (default premium; anything else coerced premium). Starter → `STRIPE_PRICE_STARTER` env directly. Premium → `resolvePriceIdForSchool` (Premium Price OR per-school override Price built from `billing_override_usd`). Quantity = `max(1, countActiveStudents)`. Sets `subscription_data.metadata = {school_id, source, montree_plan: plan}` — canonical signal webhook reads. `trial_period_days` computed from existing `trial_ends_at` if still trialing/future (carries remaining trial into Stripe). `payment_method_collection: 'always'` (card required upfront, no card-less trial).
- `AiTierTarget = 'free'|'haiku'|'premium'` (billing.ts ~999).
- `tierForSubscriptionStatus(status)` (1010-1028): active/trialing→premium; canceled/unpaid/incomplete_expired→free; past_due/incomplete/paused/default→null (leave unchanged, grace period).
- `setSchoolAiTier(supabase, schoolId, tier, enabledBy='stripe_webhook')` (1038-1086): upserts `ai_tier_haiku`/`ai_tier_sonnet` flags (premium→both ON, haiku→haiku ON only, free→both OFF) + writes `monthly_ai_budget_usd`/`ai_budget_action` (premium=9999/warn, haiku=50/soft_limit, free=0/hard_limit). Calls `clearBudgetCache`.
- `handleSubscriptionUpsert(supabase, subscription)` (1088-1216) — the Stripe webhook handler:
  - SELECTs `subscription_status, owner_email, owner_name, founding_member` by `stripe_customer_id`.
  - Updates montree_schools: stripe_subscription_id, stripe_price_id_active, subscription_status, current_period_end, trial_ends_at, billing_quantity, monthly_charge_estimate_cents.
  - Tier decision order: (1) `subscription.metadata.montree_plan` ('starter'→haiku, 'premium'→premium) (2) `status==='trialing'`→always premium (3) legacy: `itemUnitAmount===STARTER_PRICE_CENTS && !founding_member`→haiku (4) else `tierForSubscriptionStatus(status)`.
  - Fires `sendTrialConvertedEmail` on trialing/incomplete→active transition (fire-and-forget).
- `lib/montree/billing/apply-ai-tier.ts::applyAiTier(supabase, schoolId, tier: 'free'|'haiku'|'sonnet', enabledBy)` — the OTHER grant mechanic (used by super-admin PATCH + founding/partner redemption paths), same net flag/budget mapping as setSchoolAiTier but different vocabulary (`sonnet` not `premium`) and fatal-on-flag-error (vs best-effort in the webhook copy). Two parallel implementations exist by design — noted in file header as deliberate (don't touch hot webhook path).
- Checkout route `app/api/montree/billing/checkout/route.ts`: POST, principal-only (JWT role check + school_admins fallback), body `{plan?: 'starter'|'premium'}` (default premium, anything else forced premium), founding_member forces plan=premium server-side regardless of body.
- Webhook route `app/api/montree/billing/webhook/route.ts` — dispatches Stripe events to handleSubscriptionUpsert / deletion handler (not read line-by-line, imports from billing.ts).
- `sync-quantity` and `portal-session` routes exist for keeping Stripe subscription quantity in sync with active-student count and opening the Stripe customer portal (not detailed further — lower priority for tier redesign).

## 4. UI: prices/tier copy

- **app/pricing/page.tsx** — full public pricing page. Hardcoded English, `.pr-*` dark-forest CSS. Two cards: Starter $3 (fast-model everything, no Sonnet escalation), Premium $7 (featured, Sonnet reports/photo fallback/Guru+Astra). Live slider (5-60 students) showing both monthly totals. FAQ explains 7-day free Premium trial, no card upfront, Starter-vs-Premium diff, "what is Sonnet."
- **app/montree/page.tsx** (landing) — `id="pricing"` section ~line 1039-1090, driven entirely by `landing.pricing.*` i18n keys (label/title/trialLine/starterName/starterPrice/starterB1-3/premiumBadge/premiumName/premiumPrice/premiumB1-3/cta/seeFull). Two `.m-price-card` blocks + CTA row (Try it / See full pricing →).
- **lib/montree/i18n/en.ts:4239-4255** — all `landing.pricing.*` keys, EN source of truth (parity enforced across 12 locales by pre-commit hook per the launch-pricing doc).
- **app/montree/admin/billing/page.tsx** — principal-facing billing page. States: (a) `isFounding` (founding_member===true) → single "Founding 100 — Premium at $3 for life" card, no checkout button if $0 override ("Foundation Partner — free for life" variant also present for `billing_override_usd===0` non-founding orgs); (b) plan chooser (no active sub) → two cards, Starter (line ~309-328) / Premium featured (~329-347), each `startCheckout(plan)` → POST /api/montree/billing/checkout; (c) trial countdown line "Your Premium trial ends in N days — choose your plan."
- **components/montree/super-admin/SchoolsTab.tsx** — two independent pill rows per school: subscription lifecycle (trial/free/paid, `subscription_tier` column, editable via `onUpdateStatus`) AND AI tier (free/haiku/sonnet buttons ~739-757, `school.ai_tier`, PATCH `{schoolId, ai_tier}` to super-admin/schools route) — these are SEPARATE fields/concepts that can drift from each other and from the resolve-model derivation (see resolve-model.ts header comment about the historical drift bug).
- **app/api/montree/school-features/route.ts** — generic feature-flag CRUD gated by `feature_self_serve`; explicitly documents that `ai_tier_*` keys are billing tier flags, not ordinary features, though they live in the same `montree_school_features` table.
- **components/montree/UpgradeCard.tsx** — canonical 402-upgrade UI. Contract: AI routes returning 402 must send `{requires_upgrade:true, upgrade_url:'/montree/admin/billing', feature:'<key>', error:'...'}`. Renders per-feature copy via `upgrade.feature.<key>` i18n keys, generic fallback `upgrade.title/body/cta`.

## 5. Founding 100 / founding_member / billing_override_usd / partner_free_life grant paths

- `lib/montree/org/free-for-life.ts` — `ORG_SCHOOL_GRANT` const (subscription_status:'active', trial_ends_at:null, billing_override_usd:0) + `applyOrgSchoolGrant()` calling `applyAiTier(..., 'sonnet', enabledBy)`. Used for non-profit "organisation" schools (director-invited partners), NOT the Founding 100 program — separate concept, same mechanic reused.
- `app/api/montree/org/register-school/route.ts` — principal redeems director invite → applies ORG_SCHOOL_GRANT.
- `app/api/montree/try/instant/route.ts` — the main self-serve signup + Founding 100/Partner redemption endpoint:
  - `FoundingGrantType = 'founding_3_life' | 'partner_free_life'` (line 344).
  - `founding_3_life` (default, Founding 100): `founding_member=true, billing_override_usd=3`, note "Founding 100 — Premium at $3 for life", `applyAiTier(..., 'sonnet', 'partner_free_life_redemption')`.
  - `partner_free_life` (Partner Program): `billing_override_usd=0` (free forever), same sonnet grant.
  - Validates code before any writes; founding_code beats referral_code (plan amendment A6).
- `app/api/montree/super-admin/founding/route.ts` — super-admin PATCH generates `FND-` signup codes (idempotent, only for `status='admitted'`), and a direct-grant path (`grant_type='partner_free_life'`, ~line 493-579) that sets `billing_override_usd=0`, `founding_member=true` (never clobbers existing true), calls `applyAiTier(supabase, schoolId, 'sonnet', 'partner_free_life_direct_grant')`.
- `app/api/montree/founding/lookup/route.ts`, `founding/join/route.ts`, `founding/count/route.ts` — public-facing founding waitlist endpoints (join is now disk-only/unused per the pricing plan doc — replaced by mailto CTA).
- `app/montree/try/page.tsx`, `app/montree/admin/billing/page.tsx`, `app/montree/super-admin/page.tsx`, `app/montree/page.tsx` — UI surfaces referencing "Founding 100" copy.
- `billing.ts::handleSubscriptionUpsert` reads `founding_member` specifically to prevent the legacy $3-price-detection heuristic from misclassifying a Founding 100 school (which pays $3 but must stay Premium/sonnet) as Starter/haiku.
- `app/api/montree/billing/checkout/route.ts` reads `founding_member` to force `plan='premium'` server-side regardless of requested plan (resilient to missing migration column, treated as false if the column read fails).
- No CMS-bridge specific founding logic found (evaluation/montree-bridge.ts is unrelated — it's the evaluation-system feature-flag bridge, not a billing grant path).

## 6. montree_feature_definitions — feature keys (feature_key | default_enabled), from migrations/*.sql INSERTs

| feature_key | default_enabled |
|---|---|
| raz_reading_tracker | false |
| weekly_plan_upload | false |
| daily_reports | true |
| parent_portal | true |
| games | true |
| voice_observations | false |
| smart_capture | false |
| classroom_setup_ai | false |
| guru_advisor | false |
| tts_voice | false |
| weekly_admin_docs | false |
| teacher_notes | true |
| multi_teacher_mgmt | true |
| class_events | true |
| bulk_student_import | true |
| photo_audit | true |
| multi_child_tagging | true |
| photo_crop | true |
| parent_reports | true |
| batch_reports | true |
| phonics_tools | true |
| curriculum_browser | true |
| community_library | true |
| picture_bank | true |
| english_corner | true |
| educational_games | true |
| daily_brief | false |
| intelligence_panels | false |
| teacher_tools | false |
| shelf_autopilot | false |
| paperwork_tracker | false |
| daily_language_6 | false |
| tell_guru_onboarding | false → flipped true by migration 175 |
| weekly_activity_summary | false |
| unified_photo_tagger | false |
| review_before_process | false |
| ai_tier_haiku | false |
| ai_tier_sonnet | false |
| parent_messaging | false |
| phonics_works | false (default OFF, opt-in) |
| appointments | false |
| principal_newsletter | false |
| school_events | false |
| school_calendar | false |
| agora_video_calls | false |
| video_recording | false |
| photo_pipeline_v2 | true |
| weekly_teaching_notes | false |
| group_lesson_suggester | true |
| curriculum_gap_radar | true (flipped to false by migration 280) |
| home_practice_cards | true |
| parent_night_present | false |
| english_program | false |
| onboarding_copilot | true (self-retiring) |
| paper_scan | false |
| child_evaluation | false |
| child_evaluation_g1 | false (requires child_evaluation) |
| photo_onboarding | true |
| child_onboarding | true |
| work_rhythm | false |
| dark_phonics_live | false |
| period_reports | false |

Note: `ai_tier_haiku`/`ai_tier_sonnet` are stored in the SAME `montree_school_features` table/mechanism as ordinary product features (school-features route explicitly calls this out as a special case) — a 3-tier redesign should decide whether billing tier stays piggybacked on the generic feature-flag system or gets its own column(s) on `montree_schools`.

## 7. docs/handoffs/PLAN_LAUNCH_PRICING_JUL6.md — LOCKED model summary

Locked table (Trial / Starter $3 / Premium $7 / Founding 100):
- Trial: free 7 days, full Sonnet everywhere (reports, Guru, Astra, photo fallback) — "taste Premium," then must choose.
- Starter ($3/student/mo): Haiku for reports, Guru, Astra; photo ID base pipeline Haiku; photo Sonnet fallback **NEVER** fires.
- Premium ($7/student/mo): Sonnet everywhere (reports, Guru, Astra, photo fallback); photo ID base pipeline stays Haiku for both tiers.
- Founding 100: 1 month Premium free → Premium locked at $3/student for life (admitted by Tredoux via super-admin, applicants apply by email, no self-serve waitlist).
- Deploy-order hazard flagged: migration 286 (`locked_at`, `founding_member` etc.) must run in Supabase BEFORE the resolve-model.ts push, else every school 402s (fail-closed catch on missing column).
