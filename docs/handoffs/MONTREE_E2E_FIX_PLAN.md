# Montree E2E Fix Plan — May 23, 2026 Handoff Response

**Source:** `HANDOFF.md` — production E2E test of montree.xyz (browser-Claude automated walk).
**Author of this plan:** Claude (Cowork) — for Tredoux's review BEFORE any code changes.
**Status:** PLAN ONLY. Nothing in the codebase has been touched. Approve / adjust phases before execution.

**Decisions locked with Tredoux (May 23):**
- Routing fix goes FIRST, ahead of CR-1 (the handoff ordered CR-1 first).
- Every phase ends with an audit cycle. Critical phases (routing, role-checks, family report, locale-unify) get a fresh-eyes subagent audit; lighter phases get lint + self-review.
- This document is for review. Execution begins only on Tredoux's go-ahead.

---

## 1. Strategic read — 27 items, far fewer root causes

The handoff lists CR-1 plus 27 numbered bugs. Treating them as 28 separate jobs would be wasteful. They collapse:

- **Bugs #2 + #3 (7 broken teacher routes) are ONE root cause** — the teacher drawer links to route paths that have no matching page directory, so Next.js App Router falls them through into `app/montree/dashboard/[childId]/`. Fix the menu href drift + add a real `not-found.tsx` and 6 "Critical" bugs close at once.
- **The 403-to-logout coupling is a second, independent bug hiding inside the same screenshot** — an API 403 on one resource must never destroy the session. This is the real mechanism behind "#2 drops auth."
- **Bugs #6 + #8 are one class** — broken principal role checks in two places.
- **Bugs #20 + #22 are one root cause** — no single source of truth for locale. Translating pages (Phase 6b) is pointless until this is fixed, so locale-unify comes FIRST in the i18n track.
- **Bugs #10–#19, #21 are one workstream** — hardcoded English strings never wired to `t()`. The translation KEYS likely already exist (the repo runs a strict i18n parity check); this is wiring debt, the "TYPE A" gap already noted in CLAUDE.md.

So the real shape is roughly **8 phases**, not 28 tickets.

### Items that are NOT straightforward bugs — flagged for a decision, see §4 and §5

- **#9 (super-admin Health/Errors/DLQ tabs "missing")** — CLAUDE.md Session 104 explicitly built `HealthTab`, `WebhookDLQTab`, `ServerErrorsTab` and they sit in the super-admin nav. Almost certainly a stale-build or wrong-view observation by the tester, **not a real bug.** Verify before spending any time.
- **#7 (features stuck on "Loading…")** — the screenshot the tester captured actually shows the features page fully loaded. **Intermittent, not a hard failure.** Re-test before treating as real.
- **#23 (principal login code == referral code)** — this is partly **by design** (CLAUDE.md Session 90 Phase 2: the referral code deliberately becomes the principal's login). The security concern is legitimate but the "fix" is a product decision, not a straight bug fix.
- **CR-1 trial duration** — the billing card shows **90 days**, but CLAUDE.md / the pricing page say **30 days**. The trial constant is **already inconsistent across the codebase.** CR-1 isn't just "change 90 to 7" — it's "find every trial constant, reconcile them, set one source of truth at 7."

---

## 2. Phase plan

Each phase: **Goal · Items closed · Root cause · Approach · Likely files · Audit · Acceptance.**

### Phase 0 — Pre-flight (½ session, no code)

- Spin up a fresh disposable test school (or reuse "E2E Test School — 23 May" if still live).
- Enumerate every directory under `app/montree/dashboard/*/` and compare against the teacher drawer's menu hrefs. Produce a definitive route-drift map. **This confirms or refutes the Phase 1 hypothesis before any code is written.**
- Confirm whether #7 and #9 are real (see §5).
- Grep the codebase for trial-duration constants (`90`, `30`, `trial`, `trial_ends_at`, `trial_period_days`) — produce the full touch-point list for CR-1.
- **Audit:** none (read-only). Output is a findings note appended to this doc.

### Phase 1 — Teacher routing + 403-to-logout coupling 🔴 CRITICAL · FIRST

