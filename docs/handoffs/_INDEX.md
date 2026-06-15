# Handoff docs — index (Jun 13, 2026)

Short map of where the truth lives. When in doubt: **HANDOFF_LATEST.md first.**

## 1. Start here
- **`/HANDOFF_LATEST.md`** — the resume doc. Morning report for the Jun 12→13
  overnight burn (branch `burn-jun12-night2`), the morning checklist, and the
  burn plan. Always read this first.
- **`/CLAUDE.md`** — the canonical architecture brain (rules #1–#161, session
  history, migration log, don't-break-these). Read after HANDOFF_LATEST.

## 2. Currently relevant docs (Jun 2026)
- `docs/handoffs/HANDOFF_RIDDICK_SANCTUARY.md` — ✅ BUILT (Jun 15): multi-space
  personal platform. Migrations 261+262 RUN in prod; code in repo NOT yet
  committed/deployed. Riddick = space `riddick` at `/riddick`; per-space data
  isolation + father↔son message channel (`story_sanctuary_messages`). Next:
  `npm run build`, set riddick's password, commit + deploy.
- `docs/plans/RIDDICK_SANCTUARY_SPACES_PLAN.md` — the design rationale for the above.
- `docs/APPLE_REVIEW_DEMO_SCHOOL.md` — Apple reviewer demo school (codes
  WYXMN9 / BAM4S9; ⚠️ trial expires Jun 19).
- `docs/DNS_ERROR_1034_FIX.md` — Cloudflare Error 1034 fix (flip montree.xyz +
  www to DNS-only; 2 min with VPN on).
- `docs/PERF_PASS_JUN13.md` — Lighthouse/perf findings on the 5 hottest pages.
- `docs/ORPHAN_TABLES_REPORT.md` — 77 orphan tables analysed; 7 are FALSE
  POSITIVES — do not archive those.
- `docs/APP_STORE_RUNBOOK.md` — signing → Archive → upload guide.
- `~/Desktop/Montree App Store Pack/` — listing copy, privacy labels, reviewer
  notes, screenshots + SCREENSHOTS_TODO.md, SUBMISSION_CHECKLIST.md.

## 3. Historical — June 2026 docs in this folder
- `SESSION_HANDOFF_2026-06-10_NIGHT.md` — **NOT superseded**: still-open
  actions not yet reflected in HANDOFF_LATEST (run migration 249 Home Practice
  Cards, flip Whale Class to Sonnet, rotate the Supabase service-role key) +
  rebuild notes for the shelved Predictive Readiness / Benchmarks engines.
- `AUDIT_2026-06-10.md` — **NOT superseded**: full-app audit; criticals since
  fixed, but the legacy `app/admin|teacher/*` tree, dual service workers, raw
  createClient sweep, and the product assessment (Thai i18n, untagged-photo
  nudge, curriculum analytics, parent push) remain open and unique.
- `FIXES_APPLIED_2026-06-10.md` — superseded: its code fixes shipped and
  deployed via `audit-cleanup-jun2026` (merged Jun 12 evening); residual key
  rotation is tracked in the Jun-10-night doc above.
- `SESSION_141_HANDOFF.md` — superseded: Story nuke/ephemeral session is
  mirrored in full (rules, deferred findings, verify-next) in CLAUDE.md §141.
- `STORY_SECURITY_WEBCLAUDE_HANDOFF.md` — superseded: one-shot verification
  brief; outcome recorded in Session 141 / CLAUDE.md (Tredoux self-served the
  env vars — don't route this through a browser agent again).

## 4. Older docs still worth knowing about
- `SESSION_113_V2_BURN_HANDOFF.md` — contains the **24-step production
  verification checklist** (still the best post-deploy smoke list).
- `MONTREE_ENCRYPTION_RUNBOOK.md`, `ASTRA_MIRA_*` (architecture/spec/handoff),
  `INBOUND_PAYMENTS_PLAN.md` — reference material, not status docs.
- Everything else here (Feb–May session handoffs) is historical; the durable
  lessons were folded into CLAUDE.md.

## 5. Archived
- `docs/mission-control/` — months stale; see `_ARCHIVED_README.md` /
  `_OUTDATED_README.md` there. Nothing in it is current.
