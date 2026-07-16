# SESSION — Jul 16, 2026 (Cowork/Fable directing Sonnet+Opus) — ONBOARDING COPILOT ("The Guide") SHIPPED

**Contract (read first): `docs/handoffs/PLAN_ONBOARDING_COPILOT_JUL16.md` — the binding spec (§0 rulings, §2 pinned interface, §3 API shapes, §4 Fable-authored copy, §7 landmines). This file is the build/audit close-out.**

## What it is
The answer to the biggest onboarding hole: a principal finishes the setup wizard, lands on `/montree/admin` (Astra's chat), and has **no idea what to do next** — especially the baton-pass moment where the teacher's login code must travel to the teacher's own device. The copilot is a **bolt-on floating guide dock** on both surfaces:
- **Deterministic step engine** — journey completion derives from REAL DB state (has classroom? teacher logged in? students? photo? confirmed? parent code? report sent?). It can never nag about done things; established schools complete instantly and the dock retires forever.
- **Warm AI voice** — the card speaks as **Astra** (principal) / **Guru** (teacher); an ask-box answers free-form questions via **Haiku, all tiers incl. free** (onboarding must never 402), budget-metered + usage-logged. AI never decides navigation — coded steps are ground truth.
- **Anchor pulse, not spotlight-dimming** — `data-copilot` attributes on ~7 real elements; a soft emerald ring pulses on the current step's target when present; silently absent otherwise. Zero layout risk.

## Journeys (copy in contract §4, i18n `copilot.*`)
- **Principal (6):** classroom → teacher → **handover** ("Hand over the key" — waits on the teacher's ACTUAL first login, live waiting line with pending names, celebrates with the teacher's real name) → students → first_photo → first_report → completion ("I'm Astra…").
- **Teacher (6):** students → voice_intro (optional; hidden if `tell_guru_onboarding` off; points AT the existing takeover, never re-triggers it) → first_photo → confirm → parents → report → completion ("I'm Guru…").

## Build (sacred flow honored)
Fable audit fleet (3 Sonnet scouts) → Fable contract + all step copy → **2 parallel Opus builds** (A: engine/routes/migration; B: dock/mounts/anchors/i18n, coded blind against the pinned §2 interface) → **Sonnet fresh-eyes audit: FIXED-NOW-SHIP, 0 CRIT, 2 WARN fixed**:
1. P3 celebrate line couldn't show the real teacher name (state only carried *pending* names) → added `logged_in_teacher_names` to `CopilotState` + loader + dock.
2. Dock polled `/state` on every tab focus forever for already-finished schools → `hidden` gating on load + on the listeners/poll.

## Files
**New:** `migrations/297_onboarding_copilot_flag.sql` · `lib/montree/onboarding-copilot/journeys.ts` (pure engine, browser+node) · `lib/montree/onboarding-copilot/state-loader.ts` · `app/api/montree/onboarding-copilot/{state,progress,ask}/route.ts` · `components/montree/onboarding-copilot/{CopilotDock.tsx,AnchorPulse.tsx}` · `scripts/_tmp_copilot_harness.mjs` (temp — delete after ship).
**Edited:** `lib/montree/features/types.ts` (+`onboarding_copilot`) · `app/api/montree/admin/classrooms/route.ts` (**bonus bug fix: post-setup classrooms now seed curriculum** — they silently didn't) · mounts in `app/montree/dashboard/layout.tsx` + `app/montree/admin/layout.tsx` (authed-only) · anchors (attribute-only) in admin layout, classroom detail, DashboardHeader, students, photo-audit, parent-codes · all 12 `lib/montree/i18n/*.ts` (+~85 keys each; EN+ZH real w/ 你(teacher)/您(principal), 10 locales English-fallback) · `.gitignore` (2 temp scoped tsconfigs).

## Storage / infra decisions
- **No new tables.** Dismiss/skip/celebrate rows reuse `montree_onboarding_progress` (migration 131, RLS'd, previously zero callers) — `feature_module='copilot_principal'|'copilot_teacher'`, step_key shapes `__dismissed__` / `__completed__` / `skip:<id>` / `celebrated:<id>`, strictly validated.
- **Admin surface has no FeaturesProvider** — the state route returning `{enabled:false}` is the single gate; every failure path degrades to render-nothing.
- Migration **297** = feature definition only, `default_enabled=TRUE` (rollout: everyone; per-school off-switch documented in the file).

## Verification
Harness 11/11 (deriveJourney scenarios incl. skip, tell_guru-off hides T2, completion) · ESLint 0 errors on every touched file · scoped tsc **0 errors** on all copilot files (~25 pre-existing errors in untouched debt noted, none ours) · i18n key sets mechanically diffed identical ×12 · P3 waiting→celebrate flow traced end-to-end (no double-fire, no re-trigger).

## 🚨 Rules locked this session
- **Coded steps are ground truth; AI only humanizes.** Never let the ask-route (or any model) drive navigation or completion.
- **Copilot AI = HAIKU_MODEL for all tiers** — onboarding help must never 402. Still budget-metered (`checkAiBudget`) + logged (`logApiUsage`).
- **The dock NEVER un-completes a step client-side** (high-watermark ref) — the children-watermark lesson applied.
- The old Feb-27 guide components stay dead (`false &&`) — the copilot deliberately supersedes them; don't revive or delete them casually.
- New copilot steps = edit `journeys.ts` + i18n keys + (optional) one `data-copilot` anchor — never hardcode flow in the dock.

## ⏳ OWED (Tredoux)
1. **Run migration 297** in the MONTREE Supabase (SQL pasted in chat — safe pre-deploy either order; flag is fail-closed until run, dock just stays hidden).
2. **Commit + push via Desktop Commander** (scoped add — tree has unrelated dirt; file list above + this handoff + the contract + CLAUDE.md block).
3. **Desktop Commander deletes:** `scripts/_tmp_copilot_harness.mjs` (after one green re-run if desired) + `tsconfig.scope-copilot.tmp.json` + the second temp scoped tsconfig (both gitignored).
4. **Device verification (the real gate — Jun-14 rule):** fresh principal signup → wizard → land on /admin → pill bottom-left shows the current step → walk P1–P3 → log the teacher in on a second device → watch the principal card tick itself + celebrate with the teacher's name → teacher pill walks T1→T6 (import students, voice intro offer, photo, confirm, parent code, report) → both completion moments fire once → dock gone on next login. Also eyeball: pill vs OnboardingPathChoice takeover overlap (auditor note: takeover is in-flow z:0–1, pill floats above it — likely fine, small + bottom-left, but eyeball it), and Wrap Up/Parents anchors pulse on the right elements.
5. Optional polish queue: extract shared `seedCurriculumForClassroom` lib (currently mirrored in 2 routes) · real translations for the 10 English-fallback locales · consider surfacing `TracyProactiveCard` post-onboarding (still off by design).
