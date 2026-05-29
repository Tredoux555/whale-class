# Montree E2E Handoff — Session Close (May 23, 2026)

A production E2E test of montree.xyz (run by a browser-Claude, original brief
in `HANDOFF.md`) surfaced 1 change-request + 27 bugs. This session worked the
whole list, plus a separate Story video-call bug, across **8 commits** and
**three browser-Claude re-sweeps**. Every confirmed functional bug is fixed,
audited, and shipped. `origin/main` is in sync.

Companion docs: `MONTREE_E2E_FIX_PLAN.md` (the phased plan + §8 execution log),
`MONTREE_E2E_REVERIFY.md` (the re-verification brief for browser-Claude).

---

## Commits (all on origin/main)

| SHA | What |
|-----|------|
| `11585d87` | Phases 0–6a — routing/404, 403-logout, principal role-checks, 7-day trial, family report, loading, locale sync + Story video-call migration 230 |
| `6ec916ee` | E2E re-verification guide for the browser-Claude sweep |
| `ddd6a60f` | Re-sweep R2 — /admin/conversations 500, /admin/features redirect, sidebar i18n |
| `ec0b4408` | Re-sweep R3 — cross-tab sign-out + 3 i18n leaks (findings A, C, D) |
| `4140b75c` | Re-sweep R4 — parent-report locale + broken-link (findings E, F, G) |
| `7ddbdb94` | Re-sweep R5 — login + add-student i18n leaks (findings I, J) |
| `c75385e8` | i18n R6 — lazy locale-load retry + `<html lang>` sync |
| `032c7e73` | i18n — `<html lang>` updates on soft-nav locale switch |

---

## Status — all 8 brief items + CR-1 CLOSED (runtime-verified by browser-Claude)

| Item | Status |
|------|--------|
| CR-1 — trial 90 → 7 days | ✅ single `TRIAL_DAYS` constant; drip retimed day 4/6/7; copy in 12 locales |
| #1 Routing/auth — teacher bogus paths, 403-logout | ✅ `[childId]` renders 404 boundary on 403/404; only 401 logs out |
| #2 Principal role — viewer banner, classrooms, conversations | ✅ `isTeacherLed` = `plan_type` only; `auth/me` resolves principals |
| #3 Trial = 7 days across locales | ✅ verified EN/ES/ZH/DE/FR/JA |
| #4 AI family report | ✅ markdown stripped, deduped, generates in school's `primary_locale` |
| #5 Loading — weekly-wrap, features | ✅ weekly-wrap defaults to current week; features renders |
| #6 Locale sync (in-page + cross-tab + cross-tab sign-out) | ✅ window-event broadcast + storage listener |
| Story video calls | ✅ migration 230 (mode CHECK) — needs Supabase run; not runtime-verified |
| #20 billing-locale-flip | ✅ closed — not reproducible |

Re-sweep findings **A–J all fixed**: A (cross-tab sign-out), C (3 EN leaks),
D (FR login verb), E (parent récit follows `primary_locale`), F (error screen
localized), G (broken teacher-preview link removed), I (login "See pricing"),
J (Add Student modal strings). B (Astra greeting) + H (English work names in
localized prose) are confirmed by-design / known-limitation, no action.

---

## 🚨 Operational — must be done in Supabase / by Tredoux

1. **Run `migrations/230_story_calls_mode_check.sql`** — Story video calls stay
   broken until this runs (voice works; video's `mode` value was rejected by a
   stale CHECK constraint). Idempotent.
2. **`migrations/185_principal_vault.sql`** — likely already run (Conversations
   page renders the vault setup screen), but confirm if `/admin/conversations`
   ever 500s again.
3. **Story video verification** — browser-Claude can't reach the password-gated
   `/story/admin`. Tredoux must test it himself after migration 230, or hand
   over non-prod Story admin credentials.

---

## Key architectural decisions locked in

- `[childId]` page: a 403/404 on the child/progress fetch renders the
  `not-found.tsx` boundary. **Only a 401 logs a teacher out** — never a 403.
- `auth/me` resolves principals via `montree_school_admins` and returns a
  top-level `role`; `identity.role` always equals `effectiveRole`.
- `admin/today` `isTeacherLed = plan_type === 'personal_classroom'` only.
  `founding_teacher_id` is NOT used — it holds the agent id on referral signups.
- `DEFAULTS.TRIAL_DAYS` (= 7) is the single source of truth for trial length.
- Parent reports generate in the school's `primary_locale`, NOT the triggering
  user's UI locale. The educator/teacher report follows the UI locale. They
  legitimately differ. `primary_locale` is set at signup and is not surfaced
  in the UI (a "School language" indicator on `/admin/settings` is a
  recommended follow-up).
- `sanitizeNarrative()` (exported from `narrative-generator.ts`) strips markdown
  + collapses doubled paragraphs; applied at generation, in the parent viewer,
  and in the PDF generator.
- Lazy locale-chunk loads retry up to twice on failure (a failed dynamic import
  otherwise left the UI stuck in English until a hard reload).
- `setLocale` updates `document.documentElement.lang` directly.

---

## What's genuinely left (not bugs — deferred / optional)

- **Phase 6b — bulk i18n** of the 4 full admin pages (Classrooms, Communication,
  Pulse, Events) — still English on non-EN locales. Needs the
  `npm run i18n:fill-ui` Haiku batch workflow. The biggest remaining piece.
- **Optional** — a "School language" indicator on `/admin/settings` so a
  school's `primary_locale` is visible (prevents the misread that the parent
  report being in the school's language was a bug).
- **Bug H** — English Montessori work names inside localized AI prose. By-design
  for now; aligning needs the localized curriculum catalog fed into the report
  prompt — a separate effort.
- **Phase 7** — minor UI polish (#24 saved-note reload, #26/#27 cosmetic).
- **#23** — principal login code = referral code. By design (Session 90);
  awaiting a product decision, not a fix.

---

## Verification

Every commit lint-clean (0 errors). The i18n strict-parity pre-commit hook
passed on every commit (12 locales, 100%). Five fresh-eyes subagent audits ran
across the rounds — all returned clean. Browser-Claude ran three runtime
re-sweeps and confirmed all 8 brief items pass in production. The only
functional thing not runtime-verified is Story video (gated on migration 230 +
Story admin access).