- **Items closed:** #2, #3 (and unblocks the entire Phase 4 parent flow).
- **Root cause (hypothesis, confirmed in Phase 0):** The teacher navigation drawer links to paths (`weekly-plan`, `photo-albums`, `library`, `calendar`, `manage-students`, `parent-manager`) that have no matching `app/montree/dashboard/<name>/page.tsx`. Next.js App Router has no page to serve, so the request resolves into `[childId]` with the literal string as the child ID. The API then 403s (`children/weekly-plan` — `verifyChildBelongsToSchool` correctly rejects it), and the client misreads the 403 as an auth failure and redirects to `/montree/login`.
- **Approach:**
  1. Reconcile every teacher-drawer href with the actual route directories. Where the page exists under a different name (e.g. `library` → `/montree/library`, `calendar` → `/dashboard/appointments`), fix the href. Where the page genuinely doesn't exist, decide build-vs-remove with Tredoux.
  2. Add `app/montree/dashboard/not-found.tsx` so an unknown sub-path renders a real 404 instead of silently falling into `[childId]`.
  3. **Decouple 403 from logout** in the client fetch wrapper / `montreeApi()` — only `401` should trigger session teardown. A `403` on a resource renders an inline error, never a redirect to login. This is the higher-stakes change in the phase.
- **Likely files:** teacher `DashboardHeader.tsx` / drawer menu config, `app/montree/dashboard/[childId]/page.tsx` (guard), new `not-found.tsx`, `lib/montree/api.ts` (`montreeApi` 403 handling), the child-fetch hook.
- **Audit:** 🔬 **Fresh-eyes subagent audit** — re-derive the route map, verify no named route still drops through, confirm 403 no longer logs out, confirm 401 still does. Lint clean.
- **Acceptance:** Every teacher drawer item renders its own page; unknown paths show 404; a 403 anywhere renders inline and the teacher stays logged in.

### Phase 2 — Principal role-check bugs 🔴 HIGH

