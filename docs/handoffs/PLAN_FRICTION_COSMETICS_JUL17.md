# PLAN — FRICTION PASS + COSMETICS PASS (Jul 17, 2026) — BINDING CONTRACT

**Author: Fable (director). Builders: Opus. Auditors: Sonnet fresh-eyes per build. Final gate:
Fable reads every diff.** Tredoux's ruling: close the human-flow friction before real schools
onboard, plus a uniformity/cosmetics pass. Two builds: **D (friction)** then **E (cosmetics)**.

Ground rules (same as PLAN_HOT_PATHS_JUL17): touch only named/contracted surfaces, git-status
check per file (skip+report dirty — the Founding-Sunset + other sessions' dirt is still in the
tree), no commits by builders, eslint 0 new errors, i18n keys added to ALL 12 locales (EN+ZH
real, 10 English-fallback — strict parity gate must pass), never weaken auth/rate limits/shelf
invariant/tier gates. All emails follow the Jul-15 EMAIL DOCTRINE: no selling, no explaining,
plain text, bare `montree.xyz` links only, from Tredoux's voice.

---

## BUILD D — FRICTION PASS (4 items)

### D1. Trial lifecycle emails (the revenue one)

**Migration 299 (`migrations/299_engagement.sql`)** — one migration for all of Build D:
```sql
-- lifecycle send-once ledger
CREATE TABLE IF NOT EXISTS montree_lifecycle_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('trial_d5','trial_expired','winback_d14')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, email_type)
);
ALTER TABLE montree_lifecycle_emails ENABLE ROW LEVEL SECURITY;
-- report read receipts
ALTER TABLE montree_weekly_reports ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ;
-- friday nudge send-once ledger
CREATE TABLE IF NOT EXISTS montree_push_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL DEFAULT 'weekly_report',
  week_start DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, nudge_type, week_start)
);
ALTER TABLE montree_push_nudges ENABLE ROW LEVEL SECURITY;
```
(RLS deny-all, service-role only — house posture. Builder writes the final file; idempotent.)

**ONE cron route** `app/api/montree/cron/engagement/route.ts` — gated `x-cron-secret` vs
`process.env.CRON_SECRET`, **fail-closed** (missing env/header → 401; this guards outbound
email). Designed to be hit HOURLY by ONE cron-job.org job. It runs D1 + D3 in sequence,
returns counts-only JSON. Every step try/caught — one school's failure never aborts the run.
Batch caps: ≤50 emails, ≤100 pushes per run.

D1 selection logic (verify column names against the schema before writing — especially the
school's contact email column; if schools lack a reliable email column, fall back to the
school's principal row's email — VERIFY in `montree_school_admins`):
- Candidates: `subscription_status = 'trialing'` AND `trial_ends_at IS NOT NULL`, excluding:
  locked schools, `founding_member = true`, `billing_override_usd` set, and any school with
  `ai_tier_sonnet`/`ai_tier_haiku` flags (already converted/comped — reuse existing helpers,
  don't hand-roll flag reads if a helper exists).
- `trial_d5`: `trial_ends_at` between NOW()+1d and NOW()+2d (the ~2-days-left window; hourly
  cron + send-once ledger makes the window forgiving).
- `trial_expired`: `trial_ends_at` between NOW()-3d and NOW().
- `winback_d14`: `trial_ends_at` between NOW()-14d and NOW()-7d.
- Send via Resend (same envs as reports/send: RESEND_API_KEY + RESEND_FROM_EMAIL), plain text,
  record in ledger ON SUCCESS only. Skip silently if no recipient email resolvable.

**Email copy (Fable-authored — use VERBATIM, subject `Montree`):**
- trial_d5: "Hi,\n\nJust a heads-up — your school's Premium trial ends in about two days.\n\nNothing breaks and nothing is deleted. Your classroom, photos and records all stay exactly as they are. When you're ready, you choose a plan in Settings → Billing: Starter at $3 or Premium at $7 per student.\n\nIf you're unsure which fits your school, reply to this email — I read everything myself.\n\nKind regards,\nTredoux\nmontree.xyz"
- trial_expired: "Hi,\n\nYour school's trial has ended. Everything you built is safe — your classroom, photos and records are all waiting exactly where you left them.\n\nTo keep the reports and AI flowing, pick a plan in Settings → Billing. It takes about two minutes.\n\nIf price is the obstacle, reply and tell me — we have a Foundation program for schools that need it.\n\nKind regards,\nTredoux\nmontree.xyz"
- winback_d14: "Hi,\n\nA week or two ago your Montree trial ended. If it wasn't right for your classroom, no hard feelings at all.\n\nBut if life simply got busy — your classroom is still there, exactly as you left it, and picking a plan takes two minutes.\n\nEither way, I'd genuinely value one line of reply telling me what would have made it a yes.\n\nKind regards,\nTredoux\nmontree.xyz"

### D2. Report read receipts (the perceived-value one)

- The parent report view API (`app/api/montree/parent/report/[reportId]/route.ts` — VERIFY it's
  the live read path) sets `first_opened_at = NOW()` **only if currently NULL**, fire-and-forget
  (`.is('first_opened_at', null)` guard in the UPDATE — never overwrite the first open; a
  failure never blocks the report render).
- Teacher surface: the parent-codes children API (the one returning `last_report_sent_at`)
  additionally returns `last_report_opened_at` (same batched query pattern, non-fatal). The
  Parents tab report row shows a quiet "Seen <date>" indicator when present, "Not yet seen"
  muted state when sent-but-unopened. Match the existing row's visual register exactly.
- i18n: 2 new keys (`parentCodes.reportSeen`, `parentCodes.reportNotSeen`) ×12 locales, EN+ZH
  real, others English fallback. Strict parity must pass.

### D3. Friday report-ready push (the habit one)

In the SAME cron route, after D1: for each school (batch through classrooms):
- Compute school-local time via `getSchoolTimezone` + `Intl` (or `currentWeekdayInTz` +
  hour derivation via school-time.ts primitives). Fire window: **Friday 14:00–16:59 school
  time** (3-hour window + hourly cron + week-keyed send-once ledger = at most one push/week).
- Only if the school has ≥1 media row captured this week (cheap count, `captured_at >=` the
  school-local Monday via `currentWeekStartInTz` + `localDateInTzToUtcInstant`).
- `sendPushToOwners` to the school's TEACHER owners: title "Montree", body "This week's photos
  are ready to become parent reports." deep link `/montree/dashboard/parent-codes`. Record in
  `montree_push_nudges` with the school-local week_start ON SUCCESS.
- Push copy hardcoded English this round (push i18n is a wider effort — note as deferred).

### D4. Parent session parity (the retention one)

- `lib/montree/server-auth.ts`: `createParentToken` `'30d'` → `` `${MONTREE_JWT_TTL_DAYS}d` ``
  (same constant as teachers, 3650d). Update the stale JSDoc ("valid for 30 days") and the
  stale comment on `createMontreeToken` ("default 30") while in there.
- Find EVERY place the parent cookie's `maxAge` is set (access-code route, parent login route,
  any parent cookie helper) and align to `MONTREE_JWT_TTL_DAYS * 24 * 60 * 60`. Grep for the
  parent cookie name to be exhaustive; list the sites in the report.
