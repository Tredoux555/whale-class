# Handoff — In-App Account Deletion (2026-06-07)

**Branch:** `appstore/account-deletion` (1 commit, `3c06974b`). **Not pushed, not deployed, migration not applied.** Review with `git diff main...appstore/account-deletion`.

## Why

Apple Guideline 5.1.1(v): an app that lets people create accounts must let them delete their account *and* their data, in-app. It was the single biggest remaining App Store code blocker. Now built.

## What shipped (741 lines, 9 files, TS-clean, both CI guards green)

A role-aware "Delete account" flow — because deletion means different things per role:

| Who | What deletion does | Confirmation |
|---|---|---|
| Teacher / agent | Deletes only their own login. School + children are tenant-owned and stay. | Button |
| Homeschool parent | Full purge of their own school (they're the sole data controller). | Type the school name |
| Principal — sole member | Full school purge. | Type the school name |
| Principal — others remain | Deletes just their login; school keeps running (UI warns to assign another principal). | Button |
| Parent (portal) | Deletes their provisioned `montree_parents` row via cascade. Child stays with the school. | Button |
| Agent with payout records | **Blocked** — financial records must be retained (FK is `ON DELETE RESTRICT`). Message points to support. | — |

**How it's safe:**
- Server is the source of truth — the preview *and* the typed-confirmation are re-derived server-side; the client's claims are never trusted.
- Every deletion writes an audit row (`montree_account_deletion_audit`, migration 247, FK-less so it survives the cascade) *before* the destructive step.
- Teacher deletes first null the 6 `NO ACTION` "authored-by" foreign keys (phonics words/images, custom curriculum, work imports, curriculum imports, weekly admin notes) that would otherwise block the row delete.
- School purges ride the existing 44 `ON DELETE CASCADE` FKs on `montree_schools` — verified the graph reaches children, media, classrooms, observations.
- Auth cookie is cleared on success, so the dead session ends immediately.

**Files:** `lib/montree/account-deletion.ts` (core, role-aware) · `app/api/montree/auth/delete-account/route.ts` (teacher/principal/homeschool/agent — GET preview + DELETE) · `app/api/montree/parent/auth/delete-account/route.ts` (parent) · `components/montree/DeleteAccountSection.tsx` (reusable preview-then-confirm UI) · `app/montree/parent/account/page.tsx` (new parent surface) · wired into admin + dashboard settings + parent dashboard header · `migrations/247_account_deletion_audit.sql`.

## Your to-dos (I can't safely do these unattended)

1. **Apply migration 247** in Supabase (creates the audit table). Until then, deletions still work but audit inserts no-op with a console warning (fail-soft by design). One-way safe — additive table only.
2. **Review the diff**, then **merge** `appstore/account-deletion` and deploy (Railway auto-deploys `main`).
3. **Test once** on a throwaway school: a teacher delete (login gone, school intact) and a sole-principal/homeschool delete (typed confirmation → school purged). Deletion is real — don't test on a live school.

## Verified
- `tsc` (real binary): held at the **5,233** baseline exactly — **zero** new type errors; zero in any new file.
- `node scripts/audit-tenant-scoping.mjs` → 185 routes, **0 violations**.
- Full deletion library re-read end-to-end for logic correctness.

## Product decisions I made (flagging for your sign-off)
- **Principal with other teachers** deletes only their own login (the school keeps running). Alternative: block until they assign a new principal. I chose the non-destructive default to avoid nuking a live multi-teacher school by accident. Easy to flip if you'd rather force reassignment.
- **Agents are excluded** from the in-app delete UI (internal partner role, read-only profile, contact-based offboarding) and blocked server-side if they have payouts. Not an App Store concern (agents aren't consumer accounts).

## Companion deliverable
`APP_STORE_LISTING_AND_REVIEW.md` — paste-ready listing copy, keywords, App Privacy answers, the reviewer demo-account setup, and a screenshot shot-list.

## Still ahead for the store (not this branch)
- **Native offline fallback** (Guideline 4.2 white-screen): the PWA service worker is disabled for Capacitor builds, so this must be handled in native Swift (`ios/`, gitignored) and verified on a device — a toolchain session, not a headless task.
- App icon export (1024²) + screenshots (need a device/simulator).
- Apple ($99/yr, fee-waiver worth trying) + Google ($25) accounts — yours to create.