- **Items closed:** #6 (`/admin/conversations` rejects the owning principal), #8 ("You're a viewer" banner on the principal's own school).
- **Root cause:** Role guards comparing the wrong field / expecting a flag the principal of a teacher-led school doesn't carry. CLAUDE.md notes founder-principals can hold both teacher and principal records — the guard likely mis-resolves which one is active.
- **Approach:** Audit the role resolution on `/admin/conversations` and the `/admin` viewer banner. The banner should render only when `session.role === 'viewer'`; Conversations should accept any authenticated principal of the school. Reuse the canonical principal-identity check (CLAUDE.md flags `montree_school_admins` as the source of truth — rule from Session 86).
- **Likely files:** `app/montree/admin/conversations/*`, `app/montree/admin/page.tsx` (banner), the shared admin role guard / `verify-request` principal path.
- **Audit:** 🔬 **Fresh-eyes subagent audit** — cross-pollination still holds (a principal of school A can't see school B), founder-principal case verified.
- **Acceptance:** The owning principal reaches Conversations; no principal sees the viewer banner on their own school.

### Phase 3 — CR-1: Trial 90 → 7 days 🔴 CRITICAL (config)

- **Items closed:** CR-1, #25 ("Primer mes" badge contradiction — moot once this lands).
- **Root cause:** Multiple unsynced trial constants (90 on the billing card, 30 in pricing copy). No single source of truth.
- **Approach:**
  1. Establish ONE `TRIAL_DURATION_DAYS = 7` constant. Drive `school.trial_ends_at` (= `created_at + 7d`) from it.
  2. Stripe: align `trial_period_days` if a Stripe trial backs the subscription.
  3. Copy: "First month" / "Primer mes" → "Trial" / "Prueba" / "试用"; update the count; ES + ZH keys.
  4. Astra upsell copy on `/admin`, all "X days left" banners.
  5. Email templates: welcome + trial-ending warnings re-timed to **T-3 / T-1 / T-0** (was geared to a long trial).
- **Likely files:** trial constant module, school-creation route, `lib/montree/billing.ts` (Stripe), `app/montree/admin/billing/page.tsx`, Astra fallback copy, email templates, i18n files.
- **Audit:** 🔬 **Subagent audit** (Stripe + email timing are real-money / customer-facing — worth the extra eyes despite this being "config"). Verify a freshly created school gets `trial_ends_at == created_at + 7d`.
- **Acceptance:** New school's billing card reads "Trial — 7 days left" in EN/ES/ZH; Stripe `trial_end` matches; trial-ending email fires at T-3/T-1/T-0.

### Phase 4 — AI family report quality 🔴 HIGH (parent-facing)

- **Items closed:** #5 (duplicated text + raw markdown + EN-on-ES).
- **Root cause:** Prompt/response merge doubles the text; markdown rendered as plain text; the LLM call doesn't pass / enforce the school locale.
- **Approach:** De-dup the merge; render through a sanitizing markdown renderer; pass `locale` into the report-generation call with an explicit "respond in {locale}" instruction.
- **Likely files:** the family-report / weekly-wrap narrative generator (`lib/montree/reports/*`), the report viewer component.
- **Audit:** 🔬 **Fresh-eyes subagent audit** — single-pass output, rendered markdown, full localization, on a real generated report.
- **Acceptance:** Report is single-pass, properly rendered, fully in the active locale.

### Phase 5 — Loading / data-fetch failures 🟠 HIGH

- **Items closed:** #4 (`weekly-wrap` stuck on skeleton, no XHR), #7 (features flaky — IF Phase 0 confirms it's real), #9 (super-admin tabs — IF Phase 0 confirms they're actually missing).
- **Root cause:** Data hooks not firing on mount / early-returning on a context that never resolves.
- **Approach:** Per page — confirm the fetch hook runs on mount, add a timeout + error state so a stuck fetch surfaces instead of spinning forever.
- **Likely files:** `weekly-wrap` page + its data hook, `/admin/features` fetch.
- **Audit:** Lint + self-review (lower regression risk; isolated pages).
- **Acceptance:** Each page renders content or an explicit empty/error state within ~2s; the network panel shows the request.

### Phase 6a — Unify the locale source of truth 🟠 HIGH (i18n foundation)

- **Items closed:** #22 (four switchers don't sync), #20 (billing locale flips between renders — SSR/CSR hydration mismatch).
- **Root cause:** No single locale store. Each switcher writes its own state; server and client read different sources.
- **Approach:** One locale source — cookie + user preference — read identically server-side and client-side. Every switcher reads/writes that one key and emits a global locale-change event. Add a hydration assertion. CLAUDE.md Session 107 already introduced an `mt_locale` cookie + server-side seeding — this phase makes that the *only* source.
- **Likely files:** `lib/montree/i18n/context.tsx`, `server.ts`, the four switcher components, layout locale seeding.
- **Audit:** 🔬 **Subagent audit** — hydration mismatch gone (reload billing 10× — locale stable), all four switchers verified in sync.
- **Acceptance:** Setting a locale in any switcher propagates everywhere; no EN/ES flip on reload.

### Phase 6b — Wire hardcoded English to `t()` 🟠 HIGH (i18n batch)

- **Items closed:** #10 (principal sidebar), #11 (whole pages: classrooms / communication / pulse / events), #12 (Astra replies EN on ES + upsell card), #13 (login screen), #17 (setup-complete welcome).
- **Root cause:** Strings hardcoded, never wired to `t()` — "TYPE A" debt in CLAUDE.md's terms.
- **Approach:** Wrap strings in `t()` keys; add ES + ZH copy (use the project's `npm run i18n:fill-ui` Haiku batch translator + the strict parity pre-commit hook). For Astra (#12): pass the active locale into the LLM call as a system instruction, and localize the static upsell card.
- **Likely files:** admin sidebar/drawer, the four `/admin/*` pages, `/montree/login` + `/login-select`, Astra route + upsell component, signup-wizard final step, all 12 locale files.
- **Audit:** Lint + i18n strict parity check (must pass — it's a pre-commit gate). Self-review screenshot pass in ES + ZH.
- **Acceptance:** No English on these surfaces when locale = ES or ZH (brand names excepted); Astra replies in the active locale.

### Phase 6c — i18n polish 🟡 MEDIUM

- **Items closed:** #14 (teacher drawer/top-bar partial EN), #15 (parent-chats mixed locale), #16 (plural artifacts "1 aula(s)" / "¡1 Aulas Listas!"), #18 (curriculum work titles inconsistent EN/ES), #19 (billing fine-print untranslated), #21 (features raw-slug section headers).
- **Approach:** Same `t()` wiring; for #16 use ICU MessageFormat plural rules; for #18 enforce one i18n key per work rendered everywhere; for #21 map slugs → translatable display names.
- **Audit:** Lint + i18n parity + self-review.
- **Acceptance:** No mixed-locale surfaces; correct plurals; consistent work titles.

### Phase 7 — UI polish + the login-code security decision 🟡 LOW

- **Items closed:** #23 (login code = referral code — pending Tredoux's decision, see §4), #24 (saved note needs reload — mutate local cache on save), #26 (feature page styling), #27 (Astra upsell card not styled as a Astra message).
- **Audit:** Lint + self-review.
- **Acceptance:** Per item.

---

## 3. Sequencing summary

| Phase | What | Severity | Audit | Unblocks |
|---|---|---|---|---|
| 0 | Pre-flight diagnosis | — | none | confirms Phases 1, 3, 5 |
| 1 | Teacher routing + 403→logout | 🔴 Critical | 🔬 subagent | Phase 4 + parent flow |
| 2 | Principal role-checks | 🔴 High | 🔬 subagent | — |
| 3 | CR-1 trial 90→7 | 🔴 Critical | 🔬 subagent | go-to-market |
| 4 | AI family report | 🔴 High | 🔬 subagent | parent quality |
| 5 | Loading / missing | 🟠 High | lint + self | — |
| 6a | Locale source unify | 🟠 High | 🔬 subagent | Phase 6b |
| 6b | i18n wiring batch | 🟠 High | lint + parity | — |
| 6c | i18n polish | 🟡 Medium | lint + parity | — |
| 7 | UI polish + #23 decision | 🟡 Low | lint + self | — |

Phases 1–5 are independent and could each ship as their own commit + deploy. Phase 6a **must** land before 6b/6c. Recommend deploying after each phase so production improves incrementally rather than in one big-bang merge.

---

## 4. Needs a Tredoux decision before its phase runs

- **#23 — login code = referral code.** Currently by design (Session 90 Phase 2). Options: (a) leave it — referral code stays the principal login; (b) generate a fresh random principal code at account creation, keep the referral code for attribution only. (b) is more secure but changes the signup flow. **Decision needed before Phase 7.**
- **Phase 1 routes that genuinely don't exist** — if Phase 0 finds e.g. `photo-albums` has no page anywhere, decide: build the page, or remove the menu item. **Decision needed mid-Phase 1.**
- **CR-1 — 30 vs 90 reconciliation** — the pricing page says 30, billing says 90. Confirm: the target is 7 everywhere, and the pricing-page "30" copy also changes to 7. (Assumed yes, but worth a nod.)

---

## 5. Verify-before-fixing (likely NOT real bugs — don't burn time)

- **#9 super-admin Health/Errors/DLQ tabs** — CLAUDE.md Session 104 built all three. Likely the tester viewed a stale build or the wrong account. Phase 0 confirms; if they exist, close #9 as "not reproducible."
- **#7 features "Loading…" stuck** — the tester's own screenshot shows it loaded. Intermittent at worst. Phase 0 re-tests; only fix if it actually reproduces.
- **HANDOFF.md is dated "2025-05-23"** — typo for 2026. Cosmetic, ignore.

---

## 6. Retest protocol (after all phases land)

Per the handoff's §D, plus additions:
1. Fresh disposable school → billing card reads "Trial — 7 days" in EN/ES/ZH.
2. Walk the teacher drawer top-to-bottom — every route renders its own page; unknown paths 404.
3. Force a 403 (hit a foreign child ID) — inline error, teacher stays logged in.
4. Generate a parent invite from `/dashboard/parent-manager` → log in as parent → view report.
5. Principal reaches `/admin/conversations`; no viewer banner on own school.
6. Switch locale to ES, then ZH — visit every §A page; no English except brand names.
7. Open a generated family report — single-pass, rendered markdown, localized.
8. Super-admin attribution still shows TESTRUNCLAUD-AP9D → Test_Run_Claud @ 20%.
9. Trial-ending email fires at T-3 / T-1 / T-0 on a school with `trial_end` ~3d out.

---

## 7. My recommendation

The handoff is solid and the screenshots back it. The one thing I'd hold the line on: **Phase 1 before CR-1.** CR-1 is a business-config change with no breakage behind it; the routing bug + the 403-logout coupling currently make the entire teacher app and the whole parent-invite flow untestable. Fixing routing first means every later phase can actually be verified end-to-end. CR-1 lands immediately after as Phase 3 — it's not delayed, just correctly ordered.

The biggest hidden risk is the **403-to-logout coupling** in Phase 1 — it's subtle, it's in shared fetch code, and getting it wrong either breaks real logouts (401s stop working) or leaves the bug. That's why Phase 1 gets a full subagent audit.

Estimated shape: Phases 0–5 are the substance (the breakages); Phases 6–7 are volume but low-risk (i18n wiring + polish). I'd treat 0–5 as the "make it work" half and 6–7 as the "make it right" half, and consider shipping/announcing after Phase 5.

---

## 8. EXECUTION LOG — what was actually done (May 23, 2026)

Phases 0–6a were executed in this session. Every changed file is lint-clean (0 errors). **Nothing is committed — Tredoux reviews + commits.** Critical phases each passed a fresh-eyes subagent audit.

### ✅ Phase 0 — Diagnosis (findings)
- Teacher drawer hrefs in `DashboardHeader.tsx` are actually CORRECT (push to real routes). The handoff's "6 broken routes" came from the tester typing slugified menu labels (`weekly-plan`, `parent-manager`, …) as literal URLs — those route dirs don't exist, so they fell into `[childId]`. Real bug = no `not-found.tsx` + the `[childId]` page logging users out on a 403.
- **#9 (super-admin Health/Errors/DLQ tabs) — NOT A BUG.** All three tabs exist and are wired (`super-admin/page.tsx` lines 723–725). Closed as not-reproducible.
- Trial constant was a 3-way mess: `constants.ts` said 14, `try/instant` hardcoded **90**, email drip cadence assumed ~30.

### ✅ Phase 1 — Teacher routing + 403-to-logout  (audited ✓)
- NEW `app/montree/dashboard/not-found.tsx`.
- `[childId]/page.tsx`: 403/404 on the child/progress fetch now renders the 404 boundary; **only 401 logs the teacher out**. Fixes handoff #2 + #3.

### ✅ Phase 2 — Principal role-checks  (audited ✓)
- `api/montree/auth/me/route.ts`: now also queries `montree_school_admins`, returns a top-level `role`, and no longer 401s a pure principal. Fixes #6.
- `api/montree/admin/today/route.ts`: `isTeacherLed = plan_type === 'personal_classroom'` only (dropped the `founding_teacher_id` clause — it holds the agent id on referral signups). Fixes #8 (viewer banner + "upgrade to add classrooms" on an owner's own school).

### ✅ Phase 3 — CR-1 trial 90 → 7 days  (audited ✓)
- `constants.ts` `TRIAL_DAYS: 7` (single source of truth); `try/instant` derives `trial_ends_at` from it; Stripe `trial_period_days` follows automatically.
- Trial drip retimed day 7/14/25 → **day 4/6/7** (T-3/T-1/T-0); email copy rewritten; `trial-drip` + `outreach` action lists updated.
- 12 trial-copy keys reworded "first month" → "trial / 7 days" in **en, zh, es**. (9 other locales = Phase 6c carry-over.)

### ✅ Phase 4 — AI family report  (audited ✓)
- `narrative-generator.ts`: new exported `sanitizeNarrative()` strips stray markdown + collapses doubled paragraphs at generation time.
- Parent report viewer + `pdf-generator.ts`: also sanitize on render (covers pre-existing reports).
- `weekly-wrap` + `batch-narratives`: parent narratives now generate in the **school's `primary_locale`**, not the triggering user's UI locale. Fixes #5.

### ✅ Phase 5 — Loading failures  (lint ✓)
- `weekly-wrap/page.tsx`: `weekStart`/`weekEnd` default to the current Monday-week when the URL has no `?week=` param — fixes the permanent-skeleton/no-XHR bug (#4).
- `admin/features/page.tsx`: 12s `AbortController` timeout + `finally` so a hung fetch can't stick on "Loading features…" (#7 hardening).

### ✅ Phase 6a — Locale source  (lint ✓)
- `i18n/context.tsx`: `setLocale` now broadcasts a `montree:locale-change` window event; the provider listens for it + the cross-tab `storage` event. Every switcher on the page (and every open tab) syncs instantly (#22).
- #20 (billing locale flip): the i18n core was verified sound — server seeds locale from the `mt_locale` cookie, single provider, localStorage never overrides a server-seeded locale, provider value is memoized. No code-level flip vector found; needs live repro if it recurs.

### ⏳ REMAINING — Phases 6b, 6c, 7 (NOT done — handed off)

**Why stopped here:** Phases 0–6a fixed every confirmed *functional* breakage, each audited. The remainder is i18n string-wiring — wrapping ~150–250 hardcoded English strings (4 full admin pages #11, sidebar #10, login #13, setup welcome #17, plus 6c polish) in `t()` and producing ~250 keys × 12 locales. The project's own workflow for this (per CLAUDE.md Session 77) is: add English keys to `en.ts` → run `npm run i18n:fill-ui` (Haiku batch translator) → spot-check. That batch tool is the correct path and should drive this work — hand-translating into de/fr/ja/ko/uk/ru blind would be lower quality than the established pipeline.

**Precise spec for the 6b/6c session:**
1. **#10 sidebar** — `app/montree/admin/layout.tsx` (already `'use client'`, already imports nothing i18n). Add `useI18n`, replace the `NAV` label literals (`Today`, `Classrooms`, `Communication`, `Settings`, `Calendar`, `Events`, `Parent Meetings`, `Conversations`) + `Sign out` + the `PRINCIPAL` header with `t()` keys (`adminNav.*`). ~11 keys.
2. **#11 four pages** — `app/montree/admin/{classrooms,communication,pulse,events}/page.tsx`. Every title/subtitle/card/tab/empty-state/CTA → `t()`. Largest item, ~120 keys. Namespaces `admin.classrooms.*` etc.
3. **#12 Astra EN-on-ES** — verified NOT a separate bug: `/admin/page.tsx` already sends `locale` and `principal-agent/route.ts` already passes it to `buildTracySystemPrompt`. It surfaced EN only because the locale wasn't active on `/admin` — resolved by the Phase 6a sync + cookie seed. No code change needed; just verify.
4. **#13 login** — `/montree/login` + `/montree/login-select` → `t()`. ~8 keys.
5. **#17** — setup-wizard final-step Astra welcome message in user locale.
6. **6c polish** — #14 teacher drawer leftovers, #15 parent-chats mixed locale, #16 ICU plurals (`{count, plural, …}`), #18 work-title consistency, #19 billing fine-print, #21 features raw-slug headers. PLUS: the 12 trial-copy keys in the **9 non-EN/ZH/ES locales** still say "first month" (Phase 3 carry-over).
   - Workflow: add all keys to `en.ts`, mirror into the other 11 files, run `npm run i18n:fill-ui`, then `npm run i18n:check` (strict — it's a pre-commit gate).

**Phase 7 (UI polish) — not started.** #23 (login code = referral code) still needs Tredoux's product decision (see §4). #24 (saved-note needs reload), #26/#27 (cosmetic) are minor.

### Files changed this session (all lint-clean, uncommitted)
`app/montree/dashboard/not-found.tsx` (new) · `app/montree/dashboard/[childId]/page.tsx` · `app/api/montree/auth/me/route.ts` · `app/api/montree/admin/today/route.ts` · `lib/montree/constants.ts` · `app/api/montree/try/instant/route.ts` · `lib/montree/email.ts` · `app/api/montree/super-admin/trial-drip/route.ts` · `app/api/montree/super-admin/outreach/route.ts` · `lib/montree/i18n/{en,zh,es}.ts` · `lib/montree/reports/narrative-generator.ts` · `lib/montree/reports/pdf-generator.ts` · `app/montree/parent/report/[reportId]/page.tsx` · `app/api/montree/reports/weekly-wrap/route.ts` · `app/api/montree/reports/batch-narratives/route.ts` · `app/montree/dashboard/weekly-wrap/page.tsx` · `app/montree/admin/features/page.tsx` · `lib/montree/i18n/context.tsx`