- Lock interaction is already handled (Build C blocks minting for locked schools; per-request
  parent enforcement remains deferred by explicit ruling — do NOT add it here).

### Build D gates
- eslint 0 new errors; `npm run i18n:check:strict` passes 12/12.
- Logic harness for the cron route's selection windows (mock rows at the boundaries: d5 window
  edges, expired window edges, winback edges, founding/override/locked exclusions) + the
  Friday-window computation for Asia/Shanghai and America/New_York. Throwaway in /tmp.
- Report: diff stat, per-item table, recipient-email resolution note, harness output.

---

## BUILD E — COSMETICS / UNIFORMITY PASS (after D ships)

**Goal: uniform, quietly professional. NOT a redesign.** The registers are LAW:
- **In-app dark register** (teacher/principal surfaces): bg `#0a1a0f`, one emerald glow,
  glass `rgba(255,255,255,0.06)`, hairlines `rgba(52,211,153,0.15)`, no box-shadows, Lora
  (headings) / Inter (body). Per the Jul-16 dark sweep.
- **Funnel/public register** (Lanternlight, quiet): near-black stage, gold = hairlines/eyebrow
  text/key-code/thread-dot ONLY, gold NEVER glows (no box-shadow with 232,201,106), flat
  `#1D5C41` action buttons, cards `rgba(255,255,255,0.028)` + 0.08 hairlines r14, headings-only
  page voice.
- **Paper stays white** (labels, print/, report bodies, parent-code cards). **Games untouched**
  (standing call). **Parent portal**: its own existing light register — uniformity WITHIN it,
  no dark conversion.

Process (two stages):
1. **Sonnet uniformity audit** (read-only): sweep teacher/principal/parent/funnel surfaces for
   register violations — hardcoded off-palette colors, leftover white screens missed by the
   dark sweep, box-shadows in dark surfaces, gold glows in funnel files, inconsistent border
   radii (register is r14 funnel / the T-token radii in-app), mixed font stacks, emoji in UI
   chrome (recent sessions stripped these deliberately), inconsistent button styles/sizes,
   double dividers, misaligned safe-area padding on fixed top bars (the env(safe-area-inset-top)
   rule). Output: a numbered violations list with file:line + the register rule broken. NO
   opinions beyond the registers; the registers decide.
2. **Opus fix pass**: fix ONLY the listed violations. Each fix conforms to the register — never
   invents. Anything ambiguous → skip + report for Fable's ruling.

Build E gates: eslint 0 new errors, i18n untouched (or parity holds), NO functional changes
(diff must be styles/classNames/style-objects only — any logic line changed = report it),
Fable reviews the full diff. Device eyeball stays owed to Tredoux (code can't see pixels).

## Sequencing
Build D → Sonnet audit D → Fable review → push → migration 299 SQL + cron-job.org instructions
pasted in chat. Then Build E stage 1 (audit) → Fable triage → stage 2 (fix) → Sonnet re-audit →
Fable review → push. Close-out: session block appended to CLAUDE.md as the handoff.
